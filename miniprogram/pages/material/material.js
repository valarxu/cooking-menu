const app = getApp()

Page({
  data: {
    videoList: [],
    hasUserInfo: false,
    currentTab: 0,
    tabs: [
      { name: '全部', value: '' },
      { name: '店铺环境', value: '店铺环境' },
      { name: '产品外观', value: '产品外观' },
      { name: '智能锁', value: '智能锁' },
      { name: '锁心', value: '锁心' },
      { name: '密封胶条', value: '密封胶条' },
      { name: '内部填充', value: '内部填充' },
      { name: '安全等级', value: '安全等级' },
      { name: '案例呈现', value: '案例呈现' }
    ],
    filteredVideoList: []
  },

  onLoad() {
    this.checkUserInfo()
  },

  onShow() {
    // 页面显示时重新获取视频列表，确保数据是最新的
    if (this.data.hasUserInfo) {
      this.getVideoList()
    }
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
      
      // 先获取当前用户的所有产品信息
      const productsRes = await db.collection('products')
        .where({
          _openid: app.globalData.userInfo._openid
        })
        .get()
      
      console.log('获取到的产品列表:', productsRes.data)
      
      // 创建产品ID到产品信息的映射
      const productsMap = {}
      productsRes.data.forEach(product => {
        productsMap[product._id] = product
      })
      
      const res = await db.collection('videos')
        .where({
          _openid: app.globalData.userInfo._openid
        })
        .orderBy('uploadTime', 'desc')
        .get()
      
      console.log('获取到的视频列表:', res.data)
      
      // 获取关联产品信息
      const videoList = this.getVideoListWithProducts(res.data, productsMap)
      
      this.setData({
        videoList: videoList
      })
      
      // 过滤视频列表
      this.filterVideoList()
    } catch (err) {
      console.error('获取视频列表失败：', err)
      wx.showToast({
        title: '获取视频列表失败',
        icon: 'none'
      })
    }
  },

  // 获取视频列表及关联产品信息
  getVideoListWithProducts(videos, productsMap) {
    const videoList = []
    
    for (let video of videos) {
      const videoData = {
        ...video,
        uploadTime: this.formatDate(video.uploadTime),
        productName: ''
      }
      
      // 如果有关联产品，从产品映射中获取产品信息
      if (video.relatedProduct && productsMap[video.relatedProduct]) {
        videoData.productName = productsMap[video.relatedProduct].name
      }
      
      videoList.push(videoData)
    }
    
    return videoList
  },

  // 格式化日期
  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  },

  // 切换TAB
  switchTab(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      currentTab: index
    })
    this.filterVideoList()
  },

  // 过滤视频列表
  filterVideoList() {
    const currentTabValue = this.data.tabs[this.data.currentTab].value
    let filteredList = this.data.videoList
    
    if (currentTabValue) {
      filteredList = this.data.videoList.filter(video => video.type === currentTabValue)
    }
    
    this.setData({
      filteredVideoList: filteredList
    })
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
  },

  // 修改视频
  editVideo(e) {
    const video = e.currentTarget.dataset.video
    if (!video) {
      wx.showToast({ title: '视频信息错误', icon: 'none' })
      return
    }
    
    // 跳转到编辑页面，传递视频信息
    wx.navigateTo({
      url: `/pages/uploadVideo/uploadVideo?mode=edit&videoId=${video._id}&name=${encodeURIComponent(video.name)}&type=${encodeURIComponent(video.type || '')}&relatedProduct=${video.relatedProduct || ''}`
    })
  },


})