import React, { useEffect, useState } from 'react';
import { toast } from "sonner";
import Cookies from 'js-cookie';
import { useAuth} from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { UserData } from '@/types/UserInterface.tsx';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import ProfileCard from "@/components/ProfileCard";
import ProfileHeader from "@/components/ProfileHeader";
import { Home } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { authFetch } from '@/components/authFetch';
const API_BASE = import.meta.env.VITE_API_BASE_URL;
const Index: React.FC = () => {

  const [user, setUser] = useState<UserData>({
    fullName: '',
    status: '',
    build: 0,
    floor: 0,
    block: 0,
    room: 0,
    kpdScore: 0,
    profileImage: '',
    is_admin: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);


  const userId = Cookies.get("user_id");
  useEffect(() => {
    
    if (!userId) return; // Если нет userId, запрос не выполняем

    setLoading(true);  // Устанавливаем состояние загрузки
    setError(null);    // Сбрасываем ошибку при новом запросе

    authFetch(`${API_BASE}/api/get-profile-data?userId=${userId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Ошибка сети или сервер вернул ошибку');
        }
        return res.json();
      })
      .then((data: UserData) => {
        setUser(data);
        setLoading(false); // Завершаем загрузку
      })
      .catch((err) => {
        console.error("Ошибка запроса:", err);
        setError("Не удалось загрузить данные профиля.");
        setLoading(false); // Завершаем загрузку при ошибке
      });
  }, [userId]);



  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink to="/" className="flex items-center">
                <Home className="h-4 w-4 mr-2" />
                Главная
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Профиль</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <ProfileHeader 
          fullName={user.fullName} 
          status={user.status}
          profileImage={user.profileImage}
        />
        
        <div className="mt-8">
          <ProfileCard profileData={user} />
        </div>
      </div>
    </div>
  );
};

export default Index;
