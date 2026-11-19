// replay.js — rebuild a collage PNG from a layout record (the sheet's layout_json column).

(async function () {
  const $ = id => document.getElementById(id);
  const status = msg => { $('status').textContent = msg; };
  let lastBlob = null, lastTitle = '';

  try {
    await Library.load();
  } catch (err) {
    status('LIBRARY FAILED TO LOAD: ' + err.message);
    return;
  }

  async function renderLayout(text) {
    let layout;
    try { layout = JSON.parse(text); } catch (e) { throw new Error('That is not valid JSON.'); }
    const canvas = await LayoutRenderer.render(layout);
    const blob = await new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('PNG encoding failed'))), 'image/png'));
    return { blob, title: layout.title };
  }

  $('render').addEventListener('click', async () => {
    status('RENDERING…');
    $('download').disabled = true;
    try {
      const r = await renderLayout($('layout').value.trim());
      lastBlob = r.blob; lastTitle = r.title || 'untitled';
      const out = $('out');
      if (out.src) URL.revokeObjectURL(out.src);
      out.src = URL.createObjectURL(lastBlob);
      out.hidden = false;
      $('download').disabled = false;
      status('');
    } catch (err) {
      status('COULD NOT RENDER: ' + err.message);
    }
  });

  $('download').addEventListener('click', () => {
    if (!lastBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(lastBlob);
    a.download = 'blind-collage-replay-' + lastTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '.png';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });
})();
