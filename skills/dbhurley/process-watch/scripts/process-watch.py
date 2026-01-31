#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["psutil", "rich", "typer"]
# ///
"""
系统进程监控工具 - 全面的系统进程监控和资源管理

功能支持：
- 列出运行中的进程及其资源使用情况
- 显示资源消耗最高的进程（CPU、内存、磁盘）
- 获取特定进程的详细信息
- 按名称查找进程
- 显示端口绑定和使用进程
- 终止指定进程
- 快速系统资源概览
- 实时监控系统资源并发出警报

使用示例：
  # 列出按 CPU 使用率排序的进程
  uv run process-watch.py list-procs --sort cpu
  
  # 显示 CPU 使用率最高的进程
  uv run process-watch.py top --type cpu
  
  # 获取特定进程的详细信息
  uv run process-watch.py info 1234
  
  # 按名称查找进程
  uv run process-watch.py find python
  
  # 实时监控系统资源
  uv run process-watch.py watch
"""

import signal
import sys
import time
from datetime import datetime
from typing import Optional

import psutil
import typer
from rich.console import Console
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

app = typer.Typer(help="进程监控 - 监控系统进程、资源和端口")
console = Console()


def format_bytes(b: float) -> str:
    """
    将字节数格式化为人类可读的格式。
    
    参数:
        b: 字节数
        
    返回:
        格式化的字符串，如 "1.2MB"、"3.4GB" 等
    """
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if abs(b) < 1024:
            return f"{b:.1f}{unit}"
        b /= 1024
    return f"{b:.1f}PB"


def format_time(seconds: float) -> str:
    """
    将秒数格式化为人类可读的格式。
    
    参数:
        seconds: 秒数
        
    返回:
        格式化的字符串，如 "5s"、"10m"、"2.5h" 等
    """
    if seconds < 60:
        return f"{seconds:.0f}s"
    if seconds < 3600:
        return f"{seconds/60:.0f}m"
    if seconds < 86400:
        return f"{seconds/3600:.1f}h"
    return f"{seconds/86400:.1f}d"


def get_process_info(proc: psutil.Process) -> dict:
    """
    安全获取进程的综合信息。
    
    参数:
        proc: psutil.Process 对象
        
    返回:
        包含进程信息的字典，如果进程不存在或无法访问则返回 None
    """
    try:
        with proc.oneshot():
            info = {
                "pid": proc.pid,               # 进程 ID
                "name": proc.name(),           # 进程名称
                "cpu": proc.cpu_percent(),     # CPU 使用率
                "mem": proc.memory_percent(),  # 内存使用率
                "mem_bytes": proc.memory_info().rss,  # 内存使用量（字节）
                "status": proc.status(),       # 进程状态
                "user": proc.username(),       # 运行用户
                "created": proc.create_time(),  # 创建时间
            }
            try:
                # 获取命令行参数，限制长度为 80 字符
                info["cmdline"] = " ".join(proc.cmdline())[:80]
            except (psutil.AccessDenied, psutil.ZombieProcess):
                info["cmdline"] = ""
            try:
                # 获取 I/O 计数器
                io = proc.io_counters()
                info["read_bytes"] = io.read_bytes
                info["write_bytes"] = io.write_bytes
            except (psutil.AccessDenied, AttributeError, psutil.ZombieProcess):
                info["read_bytes"] = 0
                info["write_bytes"] = 0
            return info
    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
        return None


