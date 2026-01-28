package cli

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/visionik/sogcli/internal/carddav"
	"github.com/visionik/sogcli/internal/config"
)

// ContactsCmd 处理联系人相关操作
type ContactsCmd struct {
	List   ContactsListCmd   `cmd:"" help:"列出联系人"`
	Get    ContactsGetCmd    `cmd:"" help:"获取联系人详情"`
	Search ContactsSearchCmd `cmd:"" help:"搜索联系人"`
	Create ContactsCreateCmd `cmd:"" help:"创建联系人"`
	Update ContactsUpdateCmd `cmd:"" help:"更新联系人"`
	Delete ContactsDeleteCmd `cmd:"" help:"删除联系人"`
	Books  ContactsBooksCmd  `cmd:"" name:"books" help:"列出通讯录"`
}

// ContactsListCmd 列出通讯录中的联系人
type ContactsListCmd struct {
	AddressBook string `arg:"" optional:"" help:"通讯录路径（默认：primary）"`
	Max         int    `help:"返回的最大联系人数量" default:"100"`
}

// Run 执行列出联系人命令
func (c *ContactsListCmd) Run(root *Root) error {
	// 获取CardDAV客户端和默认通讯录路径
	client, bookPath, err := getCardDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 如果指定了通讯录路径，则使用指定的路径
	if c.AddressBook != "" {
		bookPath = c.AddressBook
	}

	// 获取联系人列表
	ctx := context.Background()
	contacts, err := client.ListContacts(ctx, bookPath)
	if err != nil {
		return fmt.Errorf("列出联系人失败: %w", err)
	}

	// 检查是否有联系人
	if len(contacts) == 0 {
		fmt.Println("未找到联系人。")
		return nil
	}

	// 限制返回的联系人数量
	if c.Max > 0 && len(contacts) > c.Max {
		contacts = contacts[:c.Max]
	}

	// 根据输出格式返回结果
	if root.JSON {
		return outputContactsJSON(contacts)
	}

	return outputContactsTable(contacts)
}

// ContactsGetCmd 获取联系人详情
type ContactsGetCmd struct {
	UID         string `arg:"" help:"联系人UID"`
	AddressBook string `help:"通讯录路径（默认：primary）"`
}

// Run 执行获取联系人详情命令
func (c *ContactsGetCmd) Run(root *Root) error {
	// 获取CardDAV客户端和默认通讯录路径
	client, bookPath, err := getCardDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 如果指定了通讯录路径，则使用指定的路径
	if c.AddressBook != "" {
		bookPath = c.AddressBook
	}

	// 获取指定UID的联系人详情
	ctx := context.Background()
	contact, err := client.GetContact(ctx, bookPath, c.UID)
	if err != nil {
		return fmt.Errorf("获取联系人失败: %w", err)
	}

	// 根据输出格式返回结果
	if root.JSON {
		return outputContactsJSON([]carddav.Contact{*contact})
	}

	return outputContactDetail(contact)
}

// ContactsSearchCmd 搜索联系人
type ContactsSearchCmd struct {
	Query       string `arg:"" help:"搜索查询（姓名）"`
	AddressBook string `help:"通讯录路径（默认：primary）"`
}

// Run 执行搜索联系人命令
func (c *ContactsSearchCmd) Run(root *Root) error {
	// 获取CardDAV客户端和默认通讯录路径
	client, bookPath, err := getCardDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 如果指定了通讯录路径，则使用指定的路径
	if c.AddressBook != "" {
		bookPath = c.AddressBook
	}

	// 搜索联系人
	ctx := context.Background()
	contacts, err := client.SearchContacts(ctx, bookPath, c.Query)
	if err != nil {
		return fmt.Errorf("搜索联系人失败: %w", err)
	}

	// 检查是否有匹配的联系人
	if len(contacts) == 0 {
		fmt.Println("未找到联系人。")
		return nil
	}

	// 根据输出格式返回结果
	if root.JSON {
		return outputContactsJSON(contacts)
	}

	return outputContactsTable(contacts)
}

// ContactsCreateCmd 创建联系人
type ContactsCreateCmd struct {
	Name        string   `arg:"" help:"全名"`
	Email       []string `help:"邮箱地址" short:"e"`
	Phone       []string `help:"电话号码" short:"p"`
	Org         string   `help:"组织"`
	Title       string   `help:"职位"`
	Note        string   `help:"备注"`
	AddressBook string   `help:"通讯录路径（默认：primary）"`
}

