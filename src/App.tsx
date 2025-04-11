import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import KpdHistory from "./pages/KpdHistory";
import NotFound from "./pages/NotFound";
import HomePage from "./pages/HomePage";
import Login from "@/pages/Login";
import axios from 'axios';
import PrivateRoute from '@/components/PrivateRoute';
import AdminPanel from '@/pages/AdminPanel';
import AnotherProfile from '@/pages/AnotherProfile';
import SocketListener from "@/components/socketListener";
import { useEffect } from "react";
import './telegram.d.ts';
import Cookies from 'js-cookie';


// Убедитесь, что cookies отправляются при запросах
axios.defaults.withCredentials = true;
const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (tg) {
      tg.ready();
      tg.expand(); // делает WebApp во весь экран
    }

    console.log("Telegram Init Data", tg?.initDataUnsafe);

    if (tg?.initDataUnsafe?.user?.id) {
      Cookies.set("tg_id", String(tg.initDataUnsafe.user.id), { expires: 31 });
    }
  }, []); // <== не забудь []

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.ts')
        .then(registration => {
          console.log('Service Worker registered:', registration);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);
  

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PrivateRoute><SocketListener /></PrivateRoute>
            <Routes>
              <Route path="/" element={ <PrivateRoute><HomePage /></PrivateRoute> } />
              <Route path="/admin" element={ <PrivateRoute><AdminPanel /></PrivateRoute> } />
              <Route path="/profile" element={ <PrivateRoute><Index /></PrivateRoute> } />
              <Route path="/kpd-history" element={ <PrivateRoute><KpdHistory /></PrivateRoute> } />
              <Route path="/profile/:userId" element={ <AnotherProfile /> } />
              <Route path="/login" element={ <Login /> } />
              <Route path="*" element={ <NotFound /> } />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
