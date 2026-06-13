import Phaser from 'phaser';

export default class Bullet extends Phaser.GameObjects.Image {
  constructor(scene, x, y, target, damage, speed, texture, effects = {}) {
    super(scene, x, y, texture);
    
    this.scene = scene;
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.effects = effects;
    
    // 添加到场景和物理系统
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // 设置速度向目标移动
    this.moveToTarget();
  }

  moveToTarget() {
    if (!this.target || !this.target.active) {
      this.destroy();
      return;
    }
    
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    this.scene.physics.velocityFromAngle(angle * 180 / Math.PI, this.speed, this.body.velocity);
  }

  update(delta) {
    // 检查目标是否还存在
    if (!this.target || !this.target.active) {
      this.destroy();
      return;
    }
    
    // 检查是否击中目标
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    if (dist < 20) {
      this.hitTarget();
    }
  }

  hitTarget() {
    // 造成伤害
    if (this.target.takeDamage) {
      this.target.takeDamage(this.damage);
    }
    
    // 应用效果
    if (this.effects.slowEffect && this.target.slow) {
      this.target.slow(this.effects.slowEffect, this.effects.slowDuration);
    }
    
    // 范围伤害
    if (this.effects.splashRadius) {
      this.splashDamage();
    }
    
    // 销毁子弹
    this.destroy();
  }

  splashDamage() {
    // 对范围内所有怪物造成伤害
    const monsters = this.scene.monsters;
    monsters.forEach(m => {
      if (!m.active) return;
      
      const dist = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y);
      if (dist < this.effects.splashRadius) {
        m.takeDamage(this.damage * 0.5); // 范围伤害减半
      }
    });
    
    // 创建爆炸效果
    const explosion = this.scene.add.circle(this.x, this.y, this.effects.splashRadius, 0xe67e22, 0.5);
    this.scene.tweens.add({
      targets: explosion,
      scale: 0,
      alpha: 0,
      duration: 300,
      onComplete: () => explosion.destroy()
    });
  }
}