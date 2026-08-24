(() => {
  const button = document.querySelector('[data-copy-bibtex]');
  const citation = document.getElementById('bibtex-code');

  if (!button || !citation) return;

  const label = button.querySelector('.copy-text');
  const defaultLabel = label ? label.textContent : 'Copy BibTeX';
  let resetTimer;

  function setStatus(message, copied) {
    if (label) label.textContent = message;
    button.classList.toggle('copied', copied);
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      if (label) label.textContent = defaultLabel;
      button.classList.remove('copied');
    }, 2000);
  }

  function legacyCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    const copied = document.execCommand('copy');
    textArea.remove();
    if (!copied) throw new Error('Copy command failed');
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (_) {
        // Continue with the browser-compatible fallback below.
      }
    }
    legacyCopy(text);
  }

  button.addEventListener('click', async () => {
    try {
      await copyText(citation.textContent);
      setStatus('Copied!', true);
    } catch (_) {
      setStatus('Copy failed', false);
    }
  });
})();
