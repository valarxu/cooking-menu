const app = getApp()

Page({
  data: {
    userInfo: null,
    phoneNumber: '',
    originalUserInfo: null // 保存原始用户信息用于比较
  },

  onLoad() {
    // 获取当前用户信息
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        phoneNumber: userInfo.phoneNumber || '',
        originalUserInfo: JSON.parse(JSON.stringify(userInfo)) // 深拷贝保存原始信息
      })
    }
  },

  // 处理头像选择
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    this.setData({
      'userInfo.avatarUrl': avatarUrl
    })
  },

  // 处理昵称输入
  onInputNickname(e) {
    const nickName = e.detail.value
    this.setData({
      'userInfo.nickName': nickName
    })
  },

  // 处理手机号输入
  onInputPhoneNumber(e) {
    const phoneNumber = e.detail.value
    this.setData({
      phoneNumber: phoneNumber
    })
  },

  // 检查信息是否有变化
  hasInfoChanged() {
    const { userInfo, originalUserInfo, phoneNumber } = this.data
    if (!originalUserInfo) return true
    
    return userInfo.nickName !== originalUserInfo.nickName ||
           userInfo.avatarUrl !== originalUserInfo.avatarUrl ||
           phoneNumber !== originalUserInfo.phoneNumber
  },

  // 验证手机号格式
  validatePhoneNumber(phoneNumber) {
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phoneNumber)
  },

  // 保存用户信息
  saveUserInfo() {
    const { userInfo, phoneNumber } = this.data
    
    if (!userInfo.nickName) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    if (phoneNumber && !this.validatePhoneNumber(phoneNumber)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    if (!this.hasInfoChanged()) {
      wx.showToast({
        title: '信息未修改',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '保存中...'
    })

    // 调用云函数更新用户信息
    wx.cloud.callFunction({
      name: 'updateUserInfo',
      data: {
        userInfo: userInfo,
        phoneNumber: phoneNumber
      },
      success: res => {
        wx.hideLoading()
        
        if (res.result && res.result.success) {
          // 更新全局数据
          app.globalData.userInfo = {
            ...userInfo,
            phoneNumber: phoneNumber
          }
          
          // 保存到本地存储
          wx.setStorage({
            key: 'userInfo',
            data: {
              ...userInfo,
              phoneNumber: phoneNumber
            },
            success: () => {
              wx.showToast({
                title: '保存成功',
                icon: 'success'
              })
              
              // 返回上一页
              setTimeout(() => {
                wx.navigateBack()
              }, 1500)
            },
            fail: () => {
              wx.showToast({
                title: '本地保存失败',
                icon: 'none'
              })
            }
          })
        } else {
          console.error('保存失败：', res.result.error)
          wx.showToast({
            title: res.result.error || '保存失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        console.error('保存用户信息失败：', err)
        wx.hideLoading()
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  }
}) 