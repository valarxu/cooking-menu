const app = getApp()
Page({
  data: {
    messages: [],
    inputValue: '',
    scrollToMessage: '',
    userAvatarUrl: '',
  },

  onLoad() {
    // 添加欢迎消息
    this.setData({
      messages: [{
        type: 'ai',
        content: '你好！我是你的AI助手，有什么我可以帮你的吗？'
      }]
    });
    this.setData({
      userAvatarUrl: app.globalData.userInfo.avatarUrl
    })
  },

  onInput(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  sendMessage() {
    if (!this.data.inputValue.trim()) return;

    const userMessage = {
      type: 'user',
      content: this.data.inputValue
    };

    // 添加用户消息
    this.setData({
      messages: [...this.data.messages, userMessage],
      inputValue: '',
      scrollToMessage: `msg-${this.data.messages.length}`
    });

    // 模拟AI回复
    setTimeout(() => {
      const aiMessage = {
        type: 'ai',
        content: this.getMockResponse(this.data.inputValue)
      };
      
      this.setData({
        messages: [...this.data.messages, aiMessage],
        scrollToMessage: `msg-${this.data.messages.length}`
      });
    }, 500);
  },

  // 模拟AI回复的简单逻辑
  getMockResponse(question) {
    const responses = {
      '你好': '你好！很高兴见到你！',
      '再见': '再见！有需要随时找我！',
      '谢谢': '不客气，这是我应该做的！'
    };

    // 如果问题包含关键词，返回对应回复
    for (let key in responses) {
      if (question.includes(key)) {
        return responses[key];
      }
    }

    // 默认回复
    return '我明白你的问题了，让我想想怎么回答...';
  }
}); 