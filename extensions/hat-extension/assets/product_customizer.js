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
          const layerId = `pc-layer-${Date.now()}-${Math.floor(Math.random()*1000)}`;

          // create wrapper which will handle pointer interactions
          const wrapper = document.createElement('div');
          wrapper.className = 'pc-layer-wrapper';
          wrapper.dataset.layerId = layerId;
          wrapper.style.left = xPercent + '%';
          wrapper.style.top = yPercent + '%';
          wrapper.style.width = '20%';

          const imgEl = document.createElement('img');
          imgEl.className = 'pc-layer-img';
          imgEl.src = src;
          imgEl.alt = alt || '';
          wrapper.appendChild(imgEl);

          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'pc-layer-delete';
          delBtn.innerText = '×';
          wrapper.appendChild(delBtn);

          const handleEl = document.createElement('div');
          handleEl.className = 'pc-layer-handle';
          wrapper.appendChild(handleEl);

          layers.appendChild(wrapper);

          // selection helper
          function selectLayer(wrap) {
            const all = layers.querySelectorAll('.pc-layer-wrapper');
            all.forEach(a => a.classList.remove('is-selected'));
            if (wrap) wrap.classList.add('is-selected');
          }

          // delete
          delBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const id = wrapper.dataset.layerId;
            wrapper.remove();
            document.dispatchEvent(new CustomEvent('pc:image-layer-removed', { detail: { layerId: id }, bubbles: true }));
          });

          // pointer-based move
          let moving = null;
          function onPointerDownMove(e) {
            if (e.button && e.button !== 0) return;
            // ignore if starting on handle or delete button
            if (e.target === handleEl || e.target === delBtn) return;
            e.preventDefault();
            selectLayer(wrapper);
            wrapper.setPointerCapture(e.pointerId);
            const rect = preview.querySelector('img')?.getBoundingClientRect();
            const startClientX = e.clientX;
            const startClientY = e.clientY;
            const startLeft = parseFloat(wrapper.style.left) || 50;
            const startTop = parseFloat(wrapper.style.top) || 50;
            moving = { pointerId: e.pointerId, startClientX, startClientY, startLeft, startTop, rect };
          }

          function onPointerMove(e) {
            if (!moving || moving.pointerId !== e.pointerId) return;
            e.preventDefault();
            const rect = moving.rect;
            if (!rect) return;
            const dx = e.clientX - moving.startClientX;
            const dy = e.clientY - moving.startClientY;
            const newLeft = ((moving.startLeft/100) * rect.width + dx) / rect.width * 100;
            const newTop = ((moving.startTop/100) * rect.height + dy) / rect.height * 100;
            wrapper.style.left = Math.max(0, Math.min(100, newLeft)) + '%';
            wrapper.style.top = Math.max(0, Math.min(100, newTop)) + '%';
          }

          function onPointerUpMove(e) {
            if (!moving || moving.pointerId !== e.pointerId) return;
            try { wrapper.releasePointerCapture(e.pointerId); } catch(_) {}
            // dispatch moved event
            const id = wrapper.dataset.layerId;
            const xPercent = parseFloat(wrapper.style.left) || 0;
            const yPercent = parseFloat(wrapper.style.top) || 0;
            document.dispatchEvent(new CustomEvent('pc:image-layer-moved', { detail: { layerId: id, xPercent, yPercent }, bubbles: true }));
            moving = null;
          }

          wrapper.addEventListener('pointerdown', onPointerDownMove);
          window.addEventListener('pointermove', onPointerMove);
          window.addEventListener('pointerup', onPointerUpMove);

          // resize via handle
          let resizing = null;
          function onPointerDownResize(e) {
            e.stopPropagation();
            e.preventDefault();
            wrapper.setPointerCapture(e.pointerId);
            const rect = preview.querySelector('img')?.getBoundingClientRect();
            const startClientX = e.clientX;
            const startWidthPercent = parseFloat(wrapper.style.width) || (wrapper.getBoundingClientRect().width / (rect ? rect.width : 1) * 100);
            resizing = { pointerId: e.pointerId, startClientX, startWidthPercent, rect };
          }

          function onPointerMoveResize(e) {
            if (!resizing || resizing.pointerId !== e.pointerId) return;
            e.preventDefault();
            const rect = resizing.rect;
            if (!rect) return;
            const dx = e.clientX - resizing.startClientX;
            const startWidthPx = resizing.startWidthPercent/100 * rect.width;
            const newWidthPx = Math.max(8, startWidthPx + dx);
            const newWidthPercent = Math.max(3, Math.min(200, newWidthPx / rect.width * 100));
            wrapper.style.width = newWidthPercent + '%';
          }

          function onPointerUpResize(e) {
            if (!resizing || resizing.pointerId !== e.pointerId) return;
            try { wrapper.releasePointerCapture(e.pointerId); } catch(_) {}
            const id = wrapper.dataset.layerId;
            const widthPercent = parseFloat(wrapper.style.width) || 0;
            document.dispatchEvent(new CustomEvent('pc:image-layer-resized', { detail: { layerId: id, widthPercent }, bubbles: true }));
            resizing = null;
          }

          handleEl.addEventListener('pointerdown', onPointerDownResize);
          window.addEventListener('pointermove', onPointerMoveResize);
          window.addEventListener('pointerup', onPointerUpResize);

          // click selects
          wrapper.addEventListener('click', (ev) => {
            ev.stopPropagation();
            selectLayer(wrapper);
          });

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
