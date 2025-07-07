Page({
  data: {
    historyList: [], // 历史记录列表，暂时为空
    videoTasks: [], // 视频生成任务列表
    currentAudio: null, // 当前播放的音频实例
    showDetail: false,
    currentTask: null,
    currentSegment: null,
    currentSegmentIndex: 0,
    // API配置
    apiConfig: {
      baseUrl: 'http://127.0.0.1:3000',
      timeout: 30000,
      retryAttempts: 3, // API重试次数
      retryDelay: 1000 // 重试延迟（毫秒）
    }
  },

  // 显示任务详情
  showTaskDetail: function(e) {
    const task = e.currentTarget.dataset.task;
    const firstSegment = task.audio_results && task.audio_results.length > 0 ? task.audio_results[0] : null;
    
    this.setData({
      showDetail: true,
      currentTask: task,
      currentSegment: firstSegment,
      currentSegmentIndex: 0
    });
  },

  // 返回列表页
  backToList: function() {
    this.setData({
      showDetail: false,
      currentTask: null,
      currentSegment: null,
      currentSegmentIndex: 0
    });
  },

  // 切换分镜
  switchSegment: function(e) {
    const index = e.currentTarget.dataset.index;
    const segment = this.data.currentTask.audio_results[index];
    
    this.setData({
      currentSegmentIndex: index,
      currentSegment: segment
    });
  },

  onLoad: function (options) {
    // 页面加载时的逻辑
    this.loadHistoryData();
    // 加载用户视频生成任务
    this.loadUserVideoTasks();
  },

  onShow: function () {
    // 页面显示时刷新数据
    this.loadHistoryData();
    // 刷新用户视频生成任务
    this.loadUserVideoTasks();
  },

  onUnload() {
    // 停止当前播放的音频
    if (this.data.currentAudio) {
      this.data.currentAudio.stop();
    }
  },

  onHide() {
    this.stopAudio();
  },

  // 加载历史记录数据
  loadHistoryData: function() {
    // TODO: 这里可以添加从服务器获取历史记录的逻辑
    // 目前暂时为空，显示空状态
    this.setData({
      historyList: []
    });
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.loadHistoryData();
    this.loadUserVideoTasks();
    wx.stopPullDownRefresh();
  },

  // 停止音频播放
  stopAudio() {
    if (this.data.currentAudio) {
      this.data.currentAudio.stop();
      this.setData({ currentAudio: null });
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

      console.log("res: ", res);

      // 为每个任务计算进度百分比和格式化时间
      const tasksWithProgress = res.data.map(task => {
        const progress = task.total_tasks > 0
          ? Math.round((task.completed_tasks || 0) / task.total_tasks * 100)
          : 0;
        return {
          ...task,
          progress,
          created_at: this.formatDate(task.created_at)
        };
      });

      this.setData({ videoTasks: tasksWithProgress });

      // 检查是否有未完成的任务需要查询状态
      const incompleteTasks = tasksWithProgress.filter(task => task.status !== 'completed');
      if (incompleteTasks.length > 0) {
        // 只查询一次状态
        for (const task of incompleteTasks) {
          await this.queryBatchTaskStatus(task.batch_task_id);
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

  // API请求封装
  async makeApiRequest(endpoint, data = null, method = 'POST') {
    const { baseUrl, timeout, retryAttempts, retryDelay } = this.data.apiConfig;
    
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const requestOptions = {
          url: `${baseUrl}${endpoint}`,
          method: method,
          timeout: timeout,
          header: {
            'Content-Type': 'application/json'
          }
        };
        
        if (data && method !== 'GET') {
          requestOptions.data = data;
        }
        
        const response = await new Promise((resolve, reject) => {
          wx.request({
            ...requestOptions,
            success: resolve,
            fail: reject
          });
        });
        
        if (response.statusCode === 200) {
          return response.data;
        } else {
          throw new Error(`HTTP ${response.statusCode}: ${response.data?.message || '请求失败'}`);
        }
      } catch (error) {
        console.error(`API请求失败 (尝试 ${attempt}/${retryAttempts}):`, error);
        
        if (attempt === retryAttempts) {
          throw error;
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
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

          // 根据任务类型选择不同的状态查询接口
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
                  videoUrl: finalVideoUrl
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
          } else {
            // 查询普通TTS任务状态
            statusResult = await this.checkTTSTaskStatus(audio.taskId);
            if (statusResult.success && statusResult.data) {
              const { status, audioUrl, result: taskResult } = statusResult.data;

              if (status === 'completed') {
                // 如果TTS任务完成但还没有工作流ID，需要调用工作流
                console.log("TTS任务完成audio: ", audio)
                if (!audio.workflowExecuteId) {
                  try {
                    // 下载音频并上传到云存储
                    const audioResult = await this.downloadAndUploadAudio(audioUrl || taskResult);
                    
                    // 调用工作流
                    const workflowResult = await this.callVideoWorkflow(audio, audioResult.tempFileURL);
                    
                    return {
                      index,
                      audio: {
                        ...audio,
                        status: 'workflow_processing',
                        audioUrl: audioResult.fileID,
                        audioTempUrl: audioResult.tempFileURL,
                        workflowExecuteId: workflowResult.executeId
                      },
                      updated: true
                    };
                  } catch (error) {
                    console.error('调用工作流失败:', error);
                    return {
                      index,
                      audio: {
                        ...audio,
                        status: 'failed',
                        error: '工作流调用失败'
                      },
                      updated: true
                    };
                  }
                } else {
                  // 如果已有工作流ID，查询工作流状态
                  try {
                    const workflowResult = await this.queryWorkflowStatus(audio.workflowExecuteId);
                    
                    if (workflowResult.status === 'Success') {
                      // 工作流完成，下载并保存最终视频
                      let finalVideoUrl = null;
                      if (workflowResult.finalVideoUrl) {
                        try {
                          const videoResult = await this.downloadDirectUrlToCloud(workflowResult.finalVideoUrl);
                          finalVideoUrl = videoResult.fileID;
                        } catch (downloadError) {
                          console.error('下载最终视频失败:', downloadError);
                        }
                      }
                      
                      return {
                        index,
                        audio: {
                          ...audio,
                          status: 'completed',
                          finalVideoUrl: finalVideoUrl
                        },
                        updated: true
                      };
                    } else if (workflowResult.status === 'Fail') {
                      return {
                        index,
                        audio: {
                          ...audio,
                          status: 'failed',
                          error: '工作流执行失败'
                        },
                        updated: true
                      };
                    } else {
                      // 工作流仍在运行
                      return {
                        index,
                        audio: {
                          ...audio,
                          status: 'workflow_processing'
                        },
                        updated: audio.status !== 'workflow_processing'
                      };
                    }
                  } catch (error) {
                    console.error('查询工作流状态失败:', error);
                    return { index, audio, updated: false };
                  }
                }
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

  // 查询TTS任务状态
  async checkTTSTaskStatus(taskId) {
    try {
      const result = await this.makeApiRequest(`/api/tts/status/${taskId}`, null, 'GET');
      return result;
    } catch (error) {
      console.error('查询TTS任务状态失败:', error);
      throw error;
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

      // 上传到云存储
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: `generated_videos/${fileName}`,
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

  // 下载直接URL到云存储（用于finalVideoUrl等完整URL）
  async downloadDirectUrlToCloud(directUrl, fileName = null) {
    try {
      console.log('开始下载直接URL文件:', directUrl);
      
      // 如果没有提供文件名，从URL中提取或生成一个
      if (!fileName) {
        const timestamp = Date.now();
        fileName = `final_video_${timestamp}.mp4`;
      }
      
      // 下载文件到本地临时路径
      const downloadResult = await new Promise((resolve, reject) => {
        wx.downloadFile({
          url: directUrl,
          success: resolve,
          fail: reject
        });
      });

      if (downloadResult.statusCode !== 200) {
        throw new Error(`下载失败，状态码: ${downloadResult.statusCode}`);
      }

      // 上传到云存储
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: `generated_videos/${fileName}`,
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
      console.error('下载直接URL文件到云存储失败:', error);
      throw error;
    }
  },

  // 下载并上传音频
  async downloadAndUploadAudio(audioUrl) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('开始下载音频:', audioUrl);
        
        // 下载音频文件
        const downloadResult = await new Promise((downloadResolve, downloadReject) => {
          wx.downloadFile({
            url: audioUrl,
            success: downloadResolve,
            fail: downloadReject
          });
        });

        if (downloadResult.statusCode !== 200) {
          throw new Error(`音频下载失败，状态码: ${downloadResult.statusCode}`);
        }

        console.log('音频下载成功，开始上传到云存储');
        
        // 上传到云存储
        const timestamp = Date.now();
        const uploadResult = await wx.cloud.uploadFile({
          cloudPath: `generated_audio/audio_${timestamp}.mp3`,
          filePath: downloadResult.tempFilePath
        });

        console.log('音频上传成功:', uploadResult.fileID);

        // 清理临时文件
        try {
          wx.getFileSystemManager().unlinkSync(downloadResult.tempFilePath);
        } catch (cleanupError) {
          console.warn('清理临时文件失败:', cleanupError);
        }

        // 获取临时URL
        const tempUrlResult = await wx.cloud.getTempFileURL({
          fileList: [uploadResult.fileID]
        });

        resolve({
          fileID: uploadResult.fileID,
          tempFileURL: tempUrlResult.fileList[0].tempFileURL
        });
      } catch (error) {
        console.error('下载并上传音频失败:', error);
        reject(error);
      }
    });
  },

  // 调用视频工作流
  async callVideoWorkflow(audio, audioTempUrl) {
    try {
      const workflowData = {
        parameters: {
          audio_url: audioTempUrl,
          video_url: audio.videoUrl,
          text: audio.text
        }
      };
      
      console.log('调用工作流，参数:', workflowData);
      
      const result = await wx.cloud.callFunction({
        name: 'callCozeWorkflow',
        data: workflowData
      });
      
      if (result.result.success) {
        console.log('工作流调用成功:', result.result.data);
        return result.result.data;
      } else {
        throw new Error(result.result.error || '工作流调用失败');
      }
    } catch (error) {
      console.error('调用视频工作流失败:', error);
      throw error;
    }
  },

  // 查询工作流状态
  async queryWorkflowStatus(executeId) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'queryCozeWorkflow',
        data: { executeId }
      });
      
      if (result.result.success) {
        return result.result.data;
      } else {
        throw new Error(result.result.error || '查询工作流状态失败');
      }
    } catch (error) {
      console.error('查询工作流状态失败:', error);
      throw error;
    }
  }
})