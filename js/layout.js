// layout.js — draw a saved layout record (sheet layout_json) back into a picture.
// Used by replay.html and the library. Needs Library (assets.js) and Collage (collage.js).

const LayoutRenderer = {
  // Returns a canvas of the finished artwork. `thumb` uses the small scene crops
  // (same framing as the full photos) so a page of thumbnails loads quickly.
  async render(layout, { scale = 1, thumb = false } = {}) {
    if (!layout || !Array.isArray(layout.pieces)) throw new Error('No "pieces" array in this layout.');
    const missing = layout.pieces.filter(p => !Library.assetById.has(p.assetId)).map(p => p.assetId);
    if (missing.length) throw new Error('Unknown asset ids (renamed or removed?): ' + missing.join(', '));
    const bg = Library.backgroundById.get(layout.backgroundId);
    if (layout.useBackground && !bg) throw new Error('Unknown background id: ' + layout.backgroundId);

    const files = layout.pieces.map(p => Library.assetById.get(p.assetId).file);
    const bgFile = layout.useBackground ? (thumb && bg.thumb ? bg.thumb : bg.file) : null;
    if (bgFile) files.push(bgFile);
    const loaded = await Promise.all(files.map(f => ImageCache.load(f)));
    await Collage.ensureFonts(layout.title || 'Untitled 无题');
    const byFile = new Map(files.map((f, i) => [f, loaded[i]]));

    const pieces = layout.pieces.map((p, i) => ({
      id: 'r' + i, promptId: p.promptId, assetId: p.assetId,
      x: p.x, y: p.y, width: p.width, height: p.height,
      rotation: (p.rotationDeg || 0) * Math.PI / 180
    }));
    const images = new Map(layout.pieces.map(p => [p.assetId, byFile.get(Library.assetById.get(p.assetId).file)]));
    return Collage.exportCanvas({
      backgroundImage: bgFile ? byFile.get(bgFile) : null,
      useBackground: !!layout.useBackground,
      pieces, labels: new Map(), revealed: true, images
    }, layout.title, scale);
  }
};
