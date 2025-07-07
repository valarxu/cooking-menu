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
    referenceText: '夏天来喽，又能吃上西瓜啦，我真的太喜欢在空调房吃西瓜了，这种感觉真的超爽!',

    // 定时器
    recordTimer: null,
    
    // 队列状态
    queueStats: null,
    isPolling: false,
    currentTaskId: null,
    // 任务进度状态
    taskProgress: {
      status: '', // 'pending', 'processing', 'completed', 'failed'
      message: '',
      progress: 0
    },
    // API配置
    apiConfig: {
      baseUrl: 'http://127.0.0.1:3000',
      timeout: 30000,
      pollInterval: 10000, // 轮询间隔（毫秒）
      maxPollAttempts: 20, // 最大轮询次数（5分钟）
      retryAttempts: 3, // API重试次数
      retryDelay: 1000 // 重试延迟（毫秒）
    }
  },

  onLoad() {
    this.initRecorder()
    this.initAudioContext()
    this.loadUserClonedVoices()
    this.loadQueueStats()
  },

  onShow() { },

  onUnload() {
    // 清理资源
    if (this.data.recordTimer) {
      clearInterval(this.data.recordTimer)
    }
    if (this.tempAudioContext) {
      this.tempAudioContext.destroy()
      this.tempAudioContext = null
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
      console.log('文件大小：', res.fileSize)
      console.log('录音时长：', res.duration)
      console.log('临时文件路径：', res.tempFilePath)

      // 检查文件是否存在
      wx.getFileInfo({
        filePath: res.tempFilePath,
        success: (fileInfo) => {
          console.log('文件信息：', fileInfo)
        },
        fail: (err) => {
          console.error('获取文件信息失败：', err)
          wx.showToast({
            title: '录音文件异常',
            icon: 'none'
          })
        }
      })

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
      console.log('音频播放结束')
      this.setData({
        playingVoiceId: '',
        isPlayingRecord: false
      })
    })

    innerAudioContext.onError((err) => {
      console.error('音频播放错误', err)
      wx.showToast({
        title: '音频播放失败',
        icon: 'none'
      })
      this.setData({
        playingVoiceId: '',
        isPlayingRecord: false
      })
    })

    innerAudioContext.onWaiting(() => {
      console.log('音频加载中...')
    })

    innerAudioContext.onCanplay(() => {
      console.log('音频可以播放')
    })

    innerAudioContext.onPlay(() => {
      console.log('音频开始播放')
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
      sampleRate: 44100, // 提高采样率
      numberOfChannels: 1,
      encodeBitRate: 192000, // 提高比特率
      format: 'mp3' // 使用MP3格式
    })
  },

  // 停止录音
  stopRecord() {
    if (this.data.isRecording) {
      recorderManager.stop()
    }
  },

  // 切换录音状态（点击录制/停止）
  toggleRecord() {
    if (this.data.isRecording) {
      // 当前正在录制，点击停止
      this.stopRecord()
    } else {
      // 当前未录制，点击开始录制
      this.startRecord()
    }
  },

  // 播放录制的音频
  playRecordedAudio() {
    console.log('播放录制音频，路径：', this.data.recordedAudioPath)

    if (!this.data.recordedAudioPath) {
      console.log('没有录制音频路径')
      wx.showToast({
        title: '请先录制音频',
        icon: 'none'
      })
      return
    }

    if (this.data.isPlayingRecord) {
      console.log('暂停播放音频')
      if (this.tempAudioContext) {
        this.tempAudioContext.pause()
        this.tempAudioContext.destroy()
        this.tempAudioContext = null
      } else {
        innerAudioContext.pause()
      }
      this.setData({ isPlayingRecord: false })
    } else {
      console.log('开始播放音频')

      // 先检查文件是否存在
      wx.getFileInfo({
        filePath: this.data.recordedAudioPath,
        success: (fileInfo) => {
          console.log('播放文件信息：', fileInfo)

          // 重新创建音频上下文实例来避免缓存问题
          const tempAudioContext = wx.createInnerAudioContext()

          tempAudioContext.onCanplay(() => {
            console.log('临时音频上下文：音频可以播放')
          })

          tempAudioContext.onPlay(() => {
            console.log('临时音频上下文：音频开始播放')
            this.setData({ isPlayingRecord: true })
          })

          tempAudioContext.onEnded(() => {
            console.log('临时音频上下文：音频播放结束')
            this.setData({ isPlayingRecord: false })
            tempAudioContext.destroy()
          })

          tempAudioContext.onError((err) => {
            console.error('临时音频上下文播放错误：', err)
            wx.showToast({
              title: '音频播放失败',
              icon: 'none'
            })
            this.setData({ isPlayingRecord: false })
            tempAudioContext.destroy()
          })

          tempAudioContext.onWaiting(() => {
            console.log('临时音频上下文：音频加载中...')
          })

          // 设置音频源并播放
          tempAudioContext.src = this.data.recordedAudioPath
          console.log('设置音频源完成，准备播放')
          tempAudioContext.play()

          // 保存临时音频上下文引用以便控制
          this.tempAudioContext = tempAudioContext
        },
        fail: (err) => {
          console.error('播放文件不存在：', err)
          wx.showToast({
            title: '音频文件不存在',
            icon: 'none'
          })
        }
      })
    }
  },

  // 提交声音克隆
  async submitVoiceClone() {
    if (!this.data.recordedAudioPath) {
      wx.showModal({
        title: '提示',
        content: '请先录制音频',
        showCancel: false
      })
      return
    }

    this.setData({ 
      isSubmitting: true,
      'taskProgress.status': 'pending',
      'taskProgress.message': '开始处理声音克隆...',
      'taskProgress.progress': 0
    })

    try {
      // 1. 上传音频文件到云存储
      this.setData({
        'taskProgress.message': '正在上传音频...',
        'taskProgress.progress': 10
      })
      wx.showLoading({ title: '上传音频中...' })

      const uploadResult = await this.uploadAudioToCloud()

      // 2. 获取音频文件的临时URL
      const voiceRes = await wx.cloud.getTempFileURL({ fileList: [uploadResult.fileID] });
      let voice_url = voiceRes.fileList[0].tempFileURL;

      // 3. 调用本地Docker服务进行声音预处理和训练
      this.setData({
        'taskProgress.message': '正在处理声音克隆...',
        'taskProgress.progress': 20
      })
      wx.showLoading({ title: '声音训练中...' })

      const speaker = this.generateUUID();
      const preprocessResult = await this.callPreprocessAPI(voice_url, speaker)

      if (preprocessResult.success) {
        // 4. 保存克隆记录到数据库
        this.setData({
          'taskProgress.message': '正在保存记录...',
          'taskProgress.progress': 80
        })
        await this.saveVoiceCloneRecord(uploadResult.fileID, speaker, voice_url)

        // 5. 使用训练好的音频，继续合成新音频文件
        this.setData({
          'taskProgress.message': '正在合成测试音频...',
          'taskProgress.progress': 90
        })
        wx.showLoading({ title: '合成测试音频中...' })
        
        // 设置轮询状态
        this.setData({ isPolling: true })

        const synthesizeResult = await this.synthesizeWithClonedVoice(
          this.data.defaultText,
          {
            speaker: speaker,
            sampleUrl: voice_url,
            referenceText: this.data.referenceText
          }
        )
        
        // 清除轮询状态
        this.setData({ isPolling: false, currentTaskId: null })

        // 5.1 更新数据库记录，保存合成音频URL
        await this.updateVoiceCloneRecordWithSynthesizedAudio(speaker, synthesizeResult)
        console.log('数据库记录已更新，合成音频URL:', synthesizeResult)

        // 6. 添加到声音列表（包含合成的音频URL）
        this.addClonedVoiceToList({
          speaker: speaker,
          audioUrl: voice_url,
          referenceText: this.data.referenceText,
          synthesizedAudioUrl: synthesizeResult
        })

        this.setData({
          'taskProgress.message': '声音克隆完成',
          'taskProgress.progress': 100
        })
        wx.hideLoading()
        wx.showToast({
          title: '声音克隆和合成完成！',
          icon: 'success'
        })

        // 关闭弹窗
        this.hideCloneModal()
        
        // 刷新队列统计
        this.loadQueueStats()

      } else {
        throw new Error(preprocessResult.error || '声音训练失败')
      }

    } catch (error) {
      console.error('声音克隆失败', error)
      this.setData({
        'taskProgress.status': 'failed',
        'taskProgress.message': '声音克隆失败'
      })
      wx.hideLoading()
      wx.showModal({
        title: '声音克隆失败',
        content: error.message || '提交失败，请重试',
        showCancel: false
      })
    } finally {
      this.setData({ isSubmitting: false })
      // 延迟重置状态，让用户看到完成状态
      setTimeout(() => {
        this.setData({
          currentTaskId: null,
          isPolling: false,
          'taskProgress.status': '',
          'taskProgress.message': '',
          'taskProgress.progress': 0
        })
      }, 2000)
    }
  },

  // 上传音频到云存储
  uploadAudioToCloud() {
    return new Promise((resolve, reject) => {
      const fileName = `voice_clone_${Date.now()}.mp3`
      const cloudPath = `voice_clone/${app.globalData.userInfo._openid}/${fileName}`

      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: this.data.recordedAudioPath,
        success: resolve,
        fail: reject
      })
    })
  },

  // 生成UUID
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  // 调用本地Docker服务进行声音预处理和训练（异步任务）
  callPreprocessAPI(voice_url, speaker) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.makeApiRequest('/api/tts/preprocess', {
          format: 'mp3',
          reference_audio: voice_url,
          lang: 'zh'
        });
        
        // 异步任务，轮询状态
        this.setData({
          currentTaskId: result.taskId,
          'taskProgress.status': 'processing',
          'taskProgress.message': '正在处理声音克隆...'
        });
        
        const finalResult = await this.pollTaskStatus(result.taskId, '声音克隆');
        resolve({ success: true, data: finalResult });
      } catch (error) {
        resolve({ success: false, error: error.message || '预处理失败' });
      }
    });
  },

  // 通用API请求方法（带重试机制）
  makeApiRequest(endpoint, data, method = 'POST') {
    return this.makeApiRequestWithRetry(endpoint, data, method, 0);
  },

  // 带重试机制的API请求
  makeApiRequestWithRetry(endpoint, data, method = 'POST', attempt = 0) {
    return new Promise((resolve, reject) => {
      const url = `${this.data.apiConfig.baseUrl}${endpoint}`;
      
      wx.request({
        url: url,
        method: method,
        header: {
          'content-type': 'application/json'
        },
        data: data,
        timeout: this.data.apiConfig.timeout,
        success: (res) => {
          console.log(`API请求成功 ${endpoint} (尝试 ${attempt + 1}):`, res);
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            this.handleApiError(endpoint, res.statusCode, attempt, resolve, reject, data, method);
          }
        },
        fail: (error) => {
          console.error(`API请求失败 ${endpoint} (尝试 ${attempt + 1}):`, error);
          this.handleApiError(endpoint, 'network_error', attempt, resolve, reject, data, method, error);
        }
      });
    });
  },

  // 处理API错误和重试逻辑
  handleApiError(endpoint, errorCode, attempt, resolve, reject, data, method, originalError = null) {
    if (attempt < this.data.apiConfig.retryAttempts) {
      const delay = this.data.apiConfig.retryDelay * Math.pow(2, attempt); // 指数退避
      console.log(`API请求失败，${delay}ms后重试 (${attempt + 1}/${this.data.apiConfig.retryAttempts})`);
      
      setTimeout(() => {
        this.makeApiRequestWithRetry(endpoint, data, method, attempt + 1)
          .then(resolve)
          .catch(reject);
      }, delay);
    } else {
      const errorMsg = originalError ? 
        `网络请求失败: ${originalError.errMsg || '未知错误'}` : 
        `API请求失败: ${errorCode}`;
      reject(new Error(errorMsg));
    }
  },



  // 调用本地Docker服务合成音频（异步任务）
  callInvokeAPI(speaker, text, referenceAudio, referenceText) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.makeApiRequest('/api/tts/invoke', {
          speaker: speaker,
          text: text,
          format: 'mp3',
          topP: 0.7,
          max_new_tokens: 1024,
          chunk_length: 100,
          repetition_penalty: 1.2,
          temperature: 0.7,
          need_asr: false,
          streaming: false,
          is_fixed_seed: 0,
          is_norm: 1,
          reference_audio: referenceAudio,
          reference_text: referenceText
        });
        
        // 异步任务，轮询状态
        this.setData({
          currentTaskId: result.taskId,
          'taskProgress.status': 'processing',
          'taskProgress.message': '正在合成音频...'
        });
        
        const finalResult = await this.pollTaskStatus(result.taskId, '音频合成');
        
        // 下载音频并上传到云存储
        const cloudAudioUrl = await this.downloadAndUploadAudio(finalResult.audioUrl);
        
        resolve({ success: true, audioUrl: cloudAudioUrl });
      } catch (error) {
        resolve({ success: false, error: error.message || '音频合成失败' });
      }
    });
  },

  // 加载队列统计信息
  async loadQueueStats() {
    try {
      const result = await this.getQueueStats()
      if (result.success) {
        this.setData({
          queueStats: result.data
        })
        console.log('队列统计信息：', result.data)
      }
    } catch (error) {
      console.error('加载队列统计信息失败：', error)
    }
  },

  // 查询TTS任务状态
  checkTTSTaskStatus(taskId) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.data.apiConfig.baseUrl}/api/tts/status/${taskId}`,
        method: 'GET',
        header: {
          'content-type': 'application/json'
        },
        timeout: this.data.apiConfig.timeout,
        success: (res) => {
          console.log('任务状态查询响应：', res);
          if (res.statusCode === 200) {
            resolve({ success: true, data: res.data });
          } else {
            resolve({ success: false, error: `查询任务状态失败: ${res.statusCode}` });
          }
        },
        fail: (error) => {
          console.error('任务状态查询失败：', error);
          resolve({ success: false, error: '网络请求失败' });
        }
      });
    });
  },

  // 查询队列统计信息
  getQueueStats() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'http://127.0.0.1:3000/api/queue/stats',
        method: 'GET',
        header: {
          'content-type': 'application/json'
        },
        success: (res) => {
          console.log('队列统计查询响应：', res)
          if (res.statusCode === 200) {
            resolve({ success: true, data: res.data })
          } else {
            resolve({ success: false, error: '查询队列统计失败' })
          }
        },
        fail: (error) => {
          console.error('队列统计查询失败：', error)
          resolve({ success: false, error: '网络请求失败' })
        }
      })
    })
  },

  // 轮询检查任务状态（增强版）
  async pollTaskStatus(taskId, taskType = 'TTS任务') {
    let attempts = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;
    
    while (attempts < this.data.apiConfig.maxPollAttempts) {
      attempts++;
      
      // 更新进度
      const progress = Math.min((attempts / this.data.apiConfig.maxPollAttempts) * 100, 95);
      this.setData({
        'taskProgress.progress': progress,
        'taskProgress.message': `${taskType}进行中... (${attempts}/${this.data.apiConfig.maxPollAttempts})`
      });
      
      try {
        const result = await this.checkTTSTaskStatus(taskId);
        consecutiveErrors = 0; // 重置错误计数
        
        if (result.success && result.data) {
          const { status, result: taskResult, error, audioUrl } = result.data;
          
          if (status === 'completed') {
            this.setData({
              'taskProgress.status': 'completed',
              'taskProgress.message': `${taskType}完成`,
              'taskProgress.progress': 100
            });
            // 优先返回audioUrl，如果没有则返回taskResult
            return { audioUrl: audioUrl || taskResult, result: taskResult };
          } else if (status === 'failed') {
            this.setData({
              'taskProgress.status': 'failed',
              'taskProgress.message': `${taskType}失败`
            });
            throw new Error(`${taskType}失败: ${error || '未知错误'}`);
          } else if (status === 'pending' || status === 'processing') {
            // 任务还在进行中，继续等待
            console.log(`任务 ${taskId} 状态: ${status}, 等待中...`);
            await new Promise(resolve => setTimeout(resolve, this.data.apiConfig.pollInterval));
          } else {
            throw new Error(`未知任务状态: ${status}`);
          }
        } else {
          throw new Error(result.error || '查询任务状态失败');
        }
      } catch (error) {
        consecutiveErrors++;
        console.error(`轮询${taskType}状态失败 (${consecutiveErrors}/${maxConsecutiveErrors}):`, error);
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          this.setData({
            'taskProgress.status': 'failed',
            'taskProgress.message': `${taskType}状态查询失败`
          });
          throw new Error(`${taskType}状态查询连续失败`);
        }
        
        // 继续重试，增加延迟
        await new Promise(resolve => setTimeout(resolve, this.data.apiConfig.pollInterval * consecutiveErrors));
      }
    }
    
    this.setData({
      'taskProgress.status': 'failed',
      'taskProgress.message': `${taskType}超时`
    });
    throw new Error(`${taskType}超时：任务执行时间过长`);
  },

  // 保存声音克隆记录到数据库（覆盖之前的记录）
  async saveVoiceCloneRecord(audioFileID, speaker, audioUrl, synthesizedAudioUrl = null) {
    try {
      const db = wx.cloud.database()
      const userId = app.globalData.userInfo._openid || 'anonymous'
      
      // 先查询该用户之前的记录
      const existingRecords = await db.collection('voice_clone_records')
        .where({
          user_id: userId
        })
        .get()
      
      // 删除之前的云存储文件
      if (existingRecords.data.length > 0) {
        const filesToDelete = []
        existingRecords.data.forEach(record => {
          if (record.audio_file_id) {
            filesToDelete.push(record.audio_file_id)
          }
          if (record.synthesized_audio_url && record.synthesized_audio_url.startsWith('cloud://')) {
            filesToDelete.push(record.synthesized_audio_url)
          }
        })
        
        if (filesToDelete.length > 0) {
          try {
            await wx.cloud.deleteFile({
              fileList: filesToDelete
            })
            console.log('已删除之前的云存储文件:', filesToDelete)
          } catch (deleteError) {
            console.warn('删除之前的云存储文件失败:', deleteError)
          }
        }
        
        // 删除数据库中的旧记录
        for (const record of existingRecords.data) {
          try {
            await db.collection('voice_clone_records').doc(record._id).remove()
          } catch (removeError) {
            console.warn('删除旧记录失败:', removeError)
          }
        }
        console.log('已删除之前的声音克隆记录')
      }
      
      // 添加新记录
      const result = await db.collection('voice_clone_records').add({
        data: {
          user_id: userId,
          audio_file_id: audioFileID,
          speaker: speaker,
          audio_url: audioUrl,
          synthesized_audio_url: synthesizedAudioUrl,
          reference_text: this.data.referenceText,
          status: 'success',
          created_at: new Date(),
          updated_at: new Date()
        }
      })
      
      console.log('新的声音克隆记录已保存')
      return result
    } catch (error) {
      console.error('保存声音克隆记录失败:', error)
      throw error
    }
  },

  // 更新声音克隆记录的合成音频URL
  async updateVoiceCloneRecordWithSynthesizedAudio(speaker, synthesizedAudioUrl) {
    try {
      const db = wx.cloud.database()
      const userId = app.globalData.userInfo._openid

      const result = await db.collection('voice_clone_records')
        .where({
          user_id: userId,
          speaker: speaker,
          status: 'success'
        })
        .update({
          data: {
            synthesized_audio_url: synthesizedAudioUrl,
            updated_at: new Date()
          }
        })
      
      console.log('声音克隆记录已更新合成音频URL')
      return result
    } catch (error) {
      console.error('更新声音克隆记录失败:', error)
      throw error
    }
  },



  // 添加克隆的声音到列表
  addClonedVoiceToList(cloneData) {
    // 确保使用合成的音频作为试听音频
    const sampleUrl = cloneData.synthesizedAudioUrl || cloneData.audioUrl;
    
    console.log('添加克隆声音，使用的试听音频URL:', sampleUrl);
    console.log('原始训练音频URL:', cloneData.audioUrl);
    console.log('合成音频URL:', cloneData.synthesizedAudioUrl);
    
    const clonedVoice = {
      id: `cloned_${Date.now()}`,
      name: '我的克隆声音',
      description: '您的专属克隆声音（试听为合成音频）',
      avatar: '/images/avatar/female1.svg', // 使用现有的头像
      sampleUrl: sampleUrl, // 优先使用合成的音频作为试听
      isCloned: true,
      speaker: cloneData.speaker,
      referenceText: cloneData.referenceText,
      originalAudioUrl: cloneData.audioUrl, // 保存原始训练音频URL
      synthesizedAudioUrl: cloneData.synthesizedAudioUrl // 保存合成的音频URL
    };

    // 移除所有之前的克隆声音，只保留最新的
    const voiceList = this.data.voiceList.filter(voice => !voice.isCloned);
    voiceList.push(clonedVoice);

    this.setData({
      voiceList: voiceList,
      selectedVoiceId: clonedVoice.id
    });

    console.log('克隆声音已添加到列表（覆盖之前的克隆声音）:', clonedVoice);
    
    // 验证试听音频是否为合成音频
    if (cloneData.synthesizedAudioUrl) {
      console.log('✓ 试听音频已设置为合成音频');
    } else {
      console.warn('⚠ 未找到合成音频，使用原始训练音频作为试听');
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
        .limit(1) // 只获取最新的一条记录
        .get();

      if (res.data.length > 0) {
        const record = res.data[0];
        console.log('从数据库加载最新的克隆声音记录:', record);
        
        this.addClonedVoiceToList({
          speaker: record.speaker,
          audioUrl: record.audio_url,
          referenceText: record.reference_text,
          synthesizedAudioUrl: record.synthesized_audio_url
        });
        
        // 验证加载的音频URL
        if (record.synthesized_audio_url) {
          console.log('✓ 从数据库加载到合成音频URL:', record.synthesized_audio_url);
        } else {
          console.log('⚠ 数据库中未找到合成音频URL，将使用原始训练音频');
        }
      } else {
        console.log('未找到该用户的声音克隆记录');
      }
    } catch (error) {
      console.error('加载用户克隆声音失败：', error);
    }
  },

  // 使用克隆声音合成音频
  async synthesizeWithClonedVoice(text, voiceData) {
    try {
      wx.showLoading({ title: '合成音频中...' })

      const result = await this.callInvokeAPI(
        voiceData.speaker,
        text,
        voiceData.sampleUrl,
        voiceData.referenceText
      )

      if (result.success) {
        // 清除当前任务ID
        this.setData({ currentTaskId: null })

        wx.hideLoading()
        wx.showToast({
          title: '音频合成完成！',
          icon: 'success'
        })

        return result.audioUrl
      } else {
        throw new Error(result.error || '音频合成失败')
      }
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: error.message || '合成失败',
        icon: 'none'
      })
      throw error
    }
  },

  // 重置任务状态
  resetTaskStatus() {
    this.setData({
      currentTaskId: null,
      isPolling: false,
      'taskProgress.status': '',
      'taskProgress.message': '',
      'taskProgress.progress': 0
    });
  },

  // 显示任务进度提示
  showTaskProgress(message, progress = 0) {
    this.setData({
      'taskProgress.message': message,
      'taskProgress.progress': progress
    });
  },

  // 显示错误提示
  showError(message, title = '操作失败') {
    wx.showModal({
      title: title,
      content: message,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 显示成功提示
  showSuccess(message) {
    wx.showToast({
      title: message,
      icon: 'success',
      duration: 2000
    });
  },

  // 下载音频并上传到云存储
   downloadAndUploadAudio(audioUrl) {
     return new Promise(async (resolve, reject) => {
       try {
         // 如果audioUrl是相对路径，需要拼接完整URL
         const fullAudioUrl = audioUrl.startsWith('/') ? 
           `${this.data.apiConfig.baseUrl}${audioUrl}` : audioUrl;
         
         // 先请求接口获取真正的音频数据
         const audioResponse = await new Promise((audioResolve, audioReject) => {
           wx.request({
             url: fullAudioUrl,
             method: 'GET',
             responseType: 'arraybuffer',
             success: audioResolve,
             fail: audioReject
           });
         });
         
         if (audioResponse.statusCode !== 200) {
           throw new Error(`获取音频数据失败: ${audioResponse.statusCode}`);
         }
         
         // 将ArrayBuffer转换为临时文件
         const fs = wx.getFileSystemManager();
         const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_audio_${Date.now()}.mp3`;
         
         fs.writeFileSync(tempFilePath, audioResponse.data);
         
         // 上传到云存储
         const uploadResult = await wx.cloud.uploadFile({
           cloudPath: `voice_clone/${app.globalData.userInfo._openid}/tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`,
           filePath: tempFilePath
         });
         
         // 清理临时文件
         try {
           fs.unlinkSync(tempFilePath);
         } catch (cleanupError) {
           console.warn('清理临时文件失败:', cleanupError);
         }
         
         resolve(uploadResult.fileID);
       } catch (error) {
         console.error('下载并上传音频失败:', error);
         reject(error);
       }
     });
   }
})