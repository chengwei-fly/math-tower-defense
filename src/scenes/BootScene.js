import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Boot场景不需要加载资源
  }

  create() {
    // 设置游戏全局变量
    this.registry.set('stardust', 30);
    this.registry.set('magic', 0);
    this.registry.set('life', 20);
    this.registry.set('wave', 0);
    this.registry.set('correctCount', 0);
    this.registry.set('killCount', 0);
    this.registry.set('combo', 0);
    this.registry.set('difficultyLevel', 0);
    this.registry.set('isOverloading', false);
    this.registry.set('isPaused', false);
    
    // 跳转到预加载场景
    this.scene.start('PreloadScene');
  }
}