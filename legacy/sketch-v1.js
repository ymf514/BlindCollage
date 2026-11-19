// BLIND COLLAGE — local prototype (p5.js 2.3.4)
// 10 cut-outs / 2 photo backgrounds / no additional libraries
// This is the existing silhouette-based version, before the six-prompt redesign.

const BG = '#e9e9e9';
const INK = '#242424';
const MUTED = '#777777';
const SILHOUETTE = '#34343b';
const OPENING = 'It was supposed to be a perfectly normal day, until...';

const NAMES = [
  'dumpster', 'clock', 'gumball', 'radio', 'camera',
  'shark', 'mouse', 'chicken', 'duck', 'frog'
];

let originals = [];
let shadows = [];
let backgrounds = [];
let loading = 'LOADING...';
let loadingError = '';
let ready = false;
let stage = 'intro';
let selected = [];
let pieces = [];
let activePiece = -1;
let dragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let buttons = [];
let cells = [];
let titleInput;
let useBackground = true;
let backgroundIndex = 0;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  textFont('Courier New');

  titleInput = createInput('');
  titleInput.attribute('placeholder', 'Give your collage a title...');
  titleInput.style('font-family', 'Courier New, monospace');
  titleInput.style('font-size', '14px');
  titleInput.style('text-align', 'center');
  titleInput.style('background', 'transparent');
  titleInput.style('color', INK);
  titleInput.style('border', 'none');
  titleInput.style('border-bottom', '1px solid #777');
  titleInput.style('outline', 'none');
  titleInput.hide();

  try {
    // Explicit paths were the reliable approach in the Web Editor.
    loading = 'LOADING OBJECT 01 / 12';
    originals[0] = await loadImage('assets/dumpster.png');
    loading = 'LOADING OBJECT 02 / 12';
    originals[1] = await loadImage('assets/clock.png');
    loading = 'LOADING OBJECT 03 / 12';
    originals[2] = await loadImage('assets/gumball.png');
    loading = 'LOADING OBJECT 04 / 12';
    originals[3] = await loadImage('assets/radio.png');
    loading = 'LOADING OBJECT 05 / 12';
    originals[4] = await loadImage('assets/camera.png');
    loading = 'LOADING OBJECT 06 / 12';
    originals[5] = await loadImage('assets/shark.png');
    loading = 'LOADING OBJECT 07 / 12';
    originals[6] = await loadImage('assets/mouse.png');
    loading = 'LOADING OBJECT 08 / 12';
    originals[7] = await loadImage('assets/chicken.png');
    loading = 'LOADING OBJECT 09 / 12';
    originals[8] = await loadImage('assets/duck.png');
    loading = 'LOADING OBJECT 10 / 12';
    originals[9] = await loadImage('assets/frog.png');
    loading = 'LOADING BACKGROUND 11 / 12';
    backgrounds[0] = await loadImage('background/bg01.jpg');
    loading = 'LOADING BACKGROUND 12 / 12';
    backgrounds[1] = await loadImage('background/bg02.jpg');
  } catch (err) {
    loadingError = 'FAILED: ' + loading;
    console.error(loadingError, err);
    return;
  }

  loading = 'CREATING SILHOUETTES...';
  shadows = originals.map(makeSilhouette);
  backgroundIndex = floor(random(backgrounds.length));
  ready = true;
  console.log('BLIND COLLAGE: all 12 images loaded.');
}

function makeSilhouette(img) {
  const pg = createGraphics(img.width, img.height);
  pg.pixelDensity(1);
  pg.clear();
  pg.imageMode(CORNER);
  pg.image(img, 0, 0);
  const ctx = pg.drawingContext;
  ctx.save();
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = SILHOUETTE;
  ctx.fillRect(0, 0, img.width, img.height);
  ctx.restore();
  const result = pg.get();
  pg.remove();
  return result;
}

function draw() {
  background(BG);
  buttons = [];
  cells = [];
  cursor(ARROW);
  if (!ready) {
    noStroke(); fill(INK); textAlign(CENTER, CENTER); textSize(13);
    text(loadingError || loading, width / 2, height / 2);
    return;
  }
  drawHeader();
  if (stage === 'intro') drawIntro();
  if (stage === 'choose') drawChoose();
  if (stage === 'compose') drawCompose();
  if (stage === 'reveal') drawReveal();
  drawFooter();
}

