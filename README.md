# 时间管理浏览器插件开发说明文档

## 项目概述
这是一个基于浏览器的时间管理插件，灵感来源于用户提供的时间跟踪界面。插件提供计时器功能、工作记录管理、数据统计分析，并支持本地数据存储和功能设置开关。

## 功能说明
### 核心功能
1. **计时器模块**
   - 开始/暂停/继续/结束计时功能
   - 实时显示当前计时时间

2. **工作记录管理**
   - 自动记录计时开始/结束时间
   - 手动添加记录
   - 编辑/删除现有记录
   - 按日期筛选查看记录

3. **数据统计分析**
   - 总工作时间统计
   - 按选择类型分类统计

4. **数据管理**
   - 本地数据存储
   - 导出记录为CSV文件
   - 生成HTML格式工作时间报告
   - 一键删除所有记录

### 设置功能
- 各模块功能开关
- 选择类型管理

## 技术架构
### 技术栈
- HTML5/CSS3 (UI界面)
- JavaScript (原生，无框架)
- Chrome Extension API (浏览器插件功能)
- localStorage (本地数据存储)
- Font Awesome (图标库)

### 项目结构
```
/Test12/
├── README.md
├── css\
│   └── styles.css
├── html\
│   ├── options.html
│   └── popup.html
├── icons\
│   ├── icon128.png
│   ├── icon16.png
│   ├── icon32.png
│   └── icon48.png
├── js\
│   ├── background.js
│   ├── options.js
│   ├── popup.js
│   └── storage.js
├── manifest.json
└── package.json
```

## 数据存储方案
使用localStorage进行本地数据存储，主要存储以下数据：

1. **用户设置**
```json
{
  "features": {
    "timer": true,
    "statistics": true,
    "export": true
  },
  "workTypes": ["工作", "生活", "运动", "学习"]
}
```

2. **工作记录**
```json
{
  "records": [
    {
      "id": 1,
      "date": "2025-07-21",
      "startTime": "09:52",
      "endTime": "11:53",
      "duration": 121,
      "content": "高保真图",
      "type": "工作"
    }
  ]
}
```

## 安装与使用
1. 克隆或下载项目到本地
2. 在Chrome浏览器中打开"chrome://extensions/"
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"，选择项目目录

## 注意事项
- 本插件所有数据均存储在浏览器本地，清除浏览器数据可能导致记录丢失
- "一键删除所有记录"功能将永久删除所有工作记录，请谨慎操作
- 建议定期导出数据备份
- 开发过程中需遵守浏览器插件开发规范