document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('image-switcher-root');
  const preview = document.getElementById('pc-preview');
  const previewImageEl = document.getElementById('pc-preview-img');
  const exportBtn = document.getElementById('pc-export-btn');
  // No upload dropzone: thumbnails are draggable and preview accepts drops
  if (!root || !preview || !previewImageEl) return;

  const buttons = root.querySelectorAll('.pc-choice');

  // toolbar element for current selection (delete + rotate left/right)
  const toolbar = document.createElement('div');
  toolbar.className = 'pc-toolbar';
  toolbar.style.display = 'none';
  // delete button
  const tbDelete = document.createElement('button');
  tbDelete.type = 'button';
  tbDelete.title = 'Delete layer';
  tbDelete.innerHTML = '<span class="icon">×</span>';
  toolbar.appendChild(tbDelete);
  // rotate left
  const tbRotateL = document.createElement('button');
  tbRotateL.type = 'button';
  tbRotateL.title = 'Rotate left';
  tbRotateL.innerHTML = '<span class="icon">⟲</span>';
  toolbar.appendChild(tbRotateL);
  // rotate right
  const tbRotateR = document.createElement('button');
  tbRotateR.type = 'button';
  tbRotateR.title = 'Rotate right';
  tbRotateR.innerHTML = '<span class="icon">⟳</span>';
  toolbar.appendChild(tbRotateR);
  preview.appendChild(toolbar);

  let currentSelected = null;

  function showToolbarFor(wrapper) {
    if (!wrapper) { toolbar.style.display = 'none'; currentSelected = null; return; }
    currentSelected = wrapper;
    // position toolbar above the wrapper (prefer top-center)
    const previewRect = preview.querySelector('img')?.getBoundingClientRect();
    const wrapRect = wrapper.getBoundingClientRect();
    if (!previewRect) { toolbar.style.display = 'none'; return; }
    const left = Math.max(6, wrapRect.left - previewRect.left + wrapRect.width/2 - 40);
    const top = Math.max(6, wrapRect.top - previewRect.top - 40);
    toolbar.style.left = left + 'px';
    toolbar.style.top = top + 'px';
    toolbar.style.display = 'flex';
  }

  function hideToolbar() {
    toolbar.style.display = 'none';
    currentSelected = null;
  }

  // toolbar button handlers
  tbDelete.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!currentSelected) return;
    const id = currentSelected.dataset.layerId;
    currentSelected.remove();
    hideToolbar();
    document.dispatchEvent(new CustomEvent('pc:image-layer-removed', { detail: { layerId: id }, bubbles: true }));
  });

  function applyRotationTo(wrapper, rotation) {
    wrapper.dataset.rotation = String(rotation);
    wrapper.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  }

  tbRotateL.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!currentSelected) return;
    const prev = parseFloat(currentSelected.dataset.rotation || '0');
    const next = (prev - 15) % 360;
    applyRotationTo(currentSelected, next);
    document.dispatchEvent(new CustomEvent('pc:image-layer-rotated', { detail: { layerId: currentSelected.dataset.layerId, rotation: next }, bubbles: true }));
  });

  tbRotateR.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!currentSelected) return;
    const prev = parseFloat(currentSelected.dataset.rotation || '0');
    const next = (prev + 15) % 360;
    applyRotationTo(currentSelected, next);
    document.dispatchEvent(new CustomEvent('pc:image-layer-rotated', { detail: { layerId: currentSelected.dataset.layerId, rotation: next }, bubbles: true }));
  });

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

    // Get the patch height and hat height to calculate proper sizing
    const patchBtn = Array.from(buttons).find(b => (b.dataset.src === src) || (b.dataset.handle && b.dataset.handle === handle));
  const patchHeight = patchBtn?.dataset?.height ? parseFloat(patchBtn.dataset.height) : null;
  const hatHeight = previewImageEl?.dataset?.height ? parseFloat(previewImageEl.dataset.height) : null;

    // Calculate patch size based on ratio; default to 200px if heights not available
    let patchSize = 200; // default size in pixels
    if (patchHeight && hatHeight && hatHeight > 0) {
      // Calculate the ratio of patch to hat
      const heightRatio = patchHeight / hatHeight;
      // Get the preview image height and scale the patch accordingly
      const previewImage = preview.querySelector('img');
      if (previewImage) {
        const previewHeight = previewImage.clientHeight;
        patchSize = Math.round(previewHeight * heightRatio);
        // Clamp size between reasonable bounds
        patchSize = Math.max(50, Math.min(500, patchSize));
      }
    }

    const layerId = `pc-layer-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'pc-layer-wrapper';
    wrapper.dataset.layerId = layerId;
    wrapper.style.left = xPercent + '%';
    wrapper.style.top = yPercent + '%';
  // Set wrapper height based on calculated patchSize (which is height in px)
  wrapper.style.height = patchSize + 'px';
  // compute width from aspect ratio once we load the image below

    const imgEl = document.createElement('img');
    imgEl.className = 'pc-layer-img';
    imgEl.src = src;
    imgEl.alt = alt || '';
    wrapper.appendChild(imgEl);
      // Load image to get aspect ratio for proper sizing (width = height * aspectRatio)
      const tempImg = new Image();
      tempImg.onload = () => {
        const aspectRatio = tempImg.width / tempImg.height;
        wrapper.style.width = Math.round(patchSize * aspectRatio) + 'px';
      };
      tempImg.src = src;

      layers.appendChild(wrapper);

    // selection helper
    function selectLayer(wrap) {
      const all = layers.querySelectorAll('.pc-layer-wrapper');
      all.forEach(a => a.classList.remove('is-selected'));
      if (wrap) wrap.classList.add('is-selected');
      // show toolbar for this selection
      try { showToolbarFor(wrap); } catch (_) {}
    }

    // no delete/resize/rotate controls: layers are movable only

    // pointer-based move with clamping so layer stays fully inside preview
    let moving = null;
    function onPointerDownMove(e) {
      if (e.button && e.button !== 0) return;
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

    // no rotate/resize handlers; only move interactions

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
      // create ghost sized the same way final patch will be
      if (activeGhost) activeGhost.remove();
      activeGhost = document.createElement('div');
      activeGhost.className = 'pc-layer-wrapper pc-ghost';

      // attempt to size ghost based on metadata
      const ghostBtn = Array.from(buttons).find(b => (b.dataset.src === src) || (b.dataset.handle && b.dataset.handle === e.dataTransfer.getData('text/x-pc-handle')));
      const gPatchHeight = ghostBtn?.dataset?.height ? parseFloat(ghostBtn.dataset.height) : null;
  const gHatHeight = previewImageEl?.dataset?.height ? parseFloat(previewImageEl.dataset.height) : null;
      let ghostHeight = 200;
      if (gPatchHeight && gHatHeight && gHatHeight > 0) {
        const ratio = gPatchHeight / gHatHeight;
        const pImg = preview.querySelector('img');
        if (pImg) {
          const pH = pImg.clientHeight;
          ghostHeight = Math.round(Math.max(50, Math.min(500, pH * ratio)));
        }
      }

      activeGhost.style.height = ghostHeight + 'px';

      const img = document.createElement('img');
      img.className = 'pc-layer-img';
      img.src = src;
      img.style.opacity = '0.85';
      // once image loads, set width to maintain aspect ratio
      const gImg = new Image();
      gImg.onload = () => {
        const ar = gImg.width / gImg.height;
        activeGhost.style.width = Math.round(ghostHeight * ar) + 'px';
      };
      gImg.src = src;

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

  // click outside preview clears selection and hides toolbar
  document.addEventListener('click', (e) => {
    if (!preview.contains(e.target)) {
      // clear any selection
      const all = preview.querySelectorAll('.pc-layer-wrapper.is-selected');
      all.forEach(a => a.classList.remove('is-selected'));
      hideToolbar();
    }
  });

  // ESC key still clears selection and hides toolbar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePreview();
  });

  // Export PNG button handler
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      try {
        exportBtn.disabled = true;
        exportBtn.textContent = 'Exporting...';

        // Check if html2canvas is available globally, otherwise load from CDN
        let html2canvas;
        if (window.html2canvas) {
          html2canvas = window.html2canvas;
        } else {
          // Load html2canvas from CDN dynamically
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          script.async = true;
          await new Promise((resolve, reject) => {
            script.onload = () => {
              html2canvas = window.html2canvas;
              resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        // Create a temporary clone of the preview with the same styles
        const previewClone = preview.cloneNode(true);
        
        // Remove the export button from the clone
        const clonedButton = previewClone.querySelector('#pc-export-btn');
        if (clonedButton) clonedButton.remove();
        
        // Create a temporary container to hold the clone
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';
        tempContainer.style.zIndex = '-9999';
        tempContainer.appendChild(previewClone);
        document.body.appendChild(tempContainer);

        // capture the cloned preview element
        const canvas = await html2canvas(previewClone, {
          allowTaint: true,
          useCORS: true,
          backgroundColor: '#ffffff',
          scale: 2, // Higher scale for better quality
        });

        // Clean up the temporary container
        document.body.removeChild(tempContainer);

        // convert to blob and download
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `custom-hat-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          exportBtn.disabled = false;
          exportBtn.textContent = 'Export PNG';
        });
      } catch (err) {
        console.error('Export failed:', err);
        alert('Failed to export PNG. Please try again.');
        exportBtn.disabled = false;
        exportBtn.textContent = 'Export PNG';
      }
    });
  }
});

