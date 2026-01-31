#!/usr/bin/env python3
"""
Otter.ai 命令行工具 - 管理会议转录

使用方法：
    otter.py list [--limit N] [--json]
    otter.py get <speech_id> [--json]
    otter.py search <查询> [--json]
    otter.py download <speech_id> [--format 格式] [--output 路径]
    otter.py upload <文件>
    otter.py summary <speech_id>
    otter.py sync-twenty <speech_id> [--contact 联系人] [--company 公司]
"""

import argparse
import json
import os
import sys
from datetime import datetime
from typing import Optional

import requests
from requests_toolbelt.multipart.encoder import MultipartEncoder


class OtterClient:
    """Otter.ai API 客户端"""
    
    API_BASE = "https://otter.ai/forward/api/v1/"
    S3_BASE = "https://s3.us-west-2.amazonaws.com/"
    
    def __init__(self):
        self._session = requests.Session()
        self._userid = None
        self._cookies = None
        self._logged_in = False
    
    def login(self, email: str, password: str) -> bool:
        """登录 Otter.ai"""
        url = f"{self.API_BASE}login"
        self._session.auth = (email, password)
        
        resp = self._session.get(url, params={"username": email})
        if resp.status_code != 200:
            return False
        
        data = resp.json()
        self._userid = data.get("userid")
        self._cookies = resp.cookies.get_dict()
        self._logged_in = True
        return True
    
    def get_speeches(self, limit: int = 20, folder: int = 0) -> list:
        """获取转录列表"""
        if not self._logged_in:
            raise RuntimeError("未登录")
        
        url = f"{self.API_BASE}speeches"
        params = {
            "userid": self._userid,
            "folder": folder,
            "page_size": limit,
            "source": "owned"
        }
        
        resp = self._session.get(url, params=params)
        if resp.status_code != 200:
            return []
        
        return resp.json().get("speeches", [])
    
    def get_speech(self, speech_id: str) -> dict:
        """获取完整转录"""
        if not self._logged_in:
            raise RuntimeError("未登录")
        
        url = f"{self.API_BASE}speech"
        params = {"userid": self._userid, "otid": speech_id}
        
        resp = self._session.get(url, params=params)
        if resp.status_code != 200:
            return {}
        
        return resp.json().get("speech", {})
    
    def search(self, query: str, speech_id: Optional[str] = None, size: int = 100) -> list:
        """搜索转录"""
        if not self._logged_in:
            raise RuntimeError("未登录")
        
        url = f"{self.API_BASE}advanced_search"
        params = {"query": query, "size": size}
        if speech_id:
            params["otid"] = speech_id
        
        resp = self._session.get(url, params=params)
        if resp.status_code != 200:
            return []
        
        return resp.json().get("hits", [])
    
    def download(self, speech_id: str, fmt: str = "txt") -> bytes:
        """下载指定格式的转录"""
        if not self._logged_in:
            raise RuntimeError("未登录")
        
        url = f"{self.API_BASE}bulk_export"
        params = {"userid": self._userid}
        data = {"formats": fmt, "speech_otid_list": [speech_id]}
        headers = {
            "x-csrftoken": self._cookies.get("csrftoken", ""),
            "referer": "https://otter.ai/"
        }
        
        resp = self._session.post(url, params=params, headers=headers, data=data)
        if resp.status_code != 200:
            return b""
        
        return resp.content
    
    def upload(self, filepath: str, content_type: str = "audio/mp4") -> dict:
        """上传音频进行转录"""
        if not self._logged_in:
            raise RuntimeError("未登录")
        
        # 获取上传参数
        url = f"{self.API_BASE}speech_upload_params"
        resp = self._session.get(url, params={"userid": self._userid})
        if resp.status_code != 200:
            return {"error": "获取上传参数失败"}
        
        params_data = resp.json().get("data", {})
        
        # 上传到 S3
        upload_url = f"{self.S3_BASE}speech-upload-prod"
        fields = dict(params_data)
        fields["success_action_status"] = str(fields.get("success_action_status", "201"))
        if "form_action" in fields:
            del fields["form_action"]
        
        with open(filepath, "rb") as f:
            fields["file"] = (os.path.basename(filepath), f, content_type)
            multipart = MultipartEncoder(fields=fields)
            resp = requests.post(
                upload_url,
                data=multipart,
                headers={"Content-Type": multipart.content_type}
            )
        
        if resp.status_code != 201:
            return {"error": f"上传失败: {resp.status_code}"}
        
        # 解析 S3 响应
        import xml.etree.ElementTree as ET
        root = ET.fromstring(resp.text)
        bucket = root.find("Bucket").text if root.find("Bucket") is not None else ""
        key = root.find("Key").text if root.find("Key") is not None else ""
        
        # 完成上传
        finish_url = f"{self.API_BASE}finish_speech_upload"
        params = {
            "bucket": bucket,
            "key": key,
            "language": "en",
            "country": "us",
            "userid": self._userid
        }
        resp = self._session.get(finish_url, params=params)
        
        return resp.json() if resp.status_code == 200 else {"error": "完成上传失败"}


