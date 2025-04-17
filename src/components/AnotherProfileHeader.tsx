import RoleBadge from "./RoleBadge";
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileHeaderProps {
  fullName: string;
  status: string;
  profileImage: string;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ fullName, status, profileImage }) => {
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
      <AvatarImage src={profileImage} alt="User Avatar">
      </AvatarImage>
        <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl">
          {getInitials(fullName)}
        </AvatarFallback>
      </Avatar>
      
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold text-gray-800">{fullName}</h1>
        <div style={{ height: '5px'}}></div>
                  {status?.split(',').map((stat, idx) => (
                    <RoleBadge key={idx} role={stat.trim()} />
                  ))}
        </div>
    </div>
  );
};

export default ProfileHeader;
