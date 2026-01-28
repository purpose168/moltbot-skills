#!/usr/bin/env python3
"""
检查 W&B 训练运行状态。

用法:
    python check_runs.py ENTITY/PROJECT [--status STATUS] [--hours HOURS] [--json]

示例:
    python check_runs.py myteam/training --status failed --hours 24
    python check_runs.py myteam/training --status running
    python check_runs.py myteam/training --hours 48 --json
"""

import argparse
import json
from datetime import datetime, timedelta, timezone

import wandb


def main():
    parser = argparse.ArgumentParser(description="检查 W&B 训练运行状态")
    parser.add_argument("path", help="实体/项目路径")
    parser.add_argument("--status", choices=["running", "finished", "failed", "crashed", "canceled"],
                        help="按状态筛选")
    parser.add_argument("--hours", type=int, default=24, help="回溯查看的小时数（默认: 24）")
    parser.add_argument("--json", action="store_true", help="以 JSON 格式输出")
    args = parser.parse_args()

    api = wandb.Api()
    
    # 构建筛选条件
    filters = {}
    if args.status:
        filters["state"] = args.status
    
    cutoff = datetime.now(timezone.utc) - timedelta(hours=args.hours)
    
    try:
        runs = api.runs(args.path, filters=filters if filters else None)
    except Exception as e:
        print(f"获取运行时出错: {e}")
        return 1

    results = []
    for run in runs:
        created = datetime.fromisoformat(run.created_at.replace("Z", "+00:00"))
        if created < cutoff:
            continue
            
        results.append({
            "id": run.id,
            "name": run.name,
            "state": run.state,
            "created_at": run.created_at,
            "url": run.url,
        })

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        if not results:
            status_msg = f" with status={args.status}" if args.status else ""
            print(f"在过去 {args.hours} 小时内未找到符合条件的运行{status_msg}")
        else:
            print(f"在过去 {args.hours} 小时内找到 {len(results)} 个运行:\n")
            for r in results:
                status_icon = {"running": "🔄", "finished": "✅", "failed": "❌", "crashed": "💥", "canceled": "⏹️"}.get(r["state"], "❓")
                print(f"  {status_icon} {r['name']} ({r['state']})")
                print(f"     ID: {r['id']}")
                print(f"     创建时间: {r['created_at']}")
                print()

    # 退出码：如果有任何失败/崩溃的运行，返回 1
    failed_count = sum(1 for r in results if r["state"] in ("failed", "crashed"))
    return 1 if failed_count > 0 else 0


if __name__ == "__main__":
    exit(main())