def format_speech_list(speeches: list) -> str:
    """格式化演讲列表用于显示"""
    lines = []
    for s in speeches:
        title = s.get("title", "未命名")
        otid = s.get("otid", "")
        created = s.get("created", 0)
        duration = s.get("duration", 0)
        
        # 格式化时间戳
        if created:
            dt = datetime.fromtimestamp(created)
            date_str = dt.strftime("%Y-%m-%d %H:%M")
        else:
            date_str = "未知"
        
        # 格式化时长
        mins = duration // 60
        secs = duration % 60
        dur_str = f"{mins}分 {secs}秒"
        
        lines.append(f"• {title}")
        lines.append(f"  ID: {otid}")
        lines.append(f"  日期: {date_str} | 时长: {dur_str}")
        lines.append("")
    
    return "\n".join(lines)


def format_speech(speech: dict) -> str:
    """格式化完整演讲用于显示"""
    title = speech.get("title", "未命名")
    created = speech.get("created", 0)
    
    if created:
        dt = datetime.fromtimestamp(created)
        date_str = dt.strftime("%Y-%m-%d %H:%M")
    else:
        date_str = "未知"
    
    lines = [f"# {title}", f"日期: {date_str}", ""]
    
    # 获取转录文本
    transcripts = speech.get("transcripts", [])
    for t in transcripts:
        speaker = t.get("speaker_name", "发言人")
        text = t.get("transcript", "")
        start = t.get("start_offset", 0)
        
        mins = start // 60000
        secs = (start % 60000) // 1000
        
        lines.append(f"[{mins:02d}:{secs:02d}] {speaker}: {text}")
    
    return "\n".join(lines)


