// i18n.js — English / 中文 interface text.
// Static elements use data-i18n / data-i18n-title / data-i18n-placeholder attributes;
// scripts call t('key', { vars }). English is the default; the choice is remembered per browser.

const STRINGS = {
  en: {
    tagline: 'Place your prompts. Reveal the unexpected. Give it a name.',
    heading: 'Blind Collage',
    chooseScene: 'CHOOSE A SCENE',
    backToCollage: 'BACK TO COLLAGE →',
    openLibrary: 'LIBRARY →',
    library: 'LIBRARY',
    closeLibrary: '← SCENES',
    more: 'MORE ↓',
    close: 'CLOSE ×',
    prompts: 'PROMPTS',
    promptTip: 'Click to add, or drag onto the canvas',
    enter: 'ENTER →',
    photo: 'PHOTO: ',

    rotl: '⟲ ROTATE', rotlTip: 'Rotate left (Q)',
    rotr: 'ROTATE ⟳', rotrTip: 'Rotate right (E)',
    smaller: '− SMALLER', smallerTip: 'Smaller (mouse wheel)',
    bigger: '+ BIGGER', biggerTip: 'Bigger (mouse wheel)',
    back: '[ BACK', backTip: 'Send backward ([)',
    front: 'FRONT ]', frontTip: 'Bring forward (])',
    remove: '× REMOVE', removeTip: 'Remove (Delete)',

    bgOn: 'BACKGROUND: ON',
    bgOff: 'BACKGROUND: OFF',
    randomize: 'RANDOMIZE',
    scenes: 'SCENES',
    revealAll: 'REVEAL ALL →',
    revealing: 'REVEALING…',
    hint: 'DRAG TO MOVE · DRAG ● TO ROTATE (SHIFT SNAPS 15°) · WHEEL OR CORNER TO RESIZE · Q / E ROTATE · [ / ] LAYER · DELETE REMOVES',

    titleQuestion: 'What would you call this picture?',
    untitled: 'Untitled',
    savePng: 'SAVE PNG',
    borderOn: 'WHITE BORDER: ON',
    borderOff: 'WHITE BORDER: OFF',
    submit: 'SUBMIT TO ARCHIVE',
    submitted: 'SUBMITTED ✓',
    sending: 'SENDING…',
    startOver: 'START OVER',
    submitNotice: 'Submitting sends this picture, its title and layout to the project archive, and it will appear in the public library. Nothing else about you is collected.',
    submittedMsg: 'SUBMITTED ✓  ({id})',
    submitFailed: 'SUBMIT FAILED: {msg} — press SUBMIT again to retry.',
    saveFailed: 'SAVE FAILED: {msg}',

    stageIntro: '00 / BEGIN',
    stageArrange: '01 / ARRANGE',
    stageRevealing: '02 / REVEAL',
    stageRevealed: '03 / TITLE',
    stageScenesSuffix: ' · SCENES',

    guideIntro: 'CHOOSE A SCENE TO BEGIN',
    guideArrangeEmpty: 'ADD UP TO {n} PROMPTS, THEN ARRANGE THEM',
    guideArrange: 'ARRANGE YOUR PROMPTS, THEN REVEAL ALL',
    guideRevealing: 'REVEALING…',
    guideRevealed: 'GIVE IT A NAME',
    guideLibrary: 'PICTURES OTHER PEOPLE MADE AND NAMED',
    guideSwitchScene: 'PICK A NEW SCENE · YOUR PROMPTS STAY PUT',

    maxPrompts: 'MAXIMUM {n} PROMPTS. REMOVE ONE TO ADD ANOTHER.',
    maxPromptsShort: 'MAXIMUM {n} PROMPTS.',
    choosing: 'CHOOSING…',
    loadingN: 'LOADING {d} / {n}',
    revealingN: 'REVEALING {d} / {n} · CLICK THE PICTURE TO SKIP',
    revealFailed: 'REVEAL FAILED: {msg} — Your layout is unchanged. Press REVEAL ALL to try again.',
    sceneFailed: 'SCENE FAILED TO LOAD',
    loadingScene: 'LOADING SCENE…',
    addPrompt: 'ADD A PROMPT FROM THE LIST',
    dataFailed: 'COULD NOT LOAD THE IMAGE LIST: {msg}',

    footerLeft: 'RISO CUT-OUTS / {n} PIECES',
    footerRight: 'NOTHING IS QUITE WHAT IT SEEMS',
    theEnd: 'THE END (?)',
    disclaimer: 'A non-commercial student art project. Not for sale or any commercial use. Characters, brands and artworks that appear in the cut-outs belong to their respective owners; background photos are credited under each scene.',

    libLoading: 'LOADING THE LIBRARY…',
    libCountOne: 'LIBRARY · 1 PICTURE',
    libCount: 'LIBRARY · {n} PICTURES',
    libEmpty: 'NOTHING HERE YET. BE THE FIRST.',
    libFailed: 'COULD NOT LOAD THE LIBRARY: {msg}',
    libNoList: 'The archive did not return a list. Is the latest Code.gs deployed?',
    cannotDraw: 'CANNOT DRAW: {msg}'
  },

  zh: {
    tagline: '先摆好提示，再揭晓意外，最后给它起个名字。',
    heading: '盲 拼 贴',
    chooseScene: '选择一个场景',
    backToCollage: '回到拼贴 →',
    openLibrary: '作品库 →',
    library: '作品库',
    closeLibrary: '← 场景',
    more: '更多 ↓',
    close: '关闭 ×',
    prompts: '提示',
    promptTip: '点击添加，或直接拖到画布上',
    enter: '进入 →',
    photo: '图片：',

    rotl: '⟲ 左转', rotlTip: '向左旋转（Q）',
    rotr: '右转 ⟳', rotrTip: '向右旋转（E）',
    smaller: '− 缩小', smallerTip: '缩小（鼠标滚轮）',
    bigger: '+ 放大', biggerTip: '放大（鼠标滚轮）',
    back: '[ 下移一层', backTip: '下移一层（[）',
    front: '上移一层 ]', frontTip: '上移一层（]）',
    remove: '× 删除', removeTip: '删除（Delete）',

    bgOn: '背景：开',
    bgOff: '背景：关',
    randomize: '随机换背景',
    scenes: '换场景',
    revealAll: '全部揭晓 →',
    revealing: '揭晓中…',
    hint: '拖动以移动 · 拖动 ● 以旋转（按住 SHIFT 每次 15°）· 滚轮或拖角缩放 · Q / E 旋转 · [ / ] 调整图层 · DELETE 删除',

    titleQuestion: '你会给这幅画起什么名字？',
    untitled: '无题',
    savePng: '保存 PNG',
    borderOn: '白边：开',
    borderOff: '白边：关',
    submit: '提交到作品库',
    submitted: '已提交 ✓',
    sending: '发送中…',
    startOver: '重新开始',
    submitNotice: '提交后，这幅画、它的标题和布局会保存到项目档案，并出现在公开的作品库中。不会收集你的任何其他信息。',
    submittedMsg: '已提交 ✓（{id}）',
    submitFailed: '提交失败：{msg}。再点一次“提交”即可重试。',
    saveFailed: '保存失败：{msg}',

    stageIntro: '00 / 开始',
    stageArrange: '01 / 摆放',
    stageRevealing: '02 / 揭晓',
    stageRevealed: '03 / 命名',
    stageScenesSuffix: ' · 场景',

    guideIntro: '选一个场景开始',
    guideArrangeEmpty: '最多添加 {n} 个提示，然后摆放它们',
    guideArrange: '摆好你的提示，然后全部揭晓',
    guideRevealing: '揭晓中…',
    guideRevealed: '给它起个名字',
    guideLibrary: '别人做好并命名的画',
    guideSwitchScene: '换一个场景 · 已摆好的提示不会动',

    maxPrompts: '最多 {n} 个提示。删掉一个才能再添加。',
    maxPromptsShort: '最多 {n} 个提示。',
    choosing: '抽取中…',
    loadingN: '加载中 {d} / {n}',
    revealingN: '揭晓中 {d} / {n} · 点击画面可跳过',
    revealFailed: '揭晓失败：{msg}。你的布局没有改变，再点一次“全部揭晓”即可重试。',
    sceneFailed: '场景加载失败',
    loadingScene: '场景加载中…',
    addPrompt: '从列表中添加一个提示',
    dataFailed: '素材清单加载失败：{msg}',

    footerLeft: 'RISO 印刷剪贴 / {n} 件',
    footerRight: '一切都不太像它看起来的样子',
    theEnd: '完（？）',
    disclaimer: '本网站为非商业性质的学生艺术作品，不出售，也不用于任何商业用途。拼贴素材中出现的角色、品牌及艺术作品，其权利归各自所有者；背景照片的署名列在各场景下方。',

    libLoading: '作品库加载中…',
    libCountOne: '作品库 · 1 幅',
    libCount: '作品库 · {n} 幅',
    libEmpty: '这里还空着，来做第一幅吧。',
    libFailed: '作品库加载失败：{msg}',
    libNoList: '档案没有返回作品列表。最新的 Code.gs 部署了吗？',
    cannotDraw: '无法绘制：{msg}'
  }
};

