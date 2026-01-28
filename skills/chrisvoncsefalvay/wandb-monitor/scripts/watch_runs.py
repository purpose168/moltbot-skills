#!/usr/bin/env python3
"""
监控所有正在运行的 W&B 作业，并提供快速健康摘要。

用法:
    watch_runs.py ENTITY [--projects PROJECT1,PROJECT2,...]
    watch_runs.py ENTITY --all-projects
    watch_runs.py  # 使用配置中的默认实体

专为早晨简报和定期监控设计。
"""

import argparse
import sys
from datetime import datetime, timezone
from typing import Optional

import wandb


def get_metric(row: dict, *keys: str) -> Optional[float]:
    """从可能的键名中获取第一个可用的指标值。"""
    for key in keys:
        if key in row and row[key] is not None:
            return row[key]
    return None


def quick_health_check(run) -> dict:
    """快速健康评估，无需完整历史记录扫描。"""
    result = {
        "run_id": run.id,
        "name": run.name,
        "project": run.project,
        "state": run.state,
        "issues": [],
        "status": "healthy",
    }
    
    # 运行时间
    summary = run.summary._json_dict
    runtime = summary.get("_runtime", 0)
    result["runtime_hours"] = runtime / 3600
    
    # 心跳检查
    if run.heartbeat_at:
        hb = datetime.fromisoformat(run.heartbeat_at.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        mins_since = (now - hb).total_seconds() / 60
        result["heartbeat_mins"] = mins_since
        if mins_since > 30:
            result["issues"].append(f"停滞（{mins_since:.0f}分钟无心跳）")
            result["status"] = "critical"
        elif mins_since > 10:
            result["issues"].append(f"心跳缓慢（{mins_since:.1f}分钟）")
            result["status"] = "warning"
    
    # 从摘要中获取损失值
    loss = get_metric(summary, "train/loss", "loss", "train_loss")
    if loss is not None:
        result["loss"] = loss
    
    # 从摘要中获取梯度范数
    grad = get_metric(summary, "train/grad_norm", "grad_norm")
    if grad is not None:
        result["grad_norm"] = grad
        if grad > 10:
            result["issues"].append(f"梯度爆炸（{grad:.2f}）")
            result["status"] = "critical" if result["status"] != "critical" else result["status"]
        elif grad > 5:
            result["issues"].append(f"梯度过高（{grad:.2f}）")
            if result["status"] == "healthy":
                result["status"] = "warning"
    
    # 进度
    epoch = get_metric(summary, "train/epoch", "epoch")
    step = get_metric(summary, "train/global_step", "global_step", "step")
    if epoch is not None:
        result["epoch"] = epoch
    if step is not None:
        result["step"] = int(step)
    
    # 配置上下文
    config = run.config
    total_epochs = config.get("num_train_epochs", config.get("num_epochs"))
    if total_epochs and epoch:
        result["progress_pct"] = (epoch / total_epochs) * 100
    
    return result


def get_running_runs(api, entity: str, projects: Optional[list[str]] = None) -> list:
    """获取指定项目中所有正在运行的运行。"""
    running = []
    
    if projects:
        project_list = projects
    else:
        # 获取实体的所有项目
        try:
            project_list = [p.name for p in api.projects(entity)]
        except Exception:
            project_list = []
    
    for project in project_list:
        try:
            runs = api.runs(f"{entity}/{project}", {"state": "running"}, per_page=20)
            running.extend(list(runs))
        except Exception:
            pass  # 项目可能不存在或无访问权限
    
    return running


def get_recent_finished(api, entity: str, projects: Optional[list[str]] = None, hours: int = 24) -> list:
    """获取最近完成/失败的运行。"""
    from datetime import timedelta
    
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    cutoff_str = cutoff.strftime("%Y-%m-%dT%H:%M:%S")
    
    finished = []
    
    if projects:
        project_list = projects
    else:
        try:
            project_list = [p.name for p in api.projects(entity)]
        except Exception:
            project_list = []
    
    for project in project_list:
        try:
            # 获取已完成的运行
            runs = api.runs(f"{entity}/{project}", {
                "$and": [
                    {"state": {"$in": ["finished", "failed", "crashed"]}},
                    {"created_at": {"$gt": cutoff_str}}
                ]
            }, per_page=10)
            finished.extend(list(runs))
        except Exception:
            pass
    
    return finished


def print_report(running: list, recent: list, entity: str):
    """打印监控报告。"""
    print(f"\n{'='*70}")
    print(f"🔭 W&B 监控 - {entity}")
    print(f"{'='*70}")
    
    # 正在运行的作业
    print(f"\n🟢 正在运行 ({len(running)})")
    print("-" * 70)
    
    if not running:
        print("   当前没有正在运行的作业")
    else:
        for run in running:
            health = quick_health_check(run)
            
            # 状态表情符号
            status_emoji = {"healthy": "✅", "warning": "⚠️", "critical": "🚨"}
            emoji = status_emoji.get(health["status"], "❓")
            
            # 进度字符串
            progress = ""
            if "progress_pct" in health:
                progress = f" ({health['progress_pct']:.0f}%)"
            elif "epoch" in health:
                progress = f" (轮次 {health['epoch']:.2f})"
            elif "step" in health:
                progress = f" (步数 {health['step']})"
            
            # 损失值字符串
            loss_str = f" 损失={health['loss']:.4f}" if "loss" in health else ""
            
            print(f"   {emoji} {health['project']}/{health['name']}{progress}{loss_str}")
            print(f"      运行时间: {health['runtime_hours']:.1f}h | ID: {health['run_id']}")
            
            if health["issues"]:
                for issue in health["issues"]:
                    print(f"      ⚠️ {issue}")
            print()
    
    # 最近完成/失败
    failed = [r for r in recent if r.state in ("failed", "crashed")]
    finished = [r for r in recent if r.state == "finished"]
    
    if failed:
        print(f"\n🔴 失败/崩溃（最近24小时）: {len(failed)}")
        print("-" * 70)
        for run in failed[:5]:
            print(f"   💀 {run.project}/{run.name} ({run.state})")
            print(f"      ID: {run.id} | 创建时间: {run.created_at}")
    
    if finished:
        print(f"\n✅ 已完成（最近24小时）: {len(finished)}")
        print("-" * 70)
        for run in finished[:5]:
            summary = run.summary._json_dict
            loss = get_metric(summary, "train/loss", "loss", "eval/loss")
            loss_str = f" | 最终损失: {loss:.4f}" if loss else ""
            print(f"   ✓ {run.project}/{run.name}{loss_str}")
    
    print(f"\n{'='*70}\n")


def main():
    parser = argparse.ArgumentParser(description="监控 W&B 训练运行")
    parser.add_argument("entity", nargs="?", default="chrisvoncsefalvay", help="W&B 实体（用户名/组织）")
    parser.add_argument("--projects", "-p", help="逗号分隔的项目名称")
    parser.add_argument("--all-projects", "-a", action="store_true", help="检查所有项目")
    parser.add_argument("--hours", type=int, default=24, help="回溯查看已完成运行的小时数")
    parser.add_argument("--json", action="store_true", help="以 JSON 格式输出")
    args = parser.parse_args()
    
    api = wandb.Api()
    
    projects = None
    if args.projects:
        projects = [p.strip() for p in args.projects.split(",")]
    elif not args.all_projects:
        # 默认要检查的项目
        projects = ["med_school_llama", "llamafactory", "grpo-clinical-reasoning", "dx-reasoning-qwen", "usmle-reasoning"]
    
    running = get_running_runs(api, args.entity, projects)
    recent = get_recent_finished(api, args.entity, projects, args.hours)
    
    if args.json:
        import json
        output = {
            "entity": args.entity,
            "running": [quick_health_check(r) for r in running],
            "recent_failed": [{"id": r.id, "name": r.name, "project": r.project, "state": r.state} 
                            for r in recent if r.state in ("failed", "crashed")],
            "recent_finished": [{"id": r.id, "name": r.name, "project": r.project} 
                               for r in recent if r.state == "finished"],
        }
        print(json.dumps(output, indent=2, default=str))
    else:
        print_report(running, recent, args.entity)


if __name__ == "__main__":
    main()
