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
    const { action, data } = event;
    
    if (!action) {
      throw new Error('action is required');
    }
    
    console.log('开始处理heygem请求，action：', action, '数据：', data);
    
    // 创建 axios 实例，设置超时时间
    const api = axios.create({
      timeout: 60000, // 60秒超时
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    let result;
    
    switch (action) {
      case 'generateAudio':
        result = await generateAudio(api, data);
        break;
      case 'submitVideo':
        result = await submitVideo(api, data);
        break;
      case 'queryVideo':
        result = await queryVideo(api, data);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    return {
      success: true,
      data: result
    };
    
  } catch (error) {
    console.error('调用heygem服务失败：', error);
    return {
      success: false,
      error: error.message || '调用heygem服务失败'
    };
  }
};

// 生成音频
async function generateAudio(api, data) {
  const {
    speaker,
    text,
    format = 'wav',
    topP = 0.7,
    max_new_tokens = 1024,
    chunk_length = 100,
    repetition_penalty = 1.2,
    temperature = 0.7,
    need_asr = false,
    streaming = false,
    is_fixed_seed = 0,
    is_norm = 0,
    reference_audio = '',
    reference_text = ''
  } = data;
  
  if (!speaker || !text) {
    throw new Error('speaker and text are required for audio generation');
  }
  
  const requestData = {
    speaker,
    text,
    format,
    topP,
    max_new_tokens,
    chunk_length,
    repetition_penalty,
    temperature,
    need_asr,
    streaming,
    is_fixed_seed,
    is_norm,
    reference_audio,
    reference_text
  };
  
  console.log('调用音频生成API，请求数据：', requestData);
  
  const response = await retry(async () => {
    return await api.post('http://127.0.0.1:8383/v1/invoke', requestData);
  });
  
  console.log('音频生成API响应：', response.data);
  return response.data;
}

// 提交视频合成
async function submitVideo(api, data) {
  const {
    audio_url,
    video_url,
    code,
    chaofen = 0,
    watermark_switch = 0,
    pn = 1
  } = data;
  
  if (!audio_url || !video_url || !code) {
    throw new Error('audio_url, video_url and code are required for video submission');
  }
  
  const requestData = {
    audio_url,
    video_url,
    code,
    chaofen,
    watermark_switch,
    pn
  };
  
  console.log('调用视频合成API，请求数据：', requestData);
  
  const response = await retry(async () => {
    return await api.post('http://127.0.0.1:8383/easy/submit', requestData);
  });
  
  console.log('视频合成API响应：', response.data);
  return response.data;
}

// 查询视频生成结果
async function queryVideo(api, data) {
  const { code } = data;
  
  if (!code) {
    throw new Error('code is required for video query');
  }
  
  console.log('查询视频生成结果，code：', code);
  
  const response = await retry(async () => {
    return await api.get(`http://127.0.0.1:8383/easy/query?code=${code}`);
  });
  
  console.log('视频查询API响应：', response.data);
  return response.data;
}