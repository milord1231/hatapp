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
// Убедитесь, что cookies отправляются при запросах
axios.defaults.withCredentials = true;
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        

          <Routes>
            <Route path="/" element={ <PrivateRoute><HomePage /></PrivateRoute>} />
                <Route path="/admin" element={<PrivateRoute><AdminPanel /> </PrivateRoute>} />
                <Route path="/profile" element={<PrivateRoute><Index /></PrivateRoute>} />
                <Route path="/kpd-history" element={<PrivateRoute><KpdHistory /></PrivateRoute>} />
                <Route path="/profile/:userId" element={<AnotherProfile />} />
              
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
