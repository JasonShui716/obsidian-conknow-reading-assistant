from src.feishu_bot import FeishuBot
from config.config import Config
from fastapi import FastAPI, Request, HTTPException
import sys
import os
import logging
import traceback

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

app = FastAPI()
bot = FeishuBot()

@app.post("/webhook/feishu")
async def feishu_webhook(request: Request):
    """
    处理飞书事件回调
    """
    try:
        # 获取请求头中的验证信息
        timestamp = request.headers.get("X-Lark-Request-Timestamp", "")
        nonce = request.headers.get("X-Lark-Request-Nonce", "")
        signature = request.headers.get("X-Lark-Signature", "")

        # 获取请求体
        event = await request.json()
        logger.info(f"Received event: {event}")

        # 处理飞书服务器的验证请求
        if event.get("type") == "url_verification":
            challenge = event.get("challenge", "")
            logger.info("Handling URL verification request")
            return {"challenge": challenge}

        # # 验证请求是否来自飞书
        # print(event.get("token"))
        # if event.get("token") != Config.FEISHU_VERIFICATION_TOKEN:
        #     logger.error("Invalid verification token")
        #     raise HTTPException(
        #         status_code=401, 
        #         detail={
        #             "error": "Invalid verification token",
        #             "error_description": "The provided verification token does not match"
        #         }
        #     )

        # 处理消息事件
        if event.get("header").get("event_type") == "im.message.receive_v1":
            logger.info("Processing message event")
            event_data = event.get("event")
            if not event_data:
                logger.error("No event data found in the message")
                return {"code": 0, "msg": "success"}

            message_type = event_data.get("message", {}).get("message_type")
            logger.info(f"Received message type: {message_type}")

            # 处理所有消息
            logger.info("Processing message")
            await bot.handle_message(event)
            
            return {"code": 0, "msg": "success"}

        return {"code": 0, "msg": "success"}

    except HTTPException as he:
        logger.error(f"HTTP Exception: {str(he)}")
        raise he
    except Exception as e:
        error_detail = {
            "error": str(e),
            "error_trace": traceback.format_exc(),
            "error_type": type(e).__name__
        }
        logger.error(f"Unexpected error: {error_detail}")
        raise HTTPException(
            status_code=500,
            detail=error_detail
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=True
    )
