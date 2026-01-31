# /// script
# requires-python = ">=3.11"
# dependencies = ["click"]
# ///
"""通过 Pi Coding Agent 编排 AI 模型工作者。"""

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import click

DATA_DIR = Path(__file__).parent.parent / "data"
WORKERS_FILE = DATA_DIR / "workers.json"

PROVIDERS = {
    "glm": {"model": "glm-4.7", "env": "GLM_API_KEY"},
    "minimax": {"model": "MiniMax-M2.1", "env": "MINIMAX_API_KEY"},
    "openai": {"model": "gpt-4o", "env": "OPENAI_API_KEY"},
    "anthropic": {"model": "claude-sonnet-4-20250514", "env": "ANTHROPIC_API_KEY"},
}


def load_workers() -> dict:
    """加载工作者状态。"""
    if not WORKERS_FILE.exists():
        return {"workers": []}
    try:
        return json.loads(WORKERS_FILE.read_text())
    except (json.JSONDecodeError, IOError):
        return {"workers": []}


def save_workers(data: dict) -> None:
    """保存工作者状态。"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    WORKERS_FILE.write_text(json.dumps(data, indent=2))


def check_provider(provider: str) -> bool:
    """检查提供商是否已配置。"""
    if provider not in PROVIDERS:
        return False
    env_var = PROVIDERS[provider]["env"]
    return bool(os.environ.get(env_var))


@click.group()
def cli():
    """编排 AI 模型工作者。"""
    pass


@cli.command()
def providers():
    """列出可用的提供商及其状态。"""
    click.echo("可用的提供商:\n")
    for name, config in PROVIDERS.items():
        env_var = config["env"]
        configured = "✅" if os.environ.get(env_var) else "❌"
        click.echo(f"  {configured} {name:12} model={config['model']:20} env={env_var}")


@cli.command()
@click.option("--provider", "-p", default="glm", help="AI 提供商 (glm, minimax, openai, anthropic)")
@click.option("--model", "-m", help="覆盖模型名称")
@click.option("--task", "-t", required=True, help="任务描述")
@click.option("--session", "-s", help="tmux 会话名称（未提供则自动生成）")
@click.option("--background", "-b", is_flag=True, help="在后台 tmux 会话中运行")
def spawn(provider: str, model: str, task: str, session: str, background: bool):
    """生成带有任务的工作者。"""
    if provider not in PROVIDERS:
        click.echo(f"❌ 未知提供商: {provider}")
        click.echo(f"   可用: {', '.join(PROVIDERS.keys())}")
        sys.exit(1)
    
    if not check_provider(provider):
        env_var = PROVIDERS[provider]["env"]
        click.echo(f"❌ {provider} 未配置。请设置 {env_var}")
        sys.exit(1)
    
    model_name = model or PROVIDERS[provider]["model"]
    session_name = session or f"worker-{provider}-{datetime.now().strftime('%H%M%S')}"
    
    cmd = f'pi --provider {provider} --model {model_name} -p "{task}"'
    
    if background:
        # 创建 tmux 会话并运行命令
        subprocess.run(["tmux", "new-session", "-d", "-s", session_name], check=False)
        subprocess.run(["tmux", "send-keys", "-t", session_name, cmd, "Enter"], check=True)
        
        # 跟踪工作者
        data = load_workers()
        data["workers"].append({
            "session": session_name,
            "provider": provider,
            "model": model_name,
            "task": task[:100],
            "started": datetime.now().isoformat(),
            "status": "running",
        })
        save_workers(data)
        
        click.echo(f"✅ 在 tmux 会话中生成工作者: {session_name}")
        click.echo(f"   提供商: {provider} / {model_name}")
        click.echo(f"   任务: {task[:60]}...")
        click.echo(f"\n   检查: tmux attach -t {session_name}")
    else:
        # 直接运行
        click.echo(f"运行中: {cmd}\n")
        os.system(cmd)


@cli.command()
def status():
    """检查所有工作者的状态。"""
    data = load_workers()
    workers = data.get("workers", [])
    
    if not workers:
        click.echo("未生成工作者")
        return
    
    click.echo(f"工作者 ({len(workers)}):\n")
    
    for w in workers:
        session = w["session"]
        
        # 检查 tmux 会话是否存在
        result = subprocess.run(
            ["tmux", "has-session", "-t", session],
            capture_output=True
        )
        alive = result.returncode == 0
        status_icon = "🟢" if alive else "⚫"
        
        click.echo(f"  {status_icon} {session}")
        click.echo(f"     提供商: {w['provider']} / {w['model']}")
        click.echo(f"     任务: {w['task'][:50]}...")
        click.echo(f"     开始时间: {w['started'][:19]}")
        click.echo()


@cli.command()
@click.option("--session", "-s", help="从中收集的特定会话")
@click.option("--all", "collect_all", is_flag=True, help="从所有工作者收集")
@click.option("--output", "-o", help="输出文件")
def collect(session: str, collect_all: bool, output: str):
    """从工作者收集输出。"""
    data = load_workers()
    workers = data.get("workers", [])
    
    if session:
        sessions = [session]
    elif collect_all:
        sessions = [w["session"] for w in workers]
    else:
        click.echo("请指定 --session 或 --all")
        return
    
    results = []
    
    for sess in sessions:
        result = subprocess.run(
            ["tmux", "capture-pane", "-t", sess, "-p"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            results.append(f"=== {sess} ===\n{result.stdout}\n")
            click.echo(f"✅ 从 {sess} 收集")
        else:
            click.echo(f"❌ 从 {sess} 收集失败")
    
    if output:
        Path(output).write_text("\n".join(results))
        click.echo(f"\n已保存到 {output}")
    else:
        click.echo("\n" + "\n".join(results))


@cli.command()
@click.option("--session", "-s", help="要终止的特定会话")
@click.option("--all", "kill_all", is_flag=True, help="终止所有工作者")
def kill(session: str, kill_all: bool):
    """终止工作者会话。"""
    data = load_workers()
    workers = data.get("workers", [])
    
    if session:
        sessions = [session]
    elif kill_all:
        sessions = [w["session"] for w in workers]
    else:
        click.echo("请指定 --session 或 --all")
        return
    
    for sess in sessions:
        result = subprocess.run(["tmux", "kill-session", "-t", sess], capture_output=True)
        if result.returncode == 0:
            click.echo(f"✅ 已终止 {sess}")
        else:
            click.echo(f"⚠️  {sess} 未找到或已终止")
    
    # 清理工作者列表
    if kill_all:
        data["workers"] = []
    else:
        data["workers"] = [w for w in workers if w["session"] not in sessions]
    save_workers(data)


@cli.command()
@click.argument("tasks", nargs=-1, required=True)
@click.option("--provider", "-p", default="glm", help="AI 提供商")
@click.option("--model", "-m", help="模型名称")
def parallel(tasks: tuple, provider: str, model: str):
    """并行生成多个工作者。"""
    if not check_provider(provider):
        env_var = PROVIDERS[provider]["env"]
        click.echo(f"❌ {provider} 未配置。请设置 {env_var}")
        sys.exit(1)
    
    model_name = model or PROVIDERS[provider]["model"]
    
    click.echo(f"使用 {provider}/{model_name} 生成 {len(tasks)} 个工作者:\n")
    
    for i, task in enumerate(tasks, 1):
        session_name = f"parallel-{i}-{datetime.now().strftime('%H%M%S')}"
        cmd = f'pi --provider {provider} --model {model_name} -p "{task}"'
        
        subprocess.run(["tmux", "new-session", "-d", "-s", session_name], check=False)
        subprocess.run(["tmux", "send-keys", "-t", session_name, cmd, "Enter"], check=True)
        
        data = load_workers()
        data["workers"].append({
            "session": session_name,
            "provider": provider,
            "model": model_name,
            "task": task[:100],
            "started": datetime.now().isoformat(),
            "status": "running",
        })
        save_workers(data)
        
        click.echo(f"  ✅ 工作者 {i}: {session_name}")
        click.echo(f"     任务: {task[:50]}...")
    
    click.echo(f"\n使用 'orchestrate.py status' 检查进度")
    click.echo(f"使用 'orchestrate.py collect --all' 收集结果")


if __name__ == "__main__":
    cli()