function drawHeader() {
  noStroke(); fill(INK); textSize(13);
  textAlign(LEFT, TOP); text('BLIND COLLAGE', 25, 22);
  const stages = { intro: '00 / BEGIN', choose: '01 / PICK FIVE', compose: '02 / ARRANGE', reveal: '03 / REVEAL' };
  textAlign(RIGHT, TOP); text(stages[stage], width - 25, 22);
  fill(MUTED); textSize(11); textAlign(LEFT, TOP);
  text('A SMALL EXPERIMENT IN THE UNEXPECTED', 25, 45);
}
function drawFooter() {
  noStroke(); fill(MUTED); textSize(11);
  textAlign(LEFT, BOTTOM); text('RISO CUT-OUTS / DEMO', 25, height - 18);
  textAlign(RIGHT, BOTTOM);
  text(stage === 'reveal' ? 'THE END (?)' : 'NOTHING IS QUITE WHAT IT SEEMS', width - 25, height - 18);
}
function drawIntro() {
  const cx = width / 2, cy = height / 2;
  noStroke(); fill(INK); textAlign(CENTER, CENTER);
  textSize(constrain(width / 45, 16, 24));
  text(OPENING, cx, cy - 52);
  fill(MUTED); textSize(12);
  text('Pick five shapes. Make a scene. Discover what you made.', cx, cy + 32);
  addButton('BEGIN →', cx, cy + 108, () => { stage = 'choose'; });
}

function drawChoose() {
  noStroke(); fill(INK); textAlign(CENTER, CENTER); textSize(14);
  text('Choose five silhouettes without knowing what they are.', width / 2, 106);
  fill(MUTED); textSize(12);
  text(selected.length + ' / 5 SELECTED', width / 2, 138);

  const gap = min(18, width * 0.012);
  const cw = min(175, (width - 60 - gap * 4) / 5);
  const ch = max(65, min(210, (height - 335) / 2));
  const gridWidth = cw * 5 + gap * 4;
  const left = (width - gridWidth) / 2;
  const top = max(165, (height - ch * 2 - gap) / 2 - 18);

  shadows.forEach((img, i) => {
    const x = left + (i % 5) * (cw + gap);
    const y = top + floor(i / 5) * (ch + gap);
    const picked = selected.includes(i);
    if (picked) {
      noFill(); stroke(MUTED); strokeWeight(1);
      rect(x + 2, y + 2, cw - 4, ch - 4);
    }
    const factor = max(0.02, min((cw - 20) / img.width, (ch - 38) / img.height));
    imageMode(CENTER);
    image(img, x + cw / 2, y + (ch - 16) / 2, img.width * factor, img.height * factor);
    noStroke(); fill(picked ? INK : MUTED); textAlign(CENTER, CENTER); textSize(11);
    text((picked ? '* ' : '') + String(i + 1).padStart(2, '0'), x + cw / 2, y + ch - 13);
    cells.push({ x, y, w: cw, h: ch, id: i });
  });

  addTextButton(useBackground ? 'BACKGROUND: ON' : 'BACKGROUND: OFF', width / 2, height - 125, () => {
    useBackground = !useBackground;
  });
  addButton(selected.length === 5 ? 'ARRANGE →' : 'SELECT FIVE', width / 2, height - 75,
    () => { if (selected.length === 5) startComposition(); }, selected.length !== 5);
}

