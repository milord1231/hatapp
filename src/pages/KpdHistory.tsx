import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import Cookies from 'js-cookie';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home } from "lucide-react";
import React, { useEffect, useState } from 'react';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { authFetch } from '@/components/authFetch';
const API_BASE = import.meta.env.VITE_API_BASE_URL;
interface KpdHistoryItem {
  id: number;
  user_id: number;
  user: string;
  date: string;
  count: number;
  reason: string;
  who_id: number;
  action: string;
  who_name: string;
}

const KpdHistory = () => {
  const navigate = useNavigate();
  const [historyData, setHistoryData] = useState<KpdHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setAdmin] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Извлекаем userId из GET-параметров URL
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const userId = searchParams.get('userId');

  useEffect(() => {
    if (Cookies.get('admin') === '1') {
          setAdmin(true);
        }
    else{
      if (Cookies.get('user_id') != userId){
      toast.error('Access to another history is denied for you :)');
      navigate(`/kpd-history?userId=${Cookies.get('user_id')}`);}
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      toast.error('Не удалось загрузить историю КПД');
      setError('Пользователь не найден');
      navigate('/profile');
      setLoading(false);
      return;
    }

    const fetchKpdHistory = async () => {
      try {
        const response = await authFetch(`${API_BASE}/api/kpd-history?userId=${userId}`, {
        });

        if (!response.ok) {
          toast.error('Не удалось загрузить историю КПД');
          navigate('/profile');
          throw new Error('Не удалось загрузить историю КПД');
        }

        const data = await response.json();
        setHistoryData(data);
      } catch (error) {
        toast.error(error.message || 'Произошла ошибка при загрузке данных');
        navigate('/profile');
        setError(error.message || 'Произошла ошибка при загрузке данных');
        throw new Error(error.message);

      } finally {
        setLoading(false);
      }
    };

    fetchKpdHistory();
  }, [userId]);

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (error) {
    return <div>Ошибка: {error}</div>;
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
            <Card key={item.id} className={item.action === 'add' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle>{item.action === 'add' ? 'Пополнение' : 'Списание'}</CardTitle>
                  <span className={`font-bold ${item.action === 'add' ? 'text-red-600' : 'text-green-600'}`}>
                    {((item.count**2)**0.5)} часов
                  </span>
                </div>
                <CardDescription>{new Date(item.date).toLocaleDateString('ru-RU')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p>{item.reason}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KpdHistory;