@app.command()
def list_procs(
    sort: str = typer.Option("cpu", "--sort", "-s", help="排序方式: cpu, mem, disk, name, pid"),
    limit: int = typer.Option(25, "--limit", "-l", help="显示进程数量"),
    all_procs: bool = typer.Option(False, "--all", "-a", help="显示所有进程"),
):
    """
    列出运行中的进程及其资源使用情况。
    
    参数:
        sort: 排序方式
        limit: 显示进程数量
        all_procs: 是否显示所有进程
    """
    # 首次遍历初始化 CPU 测量
    for proc in psutil.process_iter():
        try:
            proc.cpu_percent()
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    
    time.sleep(0.1)  # 短暂暂停以获取准确的 CPU 测量值
    
    procs = []
    for proc in psutil.process_iter():
        info = get_process_info(proc)
        if info:
            procs.append(info)
    
    # 排序
    sort_keys = {
        "cpu": lambda x: x["cpu"],
        "mem": lambda x: x["mem"],
        "disk": lambda x: x["read_bytes"] + x["write_bytes"],
        "name": lambda x: x["name"].lower(),
        "pid": lambda x: x["pid"],
    }
    # 排序，除了按名称排序外，其他都是降序
    procs.sort(key=sort_keys.get(sort, sort_keys["cpu"]), reverse=sort != "name")
    
    if not all_procs:
        procs = procs[:limit]
    
    table = Table(title=f"进程列表（按 {sort} 排序）")
    table.add_column("PID", style="cyan", justify="right")
    table.add_column("Name", style="bold")
    table.add_column("CPU%", justify="right")
    table.add_column("Mem%", justify="right")
    table.add_column("Memory", justify="right")
    table.add_column("User", style="dim")
    table.add_column("Command", style="dim", max_width=40)
    
    for p in procs:
        # 根据 CPU 和内存使用率设置颜色
        cpu_style = "red" if p["cpu"] > 50 else "yellow" if p["cpu"] > 20 else ""
        mem_style = "red" if p["mem"] > 10 else "yellow" if p["mem"] > 5 else ""
        table.add_row(
            str(p["pid"]),
            p["name"][:20],  # 限制名称长度
            f"[{cpu_style}]{p['cpu']:.1f}[/]",
            f"[{mem_style}]{p['mem']:.1f}[/]",
            format_bytes(p["mem_bytes"]),
            p["user"][:10],  # 限制用户名长度
            p["cmdline"][:40] if p["cmdline"] else "-",  # 限制命令行长度
        )
    
    console.print(table)


@app.command()
def top(
    type_: str = typer.Option("cpu", "--type", "-t", help="资源类型: cpu, mem, disk"),
    limit: int = typer.Option(10, "--limit", "-l", help="进程数量"),
):
    """
    显示资源消耗最高的进程。
    
    参数:
        type_: 资源类型
        limit: 显示进程数量
    """
    # 初始化 CPU 测量
    for proc in psutil.process_iter():
        try:
            proc.cpu_percent()
        except:
            pass
    time.sleep(0.2)
    
    procs = []
    for proc in psutil.process_iter():
        info = get_process_info(proc)
        if info:
            procs.append(info)
    
    # 排序键
    sort_keys = {
        "cpu": lambda x: x["cpu"],
        "mem": lambda x: x["mem"],
        "disk": lambda x: x["read_bytes"] + x["write_bytes"],
    }
    # 按指定资源类型排序
    procs.sort(key=sort_keys.get(type_, sort_keys["cpu"]), reverse=True)
    procs = procs[:limit]
    
    # 标题映射
    title = {"cpu": "🔥 CPU 消耗最高的进程", "mem": "🧠 内存消耗最高的进程", "disk": "💾 磁盘 I/O 最高的进程"}
    
    table = Table(title=title.get(type_, f"按 {type_} 排序的进程"))
    table.add_column("PID", style="cyan", justify="right")
    table.add_column("Name", style="bold")
    
    if type_ == "cpu":
        table.add_column("CPU%", justify="right", style="red")
    elif type_ == "mem":
        table.add_column("Mem%", justify="right")
        table.add_column("Memory", justify="right", style="red")
    else:
        table.add_column("Read", justify="right")
        table.add_column("Write", justify="right", style="red")
    
    table.add_column("User", style="dim")
    
    for p in procs:
        if type_ == "cpu":
            table.add_row(str(p["pid"]), p["name"], f"{p['cpu']:.1f}%", p["user"])
        elif type_ == "mem":
            table.add_row(str(p["pid"]), p["name"], f"{p['mem']:.1f}%", format_bytes(p["mem_bytes"]), p["user"])
        else:
            table.add_row(str(p["pid"]), p["name"], format_bytes(p["read_bytes"]), format_bytes(p["write_bytes"]), p["user"])
    
    console.print(table)


