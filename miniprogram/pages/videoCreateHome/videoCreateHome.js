Page({
  data: {
    
  },

  onLoad: function (options) {
    // 页面加载时的逻辑
  },

  onShow: function () {
    // 页面显示时的逻辑
  },

  // 跳转到新建视频生成任务页面
  navigateToCreateVideo: function(e) {
    const type = e.currentTarget.dataset.type || 'casual'
    wx.navigateTo({
      url: `/pages/videoCreate/videoCreate?type=${type}`
    })
  },

  // 跳转到历史生成记录页面
  navigateToHistory: function() {
    wx.navigateTo({
      url: '/pages/videoTaskHistory/videoTaskHistory'
    })
  }
})