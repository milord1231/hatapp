
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { Lock, LogIn, Eye, EyeOff } from 'lucide-react';

const LoginForm: React.FC = () => {
  const { login, failedAttempts, isLocked, remainingLockoutTime } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  try {
    await login(username, password); // login должен быть async
  } finally {
    setIsLoading(false);
  }
};

  
  // Format the remaining lockout time
  const formatRemainingTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <Card className="w-full max-w-md border shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Авторизация</CardTitle>
        <CardDescription className="text-center">
          Введите свои данные от BB KAI для авторизации
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Username
            </label>
            <div className="relative">
              <Input
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLocked}
                className="pl-10"
                autoComplete="username"
              />
              <LogIn className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLocked}
                className="pl-10"
                autoComplete="current-password"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <button 
                type="button" 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? 
                  <EyeOff className="h-4 w-4" /> : 
                  <Eye className="h-4 w-4" />
                }
              </button>
            </div>
          </div>

          {failedAttempts > 0 && !isLocked && (
            <div className="text-sm text-amber-600">
              Failed attempts: {failedAttempts}/5
            </div>
          )}

          {isLocked && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 font-medium">Ты подозритевательный :)</p>
              <p className="text-red-500 text-sm">
                Слишком много неправильных по-пыток. Попробуй снова через {formatRemainingTime(remainingLockoutTime)}.
              </p>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLocked || !username || !password || isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Вход...
              </span>
            ) : (
              isLocked ? 'Locked' : 'Sign In'
            )}
          </Button>

        </form>
      </CardContent>
      
      <CardFooter className="flex justify-center">
        <p className="text-xs text-center text-muted-foreground">
          
        </p>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;