import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home } from "lucide-react";
import React, { useEffect, useState } from 'react';
import { toast } from "sonner";



interface KpdHistoryItem {
  id: number;
  date: string;
  hours: number;
  type: "addition" | "deduction";
  description: string;
}

const KpdHistory = () => {
  // Mock data for KPD history
  const historyData: KpdHistoryItem[] = [
    {
      id: 1,
      date: "2025-04-01",
      hours: 5,
      type: "addition",
      description: "Дежурство в общежитии"
    },
    {
      id: 2,
      date: "2025-04-03",
      hours: 3,
      type: "deduction",
      description: "Нарушение тишины после 23:00"
    },
    {
      id: 3,
      date: "2025-04-05",
      hours: 4,
      type: "addition",
      description: "Помощь в организации мероприятия"
    },
    {
      id: 4,
      date: "2025-04-07",
      hours: 2,
      type: "deduction",
      description: "Несвоевременная уборка комнаты"
    }
  ];
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  useEffect(() => {
    const userId = Cookies.get('user_id');
    if (userId) {
      setIsAuthenticated(true);
    }
  }, []);
  

  toast.info("Login status: " + isAuthenticated);
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
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
              <BreadcrumbLink to="/profile">Профиль</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>История КПД</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="text-3xl font-bold mb-6">История часов КПД</h1>
        <p className="mb-6 text-gray-600">
          КПД - это часы, которые назначаются за нарушения и отрабатываются выполнением заданий. 
          Историю пополнений и списаний можно увидеть ниже.
        </p>
        
        <div className="space-y-4">
          {historyData.map((item) => (
            <Card key={item.id} className={item.type === 'addition' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle>{item.type === 'addition' ? 'Пополнение' : 'Списание'}</CardTitle>
                  <span className={`font-bold ${item.type === 'addition' ? 'text-green-600' : 'text-red-600'}`}>
                    {item.type === 'addition' ? '+' : '-'}{item.hours} часов
                  </span>
                </div>
                <CardDescription>{new Date(item.date).toLocaleDateString('ru-RU')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p>{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KpdHistory;
