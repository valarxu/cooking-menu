const app = getApp()

Page({
  data: {
    selectedVideo: null,
    isUploading: false,
    digitalHumanList: [],
    hasUserInfo: false
  },

  async onLoad() {
    await this.checkUserInfo()
  },

  async onShow() {},

  // 检查用户信息
  checkUserInfo() {
    console.log('检查用户信息:', app.globalData.userInfo)
    if (app.globalData.userInfo) {
      this.setData({
        hasUserInfo: true
      })
      this.getDigitalHumanList()
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

  // 选择视频
  chooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      success: (res) => {
        this.setData({
          selectedVideo: res.tempFiles[0]
        })
      }
    })
  },

  // 上传视频
  async uploadVideo() {
    if (!this.data.selectedVideo) {
      wx.showToast({
        title: '请先选择视频',
        icon: 'none'
      })
      return
    }

    if (!this.data.hasUserInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    this.setData({
      isUploading: true
    })

    try {
      // 上传视频到云存储
      await this.uploadVideoToCloud()

      wx.showToast({
        title: '上传成功',
        icon: 'success'
      })

      // 清空表单
      this.setData({
        selectedVideo: null
      })

      // 刷新视频列表
      await this.getDigitalHumanList()

    } catch (error) {
      console.error('上传视频失败:', error)
      wx.showToast({
        title: '上传失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({
        isUploading: false
      })
    }
  },

  // 上传视频到云存储
  uploadVideoToCloud() {
    return new Promise((resolve, reject) => {
      const fileName = `digitalHumanVideos/${app.globalData.userInfo._openid}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`

      wx.cloud.uploadFile({
        cloudPath: fileName,
        filePath: this.data.selectedVideo.tempFilePath,
        success: res => {
          console.log('视频上传成功:', res)
          // 保存到数据库
          const db = wx.cloud.database()
          db.collection('digitalHumanVideos').add({
            data: {
              fileID: res.fileID,
              name: `视频_${new Date().getTime()}`,
              size: (this.data.selectedVideo.size / (1024 * 1024)).toFixed(1),
              duration: this.data.selectedVideo.duration || 0,
              uploadTime: db.serverDate(),
              user_id: app.globalData.userInfo._openid
            },
            success: () => {
              console.log('数据库保存成功')
              resolve(res.fileID)
            },
            fail: (dbErr) => {
              console.error('数据库保存失败:', dbErr)
              reject(dbErr)
            }
          })
        },
        fail: err => {
          console.error('视频上传失败:', err)
          reject(err)
        }
      })
    })
  },

  // 刷新视频列表
  async refreshVideoList() {
    wx.showLoading({ title: '刷新中...' })

    try {
      await this.getDigitalHumanList()
      wx.showToast({ title: '刷新完成', icon: 'success' })
    } catch (error) {
      console.error('刷新视频列表失败:', error)
      wx.showToast({ title: '刷新失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 获取视频列表
  async getDigitalHumanList() {
    try {
      const app = getApp()
      const db = wx.cloud.database()

      const res = await db.collection('digitalHumanVideos')
        .where({
          user_id: app.globalData.userInfo._openid
        })
        .orderBy('uploadTime', 'desc')
        .get()

      console.log('获取视频列表:', res.data)

      // 处理数据，为每个视频添加格式化的时间
      const digitalHumanList = res.data.map(item => {
        return {
          ...item,
          uploadTimeFormatted: this.formatDate(item.uploadTime)
        }
      })

      this.setData({
        digitalHumanList: digitalHumanList
      })

    } catch (error) {
      console.error('获取视频列表失败:', error)
      wx.showToast({ title: '获取列表失败', icon: 'none' })
    }
  },

  // 格式化日期
  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  },

  // 重新选择视频
  reChooseVideo() {
    this.chooseVideo()
  },

  // 删除视频
  deleteVideo(e) {
    const { id, fileid } = e.currentTarget.dataset
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个视频吗？删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#ff4757',
      success: (res) => {
        if (res.confirm) {
          this.performDelete(id, fileid)
        }
      }
    })
  },

  // 执行删除操作
  async performDelete(id, fileID) {
    wx.showLoading({ title: '删除中...' })
    
    try {
      const db = wx.cloud.database()
      
      // 删除数据库记录
      await db.collection('digitalHumanVideos').doc(id).remove()
      
      // 删除云存储文件
      await wx.cloud.deleteFile({
        fileList: [fileID]
      })
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      
      // 刷新列表
      await this.getDigitalHumanList()
      
    } catch (error) {
      console.error('删除视频失败:', error)
      wx.showToast({
        title: '删除失败，请重试',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.refreshVideoList().then(() => {
      wx.stopPullDownRefresh()
    })
  },
})