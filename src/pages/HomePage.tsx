
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate("/profile");
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <h1 className="text-4xl font-bold mb-8">Система управления общежитием</h1>
        <Button 
          size="lg" 
          onClick={handleProfileClick}
          className="text-lg"
        >
          Профиль пользователя
        </Button>
      </div>
    </div>
  );
};

export default HomePage;
