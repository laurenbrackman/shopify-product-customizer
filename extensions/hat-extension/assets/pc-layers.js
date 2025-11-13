(function(){
  function init(preview, previewImageEl, buttons, toolbar){
    if (!preview || !previewImageEl) return {};

    const { setWrapperOffset, updateLayerZIndexes, applyRotationTo } = window.PCUtils || {};
    let currentSelected = null;

    function layersEl(){
      let el = preview.querySelector('.pc-layers');
      if (!el) { el = document.createElement('div'); el.className = 'pc-layers'; preview.appendChild(el); }
      return el;
    }

    function showToolbarFor(wrapper){ if (toolbar && toolbar.showFor) toolbar.showFor(wrapper); }
    function hideToolbar(){ if (toolbar && toolbar.hide) toolbar.hide(); currentSelected = null; }

    function selectLayer(wrap){
      const all = layersEl().querySelectorAll('.pc-layer-wrapper');
      all.forEach(a => a.classList.remove('is-selected'));
      if (wrap){ wrap.classList.add('is-selected'); currentSelected = wrap; showToolbarFor(wrap); }
    }

    function createLayerAt(xPercent, yPercent, src, alt, handle, index){
      const layers = layersEl();

      const patchBtn = Array.from(buttons || []).find(b => (b.dataset.src === src) || (b.dataset.handle && b.dataset.handle === handle));
      const patchHeight = patchBtn?.dataset?.height ? parseFloat(patchBtn.dataset.height) : null;
      const hatHeight = previewImageEl?.dataset?.height ? parseFloat(previewImageEl.dataset.height) : null;

      let patchSize = 200;
      if (patchHeight && hatHeight && hatHeight > 0) {
        const heightRatio = patchHeight / hatHeight;
        const previewHeight = previewImageEl.clientHeight;
        if (previewHeight) {
          patchSize = Math.round(Math.max(50, Math.min(500, previewHeight * heightRatio)));
        }
      }

      const layerId = `pc-layer-${Date.now()}-${Math.floor(Math.random()*1000)}`;
      const wrapper = document.createElement('div');
      wrapper.className = 'pc-layer-wrapper';
      wrapper.dataset.layerId = layerId;

      const imgRect = preview.querySelector('img')?.getBoundingClientRect();
      if (imgRect) {
        const leftPx = (xPercent/100) * imgRect.width;
        const topPx = (yPercent/100) * imgRect.height;
        const offsetX = Math.round(leftPx - imgRect.width / 2);
        const offsetY = Math.round(topPx - imgRect.height / 2);
        wrapper.style.left = '50%';
        wrapper.style.top = '50%';
        setWrapperOffset && setWrapperOffset(wrapper, offsetX, offsetY);
      } else {
        wrapper.style.left = '50%';
        wrapper.style.top = '50%';
        setWrapperOffset && setWrapperOffset(wrapper, 0, 0);
      }
      wrapper.style.height = patchSize + 'px';

      const imgEl = document.createElement('img');
      imgEl.className = 'pc-layer-img';
      imgEl.src = src; imgEl.alt = alt || '';
      wrapper.appendChild(imgEl);

      const tempImg = new Image();
      tempImg.onload = () => {
        const aspectRatio = tempImg.width / tempImg.height;
        wrapper.style.width = Math.round(patchSize * aspectRatio) + 'px';
      };
      tempImg.src = src;

      layers.appendChild(wrapper);
      updateLayerZIndexes && updateLayerZIndexes(layers);

      // interactions
      let moving = null;
      function onPointerDownMove(e){
        if (e.button && e.button !== 0) return;
        e.preventDefault();
        selectLayer(wrapper);
        wrapper.setPointerCapture(e.pointerId);
        const rect = preview.querySelector('img')?.getBoundingClientRect();
        const startClientX = e.clientX;
        const startClientY = e.clientY;
        const startOffsetX = parseFloat(wrapper.dataset.offsetX || '0') || 0;
        const startOffsetY = parseFloat(wrapper.dataset.offsetY || '0') || 0;
        const wrapperRect = wrapper.getBoundingClientRect();
        moving = { pointerId: e.pointerId, startClientX, startClientY, startOffsetX, startOffsetY, rect, wrapperRect };
      }
      function onPointerMove(e){
        if (!moving || moving.pointerId !== e.pointerId) return;
        e.preventDefault();
        const rect = moving.rect; if (!rect) return;
        const dx = e.clientX - moving.startClientX;
        const dy = e.clientY - moving.startClientY;
        let newOffsetX = moving.startOffsetX + dx;
        let newOffsetY = moving.startOffsetY + dy;
        const wrapperWidth = moving.wrapperRect.width;
        const wrapperHeight = moving.wrapperRect.height;
        const halfW = wrapperWidth / 2; const halfH = wrapperHeight / 2;
        const minOffsetX = halfW - rect.width / 2;
        const maxOffsetX = (rect.width - halfW) - rect.width / 2;
        const minOffsetY = halfH - rect.height / 2;
        const maxOffsetY = (rect.height - halfH) - rect.height / 2;
        newOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, newOffsetX));
        newOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, newOffsetY));
        setWrapperOffset && setWrapperOffset(wrapper, newOffsetX, newOffsetY);
      }
      function onPointerUpMove(e){
        if (!moving || moving.pointerId !== e.pointerId) return;
        try { wrapper.releasePointerCapture(e.pointerId); } catch(_) {}
        const id = wrapper.dataset.layerId;
        const rect = preview.querySelector('img')?.getBoundingClientRect();
        const offX = parseFloat(wrapper.dataset.offsetX || '0') || 0;
        const offY = parseFloat(wrapper.dataset.offsetY || '0') || 0;
        const centerX = rect ? (rect.width / 2 + offX) : offX;
        const centerY = rect ? (rect.height / 2 + offY) : offY;
        const xPercent2 = rect ? (centerX / rect.width) * 100 : 50;
        const yPercent2 = rect ? (centerY / rect.height) * 100 : 50;
        document.dispatchEvent(new CustomEvent('pc:image-layer-moved', { detail: { layerId: id, xPercent: xPercent2, yPercent: yPercent2, offsetX: offX, offsetY: offY }, bubbles: true }));
        moving = null;
      }
      wrapper.addEventListener('pointerdown', onPointerDownMove);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUpMove);

      wrapper.addEventListener('click', (ev) => { ev.stopPropagation(); selectLayer(wrapper); });

      document.dispatchEvent(new CustomEvent('pc:image-layer-added', { detail: { layerId, src, handle, index, xPercent, yPercent }, bubbles: true }));
      return wrapper;
    }

    function getCurrent(){ return currentSelected; }
    function deleteCurrent(){
      if (!currentSelected) return;
      const id = currentSelected.dataset.layerId;
      currentSelected.remove();
      updateLayerZIndexes && updateLayerZIndexes(layersEl());
      hideToolbar();
      document.dispatchEvent(new CustomEvent('pc:image-layer-removed', { detail: { layerId: id }, bubbles: true }));
    }
    function rotateCurrent(delta){
      if (!currentSelected) return;
      const prev = parseFloat(currentSelected.dataset.rotation || '0');
      const next = (prev + delta) % 360;
      applyRotationTo && applyRotationTo(currentSelected, next);
      document.dispatchEvent(new CustomEvent('pc:image-layer-rotated', { detail: { layerId: currentSelected.dataset.layerId, rotation: next }, bubbles: true }));
    }
    function moveBackward(){
      const wrap = currentSelected; if (!wrap) return;
      const layers = layersEl();
      const prev = wrap.previousElementSibling;
      if (prev && prev.classList && prev.classList.contains('pc-layer-wrapper')) {
        layers.insertBefore(wrap, prev);
        updateLayerZIndexes && updateLayerZIndexes(layers);
        document.dispatchEvent(new CustomEvent('pc:image-layer-order-changed', { detail: { layerId: wrap.dataset.layerId, direction: 'backward' }, bubbles: true }));
        showToolbarFor(wrap);
      }
    }
    function moveForward(){
      const wrap = currentSelected; if (!wrap) return;
      const layers = layersEl();
      const next = wrap.nextElementSibling;
      if (next && next.classList && next.classList.contains('pc-layer-wrapper')) {
        layers.insertBefore(wrap, next.nextElementSibling);
        updateLayerZIndexes && updateLayerZIndexes(layers);
        document.dispatchEvent(new CustomEvent('pc:image-layer-order-changed', { detail: { layerId: wrap.dataset.layerId, direction: 'forward' }, bubbles: true }));
        showToolbarFor(wrap);
      }
    }

    // Thumbnail button click selection only
    (buttons || []).forEach(btn => {
      btn.addEventListener('click', () => {
        (buttons || []).forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
      });
    });

    // Drag source
    (buttons || []).forEach((btn, idx) => {
      btn.setAttribute('draggable', 'true');
      btn.dataset.index = btn.dataset.index || idx;
      btn.addEventListener('dragstart', (e) => {
        const src = btn.dataset.src || '';
        const handle = btn.dataset.handle || '';
        try {
          e.dataTransfer.setData('text/plain', src);
          e.dataTransfer.setData('text/x-pc-handle', handle);
          e.dataTransfer.setData('text/x-pc-index', String(btn.dataset.index));
          e.dataTransfer.effectAllowed = 'copy';
        } catch(_) {
          e.dataTransfer.setData('text/plain', src);
        }
        const img = btn.querySelector('img');
        if (img) { try { e.dataTransfer.setDragImage(img, img.width/2, img.height/2); } catch(_) {} }
      });
    });

    // Ghost + drop handling
    let activeGhost = null; let activeDragSrc = null;
    preview.addEventListener('dragover', (e) => {
      e.preventDefault(); preview.classList.add('is-dragover');
      const src = e.dataTransfer.getData('text/plain') || ''; if (!src) return;
      const layers = layersEl();
      if (!activeGhost || activeDragSrc !== src){
        if (activeGhost) activeGhost.remove();
        activeGhost = document.createElement('div'); activeGhost.className = 'pc-layer-wrapper pc-ghost';
        // sizing
        const ghostBtn = Array.from(buttons || []).find(b => (b.dataset.src === src) || (b.dataset.handle && b.dataset.handle === e.dataTransfer.getData('text/x-pc-handle')));
        const gPatchHeight = ghostBtn?.dataset?.height ? parseFloat(ghostBtn.dataset.height) : null;
        const gHatHeight = previewImageEl?.dataset?.height ? parseFloat(previewImageEl.dataset.height) : null;
        let ghostHeight = 200;
        if (gPatchHeight && gHatHeight && gHatHeight > 0) {
          const ratio = gPatchHeight / gHatHeight;
          const pH = previewImageEl.clientHeight; if (pH) ghostHeight = Math.round(Math.max(50, Math.min(500, pH * ratio)));
        }
        activeGhost.style.height = ghostHeight + 'px';
        const img = document.createElement('img'); img.className = 'pc-layer-img'; img.src = src; img.style.opacity = '0.85';
        const gImg = new Image(); gImg.onload = () => { const ar = gImg.width / gImg.height; activeGhost.style.width = Math.round(ghostHeight * ar) + 'px'; }; gImg.src = src;
        activeGhost.appendChild(img); layers.appendChild(activeGhost); activeDragSrc = src;
      }
      const rect = preview.querySelector('img')?.getBoundingClientRect(); if (!rect) return;
      const offsetX = e.clientX - rect.left; const offsetY = e.clientY - rect.top;
      const xPercent = Math.max(0, Math.min(1, offsetX / rect.width)) * 100;
      const yPercent = Math.max(0, Math.min(1, offsetY / rect.height)) * 100;
      const ghostLeftPx = (xPercent/100) * rect.width; const ghostTopPx = (yPercent/100) * rect.height;
      const ghostOffX = Math.round(ghostLeftPx - rect.width / 2); const ghostOffY = Math.round(ghostTopPx - rect.height / 2);
      activeGhost.style.left = '50%'; activeGhost.style.top = '50%';
      activeGhost.dataset.offsetX = String(ghostOffX); activeGhost.dataset.offsetY = String(ghostOffY);
      activeGhost.style.transform = `translate(-50%, -50%) translate(${ghostOffX}px, ${ghostOffY}px)`;
    });
    preview.addEventListener('dragleave', () => { preview.classList.remove('is-dragover'); });
    preview.addEventListener('drop', (e) => {
      e.preventDefault(); preview.classList.remove('is-dragover');
      const src = e.dataTransfer.getData('text/plain') || ''; const handle = e.dataTransfer.getData('text/x-pc-handle') || ''; const index = e.dataTransfer.getData('text/x-pc-index') || '';
      if (src){
        const match = Array.from(buttons || []).find(b => (b.dataset.src === src) || (b.dataset.handle && b.dataset.handle === handle) || (b.dataset.index && b.dataset.index === index));
        const alt = match?.querySelector('img')?.alt || '';
        (buttons || []).forEach(b => b.classList.toggle('is-selected', b === match));
        document.dispatchEvent(new CustomEvent('pc:image-dropped', { detail: { src, handle, index }, bubbles: true }));
        try {
          let xPercent = null; let yPercent = null; const rect = preview.querySelector('img')?.getBoundingClientRect();
          if (activeGhost){ xPercent = parseFloat(activeGhost.style.left) || 50; yPercent = parseFloat(activeGhost.style.top) || 50; }
          else if (rect){ const offsetX = e.clientX - rect.left; const offsetY = e.clientY - rect.top; xPercent = Math.max(0, Math.min(1, offsetX / rect.width)) * 100; yPercent = Math.max(0, Math.min(1, offsetY / rect.height)) * 100; }
          if (activeGhost) { activeGhost.remove(); activeGhost = null; activeDragSrc = null; }
          if (xPercent !== null && yPercent !== null) createLayerAt(xPercent, yPercent, src, alt, handle, index);
        } catch(err){ console.warn('Could not add image layer', err); }
      }
    });
    window.addEventListener('dragend', () => { if (activeGhost) { activeGhost.remove(); activeGhost = null; activeDragSrc = null; } preview.classList.remove('is-dragover'); });

    document.addEventListener('click', (e) => { if (!preview.contains(e.target)) { const all = preview.querySelectorAll('.pc-layer-wrapper.is-selected'); all.forEach(a => a.classList.remove('is-selected')); hideToolbar(); } });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hideToolbar(); } });

    return {
      getCurrent: getCurrent,
      deleteCurrent,
      rotateLeft: () => rotateCurrent(-15),
      rotateRight: () => rotateCurrent(15),
      moveBackward,
      moveForward
    };
  }
  window.PCLayers = { init };
})();