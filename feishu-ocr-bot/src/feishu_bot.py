import json
import aiohttp
import time
from typing import Dict, Any, Optional, List
from config.config import Config
from config.config_manager import ConfigManager
from src.ocr_service import OCRService
from src.obsidian_service import ObsidianService
import logging

logger = logging.getLogger(__name__)

class FeishuBot:
    def __init__(self):
        self.app_id = Config.FEISHU_APP_ID
        self.app_secret = Config.FEISHU_APP_SECRET
        self.verification_token = Config.FEISHU_VERIFICATION_TOKEN
        self.ocr_service = OCRService()
        self.obsidian_service = ObsidianService()
        self._tenant_access_token = None
        
        # 使用配置管理器
        self.config_manager = ConfigManager()
        self.load_runtime_config()

    def load_runtime_config(self):
        """从配置文件加载运行时配置"""
        self.auto_ai_analysis = self.config_manager.get("auto_ai_analysis", True)
        self.ai_base_url = self.config_manager.get("ai_base_url", Config.AI_BASE_URL)
        self.ai_api_key = self.config_manager.get("ai_api_key", Config.AI_API_KEY)
        self.ai_model = self.config_manager.get("ai_model", Config.AI_MODEL)
        self.ai_system_prompt = self.config_manager.get("ai_system_prompt", Config.AI_SYSTEM_PROMPT)

    def save_runtime_config(self):
        """保存运行时配置到文件"""
        self.config_manager.update({
            "auto_ai_analysis": self.auto_ai_analysis,
            "ai_base_url": self.ai_base_url,
            "ai_api_key": self.ai_api_key,
            "ai_model": self.ai_model,
            "ai_system_prompt": self.ai_system_prompt
        })

    async def get_tenant_access_token(self) -> str:
        """
        获取飞书tenant_access_token
        """
        url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
        
        headers = {
            "Content-Type": "application/json"
        }
        data = {
            "app_id": self.app_id,
            "app_secret": self.app_secret
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=data) as response:
                result = await response.json()
                if result.get("code") == 0:
                    self._tenant_access_token = result.get(
                        "tenant_access_token")
                    return self._tenant_access_token
                raise Exception(f"获取tenant_access_token失败: {result}")

    async def send_message(self, chat_id: str, msg_type: str, content: Dict[str, Any]) -> None:
        """
        发送消息到飞书群
        """
        url = "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {await self.get_tenant_access_token()}"
        }
        data = {
            "receive_id": chat_id,
            "msg_type": msg_type,
            "content": json.dumps(content)
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=data) as response:
                result = await response.json()
                if result.get("code") != 0:
                    raise Exception(f"发送消息失败: {result}")

    async def handle_command(self, chat_id: str, text: str) -> None:
        """处理命令消息"""
        try:
            parts = text.split()
            cmd = parts[0]

            if cmd == '-h':
                help_text = """支持的命令：
-h: 显示帮助信息
-m <model>: 切换AI模型
-u <url>: 设置AI base URL
-k <apikey>: 设置AI API key
-s <prompt>: 设置系统提示词
-o: 图片仅OCR，不进行AI解析
-oa: 图片OCR后进行AI解析
-ta: 对所有文字进行AI解读
-t: 不自动解析文字
                """
                await self.send_message(chat_id, "text", {"text": help_text})
                return True

            elif cmd == '-m' and len(parts) > 1:
                self.ai_model = parts[1]
                self.save_runtime_config()
                await self.send_message(chat_id, "text", {"text": f"已切换AI模型为：{self.ai_model}"})
                return True

            elif cmd == '-u' and len(parts) > 1:
                self.ai_base_url = parts[1]
                self.save_runtime_config()
                await self.send_message(chat_id, "text", {"text": f"已设置AI base URL为：{self.ai_base_url}"})
                return True

            elif cmd == '-k' and len(parts) > 1:
                self.ai_api_key = parts[1]
                self.save_runtime_config()
                await self.send_message(chat_id, "text", {"text": "已更新AI API key"})
                return True

            elif cmd == '-s' and len(parts) > 1:
                self.ai_system_prompt = ' '.join(parts[1:])  # 合并所有剩余部分作为提示词
                self.save_runtime_config()
                await self.send_message(chat_id, "text", {"text": f"已设置系统提示词为：{self.ai_system_prompt}"})
                return True

            elif cmd == '-ta':
                self.auto_ai_analysis = True
                self.save_runtime_config()
                await self.send_message(chat_id, "text", {"text": "已开启自动AI解析"})
                return True

            elif cmd == '-t':
                self.auto_ai_analysis = False
                self.save_runtime_config()
                await self.send_message(chat_id, "text", {"text": "已关闭自动AI解析"})
                return True

            return False

        except Exception as e:
            logger.error(f"处理命令失败: {e}")
            await self.send_message(chat_id, "text", {"text": f"处理命令失败：{str(e)}"})
            return True

    async def analyze_with_ai(self, text: str) -> Optional[str]:
        """使用AI进行文本分析"""
        try:
            if not self.ai_api_key:
                raise Exception("未设置AI API key")

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.ai_api_key}"
            }

            data = {
                "model": self.ai_model,
                "messages": [
                    {
                        "role": "user",
                        "content": f"{self.ai_system_prompt}\n\n{text}"
                    }
                ]
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.ai_base_url}/chat/completions",
                    headers=headers,
                    json=data
                ) as response:
                    result = await response.json()
                    if "choices" in result and len(result["choices"]) > 0:
                        return result["choices"][0]["message"]["content"]
                    raise Exception(f"AI分析失败：{result}")

        except Exception as e:
            logger.error(f"AI分析失败: {e}")
            return None

    async def handle_message(self, event: Dict[str, Any]) -> None:
        """处理接收到的消息"""
        try:
            # 校验消息时间戳
            create_time = int(event.get("event", {}).get("message", {}).get("create_time", 0))
            current_time = int(time.time() * 1000)  # 转换为毫秒时间戳
            
            if abs(current_time - create_time) > 10000:  # 30秒 = 30000毫秒
                logger.warning(f"消息时间戳校验失败，消息创建时间: {create_time}，当前时间: {current_time}")
                return
                
            message = event.get("event", {}).get("message", {})
            logger.info(f"处理消息: {message}")
            
            chat_id = message.get("chat_id")
            message_id = message.get("message_id")
            msg_type = message.get("message_type")

            text_content = None
            image_links: List[str] = []
            ocr_results: List[str] = []
            ai_results: List[str] = []

            if msg_type == "text":
                content = json.loads(message.get("content", "{}"))
                text = content.get("text", "").strip()
                text_content = text
                
                # 处理命令
                if text.startswith('-'):
                    is_command = await self.handle_command(chat_id, text)
                    if is_command:
                        return

                # 处理普通文本
                if self.auto_ai_analysis and not text.startswith('-'):
                    await self.send_message(chat_id, "text", {"text": "正在进行AI分析..."})
                    ai_result = await self.analyze_with_ai(text)
                    if ai_result:
                        ai_results.append(ai_result)
                        await self.send_message(chat_id, "text", {"text": f"AI分析结果：\n\n{ai_result}"})
                    else:
                        await self.send_message(chat_id, "text", {"text": "AI分析失败"})

            # 处理图片消息
            elif msg_type == "image":
                if not message_id:
                    raise Exception("未找到消息ID")

                # 获取图片内容
                logger.info(f"获取图片内容，message_id: {message_id}")
                image_content = await self.get_image_content(message_id)

                # 保存图片到 Obsidian
                image_link = await self.obsidian_service.save_image(image_content)
                if image_link:
                    image_links.append(image_link)

                # 发送处理中的提示
                await self.send_message(chat_id, "text", {"text": "正在处理图片，请稍候..."})

                # 进行OCR处理
                ocr_result = await self.ocr_service.process_image(image_content)
                ocr_results.append(ocr_result)
                await self.send_message(chat_id, "text", {"text": f"OCR识别结果：\n\n{ocr_result}"})

                # 如果开启了自动AI分析，进行AI解析
                if self.auto_ai_analysis:
                    await self.send_message(chat_id, "text", {"text": "正在进行AI分析..."})
                    ai_result = await self.analyze_with_ai(ocr_result)
                    if ai_result:
                        ai_results.append(ai_result)
                        await self.send_message(chat_id, "text", {"text": f"AI分析结果：\n\n{ai_result}"})
                    else:
                        await self.send_message(chat_id, "text", {"text": "AI分析失败"})

            # 创建 Obsidian 笔记
            note_path = await self.obsidian_service.create_note(
                text=text_content,
                image_links=image_links if image_links else None,
                ocr_results=ocr_results if ocr_results else None,
                ai_results=ai_results if ai_results else None
            )

            if note_path:
                await self.send_message(chat_id, "text", {"text": f"已保存到 Obsidian: {note_path}"})

        except Exception as e:
            logger.error(f"处理消息失败: {e}")
            if chat_id:
                await self.send_message(chat_id, "text", {"text": f"处理失败：{str(e)}"})

    async def get_image_content(self, message_id: str) -> str:
        """
        获取图片URL
        参考文档：https://open.feishu.cn/document/server-docs/im-v1/message/get-2
        """
        tenant_access_token = await self.get_tenant_access_token()
        logger.info(f"开始获取消息内容，message_id: {message_id}")
        
        # 1. 先获取消息内容
        url = f"https://open.feishu.cn/open-apis/im/v1/messages/{message_id}"
        headers = {
            "Authorization": f"Bearer {tenant_access_token}",
            "Content-Type": "application/json"
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                result = await response.json()
                logger.info(f"获取消息响应: {result}")
                
                if result.get("code") != 0:
                    logger.error(f"获取消息失败: {result}")
                    raise Exception(f"获取消息失败: {result}")
                
                message_content = result.get("data", {}).get("items", [{}])[0]
                content = json.loads(message_content.get("body", {}).get("content", "{}"))
                file_key = content.get("image_key")
                
                if not file_key:
                    logger.error("消息中未找到file_key")
                    raise Exception("消息中未找到file_key")
                
                # 2. 获取图片资源
                image_url = f"https://open.feishu.cn/open-apis/im/v1/messages/{message_id}/resources/{file_key}?type=image"
                async with session.get(image_url, headers=headers) as img_response:
                    if img_response.status != 200:
                        result = await img_response.json()
                        logger.error(f"获取图片资源失败: {result}")
                        raise Exception(f"获取图片资源失败: {result}")
                    return await img_response.content.read()
