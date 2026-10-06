self.options = {
    "domain": "3nbf4.com",
    "zoneId": 11959768
}
self.lary = ""
// Monetag ads disabled for now
// importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw')
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.registration.unregister());
});
