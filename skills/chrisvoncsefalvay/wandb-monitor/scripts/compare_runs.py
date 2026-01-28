#!/usr/bin/env python3
"""
比较两个 W&B 训练运行（并排对比）。

用法:
    compare_runs.py ENTITY/PROJECT/RUN_A ENTITY/PROJECT/RUN_B
    compare_runs.py RUN_A RUN_B --project PROJECT [--entity ENTITY]

比较内容:
    - 配置差异
    - 相同步数的损失曲线
    - 最终指标
    - 性能（token/秒，运行时间）
"""

import argparse
import sys
from typing import Optional

import wandb


def get_metric(data: dict, *keys: str) -> Optional[float]:
    """从可能的键名中获取第一个可用的指标值。"""
    for key in keys:
        if key in data and data[key] is not None:
            return data[key]
    return None


def parse_run_path(path: str, default_project: str = None, default_entity: str = None) -> tuple[str, str, str]:
    """将运行路径解析为（实体，项目，运行ID）。"""
    parts = path.split("/")
    if len(parts) == 3:
        return parts[0], parts[1], parts[2]
    elif len(parts) == 2:
        return default_entity, parts[0], parts[1]
    elif len(parts) == 1:
        return default_entity, default_project, parts[0]
    else:
        raise ValueError(f"无效的运行路径: {path}")


def get_loss_at_steps(history: list[dict], steps: list[int]) -> dict[int, float]:
    """获取特定步数处的损失值。"""
    result = {}
    step_key = None
    loss_key = None
    
    # 找到正确的键名
    if history:
        row = history[0]
        for k in ["_step", "step", "global_step", "train/global_step"]:
            if k in row:
                step_key = k
                break
        for k in ["train/loss", "loss", "train_loss"]:
            if k in row:
                loss_key = k
                break
    
    if not step_key or not loss_key:
        return result
    
    # 构建步数 -> 损失映射
    step_loss = {}
    for row in history:
        s = row.get(step_key)
        l = row.get(loss_key)
        if s is not None and l is not None:
            step_loss[int(s)] = l
    
    # 为每个目标步数找到最近的步数
    for target in steps:
        if target in step_loss:
            result[target] = step_loss[target]
        else:
            # 找到最近的
            closest = min(step_loss.keys(), key=lambda x: abs(x - target), default=None)
            if closest and abs(closest - target) < target * 0.1:  # 在 10% 范围内
                result[target] = step_loss[closest]
    
    return result


def compare_configs(config_a: dict, config_b: dict) -> dict:
    """比较两个配置并返回差异。"""
    all_keys = set(config_a.keys()) | set(config_b.keys())
    
    需要重点突出的重要配置键
    important = {
        "learning_rate", "lr", "num_train_epochs", "num_epochs", "max_steps",
        "per_device_train_batch_size", "batch_size", "gradient_accumulation_steps",
        "warmup_steps", "warmup_ratio", "weight_decay", "adam_epsilon",
        "model_name", "model_name_or_path", "base_model",
        "lora_r", "lora_alpha", "lora_dropout",
        "max_seq_length", "max_length",
    }
    
    same = {}
    different = {}
    only_a = {}
    only_b = {}
    
    for key in all_keys:
        in_a = key in config_a
        in_b = key in config_b
        
        if in_a and in_b:
            if config_a[key] == config_b[key]:
                if key in important:
                    same[key] = config_a[key]
            else:
                different[key] = {"a": config_a[key], "b": config_b[key]}
        elif in_a:
            if key in important:
                only_a[key] = config_a[key]
        else:
            if key in important:
                only_b[key] = config_b[key]
    
    return {
        "same": same,
        "different": different,
        "only_a": only_a,
        "only_b": only_b,
    }


