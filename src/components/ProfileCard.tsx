import Cookies from 'js-cookie';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import PushNotification from '@/components/PushNotifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAdminAccess } from '@/hooks/useAdminAccess';

interface ProfileData {
  fullName: string;
  status: string;
  build: number;
  floor: number;
  block: number;
  room: number;
  kpdScore: number;
  profileImage: string;
}

interface ProfileCardProps {
  profileData: ProfileData;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profileData }) => {

  const { isLoading, isAdmin, isSuperAdmin } = useAdminAccess();


   useEffect(() => {
     if (isLoading) return;  
   }, []);


  const { logout } = useAuth();

  const [requestData, setRequestData] = useState({
    build: profileData.build.toString(),
    floor: profileData.floor.toString(),
    block: profileData.block.toString(),
    room: profileData.room.toString()
  });


  const [newBuild, setNewBuild] = useState("");
  const [newFloor, setNewFloor] = useState("");
  const [newBlock, setNewBlock] = useState("");
  const [newRoom, setNewRoom] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRequestData({ ...requestData, [e.target.name]: e.target.value });
  };

  const handleSendRequest = async () => {
    const userId = Cookies.get("user_id");
    const payload = {
      user_id: Number(userId),
      old_build: profileData.build,
      old_floor: profileData.floor,
      old_block: profileData.block,
      old_room: profileData.room,
      new_build: Number(newBuild),
      new_floor: Number(newFloor),
      new_block: Number(newBlock),
      new_room: Number(newRoom),
      requests: [] // Добавляем поле requests, если оно нужно. Можно указать пустой массив или другие данные.
    };
  
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/change-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${Cookies.get("access_token")}`
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });
  
      if (res.ok) {
        toast.info("Запрос отправлен. Ожидайте подтверждения.");
        setNewBuild(""); setNewFloor(""); setNewBlock(""); setNewRoom("");
      } else {
        const error = await res.json();
        toast.error("Ошибка. Не удалось отправить запрос");
      }
    } catch (err) {
      toast.error("Ошибка сети Проверьте соединение");
    }
  };
  

  

  return (
    <Card className="shadow-md relative">
      <CardHeader className="bg-gray-50 border-b flex flex-row justify-between items-center">
        <CardTitle className="text-xl">Информация профиля</CardTitle>
        <PushNotification />
        <NavLink to="/login">
          <Button 
            onClick={logout} 
            variant="outline" 
            size="sm" 
            className="bg-white hover:bg-red-50 text-red-500 border-red-200 hover:border-red-300 transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </Button>
        </NavLink>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">ФИО</p>
              <p className="font-medium">{profileData.fullName}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Статус</p>
              <p className="font-medium">{profileData.status}</p>
              {isAdmin && <NavLink to="/admin" className="underline text-blue-600">Админ-панель</NavLink>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">КПД</p>
              <div className="flex items-center">
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full ${profileData.kpdScore <= 0 ? 'bg-green-500' : profileData.kpdScore <= 10  ? 'bg-yellow-500' : profileData.kpdScore <= 25  ? 'bg-orange-500' : 'bg-red-500'} mr-2`}></div>
                  <span className="font-medium">{profileData.kpdScore}</span>
                </div>
                <NavLink to={`/kpd-history?userId=${Cookies.get('user_id')}`} className="ml-3 text-sm text-blue-600 hover:underline">
                  История
                </NavLink>
              </div>
              {profileData.kpdScore <= 0 && <span className="font-medium text-green-700">Ты молодец!</span>}
              {profileData.kpdScore > 0 && profileData.kpdScore <= 10 && <span className="font-medium text-yellow-500">Не всё так плохо, не грусти</span>}
              {profileData.kpdScore > 10 && profileData.kpdScore <= 25 && <span className="font-medium text-orange-500">Всё поправимо...</span>}
              {profileData.kpdScore > 25 && <span className="font-medium text-red-500">Э о а э... мяу.</span>}
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Место проживания</p>
              <div className="font-medium">
                <p>Общежитие №{profileData.build}, Этаж {profileData.floor}</p>
                <p>Блок {profileData.block}, Комната {profileData.room}</p>
              </div>

              {!isAdmin && (
              <div className="p-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="mt-4" variant="outline">Запросить изменения</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Изменение места проживания</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label>Здание</Label>
                        <Input type="number" value={newBuild} onChange={e => setNewBuild(e.target.value)} />
                      </div>
                      <div>
                        <Label>Этаж</Label>
                        <Input type="number" value={newFloor} onChange={e => setNewFloor(e.target.value)} />
                      </div>
                      <div>
                        <Label>Блок</Label>
                        <Input type="number" value={newBlock} onChange={e => setNewBlock(e.target.value)} />
                      </div>
                      <div>
                        <Label>Комната</Label>
                        <Input type="number" value={newRoom} onChange={e => setNewRoom(e.target.value)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSendRequest}>Отправить</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
