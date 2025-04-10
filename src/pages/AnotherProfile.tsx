import React, { useEffect, useState } from 'react';
import { toast } from "sonner";
import Cookies from 'js-cookie';
import { useAuth} from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { UserData } from '@/types/UserInterface.tsx';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import AnotherProfileCard from "@/components/AnotherProfileCard";
import AnotherProfileHeader from "@/components/AnotherProfileHeader";
import { Home } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';  // Для получения ID из URL
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
  });


  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  useEffect(() => {
    authFetch(`${API_BASE}/api/get-profile-data?userId=${userId}`)
      .then((res) => {
        if (!res.ok) {
            toast.error("Пользователь не найден");
            navigate("/profile");
        }
        return res.json(); // Если статус успешный, продолжаем обработку данных
      })
      .then((data: UserData) => {
        setUser(data); // Обновляем данные пользователя
      })
      .catch((err) => {
        console.error("Ошибка запроса:", err);
        // Дополнительно можно обработать ошибки в UI (например, показать сообщение)
      });
  }, [userId]); // Добавляем зависимость от userId



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
              <BreadcrumbPage>{user.fullName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <AnotherProfileHeader 
          fullName={user.fullName} 
          status={user.status}
          profileImage={user.profileImage}
        />
        
        <div className="mt-8">
          <AnotherProfileCard profileData={user} />
        </div>
      </div>
    </div>
  );
};

export default Index;
