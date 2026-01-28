package cli

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/visionik/sogcli/internal/config"
	"github.com/visionik/sogcli/internal/itip"
	"github.com/visionik/sogcli/internal/smtp"
)

// InviteCmd 处理会议邀请操作
type InviteCmd struct {
	Send    InviteSendCmd    `cmd:"" help:"发送会议邀请"`
	Reply   InviteReplyCmd   `cmd:"" help:"回复会议邀请"`
	Cancel  InviteCancelCmd  `cmd:"" help:"取消会议"`
	Parse   InviteParseCmd   `cmd:"" help:"解析.ics文件"`
	Preview InvitePreviewCmd `cmd:"" help:"预览邀请而不发送"`
}

// InviteSendCmd 发送会议邀请
type InviteSendCmd struct {
	Summary     string   `arg:"" help:"会议标题/摘要"`
	Attendees   []string `arg:"" help:"参与者邮箱地址"`
	Start       string   `help:"开始时间（YYYY-MM-DDTHH:MM 或 'tomorrow 2pm'）" required:""`
	Duration    string   `help:"持续时间（例如：1h, 30m, 1h30m）" default:"1h"`
	End         string   `help:"结束时间（替代持续时间）"`
	Location    string   `help:"会议地点" short:"l"`
	Description string   `help:"会议描述" short:"d"`
	Organizer   string   `help:"组织者姓名"`
}

// Run 执行发送邀请命令
func (c *InviteSendCmd) Run(root *Root) error {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	// 获取账户信息
	email := root.Account
	if email == "" {
		email = cfg.DefaultAccount
	}
	if email == "" {
		return fmt.Errorf("未指定账户")
	}

	// 解析开始时间
	start, _, err := parseDateTime(c.Start)
	if err != nil {
		return fmt.Errorf("无效的开始时间: %w", err)
	}

	// 计算结束时间
	var end time.Time
	if c.End != "" {
		// 如果指定了结束时间，则直接解析
		end, _, err = parseDateTime(c.End)
		if err != nil {
			return fmt.Errorf("无效的结束时间: %w", err)
		}
	} else {
		// 否则根据持续时间计算结束时间
		dur, err := time.ParseDuration(c.Duration)
		if err != nil {
			return fmt.Errorf("无效的持续时间: %w", err)
		}
		end = start.Add(dur)
	}

	// 构建邀请
	inv := &itip.Invite{
		Method:      itip.MethodRequest,
		UID:         itip.GenerateUID(getDomain(email)),
		Summary:     c.Summary,
		Description: c.Description,
		Location:    c.Location,
		Start:       start,
		End:         end,
		Organizer: itip.Participant{
			Email: email,
			Name:  c.Organizer,
		},
		Sequence: 0,
		Created:  time.Now().UTC(),
	}

	// 添加参与者
	for _, att := range c.Attendees {
		inv.Attendees = append(inv.Attendees, itip.Participant{
			Email: att,
			RSVP:  true,
		})
	}

	// 生成iCalendar数据
	icsData, err := itip.CreateInvite(inv)
	if err != nil {
		return fmt.Errorf("创建邀请失败: %w", err)
	}

	// 通过SMTP发送
	if err := sendInviteEmail(cfg, email, inv, icsData); err != nil {
		return fmt.Errorf("发送邀请失败: %w", err)
	}

	// 根据输出格式返回结果
	if root.JSON {
		fmt.Printf(`{"uid":"%s","summary":"%s","start":"%s","end":"%s","attendees":%d}`+"\n",
			inv.UID, inv.Summary, inv.Start.Format(time.RFC3339), inv.End.Format(time.RFC3339), len(inv.Attendees))
		return nil
	}

	// 输出结果
	fmt.Printf("发送会议邀请成功: %s\n", inv.Summary)
	fmt.Printf("  UID: %s\n", inv.UID)
	fmt.Printf("  时间: %s - %s\n", inv.Start.Format("Mon Jan 2 15:04"), inv.End.Format("15:04"))
	if inv.Location != "" {
		fmt.Printf("  地点: %s\n", inv.Location)
	}
	fmt.Printf("  参与者: %s\n", strings.Join(c.Attendees, ", "))
	return nil
}

