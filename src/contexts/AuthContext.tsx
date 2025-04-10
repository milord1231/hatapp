import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { toast } from "sonner";
import Cookies from "js-cookie";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

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

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 3 * 60 * 1000; // 3 минуты

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const [remainingLockoutTime, setRemainingLockoutTime] = useState(0);

  useEffect(() => {
    restoreAuthState();
  }, []);

  useEffect(() => {
    let intervalId: number | null = null;

    if (isLocked && lockoutEndTime) {
      intervalId = window.setInterval(() => {
        const remaining = Math.max(0, lockoutEndTime - Date.now());
        setRemainingLockoutTime(remaining);

        if (remaining <= 0) {
          setIsLocked(false);
          setLockoutEndTime(null);
          localStorage.removeItem("lockoutEndTime");
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

  const restoreAuthState = () => {
    const storedFailedAttempts = localStorage.getItem("failedAttempts");
    const storedLockoutEndTime = localStorage.getItem("lockoutEndTime");
    const token = Cookies.get("access_token");

    if (storedFailedAttempts) {
      setFailedAttempts(parseInt(storedFailedAttempts, 10));
    }

    if (storedLockoutEndTime) {
      const endTime = parseInt(storedLockoutEndTime, 10);
      setLockoutEndTime(endTime);
      if (endTime > Date.now()) {
        setIsLocked(true);
      } else {
        localStorage.removeItem("lockoutEndTime");
        setLockoutEndTime(null);
      }
    }

    if (token) {
      setIsAuthenticated(true);
    }
  };

  const login = async (username: string, password: string) => {
    if (isLocked) {
      toast.error("Аккаунт временно заблокирован");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ login: username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.access_token) {
        toast.error(data.message || "Неверные учетные данные");

        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        localStorage.setItem("failedAttempts", newFailedAttempts.toString());

        if (newFailedAttempts >= MAX_LOGIN_ATTEMPTS) {
          const endTime = Date.now() + LOCKOUT_DURATION;
          setIsLocked(true);
          setLockoutEndTime(endTime);
          localStorage.setItem("lockoutEndTime", endTime.toString());
          toast.error("Аккаунт заблокирован на 3 минуты.");
        }

        return;
      }

      // Успешный вход
      toast.success(data.message || "Успешный вход!");
      setFailedAttempts(0);
      localStorage.setItem("failedAttempts", "0");

      Cookies.set("access_token", data.access_token, { expires: 1 });
      Cookies.set("user_id", String(data.kwargs.user_id), { expires: 7 });
      Cookies.set("admin", String(data.kwargs.admin), { expires: 7 });
      Cookies.set("username", data.kwargs.username, { expires: 7 });
      Cookies.set("profileImg", data.kwargs.profileImg, { expires: 7 });

      setIsAuthenticated(true);
    } catch (err) {
      toast.error("Ошибка сервера. Повторите позже.");
      console.error("Login error:", err);
    }
  };

  const logout = () => {
    toast.success("Выход выполнен");
    Cookies.remove("access_token");
    Cookies.remove("user_id");
    Cookies.remove("username");
    Cookies.remove("profileImg");
    Cookies.remove("admin");
    setIsAuthenticated(false);
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
        remainingLockoutTime,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth должен использоваться внутри AuthProvider");
  }
  return context;
};
