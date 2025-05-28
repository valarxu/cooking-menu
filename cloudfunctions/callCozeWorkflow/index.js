const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 创建 axios 实例，设置超时时间
const api = axios.create({
  timeout: 60000, // 20秒超时
  headers: {
    'Authorization': 'Bearer pat_kYuRTIN9Yo839HwSA9rzm89yWL8BPVxj6noyto3ri3gZXkHVgImDHqkLpFOtgC6T',
    'Content-Type': 'application/json'
  }
});

// 重试函数
async function retry(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay);
  }
}

exports.main = async (event, context) => {
  try {
    const { input } = event;
    console.log('开始处理请求，输入内容：', input);
    
    const response = await retry(async () => {
      console.log('发起API请求...');
      const result = await api.post('https://api.coze.cn/v1/workflow/run', {
        workflow_id: '7509119431479607311',
        parameters: {
          input: input
        }
      });
      console.log('API请求成功');
      return result;
    });

    console.log('处理响应数据');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('API调用错误：', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}; 