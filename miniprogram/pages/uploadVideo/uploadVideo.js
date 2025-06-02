const app = getApp()

Page({
  data: {
    videoFile: null,
    videoName: '',
    videoType: '',
    relatedProduct: '',
    typeOptions: [
      { value: '店铺环境', label: '店铺环境' },
      { value: '产品外观', label: '产品外观' },
      { value: '智能锁', label: '智能锁' },
      { value: '锁心', label: '锁心' },
      { value: '密封胶条', label: '密封胶条' },
      { value: '内部填充', label: '内部填充' },
      { value: '安全等级', label: '安全等级' },
      { value: '案例呈现', label: '案例呈现' }
    ],
    products: [],
    showTypePicker: false,
    showProductPicker: false,
    selectedTypeIndex: 0,
    selectedProductIndex: 0
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

  onLoad() {
    this.loadProducts()
  },

  onInputName(e) {
    this.setData({ videoName: e.detail.value })
  },

  // 加载用户产品列表
  loadProducts() {
    const app = getApp()
    const openid = app.globalData.openid
    
    if (!openid) {
      wx.cloud.callFunction({
        name: 'getOpenId',
        success: (res) => {
          app.globalData.openid = res.result.openid
          this.fetchProducts(res.result.openid)
        },
        fail: (error) => {
          console.error('获取openid失败：', error)
        }
      })
    } else {
      this.fetchProducts(openid)
    }
  },

  // 获取产品列表
  fetchProducts(openid) {
    const db = wx.cloud.database()
    
    db.collection('products')
      .where({
        _openid: openid
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        console.log('获取产品列表成功：', res)
        this.setData({
          products: res.data
        })
      })
      .catch(error => {
        console.error('获取产品列表失败：', error)
      })
  },

  // 显示类型选择器
  showTypePicker() {
    this.setData({ showTypePicker: true })
  },

  // 类型选择器变化
  onTypePickerChange(e) {
    this.setData({
      selectedTypeIndex: e.detail.value[0]
    })
  },

  // 类型选择器确认
  onTypePickerConfirm(e) {
    const index = this.data.selectedTypeIndex || 0
    this.setData({
      videoType: this.data.typeOptions[index].value,
      showTypePicker: false
    })
  },

  // 类型选择器取消
  onTypePickerCancel() {
    this.setData({ showTypePicker: false })
  },

  // 显示产品选择器
  showProductPicker() {
    this.setData({ showProductPicker: true })
  },

  // 产品选择器变化
  onProductPickerChange(e) {
    this.setData({
      selectedProductIndex: e.detail.value[0]
    })
  },

  // 产品选择器确认
  onProductPickerConfirm(e) {
    const index = this.data.selectedProductIndex || 0
    if (this.data.products[index]) {
      this.setData({
        relatedProduct: this.data.products[index]._id,
        showProductPicker: false
      })
    }
  },

  // 产品选择器取消
  onProductPickerCancel() {
    this.setData({ showProductPicker: false })
  },

  uploadVideo() {
    const { videoFile, videoName, videoType, relatedProduct } = this.data
    if (!videoFile) {
      wx.showToast({ title: '请先选择视频', icon: 'none' })
      return
    }
    if (!videoName.trim()) {
      wx.showToast({ title: '请输入视频名称', icon: 'none' })
      return
    }
    if (!videoType) {
      wx.showToast({ title: '请选择视频类型', icon: 'none' })
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
            type: videoType,
            relatedProduct: relatedProduct || null,
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