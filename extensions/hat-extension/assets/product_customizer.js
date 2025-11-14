document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('image-switcher-root');
  const preview = document.getElementById('pc-preview');
  let previewImageEl = document.getElementById('pc-preview-img');
  const exportBtn = document.getElementById('pc-export-btn');
  if (!root || !preview) return;

  // Hat selection functionality
  const hatChoices = document.querySelectorAll('.pc-hat-choice');
  
  function switchHat(hatChoice) {
    // Remove selection from all hat choices
    hatChoices.forEach(choice => choice.classList.remove('is-selected'));
    
    // Add selection to clicked hat
    hatChoice.classList.add('is-selected');
    
    const newSrc = hatChoice.dataset.hatSrc;
    const newTitle = hatChoice.dataset.hatTitle;
    const newHeight = hatChoice.dataset.hatHeight;
    
    if (newSrc) {
      // If no preview image exists (blank state), create one
      if (!previewImageEl) {
        // Remove placeholder
        const placeholder = preview.querySelector('.pc-placeholder');
        if (placeholder) {
          placeholder.remove();
        }
        
        // Create preview image
        previewImageEl = document.createElement('img');
        previewImageEl.id = 'pc-preview-img';
        preview.insertBefore(previewImageEl, exportBtn);
        
        // Re-query buttons after potential DOM changes
        const updatedButtons = root.querySelectorAll('.pc-choice');
        
        // Initialize layers system with new preview image
        if (window.PCLayers && window.PCLayers.init) {
          layersAPI = window.PCLayers.init(preview, previewImageEl, updatedButtons, toolbar);
        }
      }
      
      // Update preview image
      previewImageEl.src = newSrc;
      previewImageEl.alt = newTitle || 'Custom Hat';
      
      if (newHeight) {
        previewImageEl.setAttribute('data-height', newHeight);
      } else {
        previewImageEl.removeAttribute('data-height');
      }
    }
    
    // Update preview data attribute
    const hatHandle = hatChoice.dataset.hatHandle;
    if (hatHandle) {
      preview.setAttribute('data-selected-hat', hatHandle);
    }
  }
  
  // Add click handlers to hat choices
  hatChoices.forEach(hatChoice => {
    hatChoice.addEventListener('click', (e) => {
      e.preventDefault();
      switchHat(hatChoice);
    });
  });

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

  // Initialize layers only if preview image exists at start
  if (window.PCLayers && window.PCLayers.init && previewImageEl) {
    const initialButtons = root.querySelectorAll('.pc-choice');
    layersAPI = window.PCLayers.init(preview, previewImageEl, initialButtons, toolbar);
  }

  // ESC handler
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && toolbar && toolbar.hide) toolbar.hide(); });

  // Export PNG button handler
  if (window.PCExport && typeof window.PCExport.init === 'function') {
    window.PCExport.init(preview, exportBtn);
  }
});