#!/usr/bin/env python3
"""
特征化 W&B 训练运行。

对 W&B 训练运行进行全面的健康分析和特征提取。

用法:
    characterize_run.py ENTITY/PROJECT/RUN_ID
    characterize_run.py PROJECT/RUN_ID          # 使用默认实体
    characterize_run.py RUN_ID --project PROJECT [--entity ENTITY]

分析内容:
    - 损失曲线趋势分析
    - 梯度范数健康检查
    - 评估指标提取（如果存在）
    - 系统指标（GPU 温度/利用率）
    - 停滞检测
    - 进度估计
"""

import argparse
import sys
from datetime import datetime, timezone
from typing import Optional

import wandb


def get_metric(row: dict, *keys: str) -> Optional[float]:
    """
    从可能的键名列表中获取第一个可用的指标值。
    
    参数:
        row: 包含指标数据的字典
        keys: 要尝试的键名列表，按优先级排序
    
    返回:
        找到的指标值，如果都未找到则返回 None
    """
    for key in keys:
        if key in row and row[key] is not None:
            return row[key]
    return None


def analyze_loss(history: list[dict]) -> dict:
    """
    分析训练历史中的损失曲线。
    
    参数:
        history: 包含训练历史记录的字典列表
    
    返回:
        包含损失分析结果的字典，包括：
        - status: 分析状态 ("ok" 或 "no_data")
        - count: 损失值数量
        - start: 初始损失值
        - current: 当前损失值
        - min/max: 最小/最大损失值
        - pct_change: 百分比变化
        - decreasing: 是否在下降
        - recent: 最近 10 个损失值
    """
    losses = []
    for row in history:
        loss = get_metric(row, "train/loss", "loss", "train_loss", "training_loss")
        if loss is not None:
            losses.append(loss)
    
    if not losses:
        return {"status": "no_data"}
    
    result = {
        "status": "ok",
        "count": len(losses),
        "start": losses[0],
        "current": losses[-1],
        "min": min(losses),
        "max": max(losses),
    }
    
    # 趋势分析
    if len(losses) >= 10:
        first_10 = sum(losses[:10]) / 10
        last_10 = sum(losses[-10:]) / 10
        result["avg_first_10"] = first_10
        result["avg_last_10"] = last_10
        result["pct_change"] = ((last_10 - first_10) / first_10) * 100
        result["decreasing"] = last_10 < first_10
    elif len(losses) >= 2:
        result["pct_change"] = ((losses[-1] - losses[0]) / losses[0]) * 100
        result["decreasing"] = losses[-1] < losses[0]
    
    result["recent"] = losses[-10:] if len(losses) >= 10 else losses
    
    return result


def analyze_gradients(history: list[dict]) -> dict:
    """
    分析梯度范数以检测健康问题。
    
    参数:
        history: 包含训练历史记录的字典列表
    
    返回:
        包含梯度分析结果的字典，包括：
        - status: 分析状态
        - count: 梯度样本数量
        - mean/min/max/current: 梯度统计值
        - health: 健康状态 ("healthy", "exploding", "spiky", "vanishing")
        - health_msg: 健康状态描述消息
    """
    grads = []
    for row in history:
        grad = get_metric(row, "train/grad_norm", "grad_norm", "gradient_norm")
        if grad is not None:
            grads.append(grad)
    
    if not grads:
        return {"status": "no_data"}
    
    result = {
        "status": "ok",
        "count": len(grads),
        "mean": sum(grads) / len(grads),
        "min": min(grads),
        "max": max(grads),
        "current": grads[-1],
    }
    
    # 健康检查
    if max(grads) > 10:
        result["health"] = "exploding"
        result["health_msg"] = f"⚠️ 爆炸 - 最大梯度范数 {max(grads):.2f} > 10"
    elif max(grads) > 5:
        result["health"] = "spiky"
        result["health_msg"] = f"⚠️ 波动 - 最大梯度范数 {max(grads):.2f}，可能存在不稳定性"
    elif result["mean"] < 0.0001:
        result["health"] = "vanishing"
        result["health_msg"] = f"⚠️ 消失 - 平均梯度范数 {result['mean']:.6f}"
    else:
        result["health"] = "healthy"
        result["health_msg"] = f"✅ 健康（范围 {min(grads):.4f} - {max(grads):.4f}）"
    
    return result


