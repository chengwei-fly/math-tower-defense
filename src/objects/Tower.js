import Phaser from 'phaser';
import { gameConfig } from '../config/gameConfig.js';
import Bullet from './Bullet.js';

export default class Tower extends Phaser.GameObjects.Image {
  constructor(scene, x, y, type) {
    super(scene, x, y, `tower-${type}`);
    
    this.scene = scene;
    this.type = type;
    this.level = 1;
    this.lastFireTime = 0;
    this.target = null;
    
    // 获取塔配置
    const config = gameConfig.towers[type];
    this.damage = config.damage;
    this.range = config.range;
    this.fireRate = config.fireRate;
    this.bulletSpeed = config.bulletSpeed;
    
    // 特殊属性
    this.slowEffect = config.slowEffect || 0;
    this.slowDuration = config.slowDuration || 0;
    this.splashRadius = config.splashRadius || 0;
    
    // 添加到场景
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // 设置交互
    this.setInteractive();
    
    // 显示射程范围（调试模式）
    if (gameConfig.debug) {
      this.rangeCircle = scene.add.circle(x, y, this.range, 0x3498db, 0.2);
    }
  }

  upgrade(newType) {
    // 更换纹理
    this.setTexture(`tower-${newType}`);
    
    // 更新属性
    const config = gameConfig.towers[newType];
    this.type = newType;
    this.damage = config.damage;
    this.range = config.range;
    this.fireRate = config.fireRate;
    this.bulletSpeed = config.bulletSpeed;
    this.slowEffect = config.slowEffect || 0;
    this.slowDuration = config.slowDuration || 0;
    this.splashRadius = config.splashRadius || 0;
    
    // 更新射程显示
    if (this.rangeCircle) {
      this.rangeCircle.setRadius(this.range);
    }
    
    this.level++;
  }

  boostDamage(factor, duration) {
    const originalDamage = this.damage;
    this.damage *= factor;
    
    this.scene.time.delayedCall(duration, () => {
      this.damage = originalDamage;
    });
  }

  tryAttack(monsters, currentTime) {
    if (currentTime - this.lastFireTime < this.fireRate) return;
    
    // 找最近的怪物
    this.target = this.findNearestMonster(monsters);
    
    if (this.target && this.target.active) {
      this.fire(currentTime);
    }
  }

  findNearestMonster(monsters) {
    let nearest = null;
    let minDist = this.range;
    
    monsters.forEach(m => {
      if (!m.active) return;
      
      const dist = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = m;
      }
    });
    
    return nearest;
  }

  fire(currentTime) {
    this.lastFireTime = currentTime;
    
    // 创建子弹
    const bulletType = this.type === 'ice' ? 'bullet-ice' : 
                       this.type === 'fire' ? 'bullet-fire' : 'bullet';
    
    const bullet = new Bullet(
      this.scene,
      this.x,
      this.y,
      this.target,
      this.damage,
      this.bulletSpeed,
      bulletType,
      {
        slowEffect: this.slowEffect,
        slowDuration: this.slowDuration,
        splashRadius: this.splashRadius
      }
    );
    
    this.scene.bullets.push(bullet);
  }

  destroy() {
    if (this.rangeCircle) {
      this.rangeCircle.destroy();
    }
    super.destroy();
  }
}