def print_comparison(run_a, run_b, history_a: list, history_b: list, config_diff: dict):
    """打印并排对比报告。"""
    print(f"\n{'='*70}")
    print("🔬 运行对比")
    print(f"{'='*70}")
    
    # 基本信息
    print(f"\n{'运行 A':<35} {'运行 B':<35}")
    print(f"{'-'*35} {'-'*35}")
    print(f"{run_a.project}/{run_a.name:<25} {run_b.project}/{run_b.name:<25}")
    print(f"ID: {run_a.id:<29} ID: {run_b.id:<29}")
    print(f"状态: {run_a.state:<27} 状态: {run_b.state:<27}")
    
    # 运行时间
    summary_a = run_a.summary._json_dict
    summary_b = run_b.summary._json_dict
    runtime_a = summary_a.get("_runtime", 0) / 3600
    runtime_b = summary_b.get("_runtime", 0) / 3600
    print(f"运行时间: {runtime_a:<24.2f}h 运行时间: {runtime_b:<24.2f}h")
    
    # 配置差异
    print(f"\n⚙️ 配置差异")
    print("-" * 70)
    if config_diff["different"]:
        for key, vals in config_diff["different"].items():
            print(f"   {key}:")
            print(f"      A: {vals['a']}")
            print(f"      B: {vals['b']}")
    else:
        print("   关键配置值无差异")
    
    if config_diff["only_a"]:
        print(f"\n   仅在 A 中: {config_diff['only_a']}")
    if config_diff["only_b"]:
        print(f"\n   仅在 B 中: {config_diff['only_b']}")
    
    # 损失对比
    print(f"\n📉 损失对比")
    print("-" * 70)
    
    # 获取各步数的损失值
    loss_a = [get_metric(r, "train/loss", "loss") for r in history_a if get_metric(r, "train/loss", "loss")]
    loss_b = [get_metric(r, "train/loss", "loss") for r in history_b if get_metric(r, "train/loss", "loss")]
    
    if loss_a and loss_b:
        print(f"   {'指标':<20} {'运行 A':<20} {'运行 B':<20} {'胜者':<10}")
        print(f"   {'-'*20} {'-'*20} {'-'*20} {'-'*10}")
        
        # 初始损失
        winner = "A" if loss_a[0] < loss_b[0] else "B" if loss_b[0] < loss_a[0] else "平局"
        print(f"   {'初始损失':<20} {loss_a[0]:<20.4f} {loss_b[0]:<20.4f} {winner:<10}")
        
        # 当前/最终损失
        winner = "A ✓" if loss_a[-1] < loss_b[-1] else "B ✓" if loss_b[-1] < loss_a[-1] else "平局"
        print(f"   {'当前损失':<20} {loss_a[-1]:<20.4f} {loss_b[-1]:<20.4f} {winner:<10}")
        
        # 最小损失
        min_a, min_b = min(loss_a), min(loss_b)
        winner = "A ✓" if min_a < min_b else "B ✓" if min_b < min_a else "平局"
        print(f"   {'最小损失':<20} {min_a:<20.4f} {min_b:<20.4f} {winner:<10}")
        
        # 改进百分比
        imp_a = (1 - loss_a[-1] / loss_a[0]) * 100 if loss_a[0] > 0 else 0
        imp_b = (1 - loss_b[-1] / loss_b[0]) * 100 if loss_b[0] > 0 else 0
        winner = "A ✓" if imp_a > imp_b else "B ✓" if imp_b > imp_a else "平局"
        print(f"   {'改进 %':<20} {imp_a:<20.1f} {imp_b:<20.1f} {winner:<10}")
    else:
        print("   损失数据不足，无法对比")
    
    # 梯度范数对比
    print(f"\n📊 梯度范数")
    print("-" * 70)
    grads_a = [get_metric(r, "train/grad_norm", "grad_norm") for r in history_a if get_metric(r, "train/grad_norm", "grad_norm")]
    grads_b = [get_metric(r, "train/grad_norm", "grad_norm") for r in history_b if get_metric(r, "train/grad_norm", "grad_norm")]
    
    if grads_a and grads_b:
        mean_a = sum(grads_a) / len(grads_a)
        mean_b = sum(grads_b) / len(grads_b)
        print(f"   平均值: {mean_a:.4f} (A) vs {mean_b:.4f} (B)")
        print(f"   最大值: {max(grads_a):.4f} (A) vs {max(grads_b):.4f} (B)")
    
    # 评估指标
    print(f"\n🎯 评估指标")
    print("-" * 70)
    eval_loss_a = get_metric(summary_a, "eval/loss", "eval_loss")
    eval_loss_b = get_metric(summary_b, "eval/loss", "eval_loss")
    eval_acc_a = get_metric(summary_a, "eval/accuracy", "eval_acc", "accuracy")
    eval_acc_b = get_metric(summary_b, "eval/accuracy", "eval_acc", "accuracy")
    
    if eval_loss_a or eval_loss_b:
        print(f"   评估损失: {eval_loss_a or 'N/A'} (A) vs {eval_loss_b or 'N/A'} (B)")
    if eval_acc_a or eval_acc_b:
        print(f"   评估准确率: {eval_acc_a or 'N/A'} (A) vs {eval_acc_b or 'N/A'} (B)")
    if not eval_loss_a and not eval_loss_b and not eval_acc_a and not eval_acc_b:
        print("   无评估指标数据")
    
    # 性能
    print(f"\n⚡ 性能")
    print("-" * 70)
    tps_a = get_metric(summary_a, "train/train_tokens_per_second", "tokens_per_second")
    tps_b = get_metric(summary_b, "train/train_tokens_per_second", "tokens_per_second")
    if tps_a or tps_b:
        print(f"   Token/秒: {tps_a or 'N/A'} (A) vs {tps_b or 'N/A'} (B)")
    
    steps_a = get_metric(summary_a, "train/global_step", "global_step", "_step")
    steps_b = get_metric(summary_b, "train/global_step", "global_step", "_step")
    if steps_a and steps_b and runtime_a > 0 and runtime_b > 0:
        sph_a = steps_a / runtime_a
        sph_b = steps_b / runtime_b
        print(f"   步数/小时: {sph_a:.1f} (A) vs {sph_b:.1f} (B)")
    
    # 结论
    print(f"\n{'='*70}")
    print("📋 结论")
    print("-" * 70)
    
    if loss_a and loss_b:
        if loss_a[-1] < loss_b[-1]:
            diff = ((loss_b[-1] - loss_a[-1]) / loss_b[-1]) * 100
            print(f"   🏆 运行 A 的损失低 {diff:.1f}%")
        elif loss_b[-1] < loss_a[-1]:
            diff = ((loss_a[-1] - loss_b[-1]) / loss_a[-1]) * 100
            print(f"   🏆 运行 B 的损失低 {diff:.1f}%")
        else:
            print("   🤝 两个运行表现相似")
    
    print(f"{'='*70}\n")


