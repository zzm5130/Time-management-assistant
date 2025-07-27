import StorageManager from './storage.js';

/**
 * 计时器模块
 * 处理计时逻辑、用户交互和数据记录
 */
class TimerManager {
    constructor() {
        // DOM元素
        this.timerDisplay = document.querySelector('.timer-display');
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resumeBtn = document.getElementById('resume-btn');
        this.endBtn = document.getElementById('end-btn');
        this.recordsTableBody = document.getElementById('records-table-body');
        this.totalWorkTimeEl = document.getElementById('total-work-time');
        this.excludingLifeTimeEl = document.getElementById('excluding-life-time');
        this.addRecordBtn = document.getElementById('add-record-btn');
        this.exportBtn = document.getElementById('export-btn');
        this.generateReportBtn = document.getElementById('generate-report-btn');
        this.settingsBtn = document.getElementById('settings-btn');
        this.workTypeSelect = document.getElementById('work-type-select');

        // 计时器状态
        this.timerInterval = null;
        this.isRunning = false;
        this.startTime = null;
        this.elapsedTime = 0;
        this.currentDate = new Date().toISOString().split('T')[0];

        // 初始化
        this.init();
    }

    /**
     * 初始化计时器
     */
    init() {
        // 从本地存储加载状态
        this.loadTimerState();
        // 加载记录
        this.loadRecords();
        // 更新统计数据
        this.updateStatistics();
        // 绑定事件
        this.bindEvents();
        // 加载工作类型
        this.loadWorkTypes();
    }

    /**
     * 从background.js加载计时器状态
     */
    loadTimerState() {
        // 首先尝试从background.js获取状态
        chrome.runtime.sendMessage({ type: 'GET_TIMER_STATUS' }, (response) => {
            if (response && response.isRunning) {
                this.isRunning = true;
                this.startTime = response.startTime;
                this.elapsedTime = response.elapsedTime;
                this.updateTimerDisplay();
                this.timerInterval = setInterval(() => this.updateTimerDisplay(), 1000);
                this.updateButtonStates();
            } else {
                // 如果background.js没有运行状态，检查本地存储
                const timerState = StorageManager.getCurrentTimer();
                if (timerState && timerState.isRunning) {
                    this.isRunning = true;
                    this.startTime = timerState.startTime;
                    this.elapsedTime = timerState.elapsedTime;
                    this.updateTimerDisplay();
                    // 恢复background.js的计时
                    chrome.runtime.sendMessage({
                        type: 'START_TIMER',
                        data: {
                            startTime: this.startTime,
                            elapsedTime: this.elapsedTime
                        }
                    });
                    this.timerInterval = setInterval(() => this.updateTimerDisplay(), 1000);
                    this.updateButtonStates();
                }
            }
        });
    }