function compositionArea() {
  const top = 145;
  const reserved = stage === 'reveal' ? 185 : 190;
  const usableHeight = max(110, height - top - reserved);
  const usableWidth = max(140, width - 75);
  const w = min(usableWidth, usableHeight * 4 / 3);
  const h = w * 3 / 4;
  return { x: (width - w) / 2, y: top + (usableHeight - h) / 2, w, h };
}
function controlPositions() {
  const area = compositionArea();
  const base = area.y + area.h;
  return {
    bg: base + 23,
    instructions: base + 57,
    button: base + 108,
    title: base + 22,
    input: base + 38
  };
}
function startComposition() {
  const area = compositionArea();
  backgroundIndex = floor(random(backgrounds.length));
  pieces = selected.map((id, i) => {
    const img = originals[id];
    const factor = min(area.w * 0.22 / img.width, area.h * 0.30 / img.height);
    return {
      id,
      x: area.x + area.w * (0.2 + (i % 3) * 0.29),
      y: area.y + area.h * (i < 3 ? 0.33 : 0.70),
      w: img.width * factor, h: img.height * factor, angle: 0
    };
  });
  activePiece = -1; dragging = false; stage = 'compose';
}
function drawOpening() {
  noStroke(); fill(MUTED); textAlign(CENTER, CENTER); textSize(13);
  text(OPENING, width / 2, 105);
}
function coverImage(target, area, img) {
  if (!img) return;
  const factor = max(area.w / img.width, area.h / img.height);
  const w = img.width * factor, h = img.height * factor;
  const x = area.x + (area.w - w) / 2;
  const y = area.y + (area.h - h) / 2;
  const ctx = target.drawingContext;
  ctx.save(); ctx.beginPath(); ctx.rect(area.x, area.y, area.w, area.h); ctx.clip();
  ctx.drawImage(img.canvas, x, y, w, h);
  ctx.restore();
}
function drawCollageBackground() {
  if (useBackground) coverImage(this, compositionArea(), backgrounds[backgroundIndex]);
}
function drawPieces(revealed) {
  const area = compositionArea();
  const ctx = drawingContext;
  ctx.save(); ctx.beginPath(); ctx.rect(area.x, area.y, area.w, area.h); ctx.clip();
  pieces.forEach((p, i) => {
    const img = revealed ? originals[p.id] : shadows[p.id];
    push(); translate(p.x, p.y); rotate(p.angle); imageMode(CENTER);
    image(img, 0, 0, p.w, p.h);
    if (!revealed && i === activePiece) {
      noFill(); stroke('#888888'); strokeWeight(1); rectMode(CENTER);
      rect(0, 0, p.w + 12, p.h + 12);
    }
    pop();
  });
  ctx.restore();
}
function randomizeBackground() {
  if (backgrounds.length < 2) return;
  backgroundIndex = (backgroundIndex + floor(random(1, backgrounds.length))) % backgrounds.length;
}
function drawBackgroundControls() {
  const pos = controlPositions();
  addTextButton(useBackground ? 'BACKGROUND: ON' : 'BACKGROUND: OFF', width / 2 - 95, pos.bg,
    () => { useBackground = !useBackground; });
  addTextButton('RANDOMIZE ↻', width / 2 + 95, pos.bg, () => {
    useBackground = true; randomizeBackground();
  });
}
function drawCompose() {
  titleInput.hide();
  drawOpening(); drawCollageBackground(); drawPieces(false); drawBackgroundControls();
  const pos = controlPositions();
  noStroke(); fill(MUTED); textAlign(CENTER, CENTER); textSize(11);
  text('DRAG TO MOVE / SCROLL TO RESIZE / Q E TO ROTATE / [ ] FOR LAYERS', width / 2, pos.instructions);
  addButton('REVEAL ALL →', width / 2, pos.button, () => {
    activePiece = -1; stage = 'reveal';
  });
}
function drawReveal() {
  drawOpening(); drawCollageBackground(); drawPieces(true);
  const pos = controlPositions();
  noStroke(); fill(MUTED); textAlign(CENTER, CENTER); textSize(12);
  text('What would you call this picture?', width / 2, pos.title);
  const inputWidth = min(410, width * 0.7);
  titleInput.show(); titleInput.position(width / 2 - inputWidth / 2, pos.input);
  titleInput.size(inputWidth, 30);
  addButton('SAVE PNG ↓', width / 2, pos.button, saveArtwork);
}

function saveArtwork() {
  const pg = createGraphics(1200, 900);
  pg.pixelDensity(1); pg.background(BG); pg.textFont('Courier New'); pg.noStroke(); pg.fill(INK);
  pg.textAlign(LEFT, TOP); pg.textSize(19); pg.text('BLIND COLLAGE', 48, 35);
  pg.textAlign(RIGHT, TOP); pg.text('AN UNEXPECTED PICTURE', 1152, 35);
  pg.textAlign(CENTER, CENTER); pg.textSize(20); pg.text(OPENING, 600, 105);
  const area = compositionArea();
  const scale = min(1040 / area.w, 620 / area.h);
  const dst = { x: 600 - area.w * scale / 2, y: 450 - area.h * scale / 2,
    w: area.w * scale, h: area.h * scale };
  if (useBackground) coverImage(pg, dst, backgrounds[backgroundIndex]);
  const ctx = pg.drawingContext;
  ctx.save(); ctx.beginPath(); ctx.rect(dst.x, dst.y, dst.w, dst.h); ctx.clip();
  pieces.forEach(p => {
    const x = dst.x + (p.x - area.x) * scale;
    const y = dst.y + (p.y - area.y) * scale;
    pg.push(); pg.translate(x, y); pg.rotate(p.angle); pg.imageMode(CENTER);
    pg.image(originals[p.id], 0, 0, p.w * scale, p.h * scale); pg.pop();
  });
  ctx.restore();
  pg.fill(INK); pg.noStroke(); pg.textAlign(CENTER, CENTER); pg.textSize(23);
  pg.text(titleInput.value().trim() || 'UNTITLED', 600, 830);
  saveCanvas(pg.canvas, 'blind-collage', 'png'); pg.remove();
}

