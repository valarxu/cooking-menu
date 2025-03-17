// 获取当前时间并格式化为iOS状态栏格式
function updateStatusBarTime() {
    const timeElement = document.querySelector('.ios-status-bar .time');
    if (timeElement) {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        timeElement.textContent = `${hours}:${minutes}`;
    }
}

// 初始化页面
function initPage() {
    // 更新状态栏时间
    updateStatusBarTime();
    setInterval(updateStatusBarTime, 60000); // 每分钟更新一次

    // 设置底部导航栏活动项
    const currentPage = window.location.pathname.split('/').pop();
    const tabItems = document.querySelectorAll('.ios-tab-bar .tab-item');
    
    tabItems.forEach(item => {
        const itemPage = item.getAttribute('data-page');
        if (currentPage === itemPage) {
            item.classList.add('active');
        }
    });

    // 添加按钮点击效果
    const buttons = document.querySelectorAll('.ios-button');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            this.style.opacity = '0.7';
            setTimeout(() => {
                this.style.opacity = '1';
            }, 150);
        });
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initPage);

// 模拟导航功能
function navigateTo(page) {
    console.log(`导航到: ${page}`);
    // 在实际应用中，这里会进行页面跳转
    // 在原型中，我们只是打印一条消息
}

// 添加到购物车功能
function addToCart(dishId, dishName, price) {
    console.log(`添加到购物车: ${dishName} (ID: ${dishId}) - ¥${price}`);
    // 显示添加成功提示
    showToast(`已添加 ${dishName} 到购物车`);
}

// 显示提示消息
function showToast(message, duration = 2000) {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = 'ios-toast';
    toast.textContent = message;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 显示提示
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // 隐藏并移除提示
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, duration);
}

// 模拟API请求
function simulateApiRequest(endpoint, data = null, delay = 1000) {
    return new Promise((resolve) => {
        setTimeout(() => {
            // 根据不同的端点返回不同的模拟数据
            let response;
            
            switch(endpoint) {
                case 'restaurants':
                    response = [
                        { id: 1, name: '家的味道', description: '家庭聚餐的理想选择', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5' },
                        { id: 2, name: '朋友聚会', description: '与朋友共享美食时光', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4' },
                        { id: 3, name: '健康餐厅', description: '注重营养均衡的健康选择', image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352' }
                    ];
                    break;
                    
                case 'dishes':
                    response = [
                        { id: 1, name: '红烧肉', description: '经典家常菜', price: 38, image: 'https://images.unsplash.com/photo-1544025162-d76694265947' },
                        { id: 2, name: '清蒸鱼', description: '鲜美可口', price: 48, image: 'https://images.unsplash.com/photo-1559847844-5315695dadae' },
                        { id: 3, name: '番茄炒蛋', description: '简单美味', price: 18, image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb' },
                        { id: 4, name: '宫保鸡丁', description: '麻辣鲜香', price: 32, image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e' }
                    ];
                    break;
                    
                case 'orders':
                    response = [
                        { id: 1, restaurant: '家的味道', date: '2025-03-15', status: '已完成', total: 104 },
                        { id: 2, restaurant: '朋友聚会', date: '2025-03-10', status: '准备中', total: 156 }
                    ];
                    break;
                    
                default:
                    response = { success: true };
            }
            
            resolve(response);
        }, delay);
    });
} 