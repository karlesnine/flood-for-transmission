import { mount } from 'svelte';
import App from '~components/App';
import config from '~helpers/configHelper';

if (__ENV__ === 'production' && 'serviceWorker' in navigator) {
  if (config.DISABLE_SERVICE_WORKER) {
    // Escape hatch: remove any service worker left behind by a previous version,
    // so the browser stops serving files from its cache.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  } else {
    navigator.serviceWorker.register('./sw.js', {
      scope: window.location.pathname,
    });
  }
}

mount(App, {
  target: document.body,
});