def main():
    parser = argparse.ArgumentParser(description="比较两个 W&B 训练运行")
    parser.add_argument("run_a", help="第一个运行的路径")
    parser.add_argument("run_b", help="第二个运行的路径")
    parser.add_argument("--project", "-p", help="默认项目")
    parser.add_argument("--entity", "-e", help="默认实体")
    parser.add_argument("--json", action="store_true", help="以 JSON 格式输出")
    args = parser.parse_args()
    
    api = wandb.Api()
    
    # 解析运行路径
    try:
        entity_a, project_a, run_id_a = parse_run_path(args.run_a, args.project, args.entity)
        entity_b, project_b, run_id_b = parse_b, args.project_run_path(args.run, args.entity)
    except ValueError as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)
    
    # 构建路径
    path_a = f"{entity_a}/{project_a}/{run_id_a}" if entity_a else f"{project_a}/{run_id_a}"
    path_b = f"{entity_b}/{project_b}/{run_id_b}" if entity_b else f"{project_b}/{run_id_b}"
    
    # 获取运行数据
    try:
        run_a = api.run(path_a)
        run_b = api.run(path_b)
    except wandb.errors.CommError as e:
        print(f"获取运行时出错: {e}", file=sys.stderr)
        sys.exit(1)
    
    # 获取历史记录
    history_a = list(run_a.scan_history())
    history_b = list(run_b.scan_history())
    
    # 比较配置
    config_diff = compare_configs(run_a.config, run_b.config)
    
    if args.json:
        import json
        output = {
            "run_a": {"id": run_a.id, "name": run_a.name, "project": run_a.project, "state": run_a.state},
            "run_b": {"id": run_b.id, "name": run_b.name, "project": run_b.project, "state": run_b.state},
            "config_diff": config_diff,
        }
        print(json.dumps(output, indent=2, default=str))
    else:
        print_comparison(run_a, run_b, history_a, history_b, config_diff)


if __name__ == "__main__":
    main()
