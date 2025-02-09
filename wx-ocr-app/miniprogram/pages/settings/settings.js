// 默认设置
const DEFAULT_SETTINGS = {
  TEXTIN_API_URL: 'https://api.textin.com/ai/service/v2/recognize',
  TEXTIN_API_ID: '',
  TEXTIN_API_SECRET: '',
  AI_BASE_URL: 'https://api.deepseek.com/v1',
  AI_API_KEY: '',
  AI_MODEL: 'deepseek-reasoner',
  AI_SYSTEM_PROMPT: '你是一个专业的文档分析助手，请帮我分析识别出的文字内容，提供重要信息摘要。'
}

Page({
  data: {
    settings: {...DEFAULT_SETTINGS}
  },

  onLoad() {
    this.loadSettings()
  },

  // 加载设置
  loadSettings() {
    const settings = wx.getStorageSync('app_settings')
    if (settings) {
      this.setData({
        settings: {...DEFAULT_SETTINGS, ...settings}
      })
    }
  },

  // 处理输入
  handleInput(e) {
    const { key } = e.currentTarget.dataset
    const { value } = e.detail
    
    this.setData({
      [`settings.${key}`]: value
    })
  },

  // 保存设置
  async saveSettings() {
    try {
      // 验证必填项
      const requiredFields = [
        'TEXTIN_API_URL',
        'TEXTIN_API_ID',
        'TEXTIN_API_SECRET',
        'AI_BASE_URL',
        'AI_API_KEY',
        'AI_MODEL'
      ]

      for (const field of requiredFields) {
        if (!this.data.settings[field]) {
          throw new Error(`请填写${field.replace(/_/g, ' ').toLowerCase()}`)
        }
      }

      // 保存设置
      await wx.setStorage({
        key: 'app_settings',
        data: this.data.settings
      })

      wx.showToast({
        title: '设置已保存',
        icon: 'success'
      })

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      wx.showToast({
        title: error.message,
        icon: 'none'
      })
    }
  }
}) 