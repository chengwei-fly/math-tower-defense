import Phaser from 'phaser';
import { gameConfig, pathPoints } from '../config/gameConfig.js';
import Tower from '../objects/Tower.js';
import Monster from '../objects/Monster.js';
import Bullet from '../objects/Bullet.js';
import WaveSystem from '../systems/WaveSystem.js';
import QuestionSystem from '../systems/QuestionSystem.js';
import EconomySystem from '../systems/EconomySystem.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    
    this.towers = [];
    this.monsters = [];
    this.bullets = [];
    this.stardusts = [];
    this.selectedTower = null;
    this.placingTower = false;
    this.gridPositions = [];
    this.path = null;
  }

  create() {
    // 初始化系统
    this.waveSystem = new WaveSystem(this);
    this.questionSystem = new QuestionSystem(this);
    this.economySystem = new EconomySystem(this);
    
    // 创建地图
    this.createMap();
    
    // 创建路径
    this.createPath();
    
    // 创建基地
    this.createBase();
    
    // 设置输入事件
    this.setupInput();
    
    // 启动波次系统
    this.time.delayedCall(gameConfig.waves.initialDelay, () => {
      this.waveSystem.startNextWave();
    });
    
    // 监听全局事件
    this.setupEvents();
  }

  createMap() {
    const { gridWidth, gridHeight, tileSize, padding } = gameConfig.map;
    
    // 创建格子背景
    for (let x = 0; x < gridWidth; x++) {
      for (let y = 0; y < gridHeight; y++) {
        const posX = padding + x * tileSize;
        const posY = padding + y * tileSize;
        
        // 检查是否在路径上
        const isOnPath = this.isOnPath(posX, posY, tileSize);
        
        if (!isOnPath) {
          const grid = this.add.image(posX + tileSize / 2, posY + tileSize / 2, 'grid');
          grid.setInteractive();
          grid.gridX = x;
          grid.gridY = y;
          grid.posX = posX;
          grid.posY = posY;
          this.gridPositions.push(grid);
        }
      }
    }
  }

  isOnPath(x, y, size) {
    // 简化版路径检测 - U型路径
    const pathWidth = 50;
    const centerX = 400;
    
    // 上方横向路径
    if (y >= 100 - pathWidth && y <= 100 + pathWidth && x >= 150 && x <= 650) return true;
    // 下方横向路径
    if (y >= 500 - pathWidth && y <= 500 + pathWidth && x >= 150 && x <= 650) return true;
    // 左侧垂直路径
    if (x >= 150 - pathWidth && x <= 150 + pathWidth && y >= 100 && y <= 500) return true;
    // 右侧垂直路径
    if (x >= 650 - pathWidth && x <= 650 + pathWidth && y >= 100 && y <= 500) return true;
    
    return false;
  }

  createPath() {
    // 创建路径可视化
    const graphics = this.add.graphics();
    graphics.lineStyle(40, 0x34495e, 0.8);
    
    // 绘制U型路径
    graphics.beginPath();
    graphics.moveTo(50, 300);  // 起点
    graphics.lineTo(150, 300);
    graphics.lineTo(150, 100);
    graphics.lineTo(650, 100);
    graphics.lineTo(650, 500);
    graphics.lineTo(150, 500);
    graphics.lineTo(150, 300);
    graphics.lineTo(750, 300); // 终点
    graphics.strokePath();
    
    // 创建Phaser路径对象用于怪物移动
    this.path = new Phaser.Curves.Path(50, 300);
    this.path.lineTo(150, 300);
    this.path.lineTo(150, 100);
    this.path.lineTo(650, 100);
    this.path.lineTo(650, 500);
    this.path.lineTo(150, 500);
    this.path.lineTo(150, 300);
    this.path.lineTo(750, 300);
  }

  createBase() {
    // 基地在终点附近
    this.base = this.add.image(750, 300, 'base');
    this.base.setScale(1);
    
    // 基地生命值显示
    this.baseLifeText = this.add.text(750, 340, '20', {
      font: '16px Microsoft YaHei',
      color: '#e74c3c'
    }).setOrigin(0.5);
  }

  setupInput() {
    // 点击格子放置塔
    this.gridPositions.forEach(grid => {
      grid.on('pointerdown', () => {
        if (!this.placingTower && !grid.hasTower) {
          this.tryPlaceTower(grid);
        }
      });
      
      grid.on('pointerover', () => {
        if (!grid.hasTower) {
          grid.setTint(0x3498db);
        }
      });
      
      grid.on('pointerout', () => {
        grid.clearTint();
      });
    });
    
    // 点击塔选中/升级
    this.input.on('pointerdown', (pointer) => {
      // 检查是否点击了塔
      const clickedTower = this.towers.find(t => {
        const bounds = t.getBounds();
        return pointer.x >= bounds.x && pointer.x <= bounds.right &&
               pointer.y >= bounds.y && pointer.y <= bounds.bottom;
      });
      
      if (clickedTower && !this.placingTower) {
        this.selectTower(clickedTower);
      }
    });
  }

  setupEvents() {
    // 监听答题成功事件
    this.events.on('answerCorrect', (data) => {
      this.economySystem.addMagic(gameConfig.economy.magicPerAnswer);
      this.registry.inc('correctCount');
      this.registry.inc('combo');
      
      // 连击升阶检测
      const combo = this.registry.get('combo');
      if (combo >= gameConfig.questions.comboThreshold) {
        this.questionSystem.increaseDifficulty();
        this.registry.set('combo', 0);
      }
      
      // 如果正在放置塔
      if (this.placingTower) {
        this.placeTower(this.pendingGrid);
      }
      
      // 如果正在升级塔
      if (this.upgradingTower) {
        this.upgradeTower(this.upgradingTower, this.pendingUpgradeType);
      }
      
      // 如果正在领取卡牌
      if (this.selectingCard) {
        this.applyCardEffect(this.selectedCardIndex);
      }
      
      // 如果正在超载
      if (this.registry.get('isOverloading')) {
        this.executeOverload();
      }
    });
    
    // 监听答题失败事件
    this.events.on('answerWrong', () => {
      this.registry.set('combo', 0);
      
      // 连错降阶检测
      this.registry.inc('wrongCount');
      const wrongCount = this.registry.get('wrongCount');
      if (wrongCount >= gameConfig.questions.dropThreshold) {
        this.questionSystem.decreaseDifficulty();
        this.registry.set('wrongCount', 0);
      }
      
      // 1.5秒冷却后刷新新题
      this.time.delayedCall(gameConfig.questions.cooldown, () => {
        this.events.emit('refreshQuestion');
      });
    });
    
    // 监听怪物到达终点
    this.events.on('monsterReachEnd', (damage) => {
      const life = this.registry.get('life') - damage;
      this.registry.set('life', Math.max(0, life));
      this.updateBaseLife();
      
      if (life <= 0) {
        this.gameOver();
      }
      
      // 检查是否触发超载
      if (life <= gameConfig.base.overloadThreshold && !this.registry.get('isOverloading')) {
        this.showOverloadButton();
      }
    });
    
    // 监听怪物死亡
    this.events.on('monsterKilled', (reward) => {
      this.economySystem.addStardust(reward);
      this.registry.inc('killCount');
    });
    
    // 监听波次完成
    this.events.on('waveComplete', () => {
      const wave = this.registry.get('wave');
      if (wave % gameConfig.waves.rewardInterval === 0) {
        this.showCardPanel();
      }
    });
  }

  tryPlaceTower(grid) {
    const stardust = this.registry.get('stardust');
    const cost = gameConfig.towers.basic.cost;
    
    if (stardust >= cost) {
      this.placingTower = true;
      this.pendingGrid = grid;
      
      // 触发答题
      this.events.emit('showQuestion', {
        reason: 'place',
        cost: cost
      });
    }
  }

  placeTower(grid) {
    const cost = gameConfig.towers.basic.cost;
    this.economySystem.spendStardust(cost);
    
    const tower = new Tower(this, grid.posX + 25, grid.posY + 25, 'basic');
    this.towers.push(tower);
    grid.hasTower = true;
    grid.tower = tower;
    
    this.placingTower = false;
    this.pendingGrid = null;
  }

  selectTower(tower) {
    if (tower.type === 'basic') {
      // 白板塔可以升级
      this.selectedTower = tower;
      this.upgradingTower = tower;
      
      // 显示升级面板
      this.events.emit('showUpgradePanel', tower);
    }
  }

  upgradeTower(tower, upgradeType) {
    const magic = this.registry.get('magic');
    const cost = gameConfig.towers[upgradeType].upgradeCost;
    
    if (magic >= cost) {
      this.economySystem.spendMagic(cost);
      
      // 更换塔类型
      tower.upgrade(upgradeType);
      
      this.upgradingTower = null;
      this.pendingUpgradeType = null;
    }
  }

  showOverloadButton() {
    document.getElementById('overload-btn').classList.add('show');
    
    document.getElementById('overload-btn').onclick = () => {
      this.startOverload();
    };
  }

  startOverload() {
    this.registry.set('isOverloading', true);
    
    // 子弹时间 - 减速所有怪物
    this.monsters.forEach(m => {
      m.slow(0.1, gameConfig.base.overloadDuration);
    });
    
    // 弹出高收益题
    this.events.emit('showQuestion', {
      reason: 'overload',
      isHighReward: true
    });
    
    document.getElementById('overload-btn').classList.remove('show');
  }

  executeOverload() {
    // 清屏效果 - 消灭所有怪物
    this.monsters.forEach(m => {
      m.die();
    });
    
    this.registry.set('isOverloading', false);
    
    // 视觉效果
    this.cameras.main.flash(500, 255, 0, 0);
  }

  showCardPanel() {
    // 暂停游戏
    this.registry.set('isPaused', true);
    
    // 生成3张随机卡牌
    const cards = this.generateCards();
    
    this.events.emit('showCardPanel', cards);
  }

  generateCards() {
    const cardPool = [
      { id: 'iceTower', name: '冰冻塔', icon: '❄️', effect: 'freeIceTower' },
      { id: 'heal', name: '基地回血', icon: '❤️', effect: 'healBase', value: 3 },
      { id: 'slow', name: '全屏减速', icon: '⏱️', effect: 'slowAll', value: 5 },
      { id: 'magic', name: '魔能补给', icon: '✨', effect: 'addMagic', value: 20 },
      { id: 'damage', name: '伤害提升', icon: '⚡', effect: 'damageBoost', value: 1.5 }
    ];
    
    // 随机选3张
    const shuffled = cardPool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  applyCardEffect(cardIndex) {
    // 通过UI场景获取选中的卡牌
    this.events.once('cardSelected', (card) => {
      switch (card.effect) {
        case 'freeIceTower':
          // 在随机位置放置一个冰冻塔
          const emptyGrid = this.gridPositions.find(g => !g.hasTower);
          if (emptyGrid) {
            const tower = new Tower(this, emptyGrid.posX + 25, emptyGrid.posY + 25, 'ice');
            this.towers.push(tower);
            emptyGrid.hasTower = true;
          }
          break;
        case 'healBase':
          const life = Math.min(this.registry.get('life') + card.value, gameConfig.base.maxLife);
          this.registry.set('life', life);
          this.updateBaseLife();
          break;
        case 'slowAll':
          this.monsters.forEach(m => m.slow(0.5, card.value * 1000));
          break;
        case 'addMagic':
          this.economySystem.addMagic(card.value);
          break;
        case 'damageBoost':
          this.towers.forEach(t => t.boostDamage(card.value, 10000));
          break;
      }
      
      this.registry.set('isPaused', false);
      this.selectingCard = false;
      this.waveSystem.startNextWave();
    });
  }

  updateBaseLife() {
    const life = this.registry.get('life');
    this.baseLifeText.setText(life.toString());
    
    // 更新HTML HUD
    document.getElementById('life-value').textContent = life;
    
    // 低血量警告
    if (life <= gameConfig.base.overloadThreshold) {
      this.base.setTint(0xff0000);
      this.cameras.main.shake(100, 0.01);
    }
  }

  gameOver() {
    this.registry.set('isPaused', true);
    
    // 显示结算页面
    document.getElementById('gameover-screen').classList.add('show');
    document.getElementById('correct-count').textContent = this.registry.get('correctCount');
    document.getElementById('survive-waves').textContent = this.registry.get('wave');
    document.getElementById('kill-count').textContent = this.registry.get('killCount');
    
    document.getElementById('restart-btn').onclick = () => {
      this.restartGame();
    };
  }

  restartGame() {
    // 重置所有状态
    this.registry.set('stardust', 30);
    this.registry.set('magic', 0);
    this.registry.set('life', 20);
    this.registry.set('wave', 0);
    this.registry.set('correctCount', 0);
    this.registry.set('killCount', 0);
    this.registry.set('combo', 0);
    this.registry.set('wrongCount', 0);
    this.registry.set('difficultyLevel', 0);
    this.registry.set('isOverloading', false);
    this.registry.set('isPaused', false);
    
    // 清除所有对象
    this.towers.forEach(t => t.destroy());
    this.monsters.forEach(m => m.destroy());
    this.bullets.forEach(b => b.destroy());
    
    this.towers = [];
    this.monsters = [];
    this.bullets = [];
    
    // 重置格子
    this.gridPositions.forEach(g => {
      g.hasTower = false;
      g.tower = null;
      g.clearTint();
    });
    
    // 隐藏UI
    document.getElementById('gameover-screen').classList.remove('show');
    document.getElementById('overload-btn').classList.remove('show');
    
    // 更新HUD
    document.getElementById('stardust-value').textContent = '30';
    document.getElementById('magic-value').textContent = '0';
    document.getElementById('wave-value').textContent = '0';
    document.getElementById('life-value').textContent = '20';
    
    this.updateBaseLife();
    this.base.clearTint();
    
    // 重新开始波次
    this.time.delayedCall(gameConfig.waves.initialDelay, () => {
      this.waveSystem.startNextWave();
    });
  }

  update(time, delta) {
    if (this.registry.get('isPaused')) return;
    
    // 更新怪物
    this.monsters.forEach(monster => {
      if (monster.active) {
        monster.update(delta);
      }
    });
    
    // 塔攻击逻辑
    this.towers.forEach(tower => {
      if (tower.active) {
        tower.tryAttack(this.monsters, time);
      }
    });
    
    // 更新子弹
    this.bullets.forEach(bullet => {
      if (bullet.active) {
        bullet.update(delta);
      }
    });
    
    // 清理无效对象
    this.cleanup();
  }

  cleanup() {
    // 移除死亡怪物
    this.monsters = this.monsters.filter(m => m.active);
    
    // 移除消失子弹
    this.bullets = this.bullets.filter(b => b.active);
  }
}