// InviteReplyCmd 回复会议邀请
type InviteReplyCmd struct {
	File    string `arg:"" help:".ics文件或'-'表示从标准输入读取"`
	Status  string `help:"回复状态: accept（接受）, decline（拒绝）, tentative（暂定）" required:"" enum:"accept,decline,tentative"`
	Comment string `help:"回复时的可选评论"`
}

// Run 执行回复邀请命令
func (c *InviteReplyCmd) Run(root *Root) error {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	// 获取账户信息
	email := root.Account
	if email == "" {
		email = cfg.DefaultAccount
	}
	if email == "" {
		return fmt.Errorf("未指定账户")
	}

	// 读取.ics文件
	var data []byte
	if c.File == "-" {
		data, err = io.ReadAll(os.Stdin)
	} else {
		data, err = os.ReadFile(c.File)
	}
	if err != nil {
		return fmt.Errorf("读取文件失败: %w", err)
	}

	// 解析邀请
	inv, err := itip.ParseInvite(data)
	if err != nil {
		return fmt.Errorf("解析邀请失败: %w", err)
	}

	// 确定回复状态
	var status itip.ParticipantStatus
	switch c.Status {
	case "accept":
		status = itip.StatusAccepted
	case "decline":
		status = itip.StatusDeclined
	case "tentative":
		status = itip.StatusTentative
	}

	// 创建回复
	resp := &itip.Response{
		UID: inv.UID,
		Attendee: itip.Participant{
			Email:  email,
			Status: status,
		},
		Organizer: inv.Organizer,
		Status:    status,
		Comment:   c.Comment,
		Sequence:  inv.Sequence,
	}

	// 生成回复数据
	replyData, err := itip.CreateReply(resp)
	if err != nil {
		return fmt.Errorf("创建回复失败: %w", err)
	}

	// 发送回复给组织者
	if err := sendReplyEmail(cfg, email, inv, resp, replyData); err != nil {
		return fmt.Errorf("发送回复失败: %w", err)
	}

	fmt.Printf("发送 %s 回复给: %s\n", c.Status, inv.Organizer.Email)
	fmt.Printf("  会议: %s\n", inv.Summary)
	return nil
}

// InviteCancelCmd 取消会议
type InviteCancelCmd struct {
	UID       string   `arg:"" help:"要取消的会议UID"`
	Attendees []string `arg:"" help:"要通知的参与者邮箱"`
}

// Run 执行取消会议命令
func (c *InviteCancelCmd) Run(root *Root) error {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	// 获取账户信息
	email := root.Account
	if email == "" {
		email = cfg.DefaultAccount
	}
	if email == "" {
		return fmt.Errorf("未指定账户")
	}

	// 创建组织者信息
	organizer := itip.Participant{Email: email}
	var attendees []itip.Participant
	for _, att := range c.Attendees {
		attendees = append(attendees, itip.Participant{Email: att})
	}

	// 生成取消数据
	cancelData, err := itip.CreateCancel(c.UID, organizer, attendees, 1)
	if err != nil {
		return fmt.Errorf("创建取消通知失败: %w", err)
	}

	// 发送取消通知给所有参与者
	if err := sendCancelEmail(cfg, email, c.UID, c.Attendees, cancelData); err != nil {
		return fmt.Errorf("发送取消通知失败: %w", err)
	}

	fmt.Printf("发送会议取消通知: %s\n", c.UID)
	fmt.Printf("  已通知: %s\n", strings.Join(c.Attendees, ", "))
	return nil
}

// InviteParseCmd 解析.ics文件
type InviteParseCmd struct {
	File string `arg:"" help:".ics文件或'-'表示从标准输入读取"`
}

