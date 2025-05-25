Page({
  data: {
    address: '',
    type: '',
    name: '',
    sellingPoint: '',
    promotion: '',
    outputText: ''
  },
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },
  generateSaleText() {
    // mock数据
    this.setData({
      outputText: '【卖货文案】快来' + (this.data.address || 'XXX门店') + '，本店主打' + (this.data.type || 'XXX类型') + '，推荐产品"' + (this.data.name || 'XXX产品') + '"，亮点：' + (this.data.sellingPoint || 'XXX卖点') + '，现在参与活动享受' + (this.data.promotion || 'XXX优惠') + '，欢迎选购！'
    });
  },
  generatePersonaText() {
    // mock数据
    this.setData({
      outputText: '【人设文案】我是' + (this.data.address || 'XXX门店') + '的主理人，专注于' + (this.data.type || 'XXX类型') + '，推荐"' + (this.data.name || 'XXX产品') + '"，产品亮点：' + (this.data.sellingPoint || 'XXX卖点') + '，近期活动：' + (this.data.promotion || 'XXX优惠') + '，欢迎大家来体验！'
    });
  },
  copyText() {
    wx.setClipboardData({
      data: this.data.outputText,
      success: () => {
        wx.showToast({ title: '复制成功', icon: 'success' });
      }
    });
  },
  importShopInfo() {
    const app = getApp();
    const shopInfo = app.globalData.userInfo?.shopInfo;
    
    console.log('shopInfo:', shopInfo); // 添加日志查看shopInfo结构
    
    if (!shopInfo) {
      wx.showToast({ 
        title: '未找到店铺信息', 
        icon: 'error' 
      });
      return;
    }

    this.setData({
      address: shopInfo.address || '',
      type: shopInfo.type || '',
      name: shopInfo.name || '',
      sellingPoint: shopInfo.sellingPoint || '',
      promotion: shopInfo.promotion || ''
    });
    
    wx.showToast({ 
      title: '导入成功', 
      icon: 'success' 
    });
  }
}); 