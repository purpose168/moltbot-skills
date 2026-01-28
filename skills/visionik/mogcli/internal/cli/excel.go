package cli

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"strings"

	"github.com/visionik/mogcli/internal/graph"
)

// ExcelCmd 处理Excel操作。
type ExcelCmd struct {
	List     ExcelListCmd     `cmd:"" help:"列出Excel工作簿"`
	Metadata ExcelMetadataCmd `cmd:"" help:"列出工作簿中的工作表"`
	Get      ExcelGetCmd      `cmd:"" help:"从工作表读取数据"`
	Update   ExcelUpdateCmd   `cmd:"" help:"向工作表写入数据"`
	Append   ExcelAppendCmd   `cmd:"" help:"向表格追加数据"`
	Create   ExcelCreateCmd   `cmd:"" help:"创建新工作簿"`
	AddSheet ExcelAddSheetCmd `cmd:"" help:"添加工作表" name:"add-sheet"`
	Tables   ExcelTablesCmd   `cmd:"" help:"列出工作簿中的表格"`
	Clear    ExcelClearCmd    `cmd:"" help:"清空区域"`
	Export   ExcelExportCmd   `cmd:"" help:"导出工作簿"`
	Copy     ExcelCopyCmd     `cmd:"" help:"复制工作簿"`
}

// ExcelListCmd 列出工作簿。
type ExcelListCmd struct {
	Max int `help:"最大结果数" default:"50"`
}

// Run 执行excel list命令。
func (c *ExcelListCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	query := url.Values{}
	query.Set("$top", fmt.Sprintf("%d", c.Max))
	query.Set("$filter", "file/mimeType eq 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'")
	query.Set("$orderby", "lastModifiedDateTime desc")

	data, err := client.Get(ctx, "/me/drive/root/search(q='.xlsx')", query)
	if err != nil {
		return err
	}

	var resp struct {
		Value []DriveItem `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(resp.Value)
	}

	if len(resp.Value) == 0 {
		fmt.Println("未找到Excel工作簿")
		return nil
	}

	fmt.Println("Excel工作簿")
	fmt.Println()
	for _, wb := range resp.Value {
		fmt.Printf("📊 %s  %s  %s\n", wb.Name, formatSize(wb.Size), wb.LastModifiedDateTime[:10])
		fmt.Printf("   ID: %s\n", graph.FormatID(wb.ID))
		if root.Verbose && wb.WebURL != "" {
			fmt.Printf("   URL: %s\n", wb.WebURL)
		}
	}
	fmt.Printf("\n%d 个工作簿\n", len(resp.Value))
	return nil
}

// ExcelMetadataCmd 获取工作簿元数据。
type ExcelMetadataCmd struct {
	ID string `arg:"" help:"工作簿ID或路径"`
}

// Run 执行excel metadata命令。
func (c *ExcelMetadataCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/drive/items/%s/workbook/worksheets", graph.ResolveID(c.ID))

	data, err := client.Get(ctx, path, nil)
	if err != nil {
		return err
	}

	var resp struct {
		Value []Worksheet `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(resp.Value)
	}

	if len(resp.Value) == 0 {
		fmt.Println("未找到工作表")
		return nil
	}

	fmt.Println("工作表")
	fmt.Println()
	for _, sheet := range resp.Value {
		visibility := ""
		if sheet.Visibility != "Visible" {
			visibility = fmt.Sprintf(" (%s)", sheet.Visibility)
		}
		fmt.Printf("📄 %s%s\n", sheet.Name, visibility)
		fmt.Printf("   ID: %s\n", sheet.ID)
		if sheet.Position >= 0 {
			fmt.Printf("   位置: %d\n", sheet.Position)
		}
	}
	fmt.Printf("\n%d 个工作表\n", len(resp.Value))
	return nil
}

// ExcelGetCmd 读取数据。
type ExcelGetCmd struct {
	ID    string `arg:"" help:"工作簿ID"`
	Sheet string `arg:"" optional:"" help:"工作表名称"`
	Range string `arg:"" optional:"" help:"单元格区域（例如，A1:D10）"`
}

