Page({
  data: {
    title: "首页",
    content: "这是一个简单的微信小程序首页",
    // 云配置
    cloudEnvId: 'cloud1-4g70ln4ka8628fc2',
    cloudFileId: '636c-cloud1-4g70ln4ka8628fc2-1348641401',
    // 云存储图片链接
    bannerImageUrl: '',
    digitalHumanBgUrl: '',
    voiceCloneBgUrl: '',
    materialBgUrl: '',
    productManageUrl: '',
    textExtractBgUrl: '',
    textRewriteBgUrl: '',
    videoCreateBgUrl: '',
    videoTextBgUrl: ''
  },
  onLoad: function() {
    console.log('页面加载完成');
    this.loadCloudImages();
  },
  
  // 从云存储加载图片
  loadCloudImages: function() {
    wx.showLoading({
      title: '加载中...',
    });
    
    // 云存储中的图片fileID映射
    const imageFileIDs = {
      bannerImage: `cloud://${this.data.cloudEnvId}.${this.data.cloudFileId}/admin/images/banner.png`,
      digitalHumanBg: `cloud://${this.data.cloudEnvId}.${this.data.cloudFileId}/admin/images/digital_human_bg.png`,
      voiceCloneBg: `cloud://${this.data.cloudEnvId}.${this.data.cloudFileId}/admin/images/voice_clone_bg.png`,
      materialBg: `cloud://${this.data.cloudEnvId}.${this.data.cloudFileId}/admin/images/material_bg.png`,
      productManage: `cloud://${this.data.cloudEnvId}.${this.data.cloudFileId}/admin/images/product_manage.png`,
      textExtractBg: `cloud://${this.data.cloudEnvId}.${this.data.cloudFileId}/admin/images/text_extract_bg.png`,
      textRewriteBg: `cloud://${this.data.cloudEnvId}.${this.data.cloudFileId}/admin/images/text_rewrite_bg.png`,
      videoCreateBg: `cloud://${this.data.cloudEnvId}.${this.data.cloudFileId}/admin/images/video_create_bg.png`,
      videoTextBg: `cloud://${this.data.cloudEnvId}.${this.data.cloudFileId}/admin/images/video_text_bg.png`
    };
    
    // 获取所有图片的临时链接
    wx.cloud.getTempFileURL({
      fileList: Object.values(imageFileIDs),
      success: res => {
        console.log('获取云存储图片链接成功', res);
        
        // 将获取的临时链接映射到对应的变量
        const fileList = res.fileList;
        
        // 设置每个图片的URL
        this.setData({
          bannerImageUrl: this.getUrlByFileID(fileList, imageFileIDs.bannerImage),
          digitalHumanBgUrl: this.getUrlByFileID(fileList, imageFileIDs.digitalHumanBg),
          voiceCloneBgUrl: this.getUrlByFileID(fileList, imageFileIDs.voiceCloneBg),
          materialBgUrl: this.getUrlByFileID(fileList, imageFileIDs.materialBg),
          productManageUrl: this.getUrlByFileID(fileList, imageFileIDs.productManage),
          textExtractBgUrl: this.getUrlByFileID(fileList, imageFileIDs.textExtractBg),
          textRewriteBgUrl: this.getUrlByFileID(fileList, imageFileIDs.textRewriteBg),
          videoCreateBgUrl: this.getUrlByFileID(fileList, imageFileIDs.videoCreateBg),
          videoTextBgUrl: this.getUrlByFileID(fileList, imageFileIDs.videoTextBg)
        });
      },
      fail: err => {
        console.error('获取云存储图片链接失败', err);
        // 获取失败时使用本地图片作为备用
        this.useLocalImages();
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },
  
  // 根据fileID从结果中获取临时URL
  getUrlByFileID: function(fileList, fileID) {
    const file = fileList.find(item => item.fileID === fileID);
    return file ? file.tempFileURL : '';
  },
  
  // 获取失败时使用本地图片
  useLocalImages: function() {
    this.setData({
      bannerImageUrl: '/images/banner.png',
      digitalHumanBgUrl: '/images/digital_human_bg.png',
      voiceCloneBgUrl: '/images/voice_clone_bg.png',
      materialBgUrl: '/images/material_bg.png',
      productManageUrl: '/images/product_manage.png',
      textExtractBgUrl: '/images/text_extract_bg.png',
      textRewriteBgUrl: '/images/text_rewrite_bg.png',
      videoCreateBgUrl: '/images/video_create_bg.png',
      videoTextBgUrl: '/images/video_text_bg.png'
    });
    
    wx.showToast({
      title: '使用本地图片',
      icon: 'none'
    });
  },

  // 跳转到素材库
  goToMaterialLib() {
    wx.navigateTo({
      url: '/pages/material/material'
    })
  },

  // 跳转到文案提取
  goToTextExtract() {
    wx.navigateTo({
      url: '/pages/textExtract/textExtract'
    })
  },

  // 跳转到文案仿写
  goToTextRewrite() {
    wx.navigateTo({
      url: '/pages/textRewrite/textRewrite'
    })
  },

  // 跳转到视频创作tab
  goToVideoCreateTab() {
    wx.switchTab({
      url: '/pages/videoCreate/videoCreate'
    })
  },

  // 跳转到爆款短视频文案创作
  goToVideoText() {
    wx.navigateTo({
      url: '/pages/video-text/video-text'
    })
  }
})