def extract_summary_text(speech: dict) -> str:
    """提取纯文本用于总结"""
    lines = []
    transcripts = speech.get("transcripts", [])
    
    for t in transcripts:
        speaker = t.get("speaker_name", "发言人")
        text = t.get("transcript", "")
        lines.append(f"{speaker}: {text}")
    
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Otter.ai 命令行工具")
    parser.add_argument("--json", action="store_true", help="输出 JSON 格式")
    
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # list
    list_p = subparsers.add_parser("list", help="列出最近的转录")
    list_p.add_argument("--limit", type=int, default=10, help="结果数量")
    
    # get
    get_p = subparsers.add_parser("get", help="获取完整转录")
    get_p.add_argument("speech_id", help="演讲 ID")
    
    # search
    search_p = subparsers.add_parser("search", help="搜索转录")
    search_p.add_argument("query", help="搜索查询")
    
    # download
    dl_p = subparsers.add_parser("download", help="下载转录")
    dl_p.add_argument("speech_id", help="演讲 ID")
    dl_p.add_argument("--format", default="txt", choices=["txt", "pdf", "docx", "srt"])
    dl_p.add_argument("--output", help="输出路径")
    
    # upload
    up_p = subparsers.add_parser("upload", help="上传音频进行转录")
    up_p.add_argument("file", help="音频文件路径")
    
    # summary
    sum_p = subparsers.add_parser("summary", help="获取转录文本用于总结")
    sum_p.add_argument("speech_id", help="演讲 ID")
    
    # sync-twenty
    sync_p = subparsers.add_parser("sync-twenty", help="同步到 Twenty CRM")
    sync_p.add_argument("speech_id", help="演讲 ID")
    sync_p.add_argument("--contact", help="要链接的联系人")
    sync_p.add_argument("--company", help="要链接的公司")
    
    args = parser.parse_args()
    
    # 获取凭证
    email = os.environ.get("OTTER_EMAIL")
    password = os.environ.get("OTTER_PASSWORD")
    
    if not email or not password:
        print("错误: 需要 OTTER_EMAIL 和 OTTER_PASSWORD 环境变量", file=sys.stderr)
        sys.exit(1)
    
    # 初始化客户端
    client = OtterClient()
    if not client.login(email, password):
        print("错误: 登录 Otter.ai 失败", file=sys.stderr)
        sys.exit(1)
    
    # 执行命令
    if args.command == "list":
        speeches = client.get_speeches(limit=args.limit)
        if args.json:
            print(json.dumps(speeches, indent=2))
        else:
            print(format_speech_list(speeches))
    
    elif args.command == "get":
        speech = client.get_speech(args.speech_id)
        if args.json:
            print(json.dumps(speech, indent=2))
        else:
            print(format_speech(speech))
    
    elif args.command == "search":
        results = client.search(args.query)
        if args.json:
            print(json.dumps(results, indent=2))
        else:
            for r in results:
                print(f"• {r.get('title', '未命名')} (ID: {r.get('otid', '')})")
                if r.get("highlight"):
                    print(f"  ...{r['highlight']}...")
                print()
    
    elif args.command == "download":
        content = client.download(args.speech_id, fmt=args.format)
        if content:
            output = args.output or f"{args.speech_id}.{args.format}"
            with open(output, "wb") as f:
                f.write(content)
            print(f"已下载到 {output}")
        else:
            print("错误: 下载失败", file=sys.stderr)
            sys.exit(1)
    
    elif args.command == "upload":
        if not os.path.exists(args.file):
            print(f"错误: 文件未找到: {args.file}", file=sys.stderr)
            sys.exit(1)
        
        result = client.upload(args.file)
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            if "error" in result:
                print(f"错误: {result['error']}", file=sys.stderr)
                sys.exit(1)
            print("上传已开始。转录正在进行中...")
    
    elif args.command == "summary":
        speech = client.get_speech(args.speech_id)
        if not speech:
            print("错误: 演讲未找到", file=sys.stderr)
            sys.exit(1)
        
        title = speech.get("title", "未命名")
        text = extract_summary_text(speech)
        
        output = {
            "title": title,
            "speech_id": args.speech_id,
            "transcript_text": text,
            "word_count": len(text.split())
        }
        
        if args.json:
            print(json.dumps(output, indent=2))
        else:
            print(f"标题: {title}")
            print(f"字数: {output['word_count']}")
            print("\n--- 转录 ---\n")
            print(text)
    
    elif args.command == "sync-twenty":
        # 检查 Twenty 凭证
        twenty_url = os.environ.get("TWENTY_API_URL")
        twenty_token = os.environ.get("TWENTY_API_TOKEN")
        
        if not twenty_url or not twenty_token:
            print("错误: CRM 同步需要 TWENTY_API_URL 和 TWENTY_API_TOKEN", file=sys.stderr)
            sys.exit(1)
        
        speech = client.get_speech(args.speech_id)
        if not speech:
            print("错误: 演讲未找到", file=sys.stderr)
            sys.exit(1)
        
        title = speech.get("title", "未命名")
        text = extract_summary_text(speech)
        duration = speech.get("duration", 0)
        created = speech.get("created_at")
        
        # 格式化日期
        date_str = ""
        if created:
            try:
                dt = datetime.fromtimestamp(created)
                date_str = dt.strftime("%Y-%m-%d %H:%M")
            except:
                date_str = str(created)
        
        # 构建 markdown 备注
        markdown = f"""# 会议转录: {title}

**日期:** {date_str}
**时长:** {duration // 60}分 {duration % 60}秒
**来源:** Otter.ai

## 转录内容

{text[:3000]}{"..." if len(text) > 3000 else ""}

---
*从 Otter.ai 同步于 {datetime.now().strftime("%Y-%m-%d %H:%M")}*
"""
        
        # 在 Twenty 中创建备注
        headers = {
            "Authorization": f"Bearer {twenty_token}",
            "Content-Type": "application/json"
        }
        
        note_data = {
            "title": f"转录: {title}",
            "bodyV2": {
                "blocknote": "",
                "markdown": markdown
            }
        }
        
        resp = requests.post(
            f"{twenty_url}/rest/notes",
            headers=headers,
            json=note_data
        )
        
        if resp.status_code >= 400:
            print(f"创建备注错误: {resp.status_code} {resp.text}", file=sys.stderr)
            sys.exit(1)
        
        result = resp.json()
        note_id = result.get("data", {}).get("createNote", {}).get("id")
        
        # 如果指定了公司，链接到业务
        if args.company and note_id:
            # 按公司名称搜索业务
            eng_resp = requests.get(
                f"{twenty_url}/rest/engagements",
                headers=headers
            )
            if eng_resp.status_code == 200:
                engagements = eng_resp.json().get("data", {}).get("engagements", [])
                company_lower = args.company.lower()
                for eng in engagements:
                    if company_lower in eng.get("name", "").lower():
                        # 将备注链接到业务
                        requests.post(
                            f"{twenty_url}/rest/noteTargets",
                            headers=headers,
                            json={"noteId": note_id, "engagementId": eng.get("id")}
                        )
                        print(f"已链接到业务: {eng.get('name')}")
                        break
        
        print(f"✅ 在 Twenty 中创建备注: {title}")
        print(f"   备注 ID: {note_id}")
        if args.json:
            print(json.dumps({"note_id": note_id, "title": title}))


if __name__ == "__main__":
    main()
