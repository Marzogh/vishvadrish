// Apply the saved preference before styles paint. System is the default.
(() => {
  const root = document.documentElement;
  const key = 'vishvadrish-theme';
  const modes = ['system', 'light', 'dark'];
  let preference = 'system';
  try {
    const saved = localStorage.getItem(key);
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch { /* A blocked store must not prevent theme selection. */ }
  root.dataset.theme = preference;
  root.dataset.embed = new URLSearchParams(location.search).get('embed') === '1' ? 'true' : 'false';
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('theme');
    const title = value => value[0].toUpperCase() + value.slice(1);
    function apply(value) {
      preference = value;
      root.dataset.theme = value;
      const next = modes[(modes.indexOf(value) + 1) % modes.length];
      button.setAttribute('aria-label', `Colour theme: ${title(value)}. Switch to ${title(next)}.`);
      button.title = `Colour theme: ${title(value)}`;
      for (const icon of button.querySelectorAll('[data-theme-icon]')) icon.toggleAttribute('hidden', icon.dataset.themeIcon !== value);
    }
    apply(preference);
    button.addEventListener('click', () => {
      apply(modes[(modes.indexOf(preference) + 1) % modes.length]);
      try {
        if (preference === 'system') localStorage.removeItem(key);
        else localStorage.setItem(key, preference);
      } catch { /* The selected theme remains active for this page. */ }
    });
    window.addEventListener('storage', event => {
      if (event.key !== key && event.key !== null) return;
      const value = event.newValue;
      apply(value === 'light' || value === 'dark' ? value : 'system');
    });
  });
})();
