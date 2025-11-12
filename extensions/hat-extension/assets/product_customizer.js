document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('image-switcher-root');
  const preview = document.getElementById('pc-preview');
  const previewImg = document.getElementById('pc-preview-img');
  const closeBtn = document.querySelector('.pc-preview-close');
  // No upload dropzone: thumbnails are draggable and preview accepts drops
  if (!root || !preview || !previewImg || !closeBtn) return;

  const buttons = root.querySelectorAll('.pc-choice');

  function openPreview(src, alt) {
    previewImg.src = src;
    previewImg.alt = alt || '';
    preview.classList.add('is-open');
    preview.setAttribute('aria-hidden', 'false');
    // ensure layers container exists on the preview
    let layers = preview.querySelector('.pc-layers');
    if (!layers) {
      layers = document.createElement('div');
      layers.className = 'pc-layers';
      // insert layers after the preview image so they sit on top
      preview.appendChild(layers);
    }
  }

  function closePreview() {
    preview.classList.remove('is-open');
    preview.setAttribute('aria-hidden', 'true');
  }

  // clicking a product thumbnail opens preview
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      const src = btn.dataset.src;
      const alt = btn.querySelector('img')?.alt || '';
      openPreview(src, alt);
    });
  });

  // Make product thumbnails draggable and attach dragstart
  buttons.forEach((btn, idx) => {
    btn.setAttribute('draggable', 'true');
    btn.dataset.index = btn.dataset.index || idx;
    btn.addEventListener('dragstart', (e) => {
      const src = btn.dataset.src || '';
      const handle = btn.dataset.handle || '';
      // Use custom MIME types/keys to transport structured info
      try {
        e.dataTransfer.setData('text/plain', src);
        e.dataTransfer.setData('text/x-pc-handle', handle);
        e.dataTransfer.setData('text/x-pc-index', String(btn.dataset.index));
        e.dataTransfer.effectAllowed = 'copy';
      } catch (err) {
        // Some environments restrict drag data types; fall back to plain text
        e.dataTransfer.setData('text/plain', src);
      }
      // Optionally set drag image (use the button's img if available)
      const img = btn.querySelector('img');
      if (img) {
        try { e.dataTransfer.setDragImage(img, img.width/2, img.height/2); } catch (_) {}
      }
    });
  });

  // Preview accepts drops from thumbnails
  preview.addEventListener('dragover', (e) => {
    e.preventDefault();
    preview.classList.add('is-dragover');
  });
  preview.addEventListener('dragleave', () => {
    preview.classList.remove('is-dragover');
  });
  preview.addEventListener('drop', (e) => {
    e.preventDefault();
    preview.classList.remove('is-dragover');
    const src = e.dataTransfer.getData('text/plain') || '';
    const handle = e.dataTransfer.getData('text/x-pc-handle') || '';
    const index = e.dataTransfer.getData('text/x-pc-index') || '';
    if (src) {
      // try to find the originating thumbnail to get alt text and index
      const match = Array.from(buttons).find(b => (b.dataset.src === src) || (b.dataset.handle && b.dataset.handle === handle) || (b.dataset.index && b.dataset.index === index));
      const alt = match?.querySelector('img')?.alt || '';
      openPreview(src, alt);
      // mark the corresponding thumbnail as selected
      buttons.forEach(b => b.classList.toggle('is-selected', b === match));

      // Dispatch a custom event so host can respond to the dropped image
      const ev = new CustomEvent('pc:image-dropped', { detail: { src, handle, index }, bubbles: true });
      document.dispatchEvent(ev);
      // Add the dropped image as a layered element at the drop coordinates
      try {
        const rect = preview.querySelector('img')?.getBoundingClientRect();
        if (rect) {
          const offsetX = e.clientX - rect.left;
          const offsetY = e.clientY - rect.top;
          const xPercent = Math.max(0, Math.min(1, offsetX / rect.width)) * 100;
          const yPercent = Math.max(0, Math.min(1, offsetY / rect.height)) * 100;
          const layers = preview.querySelector('.pc-layers');
          const layer = document.createElement('img');
          const layerId = `pc-layer-${Date.now()}-${Math.floor(Math.random()*1000)}`;
          layer.className = 'pc-layer';
          layer.dataset.layerId = layerId;
          layer.src = src;
          layer.alt = alt || '';
          // position using percentages so layering stays correct when preview resizes
          layer.style.left = xPercent + '%';
          layer.style.top = yPercent + '%';
          // default size (percentage of preview) - can be adjusted later
          layer.style.width = '20%';
          layers.appendChild(layer);

          const layerEvent = new CustomEvent('pc:image-layer-added', { detail: { layerId, src, handle, index, xPercent, yPercent }, bubbles: true });
          document.dispatchEvent(layerEvent);
        }
      } catch (err) {
        // non-fatal; layering is best-effort
        console.warn('Could not add image layer', err);
      }
    } else {
      // fallback: sometimes drag data is available under other types (e.g., text/html)
      const html = e.dataTransfer.getData('text/html') || '';
      const urlMatch = html.match(/src=["']?([^"'\s>]+)/);
      if (urlMatch && urlMatch[1]) {
        const fallbackSrc = urlMatch[1];
        openPreview(fallbackSrc, '');
        const ev = new CustomEvent('pc:image-dropped', { detail: { src: fallbackSrc, handle: '', index: '' }, bubbles: true });
        document.dispatchEvent(ev);
      }
    }
  });

  // keep existing preview close behavior
  closeBtn.addEventListener('click', closePreview);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePreview();
  });
});