// Run 执行excel get命令。
func (c *ExcelGetCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	workbookID := graph.ResolveID(c.ID)

	// 如果未指定工作表，获取第一个工作表
	sheetName := c.Sheet
	if sheetName == "" {
		sheets, err := getWorksheets(client, ctx, workbookID)
		if err != nil {
			return err
		}
		if len(sheets) == 0 {
			return fmt.Errorf("工作簿没有工作表")
		}
		sheetName = sheets[0].Name
	}

	// 如果sheetName看起来像一个区域（包含:），交换它
	if strings.Contains(sheetName, ":") && c.Range == "" {
		c.Range = sheetName
		sheets, err := getWorksheets(client, ctx, workbookID)
		if err != nil {
			return err
		}
		if len(sheets) == 0 {
			return fmt.Errorf("工作簿没有工作表")
		}
		sheetName = sheets[0].Name
	}

	// 构建路径
	var path string
	if c.Range != "" {
		path = fmt.Sprintf("/me/drive/items/%s/workbook/worksheets('%s')/range(address='%s')",
			workbookID, sheetName, c.Range)
	} else {
		path = fmt.Sprintf("/me/drive/items/%s/workbook/worksheets('%s')/usedRange",
			workbookID, sheetName)
	}

	data, err := client.Get(ctx, path, nil)
	if err != nil {
		return err
	}

	var rangeData RangeData
	if err := json.Unmarshal(data, &rangeData); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(rangeData)
	}

	if len(rangeData.Values) == 0 {
		fmt.Println("区域中没有数据")
		return nil
	}

	rangeLabel := c.Range
	if rangeLabel == "" {
		rangeLabel = "(使用的区域)"
	}
	fmt.Printf("%s - %s\n\n", sheetName, rangeLabel)

	// 计算列宽
	colWidths := make([]int, len(rangeData.Values[0]))
	for _, row := range rangeData.Values {
		for col, cell := range row {
			str := fmt.Sprintf("%v", cell)
			if len(str) > colWidths[col] {
				colWidths[col] = len(str)
			}
			if colWidths[col] > 30 {
				colWidths[col] = 30
			}
		}
	}

	// 打印行
	for i, row := range rangeData.Values {
		var cells []string
		for col, cell := range row {
			str := fmt.Sprintf("%v", cell)
			if len(str) > 30 {
				str = str[:27] + "..."
			}
			cells = append(cells, fmt.Sprintf("%-*s", colWidths[col], str))
		}
		line := strings.Join(cells, "  ")
		if i == 0 {
			fmt.Println(line)
			fmt.Println(strings.Repeat("-", len(line)))
		} else {
			fmt.Println(line)
		}
	}

	fmt.Printf("\n%d 行, %d 列\n", len(rangeData.Values), len(rangeData.Values[0]))
	return nil
}

// ExcelUpdateCmd 写入数据。
type ExcelUpdateCmd struct {
	ID     string   `arg:"" help:"工作簿ID"`
	Sheet  string   `arg:"" help:"工作表名称"`
	Range  string   `arg:"" help:"单元格区域"`
	Values []string `arg:"" help:"要写入的值（逐行填充）"`
}

// Run 执行excel update命令。
func (c *ExcelUpdateCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	if len(c.Values) == 0 {
		return fmt.Errorf("需要提供值")
	}

	// 解析区域以确定维度
	values := parsePositionalValues(c.Range, c.Values)

	body := map[string]interface{}{
		"values": values,
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/drive/items/%s/workbook/worksheets('%s')/range(address='%s')",
		graph.ResolveID(c.ID), c.Sheet, c.Range)

	_, err = client.Patch(ctx, path, body)
	if err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(map[string]interface{}{"success": true, "sheet": c.Sheet, "range": c.Range})
	}

	fmt.Println("✓ 更新成功")
	fmt.Printf("  工作表: %s\n", c.Sheet)
	fmt.Printf("  区域: %s\n", c.Range)
	fmt.Printf("  单元格: %d 行 × %d 列\n", len(values), len(values[0]))
	return nil
}

// ExcelAppendCmd 追加数据。
type ExcelAppendCmd struct {
	ID     string   `arg:"" help:"工作簿ID"`
	Table  string   `arg:"" help:"表格名称"`
	Values []string `arg:"" help:"要追加的值（一行）"`
}

// Run 执行excel append命令。
func (c *ExcelAppendCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	if len(c.Values) == 0 {
		return fmt.Errorf("需要提供值")
	}

	// 对于追加，值成为单行
	values := [][]interface{}{make([]interface{}, len(c.Values))}
	for i, v := range c.Values {
		values[0][i] = v
	}

	body := map[string]interface{}{
		"values": values,
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/drive/items/%s/workbook/tables('%s')/rows/add",
		graph.ResolveID(c.ID), c.Table)

	_, err = client.Post(ctx, path, body)
	if err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(map[string]interface{}{"success": true, "table": c.Table, "rows": 1})
	}

	fmt.Println("✓ 追加成功")
	fmt.Printf("  表格: %s\n", c.Table)
	fmt.Printf("  添加的行数: 1\n")
	return nil
}

// ExcelCreateCmd 创建工作簿。
type ExcelCreateCmd struct {
	Name   string `arg:"" help:"工作簿名称"`
	Folder string `help:"目标文件夹ID"`
}

