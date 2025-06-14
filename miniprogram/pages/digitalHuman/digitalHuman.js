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
      taskStatus: 'generating_audio'
    })

    try {
      // 1. 上传视频到云存储
      const videoUrl = await this.uploadVideoToCloud()

      // 2. 保存初始记录到数据库
      const taskId = await this.saveInitialRecord(videoUrl)

      // 3. 生成音频
      await this.generateAudio(taskId, videoUrl)

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
  async generateAudio(taskId, videoUrl) {
    try {
      wx.showLoading({ title: '生成音频中...' })

      // 获取视频的临时URL
      const videoTempUrl = await this.getTempFileURL(videoUrl)

      // 获取克隆声音记录中的参考音频URL
      const referenceAudioUrl = this.data.voiceCloneRecord.audio_url;
      const speaker = this.generateUUID();

      // 调用本地Docker服务生成音频
      const audioResult = await this.callLocalInvokeAPI({
        speaker: speaker,
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
        is_norm: 1,
        reference_audio: referenceAudioUrl,
        reference_text: this.data.voiceCloneRecord.reference_text
      })

      if (!audioResult.success) {
        throw new Error(audioResult.error || '音频生成失败')
      }

      // 将音频数据上传到云存储
      const audioCloudPath = await this.uploadAudioToCloud(audioResult.audioData, taskId)
      const audioTempUrl = await this.getTempFileURL(audioCloudPath)

      // 保存音频URL到数据库
      await this.updateTaskRecord(taskId, {
        audioUrl: audioCloudPath,
        status: 'generating_video'
      })

      this.setData({
        taskStatus: 'generating_video'
      })

      wx.hideLoading()

      // 生成视频
      await this.generateVideo(taskId, audioTempUrl, videoTempUrl)

    } catch (error) {
      console.error('生成音频失败:', error)
      wx.hideLoading()
      await this.updateTaskRecord(taskId, {
        status: 'failed',
        errorMessage: error.message
      })
      throw error
    }
  },

  // 调用本地Docker服务的invoke API
  callLocalInvokeAPI(params) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'http://127.0.0.1:18180/v1/invoke',
        method: 'POST',
        header: {
          'content-type': 'application/json'
        },
        responseType: 'arraybuffer',
        data: params,
        success: (res) => {
          console.log('本地invoke API响应：', res)
          if (res.statusCode === 200) {
            resolve({ success: true, audioData: res.data })
          } else {
            resolve({ success: false, error: '音频合成失败' })
          }
        },
        fail: (error) => {
          console.error('本地invoke API调用失败：', error)
          resolve({ success: false, error: '网络请求失败' })
        }
      })
    })
  },

  // 上传音频数据到云存储
  uploadAudioToCloud(audioData, taskId) {
    return new Promise((resolve, reject) => {
      const fileName = `digital_human_audios/${taskId}_${Date.now()}.wav`

      // 将ArrayBuffer转换为临时文件
      const fs = wx.getFileSystemManager()
      const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_audio_${Date.now()}.wav`

      fs.writeFile({
        filePath: tempFilePath,
        data: audioData,
        success: () => {
          // 上传到云存储
          wx.cloud.uploadFile({
            cloudPath: fileName,
            filePath: tempFilePath,
            success: res => {
              console.log('音频上传成功:', res)
              // 删除临时文件
              fs.unlink({ filePath: tempFilePath })
              resolve(res.fileID)
            },
            fail: err => {
              console.error('音频上传失败:', err)
              fs.unlink({ filePath: tempFilePath })
              reject(err)
            }
          })
        },
        fail: reject
      })
    })
  },

  // 上传本地视频文件到云存储
  uploadLocalVideoToCloud(localVideoPath, taskId) {
    return new Promise((resolve, reject) => {
      console.log('开始上传本地视频:', localVideoPath)

      // 将路径中的正斜杠替换为反斜杠（Windows格式）
      let normalizedPath = localVideoPath.replace(/\//g, '\\')
      
      // 去掉开头的反斜杠（如果有的话）
      if (normalizedPath.startsWith('\\')) {
        normalizedPath = normalizedPath.substring(1)
      }
      
      // 拼接完整的本地文件路径
      const fullLocalPath = `D:\\heygem_data\\face2face\\temp\\${normalizedPath}`
      console.log('原始路径:', localVideoPath)
      console.log('标准化路径:', normalizedPath)
      console.log('完整本地路径:', fullLocalPath)

      // 检查本地文件是否存在
      const fs = wx.getFileSystemManager()

      try {
        // 检查文件是否存在
        fs.accessSync(fullLocalPath)

        // 生成云存储文件名
        const fileName = `digital_human_videos/${taskId}_${Date.now()}.mp4`

        // 上传到云存储
        wx.cloud.uploadFile({
          cloudPath: fileName,
          filePath: fullLocalPath,
          success: res => {
            console.log('视频上传成功:', res)
            resolve(res.fileID)
          },
          fail: err => {
            console.error('视频上传失败:', err)
            reject(new Error(`视频上传失败: ${err.errMsg || err.message || '未知错误'}`))
          }
        })
      } catch (error) {
        console.error('本地文件不存在或无法访问:', error)
        reject(new Error(`本地文件不存在或无法访问: ${fullLocalPath}`))
      }
    })
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