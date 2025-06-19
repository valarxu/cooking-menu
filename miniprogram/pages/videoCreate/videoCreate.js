Page({
  data: {
    step: 1,
    text: '',
    voiceType: 'ai', // ai/clone/upload
    voiceFile: '',
    bgmType: 'auto', // auto/upload
    bgmFile: '',
    materialList: [], // 素材库
    selectedMaterialIds: [],
  },
  onLoad(options) {
    // 加载素材库
    this.loadMaterialList();
    
    // 如果从video-text页面跳转过来，接收文案参数
    if (options.text) {
      this.setData({
        text: decodeURIComponent(options.text)
      })
    }
  },
  
  onShow() {
    // 检查全局数据中是否有生成的文案
    const app = getApp()
    if (app.globalData.generatedText) {
      this.setData({
        text: app.globalData.generatedText
      })
      // 清除全局数据，避免重复使用
      app.globalData.generatedText = ''
    }
  },
  // 步骤切换
  nextStep() {
    if (this.data.step < 3) this.setData({ step: this.data.step + 1 });
  },
  prevStep() {
    if (this.data.step > 1) this.setData({ step: this.data.step - 1 });
  },
  // 步骤一
  onTextInput(e) {
    this.setData({ text: e.detail.value });
  },
  onAIGenerate() {
    // 跳转到AI文案生成页面（非tabBar页面，使用navigateTo）
    wx.navigateTo({
      url: '/pages/video-text/video-text'
    })
  },
  // 步骤二
  onVoiceTypeChange(e) {
    this.setData({ voiceType: e.detail.value });
  },
  onUploadVoice() {
    // TODO: 上传配音
    wx.showToast({ title: '上传配音', icon: 'none' });
  },
  onBgmTypeChange(e) {
    this.setData({ bgmType: e.detail.value });
  },
  onUploadBgm() {
    // TODO: 上传BGM
    wx.showToast({ title: '上传BGM', icon: 'none' });
  },
  // 步骤三
  async loadMaterialList() {
    try {
      const db = wx.cloud.database();
      const app = getApp();
      const res = await db.collection('videos').where({ _openid: app.globalData.userInfo._openid }).get();
      this.setData({ materialList: res.data });
    } catch (e) {
      this.setData({ materialList: [] });
    }
  },
  onMaterialCheckboxChange(e) {
    this.setData({ selectedMaterialIds: e.detail.value });
  },
  // 最终生成
  onGenerateVideo() {
    const data = {
      text: this.data.text,
      voiceType: this.data.voiceType,
      voiceFile: this.data.voiceFile,
      bgmType: this.data.bgmType,
      bgmFile: this.data.bgmFile,
      selectedMaterialIds: this.data.selectedMaterialIds,
    };
    console.log('生成视频参数：', data);
    wx.showToast({ title: '参数已打印控制台', icon: 'none' });
  }
})