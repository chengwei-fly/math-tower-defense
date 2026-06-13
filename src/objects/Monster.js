import Phaser from 'phaser';
import { gameConfig } from '../config/gameConfig.js';

export default class Monster extends Phaser.GameObjects.Image {
  constructor(scene, type, path) {
    super(scene, path.getStartPoint().x, path.getStartPoint().x, `monster-${type}`);
    
    this.scene = scene;
    this.type = type;
    this.path = path;
    
    // 获取怪物配置
    const config = gameConfig.monsters[type];
    this.baseSpeed = config.speed;
    this.speed = config.speed;
    this.life = config.life;
    this.maxLife = config.life;
    this.damage = config.damage;
    this.reward = config.reward;
    
    // 减速状态
    this.slowFactor = 1;
    this.slowEndTime = 0;
    
    // 路径跟随
    this.pathFollower = scene.add.follower(path, path.getStartPoint().x, path.getStartPoint().y, `monster-${type}`);
    this.pathFollower.startFollow({
      duration: this.calculatePathDuration(),
      rotateToPath: false
    });
    
    // 替换当前对象
    this.destroy();
    return this.pathFollower;
  }

  calculatePathDuration() {
    // 根据速度计算路径时间
    const pathLength = this.path.getLength();
    return (pathLength / this.speed) * 1000;
  }

  slow(factor, duration) {
    this.slowFactor = factor;
    this.slowEndTime = this.scene.time.now + duration;
    
    // 更新速度
    this.speed = this.baseSpeed * factor;
    
    // 更新路径跟随速度
    if (this.pathFollower && this.pathFollower.isFollowing) {
      this.pathFollower.stopFollow();
      this.pathFollower.startFollow({
        duration: this.calculatePathDuration(),
        rotateToPath: false
      });
    }
  }

  update(delta) {
    // 检查减速是否结束
    if (this.slowEndTime > 0 && this.scene.time.now > this.slowEndTime) {
      this.slowFactor = 1;
      this.speed = this.baseSpeed;
      this.slowEndTime = 0;
    }
    
    // 检查是否到达终点
    if (this.pathFollower && this.pathFollower.pathProgress >= 1) {
      this.reachEnd();
    }
  }

  takeDamage(damage) {
    this.life -= damage;
    
    // 更新生命条显示
    if (this.lifeBar) {
      this.lifeBar.setScale(this.life / this.maxLife, 1);
    }
    
    if (this.life <= 0) {
      this.die();
    }
  }

  die() {
    // 发送死亡事件
    this.scene.events.emit('monsterKilled', this.reward);
    
    // 创建星尘掉落
    this.createStardustDrop();
    
    // 销毁
    if (this.pathFollower) {
      this.pathFollower.stopFollow();
      this.pathFollower.destroy();
    }
    if (this.lifeBar) {
      this.lifeBar.destroy();
    }
    this.destroy();
  }

  reachEnd() {
    // 发送到达终点事件
    this.scene.events.emit('monsterReachEnd', this.damage);
    
    // 销毁
    if (this.pathFollower) {
      this.pathFollower.stopFollow();
      this.pathFollower.destroy();
    }
    if (this.lifeBar) {
      this.lifeBar.destroy();
    }
    this.destroy();
  }

  createStardustDrop() {
    // 在怪物位置创建星尘
    const stardust = this.scene.add.image(this.x, this.y, 'stardust');
    stardust.setScale(0.5);
    
    // 自动拾取动画
    this.scene.tweens.add({
      targets: stardust,
      scale: 0,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        stardust.destroy();
      }
    });
    
    // 立即加星尘
    this.scene.events.emit('monsterKilled', this.reward);
  }
}