// Run 执行创建联系人命令
func (c *ContactsCreateCmd) Run(root *Root) error {
	// 获取CardDAV客户端和默认通讯录路径
	client, bookPath, err := getCardDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 如果指定了通讯录路径，则使用指定的路径
	if c.AddressBook != "" {
		bookPath = c.AddressBook
	}

	// 解析姓名为姓和名
	firstName, lastName := parseName(c.Name)

	// 创建联系人对象
	contact := &carddav.Contact{
		UID:       generateContactUID(),
		FullName:  c.Name,
		FirstName: firstName,
		LastName:  lastName,
		Emails:    c.Email,
		Phones:    c.Phone,
		Org:       c.Org,
		Title:     c.Title,
		Note:      c.Note,
	}

	// 创建联系人
	ctx := context.Background()
	if err := client.CreateContact(ctx, bookPath, contact); err != nil {
		return fmt.Errorf("创建联系人失败: %w", err)
	}

	// 根据输出格式返回结果
	if root.JSON {
		return outputContactsJSON([]carddav.Contact{*contact})
	}

	fmt.Printf("创建联系人成功: %s (%s)\n", contact.FullName, contact.UID)
	return nil
}

// ContactsUpdateCmd 更新联系人
type ContactsUpdateCmd struct {
	UID         string   `arg:"" help:"联系人UID"`
	Name        string   `help:"全名"`
	Email       []string `help:"邮箱地址（替换现有）" short:"e"`
	Phone       []string `help:"电话号码（替换现有）" short:"p"`
	Org         string   `help:"组织"`
	Title       string   `help:"职位"`
	Note        string   `help:"备注"`
	AddressBook string   `help:"通讯录路径（默认：primary）"`
}

// Run 执行更新联系人命令
func (c *ContactsUpdateCmd) Run(root *Root) error {
	// 获取CardDAV客户端和默认通讯录路径
	client, bookPath, err := getCardDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 如果指定了通讯录路径，则使用指定的路径
	if c.AddressBook != "" {
		bookPath = c.AddressBook
	}

	// 获取指定UID的联系人
	ctx := context.Background()
	contact, err := client.GetContact(ctx, bookPath, c.UID)
	if err != nil {
		return fmt.Errorf("获取联系人失败: %w", err)
	}

	// 应用更新
	if c.Name != "" {
		contact.FullName = c.Name
		contact.FirstName, contact.LastName = parseName(c.Name)
	}
	if len(c.Email) > 0 {
		contact.Emails = c.Email
	}
	if len(c.Phone) > 0 {
		contact.Phones = c.Phone
	}
	if c.Org != "" {
		contact.Org = c.Org
	}
	if c.Title != "" {
		contact.Title = c.Title
	}
	if c.Note != "" {
		contact.Note = c.Note
	}

	// 更新联系人
	if err := client.UpdateContact(ctx, bookPath, contact); err != nil {
		return fmt.Errorf("更新联系人失败: %w", err)
	}

	fmt.Printf("更新联系人成功: %s\n", c.UID)
	return nil
}

// ContactsDeleteCmd 删除联系人
type ContactsDeleteCmd struct {
	UID         string `arg:"" help:"联系人UID"`
	AddressBook string `help:"通讯录路径（默认：primary）"`
}

// Run 执行删除联系人命令
func (c *ContactsDeleteCmd) Run(root *Root) error {
	// 获取CardDAV客户端和默认通讯录路径
	client, bookPath, err := getCardDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 如果指定了通讯录路径，则使用指定的路径
	if c.AddressBook != "" {
		bookPath = c.AddressBook
	}

	// 删除指定UID的联系人
	ctx := context.Background()
	if err := client.DeleteContact(ctx, bookPath, c.UID); err != nil {
		return fmt.Errorf("删除联系人失败: %w", err)
	}

	fmt.Printf("删除联系人成功: %s\n", c.UID)
	return nil
}

// ContactsBooksCmd 列出可用的通讯录
type ContactsBooksCmd struct{}

// Run 执行列出通讯录命令
func (c *ContactsBooksCmd) Run(root *Root) error {
	// 获取CardDAV客户端
	client, _, err := getCardDAVClient(root)
	if err != nil {
		return err
	}
	defer client.Close()

	// 查找所有通讯录
	ctx := context.Background()
	books, err := client.FindAddressBooks(ctx)
	if err != nil {
		return fmt.Errorf("列出通讯录失败: %w", err)
	}

	// 检查是否有通讯录
	if len(books) == 0 {
		fmt.Println("未找到通讯录。")
		return nil
	}

	// 根据输出格式返回结果
	if root.JSON {
		return outputAddressBooksJSON(books)
	}

	// 输出通讯录列表
	fmt.Printf("%-50s %s\n", "路径", "名称")
	for _, book := range books {
		fmt.Printf("%-50s %s\n", book.Path, book.Name)
	}
	return nil
}

