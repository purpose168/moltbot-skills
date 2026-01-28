package cli

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"

	"github.com/visionik/mogcli/internal/graph"
)

// ContactsCmd 处理联系人操作命令。
type ContactsCmd struct {
	List      ContactsListCmd      `cmd:"" help:"列出联系人"`
	Search    ContactsSearchCmd    `cmd:"" help:"搜索联系人"`
	Get       ContactsGetCmd       `cmd:"" help:"获取联系人"`
	Create    ContactsCreateCmd    `cmd:"" help:"创建联系人"`
	Update    ContactsUpdateCmd    `cmd:"" help:"更新联系人"`
	Delete    ContactsDeleteCmd    `cmd:"" help:"删除联系人"`
	Directory ContactsDirectoryCmd `cmd:"" help:"搜索组织目录"`
}

// ContactsListCmd 列出联系人。
type ContactsListCmd struct {
	Max int `help:"最大结果数" default:"50"`
}

// Run 执行联系人列表命令。
func (c *ContactsListCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	query := url.Values{}
	query.Set("$top", fmt.Sprintf("%d", c.Max))
	query.Set("$orderby", "displayName")

	data, err := client.Get(ctx, "/me/contacts", query)
	if err != nil {
		return err
	}

	var resp struct {
		Value []Contact `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(resp.Value)
	}

	for _, c := range resp.Value {
		email := ""
		if len(c.EmailAddresses) > 0 {
			email = c.EmailAddresses[0].Address
		}
		fmt.Printf("%-30s %-30s %s\n", c.DisplayName, email, graph.FormatID(c.ID))
	}
	return nil
}

// ContactsSearchCmd 搜索联系人。
type ContactsSearchCmd struct {
	Query string `arg:"" help:"搜索查询"`
}

// Run 执行联系人搜索命令。
func (c *ContactsSearchCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	query := url.Values{}
	query.Set("$filter", fmt.Sprintf("contains(displayName,'%s') or contains(emailAddresses/any(a:a/address),'%s')", c.Query, c.Query))

	data, err := client.Get(ctx, "/me/contacts", query)
	if err != nil {
		return err
	}

	var resp struct {
		Value []Contact `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(resp.Value)
	}

	for _, c := range resp.Value {
		email := ""
		if len(c.EmailAddresses) > 0 {
			email = c.EmailAddresses[0].Address
		}
		fmt.Printf("%-30s %-30s %s\n", c.DisplayName, email, graph.FormatID(c.ID))
	}
	return nil
}

// ContactsGetCmd 获取联系人。
type ContactsGetCmd struct {
	ID string `arg:"" help:"联系人 ID"`
}

// Run 执行联系人获取命令。
func (c *ContactsGetCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/contacts/%s", graph.ResolveID(c.ID))

	data, err := client.Get(ctx, path, nil)
	if err != nil {
		return err
	}

	var contact Contact
	if err := json.Unmarshal(data, &contact); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(contact)
	}

	fmt.Printf("ID:    %s\n", graph.FormatID(contact.ID))
	fmt.Printf("姓名:  %s\n", contact.DisplayName)
	for _, e := range contact.EmailAddresses {
		fmt.Printf("邮箱: %s\n", e.Address)
	}
	for _, p := range contact.BusinessPhones {
		fmt.Printf("电话: %s (工作)\n", p)
	}
	if contact.MobilePhone != "" {
		fmt.Printf("电话: %s (移动)\n", contact.MobilePhone)
	}
	if contact.CompanyName != "" {
		fmt.Printf("公司: %s\n", contact.CompanyName)
	}
	if contact.JobTitle != "" {
		fmt.Printf("职位: %s\n", contact.JobTitle)
	}
	return nil
}

// ContactsCreateCmd 创建联系人。
type ContactsCreateCmd struct {
	Name    string `help:"显示姓名" required:"" name:"name"`
	Email   string `help:"电子邮件地址"`
	Phone   string `help:"电话号码"`
	Company string `help:"公司名称"`
	Title   string `help:"职位"`
}