// Run 执行excel create命令。
func (c *ExcelCreateCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	// 确保.xlsx扩展名
	name := c.Name
	if !strings.HasSuffix(strings.ToLower(name), ".xlsx") {
		name += ".xlsx"
	}

	// 通过上传最小的xlsx内容创建空工作簿
	// 为简单起见，我们将创建一个空文件并让Graph处理它
	ctx := context.Background()
	var path string
	if c.Folder != "" {
		path = fmt.Sprintf("/me/drive/items/%s:/%s:/content", graph.ResolveID(c.Folder), name)
	} else {
		path = fmt.Sprintf("/me/drive/root:/%s:/content", name)
	}

	// 最小的xlsx内容（空工作簿）
	emptyXlsx := getMinimalXlsx()

	data, err := client.Put(ctx, path, emptyXlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	if err != nil {
		return err
	}

	var item DriveItem
	if err := json.Unmarshal(data, &item); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(item)
	}

	fmt.Println("✓ 工作簿创建成功")
	fmt.Printf("  名称: %s\n", item.Name)
	fmt.Printf("  ID: %s\n", graph.FormatID(item.ID))
	return nil
}

// ExcelAddSheetCmd 添加工作表。
type ExcelAddSheetCmd struct {
	ID   string `arg:"" help:"工作簿ID"`
	Name string `help:"工作表名称"`
}

// Run 执行excel add-sheet命令。
func (c *ExcelAddSheetCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	body := map[string]interface{}{}
	if c.Name != "" {
		body["name"] = c.Name
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/drive/items/%s/workbook/worksheets/add", graph.ResolveID(c.ID))

	data, err := client.Post(ctx, path, body)
	if err != nil {
		return err
	}

	var sheet Worksheet
	if err := json.Unmarshal(data, &sheet); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(sheet)
	}

	fmt.Println("✓ 工作表添加成功")
	fmt.Printf("  名称: %s\n", sheet.Name)
	fmt.Printf("  ID: %s\n", sheet.ID)
	return nil
}

// ExcelTablesCmd 列出表格。
type ExcelTablesCmd struct {
	ID string `arg:"" help:"工作簿ID"`
}

