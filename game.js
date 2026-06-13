// ============================================
// 《算力防线》核心游戏代码 (单文件版)
// ============================================

// 全局错误捕获
window.addEventListener('error', (e) => {
  console.error('GAME ERROR:', e.message, 'at', e.filename + ':' + e.lineno);
});

// ============ 音效系统（WebAudio合成，无外部素材） ============
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { console.warn('AudioContext not supported'); }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
window.addEventListener('click', initAudio, { once: true });
window.addEventListener('touchstart', initAudio, { once: true });

function playSound(type) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g); g.connect(audioCtx.destination);
  const t = audioCtx.currentTime;
  switch (type) {
    case 'shoot': // 答对：咔哒上膛
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(880, t + 0.1);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      o.start(t); o.stop(t + 0.15);
      break;
    case 'upgrade': // 升级轰鸣
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(440, t + 0.3);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      o.start(t); o.stop(t + 0.4);
      break;
    case 'shatter': // 碎裂
      o.type = 'square';
      o.frequency.setValueAtTime(800, t);
      o.frequency.exponentialRampToValueAtTime(80, t + 0.3);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      o.start(t); o.stop(t + 0.3);
      break;
    case 'overload': // 超载
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(50, t);
      o.frequency.linearRampToValueAtTime(1200, t + 0.5);
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
      o.start(t); o.stop(t + 0.6);
      break;
    case 'wrong': // 答错
      o.type = 'triangle';
      o.frequency.setValueAtTime(200, t);
      o.frequency.exponentialRampToValueAtTime(100, t + 0.2);
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      o.start(t); o.stop(t + 0.2);
      break;
    case 'place': // 放塔
      o.type = 'sine';
      o.frequency.setValueAtTime(440, t);
      o.frequency.exponentialRampToValueAtTime(220, t + 0.15);
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      o.start(t); o.stop(t + 0.15);
      break;
  }
}


// ============ 游戏配置 ============
const CONFIG = {
  width: 800,
  height: 600,
  map: {
    gridWidth: 14,
    gridHeight: 10,
    tileSize: 50,
    padding: 25
  },
  economy: {
    initialStardust: 30,
    initialMagic: 0,
    stardustPerKill: 5,
    magicPerAnswer: 10,
    comboBonus: 5
  },
  base: {
    initialLife: 20,
    maxLife: 20,
    overloadThreshold: 2,    // 需求：基地血量<2时解锁超载
    overloadDuration: 3000
  },
  towers: {
    // 白板塔（默认）- 加法映射：累加
    basic: { name: '白板机枪塔', desc: '加法·累加', op: '+', cost: 10, damage: 8, range: 140, fireRate: 600, bulletSpeed: 350, color: 0x3498db, icon: '🔫' },
    // 进阶塔：可直接用星尘建造（不再需要升级）
    laser:  { name: '激光射线塔', desc: '连击·穿透', op: '×', cost: 25, damage: 4, range: 160, fireRate: 250, bulletSpeed: 600, color: 0x00d4ff, icon: '⚡', piercing: true },
    poison: { name: '剧毒喷射塔', desc: '持续·毒素', op: '÷', cost: 30, damage: 6, range: 130, fireRate: 800, bulletSpeed: 280, color: 0x8bc34a, icon: '☠️', poison: 3 },
    mortar: { name: '榴弹炮塔', desc: '范围·轰炸', op: '×', cost: 40, damage: 25, range: 200, fireRate: 1500, bulletSpeed: 220, color: 0xff5722, icon: '💣', splashRadius: 90 },
    sniper: { name: '狙击穿甲塔', desc: '暴击·单杀', op: '÷', cost: 50, damage: 80, range: 350, fireRate: 2200, bulletSpeed: 800, color: 0x2ecc71, icon: '🎯', crit: 2.5 },
    // 升级塔（从白板塔升级得到）
    ice:    { name: '冰冻塔', desc: '减法·削弱', op: '-', cost: 0, damage: 10, range: 130, fireRate: 900, bulletSpeed: 300, color: 0x9b59b6, icon: '❄️', slowEffect: 0.45, slowDuration: 2000 },
    fire:   { name: '火炮塔', desc: '乘法·群伤', op: '×', cost: 0, damage: 18, range: 120, fireRate: 1100, bulletSpeed: 250, color: 0xe67e22, icon: '🔥', splashRadius: 70 }
  },
  upgradeCost: { ice: 20, fire: 25, sniper: 30, laser: 35, poison: 35, mortar: 50 },
  // 初始可造塔列表（白板+4进阶）
  purchasable: ['basic', 'laser', 'poison', 'mortar', 'sniper'],
  monsters: {
    basic: { speed: 70,  life: 30,  damage: 1, reward: 5,  color: 0xff6b6b, radius: 14 },
    fast:  { speed: 130, life: 20,  damage: 1, reward: 6,  color: 0xffa502, radius: 12 },
    tank:  { speed: 40,  life: 100, damage: 2, reward: 12, color: 0x747d8c, radius: 18 },
    elite: { speed: 80,  life: 80,  damage: 3, reward: 18, color: 0xff4757, radius: 16 }
  },
  waves: {
    initialDelay: 3000,
    waveInterval: 6000,
    cardWaveInterval: 5,
    monstersPerWave: 5,
    growthFactor: 1.2
  },
  questions: {
    cooldown: 1500,
    comboThreshold: 3,
    dropThreshold: 2
  },
  difficultyLevels: [
    { name: '入门', maxNum: 10 },
    { name: '基础', maxNum: 20 },
    { name: '进阶', maxNum: 50 },
    { name: '挑战', maxNum: 100 }
  ]
};

// U型路径
const PATH_POINTS = [
  {x: 25,  y: 300},
  {x: 175, y: 300},
  {x: 175, y: 75},
  {x: 625, y: 75},
  {x: 625, y: 525},
  {x: 175, y: 525},
  {x: 175, y: 300},
  {x: 775, y: 300}
];

// ============ 全局状态 ============
const State = {
  stardust: 50,    // 初始送50星尘，确保开局能放2-3座塔（不答题也能苟活2波）
  magic: 0,
  life: 20,
  maxLife: 20,
  wave: 0,
  correctCount: 0,
  killCount: 0,
  totalAnswered: 0,
  combo: 0,
  maxCombo: 0,
  wrongStreak: 0,
  difficultyLevel: 0,
  isPaused: false,
  isOverloading: false,
  currentQuestion: null,
  pendingAction: null,
  selectedTower: null,
  upgradeTarget: null,
  cards: [],
  gameScene: null,
  selectedTowerType: null,  // 底部塔条当前选中的塔类型
  // 战报数据
  totalMagicEarned: 0,
  totalDamageDealt: 0,
  startTime: 0,
  endTime: 0
};

