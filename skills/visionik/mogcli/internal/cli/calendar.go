package cli

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"time"

	"github.com/visionik/mogcli/internal/graph"
)

// CalendarCmd 处理日历操作命令。
type CalendarCmd struct {
	List      CalendarListCmd      `cmd:"" help:"列出事件"`
	Get       CalendarGetCmd       `cmd:"" help:"获取事件"`
	Create    CalendarCreateCmd    `cmd:"" help:"创建事件"`
	Update    CalendarUpdateCmd    `cmd:"" help:"更新事件"`
	Delete    CalendarDeleteCmd    `cmd:"" help:"删除事件"`
	Calendars CalendarCalendarsCmd `cmd:"" help:"列出日历"`
	Respond   CalendarRespondCmd   `cmd:"" help:"回应事件邀请"`
	FreeBusy  CalendarFreeBusyCmd  `cmd:"" help:"获取空闲/忙碌信息"`
	ACL       CalendarACLCmd       `cmd:"" help:"列出日历权限"`
}

// CalendarListCmd 列出事件。
type CalendarListCmd struct {
	Calendar string `help:"日历 ID (默认: primary)"`
	From     string `help:"开始日期 (ISO 格式)" default:""`
	To       string `help:"结束日期 (ISO 格式)" default:""`
	Max      int    `help:"最大事件数" default:"25"`
}

// Run 执行日历列表命令。
func (c *CalendarListCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()

	// 默认从今天开始，持续30天
	from := time.Now()
	to := from.AddDate(0, 0, 30)

	if c.From != "" {
		from, err = time.Parse("2006-01-02", c.From)
		if err != nil {
			from, err = time.Parse(time.RFC3339, c.From)
			if err != nil {
				return fmt.Errorf("无效的 --from 日期: %w", err)
			}
		}
	}

	if c.To != "" {
		to, err = time.Parse("2006-01-02", c.To)
		if err != nil {
			to, err = time.Parse(time.RFC3339, c.To)
			if err != nil {
				return fmt.Errorf("无效的 --to 日期: %w", err)
			}
		}
	}

	query := url.Values{}
	query.Set("$top", fmt.Sprintf("%d", c.Max))
	query.Set("$orderby", "start/dateTime")
	query.Set("startDateTime", from.Format(time.RFC3339))
	query.Set("endDateTime", to.Format(time.RFC3339))

	path := "/me/calendarView"
	if c.Calendar != "" {
		path = fmt.Sprintf("/me/calendars/%s/calendarView", graph.ResolveID(c.Calendar))
	}

	data, err := client.Get(ctx, path, query)
	if err != nil {
		return err
	}

	var resp struct {
		Value []Event `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(resp.Value)
	}

	if len(resp.Value) == 0 {
		fmt.Println("未找到事件")
		return nil
	}

	for _, event := range resp.Value {
		printEvent(event, root.Verbose)
	}
	return nil
}

// CalendarGetCmd 获取事件。
type CalendarGetCmd struct {
	ID string `arg:"" help:"事件 ID"`
}

// Run 执行日历获取命令。
func (c *CalendarGetCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/events/%s", graph.ResolveID(c.ID))

	data, err := client.Get(ctx, path, nil)
	if err != nil {
		return err
	}

	var event Event
	if err := json.Unmarshal(data, &event); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(event)
	}

	printEventDetail(event, root.Verbose)
	return nil
}

// CalendarCreateCmd 创建事件。
type CalendarCreateCmd struct {
	Summary     string   `help:"事件标题/摘要" required:""`
	From        string   `help:"开始时间 (ISO 格式)" required:""`
	To          string   `help:"结束时间 (ISO 格式)" required:""`
	Location    string   `help:"地点"`
	Description string   `help:"事件描述" name:"description"`
	Attendees   []string `help:"与会者电子邮件地址"`
	AllDay      bool     `help:"全天事件" name:"all-day"`
	Calendar    string   `help:"日历 ID"`
}

// Run 执行日历创建命令。
func (c *CalendarCreateCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	event := map[string]interface{}{
		"subject": c.Summary,
		"start": map[string]string{
			"dateTime": c.From,
			"timeZone": "UTC",
		},
		"end": map[string]string{
			"dateTime": c.To,
			"timeZone": "UTC",
		},
	}

	if c.Location != "" {
		event["location"] = map[string]string{"displayName": c.Location}
	}

	if c.Description != "" {
		event["body"] = map[string]string{
			"contentType": "text",
			"content":     c.Description,
		}
	}

	if len(c.Attendees) > 0 {
		var attendees []map[string]interface{}
		for _, email := range c.Attendees {
			attendees = append(attendees, map[string]interface{}{
				"emailAddress": map[string]string{"address": email},
				"type":         "required",
			})
		}
		event["attendees"] = attendees
	}

	if c.AllDay {
		event["isAllDay"] = true
	}

	ctx := context.Background()
	path := "/me/events"
	if c.Calendar != "" {
		path = fmt.Sprintf("/me/calendars/%s/events", graph.ResolveID(c.Calendar))
	}

	data, err := client.Post(ctx, path, event)
	if err != nil {
		return err
	}

	var created Event
	if err := json.Unmarshal(data, &created); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(created)
	}

	fmt.Printf("✓ 事件创建成功: %s (%s)\n", created.Subject, graph.FormatID(created.ID))
	return nil
}

// CalendarUpdateCmd 更新事件。
type CalendarUpdateCmd struct {
	ID          string `arg:"" help:"事件 ID"`
	Summary     string `help:"新标题/摘要"`
	From        string `help:"新开始时间"`
	To          string `help:"新结束时间"`
	Location    string `help:"新地点"`
	Description string `help:"新描述" name:"description"`
}

// Run 执行日历更新命令。
func (c *CalendarUpdateCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	updates := make(map[string]interface{})

	if c.Summary != "" {
		updates["subject"] = c.Summary
	}
	if c.From != "" {
		updates["start"] = map[string]string{"dateTime": c.From, "timeZone": "UTC"}
	}
	if c.To != "" {
		updates["end"] = map[string]string{"dateTime": c.To, "timeZone": "UTC"}
	}
	if c.Location != "" {
		updates["location"] = map[string]string{"displayName": c.Location}
	}
	if c.Description != "" {
		updates["body"] = map[string]string{"contentType": "text", "content": c.Description}
	}

	if len(updates) == 0 {
		return fmt.Errorf("未指定更新内容")
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/events/%s", graph.ResolveID(c.ID))

	_, err = client.Patch(ctx, path, updates)
	if err != nil {
		return err
	}

	fmt.Println("✓ 事件更新成功")
	return nil
}

// CalendarDeleteCmd 删除事件。
type CalendarDeleteCmd struct {
	ID string `arg:"" help:"事件 ID"`
}

// Run 执行日历删除命令。
func (c *CalendarDeleteCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/events/%s", graph.ResolveID(c.ID))

	if err := client.Delete(ctx, path); err != nil {
		return err
	}

	fmt.Println("✓ 事件删除成功")
	return nil
}

// CalendarCalendarsCmd 列出日历。
type CalendarCalendarsCmd struct{}

// Run 执行日历列表命令。
func (c *CalendarCalendarsCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	data, err := client.Get(ctx, "/me/calendars", nil)
	if err != nil {
		return err
	}

	var resp struct {
		Value []Calendar `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(resp.Value)
	}

	for _, cal := range resp.Value {
		marker := " "
		if cal.IsDefaultCalendar {
			marker = "*"
		}
		fmt.Printf("%s %-30s %s\n", marker, cal.Name, graph.FormatID(cal.ID))
	}
	return nil
}