// Run 执行联系人创建命令。
func (c *ContactsCreateCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	contact := map[string]interface{}{
		"displayName": c.Name,
	}

	if c.Email != "" {
		contact["emailAddresses"] = []map[string]string{
			{"address": c.Email},
		}
	}

	if c.Phone != "" {
		contact["businessPhones"] = []string{c.Phone}
	}

	if c.Company != "" {
		contact["companyName"] = c.Company
	}

	if c.Title != "" {
		contact["jobTitle"] = c.Title
	}

	ctx := context.Background()
	data, err := client.Post(ctx, "/me/contacts", contact)
	if err != nil {
		return err
	}

	var created Contact
	if err := json.Unmarshal(data, &created); err != nil {
		return err
	}

	fmt.Printf("✓ 联系人创建成功: %s (%s)\n", created.DisplayName, graph.FormatID(created.ID))
	return nil
}

// ContactsUpdateCmd 更新联系人。
type ContactsUpdateCmd struct {
	ID      string `arg:"" help:"联系人 ID"`
	Name    string `help:"显示姓名"`
	Email   string `help:"电子邮件地址"`
	Phone   string `help:"电话号码"`
	Company string `help:"公司名称"`
	Title   string `help:"职位"`
}

// Run 执行联系人更新命令。
func (c *ContactsUpdateCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	updates := make(map[string]interface{})

	if c.Name != "" {
		updates["displayName"] = c.Name
	}
	if c.Email != "" {
		updates["emailAddresses"] = []map[string]string{{"address": c.Email}}
	}
	if c.Phone != "" {
		updates["businessPhones"] = []string{c.Phone}
	}
	if c.Company != "" {
		updates["companyName"] = c.Company
	}
	if c.Title != "" {
		updates["jobTitle"] = c.Title
	}

	if len(updates) == 0 {
		return fmt.Errorf("未指定更新内容")
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/contacts/%s", graph.ResolveID(c.ID))

	_, err = client.Patch(ctx, path, updates)
	if err != nil {
		return err
	}

	fmt.Println("✓ 联系人更新成功")
	return nil
}

// ContactsDeleteCmd 删除联系人。
type ContactsDeleteCmd struct {
	ID string `arg:"" help:"联系人 ID"`
}

// Run 执行联系人删除命令。
func (c *ContactsDeleteCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/contacts/%s", graph.ResolveID(c.ID))

	if err := client.Delete(ctx, path); err != nil {
		return err
	}

	fmt.Println("✓ 联系人删除成功")
	return nil
}

// ContactsDirectoryCmd 搜索组织目录。
type ContactsDirectoryCmd struct {
	Query string `arg:"" help:"搜索查询"`
}

// Run 执行联系人目录命令。
func (c *ContactsDirectoryCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	query := url.Values{}
	query.Set("$search", fmt.Sprintf(`"displayName:%s" OR "mail:%s"`, c.Query, c.Query))
	query.Set("$top", "25")

	data, err := client.Get(ctx, "/users", query)
	if err != nil {
		return err
	}

	var resp struct {
		Value []DirectoryUser `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(resp.Value)
	}

	for _, u := range resp.Value {
		fmt.Printf("%-30s %-30s %s\n", u.DisplayName, u.Mail, u.JobTitle)
	}
	return nil
}

// Contact 表示联系人。
type Contact struct {
	ID             string        `json:"id"`
	DisplayName    string        `json:"displayName"`
	EmailAddresses []EmailRecord `json:"emailAddresses"`
	BusinessPhones []string      `json:"businessPhones"`
	MobilePhone    string        `json:"mobilePhone"`
	CompanyName    string        `json:"companyName"`
	JobTitle       string        `json:"jobTitle"`
}

// EmailRecord 表示电子邮件记录。
type EmailRecord struct {
	Address string `json:"address"`
	Name    string `json:"name"`
}

// DirectoryUser 表示目录用户。
type DirectoryUser struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
	Mail        string `json:"mail"`
	JobTitle    string `json:"jobTitle"`
}
