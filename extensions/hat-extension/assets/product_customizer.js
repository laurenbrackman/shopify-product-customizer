document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('image-switcher-root');
  const preview = document.getElementById('pc-preview');
  const previewImg = document.getElementById('pc-preview-img');
  const closeBtn = document.querySelector('.pc-preview-close');
  // No upload dropzone: thumbnails are draggable and preview accepts drops
  if (!root || !preview || !previewImg || !closeBtn) return;

  const buttons = root.querySelectorAll('.pc-choice');

  function openPreview() {
    // ensure layers container exists on the preview (product image stays as base)
    let layers = preview.querySelector('.pc-layers');
    if (!layers) {
      layers = document.createElement('div');
      layers.className = 'pc-layers';
      // insert layers after the preview image so they sit on top
      preview.appendChild(layers);
    }
  }

  function closePreview() {
    // preview stays visible with base product image; optionally hide layers
  }

  // clicking a product thumbnail selects it (but doesn't change preview image)
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
    });
  });

  // Create a layered image at percent coordinates (xPercent, yPercent)
  function createLayerAt(xPercent, yPercent, src, alt, handle, index) {
    const layers = preview.querySelector('.pc-layers') || (() => {
      const el = document.createElement('div'); el.className = 'pc-layers'; preview.appendChild(el); return el;
    })();

    const layerId = `pc-layer-${Date.now()}-${Math.floor(Math.random()*1000)}`;
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

    // pointer-based move with clamping so layer stays fully inside preview
    let moving = null;
    function onPointerDownMove(e) {
      if (e.button && e.button !== 0) return;
      if (e.target === handleEl || e.target === delBtn) return;
      e.preventDefault();
      selectLayer(wrapper);
      wrapper.setPointerCapture(e.pointerId);
      const rect = preview.querySelector('img')?.getBoundingClientRect();
      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const startLeft = parseFloat(wrapper.style.left) || 50;
      const startTop = parseFloat(wrapper.style.top) || 50;
      const wrapperRect = wrapper.getBoundingClientRect();
      moving = { pointerId: e.pointerId, startClientX, startClientY, startLeft, startTop, rect, wrapperRect };
    }

    function onPointerMove(e) {
      if (!moving || moving.pointerId !== e.pointerId) return;
      e.preventDefault();
      const rect = moving.rect;
      if (!rect) return;
      const dx = e.clientX - moving.startClientX;
      const dy = e.clientY - moving.startClientY;

      // compute new center position in pixels
      const startLeftPx = (moving.startLeft/100) * rect.width;
      const startTopPx = (moving.startTop/100) * rect.height;
      let newLeftPx = startLeftPx + dx;
      let newTopPx = startTopPx + dy;

      // compute half size of wrapper so we keep it fully inside
      const wrapperWidth = moving.wrapperRect.width;
      const wrapperHeight = moving.wrapperRect.height;
      const halfW = wrapperWidth / 2;
      const halfH = wrapperHeight / 2;

      // clamp to preview rect
      newLeftPx = Math.max(halfW, Math.min(rect.width - halfW, newLeftPx));
      newTopPx = Math.max(halfH, Math.min(rect.height - halfH, newTopPx));

      // convert back to percent
      const newLeftPercent = (newLeftPx / rect.width) * 100;
      const newTopPercent = (newTopPx / rect.height) * 100;
      wrapper.style.left = newLeftPercent + '%';
      wrapper.style.top = newTopPercent + '%';
    }

    function onPointerUpMove(e) {
      if (!moving || moving.pointerId !== e.pointerId) return;
      try { wrapper.releasePointerCapture(e.pointerId); } catch(_) {}
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

    document.dispatchEvent(new CustomEvent('pc:image-layer-added', { detail: { layerId, src, handle, index, xPercent, yPercent }, bubbles: true }));
    return wrapper;
  }

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
  // active ghost while dragging into preview
  let activeGhost = null;
  let activeDragSrc = null;
  let activeDragHandle = null;
  let activeDragIndex = null;

  preview.addEventListener('dragover', (e) => {
    e.preventDefault();
    preview.classList.add('is-dragover');

    // show a live ghost image that follows the cursor but stays inside preview bounds
    const src = e.dataTransfer.getData('text/plain') || '';
    if (!src) return;

    // ensure layers container exists
    let layers = preview.querySelector('.pc-layers');
    if (!layers) {
      layers = document.createElement('div');
      layers.className = 'pc-layers';
      preview.appendChild(layers);
    }

    if (!activeGhost || activeDragSrc !== src) {
      // create ghost
      if (activeGhost) activeGhost.remove();
      activeGhost = document.createElement('div');
      activeGhost.className = 'pc-layer-wrapper pc-ghost';
      activeGhost.style.width = '20%';
      const img = document.createElement('img');
      img.className = 'pc-layer-img';
      img.src = src;
      img.style.opacity = '0.85';
      activeGhost.appendChild(img);
      layers.appendChild(activeGhost);
      activeDragSrc = src;
      activeDragHandle = e.dataTransfer.getData('text/x-pc-handle') || '';
      activeDragIndex = e.dataTransfer.getData('text/x-pc-index') || '';
    }

    // position ghost
    const rect = preview.querySelector('img')?.getBoundingClientRect();
    if (!rect) return;
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const xPercent = Math.max(0, Math.min(1, offsetX / rect.width)) * 100;
    const yPercent = Math.max(0, Math.min(1, offsetY / rect.height)) * 100;
    activeGhost.style.left = xPercent + '%';
    activeGhost.style.top = yPercent + '%';
    return;
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
      // try to find the originating thumbnail to get alt text
      const match = Array.from(buttons).find(b => (b.dataset.src === src) || (b.dataset.handle && b.dataset.handle === handle) || (b.dataset.index && b.dataset.index === index));
      const alt = match?.querySelector('img')?.alt || '';
      // mark the corresponding thumbnail as selected
      buttons.forEach(b => b.classList.toggle('is-selected', b === match));

      // Dispatch a custom event so host can respond to the dropped image
      const ev = new CustomEvent('pc:image-dropped', { detail: { src, handle, index }, bubbles: true });
      document.dispatchEvent(ev);

      // finalize layer creation: prefer ghost position if available
      try {
        let xPercent = null;
        let yPercent = null;
        const rect = preview.querySelector('img')?.getBoundingClientRect();
        if (activeGhost) {
          xPercent = parseFloat(activeGhost.style.left) || 50;
          yPercent = parseFloat(activeGhost.style.top) || 50;
        } else if (rect) {
          const offsetX = e.clientX - rect.left;
          const offsetY = e.clientY - rect.top;
          xPercent = Math.max(0, Math.min(1, offsetX / rect.width)) * 100;
          yPercent = Math.max(0, Math.min(1, offsetY / rect.height)) * 100;
        }

        // remove ghost if present
        if (activeGhost) { activeGhost.remove(); activeGhost = null; activeDragSrc = null; activeDragHandle = null; activeDragIndex = null; }

        if (xPercent !== null && yPercent !== null) {
          // create the real layer at xPercent/yPercent (product image stays as base)
          createLayerAt(xPercent, yPercent, src, alt, handle, index);
        }
      } catch (err) {
        console.warn('Could not add image layer', err);
      }
    } else {
      // fallback: sometimes drag data is available under other types (e.g., text/html)
      const html = e.dataTransfer.getData('text/html') || '';
      const urlMatch = html.match(/src=["']?([^"'\s>]+)/);
      if (urlMatch && urlMatch[1]) {
        const fallbackSrc = urlMatch[1];
        const ev = new CustomEvent('pc:image-dropped', { detail: { src: fallbackSrc, handle: '', index: '' }, bubbles: true });
        document.dispatchEvent(ev);
      }
    }
  });

  // cleanup ghost on global dragend (in case drag is cancelled)
  window.addEventListener('dragend', () => {
    if (activeGhost) { activeGhost.remove(); activeGhost = null; activeDragSrc = null; activeDragHandle = null; activeDragIndex = null; }
    preview.classList.remove('is-dragover');
  });

  // keep existing preview close behavior
  closeBtn.addEventListener('click', closePreview);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePreview();
  });
});
