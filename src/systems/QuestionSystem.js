import { gameConfig } from '../config/gameConfig.js';

export default class QuestionSystem {
  constructor(scene) {
    this.scene = scene;
    this.currentLevel = 0;
    this.questionCount = 0;
  }

  generateQuestion() {
    const level = this.currentLevel;
    const levelConfig = gameConfig.difficultyLevels[level];
    const maxNum = levelConfig.maxNum;
    
    // 根据难度等级生成题目
    let question;
    
    if (level < 4) {
      // 加减法
      question = this.generateAddSubQuestion(maxNum);
    } else {
      // 包含乘除法
      question = this.generateMixedQuestion(maxNum);
    }
    
    return question;
  }

  generateAddSubQuestion(maxNum) {
    const a = Math.floor(Math.random() * maxNum);
    const b = Math.floor(Math.random() * maxNum);
    const isAdd = Math.random() > 0.5;
    
    const text = isAdd ? `${a} + ${b} = ?` : `${Math.max(a, b)} - ${Math.min(a, b)} = ?`;
    const answer = isAdd ? a + b : Math.max(a, b) - Math.min(a, b);
    
    const options = this.generateOptions(answer);
    
    return { text, answer, options, level: this.currentLevel };
  }

  generateMixedQuestion(maxNum) {
    const operations = ['+', '-', '×', '÷'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    
    let a, b, answer, text;
    
    switch (op) {
      case '+':
        a = Math.floor(Math.random() * maxNum);
        b = Math.floor(Math.random() * maxNum);
        answer = a + b;
        text = `${a} + ${b} = ?`;
        break;
      case '-':
        a = Math.floor(Math.random() * maxNum);
        b = Math.floor(Math.random() * a);
        answer = a - b;
        text = `${a} - ${b} = ?`;
        break;
      case '×':
        a = Math.floor(Math.random() * 12) + 1;
        b = Math.floor(Math.random() * 12) + 1;
        answer = a * b;
        text = `${a} × ${b} = ?`;
        break;
      case '÷':
        b = Math.floor(Math.random() * 10) + 1;
        answer = Math.floor(Math.random() * 10) + 1;
        a = b * answer;
        text = `${a} ÷ ${b} = ?`;
        break;
    }
    
    const options = this.generateOptions(answer);
    
    return { text, answer, options, level: this.currentLevel };
  }

  generateOptions(answer) {
    const options = [answer];
    
    while (options.length < 4) {
      // 生成干扰项
      let fake;
      const strategy = Math.random();
      
      if (strategy < 0.3) {
        // 接近答案
        fake = answer + Math.floor(Math.random() * 5) - 2;
      } else if (strategy < 0.6) {
        // 常见错误（如忘记进位）
        fake = answer + 10;
      } else {
        // 随机
        fake = Math.floor(Math.random() * answer * 2);
      }
      
      if (fake >= 0 && fake !== answer && !options.includes(fake)) {
        options.push(fake);
      }
    }
    
    // 打乱顺序
    options.sort(() => Math.random() - 0.5);
    
    return options;
  }

  increaseDifficulty() {
    if (this.currentLevel < gameConfig.difficultyLevels.length - 1) {
      this.currentLevel++;
      this.scene.registry.set('difficultyLevel', this.currentLevel);
      
      // 显示升阶提示
      this.showLevelUpNotification();
    }
  }

  decreaseDifficulty() {
    if (this.currentLevel > 0) {
      this.currentLevel--;
      this.scene.registry.set('difficultyLevel', this.currentLevel);
      
      // 不显示降阶提示（保护自尊）
    }
  }

  showLevelUpNotification() {
    const levelName = gameConfig.difficultyLevels[this.currentLevel].name;
    
    // 创建升阶提示
    const notification = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY - 100,
      `难度提升: ${levelName}`,
      {
        font: '24px Microsoft YaHei',
        color: '#f1c40f',
        backgroundColor: '#000',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5);
    
    // 动画消失
    this.scene.tweens.add({
      targets: notification,
      alpha: 0,
      y: notification.y - 50,
      duration: 2000,
      onComplete: () => notification.destroy()
    });
  }

  getCurrentLevelInfo() {
    return gameConfig.difficultyLevels[this.currentLevel];
  }
}