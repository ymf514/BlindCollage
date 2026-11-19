// library-view.js — browse pictures other people submitted.
// Fetches layouts from the Apps Script (?action=list) and redraws them locally from
// the shared assets, so no Drive file ever has to be made public.

const LibraryView = {
  PAGE: 24,
  items: null,             // fetched list (newest first)
  shown: 0,
  loading: false,
  renderQueue: Promise.resolve(),
  msg: null,               // { k, v } so it re-translates on language change
  el: {},

  init() {
    const $ = id => document.getElementById(id);
    this.el = {
      grid: $('library-grid'), count: $('library-count'), msg: $('library-msg'), more: $('library-more'),
      lightbox: $('lightbox'), art: $('lightbox-art'), caption: $('lightbox-caption')
    };
    $('open-library').addEventListener('click', () => this.open());
    $('close-library').addEventListener('click', () => Game.showHome(false));
    this.el.more.addEventListener('click', () => this.showMore());
    $('lightbox-close').addEventListener('click', () => this.closeLightbox());
    this.el.lightbox.addEventListener('click', ev => { if (ev.target === this.el.lightbox) this.closeLightbox(); });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape') this.closeLightbox(); });
    I18n.onChange(() => this.relabel());
    this.relabel();
  },

  setMsg(k, v) {
    this.msg = k ? { k, v } : null;
    this.el.msg.textContent = k ? t(k, v) : '';
  },

  relabel() {
    const n = this.items ? this.items.length : null;
    this.el.count.textContent = n === null ? t('library') : n === 1 ? t('libCountOne') : t('libCount', { n });
    this.el.msg.textContent = this.msg ? t(this.msg.k, this.msg.v) : '';
    for (const el of this.el.grid.querySelectorAll('[data-untitled]')) el.textContent = t('untitled');
  },

  enabled() {
    return !!(window.CONFIG && CONFIG.submitUrl);
  },

  async open() {
    if (!this.enabled()) return;
    state.view = 'library';
    Game.sync();
    window.scrollTo({ top: 0 });
    if (this.items || this.loading) return;     // fetched once per visit; reload the page to refresh
    await this.fetch();
  },

  async fetch() {
    this.loading = true;
    this.setMsg('libLoading');
    try {
      const url = CONFIG.submitUrl + (CONFIG.submitUrl.includes('?') ? '&' : '?') + 'action=list';
      const res = await fetch(url);
      const out = await res.json();
      if (!out.ok || !Array.isArray(out.items)) {
        throw new Error(out.error || t('libNoList'));
      }
      this.items = out.items;
      this.setMsg(this.items.length ? null : 'libEmpty');
      this.relabel();
      this.showMore();
    } catch (err) {
      console.error('[library]', err);
      this.setMsg('libFailed', { msg: err.message });
    }
    this.loading = false;
  },

  showMore() {
    const next = this.items.slice(this.shown, this.shown + this.PAGE);
    this.shown += next.length;
    next.forEach(item => this.addTile(item));
    this.el.more.hidden = this.shown >= this.items.length;
  },

  addTile(item) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'work';
    const art = document.createElement('span');
    art.className = 'art';
    const cap = document.createElement('span');
    cap.className = 'cap';
    const tt = document.createElement('span');
    tt.textContent = item.title || t('untitled');
    if (!item.title) tt.dataset.untitled = '';
    const d = document.createElement('span');
    d.className = 'muted';
    d.textContent = formatDate(item.receivedAt);
    cap.append(tt, d);
    b.append(art, cap);
    b.addEventListener('click', () => this.openLightbox(item));
    this.el.grid.append(b);

    // Render one at a time so a long page doesn't start dozens of image loads at once.
    this.renderQueue = this.renderQueue.then(async () => {
      try {
        art.append(await LayoutRenderer.render(item.layout, { scale: 0.3, thumb: true }));
      } catch (err) {
        art.textContent = t('cannotDraw', { msg: err.message });
        art.classList.add('muted');
      }
    });
  },

  async openLightbox(item) {
    this.el.art.innerHTML = '';
    this.el.caption.textContent = `“${item.title || t('untitled')}” · ${formatDate(item.receivedAt)}`;
    this.el.lightbox.hidden = false;
    try {
      this.el.art.append(await LayoutRenderer.render(item.layout, { scale: 1 }));
    } catch (err) {
      this.el.art.textContent = t('cannotDraw', { msg: err.message });
    }
  },

  closeLightbox() {
    this.el.lightbox.hidden = true;
    this.el.art.innerHTML = '';
  }
};

function formatDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toISOString().slice(0, 10);
}
