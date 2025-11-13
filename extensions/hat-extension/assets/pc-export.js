(function(){
  function loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
      if (window.html2canvas) return resolve(window.html2canvas);
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.async = true;
      script.onload = () => resolve(window.html2canvas);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function handleExport(preview, exportBtn) {
    try {
      exportBtn.disabled = true;
      const originalText = exportBtn.textContent;
      exportBtn.textContent = 'Exporting...';

      const html2canvas = await loadHtml2Canvas();

      const previewClone = preview.cloneNode(true);
      const clonedButton = previewClone.querySelector('#pc-export-btn');
      if (clonedButton) clonedButton.remove();

      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.zIndex = '-9999';
      tempContainer.appendChild(previewClone);
      document.body.appendChild(tempContainer);

      const canvas = await html2canvas(previewClone, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: '#ffffff',
        scale: 2,
      });

      document.body.removeChild(tempContainer);

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
        exportBtn.textContent = originalText || 'Export PNG';
      });
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export PNG. Please try again.');
      if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.textContent = 'Export PNG';
      }
    }
  }

  function init(preview, exportBtn) {
    if (!preview || !exportBtn) return;
    exportBtn.addEventListener('click', () => handleExport(preview, exportBtn));
  }

  window.PCExport = { init };
})();