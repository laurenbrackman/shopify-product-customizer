(function(){
  function create(root, preview, handlers){
    const toolbar = document.createElement('div');
    toolbar.className = 'pc-toolbar';
    toolbar.style.display = 'none';

    function addBtn(title, iconUrl, onClick){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.title = title;
      btn.innerHTML = `<span class="icon" aria-hidden="true"><img src="${iconUrl}" width="18" height="18" alt=""></span>`;
      btn.addEventListener('click', (e) => { e.stopPropagation(); onClick && onClick(); });
      return btn;
    }

    const deleteIconUrl = root.dataset.deleteIcon || './x-icon.svg';
    const rotateLeftIconUrl = root.dataset.rotateLeftIcon || './rotate-left.svg';
    const rotateRightIconUrl = root.dataset.rotateRightIcon || './rotate-right.svg';
    const backwardIconUrl = root.dataset.backwardIcon || './send-backward.svg';
    const forwardIconUrl = root.dataset.forwardIcon || './bring-forward.svg';

    const tbDelete = addBtn('Delete layer', deleteIconUrl, handlers.onDelete);
    const tbRotateL = addBtn('Rotate left', rotateLeftIconUrl, handlers.onRotateLeft);
    const tbRotateR = addBtn('Rotate right', rotateRightIconUrl, handlers.onRotateRight);
    const tbBackward = addBtn('Send backward', backwardIconUrl, handlers.onBackward);
    const tbForward = addBtn('Bring forward', forwardIconUrl, handlers.onForward);

    toolbar.appendChild(tbDelete);
    toolbar.appendChild(tbRotateL);
    toolbar.appendChild(tbRotateR);
    toolbar.appendChild(tbBackward);
    toolbar.appendChild(tbForward);

    preview.appendChild(toolbar);

    function showFor(wrapper){
      if (!wrapper) { hide(); return; }
      const previewRect = preview.querySelector('img')?.getBoundingClientRect();
      const wrapRect = wrapper.getBoundingClientRect();
      if (!previewRect) { hide(); return; }
      const left = Math.max(6, wrapRect.left - previewRect.left + wrapRect.width/2 - 40);
      const top = Math.max(6, wrapRect.top - previewRect.top - 40);
      toolbar.style.left = left + 'px';
      toolbar.style.top = top + 'px';
      toolbar.style.display = 'flex';
    }
    function hide(){
      toolbar.style.display = 'none';
    }

    return { element: toolbar, showFor, hide };
  }
  window.PCToolbar = { create };
})();