Page({
  data: {
    inputText: '',
    outputText: '【Mock仿写文案】这里是仿写后的文案内容，后续将由AI生成。'
  },
  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },
  onRewrite() {
    console.log('输入内容：', this.data.inputText);
    // 这里后续可接AI接口
    this.setData({
      outputText: '【Mock仿写文案】' + this.data.inputText
    });
  },
  onCopy() {
    wx.setClipboardData({
      data: this.data.outputText,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  }
}); 