// getCardDAVClient 从配置创建CardDAV客户端
func getCardDAVClient(root *Root) (*carddav.Client, string, error) {
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

	// 检查CardDAV URL配置
	if acct.CardDAV.URL == "" {
		return nil, "", fmt.Errorf("%s 未配置CardDAV URL。运行: sog auth add %s --carddav-url <url>", email, email)
	}

	// 获取CardDAV密码
	password, err := cfg.GetPasswordForProtocol(email, config.ProtocolCardDAV)
	if err != nil {
		return nil, "", fmt.Errorf("获取密码失败: %w", err)
	}

	// 连接CardDAV服务器
	client, err := carddav.Connect(carddav.Config{
		URL:      acct.CardDAV.URL,
		Email:    email,
		Password: password,
	})
	if err != nil {
		return nil, "", fmt.Errorf("连接CardDAV失败: %w", err)
	}

	return client, acct.CardDAV.DefaultAddressBook, nil
}

// parseName 将全名分割为名字和姓氏
func parseName(fullName string) (first, last string) {
	parts := strings.Fields(fullName)
	if len(parts) == 0 {
		return "", ""
	}
	if len(parts) == 1 {
		return parts[0], ""
	}
	return parts[0], strings.Join(parts[1:], " ")
}

// generateContactUID 生成联系人的唯一标识符
func generateContactUID() string {
	return fmt.Sprintf("%d@sog", time.Now().UnixNano())
}

// outputContactsJSON 以JSON格式输出联系人
func outputContactsJSON(contacts []carddav.Contact) error {
	for _, c := range contacts {
		emails := strings.Join(c.Emails, ",")
		phones := strings.Join(c.Phones, ",")
		fmt.Printf(`{"uid":"%s","full_name":"%s","emails":"%s","phones":"%s","org":"%s"}`+"\n",
			c.UID, c.FullName, emails, phones, c.Org)
	}
	return nil
}

// outputContactsTable 以表格形式输出联系人
func outputContactsTable(contacts []carddav.Contact) error {
	// 输出表头
	fmt.Printf("%-30s %-30s %-20s\n", "姓名", "邮箱", "电话")
	
	for _, c := range contacts {
		name := c.FullName
		if len(name) > 30 {
			name = name[:27] + "..."
		}
		
		email := ""
		if len(c.Emails) > 0 {
			email = c.Emails[0]
		}
		if len(email) > 30 {
			email = email[:27] + "..."
		}
		
		phone := ""
		if len(c.Phones) > 0 {
			phone = c.Phones[0]
		}
		
		fmt.Printf("%-30s %-30s %-20s\n", name, email, phone)
	}
	return nil
}

// outputContactDetail 详细输出单个联系人
func outputContactDetail(contact *carddav.Contact) error {
	// 输出联系人基本信息
	fmt.Printf("UID:       %s\n", contact.UID)
	fmt.Printf("姓名:      %s\n", contact.FullName)
	
	if contact.FirstName != "" || contact.LastName != "" {
		fmt.Printf("           (名: %s, 姓: %s)\n", contact.FirstName, contact.LastName)
	}
	
	// 输出联系方式
	if len(contact.Emails) > 0 {
		fmt.Printf("邮箱:      %s\n", strings.Join(contact.Emails, ", "))
	}
	if len(contact.Phones) > 0 {
		fmt.Printf("电话:      %s\n", strings.Join(contact.Phones, ", "))
	}
	
	// 输出工作信息
	if contact.Org != "" {
		fmt.Printf("组织:      %s\n", contact.Org)
	}
	if contact.Title != "" {
		fmt.Printf("职位:      %s\n", contact.Title)
	}
	
	// 输出其他信息
	if len(contact.Addresses) > 0 {
		fmt.Printf("地址:      %s\n", strings.Join(contact.Addresses, "; "))
	}
	if contact.Birthday != "" {
		fmt.Printf("生日:      %s\n", contact.Birthday)
	}
	if contact.Note != "" {
		fmt.Printf("备注:      %s\n", contact.Note)
	}
	if contact.URL != "" {
		fmt.Printf("网址:      %s\n", contact.URL)
	}
	
	return nil
}

// outputAddressBooksJSON 以JSON格式输出通讯录
func outputAddressBooksJSON(books []carddav.AddressBook) error {
	for _, b := range books {
		fmt.Printf(`{"path":"%s","name":"%s","description":"%s"}`+"\n", b.Path, b.Name, b.Description)
	}
	return nil
}