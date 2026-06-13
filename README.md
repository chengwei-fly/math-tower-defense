# 算力防线 / Math Tower Defense

一款基于 Phaser 3 的数学塔防游戏。**边玩塔防边练数学**。

## 🎮 玩法

- 怪物沿 U 型路径来袭，点击空地放塔阻止它们到达基地
- **放塔、升级塔、触发超载**都要先做对数学题
- 答对获得 ✨ 魔能，击杀怪物获得 ⭐ 星尘
- 基地血量 ≤ 2 时可触发 **绝境超载**（子弹时间 + 答对清屏）
- 每波结束可获得 Roguelike **随机 buff 卡牌**（5 秒倒计时）

## 🚀 运行

```bash
npm install
npm run dev
```

打开 http://localhost:5173/ 即可游玩。

## 📁 项目结构

```
math-tower-defense/
├── src/
│   ├── index.html              # 入口 HTML
│   ├── game.js                 # 主游戏逻辑（场景/经济/答题/UI）
│   ├── main.js                 # 启动入口
│   ├── config/gameConfig.js    # 全局配置（题库/塔参数/波次）
│   ├── objects/                # 实体类
│   │   ├── Tower.js
│   │   ├── Monster.js
│   │   └── Bullet.js
│   ├── scenes/                 # Phaser 场景
│   │   ├── BootScene.js
│   │   ├── PreloadScene.js
│   │   ├── GameScene.js
│   │   └── UIScene.js
│   └── systems/                # 核心系统
│       ├── QuestionSystem.js
│       ├── EconomySystem.js
│       └── WaveSystem.js
├── package.json
└── vite.config.js
```

## 🛠️ 技术栈

- **Phaser 3.80** - 游戏框架
- **Vite** - 构建工具
- **WebAudio API** - 合成音效
- **HTML/CSS** - HUD / 答题面板 UI

## 📱 移动端适配

已对 360px-1920px 设备做响应式适配：
- HUD 高度自适应（36-40px）
- 塔工厂支持 5 张卡横排 + 横向滚动
- 答题面板支持横屏两列选项
- 触摸按钮满足 44×44px iOS HIG 标准

## 🎯 核心系统

- **双轨经济** - ⭐ 星尘（怪物掉落）+ ✨ 魔能（答题获取）
- **动态难度** - 连对 3 题升阶，连错 2 题降阶
- **Roguelike 宝箱** - 5 波一波结束，随机 3 张 buff 卡 5 秒倒计时
- **绝境超载** - 基地血量 ≤ 2 触发的翻盘机制
- **结算页伪战报** - "今日动用算力 X，击败 Y% 同龄人！"
