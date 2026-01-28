package cli

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/visionik/sogcli/internal/caldav"
	"github.com/visionik/sogcli/internal/config"
)

// CalCmd 处理日历相关操作
type CalCmd struct {
	List      CalListCmd      `cmd:"" aliases:"events" help:"列出日历事件"`
	Get       CalGetCmd       `cmd:"" aliases:"event" help:"获取事件详情"`
	Search    CalSearchCmd    `cmd:"" help:"搜索日历事件"`
	Today     CalTodayCmd     `cmd:"" help:"今日事件"`
	Week      CalWeekCmd      `cmd:"" help:"本周事件"`
	Create    CalCreateCmd    `cmd:"" help:"创建日历事件"`
	Update    CalUpdateCmd    `cmd:"" help:"更新日历事件"`
	Delete    CalDeleteCmd    `cmd:"" help:"删除日历事件"`
	Calendars CalCalendarsCmd `cmd:"" help:"列出所有日历"`
}

// CalListCmd 列出日历中的事件
type CalListCmd struct {
	Calendar string `arg:"" optional:"" help:"日历路径（默认：primary）"`
	From     string `help:"开始日期（YYYY-MM-DD或相对日期：today, tomorrow）" default:"today"`
	To       string `help:"结束日期（YYYY-MM-DD或相对日期：+7d, +30d）" default:"+30d"`
	Max      int    `help:"返回的最大事件数" default:"50"`
}

// Run 执行日历列表命令
func (c *CalListCmd) Run(root *Root) error {
	// 获取CalDAV客户端和默认日历路径
	client, calPath, err := getCalDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 如果指定了日历路径，则使用指定的路径
	if c.Calendar != "" {
		calPath = c.Calendar
	}

	// 解析开始日期
	start, err := parseDate(c.From)
	if err != nil {
		return fmt.Errorf("无效的 --from 日期: %w", err)
	}
	// 解析结束日期
	end, err := parseDate(c.To)
	if err != nil {
		return fmt.Errorf("无效的 --to 日期: %w", err)
	}

	// 获取指定时间范围内的事件
	ctx := context.Background()
	events, err := client.ListEvents(ctx, calPath, start, end)
	if err != nil {
		return fmt.Errorf("列出事件失败: %w", err)
	}

	// 检查是否有事件
	if len(events) == 0 {
		fmt.Println("未找到事件。")
		return nil
	}

	// 限制返回的事件数量
	if c.Max > 0 && len(events) > c.Max {
		events = events[:c.Max]
	}

	// 根据输出格式返回结果
	if root.JSON {
		return outputEventsJSON(events)
	}

	return outputEventsTable(events)
}

// CalTodayCmd 列出今日事件
type CalTodayCmd struct {
	Calendar string `arg:"" optional:"" help:"日历路径（默认：primary）"`
}

// Run 执行今日事件命令
func (c *CalTodayCmd) Run(root *Root) error {
	// 创建并执行CalListCmd命令，设置时间范围为今天到明天
	cmd := &CalListCmd{
		Calendar: c.Calendar,
		From:     "today",
		To:       "tomorrow",
	}
	return cmd.Run(root)
}

// CalWeekCmd 列出本周事件
type CalWeekCmd struct {
	Calendar string `arg:"" optional:"" help:"日历路径（默认：primary）"`
}

// Run 执行本周事件命令
func (c *CalWeekCmd) Run(root *Root) error {
	// 创建并执行CalListCmd命令，设置时间范围为今天到7天后
	cmd := &CalListCmd{
		Calendar: c.Calendar,
		From:     "today",
		To:       "+7d",
	}
	return cmd.Run(root)
}

// CalGetCmd 获取事件详情
type CalGetCmd struct {
	UID      string `arg:"" help:"事件UID"`
	Calendar string `help:"日历路径（默认：primary）"`
}

// Run 执行获取事件详情命令
func (c *CalGetCmd) Run(root *Root) error {
	// 获取CalDAV客户端和默认日历路径
	client, calPath, err := getCalDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 如果指定了日历路径，则使用指定的路径
	if c.Calendar != "" {
		calPath = c.Calendar
	}

	// 获取指定UID的事件详情
	ctx := context.Background()
	event, err := client.GetEvent(ctx, calPath, c.UID)
	if err != nil {
		return fmt.Errorf("获取事件失败: %w", err)
	}

	// 根据输出格式返回结果
	if root.JSON {
		return outputEventsJSON([]caldav.Event{*event})
	}

	return outputEventDetail(event)
}

// CalSearchCmd 搜索日历事件
type CalSearchCmd struct {
	Query    string `arg:"" help:"搜索查询（匹配标题、描述、地点）"`
	Calendar string `help:"日历路径（默认：primary）"`
	From     string `help:"开始日期" default:"today"`
	To       string `help:"结束日期" default:"+365d"`
	Max      int    `help:"最大结果数" default:"50"`
}