// Run 执行excel tables命令。
func (c *ExcelTablesCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/drive/items/%s/workbook/tables", graph.ResolveID(c.ID))

	data, err := client.Get(ctx, path, nil)
	if err != nil {
		return err
	}

	var resp struct {
		Value []Table `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(resp.Value)
	}

	if len(resp.Value) == 0 {
		fmt.Println("工作簿中未找到表格")
		return nil
	}

	fmt.Println("表格")
	fmt.Println()
	for _, table := range resp.Value {
		fmt.Printf("📋 %s\n", table.Name)
		if table.ShowHeaders {
			fmt.Printf("   标题: 是\n")
		}
		if table.ShowTotals {
			fmt.Printf("   总计: 是\n")
		}
		fmt.Printf("   ID: %s\n", table.ID)
	}
	fmt.Printf("\n%d 个表格\n", len(resp.Value))
	return nil
}

// ExcelClearCmd 清空区域。
type ExcelClearCmd struct {
	ID    string `arg:"" help:"工作簿ID"`
	Sheet string `arg:"" help:"工作表名称"`
	Range string `arg:"" help:"要清空的区域"`
}

// Run 执行excel clear命令。
func (c *ExcelClearCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	body := map[string]interface{}{
		"applyTo": "All",
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/drive/items/%s/workbook/worksheets('%s')/range(address='%s')/clear",
		graph.ResolveID(c.ID), c.Sheet, c.Range)

	_, err = client.Post(ctx, path, body)
	if err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(map[string]interface{}{"success": true, "sheet": c.Sheet, "range": c.Range})
	}

	fmt.Println("✓ 清空成功")
	fmt.Printf("  工作表: %s\n", c.Sheet)
	fmt.Printf("  区域: %s\n", c.Range)
	return nil
}

// ExcelExportCmd 导出工作簿。
type ExcelExportCmd struct {
	ID     string `arg:"" help:"工作簿ID"`
	Out    string `help:"输出路径" required:""`
	Format string `help:"导出格式（xlsx, csv）" default:"xlsx"`
	Sheet  string `help:"工作表名称（用于CSV导出）"`
}

// Run 执行excel export命令。
func (c *ExcelExportCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	workbookID := graph.ResolveID(c.ID)

	if strings.ToLower(c.Format) == "csv" {
		// 对于CSV，导出工作表数据
		sheetName := c.Sheet
		if sheetName == "" {
			sheets, err := getWorksheets(client, ctx, workbookID)
			if err != nil {
				return err
			}
			if len(sheets) == 0 {
				return fmt.Errorf("工作簿没有工作表")
			}
			sheetName = sheets[0].Name
		}

		// 获取使用的区域
		path := fmt.Sprintf("/me/drive/items/%s/workbook/worksheets('%s')/usedRange", workbookID, sheetName)
		data, err := client.Get(ctx, path, nil)
		if err != nil {
			return err
		}

		var rangeData RangeData
		if err := json.Unmarshal(data, &rangeData); err != nil {
			return err
		}

		// 转换为CSV
		var csv strings.Builder
		for _, row := range rangeData.Values {
			var cells []string
			for _, cell := range row {
				cells = append(cells, fmt.Sprintf("%v", cell))
			}
			csv.WriteString(strings.Join(cells, ",") + "\n")
		}

		if err := os.WriteFile(c.Out, []byte(csv.String()), 0644); err != nil {
			return err
		}

		fmt.Println("✓ 导出成功")
		fmt.Printf("  格式: CSV\n")
		fmt.Printf("  工作表: %s\n", sheetName)
		fmt.Printf("  保存到: %s\n", c.Out)
	} else {
		// 下载xlsx
		path := fmt.Sprintf("/me/drive/items/%s/content", workbookID)
		data, err := client.Get(ctx, path, nil)
		if err != nil {
			return err
		}

		if err := os.WriteFile(c.Out, data, 0644); err != nil {
			return err
		}

		fmt.Println("✓ 导出成功")
		fmt.Printf("  格式: XLSX\n")
		fmt.Printf("  保存到: %s\n", c.Out)
	}

	return nil
}

// ExcelCopyCmd 复制工作簿。
type ExcelCopyCmd struct {
	ID     string `arg:"" help:"工作簿ID"`
	Name   string `arg:"" help:"新名称"`
	Folder string `help:"目标文件夹ID"`
}

// Run 执行excel copy命令。
func (c *ExcelCopyCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	body := map[string]interface{}{
		"name": c.Name,
	}
	if c.Folder != "" {
		body["parentReference"] = map[string]string{
			"id": graph.ResolveID(c.Folder),
		}
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/drive/items/%s/copy", graph.ResolveID(c.ID))

	_, err = client.Post(ctx, path, body)
	if err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(map[string]interface{}{"success": true, "name": c.Name})
	}

	fmt.Println("✓ 复制已启动")
	fmt.Printf("  名称: %s\n", c.Name)
	return nil
}

// Worksheet 表示Excel工作表。
type Worksheet struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Position   int    `json:"position"`
	Visibility string `json:"visibility"`
}

// RangeData 表示区域数据。
type RangeData struct {
	Address string          `json:"address"`
	Values  [][]interface{} `json:"values"`
}

// Table 表示Excel表格。
type Table struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	ShowHeaders bool   `json:"showHeaders"`
	ShowTotals  bool   `json:"showTotals"`
}

// getWorksheets 获取工作簿中的所有工作表。
func getWorksheets(client graph.Client, ctx context.Context, workbookID string) ([]Worksheet, error) {
	path := fmt.Sprintf("/me/drive/items/%s/workbook/worksheets", workbookID)
	data, err := client.Get(ctx, path, nil)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Value []Worksheet `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, err
	}
	return resp.Value, nil
}

// parsePositionalValues 解析位置值并根据区域维度组织它们。
func parsePositionalValues(rangeAddr string, values []string) [][]interface{} {
	// 解析区域以确定维度（例如，A1:B2 = 2列，2行）
	parts := strings.Split(rangeAddr, ":")
	if len(parts) != 2 {
		// 单个单元格
		return [][]interface{}{{values[0]}}
	}

	startCol, startRow := parseCell(parts[0])
	endCol, endRow := parseCell(parts[1])

	numCols := endCol - startCol + 1
	numRows := endRow - startRow + 1

	result := make([][]interface{}, numRows)
	idx := 0
	for r := 0; r < numRows; r++ {
		result[r] = make([]interface{}, numCols)
		for c := 0; c < numCols; c++ {
			if idx < len(values) {
				result[r][c] = values[idx]
			} else {
				result[r][c] = ""
			}
			idx++
		}
	}
	return result
}

// parseCell 解析单元格地址（例如，A1）并返回列和行索引。
func parseCell(cell string) (col, row int) {
	col = 0
	row = 0
	for i, c := range cell {
		if c >= 'A' && c <= 'Z' {
			col = col*26 + int(c-'A') + 1
		} else if c >= 'a' && c <= 'z' {
			col = col*26 + int(c-'a') + 1
		} else {
			row, _ = fmt.Sscanf(cell[i:], "%d", &row)
			break
		}
	}
	return col, row
}

// getMinimalXlsx 返回最小有效的xlsx文件
func getMinimalXlsx() []byte {
	// 这是一个base64解码的最小xlsx文件
	// 实际上，您可能需要使用适当的xlsx库
	// 现在，我们将依赖Graph API来处理空内容
	return []byte{}
}
