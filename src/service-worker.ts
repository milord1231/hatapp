/// <reference lib="webworker" />


self.addEventListener("push", (event: PushEvent) => {

  const data = event.data ? event.data.json() : {};

  const title = data.title || 'Новое уведомление';
  const message = data.message || 'Сообщение не указано';



  const options: NotificationOptions = {
    body: message,
    icon: "/nIcon_l.png",
    badge: "/nIcon_b.png",
    data: data.url || "/",
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

