Page({
  data: {
    step: 1,
    text: '',
    // 声音相关
    voiceList: [
      {
        id: 'voice_1',
        name: '温柔女声',
        description: '温柔甜美的女性声音，适合温馨场景',
        avatar: '/images/avatar/female1.svg',
        sampleUrl: 'https://lf-bot-studio-plugin-resource.coze.cn/obj/bot-studio-platform-plugin-tos/artist/image/39b6bdb4d11b4f46b9ae25534cc2ea44.mp3'
      },
      {
        id: 'voice_2',
        name: '磁性男声',
        description: '低沉磁性的男性声音，适合专业场景',
        avatar: '/images/avatar/male1.svg',
        sampleUrl: 'https://lf-bot-studio-plugin-resource.coze.cn/obj/bot-studio-platform-plugin-tos/artist/image/86b36d72c14045a380fc32ec80cf0965.mp3'
      },
      {
        id: 'voice_3',
        name: '活泼童声',
        description: '清脆活泼的儿童声音，适合轻松场景',
        avatar: '/images/avatar/child1.svg',
        sampleUrl: 'https://lf-bot-studio-plugin-resource.coze.cn/obj/bot-studio-platform-plugin-tos/artist/image/2f7244c2f0be44d4947b3b626e7b84fa.mp3'
      },
      {
        id: 'voice_4',
        name: '知性女声',
        description: '知性优雅的女性声音，适合商务场景',
        avatar: '/images/avatar/female2.svg',
        sampleUrl: 'https://lf-bot-studio-plugin-resource.coze.cn/obj/bot-studio-platform-plugin-tos/artist/image/90a9f1a781744f05a0da900b4e8d8e1f.mp3'
      }
    ],
    selectedVoiceId: '',
    playingVoiceId: '',
    uploadedVoiceFile: null, // 上传的配音文件
    // BGM相关
    bgmType: 'auto', // auto/upload
    uploadedBgmFile: null, // 上传的BGM文件
    materialList: [], // 素材库
    selectedMaterialIds: [],
  },
  onLoad(options) {
    // 加载素材库
    this.loadMaterialList();
    // 加载用户克隆的声音
    this.loadUserClonedVoices();
    // 初始化音频上下文
    this.initAudioContext();
    
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
    // 每次显示页面时刷新用户克隆的声音
    this.loadUserClonedVoices();
  },

  onUnload() {
    // 清理音频资源
    if (this.innerAudioContext) {
      this.innerAudioContext.destroy();
    }
  },
  // 步骤切换
  nextStep() {
    if (this.data.step < 4) this.setData({ step: this.data.step + 1 });
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
  // 步骤二：声音选择相关方法
  // 初始化音频上下文
  initAudioContext() {
    this.innerAudioContext = wx.createInnerAudioContext();
    
    this.innerAudioContext.onEnded(() => {
      this.setData({ playingVoiceId: '' });
    });
    
    this.innerAudioContext.onError((err) => {
      console.error('音频播放错误', err);
      wx.showToast({
        title: '音频播放失败',
        icon: 'none'
      });
      this.setData({ playingVoiceId: '' });
    });
  },

  // 选择声音
  selectVoice(e) {
    const voiceId = e.currentTarget.dataset.voiceId;
    this.setData({ selectedVoiceId: voiceId });
  },

  // 播放声音样本
  playVoiceSample(e) {
    const voiceId = e.currentTarget.dataset.voiceId;
    const audioUrl = e.currentTarget.dataset.audioUrl;

    if (this.data.playingVoiceId === voiceId) {
      // 暂停播放
      this.innerAudioContext.pause();
      this.setData({ playingVoiceId: '' });
    } else {
      // 开始播放
      this.innerAudioContext.src = audioUrl;
      this.innerAudioContext.play();
      this.setData({ playingVoiceId: voiceId });
    }
  },

  // 上传配音文件
  uploadVoiceFile() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['audio'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFile = res.tempFiles[0];
        console.log('选择的音频文件：', tempFile);
        
        this.setData({
          uploadedVoiceFile: tempFile,
          selectedVoiceId: 'upload' // 标记为上传的文件
        });
        
        wx.showToast({
          title: '音频文件已选择',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('选择音频文件失败：', err);
        wx.showToast({
          title: '选择文件失败',
          icon: 'none'
        });
      }
    });
  },

  // 加载用户克隆的声音
  async loadUserClonedVoices() {
    const app = getApp();
    if (!app.globalData.userInfo || !app.globalData.userInfo._openid) {
      return;
    }

    try {
      const db = wx.cloud.database();
      const res = await db.collection('voice_clone_records')
        .where({
          user_id: app.globalData.userInfo._openid,
          status: 'success'
        })
        .orderBy('created_at', 'desc')
        .limit(1)
        .get();

      if (res.data.length > 0) {
        const record = res.data[0];
        console.log('从数据库加载克隆声音记录:', record);
        
        // 添加克隆声音到列表
        const clonedVoice = {
          id: `cloned_${record.speaker}`,
          name: '我的声音',
          description: '您的专属克隆声音',
          avatar: '/images/avatar/female1.svg',
          sampleUrl: record.synthesized_audio_url || record.audio_url,
          isCloned: true
        };
        
        const voiceList = [...this.data.voiceList];
        // 检查是否已存在克隆声音
        const existIndex = voiceList.findIndex(v => v.isCloned);
        if (existIndex >= 0) {
          voiceList[existIndex] = clonedVoice;
        } else {
          voiceList.push(clonedVoice);
        }
        
        this.setData({ voiceList });
      }
    } catch (error) {
      console.error('加载用户克隆声音失败：', error);
    }
  },

  // 步骤三：BGM选择相关方法
  onBgmTypeChange(e) {
    this.setData({ bgmType: e.detail.value });
  },

  // 上传BGM文件
  uploadBgmFile() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['audio'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFile = res.tempFiles[0];
        console.log('选择的BGM文件：', tempFile);
        
        this.setData({
          uploadedBgmFile: tempFile
        });
        
        wx.showToast({
          title: 'BGM文件已选择',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('选择BGM文件失败：', err);
        wx.showToast({
          title: '选择文件失败',
          icon: 'none'
        });
      }
    });
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
    // 获取选中的声音信息
    let selectedVoice = null;
    if (this.data.selectedVoiceId === 'upload') {
      selectedVoice = {
        type: 'upload',
        file: this.data.uploadedVoiceFile
      };
    } else if (this.data.selectedVoiceId) {
      const voice = this.data.voiceList.find(v => v.id === this.data.selectedVoiceId);
      selectedVoice = {
        type: voice?.isCloned ? 'clone' : 'ai',
        voiceData: voice
      };
    }

    const data = {
      text: this.data.text,
      voice: selectedVoice,
      bgm: {
        type: this.data.bgmType,
        file: this.data.bgmType === 'upload' ? this.data.uploadedBgmFile : null
      },
      selectedMaterialIds: this.data.selectedMaterialIds,
      // 所有音频文件信息
      audioFiles: {
        voiceFile: this.data.uploadedVoiceFile,
        bgmFile: this.data.uploadedBgmFile
      }
    };
    
    console.log('生成视频参数：', data);
    console.log('音频文件详情：');
    if (this.data.uploadedVoiceFile) {
      console.log('配音文件：', this.data.uploadedVoiceFile);
    }
    if (this.data.uploadedBgmFile) {
      console.log('BGM文件：', this.data.uploadedBgmFile);
    }
    
    wx.showToast({ title: '参数已打印控制台', icon: 'none' });
  }
})