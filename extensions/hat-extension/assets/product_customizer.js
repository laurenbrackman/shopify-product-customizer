document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('image-switcher-root');
  const preview = document.getElementById('pc-preview');
  const previewImageEl = document.getElementById('pc-preview-img');
  const exportBtn = document.getElementById('pc-export-btn');
  if (!root || !preview || !previewImageEl) return;

  const buttons = root.querySelectorAll('.pc-choice');

  let layersAPI = {};

  const toolbar = window.PCToolbar && window.PCToolbar.create
    ? window.PCToolbar.create(root, preview, {
        onDelete: () => layersAPI.deleteCurrent && layersAPI.deleteCurrent(),
        onRotateLeft: () => layersAPI.rotateLeft && layersAPI.rotateLeft(),
        onRotateRight: () => layersAPI.rotateRight && layersAPI.rotateRight(),
        onBackward: () => layersAPI.moveBackward && layersAPI.moveBackward(),
        onForward: () => layersAPI.moveForward && layersAPI.moveForward(),
      })
    : null;

  // Initialize layers once with toolbar so selection can show toolbar
  if (window.PCLayers && window.PCLayers.init) {
    layersAPI = window.PCLayers.init(preview, previewImageEl, buttons, toolbar);
  }

  // ESC handler: keep simple hide toolbar if present
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && toolbar && toolbar.hide) toolbar.hide(); });

  // Export PNG button handler (moved to PCExport utility)
  if (window.PCExport && typeof window.PCExport.init === 'function') {
    window.PCExport.init(preview, exportBtn);
  }
});

