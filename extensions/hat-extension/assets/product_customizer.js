document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('image-switcher-root');
  if (!root) return;

  const buttons = root.querySelectorAll('.pc-choice');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
    });
  });
});
