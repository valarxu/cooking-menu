const app = getApp()

Page({
  data: {
    videoFile: null,
    textContent: '',
    isUploading: false,
    isGenerating: false,
    digitalHumanList: [],
    hasUserInfo: false,
    hasClonedVoice: false,
    voiceCloneRecord: null,
    currentTaskId: '',
    taskStatus: 'idle', // idle, generating_audio, generating_video, completed, failed
    apiConfig: {
      baseUrl: 'http://127.0.0.1:3000',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    }
  },

  async onLoad() {
    await this.checkUserInfo()
    if (this.data.hasUserInfo) {
      await this.getDigitalHumanList()
      // 页面加载时自动刷新未完成任务的状态
      await this.refreshTaskStatus()
    }
  },

  async onShow() {
    await this.checkUserInfo()
    await this.checkVoiceCloneStatus()
    if (this.data.hasUserInfo) {
      await this.getDigitalHumanList()
    }
  },

  // 检查用户信息
  checkUserInfo() {
    console.log('检查用户信息:', app.globalData.userInfo)
    if (app.globalData.userInfo) {
      this.setData({
        hasUserInfo: true
      })
      this.checkVoiceCloneStatus()
      this.getDigitalHumanList()
    } else {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000,
        success: () => {
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/mine/mine'
            })
          }, 2000)
        }
      })
    }
  },

  // 检查用户是否已克隆声音
  async checkVoiceCloneStatus() {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('voice_clone_records')
        .where({
          user_id: app.globalData.userInfo._openid,
          status: 'success'
        })
        .orderBy('created_at', 'desc')
        .limit(1)
        .get()

      if (res.data.length > 0) {
        console.log('用户已克隆声音:', res.data[0])
        this.setData({
          hasClonedVoice: true,
          voiceCloneRecord: res.data[0]
        })
      } else {
        console.log('用户未克隆声音')
        this.setData({
          hasClonedVoice: false,
          voiceCloneRecord: null
        })
      }
    } catch (error) {
      console.error('检查声音克隆状态失败:', error)
      this.setData({
        hasClonedVoice: false,
        voiceCloneRecord: null
      })
    }
  },

  // 跳转到声音克隆页面
  goToVoiceClone() {
    wx.navigateTo({
      url: '/pages/voiceClone/voiceClone'
    })
  },

  // 选择视频
  chooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      success: (res) => {
        this.setData({
          videoFile: res.tempFiles[0]
        })
      }
    })
  },

  // 输入文案内容
  onTextInput(e) {
    this.setData({
      textContent: e.detail.value
    })
  },

  // 提交生成数字人视频
  async submitDigitalHuman() {
    if (!this.data.videoFile) {
      wx.showToast({
        title: '请先上传视频',
        icon: 'none'
      })
      return
    }

    if (!this.data.textContent.trim()) {
      wx.showToast({
        title: '请输入文案内容',
        icon: 'none'
      })
      return
    }

    if (!this.data.hasUserInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    if (!this.data.hasClonedVoice) {
      wx.showToast({
        title: '请先克隆您的声音',
        icon: 'none'
      })
      return
    }

    this.setData({
      isGenerating: true,
      taskStatus: 'processing'
    })

    try {
      // 1. 上传视频到云存储
      const videoUrl = await this.uploadVideoToCloud()

      // 2. 调用新的一体化接口
      const taskId = await this.submitTTSToVideoTask(videoUrl)

      // 3. 保存任务记录到数据库
      await this.saveTaskRecord(taskId, videoUrl)

      wx.showToast({
        title: '任务已提交，正在处理中...',
        icon: 'success'
      })

      // 刷新任务列表
      await this.getDigitalHumanList()

    } catch (error) {
      console.error('提交数字人视频任务失败:', error)
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({
        isGenerating: false,
        taskStatus: 'idle'
      })
    }
  },

  // 上传视频到云存储
  uploadVideoToCloud() {
    return new Promise((resolve, reject) => {
      const fileName = `digital_human_videos/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`

      wx.cloud.uploadFile({
        cloudPath: fileName,
        filePath: this.data.videoFile.tempFilePath,
        success: res => {
          console.log('视频上传成功:', res)
          // 获取可直接访问的临时URL
          wx.cloud.getTempFileURL({
            fileList: [res.fileID],
            success: urlRes => {
              if (urlRes.fileList && urlRes.fileList.length > 0) {
                const tempFileURL = urlRes.fileList[0].tempFileURL
                console.log('获取临时URL成功:', tempFileURL)
                resolve(tempFileURL)
              } else {
                console.error('获取临时URL失败:', urlRes)
                reject(new Error('获取临时URL失败'))
              }
            },
            fail: urlErr => {
              console.error('获取临时URL失败:', urlErr)
              reject(urlErr)
            }
          })
        },
        fail: err => {
          console.error('视频上传失败:', err)
          reject(err)
        }
      })
    })
  },

  // 提交TTS到视频的一体化任务
  async submitTTSToVideoTask(videoUrl) {
    try {
      wx.showLoading({ title: '提交任务中...' })
      
      const result = await this.makeApiRequest('/api/tts-to-video/submit', {
        ttsParams: {
          speaker: this.data.voiceCloneRecord.speaker,
          text: this.data.textContent,
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
          reference_audio: this.data.voiceCloneRecord.audio_url,
          reference_text: this.data.voiceCloneRecord.reference_text
        },
        videoParams: {
          video_url: videoUrl,
          chaofen: 0,
          watermark_switch: 0,
          pn: 1,
          code: this.generateUUID()
        }
      })
      
      wx.hideLoading()
      return result.taskId
    } catch (error) {
      wx.hideLoading()
      console.error('提交TTS到视频任务失败:', error)
      throw error
    }
  },

  // 保存任务记录到数据库
  async saveTaskRecord(taskId, videoUrl) {
    const db = wx.cloud.database()
    const app = getApp()

    try {
      await db.collection('digital_humans').add({
        data: {
          user_id: app.globalData.userInfo._openid,
          taskId: taskId,
          videoUrl: videoUrl,
          textContent: this.data.textContent,
          status: 'processing',
          createTime: new Date(),
          voice_clone_id: this.data.voiceCloneRecord._id
        }
      })

      this.setData({
        currentTaskId: taskId
      })

    } catch (error) {
      console.error('保存任务记录失败:', error)
      throw error
    }
  },

  // 通用API请求方法
  makeApiRequest(endpoint, data, method = 'POST') {
    return this.makeApiRequestWithRetry(endpoint, data, method, 0)
  },

  // 带重试机制的API请求
  makeApiRequestWithRetry(endpoint, data, method = 'POST', attempt = 0) {
    return new Promise((resolve, reject) => {
      let url = `${this.data.apiConfig.baseUrl}${endpoint}`
      let requestData = data
      
      // GET请求将参数拼接到URL中
      if (method === 'GET' && data) {
        const params = new URLSearchParams(data).toString()
        url += `?${params}`
        requestData = undefined
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
          console.log(`API请求成功 ${endpoint} (尝试 ${attempt + 1}):`, res)
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
            this.handleApiError(endpoint, res.statusCode, attempt, resolve, reject, data, method)
          }
        },
        fail: (error) => {
          console.error(`API请求失败 ${endpoint} (尝试 ${attempt + 1}):`, error)
          this.handleApiError(endpoint, 'network_error', attempt, resolve, reject, data, method, error)
        }
      })
    })
  },

  // 处理API错误和重试逻辑
  handleApiError(endpoint, errorCode, attempt, resolve, reject, data, method, originalError = null) {
    if (attempt < this.data.apiConfig.retryAttempts) {
      const delay = this.data.apiConfig.retryDelay * Math.pow(2, attempt)
      console.log(`API请求失败，${delay}ms后重试 (${attempt + 1}/${this.data.apiConfig.retryAttempts})`)

      setTimeout(() => {
        this.makeApiRequestWithRetry(endpoint, data, method, attempt + 1)
          .then(resolve)
          .catch(reject)
      }, delay)
    } else {
      const errorMsg = originalError ?
        `网络请求失败: ${originalError.errMsg || '未知错误'}` :
        `API请求失败: ${errorCode}`
      reject(new Error(errorMsg))
    }
  },

  // 查询TTS到视频任务状态
  async queryTTSToVideoTaskStatus(taskId) {
    try {
      const result = await this.makeApiRequest(`/api/tts-to-video/status/${taskId}`, null, 'GET')
      return result
    } catch (error) {
      console.error('查询TTS到视频任务状态失败:', error)
      throw error
    }
  },

  // 取消TTS到视频任务
  async cancelTTSToVideoTask(taskId) {
    try {
      const result = await this.makeApiRequest(`/api/tts-to-video/cancel/${taskId}`, null, 'POST')
      return result
    } catch (error) {
      console.error('取消TTS到视频任务失败:', error)
      throw error
    }
  },
  // 下载文件并上传到云开发环境
  async downloadFileToCloud(downloadUrl, fileName) {
    return new Promise((resolve, reject) => {
      const fullUrl = `${this.data.apiConfig.baseUrl}${downloadUrl}`
      console.log('开始下载文件:', fullUrl)
      
      wx.downloadFile({
        url: fullUrl,
        success: (res) => {
          if (res.statusCode === 200) {
            console.log('文件下载成功:', res.tempFilePath)
            
            // 确定文件扩展名
            const fileExtension = fileName.includes('.') ? fileName.split('.').pop() : 
                                 (downloadUrl.includes('.mp4') ? 'mp4' : 
                                  downloadUrl.includes('.mp3') ? 'mp3' : 'file')
            
            // 生成云存储路径
            const cloudPath = `digital_human_files/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`
            
            // 上传到云开发环境
            wx.cloud.uploadFile({
              cloudPath: cloudPath,
              filePath: res.tempFilePath,
              success: uploadRes => {
                console.log('文件上传到云开发成功:', uploadRes)
                // 获取可直接访问的临时URL
                wx.cloud.getTempFileURL({
                  fileList: [uploadRes.fileID],
                  success: urlRes => {
                    if (urlRes.fileList && urlRes.fileList.length > 0) {
                      const tempFileURL = urlRes.fileList[0].tempFileURL
                      console.log('获取临时URL成功:', tempFileURL)
                      resolve({
                        fileID: uploadRes.fileID,
                        tempFileURL: tempFileURL,
                        cloudPath: cloudPath
                      })
                    } else {
                      console.error('获取临时URL失败:', urlRes)
                      reject(new Error('获取临时URL失败'))
                    }
                  },
                  fail: urlErr => {
                    console.error('获取临时URL失败:', urlErr)
                    reject(urlErr)
                  }
                })
              },
              fail: uploadErr => {
                console.error('文件上传到云开发失败:', uploadErr)
                reject(uploadErr)
              }
            })
          } else {
            reject(new Error(`下载失败，状态码: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          console.error('文件下载失败:', err)
          reject(err)
        }
      })
    })
  },

  // 刷新任务状态
  async refreshTaskStatus() {
    wx.showLoading({ title: '刷新中...' })
    
    try {
      const app = getApp()
      const db = wx.cloud.database()
      
      // 获取当前用户的所有数字人任务，不区分状态
      const res = await db.collection('digital_humans')
        .where({
          user_id: app.globalData.userInfo._openid
        })
        .get()
      console.log("获取所有数字人任务res: ", res)
      
      // 处理所有任务
      const taskPromises = res.data.map(async (task) => {
        try {
          let updateData = {
            updateTime: new Date()
          }
          
          if (task.status === 'completed') {
            // 如果任务已完成，但没有finalVideoUrl和finalAudioUrl，则下载文件
            if (!task.finalVideoUrl && task.videoDownloadUrl) {
              try {
                const videoResult = await this.downloadFileToCloud(task.videoDownloadUrl, `video_${task.taskId}.mp4`)
                updateData.finalVideoUrl = videoResult.tempFileURL
                updateData.finalVideoFileID = videoResult.fileID
                console.log('视频下载并上传到云开发完成:', videoResult)
              } catch (error) {
                console.error('视频下载失败:', error)
              }
            }
            
            if (!task.finalAudioUrl && task.audioDownloadUrl) {
              try {
                const audioResult = await this.downloadFileToCloud(task.audioDownloadUrl, `audio_${task.taskId}.mp3`)
                updateData.finalAudioUrl = audioResult.tempFileURL
                updateData.finalAudioFileID = audioResult.fileID
                console.log('音频下载并上传到云开发完成:', audioResult)
              } catch (error) {
                console.error('音频下载失败:', error)
              }
            }
          } else {
            // 如果任务状态不是completed，查询任务状态
            try {
              const statusResult = await this.queryTTSToVideoTaskStatus(task.taskId)
              
              // 更新任务状态和相关字段
              updateData.status = statusResult.status
              updateData.errorMessage = statusResult.error
              
              // 更新下载URL
              if (statusResult.videoDownloadUrl) {
                updateData.videoDownloadUrl = statusResult.videoDownloadUrl
              }
              if (statusResult.audioDownloadUrl) {
                updateData.audioDownloadUrl = statusResult.audioDownloadUrl
              }
              
              // 如果任务完成，尝试下载文件
              if (statusResult.status === 'completed') {
                if (statusResult.videoDownloadUrl && !task.finalVideoUrl) {
                  try {
                    const videoResult = await this.downloadFileToCloud(statusResult.videoDownloadUrl, `video_${task.taskId}.mp4`)
                    updateData.finalVideoUrl = videoResult.tempFileURL
                    updateData.finalVideoFileID = videoResult.fileID
                    console.log('视频下载并上传到云开发完成:', videoResult)
                  } catch (error) {
                    console.error('视频下载失败:', error)
                  }
                }
                
                if (statusResult.audioDownloadUrl && !task.finalAudioUrl) {
                  try {
                    const audioResult = await this.downloadFileToCloud(statusResult.audioDownloadUrl, `audio_${task.taskId}.mp3`)
                    updateData.finalAudioUrl = audioResult.tempFileURL
                    updateData.finalAudioFileID = audioResult.fileID
                    console.log('音频下载并上传到云开发完成:', audioResult)
                  } catch (error) {
                    console.error('音频下载失败:', error)
                  }
                }
              }
              
              console.log(`任务${task.taskId}状态查询结果:`, statusResult)
            } catch (error) {
              console.error(`查询任务${task.taskId}状态失败:`, error)
              // 查询失败时不更新状态，只更新时间
            }
          }
          
          // 如果有需要更新的数据，则更新数据库
          if (Object.keys(updateData).length > 1) { // 除了updateTime还有其他字段
            await db.collection('digital_humans').doc(task._id).update({
              data: updateData
            })
            console.log(`任务${task.taskId}数据库更新完成:`, updateData)
          }
          
        } catch (error) {
          console.error(`处理任务${task.taskId}失败:`, error)
        }
      })
      
      await Promise.all(taskPromises)
      
      // 重新加载任务列表
      await this.getDigitalHumanList()
      
      wx.showToast({ title: '刷新完成', icon: 'success' })
    } catch (error) {
      console.error('刷新任务状态失败:', error)
      wx.showToast({ title: '刷新失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 取消任务
  async cancelTask(e) {
    const taskId = e.currentTarget.dataset.taskId
    if (!taskId) {
      wx.showToast({ title: '任务ID不存在', icon: 'none' })
      return
    }

    try {
      await this.cancelTTSToVideoTask(taskId)
      
      // 更新数据库状态
      const app = getApp()
      const db = wx.cloud.database()
      await db.collection('digital_humans')
        .where({
          user_id: app.globalData.userInfo._openid,
          taskId: taskId
        })
        .update({
          data: {
            status: 'cancelled',
            updateTime: new Date()
          }
        })
      
      wx.showToast({ title: '任务已取消', icon: 'success' })
      
      // 刷新任务列表
      await this.getDigitalHumanList()
    } catch (error) {
      console.error('取消任务失败:', error)
      wx.showToast({ title: '取消失败', icon: 'none' })
    }
  },

  // 获取任务状态显示文本
  getStatusText(status) {
    const statusMap = {
      'pending': '等待中',
      'processing': '处理中',
      'generating_audio': '生成音频中',
      'generating_video': '合成视频中',
      'completed': '已完成',
      'failed': '生成失败',
      'cancelled': '已取消'
    }
    return statusMap[status] || status
  },

  // 获取临时文件URL
  getTempFileURL(fileID) {
    return new Promise((resolve, reject) => {
      wx.cloud.getTempFileURL({
        fileList: [fileID],
        success: res => {
          if (res.fileList && res.fileList.length > 0) {
            resolve(res.fileList[0].tempFileURL)
          } else {
            reject(new Error('获取临时URL失败'))
          }
        },
        fail: reject
      })
    })
  },





  // 更新任务记录
  async updateTaskRecord(taskId, updateData) {
    const db = wx.cloud.database()

    try {
      await db.collection('digital_humans')
        .where({
          taskId: taskId,
          _openid: app.globalData.userInfo._openid
        })
        .update({
          data: {
            ...updateData,
            updateTime: new Date()
          }
        })
    } catch (error) {
      console.error('更新任务记录失败:', error)
    }
  },

  // 获取数字人列表
  async getDigitalHumanList() {
    try {
      const app = getApp()
      const db = wx.cloud.database()
      
      const res = await db.collection('digital_humans')
        .where({
          user_id: app.globalData.userInfo._openid
        })
        .orderBy('createTime', 'desc')
        .get()
      
      this.setData({
        digitalHumanList: res.data.map(item => ({
          ...item,
          createTime: this.formatDate(item.createTime)
        }))
      })
    } catch (err) {
      console.error('获取数字人列表失败:', err)
      wx.showToast({
        title: '获取列表失败',
        icon: 'none'
      })
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

  // 预览视频
  previewVideo(e) {
    const url = e.currentTarget.dataset.url
    if (url) {
      wx.previewMedia({
        sources: [{
          url: url,
          type: 'video'
        }]
      })
    }
  },

  // 重新选择视频
  reChooseVideo() {
    this.setData({
      videoFile: null
    })
  },

  // 清空表单
  clearForm() {
    this.setData({
      videoFile: null,
      textContent: ''
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.refreshTaskStatus().then(() => {
      wx.stopPullDownRefresh()
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
})