// ============ HUD更新 ============
function updateHUD() {
  document.getElementById('stardust-value').textContent = State.stardust;
  document.getElementById('magic-value').textContent = State.magic;
  document.getElementById('wave-value').textContent = State.wave;
  document.getElementById('life-value').textContent = State.life;
  document.getElementById('difficulty-value').textContent = CONFIG.difficultyLevels[State.difficultyLevel].name;
  // 更新已建塔列表
  if (State.gameScene) {
    const counts = {};
    State.gameScene.towers.forEach(t => {
      const k = t.type;
      counts[k] = (counts[k] || 0) + 1;
    });
    const list = document.getElementById('tower-list');
    if (list) {
      list.innerHTML = '';
      const keys = Object.keys(counts);
      if (keys.length === 0) {
        list.innerHTML = '<div style="color:#666;font-size:11px;text-align:center;padding:8px 0">暂无</div>';
      } else {
        keys.forEach(k => {
          const cfg = CONFIG.towers[k];
          const item = document.createElement('div');
          item.className = 'roster-item';
          item.innerHTML = `<span class="ic">${cfg.icon}</span><span class="lbl">${cfg.name}</span><span class="ct">x${counts[k]}</span>`;
          list.appendChild(item);
        });
      }
    }
    const cnt = document.getElementById('tower-count');
    if (cnt) cnt.textContent = State.gameScene.towers.length;
  }
  // 同步刷新塔条
  updateTowerTray();
}

// ============ 底部塔工厂 ============
function initTowerTray() {
  const container = document.getElementById('tray-cards');
  container.innerHTML = '';
  CONFIG.purchasable.forEach(t => {
    const cfg = CONFIG.towers[t];
    const card = document.createElement('div');
    card.className = 'tray-card';
    card.dataset.type = t;
    card.innerHTML = `<div class="ic">${cfg.icon}</div><div class="nm">${cfg.name}</div><div class="cs">${cfg.cost}⭐</div>`;
    card.onclick = () => {
      if (State.stardust < cfg.cost) {
        showToast('星尘不足！', '#ff5252');
        return;
      }
      // 切换选中
      if (State.selectedTowerType === t) {
        State.selectedTowerType = null;  // 再次点取消
      } else {
        State.selectedTowerType = t;
      }
      updateTowerTray();
      if (State.selectedTowerType) {
        showToast(`✅ 已选 ${cfg.name}，点击空地建塔`, '#f1c40f');
      }
    };
    container.appendChild(card);
  });
  updateTowerTray();
}

function updateTowerTray() {
  const cards = document.querySelectorAll('.tray-card');
  cards.forEach(card => {
    const t = card.dataset.type;
    const cfg = CONFIG.towers[t];
    const canAfford = State.stardust >= cfg.cost;
    card.classList.toggle('selected', State.selectedTowerType === t);
    card.classList.toggle('cant-afford', !canAfford);
  });
  const tip = document.getElementById('tray-tip');
  if (State.selectedTowerType) {
    const cfg = CONFIG.towers[State.selectedTowerType];
    tip.textContent = `已选：${cfg.icon} ${cfg.name}`;
    tip.classList.add('active');
  } else {
    tip.textContent = '未选中';
    tip.classList.remove('active');
  }
}

// ============ 已建塔面板 折叠/展开 ============
function initRosterToggle() {
  const header = document.getElementById('roster-header');
  const roster = document.getElementById('tower-roster');
  if (!header || !roster) return;
  // 默认收起，恢复上次选择
  const expanded = localStorage.getItem('roster_expanded') === '1';
  if (expanded) roster.classList.add('expanded');
  header.onclick = () => {
    roster.classList.toggle('expanded');
    localStorage.setItem('roster_expanded', roster.classList.contains('expanded') ? '1' : '0');
  };
}
function showToast(text, color = '#f1c40f') {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  t.style.color = color;
  t.style.borderColor = color;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

// ============ 硬编码50道二年级加减法题库（循环使用） ============
const QUESTION_BANK = [
  { text: '2 + 3 = ?', answer: 5 },
  { text: '7 + 5 = ?', answer: 12 },
  { text: '8 + 6 = ?', answer: 14 },
  { text: '9 + 4 = ?', answer: 13 },
  { text: '5 + 7 = ?', answer: 12 },
  { text: '6 + 8 = ?', answer: 14 },
  { text: '3 + 9 = ?', answer: 12 },
  { text: '4 + 7 = ?', answer: 11 },
  { text: '8 + 9 = ?', answer: 17 },
  { text: '6 + 6 = ?', answer: 12 },
  { text: '15 + 6 = ?', answer: 21 },
  { text: '12 + 9 = ?', answer: 21 },
  { text: '18 + 7 = ?', answer: 25 },
  { text: '24 + 8 = ?', answer: 32 },
  { text: '17 + 15 = ?', answer: 32 },
  { text: '28 + 14 = ?', answer: 42 },
  { text: '36 + 27 = ?', answer: 63 },
  { text: '45 + 38 = ?', answer: 83 },
  { text: '19 + 26 = ?', answer: 45 },
  { text: '33 + 49 = ?', answer: 82 },
  { text: '10 - 3 = ?', answer: 7 },
  { text: '15 - 8 = ?', answer: 7 },
  { text: '12 - 5 = ?', answer: 7 },
  { text: '18 - 9 = ?', answer: 9 },
  { text: '20 - 11 = ?', answer: 9 },
  { text: '25 - 16 = ?', answer: 9 },
  { text: '30 - 17 = ?', answer: 13 },
  { text: '42 - 25 = ?', answer: 17 },
  { text: '50 - 28 = ?', answer: 22 },
  { text: '67 - 39 = ?', answer: 28 },
  { text: '11 - 4 = ?', answer: 7 },
  { text: '14 - 7 = ?', answer: 7 },
  { text: '22 - 13 = ?', answer: 9 },
  { text: '31 - 22 = ?', answer: 9 },
  { text: '48 - 29 = ?', answer: 19 },
  { text: '55 - 36 = ?', answer: 19 },
  { text: '72 - 45 = ?', answer: 27 },
  { text: '86 - 58 = ?', answer: 28 },
  { text: '93 - 67 = ?', answer: 26 },
  { text: '100 - 56 = ?', answer: 44 },
  { text: '8 + 13 = ?', answer: 21 },
  { text: '16 + 19 = ?', answer: 35 },
  { text: '27 + 36 = ?', answer: 63 },
  { text: '39 + 45 = ?', answer: 84 },
  { text: '64 + 28 = ?', answer: 92 },
  { text: '57 - 38 = ?', answer: 19 },
  { text: '73 - 49 = ?', answer: 24 },
  { text: '88 - 59 = ?', answer: 29 },
  { text: '95 - 67 = ?', answer: 28 },
  { text: '47 + 36 = ?', answer: 83 }
];

function generateQuestion() {
  // 难度影响：连对3题升阶后，题库加扰动
  const baseQ = QUESTION_BANK[Math.floor(Math.random() * QUESTION_BANK.length)];
  const answer = baseQ.answer;
  const options = new Set([answer]);
  // 生成3个干扰项：±1~±10随机
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 11) - 5;
    if (offset === 0) continue;
    const fake = answer + offset;
    if (fake >= 0 && !options.has(fake)) options.add(fake);
  }
  const arr = [...options].sort(() => Math.random() - 0.5);
  return { text: baseQ.text, answer, options: arr };
}

