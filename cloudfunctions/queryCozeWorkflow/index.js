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
    const { workflow_id, execute_id } = event;
    
    if (!workflow_id) {
      throw new Error('workflow_id is required');
    }
    
    if (!execute_id) {
      throw new Error('execute_id is required');
    }
    
    console.log('开始查询工作流执行结果，workflow_id：', workflow_id, 'execute_id：', execute_id);
    
    // 从环境变量获取token
    const token = process.env.COZE_TOKEN;
    if (!token) {
      throw new Error('COZE_TOKEN environment variable is not set');
    }
    
    // 创建 axios 实例，设置超时时间
    const api = axios.create({
      timeout: 10000, // 10秒超时
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const response = await retry(async () => {
      console.log('发起查询API请求...');
      const result = await api.get(`https://api.coze.cn/v1/workflows/${workflow_id}/run_histories/${execute_id}`);
      console.log('查询API请求成功');
      return result;
    });

    console.log('处理查询响应数据');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('查询API调用错误：', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};