// Run 执行搜索事件命令
func (c *CalSearchCmd) Run(root *Root) error {
	// 获取CalDAV客户端和默认日历路径
	client, calPath, err := getCalDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 如果指定了日历路径，则使用指定的路径
	if c.Calendar != "" {
		calPath = c.Calendar
	}

	// 解析开始日期
	from, err := parseDate(c.From)
	if err != nil {
		return fmt.Errorf("无效的 --from: %w", err)
	}
	// 解析结束日期
	to, err := parseDate(c.To)
	if err != nil {
		return fmt.Errorf("无效的 --to: %w", err)
	}

	// 获取指定时间范围内的事件
	ctx := context.Background()
	events, err := client.ListEvents(ctx, calPath, from, to)
	if err != nil {
		return fmt.Errorf("列出事件失败: %w", err)
	}

	// 根据查询条件过滤事件
	query := strings.ToLower(c.Query)
	var matches []caldav.Event
	for _, e := range events {
		if strings.Contains(strings.ToLower(e.Summary), query) ||
			strings.Contains(strings.ToLower(e.Description), query) ||
			strings.Contains(strings.ToLower(e.Location), query) {
			matches = append(matches, e)
			if len(matches) >= c.Max {
				break
			}
		}
	}

	// 检查是否有匹配的事件
	if len(matches) == 0 {
		fmt.Println("未找到匹配的事件。")
		return nil
	}

	// 根据输出格式返回结果
	if root.JSON {
		return outputEventsJSON(matches)
	}

	return outputEventsTable(matches)
}

// CalCreateCmd 创建日历事件
type CalCreateCmd struct {
	Title       string   `arg:"" help:"事件标题"`
	Start       string   `help:"开始时间（YYYY-MM-DDTHH:MM 或 YYYY-MM-DD 表示全天）" required:""`
	End         string   `help:"结束时间（YYYY-MM-DDTHH:MM 或 YYYY-MM-DD 表示全天）"`
	Duration    string   `help:"持续时间（例如：1h, 30m）- 替代 --end"`
	Location    string   `help:"事件地点"`
	Description string   `help:"事件描述"`
	Calendar    string   `help:"日历路径（默认：primary）"`
	Attendees   []string `help:"参与者邮箱地址"`
}

// Run 执行创建事件命令
func (c *CalCreateCmd) Run(root *Root) error {
	// 获取CalDAV客户端和默认日历路径
	client, calPath, err := getCalDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 如果指定了日历路径，则使用指定的路径
	if c.Calendar != "" {
		calPath = c.Calendar
	}

	// 解析开始时间
	start, allDay, err := parseDateTime(c.Start)
	if err != nil {
		return fmt.Errorf("无效的 --start: %w", err)
	}

	// 解析结束时间
	var end time.Time
	if c.End != "" {
		// 如果指定了结束时间，则直接解析
		end, _, err = parseDateTime(c.End)
		if err != nil {
			return fmt.Errorf("无效的 --end: %w", err)
		}
	} else if c.Duration != "" {
		// 如果指定了持续时间，则计算结束时间
		dur, err := time.ParseDuration(c.Duration)
		if err != nil {
			return fmt.Errorf("无效的 --duration: %w", err)
		}
		end = start.Add(dur)
	} else if allDay {
		// 如果是全天事件且未指定结束时间，则默认为第二天
		end = start.AddDate(0, 0, 1)
	} else {
		// 如果是定时事件且未指定结束时间，则默认为1小时后
		end = start.Add(1 * time.Hour)
	}

	// 创建事件对象
	event := &caldav.Event{
		UID:         generateUID(),
		Summary:     c.Title,
		Start:       start,
		End:         end,
		AllDay:      allDay,
		Location:    c.Location,
		Description: c.Description,
		Attendees:   c.Attendees,
	}

	// 创建事件
	ctx := context.Background()
	if err := client.CreateEvent(ctx, calPath, event); err != nil {
		return fmt.Errorf("创建事件失败: %w", err)
	}

	// 根据输出格式返回结果
	if root.JSON {
		return outputEventsJSON([]caldav.Event{*event})
	}

	fmt.Printf("创建事件成功: %s (%s)\n", event.Summary, event.UID)
	return nil
}

// CalUpdateCmd 更新日历事件
type CalUpdateCmd struct {
	UID         string `arg:"" help:"事件UID"`
	Title       string `help:"新标题"`
	Start       string `help:"新开始时间"`
	End         string `help:"新结束时间"`
	Location    string `help:"新地点"`
	Description string `help:"新描述"`
	Calendar    string `help:"日历路径（默认：primary）"`
}

