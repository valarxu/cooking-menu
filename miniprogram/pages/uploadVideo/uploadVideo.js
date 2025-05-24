const app = getApp()

Page({
  data: {
    videoFile: null,
    videoName: ''
  },

  chooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      success: (res) => {
        this.setData({
          videoFile: res.tempFiles[0]
        })
      }
    })
  },

  onInputName(e) {
    this.setData({ videoName: e.detail.value })
  },

  uploadVideo() {
    const { videoFile, videoName } = this.data
    if (!videoFile) {
      wx.showToast({ title: '请先选择视频', icon: 'none' })
      return
    }
    if (!videoName.trim()) {
      wx.showToast({ title: '请输入视频名称', icon: 'none' })
      return
    }
    wx.showLoading({ title: '上传中...' })
    const cloudPath = `videos/${app.globalData.userInfo._openid}/${Date.now()}-${videoFile.tempFilePath.split('/').pop()}`
    wx.cloud.uploadFile({
      cloudPath,
      filePath: videoFile.tempFilePath,
      success: (uploadRes) => {
        const db = wx.cloud.database()
        db.collection('videos').add({
          data: {
            fileID: uploadRes.fileID,
            name: videoName,
            size: videoFile.size,
            duration: videoFile.duration,
            uploadTime: db.serverDate()
          },
          success: () => {
            wx.hideLoading()
            wx.showToast({ title: '上传成功', icon: 'success' })
            setTimeout(() => {
              wx.navigateBack()
            }, 1000)
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '数据库保存失败', icon: 'none' })
          }
        })
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '上传失败', icon: 'none' })
      }
    })
  }
}) 