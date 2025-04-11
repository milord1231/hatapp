/// <reference lib="webworker" />

self.addEventListener('push', (event: PushEvent) => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || 'Новое уведомление';
  const message = data.message || 'Сообщение не указано';

  const options = {
    body: message,
    icon: '/icon.png',
    badge: '/badge.png',
  };

  // Использование waitUntil для обработки асинхронной операции
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