@app.command()
def info(pid: int = typer.Argument(..., help="进程 ID")):
    """
    获取特定进程的详细信息。
    
    参数:
        pid: 进程 ID
    """
    try:
        proc = psutil.Process(pid)
    except psutil.NoSuchProcess:
        console.print(f"[red]进程 {pid} 未找到[/red]")
        raise typer.Exit(1)
    
    try:
        # 初始化 CPU 测量
        proc.cpu_percent()
        time.sleep(0.1)
        
        with proc.oneshot():
            name = proc.name()          # 进程名称
            cmdline = " ".join(proc.cmdline()) or "-"  # 命令行参数
            cpu = proc.cpu_percent()    # CPU 使用率
            mem = proc.memory_info()     # 内存信息
            status = proc.status()       # 进程状态
            user = proc.username()       # 运行用户
            created = datetime.fromtimestamp(proc.create_time())  # 创建时间
            parent = proc.parent()       # 父进程
            children = proc.children()   # 子进程
            
            # 基本信息面板
            info_text = f"""[bold]名称:[/bold] {name}
[bold]PID:[/bold] {pid}
[bold]状态:[/bold] {status}
[bold]用户:[/bold] {user}
[bold]启动时间:[/bold] {created.strftime('%Y-%m-%d %H:%M:%S')}
[bold]父进程:[/bold] {parent.pid if parent else 'None'} ({parent.name() if parent else ''})
[bold]子进程:[/bold] {len(children)}

[bold]CPU:[/bold] {cpu:.1f}%
[bold]内存:[/bold] {format_bytes(mem.rss)} ({mem.rss / psutil.virtual_memory().total * 100:.1f}%)
[bold]虚拟内存:[/bold] {format_bytes(mem.vms)}

[bold]命令:[/bold]
{cmdline[:200]}"""
            
            console.print(Panel(info_text, title=f"进程 {pid}: {name}"))
            
            # 打开的文件
            try:
                files = proc.open_files()
                if files:
                    console.print(f"\n[bold]打开的文件 ({len(files)}):[/bold]")
                    for f in files[:10]:
                        console.print(f"  {f.path}")
                    if len(files) > 10:
                        console.print(f"  ... 还有 {len(files) - 10} 个文件")
            except psutil.AccessDenied:
                console.print("\n[dim]打开的文件: 访问被拒绝[/dim]")
            
            # 网络连接
            try:
                conns = proc.net_connections()
                if conns:
                    console.print(f"\n[bold]网络连接 ({len(conns)}):[/bold]")
                    for c in conns[:10]:
                        local = f"{c.laddr.ip}:{c.laddr.port}" if c.laddr else "-"
                        remote = f"{c.raddr.ip}:{c.raddr.port}" if c.raddr else "-"
                        console.print(f"  {c.status:12} {local:25} → {remote}")
                    if len(conns) > 10:
                        console.print(f"  ... 还有 {len(conns) - 10} 个连接")
            except psutil.AccessDenied:
                console.print("\n[dim]网络连接: 访问被拒绝[/dim]")
            
            # 子进程
            if children:
                console.print(f"\n[bold]子进程 ({len(children)}):[/bold]")
                for child in children[:10]:
                    try:
                        console.print(f"  {child.pid}: {child.name()}")
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
                        
    except psutil.AccessDenied:
        console.print(f"[red]无法访问进程 {pid}[/red]")
        raise typer.Exit(1)


@app.command()
def find(name: str = typer.Argument(..., help="要搜索的进程名称")):
    """
    按名称查找进程。
    
    参数:
        name: 要搜索的进程名称
    """
    found = []
    for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'cpu_percent', 'memory_percent']):
        try:
            pname = proc.info['name'].lower()
            cmdline = " ".join(proc.info['cmdline'] or []).lower()
            # 检查进程名称或命令行是否包含搜索字符串
            if name.lower() in pname or name.lower() in cmdline:
                found.append(proc.info)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    
    if not found:
        console.print(f"[yellow]未找到匹配 '{name}' 的进程[/yellow]")
        return
    
    table = Table(title=f"匹配 '{name}' 的进程")
    table.add_column("PID", style="cyan")
    table.add_column("Name", style="bold")
    table.add_column("CPU%", justify="right")
    table.add_column("Mem%", justify="right")
    
    for p in found:
        table.add_row(str(p['pid']), p['name'], f"{p['cpu_percent']:.1f}", f"{p['memory_percent']:.1f}")
    
    console.print(table)
    console.print(f"\n[dim]找到 {len(found)} 个进程[/dim]")