function showQuestionPanel(reason, callback) {
  if (State.isOverloading) return;
  State.isPaused = true;
  // 把 callback 存到 State 里（兼容其他地方）
  State.pendingAction = { reason, callback };
  // 同时存到全局，供 HTML 按钮访问
  window._currentCallback = callback;
  State.currentQuestion = generateQuestion();
  document.getElementById('question-text').textContent = State.currentQuestion.text;
  const container = document.getElementById('options-container');
  container.innerHTML = '';
  // 清理旧的放弃按钮（避免堆叠）
  const panel = document.getElementById('question-panel');
  const oldGiveUp = panel.querySelector('.give-up-btn');
  if (oldGiveUp) oldGiveUp.remove();
  State.currentQuestion.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.dataset.answer = opt;
    btn.onclick = () => checkAnswer(opt);
    container.appendChild(btn);
  });
  // 添加放弃按钮
  const giveUp = document.createElement('button');
  giveUp.className = 'give-up-btn';
  giveUp.textContent = '✖';
  giveUp.style.cssText = 'position:absolute;top:8px;right:8px;width:30px;height:30px;padding:0;background:rgba(255,82,82,0.2);border:1px solid #ff5252;color:#ff8a80;border-radius:50%;cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;z-index:10;';
  giveUp.title = '放弃答题 (-1⭐)';
  giveUp.onclick = () => giveUpQuestion();
  panel.appendChild(giveUp);
  panel.classList.add('show');
}

function giveUpQuestion() {
  const panel = document.getElementById('question-panel');
  panel.classList.remove('show');
  State.isPaused = false;
  // 放弃惩罚：损失1点星尘
  if (State.stardust > 0) {
    State.stardust = Math.max(0, State.stardust - 1);
    showToast('放弃答题 -1⭐', '#ff8a80');
  }
  // 触发回调为false
  if (State.pendingAction && State.pendingAction.callback) {
    State.pendingAction.callback(false);
  }
  State.pendingAction = null;
  State.combo = 0;
  State.wrongStreak++;
  updateHUD();
}

// ============ 塔类型选择面板 (旧版HTML弹窗，已弃用，改用底部塔条) ============
function _showTowerSelectPanelOld(grid, scene) {
  console.log('[showTowerSelectPanel] 被调用, grid=', grid && grid.x, grid && grid.y, 'scene=', !!scene, 'placeTower方法=', typeof (scene && scene.placeTower));
  const panel = document.getElementById('tower-select-panel');
  const gridEl = document.getElementById('tsp-grid');
  gridEl.innerHTML = '';

  CONFIG.purchasable.forEach(t => {
    const cfg = CONFIG.towers[t];
    const canAfford = State.stardust >= cfg.cost;
    const card = document.createElement('div');
    card.className = 'tsp-card' + (canAfford ? '' : ' cant-afford');
    card.style.borderColor = canAfford ? '#' + cfg.color.toString(16).padStart(6, '0') : '#555';
    card.innerHTML = `
      <div class="ic">${cfg.icon}</div>
      <div class="nm">${cfg.name}</div>
      <div class="ds" style="color:#${cfg.color.toString(16).padStart(6,'0')}">${cfg.desc}</div>
      <div class="cs">${cfg.cost} ⭐</div>
    `;
    if (canAfford) {
      card.onclick = (e) => {
        e.stopPropagation();
        console.log('[塔卡片] 点击:', t, 'grid.hasTower=', grid.hasTower);
        panel.classList.remove('show');
        // 直接闭包调用，不走 State
        showQuestionPanel('place', (success) => {
          console.log('[HTML面板] callback收到success=', success, 'grid有效=', !!grid, 'hasTower=', grid && grid.hasTower);
          if (success && grid && !grid.hasTower) {
            try {
              scene.placeTower(grid, t);
              console.log('[HTML面板] placeTower执行完毕, towers数量=', scene.towers.length);
              showToast(`🏗️ ${cfg.name}已部署！`, '#' + cfg.color.toString(16).padStart(6, '0'));
            } catch (e) {
              console.error('[HTML面板] placeTower出错:', e);
              showToast('❌ 建塔失败:' + e.message, '#ff5252');
              alert('建塔失败: ' + e.message);
            }
          } else if (success) {
            showToast('⚠️ 格子状态已变化', '#ff5252');
          }
        });
      };
    }
    gridEl.appendChild(card);
  });

  // 关闭按钮
  const closeBtn = document.getElementById('tsp-close');
  closeBtn.onclick = () => panel.classList.remove('show');
  panel.classList.add('show');
}

function checkAnswer(selected) {
  initAudio();
  const panel = document.getElementById('question-panel');
  const buttons = panel.querySelectorAll('.option-btn');
  buttons.forEach(b => b.disabled = true);
  console.log('[checkAnswer] selected=', selected, 'correct=', State.currentQuestion.answer, 'equal=', selected === State.currentQuestion.answer, 'pendingAction=', !!State.pendingAction);
  if (selected === State.currentQuestion.answer) {
    playSound('shoot');
    setTimeout(() => {
      panel.classList.remove('show');
      State.isPaused = false;
      onAnswerCorrect();
      if (State.pendingAction && State.pendingAction.callback) {
        try {
          State.pendingAction.callback(true);
        } catch (e) {
          console.error('[checkAnswer] callback出错:', e);
          alert('建塔出错: ' + e.message);
        }
        State.pendingAction = null;
      } else {
        console.warn('[checkAnswer] pendingAction丢失!');
        alert('pendingAction丢失！');
      }
    }, 300);
  } else {
    playSound('wrong');
    panel.classList.add('shake');
    setTimeout(() => panel.classList.remove('shake'), 400);
    onAnswerWrong();
  }
}

function onAnswerCorrect() {
  const baseReward = CONFIG.economy.magicPerAnswer;
  const comboReward = State.combo >= CONFIG.questions.comboThreshold - 1 ? CONFIG.economy.comboBonus : 0;
  const gain = baseReward + comboReward;
  State.magic += gain;
  State.totalMagicEarned += gain;
  State.totalAnswered++;
  State.combo++;
  if (State.combo > State.maxCombo) State.maxCombo = State.combo;
  State.correctCount++;
  if (State.combo >= CONFIG.questions.comboThreshold) {
    if (State.difficultyLevel < CONFIG.difficultyLevels.length - 1) {
      State.difficultyLevel++;
      showToast(`⬆️ 难度提升: ${CONFIG.difficultyLevels[State.difficultyLevel].name}`, '#81c784');
    }
    State.combo = 0;
  }
  showToast(`+${gain} ✨ 魔能`, '#b39ddb');
  updateHUD();
}

