// sketch.js — p5.js 2.x canvas, layout scaling, pointer / wheel / keyboard / drop events.

let cnv;
let viewScale = 1;           // CSS px per logical px
let drag = null;

async function setup() {
  cnv = createCanvas(400, 300);
  cnv.parent('canvas-wrap');
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  noLoop();
  bindCanvasEvents(cnv.elt);
  window.requestRender = () => redraw();
  window.layoutCanvas = layoutCanvas;
  I18n.init();
  await Game.init();
  layoutCanvas();
}

function draw() {
  clear();
  if (!Library.data) return;
  const ctx = drawingContext;
  ctx.save();
  ctx.scale(viewScale, viewScale);
  Collage.render(ctx, Game.renderOptions(1 / viewScale));
  ctx.restore();
}

function layoutCanvas() {
  const wrap = document.getElementById('canvas-wrap');
  if (!wrap || wrap.offsetParent === null) return;   // studio hidden
  const header = document.querySelector('header.top').offsetHeight;
  const reserve = state.stage === 'revealed' ? 200 : 170;
  const maxH = Math.max(220, window.innerHeight - header - reserve);
  const w = Math.floor(Math.min(wrap.clientWidth, maxH * LOGICAL_W / LOGICAL_H));
  const h = Math.round(w * LOGICAL_H / LOGICAL_W);
  viewScale = w / LOGICAL_W;
  if (w !== width || h !== height) {
    resizeCanvas(w, h);
    // p5 2.x can drop a redraw issued in the same tick as a resize; repaint next frame too.
    requestAnimationFrame(() => redraw());
  }
  redraw();
}

function windowResized() { layoutCanvas(); }

function toLogical(ev) {
  const r = cnv.elt.getBoundingClientRect();
  return { x: (ev.clientX - r.left) / viewScale, y: (ev.clientY - r.top) / viewScale };
}

function bindCanvasEvents(el) {
  el.addEventListener('pointerdown', ev => {
    if (state.stage === 'revealing') { Game.skipReveal(); return; }
    if (state.stage !== 'arrange') return;
    const pt = toLogical(ev);
    const tol = (ev.pointerType === 'touch' ? 22 : 12) / viewScale;
    const sel = Game.selected();
    const ui = 1 / viewScale;
    if (sel && Collage.hitRotateHandle(sel, pt.x, pt.y, tol, ui)) {
      drag = { mode: 'rotate', id: sel.id, offset: sel.rotation - Math.atan2(pt.y - sel.y, pt.x - sel.x) };
    } else if (sel && Collage.hitHandle(sel, pt.x, pt.y, tol)) {
      drag = { mode: 'scale', id: sel.id, startDist: Math.max(1, Math.hypot(pt.x - sel.x, pt.y - sel.y)), startW: sel.width };
    } else {
      const hit = Collage.hitTest(state.pieces, pt.x, pt.y);
      state.selectedPieceId = hit ? hit.id : null;     // selecting does NOT change layer order
      drag = hit ? { mode: 'move', id: hit.id, dx: pt.x - hit.x, dy: pt.y - hit.y } : null;
    }
    if (drag) el.setPointerCapture(ev.pointerId);
    ev.preventDefault();
    Game.changed();
  });

  el.addEventListener('pointermove', ev => {
    if (state.stage !== 'arrange') { el.style.cursor = 'default'; return; }
    const pt = toLogical(ev);
    if (!drag) {
      const sel = Game.selected();
      if (sel && Collage.hitRotateHandle(sel, pt.x, pt.y, 12 / viewScale, 1 / viewScale)) el.style.cursor = 'grab';
      else if (sel && Collage.hitHandle(sel, pt.x, pt.y, 12 / viewScale)) el.style.cursor = 'nwse-resize';
      else el.style.cursor = Collage.hitTest(state.pieces, pt.x, pt.y) ? 'move' : 'default';
      return;
    }
    const p = state.pieces.find(q => q.id === drag.id);
    if (!p) { drag = null; return; }
    if (drag.mode === 'move') {
      p.x = Math.min(LOGICAL_W, Math.max(0, pt.x - drag.dx));
      p.y = Math.min(LOGICAL_H, Math.max(0, pt.y - drag.dy));
    } else if (drag.mode === 'rotate') {
      let a = Math.atan2(pt.y - p.y, pt.x - p.x) + drag.offset;
      if (ev.shiftKey) a = Math.round(a / (Math.PI / 12)) * (Math.PI / 12);   // 15° steps
      p.rotation = a;
    } else {
      const d = Math.hypot(pt.x - p.x, pt.y - p.y);
      Collage.resize(p, drag.startW * d / drag.startDist);
    }
    redraw();
  });

  const end = () => { drag = null; };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);

  el.addEventListener('wheel', ev => {
    if (state.stage !== 'arrange') return;
    const pt = toLogical(ev);
    const hit = Collage.hitTest(state.pieces, pt.x, pt.y);
    if (!hit) return;
    ev.preventDefault();
    state.selectedPieceId = hit.id;
    Game.scale(hit.id, ev.deltaY > 0 ? 0.93 : 1.07);
  }, { passive: false });

  // Drag a prompt from the panel straight onto the canvas.
  el.addEventListener('dragover', ev => {
    if (state.stage === 'arrange') { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; }
  });
  el.addEventListener('drop', ev => {
    if (state.stage !== 'arrange') return;
    ev.preventDefault();
    const id = ev.dataTransfer.getData('text/plain');
    if (!Library.promptById.has(id)) return;
    const pt = toLogical(ev);
    Game.addPiece(id, pt.x, pt.y);
  });
}

document.addEventListener('keydown', ev => {
  if (state.stage === 'revealing' && [' ', 'Enter', 'Escape'].includes(ev.key)) { ev.preventDefault(); Game.skipReveal(); return; }
  if (state.stage !== 'arrange' || state.view !== 'studio') return;
  const t = ev.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  const p = Game.selected();
  if (ev.key === 'Escape') { state.selectedPieceId = null; Game.changed(); return; }
  if (!p) return;
  const k = ev.key.toLowerCase();
  if (k === 'q') Game.rotate(p.id, -10);
  else if (k === 'e') Game.rotate(p.id, 10);
  else if (ev.key === '[') Game.moveLayer(p.id, -1);
  else if (ev.key === ']') Game.moveLayer(p.id, 1);
  else if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); Game.removePiece(p.id); }
});
