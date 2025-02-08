import aiohttp
import base64
from config.config import Config


class OCRService:
    def __init__(self):
        self.api_url = Config.TEXTIN_API_URL
        self.api_id = Config.TEXTIN_API_ID
        self.api_secret = Config.TEXTIN_API_SECRET

    async def process_image(self, image_data: bytes) -> str:
        """
        处理图片并返回OCR结果
        :param image_data: 图片二进制数据
        :return: OCR识别结果文本
        """
        headers = {
            'Content-Type': 'application/octet-stream',
            'x-ti-app-id': self.api_id,
            'x-ti-secret-code': self.api_secret
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    headers=headers,
                    data=image_data
                ) as response:
                    if response.status != 200:
                        raise Exception(f"OCR API请求失败: {response.status}")

                    result = await response.json()
                    if result.get('code') != 200:
                        raise Exception(f"OCR处理失败: {result.get('message')}")

                    return result['result']['markdown']
        except Exception as e:
            raise Exception(f"OCR处理出错: {str(e)}")

    async def process_image_url(self, image_url: str) -> str:
        """
        处理图片URL并返回OCR结果
        :param image_url: 图片URL
        :return: OCR识别结果文本
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(image_url) as response:
                    if response.status != 200:
                        raise Exception(f"下载图片失败: {response.status}")
                    image_data = await response.read()
                    return await self.process_image(image_data)
        except Exception as e:
            raise Exception(f"处理图片URL出错: {str(e)}")
