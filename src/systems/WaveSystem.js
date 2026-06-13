import { gameConfig } from '../config/gameConfig.js';
import Monster from '../objects/Monster.js';

export default class WaveSystem {
  constructor(scene) {
    this.scene = scene;
    this.currentWave = 0;
    this.monstersInWave = 0;
    this.monstersSpawned = 0;
    this.spawnTimer = null;
  }

  startNextWave() {
    this.currentWave++;
    this.scene.registry.set('wave', this.currentWave);
    
    // 计算本波怪物数量
    this.monstersInWave = Math.floor(
      gameConfig.waves.monstersPerWave * Math.pow(gameConfig.waves.growthFactor, this.currentWave - 1)
    );
    this.monstersSpawned = 0;
    
    // 开始生成怪物
    this.spawnMonsters();
  }

  spawnMonsters() {
    // 每500ms生成一个怪物
    this.spawnTimer = this.scene.time.addEvent({
      delay: 500,
      repeat: this.monstersInWave - 1,
      callback: () => {
        this.spawnMonster();
        this.monstersSpawned++;
        
        // 检查是否全部生成完成
        if (this.monstersSpawned >= this.monstersInWave) {
          this.spawnTimer.destroy();
        }
      }
    });
  }

  spawnMonster() {
    // 根据波次决定怪物类型
    let type = 'basic';
    
    if (this.currentWave >= 3 && Math.random() < 0.3) {
      type = 'fast';
    }
    if (this.currentWave >= 5 && Math.random() < 0.2) {
      type = 'tank';
    }
    if (this.currentWave >= 8 && Math.random() < 0.1) {
      type = 'elite';
    }
    
    // 创建怪物
    const monster = new Monster(this.scene, type, this.scene.path);
    this.scene.monsters.push(monster);
    
    // 根据波次增加怪物生命值
    monster.life *= Math.pow(1.1, this.currentWave - 1);
    monster.maxLife = monster.life;
    
    // 创建生命条
    monster.lifeBar = this.scene.add.rectangle(
      monster.x,
      monster.y - 30,
      40,
      6,
      0xff0000
    );
    
    // 监听怪物位置更新生命条
    this.scene.time.addEvent({
      delay: 100,
      repeat: -1,
      callback: () => {
        if (monster.active && monster.lifeBar) {
          monster.lifeBar.setPosition(monster.x, monster.y - 30);
          monster.lifeBar.setScale(monster.life / monster.maxLife, 1);
        }
      }
    });
  }

  checkWaveComplete() {
    // 检查是否所有怪物都被消灭或到达终点
    if (this.scene.monsters.length === 0 && this.monstersSpawned >= this.monstersInWave) {
      this.scene.events.emit('waveComplete');
      
      // 延迟后开始下一波
      this.scene.time.delayedCall(gameConfig.waves.waveInterval, () => {
        this.startNextWave();
      });
    }
  }
}