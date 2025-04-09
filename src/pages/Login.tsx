import LoginForm from '@/components/LoginForm';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Login = () => {
  const { isAuthenticated } = useAuth();

  // If already authenticated, redirect to home
  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-auth">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black">
            Hostel-8
          </h1>
          <p className="text-black/90 mt-2">Требуется авторизация</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;