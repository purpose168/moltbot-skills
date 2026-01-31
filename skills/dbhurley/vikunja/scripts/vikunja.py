#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["requests", "rich"]
# ///
"""
Vikunja 命令行工具 - 开源项目和任务管理工具

功能列表：
- vikunja.py projects                    # 列出所有项目
- vikunja.py project <id>                # 获取项目详情
- vikunja.py tasks [--project ID]        # 列出任务
- vikunja.py create-project <name>       # 创建新项目
- vikunja.py create-task <title> --project ID [--due DATE] [--priority N]  # 创建任务
- vikunja.py complete <task_id>          # 标记任务完成

环境变量配置：
    VIKUNJA_URL      - Vikunja 实例地址（必填）
    VIKUNJA_USER     - 用户名或邮箱（必填）
    VIKUNJA_PASSWORD - 密码（必填）

示例用法：
    export VIKUNJA_URL="https://vikunja.example.com"
    export VIKUNJA_USER="your@email.com"
    export VIKUNJA_PASSWORD="yourpassword"
    uv run vikunja.py projects
"""

import argparse
import json
import os
import sys
from datetime import datetime
from typing import Optional

import requests
from rich.console import Console
from rich.table import Table

# 创建 Rich 控制台实例用于美化的终端输出
console = Console()

# 从环境变量读取配置
VIKUNJA_URL = os.environ.get("VIKUNJA_URL", "")
VIKUNJA_USER = os.environ.get("VIKUNJA_USER", "")
VIKUNJA_PASSWORD = os.environ.get("VIKUNJA_PASSWORD", "")


def check_config():
    """
    检查必需的环境变量是否已配置。
    
    验证 VIKUNJA_URL、VIKUNJA_USER 和 VIKUNJA_PASSWORD 是否都已设置。
    如果缺少任何必需的环境变量，打印错误消息并退出程序。
    """
    missing = []
    if not VIKUNJA_URL:
        missing.append("VIKUNJA_URL")
    if not VIKUNJA_USER:
        missing.append("VIKUNJA_USER")
    if not VIKUNJA_PASSWORD:
        missing.append("VIKUNJA_PASSWORD")
    
    if missing:
        console.print(f"[red]缺少必需的环境变量: {', '.join(missing)}[/red]")
        console.print("[dim]请在运行脚本前设置这些变量。[/dim]")
        sys.exit(1)


