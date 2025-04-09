import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { toast } from "sonner";
import Cookies from 'js-cookie';
import { Navigate } from 'react-router-dom';
interface AuthContextType {
  isAuthenticated: boolean;
  failedAttempts: number;
  isLocked: boolean;
  lockoutEndTime: number | null;
  login: (username: string, password: string) => void;
  logout: () => void;
  remainingLockoutTime: number;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

const MAX_LOGIN_ATTEMPTS = 50;
const LOCKOUT_DURATION = 1; // 3 * 60 * 1000; // 3 минуты в миллисекундах

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const [remainingLockoutTime, setRemainingLockoutTime] = useState<number>(0);

  // 👉 Восстанавливаем состояние при монтировании
  useEffect(() => {
    restoreAuthState();
  }, []);

  // 🔁 Таймер блокировки
  useEffect(() => {
    let intervalId: number | null = null;

    if (isLocked && lockoutEndTime) {
      intervalId = window.setInterval(() => {
        const remaining = Math.max(0, lockoutEndTime - Date.now());
        setRemainingLockoutTime(remaining);

        if (remaining <= 0) {
          setIsLocked(false);
          setLockoutEndTime(null);
          localStorage.removeItem('lockoutEndTime');
          clearInterval(intervalId!);
        }
      }, 1000);
    }

    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [isLocked, lockoutEndTime]);

  // 🧠 Логика восстановления состояния
  const restoreAuthState = () => {
    const storedFailedAttempts = localStorage.getItem('failedAttempts');
    const storedLockoutEndTime = localStorage.getItem('lockoutEndTime');
    const userId = Cookies.get('user_id');

    if (storedFailedAttempts) {
      setFailedAttempts(parseInt(storedFailedAttempts, 10));
    }

    if (storedLockoutEndTime) {
      const endTime = parseInt(storedLockoutEndTime, 10);
      setLockoutEndTime(endTime);

      if (endTime > Date.now()) {
        setIsLocked(true);
      } else {
        localStorage.removeItem('lockoutEndTime');
        setLockoutEndTime(null);
      }
    }

    if (userId) {
      setIsAuthenticated(true);
    }
  };

  // 🔐 Вход
  const login = async (username: string, password: string) => {
    if (isLocked) return;

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || "Неверные учетные данные");

        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        localStorage.setItem('failedAttempts', newFailedAttempts.toString());

        if (newFailedAttempts >= MAX_LOGIN_ATTEMPTS) {
          const endTime = Date.now() + LOCKOUT_DURATION;
          setIsLocked(true);
          setLockoutEndTime(endTime);
          localStorage.setItem('lockoutEndTime', endTime.toString());
          toast.error("Аккаунт заблокирован на 3 минуты.");
        }

        return;
      }

      const data = await response.json();
      toast.success(data.message || "Успешный вход!");
      setFailedAttempts(0);
      localStorage.setItem('failedAttempts', '0');

      Cookies.set('user_id', data.user_id.toString(), { expires: 7 });
      Cookies.set('login', data.login.toString(), { expires: 7 });
      Cookies.set('profileImg', data.profileImg.toString(), { expires: 7 });
      Cookies.set('admin', data.admin.toString(), { expires: 7 });

      setIsAuthenticated(true);

    } catch (err) {
      toast.error("Ошибка сервера. Повторите позже.");
      console.error("Login error:", err);
    }
  };


  // 🚪 Выход

const logout = () => {
  toast.success("Выход выполнен");
  Cookies.remove('user_id');
  Cookies.remove('login');
  Cookies.remove('profileImg');
  Cookies.remove('admin');
  window.location.reload();
};
  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated, 
        failedAttempts, 
        isLocked, 
        lockoutEndTime,
        login, 
        logout,
        remainingLockoutTime 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};
