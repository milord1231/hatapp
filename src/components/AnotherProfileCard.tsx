import Cookies from 'js-cookie';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'react-router-dom';
import { authFetch } from '@/components/authFetch';
import { toast } from "sonner";
import { useAdminAccess } from '@/hooks/useAdminAccess';

interface ProfileData {
  fullName: string;
  status: string;
  build: number,
  floor: number,
  block: number,
  room: number,
  kpdScore: number,
  profileImage: string;
  is_admin: boolean;
}

interface ProfileCardProps {
  profileData: ProfileData;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profileData }) => {
  const { logout } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const [editableData, setEditableData] = useState<ProfileData>({
    fullName: profileData.fullName || '',
    status: profileData.status || '',
    build: profileData.build || 0,
    floor: profileData.floor || 0,
    block: profileData.block || 0,
    room: profileData.room || 0,
    kpdScore: profileData.kpdScore || 0,
    profileImage: profileData.profileImage || '',
    is_admin: profileData.is_admin || false,
  });
  const [editMode, setEditMode] = useState(false);

  console.log(profileData);

  const { isLoading, isAdmin, isSuperAdmin } = useAdminAccess();



  useEffect(() => {
    if (isLoading) return;
    setEditableData({
      fullName: profileData.fullName || '',
      status: profileData.status || '',
      build: profileData.build || 0,
      floor: profileData.floor || 0,
      block: profileData.block || 0,
      room: profileData.room || 0,
      kpdScore: profileData.kpdScore || 0,
      profileImage: profileData.profileImage || '',
      is_admin: profileData.is_admin || false,
    });
  }, [profileData]);

  useEffect(() => {
    if (editMode) {
      setEditableData(profileData);
    }
  }, [editMode]);

  
  

  const handleSave = async () => {
    try {
      // Обновляем место проживания
      const residenceResponse = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/api/user/${userId}/residence`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Cookies.get("access_token")}` },
        body: JSON.stringify({
          dormNumber: editableData.build,
          floor: editableData.floor,
          block: editableData.block,
          room: editableData.room,
        })
      });
  
      if (!residenceResponse.ok) {
        throw new Error("Ошибка обновления проживания");
      }
  
      // Обновляем статус и флаг админа
      const statusResponse = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/api/user/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Cookies.get("access_token")}` },
        body: JSON.stringify({
          status: editableData.status,
          is_admin: editableData.is_admin ? 1 : 0,
        })
      });
  
      if (!statusResponse.ok) {
        throw new Error("Ошибка обновления статуса/админа");
      }
  
      toast.success("Данные успешно обновлены");
      setEditMode(false);
    } catch (error) {
      console.error(error);
      toast.error("Ошибка при обновлении данных");
    }
  };
  

  return (
    <Card className="shadow-md relative">
      <CardHeader className="bg-gray-50 border-b flex flex-row justify-between items-center">
        <CardTitle className="text-xl">Информация профиля</CardTitle>
        {isAdmin && !editMode && (
          <Button size="sm" onClick={() => setEditMode(true)}>Редактировать</Button>
        )}
        {editMode && (
          <Button size="sm" onClick={handleSave}>Сохранить</Button>
        )}
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-sm text-gray-500">ФИО</p>
            <p className="font-medium">{editableData.fullName}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-gray-500">Статус</p>
            {editMode ? (
              <Input value={editableData.status} onChange={e => setEditableData({ ...editableData, status: e.target.value })} />
            ) : (
              <p className="font-medium">{profileData.status}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-sm text-gray-500">КПД</p>
            <div className="flex items-center">
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full ${editableData.kpdScore == 0 ? 'bg-green-500' : editableData.kpdScore <= 10 ? 'bg-yellow-500' : editableData.kpdScore <= 25 ? 'bg-orange-500' : 'bg-red-500'} mr-2`}></div>
                <span className="font-medium">{profileData.kpdScore}</span>
              </div>
              {isAdmin && <NavLink to={`/kpd-history?userId=${userId}`} className="ml-3 text-sm text-blue-600 hover:underline">
                История
              </NavLink>}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-gray-500">Место проживания</p>
            {isAdmin && editMode ? (
              <div className="grid grid-cols-2 gap-2">
                <p>Общежитие</p>
                <Input placeholder="Общежитие" value={editableData.build} onChange={e => setEditableData({ ...editableData, build: +e.target.value })} />
                <p>Этаж</p>
                <Input placeholder="Этаж" value={editableData.floor} onChange={e => setEditableData({ ...editableData, floor: +e.target.value })} />
                <p>Блок</p>
                <Input placeholder="Блок" value={editableData.block} onChange={e => setEditableData({ ...editableData, block: +e.target.value })} />
                <p>Комната</p>
                <Input placeholder="Комната" value={editableData.room} onChange={e => setEditableData({ ...editableData, room: +e.target.value })} />

              </div>
            ) : (
              <div className="font-medium">
                <p>Общежитие №{profileData.build}, Этаж {profileData.floor}</p>
                <p>Блок {profileData.block}, Комната {profileData.room}</p>
              </div>
            )}
          </div>
        </div>

        {isSuperAdmin && editMode && (
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Админ</p>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={editableData.is_admin}
                onChange={e => setEditableData({ ...editableData, is_admin: e.target.checked })}
              />
              <span className="text-sm">Назначить админом</span>
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
