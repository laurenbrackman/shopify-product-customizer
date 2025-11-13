(function(){
  function updateWrapperTransform(wrapper) {
    const rot = parseFloat(wrapper.dataset.rotation || '0') || 0;
    const offX = parseFloat(wrapper.dataset.offsetX || '0') || 0;
    const offY = parseFloat(wrapper.dataset.offsetY || '0') || 0;
    wrapper.style.transform = `translate(-50%, -50%) translate(${offX}px, ${offY}px) rotate(${rot}deg)`;
  }
  function setWrapperOffset(wrapper, offX, offY) {
    wrapper.dataset.offsetX = String(Math.round(offX));
    wrapper.dataset.offsetY = String(Math.round(offY));
    updateWrapperTransform(wrapper);
  }
  function applyRotationTo(wrapper, rotation) {
    wrapper.dataset.rotation = String(rotation);
    updateWrapperTransform(wrapper);
  }
  function updateLayerZIndexes(layersEl) {
    if (!layersEl) return;
    const wrappers = layersEl.querySelectorAll('.pc-layer-wrapper');
    wrappers.forEach((wrapper, index) => {
      wrapper.style.zIndex = index + 1;
    });
  }
  window.PCUtils = { updateWrapperTransform, setWrapperOffset, applyRotationTo, updateLayerZIndexes };
})();