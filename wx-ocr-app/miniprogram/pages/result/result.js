import config from '../../config/config'

Page({
  data: {
    ocrResult: null,
    analysis: '',
    isAnalyzing: false
  },

  onLoad(options) {
    const { id } = options
    const history = wx.getStorageSync('ocr_history') || []
    const result = history.find(item => item.id === parseInt(id))
    
    if (result) {
      this.setData({ ocrResult: result })
    } else {
      wx.showToast({
        title: '未找到识别结果',
        icon: 'none'
      })
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  // 复制识别文本
  copyText() {
    wx.setClipboardData({
      data: this.data.ocrResult.result,
      success: () => {
        wx.showToast({
          title: '文本已复制',
          icon: 'success'
        })
      }
    })
  },

  // 复制分析结果
  copyAnalysis() {
    if (!this.data.analysis) return
    
    wx.setClipboardData({
      data: this.data.analysis,
      success: () => {
        wx.showToast({
          title: '分析已复制',
          icon: 'success'
        })
      }
    })
  },

  // AI分析文本
  async analyzeText() {
    if (this.data.isAnalyzing) return
    
    this.setData({ isAnalyzing: true })
    wx.showLoading({ title: '正在分析...' })

    try {
      const response = await wx.request({
        url: config.AI_BASE_URL,
        method: 'POST',
        data: {
          model: config.AI_MODEL,
          messages: [
            {
              role: "system",
              content: config.AI_SYSTEM_PROMPT
            },
            {
              role: "user",
              content: this.data.ocrResult.result
            }
          ]
        },
        header: {
          'Authorization': `Bearer ${config.AI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.statusCode === 200) {
        const analysisResult = response.data.choices[0].message.content
        this.setData({ analysis: analysisResult })
        
        // 更新历史记录中的分析结果
        const history = wx.getStorageSync('ocr_history') || []
        const index = history.findIndex(item => item.id === this.data.ocrResult.id)
        if (index !== -1) {
          history[index].analysis = analysisResult
          wx.setStorageSync('ocr_history', history)
        }
      } else {
        throw new Error(response.data.error?.message || '分析失败')
      }
    } catch (error) {
      console.error('AI分析失败:', error)
      wx.showToast({
        title: error.message || 'AI分析失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isAnalyzing: false })
      wx.hideLoading()
    }
  }
}) 