def analyze_evals(history: list[dict]) -> dict:
    """
    提取评估指标（如果存在）。
    
    参数:
        history: 包含训练历史记录的字典列表
    
    返回:
        包含评估指标分析结果的字典，包括：
        - status: 分析状态
        - loss: 损失指标（current, best, count, recent）
        - accuracy: 准确率指标（current, best, count, recent）
    """
    eval_losses = []
    eval_accs = []
    
    for row in history:
        eval_loss = get_metric(row, "eval/loss", "eval_loss", "validation_loss", "val_loss")
        eval_acc = get_metric(row, "eval/accuracy", "eval_accuracy", "eval/acc", "accuracy")
        if eval_loss is not None:
            eval_losses.append(eval_loss)
        if eval_acc is not None:
            eval_accs.append(eval_acc)
    
    if not eval_losses and not eval_accs:
        return {"status": "no_data"}
    
    result = {"status": "ok"}
    
    if eval_losses:
        result["loss"] = {
            "count": len(eval_losses),
            "current": eval_losses[-1],
            "best": min(eval_losses),
            "recent": eval_losses[-5:] if len(eval_losses) >= 5 else eval_losses,
        }
    
    if eval_accs:
        result["accuracy"] = {
            "count": len(eval_accs),
            "current": eval_accs[-1],
            "best": max(eval_accs),
            "recent": eval_accs[-5:] if len(eval_accs) >= 5 else eval_accs,
        }
    
    return result