// Run 执行解析邀请命令
func (c *InviteParseCmd) Run(root *Root) error {
	// 读取.ics文件
	var data []byte
	var err error
	if c.File == "-" {
		data, err = io.ReadAll(os.Stdin)
	} else {
		data, err = os.ReadFile(c.File)
	}
	if err != nil {
		return fmt.Errorf("读取文件失败: %w", err)
	}

	// 解析邀请
	inv, err := itip.ParseInvite(data)
	if err != nil {
		return fmt.Errorf("解析失败: %w", err)
	}

	// 根据输出格式返回结果
	if root.JSON {
		fmt.Printf(`{"method":"%s","uid":"%s","summary":"%s","start":"%s","end":"%s","organizer":"%s","attendees":%d}`+"\n",
			inv.Method, inv.UID, inv.Summary,
			inv.Start.Format(time.RFC3339), inv.End.Format(time.RFC3339),
			inv.Organizer.Email, len(inv.Attendees))
		return nil
	}

	// 输出解析结果
	fmt.Printf("方法:    %s\n", inv.Method)
	fmt.Printf("UID:       %s\n", inv.UID)
	fmt.Printf("摘要:     %s\n", inv.Summary)
	fmt.Printf("开始:     %s\n", inv.Start.Format("Mon Jan 2, 2006 15:04 MST"))
	fmt.Printf("结束:     %s\n", inv.End.Format("Mon Jan 2, 2006 15:04 MST"))
	if inv.Location != "" {
		fmt.Printf("地点:    %s\n", inv.Location)
	}
	if inv.Description != "" {
		fmt.Printf("描述:    %s\n", inv.Description)
	}
	fmt.Printf("组织者: %s", inv.Organizer.Email)
	if inv.Organizer.Name != "" {
		fmt.Printf(" (%s)", inv.Organizer.Name)
	}
	fmt.Println()
	if len(inv.Attendees) > 0 {
		fmt.Println("参与者:")
		for _, att := range inv.Attendees {
			status := string(att.Status)
			if status == "" {
				status = "NEEDS-ACTION"
			}
			fmt.Printf("  - %s [%s]", att.Email, status)
			if att.Name != "" {
				fmt.Printf(" (%s)", att.Name)
			}
			fmt.Println()
		}
	}
	return nil
}

// InvitePreviewCmd 预览邀请而不发送
type InvitePreviewCmd struct {
	Summary     string   `arg:"" help:"会议标题/摘要"`
	Attendees   []string `arg:"" help:"参与者邮箱地址"`
	Start       string   `help:"开始时间（YYYY-MM-DDTHH:MM）" required:""`
	Duration    string   `help:"持续时间（例如：1h, 30m）" default:"1h"`
	Location    string   `help:"会议地点" short:"l"`
	Description string   `help:"会议描述" short:"d"`
}

// Run 执行预览邀请命令
func (c *InvitePreviewCmd) Run(root *Root) error {
	// 获取账户信息
	email := root.Account
	if email == "" {
		cfg, _ := config.Load()
		if cfg != nil {
			email = cfg.DefaultAccount
		}
	}
	if email == "" {
		email = "organizer@example.com"
	}

	// 解析开始时间
	start, _, err := parseDateTime(c.Start)
	if err != nil {
		return fmt.Errorf("无效的开始时间: %w", err)
	}

	// 计算结束时间
	dur, err := time.ParseDuration(c.Duration)
	if err != nil {
		return fmt.Errorf("无效的持续时间: %w", err)
	}
	end := start.Add(dur)

	// 构建邀请
	inv := &itip.Invite{
		Method:      itip.MethodRequest,
		UID:         itip.GenerateUID(getDomain(email)),
		Summary:     c.Summary,
		Description: c.Description,
		Location:    c.Location,
		Start:       start,
		End:         end,
		Organizer:   itip.Participant{Email: email},
		Sequence:    0,
		Created:     time.Now().UTC(),
	}

	// 添加参与者
	for _, att := range c.Attendees {
		inv.Attendees = append(inv.Attendees, itip.Participant{Email: att, RSVP: true})
	}

	// 生成iCalendar数据
	icsData, err := itip.CreateInvite(inv)
	if err != nil {
		return fmt.Errorf("创建邀请失败: %w", err)
	}

	// 输出iCalendar数据
	fmt.Println(string(icsData))
	return nil
}

// 辅助函数

// getDomain 从邮箱地址中提取域名
func getDomain(email string) string {
	parts := strings.Split(email, "@")
	if len(parts) == 2 {
		return parts[1]
	}
	return "sog.local"
}

