Page({
  data: {
    formData: {
      name: '',
      image: '',
      sellingPoint: '',
      price: ''
    },
    submitting: false,
    isEdit: false,
    productId: ''
  },

  onLoad(options) {
    if (options.id && options.mode === 'edit') {
      this.setData({
        isEdit: true,
        productId: options.id
      });
      wx.setNavigationBarTitle({
        title: '编辑产品'
      });
      this.loadProductData(options.id);
    }
  },

  // 加载产品数据（编辑模式）
  loadProductData(productId) {
    const db = wx.cloud.database();
    
    db.collection('products')
      .doc(productId)
      .get()
      .then(res => {
        console.log('获取产品详情成功：', res);
        this.setData({
          formData: {
            name: res.data.name || '',
            image: res.data.image || '',
            sellingPoint: res.data.sellingPoint || '',
            price: res.data.price || ''
          }
        });
      })
      .catch(error => {
        console.error('获取产品详情失败：', error);
        wx.showToast({
          title: '获取产品信息失败',
          icon: 'none'
        });
      });
  },

  // 产品名称输入
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    });
  },

  // 产品卖点输入
  onSellingPointInput(e) {
    this.setData({
      'formData.sellingPoint': e.detail.value
    });
  },

  // 产品售价输入
  onPriceInput(e) {
    this.setData({
      'formData.price': e.detail.value
    });
  },

  // 选择图片
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.uploadImage(tempFilePath);
      },
      fail: (error) => {
        console.error('选择图片失败：', error);
      }
    });
  },

  // 上传图片到云存储
  uploadImage(filePath) {
    wx.showLoading({
      title: '上传中...'
    });

    const cloudPath = `products/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
    
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: (res) => {
        console.log('图片上传成功：', res);
        this.setData({
          'formData.image': res.fileID
        });
        wx.hideLoading();
        wx.showToast({
          title: '图片上传成功',
          icon: 'success'
        });
      },
      fail: (error) => {
        console.error('图片上传失败：', error);
        wx.hideLoading();
        wx.showToast({
          title: '图片上传失败',
          icon: 'none'
        });
      }
    });
  },

  // 表单验证
  validateForm() {
    const { name, sellingPoint } = this.data.formData;
    
    if (!name.trim()) {
      wx.showToast({
        title: '请输入产品名称',
        icon: 'none'
      });
      return false;
    }
    
    if (!sellingPoint.trim()) {
      wx.showToast({
        title: '请输入产品卖点',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  // 提交表单
  onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.setData({ submitting: true });

    const app = getApp();
    const openid = app.globalData.openid;
    
    if (!openid) {
      // 如果没有openid，先获取
      wx.cloud.callFunction({
        name: 'getOpenId',
        success: (res) => {
          app.globalData.openid = res.result.openid;
          this.saveProduct(res.result.openid);
        },
        fail: (error) => {
          console.error('获取openid失败：', error);
          wx.showToast({
            title: '获取用户信息失败',
            icon: 'none'
          });
          this.setData({ submitting: false });
        }
      });
    } else {
      this.saveProduct(openid);
    }
  },

  // 保存产品到数据库
  saveProduct(openid) {
    const db = wx.cloud.database();
    const { name, image, sellingPoint, price } = this.data.formData;
    
    const productData = {
      name: name.trim(),
      image: image,
      sellingPoint: sellingPoint.trim(),
      price: price || '0'
    };

    if (this.data.isEdit) {
      // 更新产品
      productData.updateTime = new Date();
      
      db.collection('products')
        .doc(this.data.productId)
        .update({
          data: productData
        })
        .then(res => {
          console.log('产品更新成功：', res);
          wx.showToast({
            title: '产品更新成功',
            icon: 'success'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        })
        .catch(error => {
          console.error('产品更新失败：', error);
          wx.showToast({
            title: '产品更新失败',
            icon: 'none'
          });
        })
        .finally(() => {
          this.setData({ submitting: false });
        });
    } else {
      // 新增产品
      productData.createTime = new Date();
      
      db.collection('products')
        .add({
          data: productData
        })
        .then(res => {
          console.log('产品保存成功：', res);
          wx.showToast({
            title: '产品保存成功',
            icon: 'success'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        })
        .catch(error => {
          console.error('产品保存失败：', error);
          wx.showToast({
            title: '产品保存失败',
            icon: 'none'
          });
        })
        .finally(() => {
          this.setData({ submitting: false });
        });
    }
  },

  // 删除产品
  onDelete() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个产品吗？删除后无法恢复。',
      success: (res) => {
        if (res.confirm) {
          this.deleteProduct();
        }
      }
    });
  },

  // 执行删除操作
  deleteProduct() {
    const db = wx.cloud.database();
    
    db.collection('products')
      .doc(this.data.productId)
      .remove()
      .then(res => {
        console.log('产品删除成功：', res);
        wx.showToast({
          title: '产品删除成功',
          icon: 'success'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      })
      .catch(error => {
        console.error('产品删除失败：', error);
        wx.showToast({
          title: '产品删除失败',
          icon: 'none'
        });
      });
  }
});