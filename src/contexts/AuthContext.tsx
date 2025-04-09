
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { toast } from "sonner";
import Cookies from 'js-cookie';

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
const LOCKOUT_DURATION = 1 // 3 * 60 * 1000; // 3 minutes in milliseconds

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const [remainingLockoutTime, setRemainingLockoutTime] = useState<number>(0);

  // Check if we have existing auth state in localStorage on mount
  useEffect(() => {
    const storedFailedAttempts = localStorage.getItem('failedAttempts');
    const storedLockoutEndTime = localStorage.getItem('lockoutEndTime');
    
    if (storedFailedAttempts) {
      setFailedAttempts(parseInt(storedFailedAttempts, 10));
    }
    
    if (storedLockoutEndTime) {
      const endTime = parseInt(storedLockoutEndTime, 10);
      setLockoutEndTime(endTime);
      
      // If lockout period hasn't ended yet
      if (endTime > Date.now()) {
        setIsLocked(true);
      } else {
        // Lockout period has ended, clear it
        localStorage.removeItem('lockoutEndTime');
        setLockoutEndTime(null);
      }
    }
  }, []);

  // Update countdown timer when locked
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

  const login = async (username: string, password: string) => {
    if (isLocked) return;
  
    try {
      const response = await fetch('http://81.94.150.221:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || "Invalid credentials");
  
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        localStorage.setItem('failedAttempts', newFailedAttempts.toString());
  
        if (newFailedAttempts >= MAX_LOGIN_ATTEMPTS) {
          const endTime = Date.now() + LOCKOUT_DURATION;
          setIsLocked(true);
          setLockoutEndTime(endTime);
          localStorage.setItem('lockoutEndTime', endTime.toString());
          toast.error("Account locked for 3 minutes due to too many failed attempts.");
        }
  
        return;
      }
  
      const data = await response.json();
      toast.success(data.message || "Login successful!");
      setFailedAttempts(0);
      localStorage.setItem('failedAttempts', '0');

      Cookies.set('user_id', data.user_id.toString(), { expires: 7 }); // Сохраняем cookie на 7 дней
      Cookies.set('login', data.login.toString(), { expires: 7 }); // Сохраняем cookie на 7 дней
      Cookies.set('profileImg', data.profileImg.toString(), { expires: 7 }); // Сохраняем cookie на 7 дней

      setIsAuthenticated(true);
      
  
    } catch (err) {
      toast.error("Server error. Please try again later.");
      console.error("Login error:", err);
    }
  };

  const logout = () => {
    toast.success("Logout");
    setIsAuthenticated(false);
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};