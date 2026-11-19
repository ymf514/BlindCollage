/**
 * Blind Collage — submission archive (Google Apps Script web app).
 *
 * Each submission becomes:
 *   - one PNG in a Drive folder ("Blind Collage Submissions", created on first use, private to you)
 *   - one row in the "Submissions" sheet of the spreadsheet this script is bound to
 *     (title, scene, prompt → image mapping, full layout JSON, link to the PNG)
 *
 * Setup: see README.md → "Saving submissions".
 * Nothing personal is collected: no name, email, IP or user agent.
 */

const SHEET_NAME = 'Submissions';
const FOLDER_NAME = 'Blind Collage Submissions';
const MAX_PNG_BYTES = 8 * 1024 * 1024;   // 8 MB safety cap
const MAX_PIECES = 20;
const LIST_LIMIT = 300;                  // newest N shown in the site's library
const HEADERS = [
  'received_at', 'submission_id', 'title', 'background', 'background_on',
  'piece_count', 'prompts → images', 'layout_json', 'png_url', 'png_file_id', 'hide'
];
// Put anything (e.g. TRUE / x) in the "hide" column to remove a picture from the public library.

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  if (action === 'list') return json_(listSubmissions_());
  return json_({ ok: true, service: 'blind-collage-archive' });
}

/** Newest-first list of layouts for the site's library (no PNGs, no Drive links). */
function listSubmissions_() {
  const sheet = getSheet_();
  const n = sheet.getLastRow() - 1;
  if (n < 1) return { ok: true, items: [] };
  const values = sheet.getRange(2, 1, n, HEADERS.length).getValues();
  const items = [];
  for (let i = values.length - 1; i >= 0 && items.length < LIST_LIMIT; i--) {
    const r = values[i];
    if (r[10] !== '' && r[10] !== false) continue;          // hidden by the author
    let layout;
    try { layout = JSON.parse(r[7]); } catch (err) { continue; }
    items.push({
      id: r[1],
      receivedAt: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      title: String(r[2]).replace(/^'/, ''),
      layout: layout
    });
  }
  return { ok: true, items: items };
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const layout = validate_(body);

    lock.waitLock(20000);
    const sheet = getSheet_();

    // Idempotent: the same submission_id is only stored once (e.g. a retried request).
    const existing = findRow_(sheet, layout.id);
    if (existing) return json_({ ok: true, id: layout.id, duplicate: true, pngUrl: existing.pngUrl });

    const bytes = Utilities.base64Decode(body.png);
    if (bytes.length > MAX_PNG_BYTES) throw new Error('PNG too large');
    if (!(bytes[0] === -119 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71)) {   // \x89PNG
      throw new Error('Not a PNG');
    }
    const blob = Utilities.newBlob(bytes, 'image/png', layout.id + '.png');
    const file = getFolder_().createFile(blob);
    file.setDescription(layout.title || 'Untitled');

    sheet.appendRow([
      new Date(),
      layout.id,
      cell_(layout.title || 'Untitled'),
      layout.backgroundId,
      layout.useBackground,
      layout.pieces.length,
      layout.pieces.map(function (p) { return p.promptId + ' → ' + p.assetId; }).join('\n'),
      JSON.stringify(layout),
      file.getUrl(),
      file.getId(),
      ''
    ]);
    return json_({ ok: true, id: layout.id, pngUrl: file.getUrl() });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

/** Checks the payload and returns the layout object that goes into the sheet (no PNG). */
function validate_(b) {
  if (b.version !== 1) throw new Error('Unsupported version');
  if (typeof b.id !== 'string' || !/^bc-[a-z0-9-]{6,60}$/.test(b.id)) throw new Error('Bad id');
  if (typeof b.png !== 'string' || b.png.length < 100) throw new Error('Missing PNG');
  if (!Array.isArray(b.pieces) || b.pieces.length < 1 || b.pieces.length > MAX_PIECES) throw new Error('Bad pieces');
  const num = function (v) { if (typeof v !== 'number' || !isFinite(v)) throw new Error('Bad number'); return v; };
  const str = function (v, max) { return String(v == null ? '' : v).slice(0, max); };
  return {
    version: 1,
    id: b.id,
    submittedAt: str(b.submittedAt, 40),
    title: str(b.title, 120).trim(),
    backgroundId: str(b.backgroundId, 60),
    useBackground: !!b.useBackground,
    lang: b.lang === 'zh' ? 'zh' : 'en',
    borders: b.borders !== false,
    canvas: { width: 1200, height: 900 },
    pieces: b.pieces.map(function (p) {
      return {
        promptId: str(p.promptId, 40),
        assetId: str(p.assetId, 80),
        x: num(p.x), y: num(p.y), width: num(p.width), height: num(p.height),
        rotationDeg: num(p.rotationDeg)
      };
    })
  };
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  } else if (sheet.getRange(1, HEADERS.length).getValue() !== HEADERS[HEADERS.length - 1]) {
    sheet.getRange(1, HEADERS.length).setValue(HEADERS[HEADERS.length - 1]);   // sheets made by v1 of this script
  }
  return sheet;
}

function getFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (ignored) { /* folder deleted: recreate */ }
  }
  const folder = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

function findRow_(sheet, id) {
  const n = sheet.getLastRow() - 1;
  if (n < 1) return null;
  const ids = sheet.getRange(2, 2, n, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) return { pngUrl: sheet.getRange(i + 2, 9).getValue() };
  }
  return null;
}

/** Stop user text that starts with = + - @ from being read as a spreadsheet formula. */
function cell_(text) {
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Run once from the editor to grant Drive/Sheets permission and create the sheet + folder. */
function setup() {
  getSheet_();
  const folder = getFolder_();
  Logger.log('Ready. Sheet "%s", Drive folder: %s', SHEET_NAME, folder.getUrl());
}
