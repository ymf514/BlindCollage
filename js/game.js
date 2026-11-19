// game.js — stages, state, DOM controls, reveal, title, export, start over.

const state = {
  stage: 'intro',          // intro | arrange | revealing | revealed
  view: 'home',            // home (title + scenes) | studio | library
  backgroundId: null,
  useBackground: true,
  pieces: [],              // array order = layer order (last = top)
  selectedPieceId: null,
  title: '',
  revealError: null,       // { k, v } message, translated at display time
  submission: { status: 'idle', id: '', message: null },   // idle | sending | sent | error
  borders: loadBorderPref(),   // true = cut-outs with a white paper border, false = tight cut
  round: 0                 // bumped on start over; stale async results are ignored
};

const Game = {
  maxPieces: 5,
  pieceSeq: 0,
  bgImage: null,           // loaded image for state.backgroundId (null while loading)
  bgToken: 0,
  bgError: '',
  revealed: new Map(),     // assetId -> image for the current round (white-border set)
  revealedTight: new Map(),// assetId -> image (tight set), loaded only when someone switches to it
  borderToken: 0,
  progress: null,
  anim: null,              // { progress: Map(pieceId -> 0..1), skip } while the reveal plays
  el: {},
  panelFull: false,

  async init() {
    const $ = id => document.getElementById(id);
    this.el = {
      guide: $('guide'), stageLabel: $('stage-label'), footerLeft: $('footer-left'), footerRight: $('footer-right'),
      home: $('home'), studio: $('studio'), library: $('library'), openLibrary: $('open-library'), sceneGrid: $('scene-grid'), libStatus: $('library-status'),
      backToCollage: $('back-to-collage'), promptList: $('prompt-list'), count: $('count'), panelMsg: $('panel-msg'),
      toolbar: $('toolbar'), arrange: $('arrange-actions'), bgToggle: $('bg-toggle'), bgRandom: $('bg-random'),
      toScenes: $('to-scenes'), reveal: $('reveal'), hint: $('hint'), status: $('reveal-status'),
      titleBlock: $('title-block'), titleInput: $('title-input'), save: $('save-png'), startOver: $('start-over'),
      submit: $('submit'), submitNotice: $('submit-notice'), submitStatus: $('submit-status'),
      borderToggle: $('border-toggle')
    };

    try {
      await Library.load();
    } catch (err) {
      this.el.libStatus.textContent = t('dataFailed', { msg: err.message });
      console.error(err);
      return false;
    }
    this.maxPieces = Library.data.maxPieces || 5;
    this.buildScenes();
    this.buildPrompts();
    this.bindControls();
    LibraryView.init();
    I18n.onChange(() => this.relabel());
    if (Library.warnings.length) this.el.libStatus.textContent = 'LIBRARY WARNINGS: ' + Library.warnings.join(' · ');
    this.sync();
    return true;
  },

  // ---------- builders ----------
  buildScenes() {
    const grid = this.el.sceneGrid;
    grid.innerHTML = '';
    Library.backgrounds.forEach((bg, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'scene';
      b.dataset.id = bg.id;
      const img = document.createElement('img');
      img.src = bg.thumb || bg.file;
      img.alt = I18n.pick(bg, 'label');
      img.loading = 'lazy';
      const cap = document.createElement('span');
      cap.className = 'cap';
      cap.innerHTML = `<span></span><span class="muted"></span>`;
      cap.children[0].textContent = `${String(i + 1).padStart(2, '0')} / ${I18n.pick(bg, 'label').toUpperCase()}`;
      cap.children[1].textContent = t('enter');
      const credit = document.createElement('span');
      credit.className = 'credit muted';
      credit.textContent = bg.credit ? t('photo') + I18n.pick(bg, 'credit') : '';
      b.append(img, cap, credit);
      b.addEventListener('click', () => this.chooseScene(bg.id));
      grid.append(b);
    });
  },

  buildPrompts() {
    const list = this.el.promptList;
    list.innerHTML = '';
    for (const p of Library.prompts) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'prompt';
      b.dataset.id = p.id;
      b.draggable = true;
      b.textContent = I18n.pick(p, 'label');
      b.title = t('promptTip');
      b.addEventListener('click', () => this.addPiece(p.id));
      b.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', p.id);
        e.dataTransfer.effectAllowed = 'copy';
      });
      list.append(b);
    }
  },

  bindControls() {
    const e = this.el;
    e.bgToggle.addEventListener('click', () => { state.useBackground = !state.useBackground; this.changed(); });
    e.bgRandom.addEventListener('click', () => this.randomizeBackground());
    e.toScenes.addEventListener('click', () => this.showHome(true));
    e.backToCollage.addEventListener('click', () => this.showStudio());
    e.reveal.addEventListener('click', () => this.revealAll());
    e.save.addEventListener('click', () => this.savePNG());
    e.startOver.addEventListener('click', () => this.startOver());
    e.submit.addEventListener('click', () => this.submit());
    e.borderToggle.addEventListener('click', () => this.setBorders(!state.borders));
    e.titleInput.addEventListener('input', () => { state.title = e.titleInput.value; });
    e.toolbar.addEventListener('click', ev => {
      const act = ev.target.closest('button')?.dataset.act;
      if (act) this.toolbarAction(act);
    });
  },

  // ---------- navigation ----------
  chooseScene(id) {
    if (state.stage === 'intro') state.stage = 'arrange';
    if (state.stage === 'arrange' || state.stage === 'intro') this.setBackground(id);
    this.showStudio();
  },

  showStudio() {
    state.view = 'studio';
    this.sync();
    window.scrollTo({ top: 0 });
    if (window.layoutCanvas) window.layoutCanvas();
  },

  showHome(toScenes) {
    state.view = 'home';
    this.sync();
    if (toScenes) document.getElementById('scenes').scrollIntoView();
    else window.scrollTo({ top: 0 });
  },

  setBackground(id) {
    if (!Library.backgroundById.has(id)) return;
    if (state.backgroundId === id && (this.bgImage || !this.bgError)) { this.changed(); return; }
    state.backgroundId = id;
    state.useBackground = true;
    this.bgImage = null;
    this.bgError = '';
    const token = ++this.bgToken;           // newer requests win
    ImageCache.load(Library.backgroundById.get(id).file)
      .then(img => { if (token === this.bgToken) { this.bgImage = img; this.changed(); } })
      .catch(err => { if (token === this.bgToken) { this.bgError = err.message; this.changed(); } });
    this.changed();
  },

  randomizeBackground() {
    const others = Library.backgrounds.filter(b => b.id !== state.backgroundId);
    if (!others.length) return;
    this.setBackground(others[Math.floor(Math.random() * others.length)].id);
  },

  // ---------- pieces ----------
  selected() {
    return state.pieces.find(p => p.id === state.selectedPieceId) || null;
  },

  addPiece(promptId, x, y) {
    if (state.stage !== 'arrange') return;
    if (state.pieces.length >= this.maxPieces) {
      this.flash(t('maxPrompts', { n: this.maxPieces }));
      return;
    }
    // Default spots: first free-ish slot, so click-added prompts don't pile up.
    const slots = [[600, 450], [310, 260], [890, 260], [310, 640], [890, 640]];
    const free = slots.find(([sx, sy]) => !state.pieces.some(p => Math.hypot(p.x - sx, p.y - sy) < 60))
      || [160 + Math.random() * 880, 140 + Math.random() * 620];
    const big = state.pieces.length < 5;
    const piece = {
      id: 'piece-' + (++this.pieceSeq),
      promptId,
      x: x ?? free[0],
      y: y ?? free[1],
      width: big ? 300 : 230,
      height: big ? 210 : 160,
      rotation: 0,
      assetId: null
    };
    piece.x = Math.min(LOGICAL_W, Math.max(0, piece.x));
    piece.y = Math.min(LOGICAL_H, Math.max(0, piece.y));
    state.pieces.push(piece);
    state.selectedPieceId = piece.id;
    state.revealError = null;
    this.changed();
  },

  removePiece(id) {
    state.pieces = state.pieces.filter(p => p.id !== id);
    if (state.selectedPieceId === id) state.selectedPieceId = null;
    this.changed();
  },

  moveLayer(id, dir) {
    const i = state.pieces.findIndex(p => p.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= state.pieces.length) return;
    const [p] = state.pieces.splice(i, 1);
    state.pieces.splice(j, 0, p);
    this.changed();
  },

  rotate(id, deg) {
    const p = state.pieces.find(q => q.id === id);
    if (p) { p.rotation += deg * Math.PI / 180; this.changed(); }
  },

  scale(id, factor) {
    const p = state.pieces.find(q => q.id === id);
    if (p) { Collage.resize(p, p.width * factor); this.changed(); }
  },

  toolbarAction(act) {
    const p = this.selected();
    if (!p || state.stage !== 'arrange') return;
    if (act === 'rotl') this.rotate(p.id, -10);
    if (act === 'rotr') this.rotate(p.id, 10);
    if (act === 'smaller') this.scale(p.id, 0.9);
    if (act === 'bigger') this.scale(p.id, 1.1);
    if (act === 'back') this.moveLayer(p.id, -1);
    if (act === 'front') this.moveLayer(p.id, 1);
    if (act === 'delete') this.removePiece(p.id);
  },

  // ---------- reveal ----------
  async revealAll() {
    if (state.stage !== 'arrange' || state.pieces.length === 0) return;
    const round = state.round;
    state.stage = 'revealing';
    state.selectedPieceId = null;
    state.revealError = null;
    this.progress = { k: 'choosing' };
    this.changed();

    let picks;
    try {
      picks = Library.pick(state.pieces);
    } catch (err) {
      return this.revealFailed(round, err.message);
    }

    const fileOf = a => (state.borders || !a.file_tight ? a.file : a.file_tight);
    const files = [...new Set([...picks.values()].map(fileOf))];
    let done = 0;
    this.progress = { k: 'loadingN', v: { d: 0, n: files.length } };
    this.changed();

    const results = await Promise.allSettled(files.map(f =>
      ImageCache.load(f).then(img => {
        done++;
        if (round === state.round) { this.progress = { k: 'loadingN', v: { d: done, n: files.length } }; this.changed(); }
        return [f, img];
      })
    ));
    if (round !== state.round) return;     // player started over meanwhile

    const failed = results.filter(r => r.status === 'rejected').map(r => r.reason.message);
    if (failed.length) return this.revealFailed(round, failed.join(' · '));

    const byFile = new Map(results.map(r => r.value));
    this.revealed = new Map();
    this.revealedTight = new Map();
    for (const piece of state.pieces) {
      const asset = picks.get(piece.id);
      piece.assetId = asset.id;
      (state.borders || !asset.file_tight ? this.revealed : this.revealedTight).set(asset.id, byFile.get(fileOf(asset)));
    }
    console.log('[reveal]', state.pieces.map(p => `${p.promptId} → ${p.assetId}`).join(', '));
    await this.playReveal(round);
    if (round !== state.round) return;
    state.stage = 'revealed';
    this.progress = null;
    this.changed();
    setTimeout(() => this.el.titleInput.focus({ preventScroll: true }), 0);
  },

  // Every image is already loaded; now turn the prompts into pictures one at a time,
  // bottom layer first. Click the picture or press Space/Enter/Esc to skip.
  playReveal(round) {
    const order = state.pieces.map(p => p.id);
    const n = order.length;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || n === 0) return Promise.resolve();
    const dur = 480;                                          // one piece's pop
    const stagger = Math.max(160, Math.min(650, 3000 / n));   // whole reveal stays ~1.5–3.5 s
    const start = performance.now() + 250;
    this.anim = { progress: new Map(order.map(id => [id, 0])), skip: false };
    let lastDone = -1;
    return new Promise(resolve => {
      const tick = now => {
        if (round !== state.round || !this.anim) { this.anim = null; resolve(); return; }
        let done = 0;
        order.forEach((id, i) => {
          const e = this.anim.skip ? 1 : Math.min(1, Math.max(0, (now - start - i * stagger) / dur));
          this.anim.progress.set(id, e);
          if (e >= 1) done++;
        });
        if (done !== lastDone) {
          lastDone = done;
          this.progress = { k: 'revealingN', v: { d: done, n } };
          this.sync();
        }
        redraw();
        if (done === n) { this.anim = null; resolve(); }
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  },

  skipReveal() {
    if (this.anim) this.anim.skip = true;
  },

  // White border on/off (title screen). Loads the other image set for this round on first use.
  async setBorders(on) {
    if (state.stage !== 'revealed' || on === state.borders) return;
    const s = state.submission.status;
    if (s === 'sending' || s === 'sent') return;           // the archived picture is fixed
    const round = state.round;
    const token = ++this.borderToken;
    const target = on ? this.revealed : this.revealedTight;
    const missing = state.pieces.map(p => Library.assetById.get(p.assetId)).filter(a => a && !target.has(a.id));
    if (missing.length) {
      this.el.borderToggle.disabled = true;
      try {
        const imgs = await Promise.all(missing.map(a => ImageCache.load(on ? a.file : (a.file_tight || a.file))));
        missing.forEach((a, i) => target.set(a.id, imgs[i]));
      } catch (err) {
        if (round === state.round) this.flash(t('saveFailed', { msg: err.message }));
        this.el.borderToggle.disabled = false;
        return;
      }
    }
    if (round !== state.round || token !== this.borderToken) return;
    state.borders = on;
    saveBorderPref(on);
    this.changed();
  },

  currentImages() {
    return state.borders ? this.revealed : this.revealedTight;
  },

  revealFailed(round, message) {
    if (round !== state.round) return;
    for (const p of state.pieces) p.assetId = null;
    this.revealed = new Map();
    this.revealedTight = new Map();
    state.stage = 'arrange';
    state.revealError = { k: 'revealFailed', v: { msg: message } };
    this.progress = null;
    this.changed();
  },

  // ---------- title / export / restart ----------
  renderOptions(ui) {
    const bg = state.backgroundId ? Library.backgroundById.get(state.backgroundId) : null;
    let statusText = '';
    if (state.useBackground && bg && !this.bgImage) statusText = this.bgError ? t('sceneFailed') : t('loadingScene');
    if (state.stage === 'arrange' && state.pieces.length === 0 && !statusText) statusText = t('addPrompt');
    if (state.stage === 'revealing') statusText = '';
    return {
      backgroundImage: this.bgImage,
      useBackground: state.useBackground,
      pieces: state.pieces,
      labels: new Map(Library.prompts.map(p => [p.id, I18n.pick(p, 'label')])),
      revealed: state.stage === 'revealed' || !!this.anim,
      progress: this.anim ? this.anim.progress : null,
      images: this.currentImages(),
      selectedId: state.stage === 'arrange' ? state.selectedPieceId : null,
      ui,
      statusText
    };
  },

  async savePNG() {
    if (state.stage !== 'revealed') return;
    try {
      await Collage.ensureFonts(state.title || t('untitled'));
      const blob = await Collage.exportBlob(this.renderOptions(1), state.title);
      const slug = (state.title.trim() || 'untitled').toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'untitled';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blind-collage-${slug}.png`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) {
      this.flash(t('saveFailed', { msg: err.message }));
      console.error(err);
    }
  },

  // Layout record: everything needed to rebuild the picture (see replay.html).
  layoutRecord() {
    return {
      version: 1,
      title: state.title.trim(),
      backgroundId: state.backgroundId,
      useBackground: state.useBackground,
      borders: state.borders,
      lang: I18n.lang,
      canvas: { width: LOGICAL_W, height: LOGICAL_H },
      pieces: state.pieces.map(p => ({
        promptId: p.promptId,
        assetId: p.assetId,
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        width: Math.round(p.width * 10) / 10,
        height: Math.round(p.height * 10) / 10,
        rotationDeg: Math.round(p.rotation * 180 / Math.PI * 100) / 100
      }))
    };
  },

  async submit() {
    const url = window.CONFIG && CONFIG.submitUrl;
    const sub = state.submission;
    if (!url || state.stage !== 'revealed' || sub.status === 'sending' || sub.status === 'sent') return;
    const round = state.round;
    // One id per round, reused on retry so the archive never stores a picture twice.
    if (!sub.id) {
      const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      sub.id = `bc-${d}-${Math.random().toString(36).slice(2, 10)}`;
    }
    state.submission = { status: 'sending', id: sub.id, message: { k: 'sending' } };
    this.sync();
    try {
      await Collage.ensureFonts(state.title || t('untitled'));
      const blob = await Collage.exportBlob(this.renderOptions(1), state.title);
      const png = await blobToBase64(blob);
      const payload = { ...this.layoutRecord(), id: sub.id, submittedAt: new Date().toISOString(), png };
      // text/plain keeps this a "simple" CORS request (no preflight), which Apps Script requires.
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      const out = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
      if (round !== state.round) return;
      if (!out.ok) throw new Error(out.error || 'Unknown error');
      state.submission = { status: 'sent', id: sub.id, message: { k: 'submittedMsg', v: { id: sub.id } } };
    } catch (err) {
      if (round !== state.round) return;
      console.error('[submit]', err);
      state.submission = { status: 'error', id: sub.id, message: { k: 'submitFailed', v: { msg: err.message } } };
    }
    this.sync();
  },

  startOver() {
    state.round++;
    state.submission = { status: 'idle', id: '', message: null };
    state.stage = 'intro';
    state.pieces = [];
    state.selectedPieceId = null;
    state.title = '';
    state.revealError = null;
    this.revealed = new Map();
    this.revealedTight = new Map();
    this.progress = null;
    this.el.titleInput.value = '';
    this.showHome(true);
    this.changed();
  },

  flash(msg) {
    this.panelFull = false;
    this.el.panelMsg.textContent = msg;
    clearTimeout(this._flashT);
    this._flashT = setTimeout(() => { this.el.panelMsg.textContent = ''; }, 3500);
  },

  // ---------- UI sync ----------
  // Language switched: rebuild generated labels, then redraw once the Chinese font has loaded.
  relabel() {
    this.buildScenes();
    this.buildPrompts();
    this.el.panelMsg.textContent = '';
    this.changed();
    const sample = Library.prompts.map(p => I18n.pick(p, 'label')).join('') + t('addPrompt') + t('loadingScene');
    Collage.ensureFonts(sample).then(() => this.changed());
  },

  changed() {
    this.sync();
    if (window.layoutCanvas) window.layoutCanvas();   // resizes only if the layout changed, then redraws
  },

  sync() {
    const e = this.el;
    const st = state.stage;
    const inStudio = state.view === 'studio';
    const inLibrary = state.view === 'library';
    e.home.hidden = state.view !== 'home';
    e.studio.hidden = !inStudio;
    e.library.hidden = !inLibrary;
    e.openLibrary.hidden = state.view !== 'home' || !LibraryView.enabled();
    e.studio.classList.toggle('locked', st === 'revealing' || st === 'revealed');
    e.backToCollage.hidden = !(st === 'arrange' && state.pieces.length > 0);

    const msg = m => (m ? t(m.k, m.v) : '');
    const labels = { intro: t('stageIntro'), arrange: t('stageArrange'), revealing: t('stageRevealing'), revealed: t('stageRevealed') };
    e.stageLabel.textContent = inLibrary ? t('library') : inStudio || st === 'intro' ? labels[st] : labels[st] + t('stageScenesSuffix');
    const n = state.pieces.length;
    const guides = {
      intro: t('guideIntro'),
      arrange: n === 0 ? t('guideArrangeEmpty', { n: this.maxPieces }) : t('guideArrange'),
      revealing: t('guideRevealing'),
      revealed: t('guideRevealed')
    };
    e.guide.textContent = inLibrary ? t('guideLibrary')
      : inStudio || st === 'intro' ? guides[st] : t('guideSwitchScene');
    e.footerLeft.textContent = t('footerLeft', { n: Library.assetById.size });
    e.footerRight.textContent = st === 'revealed' ? t('theEnd') : t('footerRight');

    e.count.textContent = `${n} / ${this.maxPieces}`;
    const full = n >= this.maxPieces;
    for (const b of e.promptList.children) {
      b.disabled = st !== 'arrange' || full;
      b.draggable = !b.disabled;
    }
    if (full && st === 'arrange' && (!e.panelMsg.textContent || this.panelFull)) {
      e.panelMsg.textContent = t('maxPromptsShort', { n: this.maxPieces });
      this.panelFull = true;
    }
    if (!full && this.panelFull) { e.panelMsg.textContent = ''; this.panelFull = false; }

    const editing = st === 'arrange';
    e.toolbar.hidden = !editing;
    for (const b of e.toolbar.querySelectorAll('button')) b.disabled = !this.selected();
    e.arrange.hidden = !(editing || st === 'revealing');
    e.hint.hidden = !editing;
    e.bgToggle.textContent = state.useBackground ? t('bgOn') : t('bgOff');
    e.bgToggle.disabled = e.bgRandom.disabled = e.toScenes.disabled = !editing;
    e.reveal.disabled = !editing || n === 0;
    e.reveal.textContent = st === 'revealing' ? t('revealing') : t('revealAll');

    e.status.textContent = st === 'revealing' ? msg(this.progress) : msg(state.revealError);
    e.status.classList.toggle('error', !!state.revealError && st !== 'revealing');

    e.titleBlock.hidden = st !== 'revealed';

    const canSubmit = !!(window.CONFIG && CONFIG.submitUrl);
    const sub = state.submission;
    e.submit.hidden = e.submitNotice.hidden = !canSubmit;
    e.submit.disabled = sub.status === 'sending' || sub.status === 'sent';
    e.submit.textContent = sub.status === 'sent' ? t('submitted') : sub.status === 'sending' ? t('sending') : t('submit');
    e.titleInput.readOnly = sub.status === 'sending' || sub.status === 'sent';   // archived title stays in sync
    e.borderToggle.textContent = state.borders ? t('borderOn') : t('borderOff');
    e.borderToggle.disabled = sub.status === 'sending' || sub.status === 'sent';
    e.submitStatus.textContent = canSubmit ? msg(sub.message) : '';
    e.submitStatus.classList.toggle('error', sub.status === 'error');
  }
};

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(new Error('Could not read PNG'));
    r.readAsDataURL(blob);
  });
}

// Remember the border choice per browser (a convenience only; works without storage).
function loadBorderPref() {
  try { return localStorage.getItem('bc-borders') !== 'off'; } catch (e) { return true; }
}
function saveBorderPref(on) {
  try { localStorage.setItem('bc-borders', on ? 'on' : 'off'); } catch (e) { /* storage blocked */ }
}