// Run 执行更新事件命令
func (c *CalUpdateCmd) Run(root *Root) error {
	// 获取CalDAV客户端和默认日历路径
	client, calPath, err := getCalDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 如果指定了日历路径，则使用指定的路径
	if c.Calendar != "" {
		calPath = c.Calendar
	}

	// 获取指定UID的事件
	ctx := context.Background()
	event, err := client.GetEvent(ctx, calPath, c.UID)
	if err != nil {
		return fmt.Errorf("获取事件失败: %w", err)
	}

	// 应用更新
	if c.Title != "" {
		event.Summary = c.Title
	}
	if c.Start != "" {
		// 解析新的开始时间
		start, allDay, err := parseDateTime(c.Start)
		if err != nil {
			return fmt.Errorf("无效的 --start: %w", err)
		}
		event.Start = start
		event.AllDay = allDay
	}
	if c.End != "" {
		// 解析新的结束时间
		end, _, err := parseDateTime(c.End)
		if err != nil {
			return fmt.Errorf("无效的 --end: %w", err)
		}
		event.End = end
	}
	if c.Location != "" {
		event.Location = c.Location
	}
	if c.Description != "" {
		event.Description = c.Description
	}

	// 更新事件
	if err := client.UpdateEvent(ctx, calPath, event); err != nil {
		return fmt.Errorf("更新事件失败: %w", err)
	}

	fmt.Printf("更新事件成功: %s\n", c.UID)
	return nil
}

// CalDeleteCmd 删除日历事件
type CalDeleteCmd struct {
	UID      string `arg:"" help:"事件UID"`
	Calendar string `help:"日历路径（默认：primary）"`
}

// Run 执行删除事件命令
func (c *CalDeleteCmd) Run(root *Root) error {
	// 获取CalDAV客户端和默认日历路径
	client, calPath, err := getCalDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 如果指定了日历路径，则使用指定的路径
	if c.Calendar != "" {
		calPath = c.Calendar
	}

	// 删除指定UID的事件
	ctx := context.Background()
	if err := client.DeleteEvent(ctx, calPath, c.UID); err != nil {
		return fmt.Errorf("删除事件失败: %w", err)
	}

	fmt.Printf("删除事件成功: %s\n", c.UID)
	return nil
}

// CalCalendarsCmd 列出可用的日历
type CalCalendarsCmd struct{}

// Run 执行列出日历命令
func (c *CalCalendarsCmd) Run(root *Root) error {
	// 获取CalDAV客户端
	client, _, err := getCalDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 查找所有日历
	ctx := context.Background()
	calendars, err := client.FindCalendars(ctx)
	if err != nil {
		return fmt.Errorf("列出日历失败: %w", err)
	}

	// 检查是否有日历
	if len(calendars) == 0 {
		fmt.Println("未找到日历。")
		return nil
	}

	// 根据输出格式返回结果
	if root.JSON {
		return outputCalendarsJSON(calendars)
	}

	// 输出日历列表
	fmt.Printf("%-40s %s\n", "路径", "名称")
	for _, cal := range calendars {
		fmt.Printf("%-40s %s\n", cal.Path, cal.Name)
	}
	return nil
}

// getCalDAVClient 从配置创建CalDAV客户端
func getCalDAVClient(root *Root) (*caldav.Client, string, error) {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		return nil, "", fmt.Errorf("加载配置失败: %w", err)
	}

	// 获取账户信息
	email := root.Account
	if email == "" {
		email = cfg.DefaultAccount
	}
	if email == "" {
		return nil, "", fmt.Errorf("未指定账户。使用 --account 或设置默认账户")
	}

	// 获取账户配置
	acct, err := cfg.GetAccount(email)
	if err != nil {
		return nil, "", err
	}

	// 检查CalDAV URL配置
	if acct.CalDAV.URL == "" {
		return nil, "", fmt.Errorf("%s 未配置CalDAV URL。运行: sog auth add %s --caldav-url <url>", email, email)
	}

	// 获取CalDAV密码
	password, err := cfg.GetPasswordForProtocol(email, config.ProtocolCalDAV)
	if err != nil {
		return nil, "", fmt.Errorf("获取密码失败: %w", err)
	}

	// 连接CalDAV服务器
	client, err := caldav.Connect(caldav.Config{
		URL:      acct.CalDAV.URL,
		Email:    email,
		Password: password,
	})
	if err != nil {
		return nil, "", fmt.Errorf("连接CalDAV失败: %w", err)
	}

	return client, acct.CalDAV.DefaultCalendar, nil
}

