const app = getApp()

Page({
  data: {
    videoList: [],
    hasUserInfo: false
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
  chooseVideo() {
    if (!this.data.hasUserInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '/pages/uploadVideo/uploadVideo'
    })
  }
}) 