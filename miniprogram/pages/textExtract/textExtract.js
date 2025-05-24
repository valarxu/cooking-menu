Page({
  data: {
    videoUrl: '',
    extractedText: ''
  },
  onLoad() {},
  onVideoInput(e) {
    this.setData({ videoUrl: e.detail.value });
  },
  onExtract() {
    // 打印视频链接
    console.log('视频链接：', this.data.videoUrl);
    // 展示mock文案
    this.setData({
      extractedText: '这是mock文案，后续可替换为接口返回内容。'
    });
  },
  onCopyText() {
    wx.setClipboardData({
      data: this.data.extractedText,
      success: function() {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },
  onRewriteText() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  }
}) 