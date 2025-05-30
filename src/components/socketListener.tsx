import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
const SOCKET_BASE = import.meta.env.VITE_SOCKET_BASE_URL;

const SOCKET_URL = `${SOCKET_BASE}`; // или твой продакшн-URL

const notificationSound = new Audio('/notification.mp3');


const SocketListener: React.FC = () => {
  useEffect(() => {
    const user_id = Cookies.get('user_id');

    if (!user_id) return;

    // Подключение с передачей user_id через auth
    const socket = io(SOCKET_URL, {
        query: { user_id },  // передаем user_id как параметр строки запроса
        withCredentials: true,  // Убедитесь, что cookies передаются
      });

    // Слушаем событие уведомления
    socket.on('notification', (data: { message: string, action: string}) => {
      notificationSound.play();

      if (data.action == 'info'){
        toast.info(data.message);  // Показать уведомление с помощью toaster
      }
      else if (data.action == 'warning'){
        toast.warning(data.message);  // Показать уведомление с помощью toaster
      }
      else if (data.action == 'error'){
        toast.error(data.message);  // Показать уведомление с помощью toaster
      }
      else if (data.action == 'success'){
        toast.success(data.message);  // Показать уведомление с помощью toaster
      }
     

      
    });

    return () => {
      socket.disconnect();  // Отключение от WebSocket
    };
  }, []);

  return null; // Никакого UI, просто слушаем уведомления
};

export default SocketListener;
