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
    // 文案提取逻辑
  }
}) 