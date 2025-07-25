/**
 * 本地存储管理模块
 * 封装localStorage操作，提供数据持久化功能
 */
const StorageManager = {
    // 存储键名常量
    STORAGE_KEYS: {
        RECORDS: 'timeTracker_records',
        SETTINGS: 'timeTracker_settings',
        CURRENT_TIMER: 'timeTracker_currentTimer'
    },

    /**
     * 初始化存储系统
     * 如果没有初始数据，设置默认值
     */
    init() {
        // 初始化设置
        if (!localStorage.getItem(this.STORAGE_KEYS.SETTINGS)) {
            const defaultSettings = {
                features: {
                    timer: true,
                    statistics: true,
                    export: true,
                    manualRecord: true
                },
                workTypes: ['工作', '生活', '运动', '学习'],
                dateFormat: 'yyyy-MM-dd',
                timeFormat: 'HH:mm'
            };
            this.saveSettings(defaultSettings);
        }

        // 初始化记录数组
        if (!localStorage.getItem(this.STORAGE_KEYS.RECORDS)) {
            this.saveRecords([]);
        }
    },

    /**
     * 保存工作记录
     * @param {Array} records - 工作记录数组
     */
    saveRecords(records) {
        return new Promise((resolve, reject) => {
            if (!chrome || !chrome.storage) {
                reject('Storage API unavailable');
                return;
            }
            try {
                localStorage.setItem(this.STORAGE_KEYS.RECORDS, JSON.stringify(records));
                resolve(true);
            } catch (error) {
                console.error('保存记录失败:', error);
                reject(error);
            }
        });
    },

    /**
     * 获取所有工作记录
     * @returns {Array} 工作记录数组
     */
    getRecords() {
        if (!chrome || !chrome.storage) return Promise.reject('Storage API unavailable');
        try {
            const records = localStorage.getItem(this.STORAGE_KEYS.RECORDS);
            return records ? JSON.parse(records) : [];
        } catch (error) {
            console.error('获取记录失败:', error);
            return [];
        }
    },

    /**
     * 添加新的工作记录
     * @param {Object} record - 新记录对象
     * @returns {boolean} 添加是否成功
     */
    addRecord(record) {
        const records = this.getRecords();
        // 为记录添加唯一ID
        record.id = Date.now();
        records.push(record);
        return this.saveRecords(records);
    },

    /**
     * 更新工作记录
     * @param {number} id - 记录ID
     * @param {Object} updates - 要更新的字段
     * @returns {boolean} 更新是否成功
     */
    updateRecord(id, updates) {
        const records = this.getRecords();
        const index = records.findIndex(record => record.id === id);

        if (index !== -1) {
            records[index] = { ...records[index], ...updates };
            return this.saveRecords(records);
        }
        return false;
    },

    /**
     * 删除工作记录
     * @param {number} id - 记录ID
     * @returns {boolean} 删除是否成功
     */
    deleteRecord(id) {
        const records = this.getRecords();
        const newRecords = records.filter(record => record.id !== id);

        if (newRecords.length !== records.length) {
            return this.saveRecords(newRecords);
        }
        return false;
    },

    /**
     * 保存用户设置
     * @param {Object} settings - 设置对象
     */
    saveSettings(settings) {
        return new Promise((resolve, reject) => {
            if (!chrome || !chrome.storage) {
                reject('Storage API unavailable');
                return;
            }
            try {
                localStorage.setItem(this.STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
                resolve(true);
            } catch (error) {
                console.error('保存设置失败:', error);
                reject(error);
            }
        });
    },

    /**
     * 获取用户设置
     * @returns {Object} 设置对象
     */
    getSettings() {
        if (!chrome || !chrome.storage) return Promise.reject('Storage API unavailable');
        try {
            const settings = localStorage.getItem(this.STORAGE_KEYS.SETTINGS);
            return settings ? JSON.parse(settings) : {};
        } catch (error) {
            console.error('获取设置失败:', error);
            return {};
        }
    },

    /**
     * 更新特定设置项
     * @param {string} path - 设置路径，如 'features.timer'
     * @param {any} value - 新值
     * @returns {boolean} 更新是否成功
     */
    updateSetting(path, value) {
        const settings = this.getSettings();
        const pathParts = path.split('.');
        let current = settings;

        // 遍历路径设置值
        for (let i = 0; i < pathParts.length - 1; i++) {
            if (!current[pathParts[i]]) {
                current[pathParts[i]] = {};
            }
            current = current[pathParts[i]];
        }

        current[pathParts[pathParts.length - 1]] = value;
        return this.saveSettings(settings);
    },

    /**
     * 保存当前计时器状态
     * @param {Object} timerState - 计时器状态对象
     * 包含: isRunning, startTime, elapsedTime
     */
    saveCurrentTimer(timerState) {
        if (!chrome || !chrome.storage) return Promise.reject('Storage API unavailable');
        try {
            localStorage.setItem(this.STORAGE_KEYS.CURRENT_TIMER, JSON.stringify(timerState));
            return true;
        } catch (error) {
            console.error('保存计时器状态失败:', error);
            return false;
        }
    },

    /**
     * 获取当前计时器状态
     * @returns {Object|null} 计时器状态对象或null
     */
    getCurrentTimer() {
        if (!chrome || !chrome.storage) return Promise.reject('Storage API unavailable');
        try {
            const timerState = localStorage.getItem(this.STORAGE_KEYS.CURRENT_TIMER);
            return timerState ? JSON.parse(timerState) : null;
        } catch (error) {
            console.error('获取计时器状态失败:', error);
            return null;
        }
    },

    /**
     * 清除当前计时器状态
     */
    clearCurrentTimer() {
        return new Promise((resolve, reject) => {
            if (!chrome || !chrome.storage) {
                reject('Storage API unavailable');
                return;
            }
            try {
                localStorage.removeItem(this.STORAGE_KEYS.CURRENT_TIMER);
                resolve(true);
            } catch (error) {
                console.error('清除计时器状态失败:', error);
                reject(error);
            }
        });
    },

    /**
     * 按日期获取记录
     * @param {string} date - 日期字符串
     * @returns {Array} 该日期的记录数组
     */
    getRecordsByDate(date) {
        const records = this.getRecords();
        return records.filter(record => record.date === date);
    },

    /**
     * 获取今日记录
     * @returns {Array} 今日记录数组
     */
    getTodayRecords() {
        const today = new Date().toISOString().split('T')[0];
        return this.getRecordsByDate(today);
    },

    /**
     * 统计指定日期的总工作时间
     * @param {string} date - 日期字符串
     * @returns {number} 总分钟数
     */
    getTotalTimeByDate(date) {
        const records = this.getRecordsByDate(date);
        return records.reduce((total, record) => total + parseInt(record.duration || 0), 0);
    },

    /**
     * 统计指定日期除生活外的总用时
     * @param {string} date - 日期字符串
     * @returns {number} 总分钟数
     */
    getWorkTimeExcludingLifeByDate(date) {
        const records = this.getRecordsByDate(date);
        return records
            .filter(record => record.type !== '生活')
            .reduce((total, record) => total + parseInt(record.duration || 0), 0);
    }
};


// 初始化存储系统
// 初始化存储系统
if (typeof window !== 'undefined') {
    // 仅在浏览器环境且DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => StorageManager.init());
    } else {
        StorageManager.init();
    }
} else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
    // 在扩展背景环境中初始化
    chrome.runtime.onInstalled.addListener(() => StorageManager.init());
}
  // 修正原代码中存在的语法错误后，导出 StorageManager
  export default StorageManager;

