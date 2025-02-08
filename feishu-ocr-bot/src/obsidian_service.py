import os
import datetime
import logging
from pathlib import Path
from typing import Optional, List
from config.config import Config

logger = logging.getLogger(__name__)

class ObsidianService:
    def __init__(self):
        self.vault_path = Config.OBSIDIAN_VAULT_PATH
        self.attachment_dir = os.path.join(self.vault_path, Config.OBSIDIAN_ATTACHMENT_DIR)
        self.sync_dir = os.path.join(self.vault_path, Config.OBSIDIAN_SYNC_DIR)
        self.enabled = Config.OBSIDIAN_ENABLED
        self._ensure_directories()

    def _ensure_directories(self):
        """确保必要的目录存在"""
        if not self.enabled:
            return
        
        try:
            Path(self.attachment_dir).mkdir(parents=True, exist_ok=True)
            Path(self.sync_dir).mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.error(f"创建 Obsidian 目录失败: {e}")
            self.enabled = False

    def _get_timestamp(self) -> str:
        """获取当前时间戳字符串"""
        return datetime.datetime.now().strftime("%Y%m%d%H%M%S")

    async def save_image(self, image_content: bytes) -> Optional[str]:
        """
        保存图片到 attachment 目录
        返回相对于 vault 的路径
        """
        if not self.enabled:
            return None

        try:
            timestamp = self._get_timestamp()
            image_filename = f"{timestamp}.png"
            image_path = os.path.join(self.attachment_dir, image_filename)
            
            with open(image_path, "wb") as f:
                f.write(image_content)
            
            return f"![[{Config.OBSIDIAN_ATTACHMENT_DIR}/{image_filename}]]"
        except Exception as e:
            logger.error(f"保存图片失败: {e}")
            return None

    async def create_note(self, 
                         text: Optional[str] = None, 
                         image_links: Optional[List[str]] = None,
                         ocr_results: Optional[List[str]] = None,
                         ai_results: Optional[List[str]] = None) -> Optional[str]:
        """
        创建新的笔记文件
        """
        if not self.enabled:
            return None

        try:
            timestamp = self._get_timestamp()
            note_filename = f"{timestamp}.md"
            note_path = os.path.join(self.sync_dir, note_filename)

            content_parts = []
            
            # 添加标题和时间
            content_parts.append(f"# 飞书同步笔记 {timestamp}")
            content_parts.append(f"创建时间：{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

            # 添加原始文本
            if text:
                content_parts.append("## 原始文本")
                content_parts.append(text + "\n")

            # 添加图片
            if image_links and len(image_links) > 0:
                content_parts.append("## 图片")
                content_parts.extend(image_links)
                content_parts.append("")

            # 添加 OCR 结果
            if ocr_results and len(ocr_results) > 0:
                content_parts.append("## OCR 识别结果")
                for idx, result in enumerate(ocr_results, 1):
                    if len(ocr_results) > 1:
                        content_parts.append(f"### 图片 {idx} OCR 结果")
                    content_parts.append(result + "\n")

            # 添加 AI 分析结果
            if ai_results and len(ai_results) > 0:
                content_parts.append("## AI 分析结果")
                for idx, result in enumerate(ai_results, 1):
                    if len(ai_results) > 1:
                        content_parts.append(f"### 分析 {idx}")
                    content_parts.append(result + "\n")

            # 写入文件
            content = "\n".join(content_parts)
            with open(note_path, "w", encoding="utf-8") as f:
                f.write(content)

            return note_path
        except Exception as e:
            logger.error(f"创建笔记失败: {e}")
            return None 