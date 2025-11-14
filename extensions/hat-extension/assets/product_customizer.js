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
          addPatchClickHandlers();
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

  // Add click handlers to patch choices to spawn patches
  function addPatchClickHandlers() {
    const patchChoices = root.querySelectorAll('.pc-choice');
    patchChoices.forEach(patchChoice => {
      // Remove existing click handlers to avoid duplicates
      patchChoice.removeEventListener('click', handlePatchClick);
      
      // Add click handler
      patchChoice.addEventListener('click', handlePatchClick);
    });
  }
  
  function handlePatchClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Only spawn if we have a preview image (hat selected)
    if (!previewImageEl) {
      alert('Please select a hat first');
      return;
    }
    
    const button = e.currentTarget;
    const src = button.dataset.src;
    const handle = button.dataset.handle;
    const title = button.dataset.title;
    const index = button.dataset.index;
    
    // Create a synthetic drop event at center of preview
    const rect = preview.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Create and dispatch a synthetic drop event
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      clientX: centerX,
      clientY: centerY,
      dataTransfer: new DataTransfer()
    });
    
    // Set data transfer properties
    try {
      dropEvent.dataTransfer.setData('text/plain', src);
      dropEvent.dataTransfer.setData('text/x-pc-handle', handle);
      dropEvent.dataTransfer.setData('text/x-pc-index', index);
    } catch(e) {
      // Fallback for browsers that don't allow setting data on synthetic events
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          getData: (type) => {
            if (type === 'text/plain') return src;
            if (type === 'text/x-pc-handle') return handle;
            if (type === 'text/x-pc-index') return index;
            return '';
          }
        }
      });
    }
    
    // Dispatch the drop event on the preview
    preview.dispatchEvent(dropEvent);
  }

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
    addPatchClickHandlers();
  }

  // ESC handler
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && toolbar && toolbar.hide) toolbar.hide(); });

  // Export PNG button handler
  if (window.PCExport && typeof window.PCExport.init === 'function') {
    window.PCExport.init(preview, exportBtn);
  }
});