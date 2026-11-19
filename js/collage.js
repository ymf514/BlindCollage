// collage.js — piece geometry, hit testing, rendering and PNG export.
// Everything works in a fixed 1200×900 logical space; the screen canvas is scaled.

const LOGICAL_W = 1200;
const LOGICAL_H = 900;
const TITLE_BAND = 140;          // extra height below the artwork in the exported PNG
const MIN_PIECE_W = 80;
const MAX_PIECE_W = 1100;
const COLORS = { page: '#e9e9e9', ink: '#242424', muted: '#777777', blank: '#f2f2f2' };
const FONT = "'Courier New', Courier, 'Noto Serif SC', 'Songti SC', 'STSong', 'SimSun', serif";
const FONT_WEIGHT = 300;         // Courier New has no 300 face and stays regular; Chinese gets the thin cut
const ROTATE_HANDLE = 34;        // CSS px between the top edge and the rotate handle

const Collage = {
  // Convert a logical point into the piece's unrotated local space.
  toLocal(p, x, y) {
    const dx = x - p.x, dy = y - p.y;
    const c = Math.cos(-p.rotation), s = Math.sin(-p.rotation);
    return { x: dx * c - dy * s, y: dx * s + dy * c };
  },

  // Top-most piece under the point (array order = layer order).
  hitTest(pieces, x, y) {
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i], l = this.toLocal(p, x, y);
      if (Math.abs(l.x) <= p.width / 2 && Math.abs(l.y) <= p.height / 2) return p;
    }
    return null;
  },

  // Is the point on one of the piece's four corner handles?
  hitHandle(p, x, y, tol) {
    const l = this.toLocal(p, x, y);
    return Math.abs(Math.abs(l.x) - p.width / 2) <= tol &&
           Math.abs(Math.abs(l.y) - p.height / 2) <= tol;
  },

  // Rotate handle: a small circle above the middle of the top edge (in local space).
  rotateHandleLocal(p, ui) {
    return { x: 0, y: -p.height / 2 - ROTATE_HANDLE * ui };
  },

  hitRotateHandle(p, x, y, tol, ui) {
    const l = this.toLocal(p, x, y), h = this.rotateHandleLocal(p, ui);
    return Math.hypot(l.x - h.x, l.y - h.y) <= tol;
  },

  // Uniform resize that keeps the aspect ratio.
  resize(p, newWidth) {
    const w = Math.min(MAX_PIECE_W, Math.max(MIN_PIECE_W, newWidth));
    p.height *= w / p.width;
    p.width = w;
  },

  source(img) {
    return img ? (img.canvas || img.elt || img) : null;
  },

  drawCover(ctx, img, w, h) {
    const src = this.source(img);
    const f = Math.max(w / img.width, h / img.height);
    const dw = img.width * f, dh = img.height * f;
    ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
  },

  // Contain the image inside the piece box (already translated/rotated).
  drawContain(ctx, img, p) {
    const src = this.source(img);
    const f = Math.min(p.width / img.width, p.height / img.height);
    const dw = img.width * f, dh = img.height * f;
    ctx.drawImage(src, -dw / 2, -dh / 2, dw, dh);
  },

  // Word wrap for Latin text; character wrap for Chinese/Japanese (no spaces between words).
  wrapLines(ctx, text, maxW) {
    const CJK = '\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F';
    const tokens = String(text).match(new RegExp(`[${CJK}]|[^\\s${CJK}]+|\\s+`, 'g')) || [];
    const noLineStart = /^[，。、！？；：）」』》…—,.!?;:)]/;     // keep closing punctuation on the previous line
    const lines = [];
    let line = '';
    for (const tok of tokens) {
      if (/^\s+$/.test(tok)) { if (line) line += ' '; continue; }
      const test = line + tok;
      if (!line.trim() || ctx.measureText(test).width <= maxW || noLineStart.test(tok)) line = test;
      else { lines.push(line.trimEnd()); line = tok; }
    }
    if (line.trim()) lines.push(line.trimEnd());
    return lines;
  },

  // Canvas can only draw a web font that is already loaded; call before drawing new text.
  ensureFonts(text) {
    if (!document.fonts || !text) return Promise.resolve();
    return document.fonts.load(`${FONT_WEIGHT} 24px ${FONT}`, String(text)).catch(() => {});
  },

  drawPlaceholder(ctx, p, label, selected, ui) {
    const w = p.width, h = p.height;
    ctx.fillStyle = 'rgba(242, 242, 242, 0.94)';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1.2 * ui;
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    // Prompt text, wrapped and shrunk until it fits the box.
    const pad = Math.max(10, Math.min(w, h) * 0.09);
    let size = Math.max(12, Math.min(32, Math.min(w, h * 1.5) / 10));
    let lines;
    for (;;) {
      ctx.font = `${FONT_WEIGHT} ${size}px ${FONT}`;
      lines = this.wrapLines(ctx, label, w - pad * 2);
      const widest = Math.max(...lines.map(l => ctx.measureText(l).width));
      if ((lines.length * size * 1.25 <= h - pad * 2 && widest <= w - pad * 2) || size <= 8) break;
      size -= 1;
    }
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lh = size * 1.25;
    const top = -((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => ctx.fillText(l, 0, top + i * lh));

    if (selected) {
      const s = 9 * ui;
      ctx.fillStyle = COLORS.ink;
      for (const [cx, cy] of [[-w / 2, -h / 2], [w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2]]) {
        ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
      }
      ctx.strokeStyle = COLORS.muted;
      ctx.lineWidth = 1 * ui;
      ctx.strokeRect(-w / 2 - 6 * ui, -h / 2 - 6 * ui, w + 12 * ui, h + 12 * ui);

      // rotate handle
      // rotate handle: dark dot with a light ring so it reads on any photo
      const rh = this.rotateHandleLocal(p, ui);
      ctx.beginPath();
      ctx.moveTo(0, -h / 2 - 6 * ui);
      ctx.lineTo(0, rh.y + 9 * ui);
      ctx.strokeStyle = '#f2f2f2';
      ctx.lineWidth = 3.5 * ui;
      ctx.stroke();
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 1.4 * ui;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rh.x, rh.y, 9 * ui, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.ink;
      ctx.fill();
      ctx.strokeStyle = '#f2f2f2';
      ctx.lineWidth = 2.5 * ui;
      ctx.stroke();
    }
  },

  // opts: { backgroundImage, useBackground, pieces, labels(Map promptId->label),
  //         revealed, images(Map assetId->img), selectedId, ui, statusText }
  render(ctx, opts) {
    const ui = opts.ui || 1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, LOGICAL_W, LOGICAL_H);
    ctx.clip();

    ctx.fillStyle = COLORS.blank;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    if (opts.useBackground && opts.backgroundImage) {
      this.drawCover(ctx, opts.backgroundImage, LOGICAL_W, LOGICAL_H);
    }

    for (const p of opts.pieces) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      const img = opts.revealed && p.assetId ? opts.images.get(p.assetId) : null;
      const label = opts.labels.get(p.promptId) || p.promptId;
      // e: 0 = still a prompt, 1 = fully revealed (opts.progress only exists while the reveal plays)
      const e = !img ? 0 : opts.progress ? (opts.progress.get(p.id) ?? 1) : 1;
      if (e >= 1) {
        this.drawContain(ctx, img, p);
      } else if (e <= 0) {
        this.drawPlaceholder(ctx, p, label, p.id === opts.selectedId, ui);
      } else {
        // prompt card shrinks and fades out while the cut-out pops in with a slight overshoot
        const out = Math.max(0, 1 - e * 2.2);
        if (out > 0) {
          ctx.save();
          ctx.globalAlpha = out;
          const s = 1 - 0.18 * e;
          ctx.scale(s, s);
          this.drawPlaceholder(ctx, p, label, false, ui);
          ctx.restore();
        }
        const k = easeOutBack(e);
        ctx.save();
        ctx.globalAlpha = Math.min(1, e * 1.6);
        ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
        this.drawContain(ctx, img, p);
        ctx.restore();
      }
      ctx.restore();
    }

    if (opts.statusText) {
      ctx.fillStyle = COLORS.muted;
      ctx.font = `${FONT_WEIGHT} ${14 * ui}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(opts.statusText, LOGICAL_W / 2, LOGICAL_H / 2);
    }
    ctx.restore();
  },

  // Final artwork: 1200×900 collage + a title band. No UI. `scale` < 1 makes thumbnails.
  exportCanvas(opts, title, scale = 1) {
    const c = document.createElement('canvas');
    c.width = Math.round(LOGICAL_W * scale);
    c.height = Math.round((LOGICAL_H + TITLE_BAND) * scale);
    const ctx = c.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = COLORS.page;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H + TITLE_BAND);
    this.render(ctx, { ...opts, selectedId: null, ui: 1, statusText: '' });

    const text = (title || '').trim() || (typeof t === 'function' ? t('untitled') : 'Untitled');
    let size = 34, lines;
    for (;;) {
      ctx.font = `${FONT_WEIGHT} ${size}px ${FONT}`;
      lines = this.wrapLines(ctx, text, LOGICAL_W - 140);
      if (lines.length <= 2 || size <= 18) break;
      size -= 2;
    }
    lines = lines.slice(0, 2);
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lh = size * 1.3;
    const mid = LOGICAL_H + TITLE_BAND / 2;
    lines.forEach((l, i) => ctx.fillText(l, LOGICAL_W / 2, mid + (i - (lines.length - 1) / 2) * lh));
    return c;
  },

  exportBlob(opts, title) {
    const c = this.exportCanvas(opts, title, 1);
    return new Promise((resolve, reject) => {
      c.toBlob(b => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png');
    });
  }
};

function easeOutBack(x) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
