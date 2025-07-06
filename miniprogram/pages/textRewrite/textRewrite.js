Page({
  data: {
    inputText: '',
    outputText: '',
    loading: false
  },
  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },
  onRewrite() {
    if (!this.data.inputText.trim()) {
      wx.showToast({
        title: '请输入文案内容',
        icon: 'none'
      });
      return;
    }

    // 先设置 loading 状态
    this.setData({ loading: true });
    
    // 调用云函数启动异步工作流
    wx.cloud.callFunction({
      name: 'callCozeWorkflow',
      data: {
        workflow_id: '7508747361033781257',
        parameters: {
          user_input: this.data.inputText
        },
        is_async: true
      },
      success: (res) => {
        console.log('云函数调用成功：', res);
        if (res.result.success && res.result.data.code === 0) {
          const executeId = res.result.data.execute_id;
          if (executeId) {
            // 开始轮询查询结果
            this.pollWorkflowResult('7508747361033781257', executeId);
          } else {
            wx.showToast({
              title: '未获取到执行ID',
              icon: 'none'
            });
            this.setData({ loading: false });
          }
        } else {
          wx.showToast({
            title: res.result.error || '启动工作流失败',
            icon: 'none'
          });
          this.setData({ loading: false });
        }
      },
      fail: (error) => {
        console.error('云函数调用失败：', error);
        wx.showToast({
          title: '请求失败，请重试',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    });
  },
  
  // 轮询查询工作流结果
  pollWorkflowResult(workflowId, executeId, maxAttempts = 60) {
    let attempts = 0;
    
    const poll = () => {
      attempts++;
      console.log(`第${attempts}次查询工作流结果`);
      
      wx.cloud.callFunction({
        name: 'queryCozeWorkflow',
        data: {
          workflow_id: workflowId,
          execute_id: executeId
        },
        success: (res) => {
          console.log('查询结果：', res);
          if (res.result.success && res.result.data.code === 0) {
            const status = res.result.data.data[0].execute_status;
            
            if (status === 'Success') {
              // 工作流完成，处理结果
              try {
                const outputData = JSON.parse(res.result.data.data[0].output);
                const outputContent = JSON.parse(outputData.Output);
                console.log("outputData: ", outputData)
                console.log("outputContent: ", outputContent)
                this.setData({
                  outputText: outputContent.output,
                  loading: false
                });
                wx.showToast({
                  title: '文案仿写完成',
                  icon: 'success'
                });
              } catch (error) {
                console.error('解析响应数据失败：', error);
                wx.showToast({
                  title: '解析响应失败',
                  icon: 'none'
                });
                this.setData({ loading: false });
              }
            } else if (status === 'Fail') {
              // 工作流失败
              wx.showToast({
                title: '工作流执行失败',
                icon: 'none'
              });
              this.setData({ loading: false });
            } else if (status === 'Running') {
              // 工作流还在运行，继续轮询
              if (attempts < maxAttempts) {
                setTimeout(poll, 3000); // 3秒后再次查询
              } else {
                wx.showToast({
                  title: '查询超时，请重试',
                  icon: 'none'
                });
                this.setData({ loading: false });
              }
            } else {
              // 未知状态
              wx.showToast({
                title: `未知状态: ${status}`,
                icon: 'none'
              });
              this.setData({ loading: false });
            }
          } else {
            // 查询失败，重试
            if (attempts < maxAttempts) {
              setTimeout(poll, 3000);
            } else {
              wx.showToast({
                title: '查询失败，请重试',
                icon: 'none'
              });
              this.setData({ loading: false });
            }
          }
        },
        fail: (error) => {
          console.error('查询云函数调用失败：', error);
          // 查询失败，重试
          if (attempts < maxAttempts) {
            setTimeout(poll, 3000);
          } else {
            wx.showToast({
              title: '查询失败，请重试',
              icon: 'none'
            });
            this.setData({ loading: false });
          }
        }
      });
    };
    
    // 开始轮询
    poll();
  },
  onCopy() {
    if (!this.data.outputText) {
      wx.showToast({
        title: '没有可复制的内容',
        icon: 'none'
      });
      return;
    }
    
    wx.setClipboardData({
      data: this.data.outputText,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  }
});