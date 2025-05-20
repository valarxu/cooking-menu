const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 生成自定义token
function generateToken(openid) {
  const timestamp = Date.now()
  const randomStr = crypto.randomBytes(16).toString('hex')
  const token = crypto.createHash('sha256')
    .update(`${openid}${timestamp}${randomStr}`)
    .digest('hex')
  return token
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const db = cloud.database()
  
  try {
    // 查询用户是否存在
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      // 用户不存在，创建新用户
      const newUser = {
        _openid: wxContext.OPENID,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
      
      await db.collection('users').add({
        data: newUser
      })
      
      return {
        success: true,
        token: wxContext.OPENID,
        isNewUser: true
      }
    } else {
      // 用户存在，返回用户信息
      return {
        success: true,
        token: wxContext.OPENID,
        userInfo: userResult.data[0],
        isNewUser: false
      }
    }
  } catch (err) {
    console.error('登录失败：', err)
    return {
      success: false,
      error: err.message || err
    }
  }
} 