class VikunjaClient:
    """
    Vikunja API 客户端类
    
    封装与 Vikunja API 的所有交互操作，
    包括认证、项目管理、任务管理等核心功能。
    """
    
    def __init__(self):
        """
        初始化客户端实例。
        首先检查配置是否完整，然后设置基础 URL。
        """
        check_config()
        self.base_url = VIKUNJA_URL.rstrip("/")
        self.token = None
        
    def login(self):
        """
        用户认证并获取访问令牌。
        
        向 Vikunja API 发送登录请求，使用环境变量中的用户名和密码。
        成功后将返回的令牌保存到实例中供后续请求使用。
        
        返回:
            str: 认证令牌
            
        退出:
            如果登录失败（状态码非 200），打印错误消息并退出程序
        """
        resp = requests.post(
            f"{self.base_url}/api/v1/login",
            json={"username": VIKUNJA_USER, "password": VIKUNJA_PASSWORD}
        )
        if resp.status_code != 200:
            console.print(f"[red]登录失败: {resp.text}[/red]")
            sys.exit(1)
        self.token = resp.json().get("token")
        return self.token
    
    def _headers(self):
        """
        构建带有认证令牌的请求头。
        
        如果尚未登录，先调用 login() 方法获取令牌。
        
        返回:
            dict: 包含 Authorization 头的字典
        """
        if not self.token:
            self.login()
        return {"Authorization": f"Bearer {self.token}"}
    
    def get_projects(self):
        """
        获取所有项目列表。
        
        返回:
            list: 项目字典列表
        """
        resp = requests.get(f"{self.base_url}/api/v1/projects", headers=self._headers())
        return resp.json()
    
    def get_project(self, project_id: int):
        """
        获取指定项目的详细信息。
        
        参数:
            project_id: 项目 ID
            
        返回:
            dict: 项目详情字典
        """
        resp = requests.get(f"{self.base_url}/api/v1/projects/{project_id}", headers=self._headers())
        return resp.json()
    
    def create_project(self, title: str, description: str = ""):
        """
        创建新项目。
        
        参数:
            title: 项目标题
            description: 项目描述（可选）
            
        返回:
            dict: 创建的项目详情
        """
        resp = requests.put(
            f"{self.base_url}/api/v1/projects",
            headers=self._headers(),
            json={"title": title, "description": description}
        )
        return resp.json()
    
    def get_tasks(self, project_id: Optional[int] = None):
        """
        获取任务列表，可按项目筛选。
        
        参数:
            project_id: 项目 ID（可选），为 None 时返回所有任务
            
        返回:
            list: 任务字典列表
        """
        if project_id:
            resp = requests.get(
                f"{self.base_url}/api/v1/projects/{project_id}/tasks",
                headers=self._headers()
            )
        else:
            resp = requests.get(f"{self.base_url}/api/v1/tasks/all", headers=self._headers())
        return resp.json()
    
    def create_task(self, project_id: int, title: str, description: str = "", 
                    due_date: Optional[str] = None, priority: int = 0):
        """
        在指定项目中创建新任务。
        
        参数:
            project_id: 所属项目 ID
            title: 任务标题
            description: 任务描述（可选）
            due_date: 截止日期，格式为 YYYY-MM-DD（可选）
            priority: 优先级，范围 0-5（可选，默认 0）
            
        返回:
            dict: 创建的任务详情
        """
        data = {
            "title": title,
            "description": description,
            "priority": priority
        }
        if due_date:
            # 转换为 ISO 格式并添加时间部分
            data["due_date"] = f"{due_date}T23:59:59Z"
        
        resp = requests.put(
            f"{self.base_url}/api/v1/projects/{project_id}/tasks",
            headers=self._headers(),
            json=data
        )
        return resp.json()
    
    def complete_task(self, task_id: int):
        """
        标记任务为已完成。
        
        参数:
            task_id: 任务 ID
            
        返回:
            dict: 更新后的任务详情
        """
        resp = requests.post(
            f"{self.base_url}/api/v1/tasks/{task_id}",
            headers=self._headers(),
            json={"done": True}
        )
        return resp.json()


def cmd_projects(args):
    """
    命令处理函数：列出所有项目。
    
    参数:
        args: 命令行参数对象，包含 --json 选项
    """
    client = VikunjaClient()
    projects = client.get_projects()
    
    if args.json:
        # JSON 格式输出
        print(json.dumps(projects, indent=2))
        return
    
    # 创建美化的表格输出
    table = Table(title="项目列表 / Projects")
    table.add_column("ID", style="cyan")
    table.add_column("标题", style="green")
    table.add_column("任务数", style="yellow")
    
    for p in projects:
        table.add_row(str(p["id"]), p["title"], str(p.get("task_count", 0)))
    
    console.print(table)


def cmd_project(args):
    """
    命令处理函数：获取项目详情。
    
    参数:
        args: 命令行参数对象，包含项目 ID
    """
    client = VikunjaClient()
    project = client.get_project(args.id)
    
    if args.json:
        print(json.dumps(project, indent=2))
        return
    
    # 打印项目标题
    console.print(f"[bold]{project['title']}[/bold] (ID: {project['id']})")
    if project.get("description"):
        console.print(f"[dim]{project['description']}[/dim]")
    
    # 获取并显示该项目下的任务
    tasks = client.get_tasks(args.id)
    if tasks:
        console.print(f"\n[yellow]任务列表 ({len(tasks)}):[/yellow]")
        for t in tasks:
            done = "✓" if t.get("done") else "○"
            console.print(f"  {done} {t['title']}")


