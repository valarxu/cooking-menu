const app = getApp()

Page({
  data: {
    // 文案类型选择
    contentTypes: [
      { id: 'product', name: '产品推广' },
      { id: 'activity', name: '店内活动宣传' },
      { id: 'persona', name: '人设打造' }
    ],
    selectedType: '',
    
    // 商品列表
    products: [],
    selectedProduct: '',
    selectedProductName: '',
    showProductPicker: false,
    
    // 表单数据
    userRequirement: '',
    activityPolicy: '',
    productInfo: '',
    shopInfo: '',
    bossInfo: '',
    
    // 输出结果
    outputText: '',
    loading: false
  },

  onLoad() {
    this.loadProducts()
  },

  // 加载商品列表
  async loadProducts() {
    try {
      const db = wx.cloud.database()
      const openid = app.globalData.userInfo?._openid
      
      if (!openid) {
        console.log('用户未登录，无法获取商品列表')
        return
      }
      
      const res = await db.collection('products')
        .where({
          _openid: openid
        })
        .orderBy('createTime', 'desc')
        .get()
      
      this.setData({
        products: res.data
      })
    } catch (error) {
      console.error('获取商品列表失败：', error)
    }
  },

  // 选择文案类型
  selectContentType(e) {
    const typeId = e.currentTarget.dataset.type
    this.setData({
      selectedType: typeId,
      selectedProduct: '',
      selectedProductName: '',
      userRequirement: '',
      activityPolicy: '',
      productInfo: '',
      shopInfo: '',
      bossInfo: '',
      outputText: ''
    })
  },

  // 显示商品选择器
  showProductSelector() {
    this.setData({
      showProductPicker: true
    })
  },

  // 选择商品
  selectProduct(e) {
    const productId = e.currentTarget.dataset.productId
    const productName = e.currentTarget.dataset.productName
    this.setData({
      selectedProduct: productId,
      selectedProductName: productName,
      showProductPicker: false
    })
  },

  // 关闭商品选择器
  closeProductPicker() {
    this.setData({
      showProductPicker: false
    })
  },

  // 输入用户需求
  onUserRequirementInput(e) {
    this.setData({
      userRequirement: e.detail.value
    })
  },

  // 输入活动优惠政策
  onActivityPolicyInput(e) {
    this.setData({
      activityPolicy: e.detail.value
    })
  },

  // 输入产品信息
  onProductInfoInput(e) {
    this.setData({
      productInfo: e.detail.value
    })
  },

  // 输入店铺信息
  onShopInfoInput(e) {
    this.setData({
      shopInfo: e.detail.value
    })
  },

  // 输入老板信息
  onBossInfoInput(e) {
    this.setData({
      bossInfo: e.detail.value
    })
  },

  // 提交生成文案
  submitGenerate() {
    // 验证表单
    if (!this.data.selectedType) {
      wx.showToast({
        title: '请选择文案类型',
        icon: 'none'
      })
      return
    }

    if (this.data.selectedType === 'product' && !this.data.selectedProduct) {
      wx.showToast({
        title: '请选择商品',
        icon: 'none'
      })
      return
    }

    if (!this.data.userRequirement.trim()) {
      wx.showToast({
        title: '请填写用户需求',
        icon: 'none'
      })
      return
    }

    if (this.data.selectedType === 'activity' && !this.data.activityPolicy.trim()) {
      wx.showToast({
        title: '请填写活动优惠政策',
        icon: 'none'
      })
      return
    }

    if (this.data.selectedType === 'product' && !this.data.productInfo.trim()) {
      wx.showToast({
        title: '请填写产品信息',
        icon: 'none'
      })
      return
    }

    if (this.data.selectedType === 'activity' && !this.data.shopInfo.trim()) {
      wx.showToast({
        title: '请填写店铺信息',
        icon: 'none'
      })
      return
    }

    if (this.data.selectedType === 'persona' && !this.data.bossInfo.trim()) {
      wx.showToast({
        title: '请填写老板信息',
        icon: 'none'
      })
      return
    }

    if (this.data.selectedType === 'persona' && !this.data.shopInfo.trim()) {
      wx.showToast({
        title: '请填写门店信息',
        icon: 'none'
      })
      return
    }

    // 构建工作流参数对象
    const parameters = {
      contentType: this.data.selectedType,
      userRequirement: this.data.userRequirement
    }
    
    const selectedProductInfo = this.data.products.find(p => p._id === this.data.selectedProduct)
    
    if (this.data.selectedType === 'product') {
      parameters.productName = selectedProductInfo?.name || ''
      parameters.productDescription = selectedProductInfo?.description || ''
      parameters.productInfo = this.data.productInfo
    } else if (this.data.selectedType === 'activity') {
      parameters.activityPolicy = this.data.activityPolicy
      parameters.shopInfo = this.data.shopInfo
    } else if (this.data.selectedType === 'persona') {
      parameters.bossInfo = this.data.bossInfo
      parameters.shopInfo = this.data.shopInfo
    }

    this.callWorkflow(parameters)
  },

  // 调用工作流
  callWorkflow(parameters) {
    this.setData({ loading: true })
    
    wx.cloud.callFunction({
      name: 'callCozeWorkflow',
      data: {
        workflow_id: '7512455256439259174',
        parameters: parameters,
        is_async: true
      },
      success: (res) => {
        console.log('云函数调用成功：', res)
        if (res.result.success && res.result.data.code === 0) {
          const executeId = res.result.data.execute_id
          if (executeId) {
            this.pollWorkflowResult('7512455256439259174', executeId)
          } else {
            wx.showToast({
              title: '未获取到执行ID',
              icon: 'none'
            })
            this.setData({ loading: false })
          }
        } else {
          wx.showToast({
            title: res.result.error || '启动工作流失败',
            icon: 'none'
          })
          this.setData({ loading: false })
        }
      },
      fail: (error) => {
        console.error('云函数调用失败：', error)
        wx.showToast({
          title: '请求失败，请重试',
          icon: 'none'
        })
        this.setData({ loading: false })
      }
    })
  },

  // 轮询查询工作流结果
  pollWorkflowResult(workflowId, executeId, maxAttempts = 60) {
    let attempts = 0
    
    const poll = () => {
      attempts++
      console.log(`第${attempts}次查询工作流结果`)
      
      wx.cloud.callFunction({
        name: 'queryCozeWorkflow',
        data: {
          workflow_id: workflowId,
          execute_id: executeId
        },
        success: (res) => {
          console.log('查询结果：', res)
          if (res.result.success && res.result.data.code === 0) {
            const status = res.result.data.data[0].execute_status
            
            if (status === 'Success') {
              try {
                const outputData = JSON.parse(res.result.data.data[0].output)
                const outputContent = JSON.parse(outputData.Output)
                console.log('outputData: ', outputData)
                console.log('outputContent: ', outputContent)
                this.setData({
                  outputText: outputContent.output,
                  loading: false
                })
                wx.showToast({
                  title: '文案生成完成',
                  icon: 'success'
                })
              } catch (error) {
                console.error('解析响应数据失败：', error)
                wx.showToast({
                  title: '解析响应失败',
                  icon: 'none'
                })
                this.setData({ loading: false })
              }
            } else if (status === 'Fail') {
              wx.showToast({
                title: '工作流执行失败',
                icon: 'none'
              })
              this.setData({ loading: false })
            } else if (status === 'Running') {
              if (attempts < maxAttempts) {
                setTimeout(poll, 3000)
              } else {
                wx.showToast({
                  title: '查询超时，请重试',
                  icon: 'none'
                })
                this.setData({ loading: false })
              }
            } else {
              wx.showToast({
                title: `未知状态: ${status}`,
                icon: 'none'
              })
              this.setData({ loading: false })
            }
          } else {
            if (attempts < maxAttempts) {
              setTimeout(poll, 3000)
            } else {
              wx.showToast({
                title: '查询失败，请重试',
                icon: 'none'
              })
              this.setData({ loading: false })
            }
          }
        },
        fail: (error) => {
          console.error('查询云函数调用失败：', error)
          if (attempts < maxAttempts) {
            setTimeout(poll, 3000)
          } else {
            wx.showToast({
              title: '查询失败，请重试',
              icon: 'none'
            })
            this.setData({ loading: false })
          }
        }
      })
    }
    
    poll()
  },

  // 复制文案
  copyText() {
    if (!this.data.outputText) {
      wx.showToast({
        title: '没有可复制的内容',
        icon: 'none'
      })
      return
    }
    
    wx.setClipboardData({
      data: this.data.outputText,
      success: () => {
        wx.showToast({ title: '复制成功', icon: 'success' })
      }
    })
  }
})