function onAnswerWrong() {
  State.combo = 0;
  State.wrongStreak++;
  State.totalAnswered++;
  if (State.wrongStreak >= CONFIG.questions.dropThreshold) {
    if (State.difficultyLevel > 0) {
      State.difficultyLevel--;
      // 不提示，保护自尊
    }
    State.wrongStreak = 0;
  }
  // 1.5秒后刷新（如果用户没点放弃）
  setTimeout(() => {
    if (State.pendingAction && document.getElementById('question-panel').classList.contains('show')) {
      State.currentQuestion = generateQuestion();
      document.getElementById('question-text').textContent = State.currentQuestion.text;
      const container = document.getElementById('options-container');
      container.innerHTML = '';
      State.currentQuestion.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.dataset.answer = opt;
        btn.onclick = () => checkAnswer(opt);
        container.appendChild(btn);
      });
      // 重新添加放弃按钮
      const giveUp = document.createElement('button');
      giveUp.className = 'give-up-btn';
      giveUp.textContent = '✖ 放弃';
      giveUp.style.cssText = 'display:block;margin:12px auto 0;padding:6px 18px;background:rgba(255,82,82,0.2);border:1px solid #ff5252;color:#ff8a80;border-radius:4px;cursor:pointer;font-size:13px;';
      giveUp.onclick = () => giveUpQuestion();
      container.appendChild(giveUp);
    }
  }, CONFIG.questions.cooldown);
}

// ============ 主场景 ============
class MainScene extends Phaser.Scene {
  constructor() { super('MainScene'); }

  create() {
    State.gameScene = this;
    initTowerTray();
    initRosterToggle();
    this.towers = [];
    this.monsters = [];
    this.bullets = [];
    this.gridPositions = [];

    // 绘制背景
    this.add.rectangle(400, 300, 800, 600, 0x1a1a2e);

    // 绘制U型路径
    const pathG = this.add.graphics();
    pathG.lineStyle(50, 0x2c3e50, 1);
    pathG.beginPath();
    PATH_POINTS.forEach((p, i) => {
      if (i === 0) pathG.moveTo(p.x, p.y);
      else pathG.lineTo(p.x, p.y);
    });
    pathG.strokePath();

    // 路径边线
    pathG.lineStyle(2, 0x34495e, 0.5);
    pathG.strokePath();

    // 创建 Phaser 路径对象
    this.path = new Phaser.Curves.Path(PATH_POINTS[0].x, PATH_POINTS[0].y);
    for (let i = 1; i < PATH_POINTS.length; i++) {
      this.path.lineTo(PATH_POINTS[i].x, PATH_POINTS[i].y);
    }

    // 创建格子
    this.createGrid();

    // 创建基地
    this.baseSprite = this.add.circle(750, 300, 28, 0xe74c3c);
    this.baseSprite.setStrokeStyle(3, 0xffffff);
    this.add.text(750, 300, '🏰', { fontSize: '28px' }).setOrigin(0.5);

    // 入口标记
    this.add.text(25, 270, '➡️', { fontSize: '24px' }).setOrigin(0.5);

    // 启动第一波
    this.time.delayedCall(CONFIG.waves.initialDelay, () => this.startNextWave());

    updateHUD();
  }

  createGrid() {
    const { gridWidth, gridHeight, tileSize, padding } = CONFIG.map;
    for (let x = 0; x < gridWidth; x++) {
      for (let y = 0; y < gridHeight; y++) {
        const px = padding + x * tileSize;
        const py = padding + y * tileSize;
        if (this.isOnPath(px, py)) continue;
        const rect = this.add.rectangle(px + tileSize/2, py + tileSize/2, tileSize - 2, tileSize - 2, 0x16213e, 0.6);
        rect.setStrokeStyle(1, 0x34495e, 0.5);
        rect.setInteractive();
        rect.gridX = x;
        rect.gridY = y;
        rect.hasTower = false;
        rect.on('pointerover', () => { if (!rect.hasTower) rect.setFillStyle(0x2c3e50, 0.8); });
        rect.on('pointerout', () => { if (!rect.hasTower) rect.setFillStyle(0x16213e, 0.6); });
        rect.on('pointerdown', () => this.onGridClick(rect));
        this.gridPositions.push(rect);
      }
    }
  }

  isOnPath(x, y) {
    const w = 30; // 半宽
    // 上方横
    if (Math.abs(y - 75) < w && x >= 175 && x <= 625) return true;
    // 下方横
    if (Math.abs(y - 525) < w && x >= 175 && x <= 625) return true;
    // 左竖
    if (Math.abs(x - 175) < w && y >= 75 && y <= 525) return true;
    // 右竖
    if (Math.abs(x - 625) < w && y >= 75 && y <= 525) return true;
    return false;
  }

  onGridClick(grid) {
    if (grid.hasTower || State.isPaused) return;
    // 必须先在底部塔条选一种塔
    if (!State.selectedTowerType) {
      showToast('👇 请先在底部"塔工厂"选一种塔', '#f1c40f');
      return;
    }
    const type = State.selectedTowerType;
    const cfg = CONFIG.towers[type];
    if (State.stardust < cfg.cost) {
      showToast('星尘不足！', '#ff5252');
      return;
    }
    // 弹题：答对才建塔
    showQuestionPanel('place', (success) => {
      console.log('[onGridClick] callback收到success=', success, 'grid.hasTower=', grid.hasTower);
      if (success && !grid.hasTower) {
        try {
          this.placeTower(grid, type);
        } catch (e) {
          console.error('[onGridClick] placeTower出错:', e);
          showToast('❌ 建塔失败: ' + e.message, '#ff5252');
        }
      }
      // 消费后清掉选中（避免误点空地又答题）
      State.selectedTowerType = null;
      updateTowerTray();
    });
  }

  placeTower(grid, type = 'basic') {
    console.log('[placeTower] called, grid=', grid.x, grid.y, 'type=', type, 'hasTower=', grid.hasTower, 'stardust=', State.stardust);
    if (grid.hasTower) {
      console.warn('Grid already has tower, skip');
      showToast('⚠️ 此处已有塔！', '#ff5252');
      return;
    }
    const cfg = CONFIG.towers[type];
    if (State.stardust < cfg.cost) {
      showToast('星尘不足！', '#ff5252');
      return;
    }
    State.stardust -= cfg.cost;
    const t = new Tower(this, grid.x, grid.y, type);
    this.towers.push(t);
    grid.hasTower = true;
    grid.tower = t;
    playSound('place');
    showToast(`🏗️ ${cfg.name}已部署！`, '#' + cfg.color.toString(16).padStart(6, '0'));
    updateHUD();
  }

  startNextWave() {
    if (State.life <= 0) return;
    State.wave++;
    updateHUD();
    const num = Math.floor(CONFIG.waves.monstersPerWave * Math.pow(CONFIG.waves.growthFactor, State.wave - 1));
    for (let i = 0; i < num; i++) {
      this.time.delayedCall(i * 600, () => this.spawnMonster());
    }
    // 检测波次结束
    this.time.delayedCall(num * 600 + 3000, () => this.checkWaveEnd());
  }

