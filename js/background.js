/**
 * 扩展后台服务工作线程
 * 处理后台任务、持久化计时器状态、监听扩展事件
 */

// 确保chrome.runtime存在
if (chrome && chrome.runtime) {
  // 监听扩展安装事件
  if (chrome.runtime.onInstalled) {
chrome.runtime.onInstalled.addListener(() => {
    console.log('时间管理助手扩展已安装');
    // 初始化存储
    chrome.storage.local.get(['timeTracker_settings'], (result) => {
        if (!result.timeTracker_settings) {
            chrome.storage.local.set({
                timeTracker_settings: {
                    workTypes: ['工作', '生活', '运动', '学习'],
                    notifications: true
                }
            });
        }
    });
});

// 监听消息事件
if (chrome.runtime && chrome.runtime.onMessage) {
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'START_TIMER':
            startTimer(message.data);
            sendResponse({ status: 'started' });
            break;
        case 'PAUSE_TIMER':
            pauseTimer();
            sendResponse({ status: 'paused' });
            break;
        case 'CLEAR_TIMER':
            clearTimer();
            sendResponse({ status: 'cleared' });
            break;
        case 'GET_TIMER_STATUS':
            getTimerStatus(sendResponse);
            return true; // 保持消息通道开放
        default:
            sendResponse({ status: 'unknown command' });
    }
});
}
}

// 计时器状态
let timerInterval = null;
let timerState = {
    isRunning: false,
    startTime: 0,
    elapsedTime: 0
};

/**
 * 开始计时器
 * @param {Object} data - 计时器初始数据
 */
function startTimer(data) {
    if (timerInterval) clearInterval(timerInterval);

    timerState = {
        isRunning: true,
        startTime: data.startTime || Date.now(),
        elapsedTime: data.elapsedTime || 0
    };

    // 每秒更新一次计时器状态
    timerInterval = setInterval(() => {
        timerState.elapsedTime = Date.now() - timerState.startTime;
        // 保存状态到本地存储
        chrome.storage.local.set({ timeTracker_currentTimer: timerState });
    }, 1000);

    // 立即保存初始状态
    chrome.storage.local.set({ timeTracker_currentTimer: timerState });
}

/**
 * 暂停计时器
 */
function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    if (timerState.isRunning) {
        timerState.isRunning = false;
        timerState.elapsedTime = Date.now() - timerState.startTime;
        chrome.storage.local.set({ timeTracker_currentTimer: timerState });
    }
}

/**
 * 清除计时器
 */
function clearTimer() {
    pauseTimer();
    timerState = {
        isRunning: false,
        startTime: 0,
        elapsedTime: 0
    };
    chrome.storage.local.remove('timeTracker_currentTimer');
}

/**
 * 获取当前计时器状态
 * @param {Function} sendResponse - 响应回调函数
 */
function getTimerStatus(sendResponse) {
    chrome.storage.local.get(['timeTracker_currentTimer'], (result) => {
        if (result.timeTracker_currentTimer) {
            timerState = result.timeTracker_currentTimer;
            // 如果计时器应该运行但未运行，则恢复计时
            if (timerState.isRunning && !timerInterval) {
                startTimer(timerState);
            }
            sendResponse(timerState);
        } else {
            sendResponse(timerState);
        }
    });
}
}