// CalendarRespondCmd 回应事件邀请。
type CalendarRespondCmd struct {
	ID       string `arg:"" help:"事件 ID"`
	Response string `arg:"" help:"回应: accept, decline, tentative"`
	Comment  string `help:"可选评论"`
}

// Run 执行日历回应命令。
func (c *CalendarRespondCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	var action string
	switch c.Response {
	case "accept":
		action = "accept"
	case "decline":
		action = "decline"
	case "tentative":
		action = "tentativelyAccept"
	default:
		return fmt.Errorf("无效的回应: %s (使用 accept, decline, 或 tentative)", c.Response)
	}

	body := map[string]interface{}{
		"sendResponse": true,
	}
	if c.Comment != "" {
		body["comment"] = c.Comment
	}

	ctx := context.Background()
	path := fmt.Sprintf("/me/events/%s/%s", graph.ResolveID(c.ID), action)

	_, err = client.Post(ctx, path, body)
	if err != nil {
		return err
	}

	fmt.Printf("✓ 回应成功: %s\n", c.Response)
	return nil
}

// CalendarFreeBusyCmd 获取空闲/忙碌信息。
type CalendarFreeBusyCmd struct {
	Emails []string `arg:"" help:"要检查的电子邮件地址"`
	Start  string   `help:"开始时间 (ISO 格式)" required:""`
	End    string   `help:"结束时间 (ISO 格式)" required:""`
}

// CalendarACLCmd 列出日历权限。
type CalendarACLCmd struct {
	Calendar string `arg:"" optional:"" help:"日历 ID (默认: primary)"`
}

// Run 执行日历空闲/忙碌命令。
func (c *CalendarFreeBusyCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	var schedules []string
	for _, email := range c.Emails {
		schedules = append(schedules, email)
	}

	body := map[string]interface{}{
		"schedules":                schedules,
		"startTime":                map[string]string{"dateTime": c.Start, "timeZone": "UTC"},
		"endTime":                  map[string]string{"dateTime": c.End, "timeZone": "UTC"},
		"availabilityViewInterval": 30,
	}

	ctx := context.Background()
	data, err := client.Post(ctx, "/me/calendar/getSchedule", body)
	if err != nil {
		return err
	}

	if root.JSON {
		var resp interface{}
		json.Unmarshal(data, &resp)
		return outputJSON(resp)
	}

	fmt.Println(string(data))
	return nil
}

