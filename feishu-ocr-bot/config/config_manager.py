import json
import os
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class ConfigManager:
    def __init__(self, config_file: str = "config/runtime_config.json"):
        self.config_file = config_file
        self.config = self.load_config()

    def load_config(self) -> Dict[str, Any]:
        """加载配置文件"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                logger.warning(f"配置文件 {self.config_file} 不存在，将使用默认配置")
                return {
                    "ai_base_url": "https://api.deepseek.com/v1",
                    "ai_api_key": "",
                    "ai_model": "deepseek-chat",
                    "ai_system_prompt": "请对以下内容进行分析和解读，给出关键信息总结和见解：",
                    "auto_ai_analysis": True
                }
        except Exception as e:
            logger.error(f"加载配置文件失败: {e}")
            return {}

    def save_config(self) -> bool:
        """保存配置到文件"""
        try:
            # 确保配置文件所在目录存在
            os.makedirs(os.path.dirname(self.config_file), exist_ok=True)
            
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, ensure_ascii=False, indent=4)
            return True
        except Exception as e:
            logger.error(f"保存配置文件失败: {e}")
            return False

    def get(self, key: str, default: Any = None) -> Any:
        """获取配置项"""
        return self.config.get(key, default)

    def set(self, key: str, value: Any) -> bool:
        """设置配置项并保存"""
        self.config[key] = value
        return self.save_config()

    def update(self, updates: Dict[str, Any]) -> bool:
        """批量更新配置项并保存"""
        self.config.update(updates)
        return self.save_config() 