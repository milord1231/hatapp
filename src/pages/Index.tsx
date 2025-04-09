import React, { useEffect, useState } from 'react';
import { toast } from "sonner";
import Cookies from 'js-cookie';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { UserData } from '@/types/UserInterface.tsx';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import ProfileCard from "@/components/ProfileCard";
import ProfileHeader from "@/components/ProfileHeader";
import { Home } from "lucide-react";


const Index: React.FC = () => {

  const [user, setUser] = useState<UserData>({
    fullName: '',
    status: '',
    build: 0,
    floor: 0,
    block: 0,
    room: 0,
    kpdScore: 0,
  });


  const login = Cookies.get("login");
  useEffect(() => {
    fetch(`http://81.94.150.221:5000/api/get-profile-data?login=${login}`)
      .then((res) => res.json())
      .then((data: UserData) => setUser(data))
      .catch((err) => console.error("Ошибка запроса:", err));
  }, []);


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
          profileImg={Cookies.get('profileImg')}
        />
        
        <div className="mt-8">
          <ProfileCard profileData={user} />
        </div>
      </div>
    </div>
  );
};

export default Index;