function addButton(label, x, y, action, disabled = false) {
  textAlign(CENTER, CENTER); textSize(13);
  const w = max(145, textWidth(label) + 34), h = 38;
  const bounds = { x: x - w / 2, y: y - h / 2, w, h, action, disabled };
  if (!disabled && inside(mouseX, mouseY, bounds)) cursor(HAND);
  noFill(); stroke(disabled ? '#b4b4b4' : INK); strokeWeight(1);
  rect(bounds.x, bounds.y, w, h);
  noStroke(); fill(disabled ? '#aaaaaa' : INK); text(label, x, y + 1);
  buttons.push(bounds);
}
function addTextButton(label, x, y, action) {
  textAlign(CENTER, CENTER); textSize(11);
  const w = textWidth(label) + 20, h = 25;
  const bounds = { x: x - w / 2, y: y - h / 2, w, h, action, disabled: false };
  const hover = inside(mouseX, mouseY, bounds);
  noStroke(); fill(hover ? INK : MUTED); text(label, x, y);
  if (hover) cursor(HAND);
  buttons.push(bounds);
}
function inside(x, y, b) {
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}
function findPiece(x, y) {
  for (let i = pieces.length - 1; i >= 0; i--) {
    const p = pieces[i], dx = x - p.x, dy = y - p.y;
    const lx = dx * cos(-p.angle) - dy * sin(-p.angle);
    const ly = dx * sin(-p.angle) + dy * cos(-p.angle);
    if (abs(lx) <= p.w / 2 && abs(ly) <= p.h / 2) return i;
  }
  return -1;
}
function mousePressed() {
  const b = buttons.find(btn => !btn.disabled && inside(mouseX, mouseY, btn));
  if (b) { b.action(); return false; }
  if (stage === 'choose') {
    const cell = cells.find(c => inside(mouseX, mouseY, c));
    if (cell) {
      if (selected.includes(cell.id)) selected = selected.filter(id => id !== cell.id);
      else if (selected.length < 5) selected.push(cell.id);
      return false;
    }
  }
  if (stage === 'compose') {
    const area = compositionArea();
    if (!inside(mouseX, mouseY, area)) { activePiece = -1; return; }
    const hit = findPiece(mouseX, mouseY);
    if (hit >= 0) {
      const p = pieces.splice(hit, 1)[0]; pieces.push(p);
      activePiece = pieces.length - 1;
      dragOffsetX = mouseX - p.x; dragOffsetY = mouseY - p.y;
      dragging = true; return false;
    }
    activePiece = -1;
  }
}
function mouseDragged() {
  if (stage === 'compose' && dragging && activePiece >= 0) {
    const p = pieces[activePiece], area = compositionArea();
    p.x = constrain(mouseX - dragOffsetX, area.x, area.x + area.w);
    p.y = constrain(mouseY - dragOffsetY, area.y, area.y + area.h);
    return false;
  }
}
function mouseReleased() { dragging = false; }
function mouseWheel(event) {
  if (stage !== 'compose') return;
  const hit = findPiece(mouseX, mouseY);
  if (hit < 0) return;
  const p = pieces[hit];
  const scale = event.delta > 0 ? 0.93 : 1.07;
  const w = constrain(p.w * scale, 35, width * 0.68);
  p.h *= w / p.w; p.w = w; activePiece = hit;
  return false;
}
function keyPressed() {
  if (stage !== 'compose' || activePiece < 0) return;
  const p = pieces[activePiece];
  if (key.toLowerCase() === 'q') p.angle -= radians(10);
  if (key.toLowerCase() === 'e') p.angle += radians(10);
  if (key === '[' && activePiece > 0) {
    pieces.splice(activePiece, 1); activePiece--;
    pieces.splice(activePiece, 0, p);
  }
  if (key === ']' && activePiece < pieces.length - 1) {
    pieces.splice(activePiece, 1); activePiece++;
    pieces.splice(activePiece, 0, p);
  }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
