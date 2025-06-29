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
      baseUrl: 'http://127.0.0.1:8080',
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
      isGenerating: true
    })

    try {
      // 1. 上传视频到云存储
      const videoUrl = await this.uploadVideoToCloud()

      // 2. 提交视频生成任务
      const taskResult = await this.submitVideoGenerationTask(videoUrl)

      // 3. 保存任务记录到数据库
      await this.saveTaskRecord(taskResult.taskId, videoUrl)

      wx.showToast({
        title: '任务已提交，请点击刷新查看状态',
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
        isGenerating: false
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
          resolve(res.fileID)
        },
        fail: err => {
          console.error('视频上传失败:', err)
          reject(err)
        }
      })
    })
  },

  // 提交视频生成任务
  async submitVideoGenerationTask(videoUrl) {
    try {
      const result = await this.makeApiRequest('/api/video/submit', {
        video_url: videoUrl,
        text_content: this.data.textContent,
        voice_clone_id: this.data.voiceCloneRecord._id,
        reference_audio: this.data.voiceCloneRecord.audio_url,
        reference_text: this.data.voiceCloneRecord.reference_text
      })

      return result
    } catch (error) {
      console.error('提交视频生成任务失败:', error)
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
          status: 'pending',
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

  // 查询视频生成任务状态
  async queryVideoTaskStatus(taskId) {
    try {
      const result = await this.makeApiRequest(`/api/video/status/${taskId}`, null, 'GET')
      return result
    } catch (error) {
      console.error('查询视频任务状态失败:', error)
      throw error
    }
  },

  // 取消视频生成任务
  async cancelVideoTask(taskId) {
    try {
      const result = await this.makeApiRequest(`/api/video/cancel/${taskId}`, null, 'POST')
      return result
    } catch (error) {
      console.error('取消视频任务失败:', error)
      throw error
    }
  },
  // 刷新任务状态
  async refreshTaskStatus() {
    wx.showLoading({ title: '刷新中...' })
    
    try {
      const app = getApp()
      const db = wx.cloud.database()
      
      // 获取所有未完成的任务
      const res = await db.collection('digital_humans')
        .where({
          user_id: app.globalData.userInfo._openid,
          status: db.command.in(['pending', 'processing', 'generating_audio', 'generating_video'])
        })
        .get()
      
      // 并发查询所有任务状态
      const statusPromises = res.data.map(async (task) => {
        try {
          const statusResult = await this.queryVideoTaskStatus(task.taskId)
          
          if (statusResult.status !== task.status) {
            // 更新数据库中的任务状态
            await db.collection('digital_humans').doc(task._id).update({
              data: {
                status: statusResult.status,
                finalVideoUrl: statusResult.video_url || task.finalVideoUrl,
                errorMessage: statusResult.error_message || task.errorMessage,
                updateTime: new Date()
              }
            })
          }
          
          return {
            ...task,
            status: statusResult.status,
            finalVideoUrl: statusResult.video_url || task.finalVideoUrl,
            errorMessage: statusResult.error_message || task.errorMessage
          }
        } catch (error) {
          console.error(`查询任务${task.taskId}状态失败:`, error)
          return task
        }
      })
      
      await Promise.all(statusPromises)
      
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
      await this.cancelVideoTask(taskId)
      
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

  // 调用本地视频合成API
  callLocalVideoAPI(params) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'http://127.0.0.1:8383/easy/submit',
        method: 'POST',
        header: {
          'content-type': 'application/json'
        },
        data: params,
        success: (res) => {
          console.log('本地视频合成API响应：', res)
          if (res.statusCode === 200) {
            resolve({ success: true, data: res.data })
          } else {
            resolve({ success: false, error: '视频合成提交失败' })
          }
        },
        fail: (error) => {
          console.error('本地视频合成API调用失败：', error)
          resolve({ success: false, error: '网络请求失败' })
        }
      })
    })
  },

  // 生成视频
  async generateVideo(taskId, audioUrl, videoUrl) {
    try {
      wx.showLoading({ title: '提交视频合成...' })

      // 调用本地视频合成API
      const videoResult = await this.callLocalVideoAPI({
        audio_url: audioUrl,
        video_url: videoUrl,
        code: taskId,
        chaofen: 0,
        watermark_switch: 0,
        pn: 1
      })

      if (!videoResult.success) {
        throw new Error(videoResult.error || '视频合成提交失败')
      }

      wx.hideLoading()

      // 轮询查询结果
      await this.pollVideoResult(taskId)

    } catch (error) {
      console.error('生成视频失败:', error)
      wx.hideLoading()
      await this.updateTaskRecord(taskId, {
        status: 'failed',
        errorMessage: error.message
      })
      throw error
    }
  },

  // 查询本地视频合成结果
  queryLocalVideoResult(taskCode) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `http://127.0.0.1:8383/easy/query?code=${taskCode}`,
        method: 'GET',
        success: (res) => {
          console.log('本地视频查询API响应：', res)
          if (res.statusCode === 200) {
            resolve({ success: true, data: res.data })
          } else {
            resolve({ success: false, error: '查询失败' })
          }
        },
        fail: (error) => {
          console.error('本地视频查询API调用失败：', error)
          resolve({ success: false, error: '网络请求失败' })
        }
      })
    })
  },

  // 轮询查询视频生成结果
  async pollVideoResult(taskId) {
    const maxAttempts = 120 // 最多查询60次
    let attempts = 0

    const poll = async () => {
      attempts++

      try {
        const result = await this.queryLocalVideoResult(taskId)

        if (!result.success) {
          throw new Error(result.error || '查询失败')
        }

        const data = result.data
        console.log(`第${attempts}次查询结果:`, data)

        // 根据本地API的返回格式判断状态
        if (data.data && data.data.status === 2 && data.data.result) {
          // 视频生成完成，上传到云存储
          wx.showLoading({ title: '上传视频到云端...' })

          try {
            const cloudVideoUrl = await this.uploadLocalVideoToCloud(data.data.result, taskId)

            await this.updateTaskRecord(taskId, {
              status: 'completed',
              finalVideoUrl: cloudVideoUrl,
              localVideoUrl: data.data.result // 保留本地路径作为备份
            })

            this.setData({
              isGenerating: false,
              taskStatus: 'completed'
            })

            wx.hideLoading()
            wx.showToast({
              title: '数字人视频生成成功',
              icon: 'success'
            })

            // 刷新列表
            this.getDigitalHumanList()
          } catch (uploadError) {
            console.error('视频上传失败:', uploadError)
            wx.hideLoading()

            // 即使上传失败，也保存本地路径
            await this.updateTaskRecord(taskId, {
              status: 'completed',
              finalVideoUrl: data.data.result,
              uploadError: uploadError.message
            })

            this.setData({
              isGenerating: false,
              taskStatus: 'completed'
            })

            wx.showToast({
              title: '视频生成成功，但上传失败',
              icon: 'none',
              duration: 3000
            })

            // 刷新列表
            this.getDigitalHumanList()
          }

        } else if (data.data && data.data.status == 0) {
          throw new Error('视频生成失败')
        } else if (data.data && data.data.status == 1) {
          // 继续轮询
          if (attempts < maxAttempts) {
            setTimeout(poll, 60000) // 60秒后再次查询
          } else {
            throw new Error('视频生成超时')
          }
        } else {
          throw new Error('视频生成状态未知')
        }

      } catch (error) {
        console.error('查询视频结果失败:', error)
        await this.updateTaskRecord(taskId, {
          status: 'failed',
          errorMessage: error.message
        })

        this.setData({
          isGenerating: false,
          taskStatus: 'failed'
        })

        wx.showToast({
          title: '视频生成失败',
          icon: 'none'
        })
      }
    }

    // 开始轮询
    poll()
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