document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('image-switcher-root');
  const preview = document.getElementById('pc-preview');
  const previewImg = document.getElementById('pc-preview-img');
  const closeBtn = document.querySelector('.pc-preview-close');
  if (!root || !preview || !previewImg || !closeBtn) return;

  const buttons = root.querySelectorAll('.pc-choice');

  function openPreview(src, alt) {
    previewImg.src = src;
    previewImg.alt = alt || '';
    preview.classList.add('is-open');
    preview.setAttribute('aria-hidden', 'false');
  }

  function closePreview() {
    preview.classList.remove('is-open');
    preview.setAttribute('aria-hidden', 'true');
    // Keep src if you want the image to persist while collapsed; otherwise clear:
    // previewImg.removeAttribute('src');
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      const src = btn.dataset.src;
      const alt = btn.querySelector('img')?.alt || '';
      openPreview(src, alt);
    });
  });

  closeBtn.addEventListener('click', closePreview);
  // Optional: ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePreview();
  });
});
