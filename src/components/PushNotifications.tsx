import { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')
  
    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)
  
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
  
    return outputArray
}


const PushNotification = () => {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  navigator.serviceWorker.register('/service-worker.js')
  useEffect(() => {
    // Проверка на поддержку push-уведомлений и сервис-воркера
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.pushManager.getSubscription().then((existingSubscription) => {
            if (existingSubscription) {
              setSubscription(existingSubscription);
            }
          });
        })
        .catch((error) => console.error("Error during service worker registration", error));
    }
  }, []);

  const subscribeUser = async () => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        setIsLoading(true);
        const vapidPublicKey = 'BGYV6tsROe7o6Wk797JQ5gxqphVcDgwuaMV4DfuCGMgDytuO35iZY6exuFO7tUK0ULUGEhSqBAF7cVO9u6cnw1A'

        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

        const registration = await navigator.serviceWorker.ready;
        const pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey, // Замените на ваш VAPID public key
        });

        setSubscription(pushSubscription);
        
        // Отправка подписки на сервер для хранения
        await axios.post(
            `${API_BASE}/api/subscribe_push_notify`,
            {
              endpoint: pushSubscription.endpoint,
              keys: pushSubscription.toJSON().keys,
            },
            {
              headers: {
                Authorization: `Bearer ${Cookies.get("access_token")}`,
              },
              withCredentials: true,
            }
          );

        console.log("User subscribed:", pushSubscription);
      } catch (error) {
        console.error("Subscription failed:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const unsubscribeUser = async () => {
    if (subscription) {
      try {
        setIsLoading(true);
        await subscription.unsubscribe();
        setSubscription(null);
        await axios.post(`${API_BASE}/api/unsubscribe_push_notify`, { 
            endpoint: subscription.endpoint }, 
            {
            headers: {
              Authorization: `Bearer ${Cookies.get("access_token")}`,
            },
            withCredentials: true});
        console.log("User unsubscribed");
      } catch (error) {
        console.error("Unsubscription failed:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex justify-center">
      {subscription ? (
        <Button 
          variant="outline" 
          size="lg" 
          onClick={unsubscribeUser}
          disabled={isLoading}
          className="bg-white border-red-200 hover:bg-red-50 text-red-500 hover:text-red-600 hover:border-red-300 transition-colors"
        >
          <BellOff className="mr-2 h-4 w-4" />
          Отписаться от уведомлений
        </Button>
      ) : (
        <Button 
          variant="default" 
          size="lg" 
          onClick={subscribeUser}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-600 transition-colors"
        >
          <Bell className="mr-2 h-4 w-4" />
          Подписаться на уведомления
        </Button>
      )}
    </div>
  );
};

export default PushNotification;