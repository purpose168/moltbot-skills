#!/usr/bin/env python3
"""
获取特定 W&B 运行的详细信息。

用法:
    python run_details.py ENTITY/PROJECT RUN_ID [--metrics KEY1,KEY2] [--json]

示例:
    python run_details.py myteam/training abc123
    python run_details.py myteam/training abc123 --metrics loss,accuracy
    python run_details.py myteam/training abc123 --json
"""

import argparse
import json

import wandb


def main():
    parser = argparse.ArgumentParser(description="获取 W&B 运行详情")
    parser.add_argument("path", help="实体/项目路径")
    parser.add_argument("run_id", help="运行 ID")
    parser.add_argument("--metrics", help="逗号分隔的指标键，用于获取历史记录")
    parser.add_argument("--json", action="store_true", help="以 JSON 格式输出")
    args = parser.parse_args()

    api = wandb.Api()
    
    try:
        run = api.run(f"{args.path}/{args.run_id}")
    except Exception as e:
        print(f"获取运行时出错: {e}")
        return 1

    result = {
        "id": run.id,
        "name": run.name,
        "state": run.state,
        "created_at": run.created_at,
        "updated_at": getattr(run, "updated_at", None),
        "url": run.url,
        "config": dict(run.config),
        "summary": dict(run.summary),
        "tags": run.tags,
    }
    
    # 如果请求了特定指标，获取其历史记录
    if args.metrics:
        keys = [k.strip() for k in args.metrics.split(",")]
        try:
            history = run.history(keys=keys)
            result["history"] = history.to_dict(orient="records") if not history.empty else []
        except Exception as e:
            result["history_error"] = str(e)

    if args.json:
        print(json.dumps(result, indent=2, default=str))
    else:
        status_icon = {"running": "🔄", "finished": "✅", "failed": "❌", "crashed": "💥", "canceled": "⏹️"}.get(run.state, "❓")
        print(f"{status_icon} {run.name}")
        print(f"   状态: {run.state}")
        print(f"   ID: {run.id}")
        print(f"   创建时间: {run.created_at}")
        print(f"   URL: {run.url}")
        print()
        
        if run.tags:
            print(f"   标签: {', '.join(run.tags)}")
            print()
        
        if run.config:
            print("   配置:")
            for k, v in list(run.config.items())[:10]:  # 限制显示 10 个
                print(f"      {k}: {v}")
            if len(run.config) > 10:
                print(f"      ... 还有 {len(run.config) - 10} 个")
            print()
        
        if run.summary:
            print("   摘要（最终指标）:")
            for k, v in list(run.summary.items())[:15]:  # 限制显示 15 个
                if not k.startswith("_"):
                    print(f"      {k}: {v}")
            print()

    return 0


if __name__ == "__main__":
    exit(main())
