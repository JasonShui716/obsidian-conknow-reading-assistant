Page({
  data: {
    history: []
  },

  onLoad() {
    this.loadHistory()
  },

  onShow() {
    this.loadHistory()
  },

  // 加载历史记录
  loadHistory() {
    const history = wx.getStorageSync('ocr_history') || []
    // 格式化时间
    const formattedHistory = history.map(item => ({
      ...item,
      formattedTime: this.formatTime(new Date(item.timestamp))
    }))
    this.setData({ history: formattedHistory })
  },

  // 格式化时间
  formatTime(date) {
    const now = new Date()
    const diff = now - date

    // 今天内
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `今天 ${hours}:${minutes}`
    }

    // 昨天
    if (diff < 48 * 60 * 60 * 1000) {
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `昨天 ${hours}:${minutes}`
    }

    // 其他日期
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 查看结果
  viewResult(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/result/result?id=${id}`
    })
  },

  // 清空历史
  clearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定要清空所有历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('ocr_history')
          this.setData({ history: [] })
          wx.showToast({
            title: '已清空',
            icon: 'success'
          })
        }
      }
    })
  }
}) 