import os
import datetime
import logging
import aiohttp
import re
import asyncio
from pathlib import Path
from typing import Optional, List, TypeVar, Callable, Any
from functools import wraps
from config.config import Config

logger = logging.getLogger(__name__)

T = TypeVar('T')

def async_retry(
    retries: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: tuple = (Exception,)
) -> Callable:
    """
    异步重试装饰器
    :param retries: 最大重试次数
    :param delay: 初始延迟时间（秒）
    :param backoff: 延迟时间的增长倍数
    :param exceptions: 需要重试的异常类型
    """
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            current_delay = delay
            last_exception = None

            for attempt in range(retries):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt == retries - 1:  # 最后一次尝试
                        logger.error(f"重试{retries}次后仍然失败: {str(e)}")
                        raise
                    
                    logger.warning(f"第{attempt + 1}次尝试失败: {str(e)}, {current_delay}秒后重试")
                    await asyncio.sleep(current_delay)
                    current_delay *= backoff  # 增加延迟时间
            
            raise last_exception
        return wrapper
    return decorator

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
                    # 处理 OCR 结果中的远程图片
                    processed_result = await self.process_remote_images_in_markdown(result)
                    content_parts.append(processed_result + "\n")

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

    async def process_remote_images_in_markdown(self, markdown_text: str) -> str:
        """
        处理 markdown 文本中的远程图片链接，下载图片并替换为本地链接
        """
        if not self.enabled or not markdown_text:
            logger.info("Obsidian 未启用或 markdown 为空，跳过处理")
            return markdown_text

        # 匹配图片链接的正则表达式
        image_pattern = r'!\[([^\]]*)\]\((https?://[^)]+)\)'
        logger.info(f"开始处理 markdown 文本中的远程图片，文本长度: {len(markdown_text)}")
        
        @async_retry(retries=3, delay=1.0, backoff=2.0, exceptions=(aiohttp.ClientError, asyncio.TimeoutError))
        async def download_image(session: aiohttp.ClientSession, url: str) -> Optional[bytes]:
            """下载图片的重试包装函数"""
            async with session.get(url, timeout=30) as response:
                if response.status == 200:
                    return await response.read()
                response.raise_for_status()
            return None

        async def download_and_replace(match) -> str:
            alt_text = match.group(1)
            image_url = match.group(2)
            logger.info(f"发现远程图片链接: {image_url}")
            
            try:
                async with aiohttp.ClientSession() as session:
                    logger.info(f"开始下载图片: {image_url}")
                    image_content = await download_image(session, image_url)
                    
                    if image_content:
                        timestamp = self._get_timestamp()
                        image_filename = f"{timestamp}.png"
                        image_path = os.path.join(self.attachment_dir, image_filename)
                        
                        # 保存图片
                        with open(image_path, "wb") as f:
                            f.write(image_content)
                        
                        # 返回 Obsidian 格式的本地图片链接
                        new_link = f"![{alt_text}]({Config.OBSIDIAN_ATTACHMENT_DIR}/{image_filename})"
                        logger.info(f"图片下载成功，新链接: {new_link}")
                        return new_link
                    else:
                        logger.error(f"下载图片失败: {image_url}")
                        return match.group(0)
            except Exception as e:
                logger.error(f"下载图片失败 {image_url}: {e}")
                return match.group(0)  # 如果下载失败，保留原始链接

        # 使用正则表达式替换所有图片链接
        result = markdown_text
        matches = list(re.finditer(image_pattern, markdown_text))
        logger.info(f"找到 {len(matches)} 个远程图片链接")
        
        for match in matches:
            original_link = match.group(0)
            replacement = await download_and_replace(match)
            result = result.replace(original_link, replacement)
            logger.info(f"替换链接: {original_link} -> {replacement}")

        logger.info("远程图片处理完成")
        return result 