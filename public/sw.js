/* AI Crisis Radar service worker — push delivery only. */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "AI Crisis Radar", body: "New alert available." };
  }
  const title = payload.title || "AI Crisis Radar";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "Open the dashboard for details.",
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: payload.tag || "radar",
      data: { url: payload.url || "/notifications" },
      renotify: false,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
