
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileHeaderProps {
  fullName: string;
  status: string;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ fullName, status, profileImg }) => {
  // Get initials for the avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  };

  return (
    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
      <Avatar className="h-24 w-24 border-2 border-blue-500">
      <AvatarImage src={profileImg} alt="User Avatar">
      </AvatarImage>
        <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl">
          {getInitials(fullName)}
        </AvatarFallback>
      </Avatar>
      
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold text-gray-800">{fullName}</h1>
        <div style={{ height: '5px'}}></div>
        <div className={`"mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-blue-800" ${status == "Староста" ? 'bg-green-100' :  status == "Ответственный за прачечную" ? 'bg-pink-100' :  status == "Ответственный за комп. класс" ? 'bg-gray-100' : status == "Член ССО" ? 'bg-red-100' :'bg-blue-100'}  `}>
          {status}
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
