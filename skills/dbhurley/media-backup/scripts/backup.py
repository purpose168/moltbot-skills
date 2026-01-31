# /// script
# requires-python = ">=3.11"
# dependencies = ["click>=8.0.0"]
# ///
"""将 Clawdbot 媒体备份到本地文件夹（由 Dropbox/iCloud 等同步）。"""

import os
import sys
import json
import hashlib
import shutil
from pathlib import Path
from datetime import datetime

import click

# 默认值
DEFAULT_SOURCE = Path.home() / ".clawdbot" / "media" / "inbound"
DEFAULT_DEST = Path.home() / "Dropbox" / "Clawdbot" / "media"
STATE_FILE = Path.home() / ".clawdbot" / "media" / "backup-state.json"

MEDIA_EXTENSIONS = {
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic',
    '.mp4', '.mov', '.m4v', '.webm'
}


def get_dest_path() -> Path:
    """从环境变量获取目标路径或使用默认值。"""
    env_dest = os.environ.get("MEDIA_BACKUP_DEST")
    if env_dest:
        return Path(env_dest).expanduser()
    return DEFAULT_DEST


def load_state() -> set:
    """加载已存档文件哈希的集合。"""
    if STATE_FILE.exists():
        try:
            return set(json.loads(STATE_FILE.read_text()))
        except:
            return set()
    return set()


def save_state(hashes: set):
    """保存已存档文件的哈希值。"""
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(list(hashes)))


def file_hash(path: Path) -> str:
    """获取文件内容的 MD5 哈希值。"""
    return hashlib.md5(path.read_bytes()).hexdigest()


@click.group(invoke_without_command=True)
@click.option("--source", "-s", type=click.Path(exists=True), help="源目录")
@click.option("--dest", "-d", type=click.Path(), help="目标目录")
@click.option("--dry-run", is_flag=True, help="仅预览，不复制")
@click.pass_context
def cli(ctx, source, dest, dry_run):
    """将 Clawdbot 媒体备份到本地文件夹。"""
    if ctx.invoked_subcommand is None:
        # 默认操作：运行备份
        run_backup(source, dest, dry_run)


def run_backup(source, dest, dry_run):
    """运行备份。"""
    source_path = Path(source) if source else DEFAULT_SOURCE
    dest_path = Path(dest) if dest else get_dest_path()
    
    if not source_path.exists():
        click.echo(f"源目录不存在: {source_path}", err=True)
        sys.exit(1)
    
    # 加载状态
    archived = load_state()
    
    # 统计
    copied = 0
    skipped = 0
    errors = 0
    
    # 处理文件
    for file in source_path.iterdir():
        if not file.is_file():
            continue
        
        # 检查扩展名
        if file.suffix.lower() not in MEDIA_EXTENSIONS:
            continue
        
        # 检查是否已存档
        fhash = file_hash(file)
        if fhash in archived:
            skipped += 1
            continue
        
        # 从文件修改时间获取日期文件夹
        mtime = datetime.fromtimestamp(file.stat().st_mtime)
        date_folder = mtime.strftime("%Y-%m-%d")
        
        # 目标路径
        dest_dir = dest_path / date_folder
        dest_file = dest_dir / file.name
        
        if dry_run:
            click.echo(f"将复制: {file.name} → {dest_dir}/")
            copied += 1
            continue
        
        try:
            dest_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(file, dest_file)
            archived.add(fhash)
            copied += 1
            click.echo(f"✓ {file.name} → {date_folder}/")
        except Exception as e:
            click.echo(f"✗ {file.name}: {e}", err=True)
            errors += 1
    
    # 保存状态
    if not dry_run and copied > 0:
        save_state(archived)
    
    # 摘要
    click.echo(f"\n📸 已复制: {copied}, 已跳过: {skipped}, 错误: {errors}")
    
    if dry_run:
        click.echo(f"目标: {dest_path}")


@cli.command()
def status():
    """显示备份状态。"""
    source_path = DEFAULT_SOURCE
    dest_path = get_dest_path()
    archived = load_state()
    
    click.echo(f"📂 源: {source_path}")
    click.echo(f"📁 目标: {dest_path}")
    click.echo(f"✓ 已存档: {len(archived)} 个文件")
    
    # 计算待处理文件数
    if source_path.exists():
        pending = 0
        for file in source_path.iterdir():
            if file.is_file() and file.suffix.lower() in MEDIA_EXTENSIONS:
                if file_hash(file) not in archived:
                    pending += 1
        click.echo(f"⏳ 待处理: {pending} 个文件")
    
    # 检查目标是否存在
    if dest_path.exists():
        click.echo(f"🔗 目标存在: ✓")
    else:
        click.echo(f"🔗 目标存在: ✗ (将被创建)")


@cli.command()
def reset():
    """重置备份状态（重新存档所有文件）。"""
    if STATE_FILE.exists():
        STATE_FILE.unlink()
        click.echo("✓ 状态已重置。下次备份将重新处理所有文件。")
    else:
        click.echo("未找到状态文件。")


if __name__ == "__main__":
    cli()