def check_stall(run) -> dict:
    """
    检查运行是否停滞。
    
    参数:
        run: W&B 运行对象
    
    返回:
        包含停滞检查结果的字典，包括：
        - status: 状态 ("ok", "stalled", "warning", "unknown")
        - heartbeat_at: 心跳记录时间
        - mins_since: 距离上次心跳的分钟数
        - msg: 状态描述消息
    """
    if not run.heartbeat_at:
        return {"status": "unknown", "msg": "无心跳记录"}
    
    hb = datetime.fromisoformat(run.heartbeat_at.replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    mins_since = (now - hb).total_seconds() / 60
    
    result = {
        "status": "ok",
        "heartbeat_at": run.heartbeat_at,
        "mins_since": mins_since,
    }
    
    if mins_since > 30:
        result["status"] = "stalled"
        result["msg"] = f"🚨 停滞 - {mins_since:.0f} 分钟无心跳"
    elif mins_since > 10:
        result["status"] = "warning"
        result["msg"] = f"⚠️ 心跳缓慢 - {mins_since:.1f} 分钟前"
    else:
        result["msg"] = f"✅ 活跃（{mins_since:.1f}分钟前心跳）"
    
    return result


def get_progress(run, history: list[dict]) -> dict:
    """
    获取训练进度并估计完成时间。
    
    参数:
        run: W&B 运行对象
        history: 包含训练历史记录的字典列表
    
    返回:
        包含进度信息的字典，包括：
        - epoch/step: 当前轮次/步数
        - runtime_hours: 运行时间（小时）
        - total_epochs/max_steps: 总轮次/最大步数
        - epoch_progress_pct/step_progress_pct: 进度百分比
        - est_total_hours/est_remaining_hours: 预计总时间/剩余时间
    """
    result = {}
    
    # 从历史记录或摘要获取轮次/步数
    summary = run.summary._json_dict
    
    epoch = get_metric(summary, "train/epoch", "epoch")
    step = get_metric(summary, "train/global_step", "global_step", "step", "_step")
    
    if epoch is not None:
        result["epoch"] = epoch
    if step is not None:
        result["step"] = int(step)
    
    # 运行时间
    runtime = summary.get("_runtime", 0)
    result["runtime_hours"] = runtime / 3600
    
    # 尝试估计完成时间
    config = run.config
    total_epochs = config.get("num_train_epochs", config.get("num_epochs"))
    max_steps = config.get("max_steps", -1)
    
    if total_epochs and epoch:
        result["total_epochs"] = total_epochs
        result["epoch_progress_pct"] = (epoch / total_epochs) * 100
        if epoch > 0:
            est_total_hours = (runtime / 3600) / (epoch / total_epochs)
            result["est_total_hours"] = est_total_hours
            result["est_remaining_hours"] = est_total_hours - (runtime / 3600)
    
    if max_steps > 0 and step:
        result["max_steps"] = max_steps
        result["step_progress_pct"] = (step / max_steps) * 100
    
    return result


def print_report(run, loss: dict, grads: dict, evals: dict, stall: dict, progress: dict):
    """
    打印完整的特征化报告。
    
    参数:
        run: W&B 运行对象
        loss: 损失分析结果
        grads: 梯度分析结果
        evals: 评估指标分析结果
        stall: 停滞检查结果
        progress: 进度信息
    """
    state_emoji = {"running": "🟢", "finished": "✅", "failed": "🔴", "crashed": "💀", "canceled": "⏹️"}
    
    print(f"\n{'='*70}")
    print(f"{state_emoji.get(run.state, '❓')} {run.project}/{run.name}")
    print(f"{'='*70}")
    print(f"   状态: {run.state.upper()}")
    print(f"   ID: {run.id}")
    print(f"   开始时间: {run.created_at}")
    
    # 停滞检查
    print(f"\n🔄 心跳")
    print(f"   {stall['msg']}")
    
    # 进度
    print(f"\n⏱️ 进度")
    print(f"   运行时间: {progress.get('runtime_hours', 0):.2f}小时")
    if "epoch" in progress:
        epoch_str = f"轮次: {progress['epoch']:.2f}"
        if "total_epochs" in progress:
            epoch_str += f" / {progress['total_epochs']} ({progress['epoch_progress_pct']:.1f}%)"
        print(f"   {epoch_str}")
    if "step" in progress:
        step_str = f"步数: {progress['step']}"
        if "max_steps" in progress:
            step_str += f" / {progress['max_steps']} ({progress['step_progress_pct']:.1f}%)"
        print(f"   {step_str}")
    if "est_remaining_hours" in progress:
        print(f"   预计剩余: {progress['est_remaining_hours']:.1f}小时")
    
    # 损失
    print(f"\n📉 损失曲线")
    if loss["status"] == "no_data":
        print("   无损失数据记录")
    else:
        print(f"   样本数: {loss['count']}")
        print(f"   开始: {loss['start']:.4f} → 当前: {loss['current']:.4f}")
        print(f"   最小: {loss['min']:.4f} | 最大: {loss['max']:.4f}")
        if "pct_change" in loss:
            direction = "📉" if loss.get("decreasing") else "📈"
            status = "✅" if loss.get("decreasing") else "⚠️"
            print(f"   {status} 变化: {loss['pct_change']:+.1f}% {direction}")
        if "recent" in loss:
            recent_str = " → ".join([f"{l:.4f}" for l in loss["recent"][-5:]])
            print(f"   最近: {recent_str}")
    
    # 梯度
    print(f"\n📊 梯度范数")
    if grads["status"] == "no_data":
        print("   无梯度数据记录")
    else:
        print(f"   {grads['health_msg']}")
        print(f"   平均值: {grads['mean']:.4f} | 当前: {grads['current']:.4f}")
        print(f"   范围: {grads['min']:.4f} - {grads['max']:.4f}")
    
    # 评估指标
    print(f"\n🎯 评估指标")
    if evals["status"] == "no_data":
        print("   无评估指标记录（尚未）")
    else:
        if "loss" in evals:
            el = evals["loss"]
            print(f"   评估损失: {el['current']:.4f}（最佳: {el['best']:.4f}，n={el['count']}）")
        if "accuracy" in evals:
            ea = evals["accuracy"]
            print(f"   评估准确率: {ea['current']:.4f}（最佳: {ea['best']:.4f}，n={ea['count']}）")
    
    # 配置亮点
    print(f"\n⚙️ 配置")
    config = run.config
    config_keys = [
        "model_name", "model_name_or_path", "base_model",
        "learning_rate", "lr",
        "per_device_train_batch_size", "batch_size", "train_batch_size",
        "num_train_epochs", "num_epochs", "epochs",
        "max_steps",
        "gradient_accumulation_steps",
        "warmup_steps", "warmup_ratio",
    ]
    shown = 0
    for key in config_keys:
        if key in config and shown < 8:
            print(f"   {key}: {config[key]}")
            shown += 1
    
    # 整体评估
    print(f"\n{'='*70}")
    print("📋 摘要")
    
    issues = []
    if stall["status"] == "stalled":
        issues.append("运行似乎已停滞")
    if grads["status"] == "ok" and grads["health"] != "healthy":
        issues.append(f"梯度问题 ({grads['health']})")
    if loss["status"] == "ok" and not loss.get("decreasing", True):
        issues.append("损失未下降")
    
    if not issues:
        print("   ✅ 运行看起来健康")
    else:
        for issue in issues:
            print(f"   ⚠️ {issue}")
    
    print(f"{'='*70}\n")


def main():
    """主函数：解析参数并执行运行特征化分析。"""
    parser = argparse.ArgumentParser(description="特征化 W&B 训练运行")
    parser.add_argument("run_path", help="运行路径: ENTITY/PROJECT/RUN_ID 或 PROJECT/RUN_ID 或 RUN_ID")
    parser.add_argument("--project", "-p", help="项目名称（如果不在 run_path 中）")
    parser.add_argument("--entity", "-e", help="实体名称（如果不在 run_path 中）")
    parser.add_argument("--json", action="store_true", help="以 JSON 格式输出")
    args = parser.parse_args()
    
    # 解析运行路径
    parts = args.run_path.split("/")
    if len(parts) == 3:
        entity, project, run_id = parts
    elif len(parts) == 2:
        entity = args.entity
        project, run_id = parts
    elif len(parts) == 1:
        entity = args.entity
        project = args.project
        run_id = parts[0]
    else:
        print(f"无效的运行路径: {args.run_path}", file=sys.stderr)
        sys.exit(1)
    
    if not project:
        print("需要指定项目。使用 ENTITY/PROJECT/RUN_ID 或 --project", file=sys.stderr)
        sys.exit(1)
    
    # 构建完整路径
    if entity:
        full_path = f"{entity}/{project}/{run_id}"
    else:
        full_path = f"{project}/{run_id}"
    
    # 获取运行数据
    api = wandb.Api()
    try:
        run = api.run(full_path)
    except wandb.errors.CommError as e:
        print(f"获取运行时出错: {e}", file=sys.stderr)
        sys.exit(1)
    
    # 获取历史记录
    history = list(run.scan_history())
    
    # 执行分析
    loss = analyze_loss(history)
    grads = analyze_gradients(history)
    evals = analyze_evals(history)
    stall = check_stall(run)
    progress = get_progress(run, history)
    
    if args.json:
        import json
        output = {
            "run": {"id": run.id, "name": run.name, "project": run.project, "state": run.state},
            "loss": loss,
            "gradients": grads,
            "evals": evals,
            "stall": stall,
            "progress": progress,
        }
        print(json.dumps(output, indent=2, default=str))
    else:
        print_report(run, loss, grads, evals, stall, progress)


if __name__ == "__main__":
    main()
