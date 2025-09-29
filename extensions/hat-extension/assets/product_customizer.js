(function () {
  const root = document.getElementById('color-switcher-root');
  if (!root) return;

  root.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      btn.style.backgroundColor = color;
    });
  });
})();
