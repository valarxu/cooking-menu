const app = getApp()

Page({
  data: {
    videoList: [],
    hasUserInfo: false,
    showNameInput: false,
    inputName: '',
    pendingVideoFile: null
  },

  onLoad() {
    this.checkUserInfo()
  },

  onShow() {
    this.checkUserInfo()
  },

  // 检查用户信息
  checkUserInfo() {
    console.log('检查用户信息:', app.globalData.userInfo)
    if (app.globalData.userInfo) {
      this.setData({
        hasUserInfo: true
      })
      this.getVideoList()
    } else {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000,
        success: () => {
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/mine/mine'
            })
          }, 2000)
        }
      })
    }
  },

  // 获取视频列表
  async getVideoList() {
    try {
      const db = wx.cloud.database()
      const _ = db.command
      console.log('开始获取视频列表，用户openid:', app.globalData.userInfo._openid)
      
      const res = await db.collection('videos')
        .where({
          _openid: app.globalData.userInfo._openid
        })
        .orderBy('uploadTime', 'desc')
        .get()
      
      console.log('获取到的视频列表:', res.data)
      
      // 处理视频列表数据
      const videoList = res.data.map(video => ({
        ...video,
        uploadTime: this.formatDate(video.uploadTime)
      }))
      
      this.setData({
        videoList: videoList
      })
    } catch (err) {
      console.error('获取视频列表失败：', err)
      wx.showToast({
        title: '获取视频列表失败',
        icon: 'none'
      })
    }
  },

  // 格式化日期
  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  },

  // 点击上传视频按钮
  async chooseVideo() {
    if (!this.data.hasUserInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    try {
      const { tempFiles } = await wx.chooseMedia({
        count: 1,
        mediaType: ['video'],
        sourceType: ['album', 'camera'],
        maxDuration: 60,
        camera: 'back'
      })
      const videoFile = tempFiles[0]
      this.setData({
        pendingVideoFile: videoFile,
        showNameInput: true,
        inputName: ''
      })
    } catch (err) {
      // 用户取消选择不提示
    }
  },

  // 输入框输入
  onInputName(e) {
    this.setData({ inputName: e.detail.value })
  },

  // 取消输入
  onNameCancel() {
    this.setData({ showNameInput: false, inputName: '', pendingVideoFile: null })
  },

  // 确认上传
  async onNameUpload() {
    const { inputName, pendingVideoFile } = this.data
    if (!inputName.trim()) {
      wx.showToast({ title: '请输入视频名称', icon: 'none' })
      return
    }
    if (!pendingVideoFile) {
      wx.showToast({ title: '未选择视频', icon: 'none' })
      return
    }
    wx.showLoading({ title: '上传中...' })
    try {
      // 上传视频到云存储
      const cloudPath = `videos/${app.globalData.userInfo._openid}/${Date.now()}-${pendingVideoFile.tempFilePath.split('/').pop()}`
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: pendingVideoFile.tempFilePath
      })
      // 保存视频信息到数据库
      const db = wx.cloud.database()
      await db.collection('videos').add({
        data: {
          fileID: uploadRes.fileID,
          name: inputName,
          size: pendingVideoFile.size,
          duration: pendingVideoFile.duration,
          uploadTime: db.serverDate()
        }
      })
      wx.hideLoading()
      wx.showToast({ title: '上传成功', icon: 'success' })
      this.setData({ showNameInput: false, inputName: '', pendingVideoFile: null })
      this.getVideoList()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '上传失败', icon: 'none' })
      this.setData({ showNameInput: false, inputName: '', pendingVideoFile: null })
    }
  }
}) 