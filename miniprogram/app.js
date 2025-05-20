// app.js
App({
  onLaunch: function () {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-4g70ln4ka8628fc2', // 请将此处替换为你的云开发环境ID
        traceUser: true,
      })
    }

    // 获取用户登录状态
    wx.getStorage({
      key: 'userInfo',
      success: res => {
        console.log('App启动时从本地存储获取到用户信息:', res.data);
        if (res.data) {
          this.globalData.userInfo = res.data;
          this.globalData.isLogin = true;
        }
      },
      fail: err => {
        console.log('App启动时未找到本地存储的用户信息:', err);
      }
    })
  },

  globalData: {
    userInfo: null,
    isLogin: false
  }
});