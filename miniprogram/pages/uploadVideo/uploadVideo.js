const app = getApp()

Page({
  data: {
    videoFile: null,
    videoName: '',
    videoType: '',
    relatedProduct: '',
    relatedProductName: '',
    typeOptions: [
      { label: '店铺环境', value: '店铺环境' },
      { label: '产品外观', value: '产品外观' },
      { label: '智能锁', value: '智能锁' },
      { label: '锁心', value: '锁心' },
      { label: '密封胶条', value: '密封胶条' },
      { label: '内部填充', value: '内部填充' },
      { label: '安全等级', value: '安全等级' },
      { label: '案例呈现', value: '案例呈现' }
    ],
    selectedTypeIndex: 0,
    showTypePicker: false,
    showProductPicker: false,
    selectedProductIndex: 0,
    products: [],
    isEditMode: false,
    editVideoId: '',
    originalVideoData: null,
    originalFormData: null
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

  onLoad(options) {
    this.loadProducts()
    
    // 检查是否为编辑模式
    if (options.mode === 'edit' && options.videoId) {
      const videoName = decodeURIComponent(options.name || '')
      const videoType = decodeURIComponent(options.type || '')
      const relatedProduct = options.relatedProduct || ''
      
      this.setData({
        isEditMode: true,
        editVideoId: options.videoId,
        videoName: videoName,
        videoType: videoType,
        relatedProduct: relatedProduct,
        selectedTypeIndex: this.data.typeOptions.findIndex(item => item.value === videoType),
        // 保存原始表单数据用于变动检测
        originalFormData: {
          name: videoName,
          type: videoType,
          relatedProduct: relatedProduct
        }
      })
      
      // 加载原始视频数据
      this.loadOriginalVideoData()
    }
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
        
        // 如果是编辑模式且已有关联产品，设置产品信息
        if (this.data.isEditMode && this.data.relatedProduct && res.data.length > 0) {
          const product = res.data.find(p => p._id === this.data.relatedProduct)
          if (product) {
            this.setData({
              relatedProductName: product.name,
              selectedProductIndex: res.data.findIndex(p => p._id === this.data.relatedProduct)
            })
          }
        }
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
    console.log("selectedProductIndex", e.detail.value[0])
  },

  // 产品选择器确认
  onProductPickerConfirm(e) {
    const index = this.data.selectedProductIndex || 0
    if (this.data.products[index]) {
      this.setData({
        relatedProduct: this.data.products[index]._id,
        showProductPicker: false,
        relatedProductName: this.data.products[index].name
      })
    }
  },

  // 产品选择器取消
  onProductPickerCancel() {
    this.setData({ showProductPicker: false })
  },

  // 加载原始视频数据
  loadOriginalVideoData() {
    if (!this.data.editVideoId) return
    
    const db = wx.cloud.database()
    db.collection('videos')
      .doc(this.data.editVideoId)
      .get()
      .then(res => {
        console.log('获取视频详情成功：', res)
        const videoData = res.data
        
        this.setData({
          originalVideoData: {
            fileID: videoData.fileID,
            size: videoData.size,
            duration: videoData.duration
          },
          // 设置videoFile以显示原视频
          videoFile: {
            tempFilePath: videoData.fileID,
            size: videoData.size,
            duration: videoData.duration
          }
        })
      })
      .catch(error => {
        console.error('获取视频详情失败：', error)
        wx.showToast({
          title: '获取视频信息失败',
          icon: 'none'
        })
      })
  },

  uploadVideo() {
    if (this.data.isEditMode) {
      this.updateVideo()
    } else {
      this.createVideo()
    }
  },

  // 创建新视频
  createVideo() {
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
  },

  // 检查是否有变动
  hasChanges() {
    const { videoName, videoType, relatedProduct, videoFile, originalVideoData } = this.data
    const originalData = this.data.originalFormData
    
    // 检查基本信息是否有变动
    if (videoName !== originalData.name || 
        videoType !== originalData.type || 
        relatedProduct !== originalData.relatedProduct) {
      return true
    }
    
    // 检查是否更换了视频文件
    if (videoFile && videoFile.tempFilePath !== originalVideoData.fileID) {
      return true
    }
    
    return false
  },

  // 更新视频信息
  async updateVideo() {
    const { videoName, videoType, relatedProduct, videoFile, originalVideoData } = this.data
    
    if (!videoName.trim()) {
      wx.showToast({ title: '请输入视频名称', icon: 'none' })
      return
    }
    if (!videoType) {
      wx.showToast({ title: '请选择视频类型', icon: 'none' })
      return
    }
    
    // 检查是否有变动
    if (!this.hasChanges()) {
      wx.showToast({ title: '信息未发生变动', icon: 'none' })
      return
    }

    wx.showLoading({ title: '更新中...' })
    
    try {
      const db = wx.cloud.database()
      let updateData = {
        name: videoName,
        type: videoType,
        relatedProduct: relatedProduct || null,
        updateTime: db.serverDate()
      }
      
      // 如果选择了新视频文件，需要上传新文件并删除旧文件
      if (videoFile && videoFile.tempFilePath !== originalVideoData.fileID) {
        const cloudPath = `videos/${app.globalData.userInfo._openid}/${Date.now()}-${videoFile.tempFilePath.split('/').pop()}`
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath: videoFile.tempFilePath
        })
        
        updateData.fileID = uploadRes.fileID
        updateData.size = videoFile.size
        updateData.duration = videoFile.duration
        
        // 删除旧文件
        if (originalVideoData.fileID) {
          await wx.cloud.deleteFile({
            fileList: [originalVideoData.fileID]
          })
        }
      }
      
      // 更新数据库记录
      await db.collection('videos').doc(this.data.editVideoId).update({
        data: updateData
      })
      
      wx.hideLoading()
      wx.showToast({ title: '更新成功', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1000)
      
    } catch (error) {
      console.error('更新视频失败：', error)
      wx.hideLoading()
      wx.showToast({ title: '更新失败，请重试', icon: 'none' })
    }
  },

  // 删除视频
  deleteVideo() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个视频吗？删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#ff4757',
      success: (res) => {
        if (res.confirm) {
          this.performDeleteVideo()
        }
      }
    })
  },

  // 执行删除操作
  async performDeleteVideo() {
    wx.showLoading({ title: '删除中...' })
    
    try {
      const db = wx.cloud.database()
      const { originalVideoData, editVideoId } = this.data
      
      // 删除云存储中的视频文件
      if (originalVideoData.fileID) {
        await wx.cloud.deleteFile({
          fileList: [originalVideoData.fileID]
        })
      }
      
      // 删除数据库记录
      await db.collection('videos').doc(editVideoId).remove()
      
      wx.hideLoading()
      wx.showToast({ title: '删除成功', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1000)
      
    } catch (error) {
      console.error('删除视频失败：', error)
      wx.hideLoading()
      wx.showToast({ title: '删除失败，请重试', icon: 'none' })
    }
  }
})