@app.command()
def ports(
    port: Optional[int] = typer.Option(None, "--port", "-p", help="按特定端口过滤"),
    listening: bool = typer.Option(False, "--listening", "-l", help="仅显示监听端口"),
):
    """
    显示端口绑定和使用它们的进程。
    
    参数:
        port: 按特定端口过滤
        listening: 是否仅显示监听端口
    """
    connections = []
    
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            for conn in proc.net_connections():
                if conn.laddr:
                    # 按端口过滤
                    if port and conn.laddr.port != port:
                        continue
                    # 按监听状态过滤
                    if listening and conn.status != "LISTEN":
                        continue
                    connections.append({
                        "pid": proc.info['pid'],
                        "name": proc.info['name'],
                        "port": conn.laddr.port,
                        "ip": conn.laddr.ip,
                        "status": conn.status,
                        "remote": f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else "-",
                    })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    
    # 按端口排序
    connections.sort(key=lambda x: x["port"])
    
    # 对于监听端口，去重
    if listening:
        seen = set()
        unique = []
        for c in connections:
            key = (c["port"], c["pid"])
            if key not in seen:
                seen.add(key)
                unique.append(c)
        connections = unique
    
    if not connections:
        msg = f"未找到连接"
        if port:
            msg += f" 在端口 {port}"
        console.print(f"[yellow]{msg}[/yellow]")
        return
    
    table = Table(title="端口绑定" + (f" (端口 {port})" if port else ""))
    table.add_column("端口", style="cyan", justify="right")
    table.add_column("IP", style="dim")
    table.add_column("状态")
    table.add_column("PID", justify="right")
    table.add_column("进程", style="bold")
    table.add_column("远程", style="dim")
    
    for c in connections[:50]:
        # 根据状态设置颜色
        status_style = "green" if c["status"] == "LISTEN" else "yellow" if c["status"] == "ESTABLISHED" else ""
        table.add_row(
            str(c["port"]),
            c["ip"],
            f"[{status_style}]{c['status']}[/]",
            str(c["pid"]),
            c["name"],
            c["remote"],
        )
    
    if len(connections) > 50:
        console.print(f"[dim]显示 {50} 个连接中的 {len(connections)} 个[/dim]")
    
    console.print(table)


@app.command()
def kill(
    pid: Optional[int] = typer.Argument(None, help="要终止的进程 ID"),
    name: Optional[str] = typer.Option(None, "--name", "-n", help="按名称终止进程"),
    force: bool = typer.Option(False, "--force", "-f", help="强制终止（SIGKILL）"),
):
    """
    按 PID 或名称终止进程。
    
    参数:
        pid: 进程 ID
        name: 进程名称
        force: 是否强制终止
    """
    if not pid and not name:
        console.print("[red]请提供 PID 或 --name[/red]")
        raise typer.Exit(1)
    
    # 选择信号类型
    sig = signal.SIGKILL if force else signal.SIGTERM
    sig_name = "SIGKILL" if force else "SIGTERM"
    
    if pid:
        try:
            proc = psutil.Process(pid)
            pname = proc.name()
            proc.send_signal(sig)
            console.print(f"[green]✓ 向 {pid} ({pname}) 发送 {sig_name}[/green]")
        except psutil.NoSuchProcess:
            console.print(f"[red]进程 {pid} 未找到[/red]")
            raise typer.Exit(1)
        except psutil.AccessDenied:
            console.print(f"[red]访问被拒绝 - 尝试使用 sudo[/red]")
            raise typer.Exit(1)
    
    if name:
        killed = 0
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                if name.lower() in proc.info['name'].lower():
                    proc.send_signal(sig)
                    console.print(f"[green]✓ 向 {proc.info['pid']} ({proc.info['name']}) 发送 {sig_name}[/green]")
                    killed += 1
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        if killed == 0:
            console.print(f"[yellow]未找到匹配 '{name}' 的进程[/yellow]")
        else:
            console.print(f"\n[bold]已终止 {killed} 个进程[/bold]")


