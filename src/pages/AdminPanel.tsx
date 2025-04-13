import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import Cookies from 'js-cookie';
import { toast } from "sonner";
import { authFetch } from '@/components/authFetch';
import { useAdminAccess } from '@/hooks/useAdminAccess';




const API_BASE = import.meta.env.VITE_API_BASE_URL;
interface User {
  id: number;
  name: string;
  username: string;
  location: string;
  role: string;
}

interface HistoryItem {
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

interface ChangeRequest {
  id: number;
  user: User;
  build: number;
  floor: number;
  block: number;
  room: number;
  status: 'in_progress' | 'close' | 'delete';  // Статус запроса
  createdAt: string; // Дата создания запроса
  username: string;
  user_id: number;
}


const CollapsibleBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setOpen(!open)}>
          <h2 className="text-xl font-semibold">{title}</h2>
          {open ? <ChevronDown /> : <ChevronRight />}
        </div>
        {open && <div className="mt-4 space-y-2 max-h-96 overflow-y-auto pr-2">{children}</div>}
      </CardContent>
    </Card>
  );
};




const AdminPanel = () => {

  const { isLoading, isAdmin, isSuperAdmin } = useAdminAccess();

  const [users, setUsers] = useState<User[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [hours, setHours] = useState('');
  const [isAdd, setIsAdd] = useState(true);
  const [reasonText, setReasonText] = useState('');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [kpdSearch, setKpdSearch] = useState('');
  const navigate = useNavigate();
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);




  useEffect(() => {
    if (isLoading) return;}, [])


  useEffect(() => {
    authFetch(`${API_BASE}/api/users`).then(res => res.json()).then(setUsers);
    authFetch(`${API_BASE}/api/history`).then(res => res.json()).then(setHistory);

    
    
  }, []);

  useEffect(() => {
    setFilteredUsers(users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase())));
  }, [userSearch, users]);

  useEffect(() => {
    setFilteredUsers(users.filter(user => user.name.toLowerCase().includes(kpdSearch.toLowerCase()) || user.username.toLowerCase().includes(kpdSearch.toLowerCase())));
  }, [kpdSearch, users]);

  const handleSubmit = () => {
    if (!selectedUser || !hours || !reasonText || selectedReasons.length === 0) {
      toast.error("Пожалуйста, заполните все обязательные поля.");
      return;
    }
    authFetch(`${API_BASE}/api/kpd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${Cookies.get("access_token")}` },
      body: JSON.stringify({
        user_id: selectedUser.id,
        hours,
        reason: reasonText,
        action: isAdd ? 'add' : 'subtract',
        who_id: Cookies.get("user_id"),
      })
    }).then(res => res.json()).then(data => {
      toast.error(data.message);
      setHours('');
      setReasonText('');
      setSelectedReasons([]);
    });
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setKpdSearch(user.name);
  };

  const handleReasonChange = (reason: string) => {
    setSelectedReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };


  useEffect(() => {
    authFetch(`${API_BASE}/api/change-request`).then(res => res.json()).then(setChangeRequests);
    
  }, []);

  const handleRequestAction = (requestId: number, action: 'close' | 'in_proccess' | 'delete') => {

    if (action == "delete"){
      authFetch(`${API_BASE}/api/change-request/delete/${requestId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${Cookies.get("access_token")}` },
        body: JSON.stringify({ status: action })
      }).then(res => res.json()).then(updatedRequest => {
        setChangeRequests(prevRequests =>
          prevRequests.map(request =>
            request.id === updatedRequest.id ? updatedRequest : request
          )
        );
      });
    }

    else{

    // Обработать действия над запросом (закрыть или вернуть в процесс)
    authFetch(`${API_BASE}/api/change-request/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${Cookies.get("access_token")}` },
      body: JSON.stringify({ status: action })
    }).then(res => res.json()).then(updatedRequest => {
      setChangeRequests(prevRequests =>
        prevRequests.map(request =>
          request.id === updatedRequest.id ? updatedRequest : request
        )
      );
    });
  };
  };




  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-bold">Админ-панель</h1>

      {/* Запросы на изменения */}
      <CollapsibleBlock title="Запросы на изменения (В процессе)">
        {changeRequests.filter(request => request.status === 'in_progress').map(request => (
          <Card key={request.id} className="cursor-pointer" onClick={() => navigate(`/profile/${request.user_id}`)}>
            <CardContent className="p-2">
              <div><b>{request.username}</b> [{request.user_id}] запросил изменение.</div>
              <div><i>{request.floor}.{request.block}.{request.room}</i></div>
              <div className="text-gray-600">{request.createdAt}</div>
              <Button onClick={() => handleRequestAction(request.id, 'close')}>Закрыть запрос</Button>
              <Button onClick={() => handleRequestAction(request.id, 'delete')}>Удалить</Button>
            </CardContent>
          </Card>
        ))}
      </CollapsibleBlock>

      <CollapsibleBlock title="Запросы на изменения (Закрытые)">
        {changeRequests.filter(request => request.status === 'close').map(request => (
          <Card key={request.id} className="cursor-pointer" onClick={() => navigate(`/profile/${request.user_id}`)}>
            <CardContent className="p-2">
              <div><b>{request.username}</b> [{request.user_id}] запрос завершен.</div>
              <div><i>{request.floor}.{request.block}.{request.room}</i></div>
              <div className="text-gray-600">{request.createdAt}</div>
            </CardContent>
          </Card>
        ))}
      </CollapsibleBlock>


      {/* История КПД */}
      <CollapsibleBlock title="История выданных КПД">
        {history.map(item => (
          <Card key={item.id} className="text-sm">
            <CardContent className="p-3 space-y-1">
              <div><b>{item.user}</b> ({item.action === 'add' ? '+' : '-'}{item.count} ч)</div>
              <div className="text-gray-600">{item.reason}</div>
              <div className="text-xs text-gray-500">{item.date} — {item.who_name}</div>
            </CardContent>
          </Card>
        ))}
      </CollapsibleBlock>

      {/* Пользователи */}
      <CollapsibleBlock title="Пользователи">
        <Input placeholder="Поиск пользователя..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
        {filteredUsers.length > 0 ? filteredUsers.map(user => (
          <Card key={user.id} onClick={() => navigate(`/profile/${user.id}`)} className="cursor-pointer hover:shadow-md transition">
            <CardContent className="p-2 text-sm">
              {user.name} ({user.username}) [{user.location}]
            </CardContent>
          </Card>
        )) : <div className="text-gray-500 text-sm">Нет совпадений</div>}
      </CollapsibleBlock>

      {/* Выдача / Списание часов */}
      {isSuperAdmin && (
          <CollapsibleBlock title="Выдача / Списание часов">
        
        <Card>

          <CardContent className="p-4 space-y-3">
            <Input placeholder="Введите имя пользователя..." value={kpdSearch} onChange={e => setKpdSearch(e.target.value)} />
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filteredUsers.map(user => (
                <Card key={user.id} onClick={() => handleUserSelect(user)} className="cursor-pointer hover:shadow-md transition text-sm">
                  <CardContent className="p-2">
                    {user.name} ({user.username}) [{user.location}]
                  </CardContent>
                </Card>
              ))}
            </div>
            {selectedUser && (
              <>
                <Input placeholder="Количество часов" type="number" value={hours} onChange={e => setHours(e.target.value)} />
                <Input placeholder="Причина выдачи КПД (обязательное поле)" value={reasonText} onChange={e => setReasonText(e.target.value)} />
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox checked={selectedReasons.includes('ГРО')} onCheckedChange={() => handleReasonChange('ГРО')} />
                  <label>ГРО</label>
                  <Checkbox checked={selectedReasons.includes('САНКОМ')} onCheckedChange={() => handleReasonChange('САНКОМ')} />
                  <label>САНКОМ</label>
                  <Checkbox checked={selectedReasons.includes('ПРОЧЕЕ')} onCheckedChange={() => handleReasonChange('ПРОЧЕЕ')} />
                  <label>ПРОЧЕЕ</label>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox checked={isAdd} onCheckedChange={val => setIsAdd(!!val)} />
                  <label>{isAdd ? 'Выдать' : 'Списать'} часы</label>
                </div>
                <Button onClick={handleSubmit} className="mt-2">Подтвердить</Button>
              </>
            )}

          </CardContent>


        </Card>
        </CollapsibleBlock>

      )}
    </div>
  );
};

export default AdminPanel;