  spawnMonster() {
    if (State.life <= 0) return;
    let type = 'basic';
    if (State.wave >= 8 && Math.random() < 0.1) type = 'elite';
    else if (State.wave >= 5 && Math.random() < 0.2) type = 'tank';
    else if (State.wave >= 3 && Math.random() < 0.3) type = 'fast';

    const m = new Monster(this, this.path, type, State.wave);
    this.monsters.push(m);
  }

  checkWaveEnd() {
    if (this.monsters.length > 0) {
      // 怪物还没清完，稍后再检查
      this.time.delayedCall(1000, () => this.checkWaveEnd());
      return;
    }
    // 奖励生命
    let reward = 0;
    if (State.wave % 10 === 0) reward = 5;
    else if (State.wave % 5 === 0) reward = 3;
    if (reward > 0) {
      State.life = Math.min(State.base.maxLife || CONFIG.base.maxLife, State.life + reward);
      showToast(`+${reward} ❤️ 基地回血`, '#ff5252');
      updateHUD();
    }
    // 出宝箱
    if (State.wave > 0 && State.wave % CONFIG.waves.cardWaveInterval === 0) {
      this.showCards();
    } else {
      this.time.delayedCall(CONFIG.waves.waveInterval, () => this.startNextWave());
    }
  }

  showCards() {
    State.isPaused = true;
    const pool = [
      { name: '冰冻塔', icon: '❄️', effect: 'iceTower' },
      { name: '基地回血', icon: '❤️', effect: 'heal', value: 3 },
      { name: '全屏减速', icon: '⏱️', effect: 'slow', value: 5 },
      { name: '魔能补给', icon: '✨', effect: 'magic', value: 20 },
      { name: '伤害提升', icon: '⚡', effect: 'damage', value: 1.5 }
    ];
    const cards = pool.sort(() => Math.random() - 0.5).slice(0, 3);
    State.cards = cards;

    // 用Phaser绘制卡牌面板
    this.cardUIElements = [];
    // 背景遮罩
    const bg = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.8);
    bg.setDepth(900);
    this.cardUIElements.push(bg);

