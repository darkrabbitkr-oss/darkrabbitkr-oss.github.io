(function () {
  const KEY = 'dr-hub-theme';
  const html = document.documentElement;
  const toggleBtn = document.getElementById('theme-toggle');
  const iconSlot = document.getElementById('theme-icon');
  const labelSlot = document.getElementById('theme-label');

  const moonSvg =
    '<svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const sunSvg =
    '<svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/></svg>';

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    if (iconSlot) iconSlot.innerHTML = theme === 'dark' ? moonSvg : sunSvg;
    if (labelSlot) labelSlot.textContent = theme === 'dark' ? '다크 모드' : '라이트 모드';
  }

  let initial = 'dark';
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') initial = saved;
  } catch {
    // ignore storage failures
  }
  applyTheme(initial);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        localStorage.setItem(KEY, next);
      } catch {
        // ignore storage failures
      }
    });
  }
})();
