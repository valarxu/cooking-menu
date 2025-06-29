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
    // 视频生成任务相关
    videoTasks: [], // 用户的视频生成任务列表
    isGenerating: false, // 是否正在生成视频
    currentAudio: null, // 当前播放的音频实例
    pollingTimer: null, // 轮询定时器
    // API配置
    apiConfig: {
      baseUrl: 'http://127.0.0.1:3000',
      timeout: 30000,
      pollInterval: 10000, // 轮询间隔（毫秒）
      maxPollAttempts: 20, // 最大轮询次数（5分钟）
      retryAttempts: 3, // API重试次数
      retryDelay: 1000 // 重试延迟（毫秒）
    },
    // 预设文案数组
    textSegments: [
      {
        "type": "人物出境",
        "text": "担心小偷盯上你家老式防盗门？"
      },
      {
        "type": "产品外观",
        "text": "新国标甲4级防盗门来报到！"
      },
      {
        "type": "锁心",
        "text": "304不锈钢主锁舌+12个隐藏锁点"
      },
      {
        "type": "案例呈现",
        "text": "熊孩子写作业再不怕被吵！"
      },
      {
        "type": "店铺环境",
        "text": "下单就送价值599智能锁！全市免费上门量尺！"
      },
      {
        "type": "人物出境",
        "text": "专业安防师傅驻店，守护万家灯火20年！"
      }
    ]
  },
  onLoad(options) {
    // 加载素材库
    this.loadMaterialList();
    // 加载用户克隆的声音
    this.loadUserClonedVoices();
    // 初始化音频上下文
    this.initAudioContext();
    // 加载用户视频生成任务
    this.loadUserVideoTasks();

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
    // 刷新用户视频生成任务
    this.loadUserVideoTasks();
    
    // 检查是否有正在进行的任务，如果有则恢复轮询
    setTimeout(() => {
      this.checkAndResumePolling();
    }, 1000);
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
          sampleUrl: record.audio_url,
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
  // 最终生成视频
  async onGenerateVideo() {
    if (this.data.isGenerating) {
      wx.showToast({ title: '正在生成中，请稍候', icon: 'none' });
      return;
    }

    // 检查是否选择了声音
    if (!this.data.selectedVoiceId) {
      wx.showToast({ title: '请先选择声音', icon: 'none' });
      return;
    }

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

    // 检查是否为克隆声音
    if (selectedVoice.type !== 'clone') {
      wx.showToast({ title: '请选择克隆的声音', icon: 'none' });
      return;
    }

    this.setData({ isGenerating: true });
    wx.showToast({ title: '开始批量生成音频...', icon: 'loading', duration: 2000 });

    try {
      // 批量提交音频生成任务
      const batchResult = await this.batchSubmitAudioTasks(selectedVoice.voiceData);
      
      // 保存批量任务记录到数据库
      await this.saveBatchVideoGenerationTask(batchResult.batchId, selectedVoice.voiceData, batchResult.tasks);
      
      // 开始定时查询任务状态
      this.startPollingBatchTaskStatus(batchResult.batchId);
      
      wx.showToast({ title: '任务已提交，正在生成中...', icon: 'success' });
      
    } catch (error) {
      console.error('提交生成任务失败:', error);
      wx.showToast({ title: error.message || '提交失败', icon: 'none' });
      this.setData({ isGenerating: false });
    }
  },

  // 生成UUID
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  // 批量提交音频生成任务（并发调用单个接口）
  async batchSubmitAudioTasks(voiceData) {
    const batchTaskId = this.generateUUID();
    const tasks = [];
    
    // 准备任务数据并并发提交
    const submitPromises = [];
    
    for (let i = 0; i < this.data.textSegments.length; i++) {
      const segment = this.data.textSegments[i];
      const taskData = {
        speaker: this.generateUUID(), // 使用generateUUID生成新的speaker ID
        text: segment.text,
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
        reference_audio: voiceData.sampleUrl,
        reference_text: '夏天来喽，又能吃上西瓜啦，我真的太喜欢在空调房吃西瓜了，这种感觉真的超爽!'
      };
      
      // 创建任务记录
      const task = {
        taskId: null, // 将在API调用后设置
        taskType: segment.type,
        taskIndex: i,
        text: segment.text,
        status: 'pending',
        audioUrl: null,
        error: null
      };
      
      tasks.push(task);
      
      // 并发提交单个任务
      const submitPromise = this.makeApiRequest('/api/tts/invoke', taskData)
        .then(result => {
          task.taskId = result.taskId;
          task.status = 'processing';
          return { index: i, taskId: result.taskId, success: true };
        })
        .catch(error => {
          task.status = 'failed';
          task.error = error.message;
          return { index: i, error: error.message, success: false };
        });
      
      submitPromises.push(submitPromise);
    }
    
    // 等待所有任务提交完成
    const submitResults = await Promise.all(submitPromises);
    
    // 检查是否有任务提交失败
    const failedTasks = submitResults.filter(result => !result.success);
    if (failedTasks.length > 0) {
      console.warn('部分任务提交失败:', failedTasks);
    }
    
    // 返回批次ID和任务列表
    return { batchId: batchTaskId, tasks };
  },

  // 调用音频合成API（从voiceClone页面复制）
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

        // 轮询任务状态
        const finalResult = await this.pollTaskStatus(result.taskId, '音频合成');

        // 下载音频并上传到云存储
        const cloudAudioUrl = await this.downloadAndUploadAudio(finalResult.audioUrl);

        resolve(cloudAudioUrl);
      } catch (error) {
        reject(new Error(error.message || '音频合成失败'));
      }
    });
  },

  // 通用API请求方法
  makeApiRequest(endpoint, data, method = 'POST') {
    return this.makeApiRequestWithRetry(endpoint, data, method, 0);
  },

  // 带重试机制的API请求
  makeApiRequestWithRetry(endpoint, data, method = 'POST', attempt = 0) {
    return new Promise((resolve, reject) => {
      let url = `${this.data.apiConfig.baseUrl}${endpoint}`;
      let requestData = data;
      
      // GET请求将参数拼接到URL中
      if (method === 'GET' && data) {
        const params = new URLSearchParams(data).toString();
        url += `?${params}`;
        requestData = undefined;
      }
      
      wx.request({
        url: url,
        method: method,
        header: {
          'content-type': 'application/json'
        },
        data: requestData,
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
      const delay = this.data.apiConfig.retryDelay * Math.pow(2, attempt);
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

  // 轮询检查任务状态
  async pollTaskStatus(taskId, taskType = 'TTS任务') {
    let attempts = 0;

    while (attempts < this.data.apiConfig.maxPollAttempts) {
      attempts++;

      try {
        const result = await this.checkTTSTaskStatus(taskId);

        if (result.success && result.data) {
          const { status, audioUrl, result: taskResult } = result.data;

          if (status === 'completed') {
            return { audioUrl: audioUrl || taskResult, result: taskResult };
          } else if (status === 'failed') {
            throw new Error(`${taskType}失败`);
          } else if (status === 'pending' || status === 'processing') {
            await new Promise(resolve => setTimeout(resolve, this.data.apiConfig.pollInterval));
          } else {
            throw new Error(`未知任务状态: ${status}`);
          }
        } else {
          throw new Error(result.error || '查询任务状态失败');
        }
      } catch (error) {
        console.error(`轮询${taskType}状态失败:`, error);
        if (attempts >= this.data.apiConfig.maxPollAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, this.data.apiConfig.pollInterval));
      }
    }

    throw new Error(`${taskType}超时`);
  },

  // 检查TTS任务状态
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
          if (res.statusCode === 200) {
            resolve({ success: true, data: res.data });
          } else {
            resolve({ success: false, error: `查询任务状态失败: ${res.statusCode}` });
          }
        },
        fail: (error) => {
          resolve({ success: false, error: '网络请求失败' });
        }
      });
    });
  },

  // 下载音频并上传到云存储
  downloadAndUploadAudio(audioUrl) {
    return new Promise(async (resolve, reject) => {
      try {
        const fullAudioUrl = audioUrl.startsWith('/') ?
          `${this.data.apiConfig.baseUrl}${audioUrl}` : audioUrl;

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

        const fs = wx.getFileSystemManager();
        const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_audio_${Date.now()}.mp3`;

        fs.writeFileSync(tempFilePath, audioResponse.data);

        const uploadResult = await wx.cloud.uploadFile({
          cloudPath: `audio/tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`,
          filePath: tempFilePath
        });

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
  },

  // 保存批量视频生成任务到数据库
  async saveBatchVideoGenerationTask(batchTaskId, voiceData, tasks) {
    const app = getApp();
    const db = wx.cloud.database();
    
    // 使用实际的任务数据
    const audioResults = tasks.map(task => ({
      type: task.taskType,
      text: task.text,
      audioUrl: task.audioUrl,
      taskId: task.taskId,
      status: task.status,
      error: task.error
    }));
    
    const taskRecord = {
      user_id: app.globalData.userInfo._openid,
      batch_task_id: batchTaskId,
      voice_data: voiceData,
      audio_results: audioResults,
      created_at: new Date(),
      status: 'processing',
      total_tasks: tasks.length,
      completed_tasks: tasks.filter(task => task.status === 'completed').length
    };
    
    await db.collection('video_generation_tasks').add({
      data: taskRecord
    });
  },

  // 开始定时查询批量任务状态
  startPollingBatchTaskStatus(batchTaskId) {
    // 清除之前的定时器
    if (this.data.pollingTimer) {
      clearInterval(this.data.pollingTimer);
    }
    
    // 立即查询一次
    this.queryBatchTaskStatus(batchTaskId);
    
    // 设置定时查询（每3秒查询一次）
    const timer = setInterval(() => {
      this.queryBatchTaskStatus(batchTaskId);
    }, 3000);
    
    this.setData({ pollingTimer: timer });
  },

  // 查询批量任务状态（分别查询每个任务）
  async queryBatchTaskStatus(batchTaskId) {
    try {
      const app = getApp();
      const db = wx.cloud.database();
      
      // 获取当前批次的任务记录
      const taskQuery = await db.collection('video_generation_tasks')
        .where({
          user_id: app.globalData.userInfo._openid,
          batch_task_id: batchTaskId
        })
        .get();
      
      if (taskQuery.data.length === 0) {
        console.error('未找到批次任务记录:', batchTaskId);
        return;
      }
      
      const taskRecord = taskQuery.data[0];
      const audioResults = taskRecord.audio_results;
      
      // 并发查询所有任务的状态
      const statusPromises = audioResults.map(async (audio, index) => {
        if (!audio.taskId || audio.status === 'completed' || audio.status === 'failed') {
          return { index, audio, updated: false };
        }
        
        try {
          const statusResult = await this.checkTTSTaskStatus(audio.taskId);
          if (statusResult.success && statusResult.data) {
            const { status, audioUrl, result: taskResult } = statusResult.data;
            
            if (status === 'completed') {
              // 下载音频并上传到云存储
              const cloudAudioUrl = await this.downloadAndUploadAudio(audioUrl || taskResult);
              return {
                index,
                audio: {
                  ...audio,
                  status: 'completed',
                  audioUrl: cloudAudioUrl
                },
                updated: true
              };
            } else if (status === 'failed') {
              return {
                index,
                audio: {
                  ...audio,
                  status: 'failed',
                  error: '任务执行失败'
                },
                updated: true
              };
            } else {
              // 仍在处理中，更新状态但不改变其他信息
              return {
                index,
                audio: {
                  ...audio,
                  status: status
                },
                updated: audio.status !== status
              };
            }
          }
        } catch (error) {
          console.error(`查询任务${audio.taskId}状态失败:`, error);
        }
        
        return { index, audio, updated: false };
      });
      
      const statusResults = await Promise.all(statusPromises);
      
      // 检查是否有状态更新
      const hasUpdates = statusResults.some(result => result.updated);
      
      if (hasUpdates) {
        // 更新音频结果
        const updatedAudioResults = statusResults.map(result => result.audio);
        
        // 计算完成的任务数量
        const completedTasks = updatedAudioResults.filter(audio => 
          audio.status === 'completed'
        ).length;
        
        // 判断整体状态
        const failedTasks = updatedAudioResults.filter(audio => 
          audio.status === 'failed'
        ).length;
        
        let overallStatus = 'processing';
        if (completedTasks === updatedAudioResults.length) {
          overallStatus = 'completed';
        } else if (completedTasks + failedTasks === updatedAudioResults.length) {
          overallStatus = 'failed';
        }
        
        // 更新数据库记录
        await db.collection('video_generation_tasks').doc(taskRecord._id).update({
          data: {
            audio_results: updatedAudioResults,
            status: overallStatus,
            completed_tasks: completedTasks,
            updated_at: new Date()
          }
        });
        
        // 刷新本地任务列表
        await this.loadUserVideoTasks();
        
        // 如果所有任务都完成了，停止轮询
        if (overallStatus === 'completed' || overallStatus === 'failed') {
          this.stopPolling();
          this.setData({ isGenerating: false });
          
          if (overallStatus === 'completed') {
            wx.showToast({ title: '所有音频生成完成！', icon: 'success' });
          } else {
            wx.showToast({ title: '部分任务生成失败', icon: 'none' });
          }
        }
      }
    } catch (error) {
      console.error('查询批量任务状态失败:', error);
    }
  },



  // 停止轮询
  stopPolling() {
    if (this.data.pollingTimer) {
      clearInterval(this.data.pollingTimer);
      this.setData({ pollingTimer: null });
    }
  },

  // 加载用户视频生成任务
  async loadUserVideoTasks() {
    const app = getApp();
    if (!app.globalData.userInfo || !app.globalData.userInfo._openid) {
      return;
    }

    try {
      const db = wx.cloud.database();
      const res = await db.collection('video_generation_tasks')
        .where({
          user_id: app.globalData.userInfo._openid
        })
        .orderBy('created_at', 'desc')
        .limit(10)
        .get();

      // 为每个任务计算进度百分比
      const tasksWithProgress = res.data.map(task => {
        const progress = task.total_tasks > 0 
          ? Math.round((task.completed_tasks || 0) / task.total_tasks * 100)
          : 0;
        return {
          ...task,
          progress
        };
      });
      
      this.setData({ videoTasks: tasksWithProgress });
    } catch (error) {
      console.error('加载视频生成任务失败:', error);
    }
  },

  // 刷新任务状态
  async refreshTaskStatus() {
    wx.showLoading({ title: '刷新中...' });
    await this.loadUserVideoTasks();
    wx.hideLoading();
    wx.showToast({ title: '刷新完成', icon: 'success' });
  },

  // 页面卸载时清理定时器
  onUnload() {
    this.stopPolling();
    
    // 停止当前播放的音频
    if (this.data.currentAudio) {
      this.data.currentAudio.stop();
    }
  },

  // 页面隐藏时暂停轮询
  onHide() {
    this.stopPolling();
  },

  // 检查并恢复轮询正在进行的任务
  checkAndResumePolling() {
    const processingTasks = this.data.videoTasks.filter(task => 
      task.status === 'processing' && task.batch_task_id
    );
    
    if (processingTasks.length > 0 && !this.data.pollingTimer) {
      // 恢复最新的处理中任务的轮询
      const latestTask = processingTasks[0];
      console.log('恢复轮询任务:', latestTask.batch_task_id);
      this.setData({ isGenerating: true });
      this.startPollingBatchTaskStatus(latestTask.batch_task_id);
    }
  },

  // 播放生成的音频
  playGeneratedAudio(e) {
    const audioUrl = e.currentTarget.dataset.url;
    if (!audioUrl) {
      wx.showToast({ title: '音频文件不存在', icon: 'none' });
      return;
    }

    // 停止当前播放的音频
    if (this.data.currentAudio) {
      this.data.currentAudio.stop();
    }

    // 创建新的音频实例
    const audio = wx.createInnerAudioContext();
    audio.src = audioUrl;

    audio.onPlay(() => {
      console.log('开始播放生成的音频');
    });

    audio.onEnded(() => {
      console.log('音频播放结束');
      this.setData({ currentAudio: null });
    });

    audio.onError((res) => {
      console.error('音频播放失败:', res);
      wx.showToast({ title: '播放失败', icon: 'none' });
      this.setData({ currentAudio: null });
    });

    audio.play();
    this.setData({ currentAudio: audio });
  }
})