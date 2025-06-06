const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
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
    const { workflow_id, parameters, is_async = true } = event;
    
    if (!workflow_id) {
      throw new Error('workflow_id is required');
    }
    
    console.log('开始处理请求，workflow_id：', workflow_id, '参数：', parameters, '异步模式：', is_async);
    
    // 从环境变量获取token
    const token = process.env.COZE_TOKEN;
    if (!token) {
      throw new Error('COZE_TOKEN environment variable is not set');
    }
    
    // 创建 axios 实例，设置超时时间
    const api = axios.create({
      timeout: 30000, // 30秒超时
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const requestData = {
      workflow_id: workflow_id,
      parameters: parameters || {}
    };
    
    // 如果是异步模式，添加异步参数
    if (is_async) {
      requestData.is_async = true;
    }
    
    const response = await retry(async () => {
      console.log('发起API请求...');
      const result = await api.post('https://api.coze.cn/v1/workflow/run', requestData);
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