const app = getApp()
const recorderManager = wx.getRecorderManager()
const innerAudioContext = wx.createInnerAudioContext()

Page({
  data: {
    // 声音列表
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
    
    // 弹窗相关
    showModal: false,
    
    // 录音相关
    isRecording: false,
    recordStatus: '准备录制',
    recordTime: 0,
    recordedAudioPath: '',
    isPlayingRecord: false,
    isSubmitting: false,
    
    // 定时器
    recordTimer: null
  },

  onLoad() {
    this.initRecorder()
    this.initAudioContext()
  },

  onUnload() {
    // 清理资源
    if (this.data.recordTimer) {
      clearInterval(this.data.recordTimer)
    }
    innerAudioContext.destroy()
  },

  // 初始化录音管理器
  initRecorder() {
    recorderManager.onStart(() => {
      console.log('录音开始')
      this.setData({
        recordStatus: '正在录制...',
        recordTime: 0
      })
      
      // 开始计时
      const timer = setInterval(() => {
        this.setData({
          recordTime: this.data.recordTime + 1
        })
      }, 1000)
      
      this.setData({ recordTimer: timer })
    })

    recorderManager.onStop((res) => {
      console.log('录音结束', res)
      
      // 清除计时器
      if (this.data.recordTimer) {
        clearInterval(this.data.recordTimer)
        this.setData({ recordTimer: null })
      }
      
      this.setData({
        recordStatus: '录制完成',
        recordedAudioPath: res.tempFilePath,
        isRecording: false
      })
    })

    recorderManager.onError((err) => {
      console.error('录音错误', err)
      
      // 清除计时器
      if (this.data.recordTimer) {
        clearInterval(this.data.recordTimer)
        this.setData({ recordTimer: null })
      }
      
      this.setData({
        recordStatus: '录制失败',
        isRecording: false
      })
      
      wx.showToast({
        title: '录音失败，请重试',
        icon: 'none'
      })
    })
  },

  // 初始化音频上下文
  initAudioContext() {
    innerAudioContext.onEnded(() => {
      this.setData({
        playingVoiceId: '',
        isPlayingRecord: false
      })
    })

    innerAudioContext.onError((err) => {
      console.error('音频播放错误', err)
      this.setData({
        playingVoiceId: '',
        isPlayingRecord: false
      })
    })
  },

  // 选择声音
  selectVoice(e) {
    const voiceId = e.currentTarget.dataset.voiceId
    this.setData({
      selectedVoiceId: voiceId
    })
  },

  // 播放声音样本
  playVoiceSample(e) {
    const voiceId = e.currentTarget.dataset.voiceId
    const audioUrl = e.currentTarget.dataset.audioUrl
    
    if (this.data.playingVoiceId === voiceId) {
      // 暂停播放
      innerAudioContext.pause()
      this.setData({ playingVoiceId: '' })
    } else {
      // 开始播放
      innerAudioContext.src = audioUrl
      innerAudioContext.play()
      this.setData({ playingVoiceId: voiceId })
    }
  },

  // 显示克隆弹窗
  showCloneModal() {
    this.setData({
      showModal: true,
      recordStatus: '准备录制',
      recordTime: 0,
      recordedAudioPath: '',
      isRecording: false,
      isPlayingRecord: false
    })
  },

  // 隐藏克隆弹窗
  hideCloneModal() {
    // 停止录音
    if (this.data.isRecording) {
      recorderManager.stop()
    }
    
    // 停止播放
    innerAudioContext.stop()
    
    this.setData({
      showModal: false,
      playingVoiceId: '',
      isPlayingRecord: false
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  // 开始录音
  startRecord() {
    // 检查录音权限
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          wx.authorize({
            scope: 'scope.record',
            success: () => {
              this.doStartRecord()
            },
            fail: () => {
              wx.showModal({
                title: '需要录音权限',
                content: '请在设置中开启录音权限',
                showCancel: false
              })
            }
          })
        } else {
          this.doStartRecord()
        }
      }
    })
  },

  // 执行录音
  doStartRecord() {
    this.setData({ isRecording: true })
    
    recorderManager.start({
      duration: 60000, // 最长60秒
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3'
    })
  },

  // 停止录音
  stopRecord() {
    if (this.data.isRecording) {
      recorderManager.stop()
    }
  },

  // 播放录制的音频
  playRecordedAudio() {
    if (!this.data.recordedAudioPath) return
    
    if (this.data.isPlayingRecord) {
      innerAudioContext.pause()
      this.setData({ isPlayingRecord: false })
    } else {
      innerAudioContext.src = this.data.recordedAudioPath
      innerAudioContext.play()
      this.setData({ isPlayingRecord: true })
    }
  },

  // 提交声音克隆
  async submitVoiceClone() {
    if (!this.data.recordedAudioPath) {
      wx.showToast({
        title: '请先录制音频',
        icon: 'none'
      })
      return
    }

    this.setData({ isSubmitting: true })

    try {
      // 1. 上传音频文件到云存储
      wx.showLoading({ title: '上传音频中...' })
      
      const uploadResult = await this.uploadAudioToCloud()
      
      // 2. 调用云函数处理声音克隆
      wx.showLoading({ title: '处理中...' })
      
      const cloneResult = await this.callVoiceCloneWorkflow(uploadResult.fileID)
      
      // 3. 保存到数据库
      await this.saveVoiceCloneRecord(uploadResult.fileID, cloneResult)
      
      wx.hideLoading()
      wx.showToast({
        title: '提交成功！',
        icon: 'success'
      })
      
      // 关闭弹窗
      this.hideCloneModal()
      
    } catch (error) {
      console.error('声音克隆失败', error)
      wx.hideLoading()
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ isSubmitting: false })
    }
  },

  // 上传音频到云存储
  uploadAudioToCloud() {
    return new Promise((resolve, reject) => {
      const fileName = `voice_clone_${Date.now()}.mp3`
      
      wx.cloud.uploadFile({
        cloudPath: `voice_clone/${fileName}`,
        filePath: this.data.recordedAudioPath,
        success: resolve,
        fail: reject
      })
    })
  },

  // 调用声音克隆工作流
  callVoiceCloneWorkflow(audioFileID) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'callCozeWorkflow',
        data: {
          workflow_id: 'your_voice_clone_workflow_id', // 替换为实际的工作流ID
          parameters: {
            audio_file_id: audioFileID,
            user_id: app.globalData.openid || 'anonymous'
          },
          is_async: true
        },
        success: resolve,
        fail: reject
      })
    })
  },

  // 保存声音克隆记录到数据库
  saveVoiceCloneRecord(audioFileID, workflowResult) {
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database()
      
      db.collection('voice_clone_records').add({
        data: {
          user_id: app.globalData.openid || 'anonymous',
          audio_file_id: audioFileID,
          workflow_result: workflowResult,
          status: 'processing',
          created_at: new Date(),
          updated_at: new Date()
        },
        success: resolve,
        fail: reject
      })
    })
  }
})