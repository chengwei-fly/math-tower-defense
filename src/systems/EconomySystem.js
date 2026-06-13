export default class EconomySystem {
  constructor(scene) {
    this.scene = scene;
  }

  addStardust(amount) {
    const current = this.scene.registry.get('stardust');
    this.scene.registry.set('stardust', current + amount);
    
    // 视觉效果
    this.showResourceGain('stardust', amount);
  }

  spendStardust(amount) {
    const current = this.scene.registry.get('stardust');
    this.scene.registry.set('stardust', Math.max(0, current - amount));
  }

  addMagic(amount) {
    const current = this.scene.registry.get('magic');
    const combo = this.scene.registry.get('combo');
    
    // 连击额外奖励
    const bonus = combo >= 3 ? Math.floor(amount * 0.5) : 0;
    const total = amount + bonus;
    
    this.scene.registry.set('magic', current + total);
    
    // 视觉效果
    this.showResourceGain('magic', total);
    
    if (bonus > 0) {
      this.showComboBonus(bonus);
    }
  }

  spendMagic(amount) {
    const current = this.scene.registry.get('magic');
    this.scene.registry.set('magic', Math.max(0, current - amount));
  }

  showResourceGain(type, amount) {
    const hudElement = document.getElementById(`${type}-value`);
    if (!hudElement) return;
    
    // 数字跳动动画
    const originalColor = type === 'stardust' ? '#ffd700' : '#9b59b6';
    hudElement.style.color = '#fff';
    hudElement.style.transform = 'scale(1.3)';
    
    setTimeout(() => {
      hudElement.style.color = originalColor;
      hudElement.style.transform = 'scale(1)';
    }, 300);
    
    // 显示+数字
    const gainText = this.scene.add.text(
      this.scene.cameras.main.width - 100,
      type === 'stardust' ? 50 : 100,
      `+${amount}`,
      {
        font: '20px Microsoft YaHei',
        color: type === 'stardust' ? '#ffd700' : '#9b59b6'
      }
    );
    
    this.scene.tweens.add({
      targets: gainText,
      y: gainText.y - 30,
      alpha: 0,
      duration: 1000,
      onComplete: () => gainText.destroy()
    });
  }

  showComboBonus(amount) {
    const bonusText = this.scene.add.text(
      this.scene.cameras.main.centerX,
      150,
      `连击奖励 +${amount}`,
      {
        font: '18px Microsoft YaHei',
        color: '#f1c40f'
      }
    ).setOrigin(0.5);
    
    this.scene.tweens.add({
      targets: bonusText,
      alpha: 0,
      y: bonusText.y - 20,
      duration: 1500,
      onComplete: () => bonusText.destroy()
    });
  }

  canAffordStardust(amount) {
    return this.scene.registry.get('stardust') >= amount;
  }

  canAffordMagic(amount) {
    return this.scene.registry.get('magic') >= amount;
  }
}