import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig.js';
import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

// 创建游戏实例
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: gameConfig.width,
  height: gameConfig.height,
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: gameConfig.debug
    }
  },
  scene: [BootScene, PreloadScene, GameScene, UIScene]
};

// 启动游戏
const game = new Phaser.Game(config);

// 隐藏加载提示
document.getElementById('loading').style.display = 'none';

// 导出游戏实例供外部访问
window.game = game;