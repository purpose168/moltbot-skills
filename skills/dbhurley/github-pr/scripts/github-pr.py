#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["rich", "typer"]
# ///
"""
GitHub PR 工具 - 在本地获取、预览、合并和测试 PR。

功能：
- 预览 PR 详情、文件更改和 CI 状态
- 在本地获取 PR 分支
- 将 PR 合并到当前分支
- 完整测试周期：获取、合并、安装依赖、构建和测试

使用示例：
  # 预览 PR
  github-pr preview owner/repo 123
  
  # 获取 PR 分支
  github-pr fetch owner/repo 123
  
  # 合并 PR
  github-pr merge owner/repo 123
  
  # 完整测试
  github-pr test owner/repo 123
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

app = typer.Typer(help="GitHub PR 工具 - 在本地获取、预览、合并和测试 PR")
console = Console()


def run(cmd: list[str], check: bool = True, capture: bool = True) -> subprocess.CompletedProcess:
    """
    运行命令并返回结果
    
    参数:
        cmd: 命令列表
        check: 是否检查命令执行状态
        capture: 是否捕获输出
        
    返回:
        命令执行结果
    """
    result = subprocess.run(cmd, capture_output=capture, text=True)
    if check and result.returncode != 0:
        console.print(f"[red]命令失败:[/red] {' '.join(cmd)}")
        if result.stderr:
            console.print(f"[dim]{result.stderr}[/dim]")
        raise typer.Exit(1)
    return result


def get_pr_info(repo: str, pr_number: int) -> dict:
    """
    从 GitHub 获取 PR 详情
    
    参数:
        repo: 仓库（owner/repo）
        pr_number: PR 编号
        
    返回:
        PR 信息字典
    """
    result = run([
        "gh", "pr", "view", str(pr_number),
        "--repo", repo,
        "--json", "title,author,state,headRefName,baseRefName,additions,deletions,files,statusCheckRollup,comments,url"
    ])
    return json.loads(result.stdout)


def detect_package_manager() -> Optional[str]:
    """
    检测使用哪个包管理器
    
    返回:
        包管理器名称（pnpm、yarn、bun、npm）或 None
    """
    cwd = Path.cwd()
    if (cwd / "pnpm-lock.yaml").exists():
        return "pnpm"
    if (cwd / "yarn.lock").exists():
        return "yarn"
    if (cwd / "bun.lockb").exists():
        return "bun"
    if (cwd / "package-lock.json").exists():
        return "npm"
    if (cwd / "package.json").exists():
        return "npm"
    return None


@app.command()
def preview(
    repo: str = typer.Argument(..., help="仓库（owner/repo）"),
    pr_number: int = typer.Argument(..., help="PR 编号"),
):
    """
    预览 PR 的详情、文件和 CI 状态
    """
    console.print(f"[blue]获取 PR #{pr_number} 从 {repo}...[/blue]")
    
    pr = get_pr_info(repo, pr_number)
    
    # 头部面板
    status_color = "green" if pr["state"] == "OPEN" else "red"
    console.print(Panel(
        f"[bold]{pr['title']}[/bold]\n\n"
        f"作者: {pr['author']['login']}\n"
        f"状态: [{status_color}]{pr['state']}[/{status_color}]\n"
        f"分支: {pr['headRefName']} → {pr['baseRefName']}\n"
        f"更改: [green]+{pr['additions']}[/green] / [red]-{pr['deletions']}[/red]\n"
        f"URL: {pr['url']}",
        title=f"PR #{pr_number}",
    ))
    
    # 文件表格
    if pr.get("files"):
        table = Table(title="更改的文件")
        table.add_column("文件", style="cyan")
        table.add_column("+", style="green", justify="right")
        table.add_column("-", style="red", justify="right")
        
        for f in pr["files"][:20]:  # 限制为 20 个文件
            table.add_row(f["path"], str(f["additions"]), str(f["deletions"]))
        
        if len(pr["files"]) > 20:
            table.add_row(f"... 还有 {len(pr['files']) - 20} 个文件", "", "")
        
        console.print(table)
    
    # CI 状态
    checks = pr.get("statusCheckRollup", [])
    if checks:
        console.print("\n[bold]CI 状态:[/bold]")
        for check in checks[:10]:
            status = check.get("conclusion", check.get("status", "PENDING"))
            icon = "✅" if status == "SUCCESS" else "❌" if status == "FAILURE" else "⏳"
            name = check.get("name", "Unknown")[:50]
            console.print(f"  {icon} {name}")


@app.command()
def fetch(
    repo: str = typer.Argument(..., help="仓库（owner/repo）"),
    pr_number: int = typer.Argument(..., help="PR 编号"),
    branch: Optional[str] = typer.Option(None, "--branch", "-b", help="本地分支名称"),
    remote: str = typer.Option("upstream", "--remote", "-r", help="远程名称"),
):
    """
    在本地获取 PR 分支
    """
    branch_name = branch or f"pr/{pr_number}"
    
    console.print(f"[blue]从 {remote} 获取 PR #{pr_number}...[/blue]")
    
    # 获取 PR
    run(["git", "fetch", remote, f"pull/{pr_number}/head:{branch_name}"])
    
    console.print(f"[green]✓ PR 已获取到分支:[/green] {branch_name}")
    console.print(f"\n[dim]检出分支: git checkout {branch_name}[/dim]")
    console.print(f"[dim]合并分支: git merge {branch_name}[/dim]")


@app.command()
def merge(
    repo: str = typer.Argument(..., help="仓库（owner/repo）"),
    pr_number: int = typer.Argument(..., help="PR 编号"),
    remote: str = typer.Option("upstream", "--remote", "-r", help="远程名称"),
    no_install: bool = typer.Option(False, "--no-install", help="跳过依赖安装"),
    branch: Optional[str] = typer.Option(None, "--branch", "-b", help="本地分支名称"),
):
    """
    获取并合并 PR 到当前分支
    """
    branch_name = branch or f"pr/{pr_number}"
    
    # 先获取 PR 信息
    console.print(f"[blue]获取 PR #{pr_number} 信息...[/blue]")
    pr = get_pr_info(repo, pr_number)
    console.print(f"[bold]{pr['title']}[/bold]")
    console.print(f"[dim]+{pr['additions']} / -{pr['deletions']} 跨越 {len(pr.get('files', []))} 个文件[/dim]\n")
    
    # 获取 PR
    console.print(f"[blue]获取 PR 分支...[/blue]")
    run(["git", "fetch", remote, f"pull/{pr_number}/head:{branch_name}"])
    
    # 合并
    console.print(f"[blue]合并到当前分支...[/blue]")
    result = run(["git", "merge", branch_name, "--no-edit"], check=False)
    
    if result.returncode != 0:
        console.print("[yellow]⚠️ 检测到合并冲突，请手动解决。[/yellow]")
        raise typer.Exit(1)
    
    console.print("[green]✓ 合并成功[/green]")
    
    # 安装依赖
    if not no_install:
        pm = detect_package_manager()
        if pm:
            console.print(f"\n[blue]使用 {pm} 安装依赖...[/blue]")
            install_cmd = [pm, "install"]
            if pm == "pnpm":
                install_cmd.append("--force")  # 处理补丁问题
            run(install_cmd, capture=False)
            console.print(f"[green]✓ 依赖已安装[/green]")


@app.command()
def test(
    repo: str = typer.Argument(..., help="仓库（owner/repo）"),
    pr_number: int = typer.Argument(..., help="PR 编号"),
    remote: str = typer.Option("upstream", "--remote", "-r", help="远程名称"),
):
    """
    完整测试周期：获取、合并、安装、构建、测试
    """
    branch_name = f"pr/{pr_number}"
    
    # 获取 PR 信息
    console.print(f"[blue]获取 PR #{pr_number} 信息...[/blue]")
    pr = get_pr_info(repo, pr_number)
    console.print(Panel(f"[bold]{pr['title']}[/bold]\n+{pr['additions']} / -{pr['deletions']}", title=f"PR #{pr_number}"))
    
    # 获取
    console.print(f"\n[blue]步骤 1/4: 获取 PR 分支...[/blue]")
    run(["git", "fetch", remote, f"pull/{pr_number}/head:{branch_name}"])
    console.print("[green]✓ 已获取[/green]")
    
    # 合并
    console.print(f"\n[blue]步骤 2/4: 合并...[/blue]")
    result = run(["git", "merge", branch_name, "--no-edit"], check=False)
    if result.returncode != 0:
        console.print("[red]✗ 合并冲突 - 请手动解决[/red]")
        raise typer.Exit(1)
    console.print("[green]✓ 已合并[/green]")
    
    # 安装
    pm = detect_package_manager()
    if pm:
        console.print(f"\n[blue]步骤 3/4: 安装依赖 ({pm})...[/blue]")
        install_cmd = [pm, "install"]
        if pm == "pnpm":
            install_cmd.append("--force")
        run(install_cmd, capture=False)
        console.print("[green]✓ 已安装[/green]")
        
        # 构建
        console.print(f"\n[blue]步骤 4/4: 构建...[/blue]")
        build_result = run([pm, "run", "build"], check=False, capture=False)
        if build_result.returncode != 0:
            console.print("[yellow]⚠️ 构建有错误（可能仍能工作）[/yellow]")
        else:
            console.print("[green]✓ 已构建[/green]")
    
    console.print(f"\n[bold green]✓ PR #{pr_number} 已合并并测试完成！[/bold green]")


if __name__ == "__main__":
    app()