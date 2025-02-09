// 默认配置
const DEFAULT_CONFIG = {
  TEXTIN_API_URL: 'https://api.textin.com/ai/service/v2/recognize',
  TEXTIN_API_ID: '',
  TEXTIN_API_SECRET: '',
  AI_BASE_URL: 'https://api.deepseek.com/v1',
  AI_API_KEY: '',
  AI_MODEL: 'deepseek-reasoner',
  AI_SYSTEM_PROMPT: '你是一个专业的文档分析助手，请帮我分析识别出的文字内容，提供重要信息摘要。'
}

// 获取配置
function getConfig() {
  const settings = wx.getStorageSync('app_settings')
  return settings ? {...DEFAULT_CONFIG, ...settings} : DEFAULT_CONFIG
}

export default {
  get TEXTIN_API_URL() { return getConfig().TEXTIN_API_URL },
  get TEXTIN_API_ID() { return getConfig().TEXTIN_API_ID },
  get TEXTIN_API_SECRET() { return getConfig().TEXTIN_API_SECRET },
  get AI_BASE_URL() { return getConfig().AI_BASE_URL },
  get AI_API_KEY() { return getConfig().AI_API_KEY },
  get AI_MODEL() { return getConfig().AI_MODEL },
  get AI_SYSTEM_PROMPT() { return getConfig().AI_SYSTEM_PROMPT },

  // 服务器配置
  SERVER_URL: '你的服务器URL',  // 用于处理OCR和AI请求的服务器
} 