const I18n = {
  lang: 'en',
  listeners: [],

  init() {
    let lang = 'en';
    try { lang = localStorage.getItem('bc-lang') || lang; } catch (e) { /* storage blocked */ }
    const q = new URLSearchParams(location.search).get('lang');
    if (q) lang = q;
    this.lang = STRINGS[lang] ? lang : 'en';
    for (const b of document.querySelectorAll('[data-lang]')) {
      b.addEventListener('click', () => this.set(b.dataset.lang));
    }
    this.apply();
  },

  set(lang) {
    if (!STRINGS[lang] || lang === this.lang) return;
    this.lang = lang;
    try { localStorage.setItem('bc-lang', lang); } catch (e) { /* storage blocked */ }
    this.apply();
    this.listeners.forEach(fn => fn(lang));
  },

  onChange(fn) { this.listeners.push(fn); },

  t(key, vars) {
    let s = STRINGS[this.lang][key] ?? STRINGS.en[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
    return s;
  },

  // Pick a localized field from data, e.g. pick(prompt, 'label') → label_zh in Chinese.
  pick(obj, field) {
    return (this.lang !== 'en' && obj[`${field}_${this.lang}`]) || obj[field];
  },

  apply() {
    document.documentElement.lang = this.lang === 'zh' ? 'zh-CN' : 'en';
    for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = this.t(el.dataset.i18n);
    for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = this.t(el.dataset.i18nTitle);
    for (const el of document.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = this.t(el.dataset.i18nPlaceholder);
    for (const b of document.querySelectorAll('[data-lang]')) b.classList.toggle('active', b.dataset.lang === this.lang);
  }
};

function t(key, vars) { return I18n.t(key, vars); }