    // 标题
    const title = this.add.text(400, 160, '🎁 战术补给箱', { fontSize: '28px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5);
    title.setDepth(901);
    this.cardUIElements.push(title);

    // 5秒倒计时文本
    const timerText = this.add.text(400, 200, '', { fontSize: '20px', color: '#ff5252', fontStyle: 'bold' }).setOrigin(0.5);
    timerText.setDepth(901);
    this.cardUIElements.push(timerText);

    // 卡牌
    const cardBtns = [];
    cards.forEach((card, idx) => {
      const x = 250 + idx * 150;
      const y = 360;
      const cardG = this.add.rectangle(x, y, 130, 170, 0x1e3c72).setStrokeStyle(3, 0xf1c40f);
      cardG.setInteractive();
      cardG.setDepth(901);
      const icon = this.add.text(x, y - 30, card.icon, { fontSize: '44px' }).setOrigin(0.5);
      icon.setDepth(902);
      const name = this.add.text(x, y + 35, card.name, { fontSize: '14px', color: '#fff' }).setOrigin(0.5);
      name.setDepth(902);
      const hint = this.add.text(x, y + 60, '答对题领取', { fontSize: '11px', color: '#aaa' }).setOrigin(0.5);
      hint.setDepth(902);

      cardG.on('pointerover', () => { cardG.setScale(1.1); });
      cardG.on('pointerout', () => { cardG.setScale(1); });
      cardG.on('pointerdown', () => {
        if (this.cardClosed) return;
        this.cardClosed = true;
        // 销毁卡牌UI
        this.destroyCardUI();
        // 弹出答题
        State.selectedCard = card;
        showQuestionPanel('card', (ok) => {
          if (ok) {
            this.applyCard(card);
          } else {
            showToast('卡牌碎裂...', '#ff5252');
            this.shatterEffect(x, y);
          }
          this.continueAfterCard();
        });
        // 超时检测
        setTimeout(() => {
          if (State.pendingAction && State.pendingAction.reason === 'card') {
            showToast('卡牌碎裂...', '#ff5252');
            document.getElementById('question-panel').classList.remove('show');
            State.isPaused = false;
            this.shatterEffect(x, y);
            this.continueAfterCard();
          }
        }, 10000);
      });

      cardBtns.push({ x, y });
      this.cardUIElements.push(cardG, icon, name, hint);
    });

    // 5秒倒计时（卡牌碎裂）
    this.cardClosed = false;
    let remain = 5;
    timerText.setText(`⏱️ ${remain}秒后卡牌碎裂`);
    const tick = this.time.addEvent({
      delay: 1000,
      callback: () => {
        remain--;
        if (remain <= 0) {
          tick.remove();
          if (this.cardClosed) return;
          this.cardClosed = true;
          timerText.setText('💥 卡牌已碎裂');
          this.shatterEffect(400, 360);
          this.time.delayedCall(1200, () => {
            this.destroyCardUI();
            State.isPaused = false;
            this.continueAfterCard();
          });
        } else {
          timerText.setText(`⏱️ ${remain}秒后卡牌碎裂`);
        }
      },
      loop: true
    });
  }

  shatterEffect(x, y) {
    playSound('shatter');
    // 模拟卡牌碎裂
    for (let i = 0; i < 8; i++) {
      const piece = this.add.rectangle(x, y, 8, 8, 0xf1c40f);
      piece.setDepth(950);
      const angle = (Math.PI * 2 / 8) * i;
      this.tweens.add({
        targets: piece,
        x: x + Math.cos(angle) * 80,
        y: y + Math.sin(angle) * 80,
        alpha: 0,
        rotation: Math.PI * 2,
        duration: 800,
        onComplete: () => piece.destroy()
      });
    }
  }

  destroyCardUI() {
    if (this.cardUIElements) {
      this.cardUIElements.forEach(el => el.destroy());
      this.cardUIElements = [];
    }
    if (this.cardTimer) this.cardTimer.remove();
  }

  showUpgradePanel(tower) {
    // 先关闭已存在的
    this.destroyUpgradeUI();
    this.upgradeUIElements = [];
    State.upgradeTarget = tower;

    // 背景遮罩
    const bg = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.75);
    bg.setDepth(900);
    bg.setInteractive();
    this.upgradeUIElements.push(bg);

    // 标题
    const title = this.add.text(400, 200, '选择升级方向', { fontSize: '24px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    title.setDepth(901);
    this.upgradeUIElements.push(title);

    // 三个升级按钮 - 映射需求"加/减/乘/除"
    const options = [
      { type: 'ice',    name: '减法·冰冻塔', icon: '❄️', cost: 20, color: 0x9b59b6, op: '减' },
      { type: 'fire',   name: '乘法·火炮塔', icon: '🔥', cost: 25, color: 0xe67e22, op: '乘' },
      { type: 'sniper', name: '除法·狙击塔', icon: '🎯', cost: 30, color: 0x2ecc71, op: '除' }
    ];
    options.forEach((opt, idx) => {
      const x = 250 + idx * 150;
      const y = 350;
      const btn = this.add.rectangle(x, y, 130, 150, 0x2c3e50).setStrokeStyle(2, opt.color);
      btn.setInteractive();
      btn.setDepth(901);
      const icon = this.add.text(x, y - 35, opt.icon, { fontSize: '38px' }).setOrigin(0.5);
      icon.setDepth(902);
      const name = this.add.text(x, y + 5, opt.name, { fontSize: '14px', color: '#fff' }).setOrigin(0.5);
      name.setDepth(902);
      const cost = this.add.text(x, y + 30, `${opt.cost} 魔能`, { fontSize: '12px', color: '#b39ddb' }).setOrigin(0.5);
      cost.setDepth(902);
      const hint = this.add.text(x, y + 50, opt.op, { fontSize: '20px', color: opt.color, fontStyle: 'bold' }).setOrigin(0.5);
      hint.setDepth(902);

      btn.on('pointerover', () => { btn.setScale(1.05); });
      btn.on('pointerout', () => { btn.setScale(1); });
      btn.on('pointerdown', () => {
        if (State.magic < opt.cost) {
          showToast(`魔能不足！还需 ${opt.cost - State.magic} 魔能`, '#ff5252');
          return;
        }
        State.magic -= opt.cost;
        tower.upgrade(opt.type);
        playSound('upgrade');
        updateHUD();
        showToast(`✨ 升级为${opt.name}！`, '#b39ddb');
        this.destroyUpgradeUI();
        State.upgradeTarget = null;
      });

      this.upgradeUIElements.push(btn, icon, name, cost, hint);
    });
  }

  destroyUpgradeUI() {
    if (this.upgradeUIElements) {
      this.upgradeUIElements.forEach(el => el.destroy());
      this.upgradeUIElements = [];
    }
  }

  applyCard(card) {
    switch (card.effect) {
      case 'iceTower': {
        const empty = this.gridPositions.find(g => !g.hasTower);
        if (empty) {
          const t = new Tower(this, empty.x, empty.y, 'ice');
          this.towers.push(t);
          empty.hasTower = true;
          empty.tower = t;
          showToast('❄️ 获得冰冻塔！', '#b39ddb');
        }
        break;
      }
      case 'heal':
        State.life = Math.min(CONFIG.base.maxLife, State.life + card.value);
        showToast(`❤️ 基地回血 +${card.value}`, '#ff5252');
        break;
      case 'slow':
        this.monsters.forEach(m => { if (m.active) m.slow(0.5, card.value * 1000); });
        showToast('⏱️ 全屏减速5秒', '#64b5f6');
        break;
      case 'magic':
        State.magic += card.value;
        showToast(`✨ +${card.value} 魔能`, '#b39ddb');
        break;
      case 'damage':
        this.towers.forEach(t => { if (t.active) t.boostDamage(card.value, 10000); });
        showToast('⚡ 伤害提升10秒', '#f1c40f');
        break;
    }
    updateHUD();
  }

  continueAfterCard() {
    State.isPaused = false;
    State.cards = [];
    this.time.delayedCall(CONFIG.waves.waveInterval, () => this.startNextWave());
  }

  onBaseHit(damage) {
    if (State.isOverloading) return;
    State.life = Math.max(0, State.life - damage);
    this.baseSprite.setFillStyle(0xff0000);
    this.cameras.main.shake(150, 0.01);
    setTimeout(() => this.baseSprite.setFillStyle(0xe74c3c), 200);
    updateHUD();
    if (State.life <= 0) {
      this.gameOver();
    } else if (State.life <= CONFIG.base.overloadThreshold) {
      document.getElementById('overload-btn').classList.add('show');
    }
  }

  gameOver() {
    State.endTime = Date.now();
    document.getElementById('correct-count').textContent = State.correctCount;
    document.getElementById('survive-waves').textContent = State.wave;
    document.getElementById('kill-count').textContent = State.killCount;
    document.getElementById('max-combo').textContent = State.maxCombo;
    document.getElementById('total-magic').textContent = State.totalMagicEarned;
    // 伪战报：算力 = 答题数 × 难度系数 × 100
    const difficultyBonus = 1 + State.difficultyLevel * 0.5;
    const computePower = Math.floor(State.totalAnswered * 100 * difficultyBonus);
    const percent = Math.min(99, 50 + Math.floor(computePower / 200));
    document.getElementById('poster-headline').textContent = `今日动用算力 ${computePower.toLocaleString()}`;
    document.getElementById('poster-percent').textContent = `击败 ${percent}% 同龄人`;
    document.getElementById('gameover-screen').classList.add('show');
  }

  restartGame() {
    State.stardust = 50;
    State.magic = 0;
    State.life = State.maxLife;
    State.wave = 0;
    State.correctCount = 0;
    State.killCount = 0;
    State.totalAnswered = 0;
    State.combo = 0;
    State.maxCombo = 0;
    State.wrongStreak = 0;
    State.difficultyLevel = 0;
    State.totalMagicEarned = 0;
    State.totalDamageDealt = 0;
    State.isOverloading = false;
    State.isPaused = false;
    document.getElementById('gameover-screen').classList.remove('show');
    document.getElementById('overload-btn').classList.remove('show');
    document.getElementById('question-panel').classList.remove('show');
    document.getElementById('card-panel').classList.remove('show');
    document.getElementById('upgrade-panel').style.display = 'none';
    this.destroyUpgradeUI();
    this.destroyCardUI();
    this.towers.forEach(t => t.destroy());
    this.monsters.forEach(m => m.destroy());
    this.bullets.forEach(b => b.destroy());
    this.towers = []; this.monsters = []; this.bullets = [];
    this.gridPositions.forEach(g => g.hasTower = false);
    updateHUD();
    this.scene.restart();
  }

  startOverload() {
    if (State.life > CONFIG.base.overloadThreshold) {
      showToast('基地血量充足，无需超载', '#64b5f6');
      return;
    }
    State.isOverloading = true;
    document.getElementById('overload-btn').classList.remove('show');
    playSound('overload');
    // 子弹时间：所有怪物减速到10%
    this.monsters.forEach(m => { if (m.active) m.slow(0.1, CONFIG.base.overloadDuration); });
    showToast('⏱️ 子弹时间已启动！', '#f1c40f');
    showQuestionPanel('overload', (ok) => {
      if (ok) {
        // 答对清屏：所有怪物秒杀
        this.cameras.main.flash(500, 255, 255, 100);
        // 释放高压电弧
        for (let i = 0; i < 8; i++) {
          this.time.delayedCall(i * 60, () => {
            this.monsters.forEach(m => { if (m.active) m.kill(); });
          });
        }
        showToast('⚡ 高压电弧清屏！', '#e74c3c');
      } else {
        // 答错：子弹时间结束
        this.monsters.forEach(m => { if (m.active) m.unslow(); });
        showToast('超载失败，子弹时间结束', '#ff5252');
      }
      State.isOverloading = false;
    });
    // 3秒后自动结束子弹时间（无论答题与否）
    this.time.delayedCall(CONFIG.base.overloadDuration, () => {
      if (State.isOverloading) {
        State.isOverloading = false;
      }
    });
  }

  update(time, delta) {
    if (State.isPaused) return;
    this.monsters.forEach(m => m.update(time, delta));
    this.towers.forEach(t => t.update(time, delta, this.monsters));
    this.bullets.forEach(b => b.update(time, delta));
    // 清理
    this.monsters = this.monsters.filter(m => m.active);
    this.bullets = this.bullets.filter(b => b.active);
  }
}

// ============ 塔 ============
class Tower extends Phaser.GameObjects.Container {
  constructor(scene, x, y, type) {
    super(scene, x, y);
    this.type = type;
    const cfg = CONFIG.towers[type];
    this.damage = cfg.damage;
    this.range = cfg.range;
    this.fireRate = cfg.fireRate;
    this.bulletSpeed = cfg.bulletSpeed;
    this.color = cfg.color;
    this.icon = cfg.icon || '🔫';
    this.slowEffect = cfg.slowEffect || 0;
    this.slowDuration = cfg.slowDuration || 0;
    this.splashRadius = cfg.splashRadius || 0;
    this.piercing = cfg.piercing || false;
    this.poison = cfg.poison || 0;
    this.crit = cfg.crit || 1;
    this.level = type === 'basic' ? 1 : 2;
    this.lastFire = 0;
    this.target = null;

    // 塔身
    const circle = scene.add.circle(0, 0, 22, cfg.color);
    circle.setStrokeStyle(2, 0xffffff);
    this.add(circle);
    // 塔图标
    const iconText = scene.add.text(0, 0, this.icon, { fontSize: '20px' }).setOrigin(0.5);
    this.add(iconText);
    // 等级标识
    if (this.level > 1) {
      const star = scene.add.text(0, 14, '★', { fontSize: '12px', color: '#ffd700' }).setOrigin(0.5);
      this.add(star);
    }
    // 交互
    this.setSize(50, 50);
    scene.add.existing(this);
    this.setInteractive(new Phaser.Geom.Circle(0, 0, 25), Phaser.Geom.Circle.Contains);
    this.on('pointerdown', (pointer, localX, localY, event) => {
      event && event.stopPropagation();
      this.onClick();
    });
  }

  onClick() {
    // 显示塔信息（任何塔都可点开看，不让白板塔可升级已经没意义——所有塔都能直接买）
    showToast(`${this.icon} ${CONFIG.towers[this.type].name}\n伤害${this.damage} 范围${this.range}`, '#' + this.color.toString(16).padStart(6, '0'));
  }

  upgrade(newType) {
    const cfg = CONFIG.towers[newType];
    this.type = newType;
    this.damage = cfg.damage;
    this.range = cfg.range;
    this.fireRate = cfg.fireRate;
    this.bulletSpeed = cfg.bulletSpeed;
    this.color = cfg.color;
    this.icon = cfg.icon || this.icon;
    this.slowEffect = cfg.slowEffect || 0;
    this.slowDuration = cfg.slowDuration || 0;
    this.splashRadius = cfg.splashRadius || 0;
    this.level = 2;
    // 重绘
    this.removeAll(true);
    const circle = this.scene.add.circle(0, 0, 22, cfg.color);
    circle.setStrokeStyle(2, 0xffffff);
    this.add(circle);
    const iconText = this.scene.add.text(0, 0, this.icon, { fontSize: '20px' }).setOrigin(0.5);
    this.add(iconText);
    const star = this.scene.add.text(0, 14, '★', { fontSize: '12px', color: '#ffd700' }).setOrigin(0.5);
    this.add(star);
  }

  boostDamage(factor, duration) {
    const orig = this.damage;
    this.damage *= factor;
    this.scene.time.delayedCall(duration, () => { this.damage = orig; });
  }

  update(time, delta, monsters) {
    if (time - this.lastFire < this.fireRate) return;
    this.target = this.findTarget(monsters);
    if (this.target && this.target.active) {
      this.lastFire = time;
      this.fire();
    }
  }

  findTarget(monsters) {
    let nearest = null;
    let minDist = this.range;
    for (const m of monsters) {
      if (!m.active) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y);
      if (d < minDist) { minDist = d; nearest = m; }
    }
    return nearest;
  }

  fire() {
    const b = new Bullet(this.scene, this.x, this.y - 25, this.target, this.damage, this.bulletSpeed, this.color, {
      slowEffect: this.slowEffect,
      slowDuration: this.slowDuration,
      splashRadius: this.splashRadius,
      piercing: this.piercing,
      poison: this.poison,
      crit: this.crit
    });
    this.scene.bullets.push(b);
  }
}

// ============ 怪物 ============
class Monster extends Phaser.GameObjects.Container {
  constructor(scene, path, type, wave = 1) {
    super(scene, path.getStartPoint().x, path.getStartPoint().y);
    const cfg = CONFIG.monsters[type];
    this.type = type;
    this.baseSpeed = cfg.speed;
    this.speed = cfg.speed;
    this.slowFactor = 1;
    this.slowEnd = 0;
    const lifeMul = Math.pow(1.1, wave - 1);
    this.life = Math.floor(cfg.life * lifeMul);
    this.maxLife = this.life;
    this.damage = cfg.damage;
    this.reward = cfg.reward;
    this.color = cfg.color;
    this.radius = cfg.radius;

    // 怪物身体
    this.body = scene.add.circle(0, 0, this.radius, cfg.color);
    this.body.setStrokeStyle(2, 0xffffff);
    this.add(this.body);

    // 血条
    this.hpBar = scene.add.rectangle(0, -this.radius - 6, 30, 4, 0xff0000);
    this.hpBg = scene.add.rectangle(0, -this.radius - 6, 30, 4, 0x000000);
    this.hpBg.setStrokeStyle(0.5, 0xffffff);
    this.add(this.hpBg);
    this.add(this.hpBar);

    scene.add.existing(this);

    // 路径跟随 - 使用follow方法
    const duration = (path.getLength() / this.speed) * 1000;
    this.pathTween = scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: duration,
      ease: 'Linear',
      onUpdate: (tween) => {
        const t = tween.getValue();
        const pt = path.getPoint(t);
        if (pt) { this.x = pt.x; this.y = pt.y; }
      },
      onComplete: () => this.reachEnd()
    });
  }

  slow(factor, duration) {
    this.slowFactor = factor;
    this.slowEnd = this.scene.time.now + duration;
    // 减速tween
    if (this.pathTween) {
      this.pathTween.timeScale = factor;
    }
  }

  unslow() {
    this.slowEnd = 0;
    this.slowFactor = 1;
    if (this.pathTween) this.pathTween.timeScale = 1;
  }

  takeDamage(dmg) {
    this.life -= dmg;
    this.hpBar.setScale(Math.max(0, this.life / this.maxLife), 1);
    this.hpBar.setFillStyle(0xff0000);
    if (this.life <= 0) this.kill();
  }

  poisonDot(dps, duration) {
    // 毒素DOT：每秒扣血
    if (this.poisonTimer) this.poisonTimer.remove();
    const start = this.scene.time.now;
    this.poisonTimer = this.scene.time.addEvent({
      delay: 500,
      callback: () => {
        if (!this.active) { this.poisonTimer.remove(); return; }
        this.life -= dps;
        this.hpBar.setScale(Math.max(0, this.life / this.maxLife), 1);
        // 绿色滴落特效
        const drop = this.scene.add.text(this.x, this.y, '☠', { fontSize: '12px', color: '#8bc34a' }).setOrigin(0.5);
        this.scene.tweens.add({ targets: drop, y: drop.y - 15, alpha: 0, duration: 400, onComplete: () => drop.destroy() });
        if (this.life <= 0) { this.poisonTimer.remove(); this.kill(); }
        if (this.scene.time.now - start >= duration) this.poisonTimer.remove();
      },
      loop: true
    });
  }

  kill() {
    if (!this.active) return;
    State.stardust += this.reward;
    State.killCount++;
    State.totalDamageDealt += this.maxLife;
    updateHUD();
    // 爆炸特效
    const exp = this.scene.add.circle(this.x, this.y, this.radius, 0xffd700, 0.8);
    this.scene.tweens.add({
      targets: exp,
      scale: 2.5,
      alpha: 0,
      duration: 300,
      onComplete: () => exp.destroy()
    });
    // 飘字"+⭐"飞向HUD
    const flyText = this.scene.add.text(this.x, this.y, `+${this.reward}⭐`, {
      fontSize: '16px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5);
    this.scene.tweens.add({
      targets: flyText,
      y: this.y - 60,
      alpha: 0,
      duration: 1000,
      onComplete: () => flyText.destroy()
    });
    // 销毁
    if (this.pathTween) this.pathTween.stop();
    this.destroy();
  }

  reachEnd() {
    if (!this.active) return;
    this.scene.onBaseHit(this.damage);
    this.destroy();
  }

  update(time, delta) {
    // 减速结束
    if (this.slowEnd > 0 && time > this.slowEnd) {
      this.slowEnd = 0;
      if (this.pathTween) this.pathTween.timeScale = 1;
    }
  }
}

// ============ 子弹 ============
class Bullet extends Phaser.GameObjects.Container {
  constructor(scene, x, y, target, damage, speed, color, effects = {}) {
    super(scene, x, y);
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.effects = effects;
    const ball = scene.add.circle(0, 0, 5, color);
    ball.setStrokeStyle(1, 0xffffff);
    this.add(ball);
    scene.add.existing(this);
  }

  update(time, delta) {
    if (!this.target || !this.target.active) { this.destroy(); return; }
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    const dist = this.speed * delta / 1000;
    this.x += Math.cos(angle) * dist;
    this.y += Math.sin(angle) * dist;
    const d = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    if (d < 15) {
      this.onHit();
    }
  }

  onHit() {
    if (this.target && this.target.active) {
      // 暴击
      const isCrit = this.effects.crit > 1 && Math.random() < 0.3;
      const dmg = isCrit ? Math.floor(this.damage * this.effects.crit) : this.damage;
      this.target.takeDamage(dmg);
      if (isCrit) {
        const critText = this.scene.add.text(this.target.x, this.target.y - 20, '💥暴击!', { fontSize: '14px', color: '#ff5252', fontStyle: 'bold' }).setOrigin(0.5);
        this.scene.tweens.add({ targets: critText, y: critText.y - 20, alpha: 0, duration: 600, onComplete: () => critText.destroy() });
      }
      if (this.effects.poison && this.target.poisonDot) {
        this.target.poisonDot(this.effects.poison, 3000);
      }
      if (this.effects.slowEffect && this.target.slow) {
        this.target.slow(this.effects.slowEffect, this.effects.slowDuration);
      }
      if (this.effects.splashRadius) {
        this.scene.monsters.forEach(m => {
          if (!m.active || m === this.target) return;
          const d = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y);
          if (d < this.effects.splashRadius) m.takeDamage(Math.floor(dmg * 0.6));
        });
        const exp = this.scene.add.circle(this.x, this.y, this.effects.splashRadius, 0xe67e22, 0.4);
        this.scene.tweens.add({
          targets: exp,
          scale: 0.5,
          alpha: 0,
          duration: 300,
          onComplete: () => exp.destroy()
        });
      }
      // 穿透不消失
      if (!this.effects.piercing) {
        this.destroy();
        return;
      } else {
        // 穿透：找下一个目标
        this.target = this.findNextTarget();
        if (!this.target) this.destroy();
      }
    } else {
      this.destroy();
    }
  }

  findNextTarget() {
    let nearest = null;
    let minDist = 200;
    for (const m of this.scene.monsters) {
      if (!m.active || m === this.target) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y);
      if (d < minDist) { minDist = d; nearest = m; }
    }
    return nearest;
  }
}

