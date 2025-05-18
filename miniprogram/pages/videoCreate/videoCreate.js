Page({
  data: {
    text: '',
    bgm: '自动匹配',
    voice: 'A',
    videoMaterial: ''
  },
  onLoad() {},
  onTextInput(e) {
    this.setData({ text: e.detail.value });
  },
  onBgmChange(e) {
    this.setData({ bgm: e.detail.value });
  },
  onVoiceChange(e) {
    this.setData({ voice: e.detail.value });
  },
  onUploadMaterial() {
    // 上传素材逻辑
  }
}) 