import config from '../config/config'

class OCRService {
  constructor() {
    this.apiUrl = config.TEXTIN_API_URL
    this.apiId = config.TEXTIN_API_ID
    this.apiSecret = config.TEXTIN_API_SECRET
  }

  // 处理本地图片
  async processImage(filePath) {
    try {
      // 将本地图片转换为二进制数据
      const fileSystemManager = wx.getFileSystemManager()
      const fileData = fileSystemManager.readFileSync(filePath)

      // 直接调用TextIn OCR API
      const result = await this._callOCRAPI(fileData)
      return result.markdown
    } catch (error) {
      console.error('OCR处理出错:', error)
      throw new Error(`OCR处理失败: ${error.message}`)
    }
  }

  // 处理网络图片
  async processImageUrl(imageUrl) {
    try {
      // 下载网络图片
      const downloadResult = await this._downloadImage(imageUrl)
      return await this.processImage(downloadResult.tempFilePath)
    } catch (error) {
      console.error('处理网络图片出错:', error)
      throw new Error(`处理图片URL失败: ${error.message}`)
    }
  }

  // 私有方法：调用OCR API
  async _callOCRAPI(imageData) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: this.apiUrl,
        method: 'POST',
        header: {
          'x-ti-app-id': this.apiId,
          'x-ti-secret-code': this.apiSecret,
          'Content-Type': 'application/octet-stream'
        },
        data: imageData,
        success: (res) => {
          if (res.statusCode === 200 && res.data.code === 200) {
            resolve(res.data.result)
          } else {
            reject(new Error(res.data.message || 'OCR处理失败'))
          }
        },
        fail: (error) => {
          reject(error)
        }
      })
    })
  }

  // 私有方法：下载网络图片
  async _downloadImage(imageUrl) {
    return new Promise((resolve, reject) => {
      wx.downloadFile({
        url: imageUrl,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res)
          } else {
            reject(new Error('下载图片失败'))
          }
        },
        fail: (error) => {
          reject(error)
        }
      })
    })
  }
}

export default new OCRService() 