@app.command()
def summary():
    """
    快速系统概览 - CPU、内存、磁盘、顶级进程。
    """
    # CPU 信息
    cpu_percent = psutil.cpu_percent(interval=0.5)
    cpu_count = psutil.cpu_count()
    load = psutil.getloadavg()
    
    # 内存信息
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    
    # 磁盘信息
    disk = psutil.disk_usage('/')
    
    # 构建概览文本
    summary_text = f"""[bold cyan]CPU[/bold cyan]
  使用率: {cpu_percent}% ({cpu_count} 核心)
  负载: {load[0]:.2f} / {load[1]:.2f} / {load[2]:.2f}

[bold cyan]内存[/bold cyan]
  已使用: {format_bytes(mem.used)} / {format_bytes(mem.total)} ({mem.percent}%)
  可用: {format_bytes(mem.available)}
  交换区: {format_bytes(swap.used)} / {format_bytes(swap.total)} ({swap.percent}%)

[bold cyan]磁盘 (/)[/bold cyan]
  已使用: {format_bytes(disk.used)} / {format_bytes(disk.total)} ({disk.percent}%)
  可用: {format_bytes(disk.free)}

[bold cyan]进程[/bold cyan]
  总数: {len(list(psutil.process_iter()))}"""
    
    console.print(Panel(summary_text, title="系统概览"))
    
    # 按 CPU 使用率排序的前 5 个进程
    console.print("\n[bold]CPU 使用率前 5 名:[/bold]")
    procs = []
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent']):
        try:
            procs.append(proc.info)
        except:
            pass
    procs.sort(key=lambda x: x['cpu_percent'] or 0, reverse=True)
    for p in procs[:5]:
        cpu_val = p['cpu_percent'] or 0
        console.print(f"  {p['pid']:>6}  {p['name']:<20} {cpu_val:.1f}%")


@app.command()
def watch(
    interval: int = typer.Option(2, "--interval", "-i", help="更新间隔（秒）"),
    alert_cpu: int = typer.Option(80, "--alert-cpu", help="CPU 警报阈值 (%)"),
    alert_mem: int = typer.Option(90, "--alert-mem", help="内存警报阈值 (%)"),
):
    """
    实时监控系统资源并发出警报。
    
    参数:
        interval: 更新间隔（秒）
        alert_cpu: CPU 警报阈值 (%)
        alert_mem: 内存警报阈值 (%)
    """
    console.print(f"[dim]监控中... (按 Ctrl+C 停止，CPU>{alert_cpu}% 或 Mem>{alert_mem}% 时警报)[/dim]\n")
    
    try:
        while True:
            # 获取当前统计信息
            cpu = psutil.cpu_percent(interval=0.1)
            mem = psutil.virtual_memory()
            
            # 获取顶级进程
            procs = []
            for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
                try:
                    procs.append(proc.info)
                except:
                    pass
            procs.sort(key=lambda x: x['cpu_percent'] or 0, reverse=True)
            
            # 构建显示
            table = Table(title=f"系统监控 - {datetime.now().strftime('%H:%M:%S')}")
            table.add_column("指标", style="bold")
            table.add_column("值", justify="right")
            table.add_column("状态")
            
            # 设置状态颜色
            cpu_status = "[red]⚠️ 高[/red]" if cpu > alert_cpu else "[green]正常[/green]"
            mem_status = "[red]⚠️ 高[/red]" if mem.percent > alert_mem else "[green]正常[/green]"
            
            table.add_row("CPU", f"{cpu:.1f}%", cpu_status)
            table.add_row("内存", f"{mem.percent:.1f}%", mem_status)
            table.add_row("进程", str(len(procs)), "")
            
            # 清屏并打印表格
            console.clear()
            console.print(table)
            
            # 顶级进程
            console.print("\n[bold]顶级进程:[/bold]")
            for p in procs[:5]:
                cpu_style = "red" if (p['cpu_percent'] or 0) > 50 else ""
                console.print(f"  {p['pid']:>6}  {p['name']:<25} [{cpu_style}]{p['cpu_percent']:.1f}%[/]")
            
            # 警报
            if cpu > alert_cpu:
                console.print(f"\n[red bold]⚠️ CPU 警报: {cpu:.1f}% > {alert_cpu}%[/red bold]")
            if mem.percent > alert_mem:
                console.print(f"\n[red bold]⚠️ 内存警报: {mem.percent:.1f}% > {alert_mem}%[/red bold]")
            
            time.sleep(interval)
            
    except KeyboardInterrupt:
        console.print("\n[dim]监控已停止[/dim]")


if __name__ == "__main__":
    app()
