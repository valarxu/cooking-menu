const app = getApp();

Page({
  data: {
    shopInfo: {
      address: '',
      type: '',
      name: '',
      sellingPoint: '',
      promotion: '',
      other: ''
    },
    originalShopInfo: null
  },

  onLoad() {
    // 获取当前用户的店铺信息（假设保存在userInfo.shopInfo）
    const userInfo = app.globalData.userInfo;
    if (userInfo && userInfo.shopInfo) {
      this.setData({
        shopInfo: {...userInfo.shopInfo},
        originalShopInfo: JSON.parse(JSON.stringify(userInfo.shopInfo))
      });
    }
  },

  onInputAddress(e) {
    this.setData({ 'shopInfo.address': e.detail.value });
  },
  onInputType(e) {
    this.setData({ 'shopInfo.type': e.detail.value });
  },
  onInputName(e) {
    this.setData({ 'shopInfo.name': e.detail.value });
  },
  onInputSellingPoint(e) {
    this.setData({ 'shopInfo.sellingPoint': e.detail.value });
  },
  onInputPromotion(e) {
    this.setData({ 'shopInfo.promotion': e.detail.value });
  },
  onInputOther(e) {
    this.setData({ 'shopInfo.other': e.detail.value });
  },

  hasInfoChanged() {
    const { shopInfo, originalShopInfo } = this.data;
    if (!originalShopInfo) return true;
    return Object.keys(shopInfo).some(key => shopInfo[key] !== originalShopInfo[key]);
  },

  saveShopInfo() {
    const { shopInfo } = this.data;
    if (!shopInfo.address || !shopInfo.type || !shopInfo.name || !shopInfo.sellingPoint) {
      wx.showToast({ title: '请填写所有必填项', icon: 'none' });
      return;
    }
    if (!this.hasInfoChanged()) {
      wx.showToast({ title: '信息未修改', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '保存中...' });
    wx.cloud.callFunction({
      name: 'updateUserInfo',
      data: {
        shopInfo: shopInfo
      },
      success: res => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          // 更新全局数据
          app.globalData.userInfo = {
            ...app.globalData.userInfo,
            shopInfo: shopInfo
          };
          wx.setStorage({
            key: 'userInfo',
            data: app.globalData.userInfo,
            success: () => {
              wx.showToast({ title: '保存成功', icon: 'success' });
              setTimeout(() => { wx.navigateBack(); }, 1500);
            },
            fail: () => {
              wx.showToast({ title: '本地保存失败', icon: 'none' });
            }
          });
        } else {
          wx.showToast({ title: res.result.error || '保存失败', icon: 'none' });
        }
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误，请重试', icon: 'none' });
      }
    });
  }
}); 