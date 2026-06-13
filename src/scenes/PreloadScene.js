import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // 创建加载进度条
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const progressBox = this.add.graphics();
    const progressBar = this.add.graphics();
    
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
    
    const loadingText = this.add.text(width / 2, height / 2 - 50, '加载资源...', {
      font: '20px Microsoft YaHei',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5);
    
    const percentText = this.add.text(width / 2, height / 2, '0%', {
      font: '18px Microsoft YaHei',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5);
    
    // 监听加载进度
    this.load.on('progress', (value) => {
      percentText.setText(parseInt(value * 100) + '%');
      progressBar.clear();
      progressBar.fillStyle(0x3498db, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });
    
    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });
    
    // 加载资源 (MVP阶段使用简单图形)
    // 实际项目中可替换为真实图片资源
    this.createPlaceholderAssets();
  }

  createPlaceholderAssets() {
    // 创建占位图形纹理
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // 基地纹理
    graphics.fillStyle(0xe74c3c);
    graphics.fillRect(0, 0, 60, 60);
    graphics.generateTexture('base', 60, 60);
    graphics.clear();
    
    // 白板塔纹理
    graphics.fillStyle(0x3498db);
    graphics.fillCircle(25, 25, 25);
    graphics.generateTexture('tower-basic', 50, 50);
    graphics.clear();
    
    // 冰冻塔纹理
    graphics.fillStyle(0x9b59b6);
    graphics.fillCircle(25, 25, 25);
    graphics.generateTexture('tower-ice', 50, 50);
    graphics.clear();
    
    // 火炮塔纹理
    graphics.fillStyle(0xe67e22);
    graphics.fillCircle(25, 25, 25);
    graphics.generateTexture('tower-fire', 50, 50);
    graphics.clear();
    
    // 狙击塔纹理
    graphics.fillStyle(0x2ecc71);
    graphics.fillCircle(25, 25, 25);
    graphics.generateTexture('tower-sniper', 50, 50);
    graphics.clear();
    
    // 怪物纹理
    graphics.fillStyle(0xff6b6b);
    graphics.fillCircle(20, 20, 20);
    graphics.generateTexture('monster-basic', 40, 40);
    graphics.clear();
    
    graphics.fillStyle(0xffa502);
    graphics.fillCircle(15, 15, 15);
    graphics.generateTexture('monster-fast', 30, 30);
    graphics.clear();
    
    graphics.fillStyle(0x747d8c);
    graphics.fillCircle(25, 25, 25);
    graphics.generateTexture('monster-tank', 50, 50);
    graphics.clear();
    
    graphics.fillStyle(0xff4757);
    graphics.fillCircle(22, 22, 22);
    graphics.generateTexture('monster-elite', 44, 44);
    graphics.clear();
    
    // 子弹纹理
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(5, 5, 5);
    graphics.generateTexture('bullet', 10, 10);
    graphics.clear();
    
    // 冰冻子弹
    graphics.fillStyle(0x9b59b6);
    graphics.fillCircle(5, 5, 5);
    graphics.generateTexture('bullet-ice', 10, 10);
    graphics.clear();
    
    // 火焰子弹
    graphics.fillStyle(0xe67e22);
    graphics.fillCircle(8, 8, 8);
    graphics.generateTexture('bullet-fire', 16, 16);
    graphics.clear();
    
    // 星尘纹理
    graphics.fillStyle(0xffd700);
    graphics.fillStar(10, 10, 5, 10, 5);
    graphics.generateTexture('stardust', 20, 20);
    graphics.clear();
    
    // 格子纹理
    graphics.fillStyle(0x2c3e50, 0.3);
    graphics.fillRect(0, 0, 50, 50);
    graphics.lineStyle(1, 0x34495e);
    graphics.strokeRect(0, 0, 50, 50);
    graphics.generateTexture('grid', 50, 50);
    graphics.clear();
    
    // 路径纹理
    graphics.fillStyle(0x34495e);
    graphics.fillRect(0, 0, 50, 50);
    graphics.generateTexture('path', 50, 50);
    graphics.clear();
    
    graphics.destroy();
  }

  create() {
    // 跳转到主游戏场景和UI场景
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }
}