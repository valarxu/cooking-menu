const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { cloudID } = event
  
  try {
    const res = await cloud.getOpenData({
      list: [cloudID]
    })
    
    return {
      success: true,
      phoneNumber: res.list[0].data.phoneNumber
    }
  } catch (err) {
    console.error(err)
    return {
      success: false,
      error: err
    }
  }
} 