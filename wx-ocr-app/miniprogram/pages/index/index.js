import ocrService from '../../services/ocrService'

Page({
  data: {
    tempImagePath: '',
    isProcessing: false
  },

  // 选择图片
  async chooseImage(e) {
    const source = e.currentTarget.dataset.source
    try {
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: [source],
        sizeType: ['compressed']
      })

      this.setData({
        tempImagePath: res.tempFiles[0].tempFilePath
      })
    } catch (error) {
      console.error('选择图片失败:', error)
      wx.showToast({
        title: '选择图片失败',
        icon: 'none'
      })
    }
  },

  // 重新选择
  reselect() {
    this.setData({
      tempImagePath: ''
    })
  },

  // 开始OCR识别
  async startOCR() {
    if (this.data.isProcessing) return

    // 检查是否已配置API
    const settings = wx.getStorageSync('app_settings')
    if (!settings?.TEXTIN_API_ID || !settings?.TEXTIN_API_SECRET) {
      wx.showModal({
        title: '提示',
        content: '请先在设置中配置TextIn API信息',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/settings/settings'
            })
          }
        }
      })
      return
    }

    this.setData({ isProcessing: true })
    wx.showLoading({ title: '正在识别...' })

    try {
      const result = await ocrService.processImage(this.data.tempImagePath)
      
      // 将结果保存到本地存储
      const history = wx.getStorageSync('ocr_history') || []
      history.unshift({
        id: Date.now(),
        image: this.data.tempImagePath,
        result: result,
        timestamp: new Date().toISOString()
      })
      wx.setStorageSync('ocr_history', history)

      // 跳转到结果页面
      wx.navigateTo({
        url: `/pages/result/result?id=${history[0].id}`
      })
    } catch (error) {
      console.error('OCR识别失败:', error)
      wx.showToast({
        title: error.message || 'OCR识别失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isProcessing: false })
      wx.hideLoading()
    }
  },

  // 跳转到历史记录
  goToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    })
  },

  // 跳转到设置页面
  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  }
}) 