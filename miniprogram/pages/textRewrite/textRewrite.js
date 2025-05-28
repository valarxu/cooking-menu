Page({
  data: {
    inputText: '',
    outputText: '',
    loading: false
  },
  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },
  onRewrite() {
    if (!this.data.inputText.trim()) {
      wx.showToast({
        title: '请输入文案内容',
        icon: 'none'
      });
      return;
    }

    // 先设置 loading 状态
    this.setData({ loading: true });
    
    // 使用 Promise 包装 wx.request
    wx.request({
      url: 'https://api.coze.cn/v1/workflow/run',
      method: 'POST',
      header: {
        'Authorization': 'Bearer pat_kYuRTIN9Yo839HwSA9rzm89yWL8BPVxj6noyto3ri3gZXkHVgImDHqkLpFOtgC6T',
        'Content-Type': 'application/json'
      },
      data: {
        workflow_id: '7509119431479607311',
        parameters: {
          input: this.data.inputText
        }
      },
      timeout: 600000, // 600秒超时
      success: (response) => {
        console.log('API响应：', response);
        if (response.statusCode === 200 && response.data.code === 0) {
          try {
            const outputData = JSON.parse(response.data.data);
            this.setData({
              outputText: outputData.output
            });
          } catch (error) {
            console.error('解析响应数据失败：', error);
            wx.showToast({
              title: '解析响应失败',
              icon: 'none'
            });
          }
        } else {
          wx.showToast({
            title: response.data.msg || '请求失败',
            icon: 'none'
          });
        }
      },
      fail: (error) => {
        console.error('请求失败：', error);
        wx.showToast({
          title: '请求失败，请重试',
          icon: 'none'
        });
      },
      complete: () => {
        // 确保在请求完成后关闭 loading 状态
        this.setData({ loading: false });
      }
    });
  },
  onCopy() {
    if (!this.data.outputText) {
      wx.showToast({
        title: '没有可复制的内容',
        icon: 'none'
      });
      return;
    }
    
    wx.setClipboardData({
      data: this.data.outputText,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  }
}); 