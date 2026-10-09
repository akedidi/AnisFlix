// Recovery module for an index.html cached by the legacy anisflix-v2 worker.
(async () => {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    // Continue with cache cleanup even if service workers are unavailable.
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith('anisflix-'))
        .map((cacheName) => caches.delete(cacheName))
    );
  } catch {
    // Reloading with a cache-busting URL still gives the browser a way out.
  }

  const recoveryUrl = new URL(window.location.href);
  recoveryUrl.searchParams.set('anisflix-recovery', Date.now().toString());
  window.location.replace(recoveryUrl.toString());
})();
