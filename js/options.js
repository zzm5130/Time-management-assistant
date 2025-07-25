import StorageManager from './storage.js';

/**
 * 设置页面脚本
 * 处理设置的加载、保存和选择类型管理
 */
class SettingsManager {
    constructor() {
        // DOM元素
        this.timerToggle = document.getElementById('timer-toggle');
        this.statisticsToggle = document.getElementById('statistics-toggle');
        this.exportToggle = document.getElementById('export-toggle');
        this.manualRecordToggle = document.getElementById('manual-record-toggle');
        this.workTypesList = document.getElementById('work-types-list');
        this.newWorkTypeInput = document.getElementById('new-work-type');
        this.addTypeBtn = document.getElementById('add-type-btn');

        this.saveSettingsBtn = document.getElementById('save-settings');
        this.statusMessage = document.getElementById('status-message');

        // 当前设置
        this.currentSettings = {};

        // 初始化
        this.init();
    }

    /**
     * 初始化设置页面
     */
    async init() {
        // 加载设置
        await this.loadSettings();
        // 渲染选择类型
        this.renderWorkTypes();
        // 绑定事件
        this.bindEvents();
    }

    /**
     * 从本地存储加载设置
     */
    loadSettings() {
        return new Promise((resolve) => {
            this.currentSettings = StorageManager.getSettings();

            // 设置功能开关
            this.timerToggle.checked = this.currentSettings.features?.timer ?? true;
            this.statisticsToggle.checked = this.currentSettings.features?.statistics ?? true;
            this.exportToggle.checked = this.currentSettings.features?.export ?? true;
            this.manualRecordToggle.checked = this.currentSettings.features?.manualRecord ?? true;

            resolve();
        });
    }

    /**
     * 渲染选择类型列表
     */
    renderWorkTypes() {
        const workTypes = this.currentSettings.workTypes ?? ['工作', '生活', '运动', '学习'];
        this.workTypesList.innerHTML = '';

        workTypes.forEach((type, index) => {
            const typeItem = document.createElement('div');
            typeItem.className = 'work-type-item';
            typeItem.innerHTML = `
                <span>${type}</span>
                <button class="delete-type-btn action-btn" data-index="${index}" style="background-color: #ea4335;">
                    <i class="fas fa-trash"></i> 删除
                </button>
            `;
            this.workTypesList.appendChild(typeItem);
        });

        // 绑定删除按钮事件
        document.querySelectorAll('.delete-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.delete-type-btn').dataset.index);
                this.deleteWorkType(index);
            });
        });
    }

    /**
     * 绑定事件处理函数
     */
    bindEvents() {
        // 添加选择类型
        this.addTypeBtn.addEventListener('click', () => this.addWorkType());
        this.newWorkTypeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addWorkType();
        });

        // 功能开关事件
        this.timerToggle.addEventListener('change', () => this.saveSettings());
        this.statisticsToggle.addEventListener('change', () => this.saveSettings());
        this.exportToggle.addEventListener('change', () => this.saveSettings());
        this.manualRecordToggle.addEventListener('change', () => this.saveSettings());

        // 保存设置按钮
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());

        // 清除数据

    }

    /**
     * 添加选择类型
     */
    addWorkType() {
        const typeName = this.newWorkTypeInput.value.trim();
        if (!typeName) return;

        const workTypes = this.currentSettings.workTypes ?? [];
        if (workTypes.includes(typeName)) {
            this.showStatusMessage('该选择类型已存在', 'error');
            return;
        }

        workTypes.push(typeName);
        this.currentSettings.workTypes = workTypes;
        this.newWorkTypeInput.value = '';
        this.renderWorkTypes();
        this.saveSettings();
    }

    /**
     * 删除选择类型
     * @param {number} index - 索引
     */
    deleteWorkType(index) {
        const workTypes = this.currentSettings.workTypes ?? [];
        if (workTypes.length <= 1) {
            this.showStatusMessage('至少保留一种选择类型', 'error');
            return;
        }

        workTypes.splice(index, 1);
        this.currentSettings.workTypes = workTypes;
        this.renderWorkTypes();
        this.saveSettings();
    }

    /**
     * 保存设置
     */
    saveSettings() {
        // 更新功能开关设置
        const features = {
            timer: this.timerToggle.checked,
            statistics: this.statisticsToggle.checked,
            export: this.exportToggle.checked,
            manualRecord: this.manualRecordToggle.checked
        };

        // 更新设置对象
        this.currentSettings.features = features;

        // 保存到本地存储
        StorageManager.saveSettings(this.currentSettings);

        // 显示成功消息
        this.showStatusMessage('设置已保存', 'success');

        // 通知其他页面设置已更改
        chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED', settings: this.currentSettings });
    }

    /**
     * 显示状态消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 (success, error)
     */
    showStatusMessage(message, type) {
        this.statusMessage.textContent = message;
        this.statusMessage.className = 'status-message ' + type;
        this.statusMessage.style.display = 'block';

        // 3秒后隐藏
        setTimeout(() => {
            this.statusMessage.style.display = 'none';
        }, 3000);
    }

    /**
     * 清除所有数据
     */

}

// 初始化设置管理器
if (chrome && chrome.runtime) {
    document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
    });
}