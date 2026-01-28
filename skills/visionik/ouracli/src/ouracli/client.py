"""Oura API 客户端包装器。"""

import os
import sys
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv


class OuraClient:
    """用于与 Oura API v2 交互的客户端。"""

    BASE_URL = "https://api.ouraring.com/v2"

    def __init__(self, access_token: str | None = None) -> None:
        """
        初始化 Oura API 客户端。

        参数:
            access_token: Oura API 个人访问令牌。如果未提供，
                         则从 secrets/oura.env 文件加载。
        """
        if access_token is None:
            access_token = self._load_token()

        self.access_token = access_token
        self.session = requests.Session()
        self.session.headers.update({"Authorization": f"Bearer {self.access_token}"})

    def _load_token(self) -> str:
        """从环境变量或密钥文件加载访问令牌。

        尝试顺序：
        1. PERSONAL_ACCESS_TOKEN 环境变量
        2. ./secrets/oura.env 文件
        3. ~/.secrets/oura.env 文件
        """
        # 1. 检查环境变量中是否已设置
        token = os.getenv("PERSONAL_ACCESS_TOKEN")
        if token:
            return token

        # 2. 尝试 ./secrets/oura.env（当前目录）
        local_secrets_file = Path.cwd() / "secrets" / "oura.env"
        if local_secrets_file.exists():
            load_dotenv(local_secrets_file)
            token = os.getenv("PERSONAL_ACCESS_TOKEN")
            if token:
                return token

        # 3. 尝试 ~/.secrets/oura.env（主目录）
        home_secrets_file = Path.home() / ".secrets" / "oura.env"
        if home_secrets_file.exists():
            load_dotenv(home_secrets_file)
            token = os.getenv("PERSONAL_ACCESS_TOKEN")
            if token:
                return token

        # 所有方法都失败
        print(
            "错误：未找到 PERSONAL_ACCESS_TOKEN。\n\n"
            "请通过以下方式设置：\n"
            "  1. 环境变量：export PERSONAL_ACCESS_TOKEN=<您的令牌>\n"
            "  2. 本地文件：./secrets/oura.env\n"
            "  3. 主目录文件：~/.secrets/oura.env\n\n"
            "在以下位置获取令牌：https://cloud.ouraring.com/personal-access-tokens",
            file=sys.stderr,
        )
        sys.exit(1)

    def _get(self, endpoint: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        """
        向 Oura API 发送 GET 请求。

        参数:
            endpoint: API 端点路径
            params: 查询参数

        返回:
            字典形式的 JSON 响应
        """
        url = f"{self.BASE_URL}/{endpoint}"
        response = self.session.get(url, params=params)
        response.raise_for_status()
        result: dict[str, Any] = response.json()
        return result

    def _get_date_range_data(
        self, endpoint: str, start_date: str, end_date: str, next_token: str | None = None
    ) -> dict[str, Any]:
        """日期范围端点的通用方法。

        参数:
            endpoint: API 端点路径（例如，'usercollection/daily_activity'）
            start_date: 开始日期（YYYY-MM-DD）
            end_date: 结束日期（YYYY-MM-DD）
            next_token: 可选的分页令牌

        返回:
            字典形式的 JSON 响应
        """
        params = {"start_date": start_date, "end_date": end_date}
        if next_token:
            params["next_token"] = next_token
        return self._get(endpoint, params)

    def get_daily_activity(
        self, start_date: str, end_date: str, next_token: str | None = None
    ) -> dict[str, Any]:
        """获取每日活动数据。"""
        return self._get_date_range_data(
            "usercollection/daily_activity", start_date, end_date, next_token
        )

    def get_daily_sleep(
        self, start_date: str, end_date: str, next_token: str | None = None
    ) -> dict[str, Any]:
        """获取每日睡眠数据。"""
        return self._get_date_range_data(
            "usercollection/daily_sleep", start_date, end_date, next_token
        )

    def get_daily_readiness(
        self, start_date: str, end_date: str, next_token: str | None = None
    ) -> dict[str, Any]:
        """获取每日准备度数据。"""
        return self._get_date_range_data(
            "usercollection/daily_readiness", start_date, end_date, next_token
        )

    def get_daily_spo2(
        self, start_date: str, end_date: str, next_token: str | None = None
    ) -> dict[str, Any]:
        """获取每日血氧数据。"""
        return self._get_date_range_data(
            "usercollection/daily_spo2", start_date, end_date, next_token
        )

    def get_daily_stress(
        self, start_date: str, end_date: str, next_token: str | None = None
    ) -> dict[str, Any]:
        """获取每日压力数据。"""
        return self._get_date_range_data(
            "usercollection/daily_stress", start_date, end_date, next_token
        )

    def get_heartrate(
        self, start_datetime: str, end_datetime: str, next_token: str | None = None
    ) -> dict[str, Any]:
        """获取心率时间序列数据。"""
        params = {"start_datetime": start_datetime, "end_datetime": end_datetime}
        if next_token:
            params["next_token"] = next_token
        return self._get("usercollection/heartrate", params)

    def get_workouts(
        self, start_date: str, end_date: str, next_token: str | None = None
    ) -> dict[str, Any]:
        """获取锻炼数据。"""
        return self._get_date_range_data("usercollection/workout", start_date, end_date, next_token)

    def get_sessions(
        self, start_date: str, end_date: str, next_token: str | None = None
    ) -> dict[str, Any]:
        """获取会话数据。"""
        return self._get_date_range_data("usercollection/session", start_date, end_date, next_token)

    def get_tags(
        self, start_date: str, end_date: str, next_token: str | None = None
    ) -> dict[str, Any]:
        """获取标签数据。"""
        return self._get_date_range_data("usercollection/tag", start_date, end_date, next_token)

    def get_rest_mode_periods(
        self, start_date: str, end_date: str, next_token: str | None = None
    ) -> dict[str, Any]:
        """获取休息模式期间的数据。"""
        return self._get_date_range_data(
            "usercollection/rest_mode_period", start_date, end_date, next_token
        )

    def get_personal_info(self) -> dict[str, Any]:
        """获取个人信息。"""
        return self._get("usercollection/personal_info")

    def get_all_data(self, start_date: str, end_date: str) -> dict[str, list[dict[str, Any]]]:
        """
        获取指定日期范围的所有可用数据。

        返回:
            包含每种数据类型及其对应数据的字典
        """
        all_data: dict[str, list[dict[str, Any]]] = {}

        # 收集所有数据类型
        try:
            all_data["activity"] = self.get_daily_activity(start_date, end_date).get("data", [])
        except Exception:
            all_data["activity"] = []

        try:
            all_data["sleep"] = self.get_daily_sleep(start_date, end_date).get("data", [])
        except Exception:
            all_data["sleep"] = []

        try:
            all_data["readiness"] = self.get_daily_readiness(start_date, end_date).get("data", [])
        except Exception:
            all_data["readiness"] = []

        try:
            all_data["spo2"] = self.get_daily_spo2(start_date, end_date).get("data", [])
        except Exception:
            all_data["spo2"] = []

        try:
            all_data["stress"] = self.get_daily_stress(start_date, end_date).get("data", [])
        except Exception:
            all_data["stress"] = []

        try:
            # 将日期转换为心率端点的日期时间格式
            start_datetime = f"{start_date}T00:00:00"
            end_datetime = f"{end_date}T23:59:59"
            all_data["heartrate"] = self.get_heartrate(start_datetime, end_datetime).get("data", [])
        except Exception:
            all_data["heartrate"] = []

        try:
            all_data["workouts"] = self.get_workouts(start_date, end_date).get("data", [])
        except Exception:
            all_data["workouts"] = []

        try:
            all_data["sessions"] = self.get_sessions(start_date, end_date).get("data", [])
        except Exception:
            all_data["sessions"] = []

        try:
            all_data["tags"] = self.get_tags(start_date, end_date).get("data", [])
        except Exception:
            all_data["tags"] = []

        try:
            all_data["rest_mode"] = self.get_rest_mode_periods(start_date, end_date).get("data", [])
        except Exception:
            all_data["rest_mode"] = []

        try:
            all_data["personal_info"] = [self.get_personal_info()]
        except Exception:
            all_data["personal_info"] = []

        return all_data
