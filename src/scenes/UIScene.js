import Phaser from 'phaser';
import { gameConfig } from '../config/gameConfig.js';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    
    this.questionPanel = null;
    this.currentQuestion = null;
    this.currentReason = null;
  }

  create() {
    // 获取GameScene引用
    this.gameScene = this.scene.get('GameScene');
    
    // 监听GameScene事件
    this.setupEventListeners();
    
    // 初始化HUD
    this.initHUD();
    
    // 初始化答题面板事件
    this.setupQuestionPanel();
    
    // 初始化升级面板事件
    this.setupUpgradePanel();
    
    // 初始化卡牌面板事件
    this.setupCardPanel();
  }

  setupEventListeners() {
    // 监听显示答题面板
    this.gameScene.events.on('showQuestion', (data) => {
      this.currentReason = data.reason;
      this.showQuestionPanel(data);
    });
    
    // 监听刷新题目
    this.gameScene.events.on('refreshQuestion', () => {
      this.refreshQuestion();
    });
    
    // 监听显示升级面板
    this.gameScene.events.on('showUpgradePanel', (tower) => {
      this.showUpgradePanel(tower);
    });
    
    // 监听显示卡牌面板
    this.gameScene.events.on('showCardPanel', (cards) => {
      this.showCardPanel(cards);
    });
  }

  initHUD() {
    // 监听资源变化并更新HUD
    this.gameScene.registry.events.on('changedata', (parent, key, value) => {
      switch (key) {
        case 'stardust':
          document.getElementById('stardust-value').textContent = value;
          break;
        case 'magic':
          document.getElementById('magic-value').textContent = value;
          break;
        case 'wave':
          document.getElementById('wave-value').textContent = value;
          break;
        case 'life':
          document.getElementById('life-value').textContent = value;
          break;
      }
    });
  }

  setupQuestionPanel() {
    const panel = document.getElementById('question-panel');
    const optionsContainer = document.getElementById('options-container');
    
    // 选项点击事件
    optionsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('option-btn')) {
        const selectedAnswer = parseInt(e.target.dataset.answer);
        this.checkAnswer(selectedAnswer);
      }
    });
  }

  setupUpgradePanel() {
    const panel = document.getElementById('upgrade-panel');
    const towerButtons = panel.querySelectorAll('.tower-btn');
    
    towerButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const cost = gameConfig.towers[type].upgradeCost;
        const magic = this.gameScene.registry.get('magic');
        
        if (magic >= cost) {
          this.gameScene.pendingUpgradeType = type;
          this.gameScene.selectingCard = false;
          
          // 隐藏升级面板
          panel.classList.remove('show');
          
          // 弹出答题
          this.gameScene.events.emit('showQuestion', {
            reason: 'upgrade',
            cost: cost
          });
        } else {
          // 魔能不足提示
          btn.style.opacity = '0.5';
          setTimeout(() => btn.style.opacity = '1', 500);
        }
      });
    });
    
    // 点击其他区域关闭面板
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && panel.classList.contains('show')) {
        panel.classList.remove('show');
        this.gameScene.selectedTower = null;
      }
    });
  }

  setupCardPanel() {
    const panel = document.getElementById('card-panel');
    const cardsContainer = document.getElementById('cards-container');
    
    // 卡牌点击事件会动态绑定
  }

  showQuestionPanel(data) {
    const panel = document.getElementById('question-panel');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    
    // 生成题目
    this.currentQuestion = this.generateQuestion();
    questionText.textContent = this.currentQuestion.text;
    
    // 清空并生成选项
    optionsContainer.innerHTML = '';
    this.currentQuestion.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.dataset.answer = opt;
      optionsContainer.appendChild(btn);
    });
    
    // 显示面板
    panel.classList.add('show');
    
    // 暂停游戏
    this.gameScene.registry.set('isPaused', true);
  }

  generateQuestion() {
    const level = this.gameScene.registry.get('difficultyLevel');
    const maxNum = gameConfig.difficultyLevels[level].maxNum;
    
    // 生成加减法题目
    const a = Math.floor(Math.random() * maxNum);
    const b = Math.floor(Math.random() * maxNum);
    const isAdd = Math.random() > 0.5;
    
    const text = isAdd ? `${a} + ${b} = ?` : `${Math.max(a, b)} - ${Math.min(a, b)} = ?`;
    const answer = isAdd ? a + b : Math.max(a, b) - Math.min(a, b);
    
    // 生成干扰选项
    const options = [answer];
    while (options.length < 4) {
      const fake = answer + Math.floor(Math.random() * 10) - 5;
      if (fake >= 0 && !options.includes(fake)) {
        options.push(fake);
      }
    }
    
    // 打乱顺序
    options.sort(() => Math.random() - 0.5);
    
    return { text, answer, options };
  }

  checkAnswer(selected) {
    const panel = document.getElementById('question-panel');
    const buttons = panel.querySelectorAll('.option-btn');
    
    if (selected === this.currentQuestion.answer) {
      // 答对
      buttons.forEach(btn => btn.disabled = true);
      
      // 隐藏面板
      setTimeout(() => {
        panel.classList.remove('show');
        this.gameScene.registry.set('isPaused', false);
        
        // 发送成功事件
        this.gameScene.events.emit('answerCorrect', {
          reason: this.currentReason
        });
      }, 300);
      
    } else {
      // 答错
      panel.classList.add('shake');
      setTimeout(() => panel.classList.remove('shake'), 300);
      
      buttons.forEach(btn => btn.disabled = true);
      
      // 发送失败事件
      this.gameScene.events.emit('answerWrong');
    }
  }

  refreshQuestion() {
    const panel = document.getElementById('question-panel');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    
    // 生成新题
    this.currentQuestion = this.generateQuestion();
    questionText.textContent = this.currentQuestion.text;
    
    // 清空并生成选项
    optionsContainer.innerHTML = '';
    this.currentQuestion.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.dataset.answer = opt;
      optionsContainer.appendChild(btn);
    });
    
    // 重新启用按钮
    panel.querySelectorAll('.option-btn').forEach(btn => btn.disabled = false);
  }

  showUpgradePanel(tower) {
    const panel = document.getElementById('upgrade-panel');
    panel.classList.add('show');
  }

  showCardPanel(cards) {
    const panel = document.getElementById('card-panel');
    const cardsContainer = document.getElementById('cards-container');
    
    // 清空并生成卡牌
    cardsContainer.innerHTML = '';
    cards.forEach((card, idx) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'card';
      cardEl.innerHTML = `
        <div class="icon">${card.icon}</div>
        <div class="name">${card.name}</div>
      `;
      cardEl.dataset.index = idx;
      
      cardEl.addEventListener('click', () => {
        this.gameScene.selectingCard = true;
        this.gameScene.selectedCardIndex = idx;
        
        // 隐藏卡牌面板
        panel.classList.remove('show');
        
        // 弹出答题
        this.gameScene.events.emit('showQuestion', {
          reason: 'card',
          timeLimit: gameConfig.questions.timeLimit
        });
        
        // 设置卡牌选中回调
        this.gameScene.events.emit('cardSelected', card);
      });
      
      cardsContainer.appendChild(cardEl);
    });
    
    panel.classList.add('show');
    
    // 5秒后自动关闭并开始下一波
    setTimeout(() => {
      if (panel.classList.contains('show')) {
        panel.classList.remove('show');
        this.gameScene.registry.set('isPaused', false);
        this.gameScene.waveSystem.startNextWave();
      }
    }, 5000);
  }

  update() {
    // UI场景不需要每帧更新
  }
}