    /**
     * 绑定事件处理函数
     */
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startTimer());
        this.pauseBtn.addEventListener('click', () => this.pauseTimer());
        this.resumeBtn.addEventListener('click', () => this.resumeTimer());
        this.endBtn.addEventListener('click', () => this.endTimer());
        this.addRecordBtn.addEventListener('click', () => this.showAddRecordForm());
        this.exportBtn.addEventListener('click', () => this.exportToExcel());
        this.generateReportBtn.addEventListener('click', () => this.generateReport());
        this.settingsBtn.addEventListener('click', () => this.openSettings());

        // 绑定删除所有记录按钮事件
        document.getElementById('delete-all-records-btn').addEventListener('click', () => this.deleteAllRecords());

        // 监听设置更新消息，刷新工作类型
        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === 'SETTINGS_UPDATED') {
                this.loadWorkTypes();
            }
        });
    }

    loadWorkTypes() {
        const settings = StorageManager.getSettings();
        const workTypes = settings.workTypes || ['工作'];
        this.workTypeSelect.innerHTML = '';
        
        workTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            this.workTypeSelect.appendChild(option);
        });
    }

    /**
     * 开始计时器
     */
    startTimer() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.startTime = Date.now() - this.elapsedTime;
        
        // 通知background.js开始计时
        chrome.runtime.sendMessage({
            type: 'START_TIMER',
            data: {
                startTime: this.startTime,
                elapsedTime: this.elapsedTime
            }
        });
        
        this.timerInterval = setInterval(() => this.updateTimerDisplay(), 1000);
        this.updateButtonStates();
        // 保存计时器状态
        StorageManager.saveCurrentTimer({
            isRunning: true,
            startTime: this.startTime,
            elapsedTime: this.elapsedTime
        });
    }

    /**
     * 暂停计时器
     */
    pauseTimer() {
        if (!this.isRunning) return;

        this.isRunning = false;
        clearInterval(this.timerInterval);
        this.elapsedTime = Date.now() - this.startTime;
        
        // 通知background.js暂停计时
        chrome.runtime.sendMessage({
            type: 'PAUSE_TIMER'
        });
        
        this.updateButtonStates();
        // 保存计时器状态
        StorageManager.saveCurrentTimer({
            isRunning: false,
            startTime: this.startTime,
            elapsedTime: this.elapsedTime
        });
    }

    /**
     * 继续计时器
     */
    resumeTimer() {
        this.startTimer();
    }

    /**
     * 结束计时器并保存记录
     */
    endTimer() {
        if (!this.startTime) return;

        this.isRunning = false;
        clearInterval(this.timerInterval);

        // 计算总时长（分钟）
        const endTime = Date.now();
        const durationMs = this.elapsedTime || (endTime - this.startTime);
        const durationMinutes = Math.round(durationMs / (1000 * 60));

        // 格式化时间
        const startTimeFormatted = this.formatTime(new Date(this.startTime));
        const endTimeFormatted = this.formatTime(new Date(endTime));

        // 创建记录
        const record = {
            date: this.currentDate,
            startTime: startTimeFormatted,
            endTime: endTimeFormatted,
            duration: durationMinutes,
            content: '计时工作',
            type: this.workTypeSelect.value
        };

        // 保存记录
        StorageManager.addRecord(record);

        // 通知background.js清除计时器
        chrome.runtime.sendMessage({
            type: 'CLEAR_TIMER'
        });
        
        // 重置计时器
        this.resetTimer();
        // 更新记录表格
        this.loadRecords();
        // 更新统计数据
        this.updateStatistics();
        // 清除计时器状态
        StorageManager.clearCurrentTimer();
    }

    /**
     * 重置计时器
     */
    resetTimer() {
        this.startTime = null;
        this.elapsedTime = 0;
        this.updateTimerDisplay();
        this.updateButtonStates();
    }

    /**
     * 更新计时器显示
     */
    updateTimerDisplay() {
        if (this.isRunning) {
            // 如果计时器正在运行，从background.js获取最新状态
            chrome.runtime.sendMessage({ type: 'GET_TIMER_STATUS' }, (response) => {
                if (response && response.isRunning) {
                    const elapsedMs = Date.now() - response.startTime;
                    this.timerDisplay.textContent = this.formatDuration(elapsedMs);
                    this.elapsedTime = elapsedMs;
                } else {
                    // 如果background.js没有运行状态，使用本地计算
                    const elapsedMs = Date.now() - this.startTime;
                    this.timerDisplay.textContent = this.formatDuration(elapsedMs);
                }
            });
        } else {
            // 如果计时器暂停，显示已记录的时间
            this.timerDisplay.textContent = this.formatDuration(this.elapsedTime);
        }
    }

    /**
     * 格式化时长为 HH:MM:SS
     * @param {number} ms - 毫秒数
     * @returns {string} 格式化后的时间字符串
     */
    formatDuration(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    /**
     * 格式化时间为 HH:MM
     * @param {Date} date - 日期对象
     * @returns {string} 格式化后的时间字符串
     */
    formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    /**
     * 更新按钮状态
     */
    updateButtonStates() {
        this.startBtn.disabled = this.isRunning;
        this.pauseBtn.disabled = !this.isRunning;
        this.resumeBtn.disabled = this.isRunning;
        this.endBtn.disabled = !this.startTime;
    }

    /**
     * 加载工作记录并显示
     */
    loadRecords() {
        const records = StorageManager.getTodayRecords();
        this.recordsTableBody.innerHTML = '';

        if (records.length === 0) {
            this.recordsTableBody.innerHTML = `
                <tr class="no-records">
                    <td colspan="7">暂无记录</td>
                </tr>
            `;
            return;
        }

        // 按开始时间排序（最新的在前面）
        records.sort((a, b) => new Date(`${a.date}T${b.startTime}`) - new Date(`${a.date}T${a.startTime}`));

        records.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.date}</td>
                <td>${record.startTime}</td>
                <td>${record.endTime}</td>
                <td>${record.duration}分钟</td>
                <td>${record.content}</td>
                <td>${record.type}</td>
                <td class="action-icons">
                    <div class="record-actions">
                        <button class="edit-btn" data-id="${record.id}">编辑</button>
                        <button class="delete-btn" data-id="${record.id}">删除</button>
                    </div>
                </td>
            `;
            this.recordsTableBody.appendChild(row);
        });

        // 绑定编辑和删除按钮事件
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => this.editRecord(btn.dataset.id));
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => this.deleteRecord(btn.dataset.id));
        });
    }

    /**
     * 更新统计数据
     */
    updateStatistics() {
        const today = new Date().toISOString().split('T')[0];
        const totalWorkTime = StorageManager.getTotalTimeByDate(today);
        const excludingLifeTime = StorageManager.getWorkTimeExcludingLifeByDate(today);

        this.totalWorkTimeEl.textContent = totalWorkTime;
        this.excludingLifeTimeEl.textContent = excludingLifeTime;
    }

    /**
     * 显示消息提示
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 (success, error)
     */
    showMessage(message, type) {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `status-message ${type}`;
        messageEl.textContent = message;
        messageEl.style.position = 'fixed';
        messageEl.style.bottom = '20px';
        messageEl.style.left = '50%';
        messageEl.style.transform = 'translateX(-50%)';
        messageEl.style.padding = '10px 20px';
        messageEl.style.borderRadius = '5px';
        messageEl.style.color = 'white';
        messageEl.style.zIndex = '1000';
        messageEl.style.backgroundColor = type === 'success' ? '#4caf50' : '#f44336';

        // 添加到页面
        document.body.appendChild(messageEl);

        // 3秒后移除
        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }

    /**
     * 显示添加记录表单
     */
    showAddRecordForm() {
        const workTypes = StorageManager.getSettings().workTypes || ['工作', '生活', '运动', '学习'];
        const now = new Date();
        const currentTime = this.formatTime(now);

        // 创建简单的添加记录表单
        const content = `
            <div style="padding: 15px;">
                <h3 style="margin-bottom: 15px;">添加记录</h3>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px;">具体内容:</label>
                    <input type="text" id="record-content" style="width: 100%; padding: 8px;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px;">选择类型:</label>
                    <select id="record-type" style="width: 100%; padding: 8px;">
                        ${workTypes.map(type => `<option value="${type}">${type}</option>`).join('')}
                    </select>
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px;">开始时间:</label>
                    <input type="time" id="record-start" style="width: 100%; padding: 8px;" value="${currentTime}">
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px;">结束时间:</label>
                    <input type="time" id="record-end" style="width: 100%; padding: 8px;" value="${currentTime}">
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="save-record" style="flex: 1; padding: 8px; background: #4285f4; color: white; border: none; border-radius: 5px; cursor: pointer;">保存</button>
                    <button id="cancel-record" style="flex: 1; padding: 8px; background: #e0e0e0; border: none; border-radius: 5px; cursor: pointer;">取消</button>
                </div>
            </div>
        `;

        // 创建弹窗
        const dialog = document.createElement('div');
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.background = 'white';
        dialog.style.borderRadius = '10px';
        dialog.style.boxShadow = '0 0 20px rgba(0,0,0,0.2)';
        dialog.style.width = '350px';
        dialog.innerHTML = content;
        document.body.appendChild(dialog);

        // 绑定事件
        dialog.querySelector('#save-record').addEventListener('click', () => {
            const content = dialog.querySelector('#record-content').value;
            const type = dialog.querySelector('#record-type').value;
            const startTime = dialog.querySelector('#record-start').value;
            const endTime = dialog.querySelector('#record-end').value;

            if (!content || !startTime || !endTime) {
                alert('请填写所有必填字段');
                return;
            }

            // 计算时长
            const start = new Date(`${this.currentDate}T${startTime}`);
            const end = new Date(`${this.currentDate}T${endTime}`);
            const duration = Math.round((end - start) / (1000 * 60));

            if (duration <= 0) {
                alert('结束时间必须晚于开始时间');
                return;
            }

            // 创建记录
            const record = {
                date: this.currentDate,
                startTime,
                endTime,
                duration,
                content,
                type
            };

            // 保存记录
            StorageManager.addRecord(record);
            this.loadRecords();
            this.updateStatistics();
            this.showMessage('记录添加成功', 'success');
            dialog.remove();
        });

        dialog.querySelector('#cancel-record').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
    }

    /**
     * 编辑记录
     * @param {string} id - 记录ID
     */
    editRecord(id) {
        const recordId = parseInt(id);
        const records = StorageManager.getRecords();
        const record = records.find(r => r.id === recordId);

        if (!record) {
            this.showMessage('未找到该记录', 'error');
            return;
        }

        const workTypes = StorageManager.getSettings().workTypes || ['工作', '生活', '运动', '学习'];

        // 创建编辑表单
        const content = `
            <div style="padding: 15px;">
                <h3 style="margin-bottom: 15px;">编辑记录</h3>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px;">具体内容:</label>
                    <input type="text" id="edit-record-content" style="width: 100%; padding: 8px;" value="${this.escapeHtml(record.content || '')}">
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px;">选择类型:</label>
                    <select id="edit-record-type" style="width: 100%; padding: 8px;">
                        ${workTypes.map(type => `<option value="${type}" ${record.type === type ? 'selected' : ''}>${type}</option>`).join('')}
                    </select>
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px;">日期:</label>
                    <input type="date" id="edit-record-date" style="width: 100%; padding: 8px;" value="${record.date}">
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px;">开始时间:</label>
                    <input type="time" id="edit-record-start" style="width: 100%; padding: 8px;" value="${record.startTime}">
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px;">结束时间:</label>
                    <input type="time" id="edit-record-end" style="width: 100%; padding: 8px;" value="${record.endTime}">
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="save-edit-record" style="flex: 1; padding: 8px; background: #4285f4; color: white; border: none; border-radius: 5px; cursor: pointer;">保存</button>
                    <button id="cancel-edit-record" style="flex: 1; padding: 8px; background: #e0e0e0; border: none; border-radius: 5px; cursor: pointer;">取消</button>
                </div>
            </div>
        `;

        // 创建弹窗
        const dialog = document.createElement('div');
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.background = 'white';
        dialog.style.borderRadius = '10px';
        dialog.style.boxShadow = '0 0 20px rgba(0,0,0,0.2)';
        dialog.style.width = '350px';
        dialog.innerHTML = content;
        document.body.appendChild(dialog);

        // 绑定事件
        dialog.querySelector('#save-edit-record').addEventListener('click', () => {
            const content = dialog.querySelector('#edit-record-content').value;
            const type = dialog.querySelector('#edit-record-type').value;
            const date = dialog.querySelector('#edit-record-date').value;
            const startTime = dialog.querySelector('#edit-record-start').value;
            const endTime = dialog.querySelector('#edit-record-end').value;

            if (!content || !date || !startTime || !endTime) {
                alert('请填写所有必填字段');
                return;
            }

            // 计算时长
            const start = new Date(`${date}T${startTime}`);
            const end = new Date(`${date}T${endTime}`);
            const duration = Math.round((end - start) / (1000 * 60));

            if (duration <= 0) {
                alert('结束时间必须晚于开始时间');
                return;
            }

            // 更新记录
            const updatedRecord = {
                ...record,
                date,
                startTime,
                endTime,
                duration,
                content,
                type
            };

            // 保存更新
            StorageManager.updateRecord(recordId, updatedRecord);
            this.loadRecords();
            this.updateStatistics();
            this.showMessage('记录已更新', 'success');
            dialog.remove();
        });

        dialog.querySelector('#cancel-edit-record').addEventListener('click', () => {
            dialog.remove();
        });
    }

    /**
     * 转义HTML特殊字符
     * @param {string} text - 需要转义的文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * 删除所有记录
     */
    async deleteAllRecords() {
        if (!confirm('确定要删除所有记录吗？此操作不可恢复！')) {
            return;
        }

        try {
            await StorageManager.saveRecords([]);
            this.loadRecords();
            this.updateStatistics();
            this.showMessage('所有记录已成功删除', 'success');
        } catch (error) {
            console.error('删除所有记录失败:', error);
            this.showMessage('删除失败，请重试', 'error');
        }
    }

    /**
     * 删除记录
     * @param {string} id - 记录ID
     */
    deleteRecord(id) {
        if (confirm('确定要删除这条记录吗？')) {
            StorageManager.deleteRecord(parseInt(id));
            this.loadRecords();
            this.updateStatistics();
        }
    }

    /**
     * 导出到Excel
     */
    exportToExcel() {
        alert('导出Excel功能将在后续版本中实现');
    }

    /**
     * 生成报告
     */
    /**
     * 导出记录为CSV文件
     */
    exportToExcel() {
        const records = StorageManager.getRecords();
        if (!records.length) {
            this.showMessage('没有可导出的记录', 'error');
            return;
        }

        // CSV表头
        const headers = ['ID,日期,开始时间,结束时间,持续时间(分钟),选择类型,具体内容'];
        // 转换记录为CSV行
        const rows = records.map(record => {
            // 处理CSV特殊字符（逗号和双引号）
            const content = record.content ? `"${record.content.replace(/"/g, '""')}"` : '';
            return `${record.id},${record.date},${record.startTime},${record.endTime},${record.duration},${record.type},${content}`;
        });

        // 组合CSV内容
        const csvContent = headers.concat(rows).join('\n');
        // 创建Blob对象，添加UTF-8 BOM确保Excel正确识别编码
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // 设置文件名（包含当前日期）
        const date = new Date().toISOString().slice(0, 10);
        a.download = `时间记录_${date}.csv`;
        // 触发下载
        document.body.appendChild(a);
        a.click();
        // 清理
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showMessage('记录已成功导出', 'success');
    }

    /**
     * 生成HTML报告
     */
    generateReport() {
        const records = StorageManager.getRecords();
        if (!records.length) {
            this.showMessage('没有可生成报告的记录', 'error');
            return;
        }

        // 按日期和类型统计数据
        const statsByDate = {};
        const statsByType = {};
        let totalDuration = 0;

        records.forEach(record => {
            // 日期统计
            if (!statsByDate[record.date]) {
                statsByDate[record.date] = 0;
            }
            statsByDate[record.date] += record.duration;

            // 类型统计
            if (!statsByType[record.type]) {
                statsByType[record.type] = 0;
            }
            statsByType[record.type] += record.duration;

            totalDuration += record.duration;
        });

        // 生成HTML内容
        const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>时间记录报告</title>
    <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .report-container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #4285f4; padding-bottom: 10px; }
        h2 { color: #4285f4; margin-top: 25px; }
        .summary-stats { display: flex; justify-content: space-around; flex-wrap: wrap; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; min-width: 150px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #4285f4; }
        .stat-label { color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .charts-container { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 20px; margin: 30px 0; }
        .chart { flex: 1; min-width: 300px; background: #f8f9fa; padding: 15px; border-radius: 5px; }
        .chart-title { text-align: center; margin-bottom: 15px; font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="report-container">
        <h1>时间记录报告</h1>
        <p>生成日期: ${new Date().toLocaleDateString()}</p>

        <div class="summary-stats">
            <div class="stat-card">
                <div class="stat-value">${records.length}</div>
                <div class="stat-label">总记录数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalDuration}分钟</div>
                <div class="stat-label">总时长</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Object.keys(statsByDate).length}天</div>
                <div class="stat-label">记录天数</div>
            </div>
        </div>

        <h2>按日期统计</h2>
        <table>
            <tr><th>日期</th><th>时长(分钟)</th><th>时长(小时)</th></tr>
            ${Object.entries(statsByDate).map(([date, minutes]) => `
            <tr><td>${date}</td><td>${minutes}</td><td>${(minutes/60).toFixed(1)}</td></tr>`).join('')}
        </table>

        <h2>按类型统计</h2>
        <table>
            <tr><th>类型</th><th>时长(分钟)</th><th>占比</th></tr>
            ${Object.entries(statsByType).map(([type, minutes]) => {
                const percentage = ((minutes/totalDuration)*100).toFixed(1);
                return `<tr><td>${type}</td><td>${minutes}</td><td>${percentage}%</td></tr>`;
            }).join('')}
        </table>

        <h2>详细记录</h2>
        <table>
            <tr><th>日期</th><th>开始时间</th><th>结束时间</th><th>时长(分钟)</th><th>类型</th><th>内容</th></tr>
            ${records.map(record => `
            <tr><td>${record.date}</td><td>${record.startTime}</td><td>${record.endTime}</td><td>${record.duration}</td><td>${record.type}</td><td>${record.content}</td></tr>`).join('')}
        </table>

        <div class="footer">
            时间管理助手报告 | 生成于 ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>`;

        // 创建HTML文件并下载
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10);
        a.download = `时间记录报告_${date}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showMessage('报告已成功生成', 'success');
    }

    /**
     * 打开设置页面
     */
    openSettings() {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('html/options.html'));
        }
    }
}

// 初始化计时器
document.addEventListener('DOMContentLoaded', () => {
    new TimerManager();
});