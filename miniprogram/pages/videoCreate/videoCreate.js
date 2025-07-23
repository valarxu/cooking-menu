Page({
  data: {
    step: 1,
    currentStep: 1, // 当前步骤，与step保持同步
    text: '',
    videoType: 'casual', // 视频类型：casual, product, activity, persona, digital
    showContentForm: false, // 是否显示内容表单
    
    // 内容表单相关数据
    contentTypes: [
      { id: 'product', name: '产品推广' },
      { id: 'activity', name: '店内活动宣传' },
      { id: 'persona', name: '人设打造' }
    ],
    selectedType: '',
    products: [],
    selectedProduct: '',
    selectedProductName: '',
    showProductPicker: false,
    userRequirement: '',
    activityPolicy: '',
    productInfo: '',
    shopInfo: '',
    bossInfo: '',
    outputText: '',
    contentFormLoading: false,
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
    // BGM相关数据已移除
    materialList: [], // 素材库
    digitalHumanList: [], // 数字人视频列表
    selectedMaterialIds: [],
    // 视频生成任务相关
    videoTasks: [], // 用户的视频生成任务列表
    isGenerating: false, // 是否正在生成视频
    currentAudio: null, // 当前播放的音频实例

    // 视频分镜选择相关变量
    showVideoModal: false, // 是否显示视频选择弹窗
    currentSegmentIndex: -1, // 当前选择视频的分镜索引
    selectedModalVideoId: '', // 弹窗中选中的视频ID
    videoModalLoading: false, // 视频弹窗加载状态

    // API配置
    apiConfig: {
      baseUrl: 'http://127.0.0.1:3000',
      timeout: 30000,
      retryAttempts: 3, // API重试次数
      retryDelay: 1000 // 重试延迟（毫秒）
    },
    // 预设文案数组
    textSegments: [
      {
        "text": "杭州的梅雨季又来了，你家安全门底部开始生锈了吗？",
        "type": "人物出镜",
        "selectedVideo": null
      },
      {
        "text": "别让潮湿毁了防盗门！",
        "type": "产品外观",
        "selectedVideo": null
      },
      {
        "text": "装门记住三看一验：看板材厚度要≥1.2mm",
        "type": "产品外观",
        "selectedVideo": null
      },
      {
        "text": "看锁具必须是C级",
        "type": "智能锁",
        "selectedVideo": null
      },
      {
        "text": "看防猫眼必须有机械卡扣。",
        "type": "产品外观",
        "selectedVideo": null
      },
      {
        "text": "上周给拱墅区王姐换门，发现旧门框有3指宽缝隙",
        "type": "案例呈现",
        "selectedVideo": null
      },
      {
        "text": "我们免费灌了8袋水泥加固，现在用液压剪都撬不开。",
        "type": "案例呈现",
        "selectedVideo": null
      },
      {
        "text": "15年经手8000多扇门，每把锁芯弹簧我都要亲自听声。",
        "type": "锁心",
        "selectedVideo": null
      },
      {
        "text": "前天冒雨去钱江新城调门，客户说‘成师傅你这服务比我亲哥都上心！’",
        "type": "案例呈现",
        "selectedVideo": null
      },
      {
        "text": "在杭州做门越久越明白：门缝里藏的不仅是隔音条",
        "type": "密封胶条",
        "selectedVideo": null
      },
      {
        "text": "更是一户人家的安全感。",
        "type": "安全等级",
        "selectedVideo": null
      },
      {
        "text": "点击这里预约免费勘测，让我看看你家门缝有没有给小偷留‘后门’！",
        "type": "人物出镜",
        "selectedVideo": null
      }
    ]
  },
  onLoad(options) {
    // 加载素材库
    this.loadMaterialList();
    // 加载数字人视频列表
    this.loadDigitalHumanList();
    // 加载用户克隆的声音
    this.loadUserClonedVoices();
    // 初始化音频上下文
    this.initAudioContext();
    // 加载用户视频生成任务
    this.loadUserVideoTasks();

    // 处理不同的视频类型
    const type = options.type || 'casual'
    this.setData({
      videoType: type
    })

    // 根据类型设置不同的初始状态
    if (type === 'casual' || type === 'digital') {
      // 随拍视频和数字人口播：直接进入文案输入步骤
      this.setData({
        step: 1,
        showContentForm: false
      })
    } else if (type === 'product' || type === 'activity' || type === 'persona') {
      // 产品推广、活动宣传、人设视频：先填写内容表单
      this.setData({
        step: 0, // 新增步骤0用于内容表单
        showContentForm: true
      })
      this.loadProducts() // 加载商品列表（用于产品推广）
    }

    // 如果从video-text页面跳转过来，接收文案参数
    if (options.text) {
      this.setData({
        text: decodeURIComponent(options.text),
        step: 1,
        showContentForm: false
      })
    }
  },

  onShow() { },

  onUnload() {
    // 停止当前播放的音频
    if (this.data.currentAudio) {
      this.data.currentAudio.stop();
    }

    // 清理音频资源
    if (this.innerAudioContext && typeof this.innerAudioContext.destroy === 'function') {
      this.innerAudioContext.destroy();
    }
  },

  onHide() {
    this.stopAudio();
  },
  // 步骤切换
  nextStep() {
    if (this.data.step === 1) {
      // 步骤一：调用分镜生成工作流
      this.generateSegments();
    } else if (this.data.step < 3) {
      const newStep = this.data.step + 1;
      this.setData({
        step: newStep,
        currentStep: newStep
      });
    }
  },
  prevStep() {
    if (this.data.step > 1) {
      const newStep = this.data.step - 1;
      this.setData({
        step: newStep,
        currentStep: newStep
      });
    }
  },
  // 步骤一
  onTextInput(e) {
    this.setData({ text: e.detail.value });
  },

  // 生成分镜
  generateSegments() {
    if (!this.data.text.trim()) {
      wx.showToast({
        title: '请先输入文案',
        icon: 'none'
      });
      return;
    }

    this.setData({ isGenerating: true });

    // 调用云函数启动异步工作流
    wx.cloud.callFunction({
      name: 'callCozeWorkflow',
      data: {
        workflow_id: '7529028028841607202',
        parameters: {
          input: this.data.text
        },
        is_async: true
      },
      success: (res) => {
        console.log('分镜工作流调用成功：', res);
        if (res.result.success && res.result.data.code === 0) {
          const executeId = res.result.data.execute_id;
          if (executeId) {
            // 开始轮询查询结果，复用现有的pollWorkflowResult方法
            this.pollSegmentWorkflowResult('7529028028841607202', executeId);
          } else {
            wx.showToast({
              title: '未获取到执行ID',
              icon: 'none'
            });
            this.setData({ isGenerating: false });
          }
        } else {
          wx.showToast({
            title: res.result.error || '启动分镜工作流失败',
            icon: 'none'
          });
          this.setData({ isGenerating: false });
        }
      },
      fail: (error) => {
        console.error('分镜工作流调用失败：', error);
        wx.showToast({
          title: '请求失败，请重试',
          icon: 'none'
        });
        this.setData({ isGenerating: false });
      }
    });
  },

  // 轮询分镜工作流结果
  pollSegmentWorkflowResult(workflowId, executeId, maxAttempts = 60) {
    let attempts = 0;
    
    const poll = () => {
      attempts++;
      console.log(`第${attempts}次查询分镜工作流结果`);
      
      wx.cloud.callFunction({
        name: 'queryCozeWorkflow',
        data: {
          workflow_id: workflowId,
          execute_id: executeId
        },
        success: (res) => {
          console.log('分镜查询结果：', res);
          if (res.result.success && res.result.data.code === 0) {
            const status = res.result.data.data[0].execute_status;
            
            if (status === 'Success') {
              // 工作流完成，处理结果
              try {
                const outputData = JSON.parse(res.result.data.data[0].output);
                const outputContent = JSON.parse(outputData.Output);
                console.log("分镜outputData: ", outputData);
                console.log("分镜outputContent: ", outputContent);
                
                // 处理分镜数据，确保每个分镜都有selectedVideo字段
                const processedSegments = this.processSegmentsData(outputContent.output || outputContent);
                
                // 设置生成的分镜并直接跳转到下一步
                this.setData({
                  textSegments: processedSegments,
                  isGenerating: false,
                  step: 2,
                  currentStep: 2
                });
                
                wx.showToast({
                  title: '分镜生成成功',
                  icon: 'success'
                });
              } catch (error) {
                console.error('解析分镜响应数据失败：', error);
                wx.showToast({
                  title: '解析分镜响应失败',
                  icon: 'none'
                });
                this.setData({ isGenerating: false });
              }
            } else if (status === 'Fail') {
              // 工作流失败
              wx.showToast({
                title: '分镜工作流执行失败',
                icon: 'none'
              });
              this.setData({ isGenerating: false });
            } else if (status === 'Running') {
              // 工作流还在运行，继续轮询
              if (attempts < maxAttempts) {
                 setTimeout(poll, 10000); // 10秒后再次查询
              } else {
                wx.showToast({
                  title: '分镜生成超时，请重试',
                  icon: 'none'
                });
                this.setData({ isGenerating: false });
              }
            } else {
              // 未知状态
              wx.showToast({
                title: `未知状态: ${status}`,
                icon: 'none'
              });
              this.setData({ isGenerating: false });
            }
          } else {
            // 查询失败，重试
            if (attempts < maxAttempts) {
               setTimeout(poll, 10000);
            } else {
              wx.showToast({
                title: '分镜查询失败，请重试',
                icon: 'none'
              });
              this.setData({ isGenerating: false });
            }
          }
        },
        fail: (error) => {
          console.error('分镜查询云函数调用失败：', error);
          // 查询失败，重试
          if (attempts < maxAttempts) {
             setTimeout(poll, 10000);
          } else {
            wx.showToast({
              title: '分镜查询失败，请重试',
              icon: 'none'
            });
            this.setData({ isGenerating: false });
          }
        }
      });
    };
    
    // 开始轮询
    poll();
  },

  // 处理分镜数据，确保每个分镜都有selectedVideo字段
  processSegmentsData(segmentsData) {
    if (!segmentsData || !Array.isArray(segmentsData)) {
      console.warn('分镜数据格式不正确:', segmentsData);
      return [];
    }

    return segmentsData.map((segment, index) => {
      return {
        ...segment,
        selectedVideo: segment.selectedVideo || null, // 确保有selectedVideo字段
        id: segment.id || index // 确保有唯一标识
      };
    });
  },
  // onAIGenerate() {
  //   // 跳转到AI文案生成页面（非tabBar页面，使用navigateTo）
  //   wx.navigateTo({
  //     url: '/pages/video-text/video-text'
  //   })
  // },
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
        const tempFilePath = res.tempFiles[0].tempFilePath;
        const fileSize = res.tempFiles[0].size;
        
        // 检查文件大小（限制为10MB）
        if (fileSize > 10 * 1024 * 1024) {
          wx.showToast({
            title: '文件大小不能超过10MB',
            icon: 'none'
          });
          return;
        }
        
        this.setData({
          uploadedVoiceFile: {
            tempFilePath: tempFilePath,
            size: fileSize,
            name: `voice_${Date.now()}.mp3`
          },
          selectedVoiceId: 'upload'
        });
        
        wx.showToast({
          title: '配音文件上传成功',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('选择配音文件失败:', err);
        wx.showToast({
          title: '选择文件失败',
          icon: 'none'
        });
      }
    });
  },

  // 上传配音文件到云存储
  async uploadVoiceFileToCloud() {
    if (!this.data.uploadedVoiceFile) {
      throw new Error('没有选择配音文件');
    }

    try {
      wx.showLoading({ title: '上传配音文件...' });

      // 获取用户openid和当前日期
      const app = getApp();
      const userOpenid = app.globalData.userInfo ? app.globalData.userInfo._openid : 'default';
      const currentDate = new Date();
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

      // 构建云存储路径：voice_files/用户openid/日期/文件名
      const cloudPath = `voice_files/${userOpenid}/${dateStr}/${this.data.uploadedVoiceFile.name}`;

      // 上传到云存储
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: this.data.uploadedVoiceFile.tempFilePath
      });

      // 获取临时URL
      const tempUrlResult = await wx.cloud.getTempFileURL({
        fileList: [uploadResult.fileID]
      });

      wx.hideLoading();

      return {
        fileID: uploadResult.fileID,
        tempFileURL: tempUrlResult.fileList[0].tempFileURL
      };
    } catch (error) {
      wx.hideLoading();
      console.error('上传配音文件到云存储失败:', error);
      throw error;
    }
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

  // BGM选择相关方法已移除

  // 步骤三：素材库加载
  async loadMaterialList() {
    try {
      const db = wx.cloud.database();
      const app = getApp();

      // 先获取当前用户的所有产品信息
      const productsRes = await db.collection('products')
        .where({
          _openid: app.globalData.userInfo._openid
        })
        .get();

      console.log('获取到的产品列表:', productsRes.data);

      // 创建产品ID到产品信息的映射
      const productsMap = {};
      productsRes.data.forEach(product => {
        productsMap[product._id] = product;
      });

      const res = await db.collection('videos').where({ _openid: app.globalData.userInfo._openid }).get();

      // 为视频添加产品信息
      const videosWithProducts = res.data.map(video => {
        const videoData = {
          ...video,
          productName: ''
        };

        // 如果有关联产品，从产品映射中获取产品信息
        if (video.relatedProduct && productsMap[video.relatedProduct]) {
          videoData.productName = productsMap[video.relatedProduct].name;
        }

        return videoData;
      });

      this.setData({ materialList: videosWithProducts });

      // 素材加载完成后，为分镜设置默认视频
      if (videosWithProducts.length > 0) {
        this.setDefaultVideosForSegments();
      }
    } catch (e) {
      console.error('加载素材库失败:', e);
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

    // 如果选择了上传的配音文件，使用whisper-to-video接口
    if (selectedVoice.type === 'upload') {
      if (!this.data.uploadedVoiceFile) {
        wx.showToast({ title: '请先上传配音文件', icon: 'none' });
        return;
      }
      
      // 使用whisper-to-video接口生成视频
      await this.submitWhisperToVideoTask();
      return;
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

      wx.showToast({ title: '任务已提交，正在生成中...', icon: 'success' });

      // 刷新任务列表
      await this.loadUserVideoTasks();

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

  // 加载数字人视频列表
  async loadDigitalHumanList() {
    try {
      const app = getApp();
      const db = wx.cloud.database();

      const res = await db.collection('digitalHumanVideos')
        .where({
          user_id: app.globalData.userInfo._openid
        })
        .orderBy('uploadTime', 'desc')
        .get();

      console.log('获取到的数字人视频列表:', res.data);

      // 处理数据，为每个视频添加格式化的时间和URL
      const digitalHumanList = res.data.map(item => {
        return {
          ...item,
          url: item.fileID, // 使用fileID作为视频URL
          uploadTimeFormatted: this.formatDate(item.uploadTime)
        };
      });

      this.setData({ digitalHumanList });

      // 数字人视频加载完成后，为分镜设置默认视频
      if (digitalHumanList.length > 0) {
        this.setDefaultVideosForSegments();
      }
    } catch (error) {
      console.error('加载数字人视频列表失败:', error);
      this.setData({ digitalHumanList: [] });
    }
  },

  // 格式化日期
  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  },

  // 获取数字人视频URL（直接改成获取当前用户全部的数字人视频）
  async getDigitalHumanVideoUrl() {
    try {
      const app = getApp();
      const db = wx.cloud.database();

      // 从digitalHumanVideos集合中获取该用户的所有数字人视频
      const res = await db.collection('digitalHumanVideos')
        .where({
          user_id: app.globalData.userInfo._openid
        })
        .orderBy('uploadTime', 'desc')
        .get();

      if (res.data.length > 0) {
        // 返回第一个数字人视频的fileID作为默认URL
        return res.data[0].fileID;
      } else {
        throw new Error('未找到可用的数字人视频，请先在数字人页面上传视频');
      }
    } catch (error) {
      console.error('获取数字人视频URL失败:', error);
      throw error;
    }
  },

  // 提交whisper-to-video任务
  async submitWhisperToVideoTask() {
    this.setData({ isGenerating: true });

    try {
      // 1. 先上传配音文件到云存储
      const voiceFileResult = await this.uploadVoiceFileToCloud();
      
      // 2. 获取所有"人物出镜"类型的分镜
      const characterSegments = this.data.textSegments.filter(segment => segment.type === '人物出镜');
      
      if (characterSegments.length === 0) {
        throw new Error('没有找到"人物出镜"类型的分镜，无法生成数字人视频');
      }
      
      // 3. 按数字人视频去重，相同视频只提交一次
      const uniqueVideoTasks = new Map();
      
      characterSegments.forEach((segment, index) => {
        if (!segment.selectedVideo || !segment.selectedVideo.url) {
          throw new Error(`第${index + 1}个"人物出镜"未选择数字人视频`);
        }
        
        const videoUrl = segment.selectedVideo.url;
        if (!uniqueVideoTasks.has(videoUrl)) {
          uniqueVideoTasks.set(videoUrl, {
            segment: segment,
            originalIndex: this.data.textSegments.indexOf(segment)
          });
        }
      });
      
      // 4. 为每个唯一的数字人视频提交任务
      const submitPromises = [];
      const taskResults = [];
      
      for (const [videoUrl, taskInfo] of uniqueVideoTasks) {
        const { segment, originalIndex } = taskInfo;
        
        // 将微信云存储fileID转换为公网可访问的临时URL
        let publicVideoUrl = videoUrl;
        try {
          const tempUrlResult = await wx.cloud.getTempFileURL({
            fileList: [videoUrl]
          });
          if (tempUrlResult.fileList && tempUrlResult.fileList.length > 0) {
            publicVideoUrl = tempUrlResult.fileList[0].tempFileURL;
          }
        } catch (error) {
          console.error('获取数字人视频临时URL失败:', error);
          // 如果获取失败，继续使用原URL
        }
        
        // 准备视频参数
        const videoParams = {
          audio_url: voiceFileResult.tempFileURL,
          video_url: publicVideoUrl,
          chaofen: 0,
          watermark_switch: 0,
          pn: 1,
          code: this.generateUUID()
        };
        
        // 准备任务数据
        const taskData = {
          videoParams: videoParams,
          textSegments: this.data.textSegments
        };
        
        // 创建提交Promise
        const submitPromise = this.makeApiRequest('/api/whisper-to-video/submit', taskData, 'POST')
          .then(result => {
            if (result && result.taskId) {
              return {
                success: true,
                taskId: result.taskId,
                taskData: taskData,
                originalIndex: originalIndex,
                videoUrl: videoUrl
              };
            } else {
              throw new Error('任务提交失败');
            }
          })
          .catch(error => {
            return {
              success: false,
              error: error.message,
              originalIndex: originalIndex,
              videoUrl: videoUrl
            };
          });
          
        submitPromises.push(submitPromise);
      }
      
      // 5. 等待所有任务提交完成
      const results = await Promise.all(submitPromises);
      
      // 6. 处理提交结果
      let successCount = 0;
      let failedCount = 0;
      
      for (const result of results) {
        if (result.success) {
          successCount++;
          taskResults.push(result);
          
          // 保存任务到数据库
          await this.saveWhisperToVideoTask(result.taskId, result.taskData, voiceFileResult.fileID);
        } else {
          failedCount++;
          console.error(`视频${result.videoUrl}任务提交失败:`, result.error);
        }
      }
      
      // 7. 显示提交结果
       if (successCount > 0) {
         wx.showToast({
           title: `成功提交${successCount}个任务${failedCount > 0 ? `，${failedCount}个失败` : ''}`,
           icon: successCount === results.length ? 'success' : 'none'
         });
         
         // 刷新任务列表，触发状态查询
         await this.loadUserVideoTasks();
       } else {
         throw new Error('所有任务提交失败');
       }
      
    } catch (error) {
      console.error('提交whisper-to-video任务失败:', error);
      wx.showToast({
        title: error.message || '任务提交失败',
        icon: 'none'
      });
      this.setData({ isGenerating: false });
    }
  },

  // 保存whisper-to-video任务
  async saveWhisperToVideoTask(taskId, taskData, voiceFileId) {
    const app = getApp();
    if (!app.globalData.userInfo || !app.globalData.userInfo._openid) {
      throw new Error('用户未登录');
    }

    try {
      const db = wx.cloud.database();
      await db.collection('video_generation_tasks').add({
        data: {
          user_id: app.globalData.userInfo._openid,
          task_id: taskId,
          task_type: 'whisper-to-video',
          status: 'processing',
          video_params: taskData.videoParams,
          text_segments: taskData.textSegments,
          voice_file_id: voiceFileId,
          total_tasks: 1,
          completed_tasks: 0,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      
      // 刷新任务列表
      await this.loadUserVideoTasks();
    } catch (error) {
      console.error('保存whisper-to-video任务失败:', error);
      throw error;
    }
  },

  // 查询whisper-to-video任务状态
  async queryWhisperToVideoTaskStatus(taskId) {
    try {
      const result = await this.makeApiRequest(`/api/whisper-to-video/status/${taskId}`, null, 'GET');
      
      if (result) {
        // 更新数据库中的任务状态
        await this.updateWhisperToVideoTaskStatus(taskId, result);
        
        // 根据任务状态进行相应处理
        if (result.status === 'completed') {
          this.setData({ isGenerating: false });
          wx.showToast({ title: '视频生成完成！', icon: 'success' });
        } else if (result.status === 'failed') {
          this.setData({ isGenerating: false });
          wx.showToast({ title: '视频生成失败', icon: 'none' });
        }
        // processing和pending状态不再自动循环查询，由loadUserVideoTasks控制
      }
      
      return result;
    } catch (error) {
      console.error('查询whisper-to-video任务状态失败:', error);
      throw error;
    }
  },

  // 更新whisper-to-video任务状态
  async updateWhisperToVideoTaskStatus(taskId, result) {
    try {
      const db = wx.cloud.database();
      const updateData = {
        status: result.status,
        updated_at: new Date()
      };
      
      if (result.status === 'completed') {
        updateData.completed_tasks = 1;
        
        // 下载并存储视频文件
        if (result.videoDownloadUrl) {
          try {
            const videoResult = await this.downloadFileToCloud(result.videoDownloadUrl, `whisper_video_${taskId}.mp4`);
            updateData.videoUrl = videoResult.tempFileURL;
            updateData.local_video_file_id = videoResult.fileID;
          } catch (error) {
            console.error('视频下载失败:', error);
          }
        }
        
        // 下载并存储音频文件（原始配音文件）
        if (result.audioDownloadUrl) {
          try {
            const audioResult = await this.downloadFileToCloud(result.audioDownloadUrl, `whisper_audio_${taskId}.mp3`);
            updateData.audioUrl = audioResult.tempFileURL;
            updateData.local_audio_file_id = audioResult.fileID;
          } catch (error) {
            console.error('音频下载失败:', error);
          }
        }
        
        // 存储转录结果
        if (result.transcriptionResult) {
          updateData.transcriptionResult = result.transcriptionResult;
        }
      }
      
      await db.collection('video_generation_tasks')
        .where({
          task_id: taskId,
          task_type: 'whisper-to-video'
        })
        .update({
          data: updateData
        });
    } catch (error) {
      console.error('更新whisper-to-video任务状态失败:', error);
    }
  },



  // 批量提交音频生成任务（并发调用单个接口）
  async batchSubmitAudioTasks(voiceData) {
    const batchTaskId = this.generateUUID();
    const tasks = [];

    // 获取所有"人物出镜"类型的分镜
    const characterSegments = this.data.textSegments.filter(segment => segment.type === '人物出镜');

    if (characterSegments.length === 0) {
      throw new Error('没有找到"人物出镜"类型的分镜');
    }

    // 拼接所有textSegments的text
    const allTexts = this.data.textSegments.map(segment => segment.text).join('');

    // 按数字人视频去重，相同视频只提交一次
    const uniqueVideoTasks = new Map();

    characterSegments.forEach((segment, index) => {
      if (!segment.selectedVideo || !segment.selectedVideo.url) {
        throw new Error(`第${index + 1}个"人物出镜"未选择数字人视频`);
      }

      const videoUrl = segment.selectedVideo.url;
      if (!uniqueVideoTasks.has(videoUrl)) {
        uniqueVideoTasks.set(videoUrl, {
          segment: segment,
          originalIndex: this.data.textSegments.indexOf(segment)
        });
      }
    });

    // 准备任务数据并并发提交
    const submitPromises = [];

    for (const [videoUrl, taskInfo] of uniqueVideoTasks) {
      const { segment, originalIndex } = taskInfo;

      // 创建任务记录
      const task = {
        taskId: null, // 将在API调用后设置
        taskType: '人物出镜',
        taskIndex: originalIndex,
        text: allTexts, // 使用拼接后的所有文本
        status: 'pending',
        audioUrl: null,
        videoUrl: videoUrl,
        error: null
      };

      tasks.push(task);

      // 将微信云存储fileID转换为公网可访问的临时URL
      let publicVideoUrl = videoUrl;
      try {
        const tempUrlResult = await wx.cloud.getTempFileURL({
          fileList: [videoUrl]
        });
        if (tempUrlResult.fileList && tempUrlResult.fileList.length > 0) {
          publicVideoUrl = tempUrlResult.fileList[0].tempFileURL;
        }
      } catch (error) {
        console.error('获取视频临时URL失败:', error);
        // 如果获取失败，继续使用原URL
      }

      // 调用数字人视频生成接口
      const taskData = {
        ttsParams: {
          speaker: this.generateUUID(),
          text: allTexts, // 使用拼接后的所有文本
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
        },
        videoParams: {
          video_url: publicVideoUrl,
          chaofen: 0,
          watermark_switch: 0,
          pn: 1,
          code: this.generateUUID()
        }
      };

      const submitPromise = this.makeApiRequest('/api/tts-to-video/submit', taskData)
        .then(result => {
          task.taskId = result.taskId;
          task.status = 'processing';
          return { index: originalIndex, taskId: result.taskId, success: true };
        })
        .catch(error => {
          task.status = 'failed';
          task.error = error.message;
          return { index: originalIndex, error: error.message, success: false };
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

  // 通用API请求方法
  makeApiRequest(endpoint, data, method = 'POST') {
    return this.makeApiRequestWithRetry(endpoint, data, method, 0);
  },

  // 带重试机制的API请求
  makeApiRequestWithRetry(endpoint, data, method = 'POST', attempt = 0) {
    return new Promise((resolve, reject) => {
      let url = `${this.data.apiConfig.baseUrl}${endpoint}`;
      let requestData = data;
      console.log("data: ", data)
      console.log("method: ", method)

      // GET请求将参数拼接到URL中
      if (method === 'GET' && data) {
        const params = Object.keys(data)
          .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
          .join('&');
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





  // 保存批量视频生成任务到数据库
  async saveBatchVideoGenerationTask(batchTaskId, voiceData, tasks) {
    const app = getApp();
    const db = wx.cloud.database();

    // 使用实际的任务数据
    const audioResults = tasks.map((task, index) => {
      const segment = this.data.textSegments[index];
      return {
        type: task.taskType,
        text: task.text,
        audioUrl: task.audioUrl,
        taskId: task.taskId,
        status: task.status,
        error: task.error,
        videoUrl: segment.selectedVideo ? segment.selectedVideo.url : null
      };
    });

    // 保存分镜信息和选择的视频
    const segmentsInfo = this.data.textSegments.map(segment => ({
      text: segment.text,
      type: segment.type,
      selectedVideo: segment.selectedVideo ? {
        _id: segment.selectedVideo._id,
        name: segment.selectedVideo.name,
        url: segment.selectedVideo.url,
        type: segment.selectedVideo.type,
        productName: segment.selectedVideo.productName
      } : null
    }));

    const taskRecord = {
      user_id: app.globalData.userInfo._openid,
      batch_task_id: batchTaskId,
      voice_data: voiceData,
      segments_info: segmentsInfo,
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
          let statusResult;

          // 只处理"人物出镜"类型的数字人视频任务
          if (audio.type === '人物出镜') {
            // 查询数字人视频任务状态
            statusResult = await this.queryTTSToVideoTaskStatus(audio.taskId);

            if (statusResult.status === 'completed') {
              // 处理数字人视频任务完成
              let finalVideoUrl = null;
              let finalAudioUrl = null;

              if (statusResult.videoDownloadUrl) {
                try {
                  const videoResult = await this.downloadFileToCloud(statusResult.videoDownloadUrl, `video_${audio.taskId}.mp4`);
                  finalVideoUrl = videoResult.tempFileURL;
                } catch (error) {
                  console.error('视频下载失败:', error);
                }
              }

              if (statusResult.audioDownloadUrl) {
                try {
                  const audioResult = await this.downloadFileToCloud(statusResult.audioDownloadUrl, `audio_${audio.taskId}.mp3`);
                  finalAudioUrl = audioResult.tempFileURL;
                } catch (error) {
                  console.error('音频下载失败:', error);
                }
              }

              return {
                index,
                audio: {
                  ...audio,
                  status: 'completed',
                  audioUrl: finalAudioUrl,
                  videoUrl: finalVideoUrl,
                  transcriptionResult: statusResult.transcriptionResult
                },
                updated: true
              };
            } else if (statusResult.status === 'failed') {
              return {
                index,
                audio: {
                  ...audio,
                  status: 'failed',
                  error: statusResult.error || '任务执行失败'
                },
                updated: true
              };
            } else {
              return {
                index,
                audio: {
                  ...audio,
                  status: statusResult.status
                },
                updated: audio.status !== statusResult.status
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

        // 如果所有任务都完成了
        if (overallStatus === 'completed' || overallStatus === 'failed') {
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

      // 检查是否有未完成的任务需要查询状态
      const incompleteTasks = tasksWithProgress.filter(task => task.status !== 'completed');
      if (incompleteTasks.length > 0) {
        // 只查询一次状态
        for (const task of incompleteTasks) {
          if (task.task_type === 'whisper-to-video') {
            // whisper-to-video任务使用不同的查询方法
            await this.queryWhisperToVideoTaskStatus(task.task_id);
          } else {
            // 普通的批量任务
            await this.queryBatchTaskStatus(task.batch_task_id);
          }
        }
      }
    } catch (error) {
      console.error('加载视频生成任务失败:', error);
    }
  },

  // 刷新任务状态
  async refreshTaskStatus() {
    wx.showLoading({ title: '刷新中...' });

    try {
      await this.loadUserVideoTasks();

      wx.showToast({ title: '刷新完成', icon: 'success' });

    } catch (error) {
      console.error('刷新任务状态失败:', error);
      wx.showToast({ title: '刷新失败', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },



  // 查询数字人视频任务状态
  async queryTTSToVideoTaskStatus(taskId) {
    try {
      const result = await this.makeApiRequest(`/api/tts-to-video/status/${taskId}`, null, 'GET');
      return result;
    } catch (error) {
      console.error('查询数字人视频任务状态失败:', error);
      throw error;
    }
  },

  // 下载文件到云存储
  async downloadFileToCloud(downloadUrl, fileName) {
    try {
      const fullUrl = `${this.data.apiConfig.baseUrl}${downloadUrl}`
      console.log('开始下载文件:', fullUrl)
      // 下载文件到本地临时路径
      const downloadResult = await new Promise((resolve, reject) => {
        wx.downloadFile({
          url: fullUrl,
          success: resolve,
          fail: reject
        });
      });

      if (downloadResult.statusCode !== 200) {
        throw new Error(`下载失败，状态码: ${downloadResult.statusCode}`);
      }

      // 获取用户openid和当前日期
      const app = getApp();
      const userOpenid = app.globalData.userInfo ? app.globalData.userInfo._openid : 'default';
      const currentDate = new Date();
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

      // 构建云存储路径：generated_videos/用户openid/日期/文件名
      const cloudPath = `generated_videos/${userOpenid}/${dateStr}/${fileName}`;

      // 上传到云存储
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: downloadResult.tempFilePath
      });

      // 获取临时URL
      const tempUrlResult = await wx.cloud.getTempFileURL({
        fileList: [uploadResult.fileID]
      });

      return {
        fileID: uploadResult.fileID,
        tempFileURL: tempUrlResult.fileList[0].tempFileURL
      };
    } catch (error) {
      console.error('下载文件到云存储失败:', error);
      throw error;
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
  },

  // 显示视频选择弹窗
  showVideoSelector(e) {
    const segmentIndex = e.currentTarget.dataset.index;
    const segment = this.data.textSegments[segmentIndex];

    // 根据分镜类型检查对应的视频列表
    if (segment.type === '人物出镜') {
      // 检查是否有数字人视频
      if (this.data.digitalHumanList.length === 0) {
        wx.showModal({
          title: '提示',
          content: '暂无数字人视频，请先上传数字人视频',
          showCancel: true,
          confirmText: '去上传',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/digitalHuman/digitalHuman'
              });
            }
          }
        });
        return;
      }
    } else {
      // 检查是否有普通素材
      if (this.data.materialList.length === 0) {
        wx.showModal({
          title: '提示',
          content: '暂无视频素材，请先上传视频素材',
          showCancel: true,
          confirmText: '去上传',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/material/material'
              });
            }
          }
        });
        return;
      }
    }

    // 获取当前分镜已选择的视频ID
    const currentSelectedVideoId = this.data.textSegments[segmentIndex]?.selectedVideo?._id || '';

    this.setData({
      showVideoModal: true,
      currentSegmentIndex: segmentIndex,
      selectedModalVideoId: currentSelectedVideoId,
      videoModalLoading: false
    });
  },

  // 隐藏视频选择弹窗
  hideVideoSelector() {
    this.setData({
      showVideoModal: false,
      selectedModalVideoId: '',
      currentSegmentIndex: -1,
      videoModalLoading: false
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止点击弹窗内容时关闭弹窗
  },

  // 选择弹窗中的视频
  selectModalVideo(e) {
    const videoId = e.currentTarget.dataset.videoId;
    this.setData({
      selectedModalVideoId: videoId
    });
  },

  // 确认选择视频
  confirmVideoSelection() {
    const { currentSegmentIndex, selectedModalVideoId, textSegments } = this.data;

    if (currentSegmentIndex === -1 || !selectedModalVideoId) {
      wx.showToast({ title: '请选择视频', icon: 'none' });
      return;
    }

    const segment = textSegments[currentSegmentIndex];
    let selectedVideo = null;

    // 根据分镜类型从不同的列表中查找视频
    if (segment.type === '人物出镜') {
      selectedVideo = this.data.digitalHumanList.find(video => video._id === selectedModalVideoId);
    } else {
      selectedVideo = this.data.materialList.find(video => video._id === selectedModalVideoId);
    }

    if (!selectedVideo) {
      wx.showToast({ title: '视频不存在', icon: 'none' });
      return;
    }

    // 更新分镜的选中视频
    const updatedSegments = [...this.data.textSegments];
    updatedSegments[currentSegmentIndex].selectedVideo = selectedVideo;

    this.setData({
      textSegments: updatedSegments,
      showVideoModal: false,
      selectedModalVideoId: '',
      currentSegmentIndex: -1
    });

    wx.showToast({ title: '视频选择成功', icon: 'success' });
  },

  // 快速选择视频（直接点击视频项时）
  quickSelectVideo(e) {
    const videoId = e.currentTarget.dataset.videoId;
    const { currentSegmentIndex, materialList, textSegments } = this.data;

    const selectedVideo = materialList.find(video => video._id === videoId);

    if (selectedVideo && currentSegmentIndex !== -1) {
      const updatedSegments = [...textSegments];
      updatedSegments[currentSegmentIndex].selectedVideo = {
        _id: selectedVideo._id,
        name: selectedVideo.name,
        url: selectedVideo.fileID,
        type: selectedVideo.type || '未分类',
        productName: selectedVideo.productName || '无'
      };

      this.setData({
        textSegments: updatedSegments,
        showVideoModal: false,
        selectedModalVideoId: '',
        currentSegmentIndex: -1
      });

      wx.showToast({
        title: '视频选择成功',
        icon: 'success'
      });
    }
  },

  // 为所有类型的分镜设置默认视频
  setDefaultVideosForSegments() {
    const { textSegments, materialList, digitalHumanList } = this.data;

    // 按上传时间降序排序素材列表（最新的在前面）
    const sortedMaterialList = [...materialList].sort((a, b) => {
      const timeA = new Date(a.uploadTime || 0).getTime();
      const timeB = new Date(b.uploadTime || 0).getTime();
      return timeB - timeA;
    });

    // 按上传时间降序排序数字人视频列表（最新的在前面）
    const sortedDigitalHumanList = [...digitalHumanList].sort((a, b) => {
      const timeA = new Date(a.uploadTime || 0).getTime();
      const timeB = new Date(b.uploadTime || 0).getTime();
      return timeB - timeA;
    });

    const updatedSegments = textSegments.map(segment => {
      // 如果还没有选择视频，则设置默认视频
      if (!segment.selectedVideo) {
        let defaultVideo = null;

        if (segment.type === '人物出镜') {
          // 人物出镜类型选择最新的数字人视频
          if (sortedDigitalHumanList.length > 0) {
            defaultVideo = sortedDigitalHumanList[0];
            return {
              ...segment,
              selectedVideo: {
                _id: defaultVideo._id,
                name: defaultVideo.name,
                url: defaultVideo.fileID,
                size: defaultVideo.size || 0,
                duration: defaultVideo.duration || 0
              }
            };
          }
        } else {
          // 其他类型选择普通素材
          if (sortedMaterialList.length > 0) {
            // 优先寻找type一致且时间最近的视频
            const matchingTypeVideos = sortedMaterialList.filter(video =>
              video.type === segment.type
            );

            if (matchingTypeVideos.length > 0) {
              // 如果有type一致的视频，选择最新的
              defaultVideo = matchingTypeVideos[0];
            } else {
              // 如果没有type一致的视频，选择最新的视频
              defaultVideo = sortedMaterialList[0];
            }

            return {
              ...segment,
              selectedVideo: {
                _id: defaultVideo._id,
                name: defaultVideo.name,
                url: defaultVideo.fileID,
                type: defaultVideo.type || '未分类',
                productName: defaultVideo.productName || '无'
              }
            };
          }
        }
      }
      return segment;
    });

    this.setData({
      textSegments: updatedSegments
    });

    console.log('已为分镜设置默认视频，包括数字人视频');
  },

  // 内容表单相关方法
  // 加载商品列表
  async loadProducts() {
    try {
      const app = getApp()
      const db = wx.cloud.database()
      const openid = app.globalData.userInfo?._openid
      
      if (!openid) {
        console.log('用户未登录，无法获取商品列表')
        return
      }
      
      const res = await db.collection('products')
        .where({
          _openid: openid
        })
        .orderBy('createTime', 'desc')
        .get()
      
      this.setData({
        products: res.data
      })
    } catch (error) {
      console.error('获取商品列表失败：', error)
    }
  },

  // 显示商品选择器
  showProductSelector() {
    this.setData({
      showProductPicker: true
    })
  },

  // 选择商品
  selectProduct(e) {
    const productId = e.currentTarget.dataset.productId
    const productName = e.currentTarget.dataset.productName
    this.setData({
      selectedProduct: productId,
      selectedProductName: productName,
      showProductPicker: false
    })
  },

  // 关闭商品选择器
  closeProductPicker() {
    this.setData({
      showProductPicker: false
    })
  },

  // 输入框事件处理
  onProductInfoInput(e) {
    this.setData({
      productInfo: e.detail.value
    })
  },

  onActivityPolicyInput(e) {
    this.setData({
      activityPolicy: e.detail.value
    })
  },

  onShopInfoInput(e) {
    this.setData({
      shopInfo: e.detail.value
    })
  },

  onBossInfoInput(e) {
    this.setData({
      bossInfo: e.detail.value
    })
  },

  onUserRequirementInput(e) {
    this.setData({
      userRequirement: e.detail.value
    })
  },

  // 生成文案
  generateContent() {
    const { videoType, selectedProduct, productInfo, activityPolicy, shopInfo, bossInfo, userRequirement } = this.data
    
    // 验证必填字段
    if (!userRequirement.trim()) {
      wx.showToast({ title: '请填写用户需求', icon: 'none' })
      return
    }
    
    if (videoType === 'product') {
      if (!selectedProduct || !productInfo) {
        wx.showToast({ title: '请选择商品并填写产品信息', icon: 'none' })
        return
      }
    } else if (videoType === 'activity') {
      if (!activityPolicy || !shopInfo) {
        wx.showToast({ title: '请填写活动政策和门店信息', icon: 'none' })
        return
      }
    } else if (videoType === 'persona') {
      if (!bossInfo || !shopInfo) {
        wx.showToast({ title: '请填写老板信息和门店信息', icon: 'none' })
        return
      }
    }

    this.setData({ contentFormLoading: true })

    // 调用云函数启动异步工作流
    wx.cloud.callFunction({
      name: 'callCozeWorkflow',
      data: {
        workflow_id: '7512455256439259174',
        parameters: {
          contentType: videoType,
          productInfo,
          userRequirement,
          shopInfo,
          activityPolicy,
          bossInfo,
        },
        is_async: true
      },
      success: (res) => {
        console.log('云函数调用成功：', res);
        if (res.result.success && res.result.data.code === 0) {
          const executeId = res.result.data.execute_id;
          if (executeId) {
            // 开始轮询查询结果
            this.pollWorkflowResult('7512455256439259174', executeId);
          } else {
            wx.showToast({
              title: '未获取到执行ID',
              icon: 'none'
            });
            this.setData({ contentFormLoading: false });
          }
        } else {
          wx.showToast({
            title: res.result.error || '启动工作流失败',
            icon: 'none'
          });
          this.setData({ contentFormLoading: false });
        }
      },
      fail: (error) => {
        console.error('云函数调用失败：', error);
        wx.showToast({
          title: '请求失败，请重试',
          icon: 'none'
        });
        this.setData({ contentFormLoading: false });
      }
    });
  },

  // 轮询查询工作流结果
  pollWorkflowResult(workflowId, executeId, maxAttempts = 60) {
    let attempts = 0;
    
    const poll = () => {
      attempts++;
      console.log(`第${attempts}次查询工作流结果`);
      
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
                const outputContent = JSON.parse(outputData.Output);
                console.log("outputData: ", outputData)
                console.log("outputContent: ", outputContent)
                
                // 设置生成的文案并直接跳转到下一步
                this.setData({
                  outputText: outputContent.output,
                  text: outputContent.output,
                  contentFormLoading: false,
                  step: 1,
                  showContentForm: false
                });
                
                wx.showToast({
                  title: '文案生成成功',
                  icon: 'success'
                });
              } catch (error) {
                console.error('解析响应数据失败：', error);
                wx.showToast({
                  title: '解析响应失败',
                  icon: 'none'
                });
                this.setData({ contentFormLoading: false });
              }
            } else if (status === 'Fail') {
              // 工作流失败
              wx.showToast({
                title: '工作流执行失败',
                icon: 'none'
              });
              this.setData({ contentFormLoading: false });
            } else if (status === 'Running') {
              // 工作流还在运行，继续轮询
              if (attempts < maxAttempts) {
                 setTimeout(poll, 10000); // 10秒后再次查询
              } else {
                wx.showToast({
                  title: '查询超时，请重试',
                  icon: 'none'
                });
                this.setData({ contentFormLoading: false });
              }
            } else {
              // 未知状态
              wx.showToast({
                title: `未知状态: ${status}`,
                icon: 'none'
              });
              this.setData({ contentFormLoading: false });
            }
          } else {
            // 查询失败，重试
            if (attempts < maxAttempts) {
               setTimeout(poll, 10000);
            } else {
              wx.showToast({
                title: '查询失败，请重试',
                icon: 'none'
              });
              this.setData({ contentFormLoading: false });
            }
          }
        },
        fail: (error) => {
          console.error('查询云函数调用失败：', error);
          // 查询失败，重试
          if (attempts < maxAttempts) {
             setTimeout(poll, 10000);
          } else {
            wx.showToast({
              title: '查询失败，请重试',
              icon: 'none'
            });
            this.setData({ contentFormLoading: false });
          }
        }
      });
    };
    
    // 开始轮询
    poll();
  },

  // 进入下一步（从内容表单到文案输入）
  proceedToTextInput() {
    if (!this.data.outputText) {
      wx.showToast({ title: '请先生成文案', icon: 'none' })
      return
    }
    
    this.setData({
      step: 1,
      showContentForm: false,
      text: this.data.outputText
    })
  }
})