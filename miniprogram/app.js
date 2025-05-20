// app.js
App({
  onLaunch: function () {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        // env 参数说明：
        // env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
        // 此处请填入环境 ID, 环境 ID 可打开云控制台查看
        // 如不填则使用默认环境（第一个创建的环境）
        env: 'cloud1-4g70ln4ka8628fc2',
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