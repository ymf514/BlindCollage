// assets.js — library loading/validation, random picking, on-demand image loading + cache.
// data/library.json is the single source of truth for prompts, assets and scenes.

const Library = {
  data: null,
  prompts: [],
  promptById: new Map(),
  assetById: new Map(),
  pools: new Map(),          // promptId -> [asset, ...]
  backgrounds: [],
  backgroundById: new Map(),
  warnings: [],

  async load(url = 'data/library.json') {
    let res;
    try {
      res = await fetch(url, { cache: 'no-cache' });
    } catch (err) {
      throw new Error(`Could not request ${url}. Serve the folder over HTTP (not file://).`);
    }
    if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}.`);
    const data = await res.json();
    this.ingest(data);
    return data;
  },

  ingest(data) {
    this.data = data;
    this.warnings = [];
    this.prompts = Array.isArray(data.prompts) ? data.prompts : [];
    this.promptById = new Map();
    this.pools = new Map();
    for (const p of this.prompts) {
      if (this.promptById.has(p.id)) this.warnings.push(`Duplicate prompt id "${p.id}"`);
      this.promptById.set(p.id, p);
      this.pools.set(p.id, []);
    }

    this.assetById = new Map();
    for (const a of data.assets || []) {
      if (!a.id || !a.file) { this.warnings.push(`Asset without id/file: ${JSON.stringify(a)}`); continue; }
      if (this.assetById.has(a.id)) { this.warnings.push(`Duplicate asset id "${a.id}" (skipped)`); continue; }
      if (a.file.startsWith('/')) this.warnings.push(`Asset "${a.id}" uses a root path; use a relative path`);
      const tags = (a.prompts || []).filter(pid => {
        if (this.pools.has(pid)) return true;
        this.warnings.push(`Asset "${a.id}" has unknown prompt "${pid}"`);
        return false;
      });
      this.assetById.set(a.id, a);
      for (const pid of tags) this.pools.get(pid).push(a);
    }
    for (const [pid, pool] of this.pools) {
      if (pool.length === 0) this.warnings.push(`Prompt "${pid}" has no images yet`);
    }

    this.backgrounds = data.backgrounds || [];
    this.backgroundById = new Map(this.backgrounds.map(b => [b.id, b]));
    if (this.warnings.length) console.warn('[library]', this.warnings);
  },

  poolSize(promptId) {
    return (this.pools.get(promptId) || []).length;
  },

  // Returns Map(pieceId -> asset). Avoids repeating an image within one round;
  // falls back to repeats only when a pool is exhausted. Throws on empty pool.
  pick(pieces) {
    const used = new Set();
    const result = new Map();
    for (const piece of pieces) {
      const pool = this.pools.get(piece.promptId) || [];
      if (pool.length === 0) {
        const label = this.promptById.get(piece.promptId)?.label || piece.promptId;
        throw new Error(`No images are tagged for "${label}" yet.`);
      }
      let candidates = pool.filter(a => !used.has(a.id));
      if (candidates.length === 0) candidates = pool;
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      used.add(chosen.id);
      result.set(piece.id, chosen);
    }
    return result;
  }
};

// Image cache, kept separate from game state. Stores promises so concurrent
// requests for the same file share one download. Failed loads are evicted.
const ImageCache = {
  map: new Map(),

  load(file) {
    if (this.map.has(file)) return this.map.get(file);
    const promise = Promise.resolve()
      // p5.js 2.x loadImage returns a promise; pages without p5 (replay.html) use a native Image.
      .then(() => (typeof loadImage === 'function' ? loadImage(file) : nativeImage(file)))
      .then(img => {
        if (!img || !img.width) throw new Error('empty image');
        return img;
      })
      .catch(err => {
        this.map.delete(file);
        throw new Error(`Could not load ${file}`);
      });
    this.map.set(file, promise);
    return promise;
  }
};

function nativeImage(file) {
  const img = new Image();
  img.src = file;
  return img.decode().then(() => img);
}