// sendInviteEmail 通过SMTP发送会议邀请
func sendInviteEmail(cfg *config.Config, from string, inv *itip.Invite, icsData []byte) error {
	// 获取账户配置
	acct, err := cfg.GetAccount(from)
	if err != nil {
		return err
	}

	// 获取SMTP密码
	password, err := cfg.GetPasswordForProtocol(from, config.ProtocolSMTP)
	if err != nil {
		return err
	}

	// 连接SMTP服务器
	client, err := smtp.Connect(smtp.Config{
		Host:     acct.SMTP.Host,
		Port:     acct.SMTP.Port,
		Email:    from,
		Password: password,
		StartTLS: acct.SMTP.StartTLS,
		TLS:      acct.SMTP.TLS,
	})
	if err != nil {
		return err
	}
	defer client.Close()

	// 构建收件人列表
	var to []string
	for _, att := range inv.Attendees {
		to = append(to, att.Email)
	}

	// 创建包含日历附件的邮件
	msg := &smtp.Message{
		From:    from,
		To:      to,
		Subject: fmt.Sprintf("Meeting Invitation: %s", inv.Summary),
		Body:    fmt.Sprintf("You have been invited to: %s\n\nWhen: %s - %s\nWhere: %s\n\n%s",
			inv.Summary,
			inv.Start.Format("Mon Jan 2, 2006 15:04"),
			inv.End.Format("15:04"),
			inv.Location,
			inv.Description),
		CalendarData:   icsData,
		CalendarMethod: string(inv.Method),
	}

	// 发送邮件
	return client.Send(context.Background(), msg)
}

// sendReplyEmail 通过SMTP发送会议邀请回复
func sendReplyEmail(cfg *config.Config, from string, inv *itip.Invite, resp *itip.Response, replyData []byte) error {
	// 获取账户配置
	acct, err := cfg.GetAccount(from)
	if err != nil {
		return err
	}

	// 获取SMTP密码
	password, err := cfg.GetPasswordForProtocol(from, config.ProtocolSMTP)
	if err != nil {
		return err
	}

	// 连接SMTP服务器
	client, err := smtp.Connect(smtp.Config{
		Host:     acct.SMTP.Host,
		Port:     acct.SMTP.Port,
		Email:    from,
		Password: password,
		StartTLS: acct.SMTP.StartTLS,
		TLS:      acct.SMTP.TLS,
	})
	if err != nil {
		return err
	}
	defer client.Close()

	// 确定回复状态文本
	statusWord := "回复了"
	switch resp.Status {
	case itip.StatusAccepted:
		statusWord = "接受了"
	case itip.StatusDeclined:
		statusWord = "拒绝了"
	case itip.StatusTentative:
		statusWord = "暂定接受了"
	}

	// 创建回复邮件
	msg := &smtp.Message{
		From:           from,
		To:             []string{inv.Organizer.Email},
		Subject:        fmt.Sprintf("Re: %s", inv.Summary),
		Body:           fmt.Sprintf("%s 已 %s 您的会议邀请: %s", from, statusWord, inv.Summary),
		CalendarData:   replyData,
		CalendarMethod: string(itip.MethodReply),
	}

	// 发送邮件
	return client.Send(context.Background(), msg)
}

// sendCancelEmail 通过SMTP发送会议取消通知
func sendCancelEmail(cfg *config.Config, from string, uid string, attendees []string, cancelData []byte) error {
	// 获取账户配置
	acct, err := cfg.GetAccount(from)
	if err != nil {
		return err
	}

	// 获取SMTP密码
	password, err := cfg.GetPasswordForProtocol(from, config.ProtocolSMTP)
	if err != nil {
		return err
	}

	// 连接SMTP服务器
	client, err := smtp.Connect(smtp.Config{
		Host:     acct.SMTP.Host,
		Port:     acct.SMTP.Port,
		Email:    from,
		Password: password,
		StartTLS: acct.SMTP.StartTLS,
		TLS:      acct.SMTP.TLS,
	})
	if err != nil {
		return err
	}
	defer client.Close()

	// 创建取消通知邮件
	msg := &smtp.Message{
		From:           from,
		To:             attendees,
		Subject:        "Meeting Cancelled",
		Body:           fmt.Sprintf("The meeting has been cancelled.\n\nUID: %s", uid),
		CalendarData:   cancelData,
		CalendarMethod: string(itip.MethodCancel),
	}

	// 发送邮件
	return client.Send(context.Background(), msg)
}
