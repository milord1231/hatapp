import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavLink } from "react-router-dom";

interface ProfileData {
  fullName: string;
  status: string;
  build: number,
  floor: number,
  block: number,
  room: number, 
  kpdScore: number;
}

interface ProfileCardProps {
  profileData: ProfileData;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profileData }) => {
  // Parse the room information
  
  return (
    <Card className="shadow-md">
      <CardHeader className="bg-gray-50 border-b">
        <CardTitle className="text-xl">Информация профиля</CardTitle>
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
              <p className={`font-medium`}>{profileData.status}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">КПД</p>
              <div className="flex items-center">
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full ${profileData.kpdScore == 0 ? 'bg-green-500' : profileData.kpdScore <= 10  ? 'bg-yellow-500' : profileData.kpdScore <= 25  ? 'bg-orange-500' : 'bg-red-500'} mr-2`}></div>
                  <span className="font-medium">{profileData.kpdScore}</span>
                </div>
                <NavLink to="/kpd-history" className="ml-3 text-sm text-blue-600 hover:underline">
                  История
                </NavLink>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Место проживания</p>
              <div className="font-medium">
                <p>Общежитие №{profileData.build}, Этаж {profileData.floor}</p>
                <p>Блок {profileData.block}, Комната {profileData.room}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