def cmd_tasks(args):
    """
    命令处理函数：列出任务。
    
    参数:
        args: 命令行参数对象，可包含 --project 选项筛选项目
    """
    client = VikunjaClient()
    tasks = client.get_tasks(args.project)
    
    if args.json:
        print(json.dumps(tasks, indent=2))
        return
    
    # 设置表格标题
    title = f"任务列表 (项目 {args.project})" if args.project else "所有任务"
    table = Table(title=title)
    table.add_column("ID", style="cyan")
    table.add_column("标题", style="green")
    table.add_column("完成", style="yellow")
    table.add_column("截止日期", style="red")
    table.add_column("优先级")
    
    for t in tasks:
        done = "✓" if t.get("done") else ""
        due = t.get("due_date", "")[:10] if t.get("due_date") else ""
        priority = str(t.get("priority", 0))
        table.add_row(str(t["id"]), t["title"], done, due, priority)
    
    console.print(table)


def cmd_create_project(args):
    """
    命令处理函数：创建新项目。
    
    参数:
        args: 命令行参数对象，包含项目名称和描述
    """
    client = VikunjaClient()
    project = client.create_project(args.name, args.description or "")
    console.print(f"[green]已创建项目:[/green] {project['title']} (ID: {project['id']})")


def cmd_create_task(args):
    """
    命令处理函数：创建新任务。
    
    参数:
        args: 命令行参数对象，包含任务标题、项目 ID、描述、截止日期和优先级
    """
    client = VikunjaClient()
    task = client.create_task(
        args.project,
        args.title,
        args.description or "",
        args.due,
        args.priority or 0
    )
    console.print(f"[green]已创建任务:[/green] {task['title']} (ID: {task['id']})")


def cmd_complete(args):
    """
    命令处理函数：标记任务完成。
    
    参数:
        args: 命令行参数对象，包含任务 ID
    """
    client = VikunjaClient()
    task = client.complete_task(args.task_id)
    console.print(f"[green]已完成任务:[/green] {task['title']}")


def main():
    """
    主函数：解析命令行参数并执行相应的操作。
    """
    # 创建命令行参数解析器
    parser = argparse.ArgumentParser(description="Vikunja 项目管理 / Vikunja Project Management")
    parser.add_argument("--json", action="store_true", help="JSON 格式输出")
    
    # 创建子命令解析器
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # projects 子命令
    p_projects = subparsers.add_parser("projects", help="列出所有项目")
    p_projects.set_defaults(func=cmd_projects)
    
    # project 子命令
    p_project = subparsers.add_parser("project", help="获取项目详情")
    p_project.add_argument("id", type=int, help="项目 ID")
    p_project.set_defaults(func=cmd_project)
    
    # tasks 子命令
    p_tasks = subparsers.add_parser("tasks", help="列出任务")
    p_tasks.add_argument("--project", type=int, help="按项目 ID 筛选")
    p_tasks.set_defaults(func=cmd_tasks)
    
    # create-project 子命令
    p_create_proj = subparsers.add_parser("create-project", help="创建项目")
    p_create_proj.add_argument("name", help="项目名称")
    p_create_proj.add_argument("--description", "-d", help="项目描述")
    p_create_proj.set_defaults(func=cmd_create_project)
    
    # create-task 子命令
    p_create_task = subparsers.add_parser("create-task", help="创建任务")
    p_create_task.add_argument("title", help="任务标题")
    p_create_task.add_argument("--project", "-p", type=int, required=True, help="项目 ID")
    p_create_task.add_argument("--description", "-d", help="任务描述")
    p_create_task.add_argument("--due", help="截止日期 (YYYY-MM-DD)")
    p_create_task.add_argument("--priority", type=int, help="优先级 (0-5)")
    p_create_task.set_defaults(func=cmd_create_task)
    
    # complete 子命令
    p_complete = subparsers.add_parser("complete", help="完成任务")
    p_complete.add_argument("task_id", type=int, help="任务 ID")
    p_complete.set_defaults(func=cmd_complete)
    
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
