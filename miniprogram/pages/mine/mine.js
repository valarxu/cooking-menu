const app = getApp()

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    isLoginProcess: false, // 是否正在登录流程中
    tempUserInfo: {}, // 临时存储用户信息
    works: 1024,
    fans: 5600,
    likes: 6888
  },
  
  onLoad() {
    console.log('页面加载，检查登录状态');
    
    // 检查是否已有用户信息
    if (app.globalData.userInfo) {
      console.log('全局数据中存在用户信息:', app.globalData.userInfo);
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      }, () => {
        console.log('从全局数据更新状态完成:', this.data);
      });
    }
    
    // 从本地存储获取用户信息
    wx.getStorage({
      key: 'userInfo',
      success: (res) => {
        console.log('从本地存储获取到用户信息:', res.data);
        if (res.data && !this.data.hasUserInfo) {
          app.globalData.userInfo = res.data;
          app.globalData.isLogin = true;
          this.setData({
            userInfo: res.data,
            hasUserInfo: true
          }, () => {
            console.log('从本地存储更新状态完成:', this.data);
          });
        }
      },
      fail: (err) => {
        console.log('本地存储中没有用户信息或读取失败:', err);
      }
    });
  },
  
  onShow() {
    console.log('页面显示，检查登录状态');
    
    // 每次显示页面时检查登录状态
    if (app.globalData.userInfo) {
      console.log('全局数据中存在用户信息:', app.globalData.userInfo);
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      }, () => {
        console.log('onShow 更新状态完成:', this.data);
      });
    } else {
      console.log('全局数据中不存在用户信息');
      
      // 尝试从本地存储获取
      wx.getStorage({
        key: 'userInfo',
        success: (res) => {
          console.log('onShow 从本地存储获取到用户信息:', res.data);
          if (res.data) {
            app.globalData.userInfo = res.data;
            app.globalData.isLogin = true;
            this.setData({
              userInfo: res.data,
              hasUserInfo: true
            }, () => {
              console.log('onShow 从本地存储更新状态完成:', this.data);
            });
          }
        }
      });
    }
  },
  
  // 开始登录流程
  getLoginInfo() {
    wx.showLoading({
      title: '登录中...',
    });

    // 1. 先获取微信登录凭证
    wx.login({
      success: (res) => {
        if (res.code) {
          console.log('微信登录成功，code:', res.code);
          
          // 2. 将 code 发送到后端
          wx.request({
            url: 'https://your-api-domain.com/api/login', // 替换为实际的后端API地址
            method: 'POST',
            data: {
              code: res.code
            },
            success: (response) => {
              // 3. 后端返回 Token
              if (response.statusCode === 200 && response.data.token) {
                console.log('获取Token成功:', response.data);
                
                // 4. 存储 Token
                wx.setStorage({
                  key: 'token',
                  data: response.data.token,
                  success: () => {
                    console.log('Token已保存到本地存储');
                    
                    // 设置请求头的全局配置，后续请求自动带上Token
                    wx.setStorageSync('token', response.data.token);
                    
                    // 5. 进入获取用户信息流程
                    this.setData({
                      isLoginProcess: true,
                      tempUserInfo: {
                        avatarUrl: '/images/tabbar/mine.png',
                        nickName: ''
                      }
                    }, () => {
                      wx.hideLoading();
                      console.log('已进入用户信息获取流程');
                    });
                  },
                  fail: (err) => {
                    console.error('保存Token失败:', err);
                    wx.hideLoading();
                    wx.showToast({
                      title: '登录失败',
                      icon: 'none'
                    });
                  }
                });
              } else {
                console.error('获取Token失败:', response);
                wx.hideLoading();
                wx.showToast({
                  title: response.data.message || '登录失败',
                  icon: 'none'
                });
              }
            },
            fail: (err) => {
              console.error('请求后端失败:', err);
              wx.hideLoading();
              wx.showToast({
                title: '网络错误，请稍后重试',
                icon: 'none'
              });
            }
          });
        } else {
          console.error('微信登录失败', res);
          wx.hideLoading();
          wx.showToast({
            title: '登录失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('微信登录失败', err);
        wx.hideLoading();
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 处理头像选择
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    
    // 更新临时用户信息中的头像
    this.setData({
      'tempUserInfo.avatarUrl': avatarUrl
    });
    
    console.log('用户选择了头像:', avatarUrl);
  },
  
  // 处理昵称输入
  onInputNickname(e) {
    const nickName = e.detail.value;
    
    // 更新临时用户信息中的昵称
    this.setData({
      'tempUserInfo.nickName': nickName
    });
  },
  
  // 处理昵称输入框失焦
  onNicknameBlur(e) {
    const nickName = e.detail.value;
    console.log('用户输入的昵称:', nickName);
  },
  
  // 确认用户信息
  confirmUserInfo() {
    const { tempUserInfo } = this.data;
    
    // 验证用户信息
    if (!tempUserInfo.avatarUrl || tempUserInfo.avatarUrl === '/miniprogram/images/tabbar/mine.png') {
      wx.showToast({
        title: '请选择头像',
        icon: 'none'
      });
      return;
    }
    
    if (!tempUserInfo.nickName) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }
    
    // 构建完整的用户信息对象
    const userInfo = {
      ...tempUserInfo,
      gender: 0, // 默认值，微信不再提供性别信息
      country: '', // 默认值，微信不再提供国家信息
      province: '', // 默认值，微信不再提供省份信息
      city: '' // 默认值，微信不再提供城市信息
    };
    
    // 保存用户信息到全局数据
    app.globalData.userInfo = userInfo;
    app.globalData.isLogin = true;
    
    // 更新页面数据
    this.setData({
      userInfo: userInfo,
      hasUserInfo: true,
      isLoginProcess: false
    });
    
    // 保存到本地存储
    wx.setStorage({
      key: 'userInfo',
      data: userInfo
    });
    
    // 保存用户信息到云数据库
    this.saveUserInfoToCloud(userInfo);
    
    wx.showToast({
      title: '登录成功',
      icon: 'success'
    });
  },
  
  // 保存用户信息到云数据库
  saveUserInfoToCloud(userInfo) {
    // 确保云开发已初始化
    if (!wx.cloud) {
      wx.showToast({
        title: '请使用2.2.3或以上基础库',
        icon: 'none'
      })
      return
    }
    
    const db = wx.cloud.database()
    
    // 先查询是否已有该用户记录
    db.collection('users').where({
      _openid: '{openid}' // 使用云开发自动获取的openid
    }).get().then(res => {
      if (res.data.length > 0) {
        // 已有记录，更新
        db.collection('users').doc(res.data[0]._id).update({
          data: {
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            gender: userInfo.gender,
            country: userInfo.country,
            province: userInfo.province,
            city: userInfo.city,
            updateTime: db.serverDate()
          }
        }).then(() => {
          console.log('用户信息更新成功')
        }).catch(err => {
          console.error('用户信息更新失败', err)
        })
      } else {
        // 无记录，添加
        db.collection('users').add({
          data: {
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            gender: userInfo.gender,
            country: userInfo.country,
            province: userInfo.province,
            city: userInfo.city,
            works: 0,
            fans: 0,
            likes: 0,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        }).then(() => {
          console.log('用户信息添加成功')
        }).catch(err => {
          console.error('用户信息添加失败', err)
        })
      }
    }).catch(err => {
      console.error('查询用户信息失败', err)
    })
  },

  // 退出登录
  logout() {
    // 显示确认对话框
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除全局数据
          app.globalData.userInfo = null;
          app.globalData.isLogin = false;
          
          // 清除本地存储
          wx.removeStorage({
            key: 'userInfo',
            success: () => {
              console.log('本地存储的用户信息已清除');
            }
          });
          
          // 重置页面状态
          this.setData({
            userInfo: null,
            hasUserInfo: false,
            isLoginProcess: false,
            tempUserInfo: {}
          });
          
          // 显示退出成功提示
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  }
}) 