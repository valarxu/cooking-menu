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
    recordTimer: null
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

      // 2. 获取音频文件的临时URL
      const voiceRes = await wx.cloud.getTempFileURL({ fileList: [uploadResult.fileID] });
      let voice_url = voiceRes.fileList[0].tempFileURL;

      // 3. 调用本地Docker服务进行声音预处理和训练
      wx.showLoading({ title: '声音训练中...' })

      const speaker = this.generateUUID();
      const preprocessResult = await this.callPreprocessAPI(voice_url, speaker)

      if (preprocessResult.success) {
        // 4. 保存克隆记录到数据库
        await this.saveVoiceCloneRecord(uploadResult.fileID, speaker, voice_url)

        // 5. 使用训练好的音频，继续合成新音频文件
        wx.showLoading({ title: '合成测试音频中...' })

        const synthesizeResult = await this.synthesizeWithClonedVoice(
          this.data.defaultText,
          {
            speaker: speaker,
            sampleUrl: voice_url,
            referenceText: this.data.referenceText
          }
        )

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

        wx.hideLoading()
        wx.showToast({
          title: '声音克隆和合成完成！',
          icon: 'success'
        })

        // 关闭弹窗
        this.hideCloneModal()

      } else {
        throw new Error(preprocessResult.error || '声音训练失败')
      }

    } catch (error) {
      console.error('声音克隆失败', error)
      wx.hideLoading()
      wx.showToast({
        title: error.message || '提交失败，请重试',
        icon: 'none'
      })
    }

    this.setData({ isSubmitting: false })
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

  // 生成UUID
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  // 调用本地Docker服务进行声音预处理和训练
  callPreprocessAPI(voice_url, speaker) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'http://127.0.0.1:18180/v1/preprocess_and_tran',
        method: 'POST',
        header: {
          'content-type': 'application/json'
        },
        data: {
          format: 'mp3',
          reference_audio: voice_url,
          lang: 'zh'
        },
        success: (res) => {
          console.log('预处理API响应：', res)
          if (res.statusCode === 200) {
            resolve({ success: true, data: res.data })
          } else {
            resolve({ success: false, error: '预处理失败' })
          }
        },
        fail: (error) => {
          console.error('预处理API调用失败：', error)
          resolve({ success: false, error: '网络请求失败' })
        }
      })
    })
  },

  // 调用本地Docker服务合成音频
  callInvokeAPI(speaker, text, referenceAudio, referenceText) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'http://127.0.0.1:18180/v1/invoke',
        method: 'POST',
        header: {
          'content-type': 'application/json'
        },
        responseType: 'arraybuffer',
        data: {
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
        },
        success: (res) => {
          console.log('合成API响应：', res)
          console.log('响应状态码:', res.statusCode)
          console.log('响应数据类型:', typeof res.data)
          console.log('响应数据长度/大小:', res.data?.length || res.data?.byteLength || 'unknown')
          console.log('响应头:', res.header)

          if (res.statusCode === 200) {
            // 根据实际API响应格式，直接返回音频数据
            resolve({ success: true, audioData: res.data })
          } else {
            resolve({ success: false, error: '音频合成失败' })
          }
        },
        fail: (error) => {
          console.error('合成API调用失败：', error)
          resolve({ success: false, error: '网络请求失败' })
        }
      })
    })
  },

  // 保存声音克隆记录到数据库
  saveVoiceCloneRecord(audioFileID, speaker, audioUrl, synthesizedAudioUrl = null) {
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database()

      db.collection('voice_clone_records').add({
        data: {
          user_id: app.globalData.userInfo._openid || 'anonymous',
          audio_file_id: audioFileID,
          speaker: speaker,
          audio_url: audioUrl,
          synthesized_audio_url: synthesizedAudioUrl, // 新增合成音频URL字段
          reference_text: this.data.defaultText,
          status: 'success',
          created_at: new Date(),
          updated_at: new Date()
        },
        success: resolve,
        fail: reject
      })
    })
  },

  // 更新声音克隆记录的合成音频URL
  updateVoiceCloneRecordWithSynthesizedAudio(speaker, synthesizedAudioUrl) {
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database()

      db.collection('voice_clone_records')
        .where({
          user_id: app.globalData.userInfo._openid,
          speaker: speaker,
          status: 'success'
        })
        .update({
          data: {
            synthesized_audio_url: synthesizedAudioUrl,
            updated_at: new Date()
          },
          success: resolve,
          fail: reject
        })
    })
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

    // 检查是否已存在克隆声音，如果存在则替换
    const voiceList = this.data.voiceList.filter(voice => !voice.isCloned);
    voiceList.push(clonedVoice);

    this.setData({
      voiceList: voiceList,
      selectedVoiceId: clonedVoice.id
    });

    console.log('克隆声音已添加到列表:', clonedVoice);
    
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
        .limit(1)
        .get();

      if (res.data.length > 0) {
        const record = res.data[0];
        console.log('从数据库加载克隆声音记录:', record);
        
        this.addClonedVoiceToList({
          speaker: record.speaker,
          audioUrl: record.audio_url,
          referenceText: record.reference_text,
          synthesizedAudioUrl: record.synthesized_audio_url // 从数据库加载合成音频URL
        });
        
        // 验证加载的音频URL
        if (record.synthesized_audio_url) {
          console.log('✓ 从数据库加载到合成音频URL:', record.synthesized_audio_url);
        } else {
          console.log('⚠ 数据库中未找到合成音频URL，将使用原始训练音频');
        }
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

      if (result.success && result.audioData) {
        // 将合成的音频数据保存到云存储
        const savedAudio = await this.saveAudioDataToCloud(result.audioData)

        wx.hideLoading()
        wx.showToast({
          title: '音频合成完成！',
          icon: 'success'
        })

        return savedAudio
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

  // 保存音频数据到云存储
  saveAudioDataToCloud: function (audioData) {
    return new Promise((resolve, reject) => {
      try {
        // 生成临时文件名
        const tempFileName = `synthesized_audio_${Date.now()}.mp3`;
        const tempFilePath = `${wx.env.USER_DATA_PATH}/${tempFileName}`;

        // 写入临时文件
        wx.getFileSystemManager().writeFile({
          filePath: tempFilePath,
          data: audioData,
          encoding: 'binary',
          success: () => {
            console.log('临时文件写入成功:', tempFilePath);

            // 检查文件大小
            wx.getFileSystemManager().stat({
              path: tempFilePath,
              success: (statRes) => {
                console.log('临时文件大小:', statRes.size, '字节');
              },
              fail: (err) => {
                console.warn('无法获取文件大小:', err);
              }
            });

            // 上传到云存储
            wx.cloud.uploadFile({
              cloudPath: `synthesized_audio/${tempFileName}`,
              filePath: tempFilePath,
              success: (uploadResult) => {
                console.log('音频上传成功:', uploadResult.fileID);

                // 删除临时文件
                wx.getFileSystemManager().unlink({
                  filePath: tempFilePath,
                  success: () => console.log('临时文件删除成功'),
                  fail: (err) => console.warn('临时文件删除失败:', err)
                });

                // 获取临时下载链接
                wx.cloud.getTempFileURL({
                  fileList: [uploadResult.fileID],
                  success: (tempUrlResult) => {
                    if (tempUrlResult.fileList && tempUrlResult.fileList.length > 0) {
                      resolve(tempUrlResult.fileList[0].tempFileURL);
                    } else {
                      reject(new Error('获取临时URL失败'));
                    }
                  },
                  fail: reject
                });
              },
              fail: (error) => {
                console.error('音频上传失败:', error);
                // 删除临时文件
                wx.getFileSystemManager().unlink({
                  filePath: tempFilePath,
                  success: () => console.log('临时文件删除成功'),
                  fail: (err) => console.warn('临时文件删除失败:', err)
                });
                reject(error);
              }
            });
          },
          fail: (error) => {
            console.error('临时文件写入失败:', error);
            reject(error);
          }
        });
      } catch (error) {
        console.error('处理音频数据时出错:', error);
        reject(error);
      }
    });
  }
})