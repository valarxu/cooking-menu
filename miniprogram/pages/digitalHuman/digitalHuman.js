const app = getApp()

Page({
  data: {
    videoFile: null,
    textContent: '',
    isUploading: false,
    isGenerating: false,
    digitalHumanList: [],
    hasUserInfo: false,
    currentTaskId: '',
    taskStatus: 'idle' // idle, generating_audio, generating_video, completed, failed
  },

  onLoad() {
    this.checkUserInfo()
  },

  onShow() {
    this.checkUserInfo()
  },

  // 检查用户信息
  checkUserInfo() {
    console.log('检查用户信息:', app.globalData.userInfo)
    if (app.globalData.userInfo) {
      this.setData({
        hasUserInfo: true
      })
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

    this.setData({
      isGenerating: true,
      taskStatus: 'generating_audio'
    })

    try {
      // 1. 上传视频到云存储
      const videoUrl = await this.uploadVideoToCloud()
      
      // 2. 保存初始记录到数据库
      const taskId = await this.saveInitialRecord(videoUrl)
      
      // 3. 生成音频
      await this.generateAudio(taskId)
      
    } catch (error) {
      console.error('生成数字人视频失败:', error)
      wx.showToast({
        title: '生成失败，请重试',
        icon: 'none'
      })
      this.setData({
        isGenerating: false,
        taskStatus: 'failed'
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

  // 保存初始记录到数据库
  async saveInitialRecord(videoUrl) {
    const db = wx.cloud.database()
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      await db.collection('digital_humans').add({
        data: {
          taskId: taskId,
          videoUrl: videoUrl,
          textContent: this.data.textContent,
          status: 'generating_audio',
          createTime: new Date(),
          _openid: app.globalData.userInfo._openid
        }
      })
      
      this.setData({
        currentTaskId: taskId
      })
      
      return taskId
    } catch (error) {
      console.error('保存初始记录失败:', error)
      throw error
    }
  },

  // 生成音频
  async generateAudio(taskId) {
    try {
      // 获取上传视频的云存储记录
      const db = wx.cloud.database()
      const videoRecord = await db.collection('digital_humans')
        .where({
          taskId: taskId,
          _openid: app.globalData.userInfo._openid
        })
        .get()
      
      if (!videoRecord.data || videoRecord.data.length === 0) {
        throw new Error('找不到视频记录')
      }
      
      const videoUrl = videoRecord.data[0].videoUrl
      
      // 获取视频的临时URL
      const videoTempUrl = await this.getTempFileURL(videoUrl)
      
      // 调用heygem服务生成音频
      const audioResult = await this.callHeygemAudioAPI({
        speaker: taskId,
        text: this.data.textContent,
        format: 'wav',
        topP: 0.7,
        max_new_tokens: 1024,
        chunk_length: 100,
        repetition_penalty: 1.2,
        temperature: 0.7,
        need_asr: false,
        streaming: false,
        is_fixed_seed: 0,
        is_norm: 0,
        reference_audio: '', // 这里需要根据实际情况填写
        reference_text: '' // 这里需要根据实际情况填写
      })
      
      // 保存音频URL到数据库
      await this.updateTaskRecord(taskId, {
        audioUrl: audioResult.audioUrl || audioResult.audio_url,
        status: 'generating_video'
      })
      
      this.setData({
        taskStatus: 'generating_video'
      })
      
      // 生成视频
      await this.generateVideo(taskId, audioResult.audioUrl || audioResult.audio_url, videoTempUrl)
      
    } catch (error) {
      console.error('生成音频失败:', error)
      await this.updateTaskRecord(taskId, {
        status: 'failed',
        errorMessage: error.message
      })
      throw error
    }
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

  // 调用heygem音频生成API
  callHeygemAudioAPI(params) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'callHeygemService',
        data: {
          action: 'generateAudio',
          data: params
        },
        success: res => {
          if (res.result.success) {
            resolve(res.result.data)
          } else {
            reject(new Error(res.result.error || '音频生成失败'))
          }
        },
        fail: reject
      })
    })
  },

  // 生成视频
  async generateVideo(taskId, audioUrl, videoUrl) {
    try {
      // 调用heygem视频合成API
      const videoResult = await this.callHeygemVideoAPI({
        audio_url: audioUrl,
        video_url: videoUrl,
        code: taskId,
        chaofen: 0,
        watermark_switch: 0,
        pn: 1
      })
      
      // 轮询查询结果
      await this.pollVideoResult(taskId)
      
    } catch (error) {
      console.error('生成视频失败:', error)
      await this.updateTaskRecord(taskId, {
        status: 'failed',
        errorMessage: error.message
      })
      throw error
    }
  },

  // 调用heygem视频合成API
  callHeygemVideoAPI(params) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'callHeygemService',
        data: {
          action: 'submitVideo',
          data: params
        },
        success: res => {
          if (res.result.success) {
            resolve(res.result.data)
          } else {
            reject(new Error(res.result.error || '视频合成失败'))
          }
        },
        fail: reject
      })
    })
  },

  // 轮询查询视频生成结果
  async pollVideoResult(taskId) {
    const maxAttempts = 30 // 最多查询30次
    let attempts = 0
    
    const poll = async () => {
      attempts++
      
      try {
        const result = await this.queryVideoResult(taskId)
        
        // 根据heygem API的实际返回格式判断状态
        if (result.code === 200 && result.data && result.data.status === 'completed') {
          // 视频生成完成
          await this.updateTaskRecord(taskId, {
            status: 'completed',
            finalVideoUrl: result.data.video_url || result.data.videoUrl
          })
          
          this.setData({
            isGenerating: false,
            taskStatus: 'completed'
          })
          
          wx.showToast({
            title: '数字人视频生成成功',
            icon: 'success'
          })
          
          // 刷新列表
          this.getDigitalHumanList()
          
        } else if (result.code === 200 && result.data && result.data.status === 'failed') {
          throw new Error('视频生成失败')
        } else if (result.code === 200 && result.data && (result.data.status === 'processing' || result.data.status === 'pending')) {
          // 继续轮询
          if (attempts < maxAttempts) {
            setTimeout(poll, 3000) // 3秒后再次查询
          } else {
            throw new Error('视频生成超时')
          }
        } else {
          // 其他情况继续轮询或报错
          if (attempts < maxAttempts) {
            setTimeout(poll, 3000)
          } else {
            throw new Error('视频生成超时')
          }
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
    
    poll()
  },

  // 查询视频生成结果
  queryVideoResult(taskId) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'callHeygemService',
        data: {
          action: 'queryVideo',
          data: { code: taskId }
        },
        success: res => {
          if (res.result.success) {
            resolve(res.result.data)
          } else {
            reject(new Error(res.result.error || '查询失败'))
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
      const db = wx.cloud.database()
      const res = await db.collection('digital_humans')
        .where({
          _openid: app.globalData.userInfo._openid
        })
        .orderBy('createTime', 'desc')
        .get()
      
      console.log('获取数字人列表成功:', res.data)
      
      this.setData({
        digitalHumanList: res.data.map(item => ({
          ...item,
          createTime: this.formatDate(item.createTime)
        }))
      })
      
    } catch (error) {
      console.error('获取数字人列表失败:', error)
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
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  },

  // 预览视频
  previewVideo(e) {
    const videoUrl = e.currentTarget.dataset.url
    if (videoUrl) {
      wx.previewMedia({
        sources: [{
          url: videoUrl,
          type: 'video'
        }]
      })
    }
  },

  // 重新选择视频
  reChooseVideo() {
    this.chooseVideo()
  },

  // 清空表单
  clearForm() {
    this.setData({
      videoFile: null,
      textContent: '',
      taskStatus: 'idle'
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.getDigitalHumanList().then(() => {
      wx.stopPullDownRefresh()
    }).catch(() => {
      wx.stopPullDownRefresh()
    })
  }
})