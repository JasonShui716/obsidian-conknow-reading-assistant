class Config:
    # 飞书机器人配置
    FEISHU_APP_ID = "your-app-id"  # 飞书应用 App ID
    FEISHU_APP_SECRET = "your-app-secret"  # 飞书应用 App Secret
    FEISHU_VERIFICATION_TOKEN = "your-verification-token"  # 飞书事件订阅的 Verification Token
    FEISHU_ENCRYPT_KEY = "your-encrypt-key"  # 飞书事件订阅的加密密钥

    # Obsidian Vault 配置
    OBSIDIAN_VAULT_PATH = "/path/to/your/vault"  # Obsidian vault 根目录
    OBSIDIAN_ATTACHMENT_DIR = "attachments"  # 附件目录
    OBSIDIAN_SYNC_DIR = "sync"  # 同步目录
    OBSIDIAN_ENABLED = True  # 是否启用 Obsidian 同步

    # Textin OCR 配置
    TEXTIN_API_URL = "https://api.textin.com/ai/service/v1/pdf_to_markdown"
    TEXTIN_API_ID = "your-textin-api-id"  # Textin API ID
    TEXTIN_API_SECRET = "your-textin-api-secret"  # Textin API Secret

    # AI 配置
    AI_BASE_URL = "https://api.deepseek.com/v1"
    AI_API_KEY = "your-ai-api-key"
    AI_MODEL = "deepseek-chat"
    AI_SYSTEM_PROMPT = "请对以下内容进行分析和解读，给出关键信息总结和见解："
    AUTO_AI_ANALYSIS = True  # 是否自动对文本进行AI解析

    # 服务配置
    HOST = "0.0.0.0"
    PORT = 7000