// ============ UI事件绑定 ============
function bindUIEvents() {
  // 升级按钮
  document.querySelectorAll('.tower-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const cost = CONFIG.upgradeCost[type];
      if (State.magic < cost) {
        showToast('魔能不足！', '#ff5252');
        return;
      }
      if (!State.upgradeTarget) return;
      State.magic -= cost;
      State.upgradeTarget.upgrade(type);
      updateHUD();
      showToast(`✨ 升级为${CONFIG.towers[type].name}！`, '#b39ddb');
      document.getElementById('upgrade-panel').classList.remove('show');
      State.upgradeTarget = null;
    });
  });
  // 绝境超载
  document.getElementById('overload-btn').addEventListener('click', () => {
    if (State.gameScene) State.gameScene.startOverload();
  });
  // 重新开始
  document.getElementById('restart-btn').addEventListener('click', () => {
    if (State.gameScene) State.gameScene.restartGame();
  });
}

// ============ 启动 ============
window.addEventListener('load', () => {
  bindUIEvents();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: CONFIG.width,
    height: CONFIG.height,
    backgroundColor: '#1a1a2e',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      expandParent: true,
      fullscreenTarget: 'game-container'
    },
    // 移动端：禁用浏览器默认触摸行为
    input: { activePointers: 3, windowEvents: false },
    scene: [MainScene]
  });
  window.game = game;
  // 监听窗口变化，让 canvas 跟随 #game-container 自适应
  window.addEventListener('resize', () => game.scale.refresh());
  // 启动后 1s 内多次 refresh，等布局稳定
  setTimeout(() => game.scale.refresh(), 50);
  setTimeout(() => game.scale.refresh(), 200);
  setTimeout(() => game.scale.refresh(), 1000);
});
