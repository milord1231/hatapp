import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authFetch } from '@/components/authFetch';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface AdminAccess {
  isLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export const useAdminAccess = (): AdminAccess => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    authFetch(`${API_BASE}/api/check-admin`)
      .then(res => {
        if (!res.ok) throw new Error('Not authorized');
        return res.json();
      })
      .then(data => {
        if (data.is_admin) setIsAdmin(true);
        if (data.is_super_admin) setIsSuperAdmin(true);
      })
      .catch(() => {
        //toast.error("Access denied :)");
        //navigate('/');
      })
      .finally(() => setIsLoading(false));
  }, []);

  return { isLoading, isAdmin, isSuperAdmin };
};
