Page({
  data: {
    products: [],
    loading: false
  },

  onLoad() {
    this.loadProducts();
  },

  onShow() {
    // 从添加/编辑页面返回时重新加载数据
    this.loadProducts();
  },

  // 加载产品列表
  loadProducts() {
    this.setData({ loading: true });
    
    const db = wx.cloud.database();
    const app = getApp();
    const openid = app.globalData.openid;
    
    if (!openid) {
      // 如果没有openid，先获取
      wx.cloud.callFunction({
        name: 'getOpenId',
        success: (res) => {
          app.globalData.openid = res.result.openid;
          this.fetchProducts(res.result.openid);
        },
        fail: (error) => {
          console.error('获取openid失败：', error);
          wx.showToast({
            title: '获取用户信息失败',
            icon: 'none'
          });
          this.setData({ loading: false });
        }
      });
    } else {
      this.fetchProducts(openid);
    }
  },

  // 从数据库获取产品
  fetchProducts(openid) {
    const db = wx.cloud.database();
    
    db.collection('products')
      .where({
        _openid: openid
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        console.log('获取产品列表成功：', res);
        this.setData({
          products: res.data,
          loading: false
        });
      })
      .catch(error => {
        console.error('获取产品列表失败：', error);
        wx.showToast({
          title: '获取产品列表失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      });
  },

  // 跳转到添加产品页面
  goToAddProduct() {
    wx.navigateTo({
      url: '/pages/addProduct/addProduct'
    });
  },

  // 编辑产品
  editProduct(e) {
    const product = e.currentTarget.dataset.product;
    wx.navigateTo({
      url: `/pages/addProduct/addProduct?id=${product._id}&mode=edit`
    });
  }
});