// parseDate 解析日期字符串（YYYY-MM-DD, today, tomorrow, +Nd）
func parseDate(s string) (time.Time, error) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	// 处理相对日期
	switch strings.ToLower(s) {
	case "today":
		return today, nil
	case "tomorrow":
		return today.AddDate(0, 0, 1), nil
	case "yesterday":
		return today.AddDate(0, 0, -1), nil
	}

	// 处理相对天数：+Nd
	if strings.HasPrefix(s, "+") && strings.HasSuffix(s, "d") {
		var days int
		if _, err := fmt.Sscanf(s, "+%dd", &days); err == nil {
			return today.AddDate(0, 0, days), nil
		}
	}

	// 处理ISO日期格式
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return time.Time{}, fmt.Errorf("无效的日期格式: %s (使用 YYYY-MM-DD, today, tomorrow, 或 +Nd)", s)
	}
	return t, nil
}

// parseDateTime 解析日期时间字符串（YYYY-MM-DDTHH:MM 或 YYYY-MM-DD）
func parseDateTime(s string) (time.Time, bool, error) {
	// 尝试解析完整的日期时间格式
	t, err := time.Parse("2006-01-02T15:04", s)
	if err == nil {
		return t, false, nil
	}

	// 尝试解析仅日期格式（全天事件）
	t, err = time.Parse("2006-01-02", s)
	if err == nil {
		return t, true, nil
	}

	return time.Time{}, false, fmt.Errorf("无效的日期时间格式: %s (使用 YYYY-MM-DDTHH:MM 或 YYYY-MM-DD)", s)
}

// generateUID 生成事件的唯一标识符
func generateUID() string {
	return fmt.Sprintf("%d@sog", time.Now().UnixNano())
}

// outputEventsJSON 以JSON格式输出事件
func outputEventsJSON(events []caldav.Event) error {
	for _, e := range events {
		fmt.Printf(`{"uid":"%s","summary":"%s","start":"%s","end":"%s","location":"%s","all_day":%t}`+"\n",
			e.UID, e.Summary, e.Start.Format(time.RFC3339), e.End.Format(time.RFC3339), e.Location, e.AllDay)
	}
	return nil
}

// outputEventsTable 以表格形式输出事件
func outputEventsTable(events []caldav.Event) error {
	// 输出表头
	fmt.Printf("%-20s %-12s %-8s %s\n", "日期", "时间", "持续时间", "标题")
	
	for _, e := range events {
		date := e.Start.Format("2006-01-02 Mon")
		var timeStr, durStr string
		
		if e.AllDay {
			// 处理全天事件
			timeStr = "全天"
			durStr = ""
		} else {
			// 处理定时事件
			timeStr = e.Start.Format("15:04")
			// 计算持续时间
			if e.End.IsZero() || e.End.Before(e.Start) {
				durStr = "-"
			} else {
				dur := e.End.Sub(e.Start)
				if dur.Hours() >= 1 {
					durStr = fmt.Sprintf("%.0fh", dur.Hours())
				} else {
					durStr = fmt.Sprintf("%.0fm", dur.Minutes())
				}
			}
		}
		
		// 处理过长的标题
		summary := e.Summary
		if len(summary) > 40 {
			summary = summary[:37] + "..."
		}
		
		// 输出事件信息
		fmt.Printf("%-20s %-12s %-8s %s\n", date, timeStr, durStr, summary)
	}
	return nil
}

// outputEventDetail 详细输出单个事件
func outputEventDetail(event *caldav.Event) error {
	// 输出事件基本信息
	fmt.Printf("UID:         %s\n", event.UID)
	fmt.Printf("标题:       %s\n", event.Summary)
	
	// 输出事件时间信息
	if event.AllDay {
		fmt.Printf("日期:       %s (全天)\n", event.Start.Format("2006-01-02 Mon"))
	} else {
		fmt.Printf("开始:       %s\n", event.Start.Format("2006-01-02 15:04 Mon"))
		fmt.Printf("结束:       %s\n", event.End.Format("2006-01-02 15:04 Mon"))
		fmt.Printf("持续时间:    %s\n", event.End.Sub(event.Start))
	}
	
	// 输出事件其他信息
	if event.Location != "" {
		fmt.Printf("地点:       %s\n", event.Location)
	}
	if event.Description != "" {
		fmt.Printf("描述:       %s\n", event.Description)
	}
	if event.Organizer != "" {
		fmt.Printf("组织者:     %s\n", event.Organizer)
	}
	if len(event.Attendees) > 0 {
		fmt.Printf("参与者:     %s\n", strings.Join(event.Attendees, ", "))
	}
	if event.Status != "" {
		fmt.Printf("状态:       %s\n", event.Status)
	}
	
	return nil
}

// outputCalendarsJSON 以JSON格式输出日历
func outputCalendarsJSON(calendars []caldav.Calendar) error {
	for _, c := range calendars {
		fmt.Printf(`{"path":"%s","name":"%s","description":"%s"}`+"\n", c.Path, c.Name, c.Description)
	}
	return nil
}