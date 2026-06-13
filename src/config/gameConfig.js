// 游戏核心配置
export const gameConfig = {
  // 游戏尺寸
  width: 800,
  height: 600,
  
  // 调试模式
  debug: false,
  
  // 地图配置
  map: {
    gridWidth: 12,   // 横向格子数
    gridHeight: 8,   // 纵向格子数
    tileSize: 50,    // 每格像素大小
    padding: 50      // 边距
  },
  
  // 双轨经济系统
  economy: {
    initialStardust: 30,   // 初始星尘
    initialMagic: 0,       // 初始魔能
    stardustPerKill: 5,    // 每次击杀获得星尘
    magicPerAnswer: 10,    // 每次答对获得魔能
    magicPerCombo: 5       // 连击额外魔能
  },
  
  // 基地配置
  base: {
    initialLife: 20,
    maxLife: 20,
    overloadThreshold: 2,  // 触发超载的生命阈值
    overloadDuration: 3000 // 超载持续时间(ms)
  },
  
  // 塔配置
  towers: {
    basic: {
      name: '白板机枪塔',
      cost: 10,           // 星尘消耗
      damage: 5,
      range: 150,
      fireRate: 500,      // 射击间隔(ms)
      bulletSpeed: 300
    },
    ice: {
      name: '冰冻塔',
      upgradeCost: 20,    // 魔能消耗
      damage: 8,
      range: 120,
      fireRate: 800,
      bulletSpeed: 250,
      slowEffect: 0.5,    // 减速50%
      slowDuration: 2000
    },
    fire: {
      name: '火炮塔',
      upgradeCost: 25,
      damage: 15,
      range: 100,
      fireRate: 1000,
      bulletSpeed: 200,
      splashRadius: 80    // 范围伤害半径
    },
    sniper: {
      name: '狙击塔',
      upgradeCost: 30,
      damage: 50,
      range: 250,
      fireRate: 1500,
      bulletSpeed: 500
    }
  },
  
  // 怪物配置
  monsters: {
    basic: {
      speed: 60,
      life: 30,
      damage: 1,          // 到达终点扣的生命
      reward: 5           // 星尘奖励
    },
    fast: {
      speed: 120,
      life: 20,
      damage: 2,
      reward: 8
    },
    tank: {
      speed: 40,
      life: 100,
      damage: 3,
      reward: 15
    },
    elite: {
      speed: 80,
      life: 80,
      damage: 5,
      reward: 20
    }
  },
  
  // 波次配置
  waves: {
    initialDelay: 3000,   // 第一波延迟
    waveInterval: 5000,   // 波次间隔
    rewardInterval: 5,    // 每5波出宝箱
    monstersPerWave: 5,   // 每波基础怪物数
    growthFactor: 1.2     // 每波增长系数
  },
  
  // 答题系统
  questions: {
    cooldown: 1500,       // 答错冷却时间(ms)
    comboThreshold: 3,    // 连对升阶阈值
    dropThreshold: 2,     // 连错降阶阈值
    timeLimit: 10000      // 宝箱答题时限(ms)
  },
  
  // 动态难度等级
  difficultyLevels: [
    { name: '入门', range: '10以内加减', maxNum: 10 },
    { name: '基础', range: '20以内加减', maxNum: 20 },
    { name: '进阶', range: '50以内加减', maxNum: 50 },
    { name: '挑战', range: '100以内加减', maxNum: 100 },
    { name: '精英', range: '100以内加减乘除', maxNum: 100 }
  ]
};

// 路径点配置 (U型路径)
export const pathPoints = [
  { x: 50, y: 300 },      // 起点
  { x: 150, y: 300 },
  { x: 150, y: 100 },
  { x: 650, y: 100 },
  { x: 650, y: 500 },
  { x: 150, y: 500 },
  { x: 150, y: 300 },
  { x: 750, y: 300 }      // 终点
];