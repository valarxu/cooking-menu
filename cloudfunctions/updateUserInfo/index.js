const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { userInfo, phoneNumber } = event
  
  try {
    const db = cloud.database()
    
    // 构建更新数据
    const updateData = {
      updateTime: db.serverDate()
    }
    
    // 只更新有变化的字段
    if (userInfo.nickName) {
      updateData.nickName = userInfo.nickName
    }
    if (userInfo.avatarUrl) {
      updateData.avatarUrl = userInfo.avatarUrl
    }
    if (phoneNumber) {
      updateData.phoneNumber = phoneNumber
    }
    
    // 更新用户信息
    const updateResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).update({
      data: updateData
    })
    
    if (updateResult.stats.updated === 0) {
      // 如果没有更新任何记录，可能是用户不存在，创建新用户
      await db.collection('users').add({
        data: {
          _openid: wxContext.OPENID,
          ...userInfo,
          phoneNumber: phoneNumber,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
    }
    
    return {
      success: true
    }
  } catch (err) {
    console.error('更新用户信息失败：', err)
    return {
      success: false,
      error: err.message || err
    }
  }
} 