// Event 表示日历事件。
type Event struct {
	ID        string `json:"id"`
	Subject   string `json:"subject"`
	Start     *Time  `json:"start"`
	End       *Time  `json:"end"`
	Location  *Loc   `json:"location"`
	Body      *Body  `json:"body"`
	IsAllDay  bool   `json:"isAllDay"`
	Organizer *Org   `json:"organizer"`
}

// Time 表示带时区的日期时间。
type Time struct {
	DateTime string `json:"dateTime"`
	TimeZone string `json:"timeZone"`
}

// Loc 表示地点。
type Loc struct {
	DisplayName string `json:"displayName"`
}

// Body 表示事件正文。
type Body struct {
	ContentType string `json:"contentType"`
	Content     string `json:"content"`
}

// Org 表示组织者。
type Org struct {
	EmailAddress struct {
		Name    string `json:"name"`
		Address string `json:"address"`
	} `json:"emailAddress"`
}

// Calendar 表示日历。
type Calendar struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	IsDefaultCalendar bool   `json:"isDefaultCalendar"`
}

// CalendarPermission 表示日历权限（ACL 条目）。
type CalendarPermission struct {
	ID                  string        `json:"id"`
	Role                string        `json:"role"`
	AllowedRoles        []string      `json:"allowedRoles"`
	EmailAddress        *EmailAddress `json:"emailAddress"`
	IsRemovable         bool          `json:"isRemovable"`
	IsInsideOrganization bool         `json:"isInsideOrganization"`
}

// EmailAddress 表示权限中的电子邮件地址。
type EmailAddress struct {
	Name    string `json:"name"`
	Address string `json:"address"`
}

// Run 执行日历权限命令。
func (c *CalendarACLCmd) Run(root *Root) error {
	client, err := root.GetClient()
	if err != nil {
		return err
	}

	ctx := context.Background()
	path := "/me/calendar/calendarPermissions"
	if c.Calendar != "" {
		path = fmt.Sprintf("/me/calendars/%s/calendarPermissions", graph.ResolveID(c.Calendar))
	}

	data, err := client.Get(ctx, path, nil)
	if err != nil {
		return err
	}

	var resp struct {
		Value []CalendarPermission `json:"value"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}

	if root.JSON {
		return outputJSON(resp.Value)
	}

	if len(resp.Value) == 0 {
		fmt.Println("未找到权限")
		return nil
	}

	fmt.Println("日历权限")
	fmt.Println()
	for _, perm := range resp.Value {
		email := "(无邮箱)"
		name := ""
		if perm.EmailAddress != nil {
			if perm.EmailAddress.Address != "" {
				email = perm.EmailAddress.Address
			}
			if perm.EmailAddress.Name != "" {
				name = perm.EmailAddress.Name
			}
		}
		removable := ""
		if !perm.IsRemovable {
			removable = " (锁定)"
		}
		if name != "" {
			fmt.Printf("%-12s %s <%s>%s\n", perm.Role, name, email, removable)
		} else {
			fmt.Printf("%-12s %s%s\n", perm.Role, email, removable)
		}
		if root.Verbose {
			fmt.Printf("  ID: %s\n", perm.ID)
		}
	}
	fmt.Printf("\n%d 个权限\n", len(resp.Value))
	return nil
}

// printEvent 打印事件摘要信息
func printEvent(event Event, verbose bool) {
	start := ""
	if event.Start != nil {
		t, _ := time.Parse("2006-01-02T15:04:05.0000000", event.Start.DateTime)
		if event.IsAllDay {
			start = t.Format("1月2日")
		} else {
			start = t.Format("1月2日 15:04")
		}
	}

	location := ""
	if event.Location != nil && event.Location.DisplayName != "" {
		location = fmt.Sprintf(" @ %s", event.Location.DisplayName)
	}

	fmt.Printf("%-16s %s%s\n", start, event.Subject, location)
	fmt.Printf("  ID: %s\n", graph.FormatID(event.ID))
	if verbose {
		fmt.Printf("  完整: %s\n", event.ID)
	}
}

// printEventDetail 打印事件详细信息
func printEventDetail(event Event, verbose bool) {
	fmt.Printf("ID:       %s\n", graph.FormatID(event.ID))
	if verbose {
		fmt.Printf("完整 ID:  %s\n", event.ID)
	}
	fmt.Printf("主题:     %s\n", event.Subject)

	if event.Start != nil {
		fmt.Printf("开始:     %s\n", event.Start.DateTime)
	}
	if event.End != nil {
		fmt.Printf("结束:     %s\n", event.End.DateTime)
	}
	if event.Location != nil && event.Location.DisplayName != "" {
		fmt.Printf("地点:     %s\n", event.Location.DisplayName)
	}
	if event.Organizer != nil {
		fmt.Printf("组织者:   %s <%s>\n",
			event.Organizer.EmailAddress.Name,
			event.Organizer.EmailAddress.Address)
	}
	if event.Body != nil && event.Body.Content != "" {
		content := event.Body.Content
		if event.Body.ContentType == "html" {
			content = stripHTML(content)
		}
		fmt.Printf("\n%s\n", content)
	}
}
