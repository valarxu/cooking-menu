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
    defaultText: '你好呀，我是你的数字人，以后由我来帮你宣传产品吧',
    
    // 定时器
    recordTimer: null,
    
    // 工作流轮询相关
    isPolling: false,
    currentExecuteId: '',
    currentWorkflowId: ''
  },

  onLoad() {
    this.initRecorder()
    this.initAudioContext()
    this.loadUserClonedVoices()
  },

  onShow() {
    // 每次显示页面时刷新用户克隆的声音
    this.loadUserClonedVoices()
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
      wx.showLoading({ title: '启动声音克隆...' })

      const voiceRes = await wx.cloud.getTempFileURL({ fileList: [uploadResult.fileID] });
      let voice_url = voiceRes.fileList[0].tempFileURL;
      
      const cloneResult = await this.callVoiceCloneWorkflow(voice_url)
      
      if (cloneResult.result.success && cloneResult.result.data.code === 0) {
        const executeId = cloneResult.result.data.execute_id;
        if (executeId) {
          // 3. 保存到数据库（状态为processing）
          await this.saveVoiceCloneRecord(uploadResult.fileID, cloneResult, executeId)
          
          // 4. 开始轮询查询结果
          wx.showLoading({ title: '声音克隆中...' })
          this.setData({
            currentExecuteId: executeId,
            currentWorkflowId: '7511718185843179560',
            isPolling: true
          })
          
          // 关闭弹窗
          this.hideCloneModal()
          
          // 开始轮询
          this.pollWorkflowResult('7511718185843179560', executeId)
        } else {
          throw new Error('未获取到执行ID')
        }
      } else {
        throw new Error(cloneResult.result.error || '启动工作流失败')
      }
      
    } catch (error) {
      console.error('声音克隆失败', error)
      wx.hideLoading()
      wx.showToast({
        title: error.message || '提交失败，请重试',
        icon: 'none'
      })
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
  callVoiceCloneWorkflow(voice_url) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'callCozeWorkflow',
        data: {
          workflow_id: '7511718185843179560', // 替换为实际的工作流ID
          parameters: {
            voice_url: voice_url,
            text: this.data.defaultText
          },
          is_async: true
        },
        success: resolve,
        fail: reject
      })
    })
  },

  // 保存声音克隆记录到数据库
  saveVoiceCloneRecord(audioFileID, workflowResult, executeId) {
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database()
      
      db.collection('voice_clone_records').add({
        data: {
          user_id: app.globalData.userInfo._openid || 'anonymous',
          audio_file_id: audioFileID,
          workflow_result: workflowResult,
          execute_id: executeId,
          status: 'processing',
          created_at: new Date(),
          updated_at: new Date()
        },
        success: resolve,
        fail: reject
      })
    })
  },

  // 轮询查询工作流结果
  pollWorkflowResult(workflowId, executeId, maxAttempts = 60) {
    let attempts = 0;
    
    const poll = () => {
      attempts++;
      console.log(`第${attempts}次查询声音克隆工作流结果`);
      
      wx.cloud.callFunction({
        name: 'queryCozeWorkflow',
        data: {
          workflow_id: workflowId,
          execute_id: executeId
        },
        success: (res) => {
          console.log('查询结果：', res);
          if (res.result.success && res.result.data.code === 0) {
            const status = res.result.data.data[0].execute_status;
            
            if (status === 'Success') {
              // 工作流完成，处理结果
              try {
                const outputData = JSON.parse(res.result.data.data[0].output);
                console.log("声音克隆输出数据: ", outputData);
                
                // 更新数据库记录状态
                this.updateVoiceCloneRecord(executeId, 'success', outputData);
                
                // 添加到声音列表
                this.addClonedVoiceToList(outputData);
                
                wx.hideLoading();
                wx.showToast({
                  title: '声音克隆完成！',
                  icon: 'success'
                });
                
                this.setData({ 
                  isSubmitting: false,
                  isPolling: false
                });
              } catch (error) {
                console.error('解析声音克隆响应数据失败：', error);
                this.handleCloneFailure('解析响应失败');
              }
            } else if (status === 'Fail') {
              // 工作流失败
              this.updateVoiceCloneRecord(executeId, 'failed', null);
              this.handleCloneFailure('声音克隆失败');
            } else if (status === 'Running') {
              // 工作流还在运行，继续轮询
              if (attempts < maxAttempts) {
                setTimeout(poll, 3000); // 3秒后再次查询
              } else {
                this.handleCloneFailure('声音克隆超时，请重试');
              }
            } else {
              // 未知状态
              this.handleCloneFailure(`未知状态: ${status}`);
            }
          } else {
            // 查询失败，重试
            if (attempts < maxAttempts) {
              setTimeout(poll, 3000);
            } else {
              this.handleCloneFailure('查询失败，请重试');
            }
          }
        },
        fail: (error) => {
          console.error('查询云函数调用失败：', error);
          // 查询失败，重试
          if (attempts < maxAttempts) {
            setTimeout(poll, 3000);
          } else {
            this.handleCloneFailure('查询失败，请重试');
          }
        }
      });
    };
    
    // 开始轮询
    poll();
  },

  // 处理克隆失败
  handleCloneFailure(message) {
    wx.hideLoading();
    wx.showToast({
      title: message,
      icon: 'none'
    });
    this.setData({ 
      isSubmitting: false,
      isPolling: false
    });
  },

  // 更新声音克隆记录状态
  updateVoiceCloneRecord(executeId, status, outputData) {
    const db = wx.cloud.database();
    
    db.collection('voice_clone_records')
      .where({
        user_id: app.globalData.userInfo._openid,
        execute_id: executeId
      })
      .update({
        data: {
          status: status,
          output_data: outputData,
          updated_at: new Date()
        }
      })
      .then(() => {
        console.log('更新声音克隆记录成功');
      })
      .catch(err => {
        console.error('更新声音克隆记录失败：', err);
      });
  },

  // 添加克隆的声音到列表
  addClonedVoiceToList(outputData) {
    // 解析输出数据，获取克隆后的声音信息
    let clonedVoiceUrl = '';
    try {
      // 根据实际的输出格式解析
      if (outputData.Output) {
        const output = JSON.parse(outputData.Output);
        clonedVoiceUrl = output.output || '';
      }
    } catch (error) {
      console.error('解析克隆声音URL失败：', error);
      return;
    }
    
    if (clonedVoiceUrl) {
      const clonedVoice = {
         id: `cloned_${Date.now()}`,
         name: '我的克隆声音',
         description: '您的专属克隆声音',
         avatar: '/images/avatar/female1.svg', // 使用现有的头像
         sampleUrl: clonedVoiceUrl,
         isCloned: true
       };
      
      // 检查是否已存在克隆声音，如果存在则替换
      const voiceList = this.data.voiceList.filter(voice => !voice.isCloned);
      voiceList.push(clonedVoice);
      
      this.setData({
        voiceList: voiceList,
        selectedVoiceId: clonedVoice.id
      });
    }
  },

  // 加载用户已克隆的声音
  async loadUserClonedVoices() {
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
        if (record.output_data) {
          this.addClonedVoiceToList(record.output_data);
        }
      }
    } catch (error) {
      console.error('加载用户克隆声音失败：', error);
    }
  }
})