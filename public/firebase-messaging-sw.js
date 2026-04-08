/**
 * Firebase Cloud Messaging Service Worker
 * Handles background push notifications for Orion
 */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDq901BsZWTKzNgUk2qkDg1BL9lXz1-VKQ",
  authDomain: "orion-d3734.firebaseapp.com",
  projectId: "orion-d3734",
  storageBucket: "orion-d3734.firebasestorage.app",
  messagingSenderId: "550674472945",
  appId: "1:550674472945:web:a9198f03e49439ef816e50",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'Orion', {
    body: body || '',
    icon: icon || '/orion-icon-192.png',
    badge: '/orion-icon-192.png',
    data: payload.data,
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Dispensar' },
    ],
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(event.notification.data?.url || '/');
    })
  );
});
