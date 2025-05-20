const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const { code } = event
  
  try {
    const result = await cloud.getWXContext()
    return {
      success: true,
      openid: result.OPENID,
      session_key: result.SESSION_KEY
    }
  } catch (err) {
    console.error(err)
    return {
      success: false,
      error: err
    }
  }
} 