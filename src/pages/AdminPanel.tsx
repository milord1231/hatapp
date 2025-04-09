import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import Cookies from 'js-cookie';
import { toast } from "sonner";
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

const CollapsibleBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setOpen(!open)}>
          <h2 className="text-xl font-semibold">{title}</h2>
          {open ? <ChevronDown /> : <ChevronRight />}
        </div>
        {open && <div className="mt-4 space-y-2">{children}</div>}
      </CardContent>
    </Card>
  );
};

const AdminPanel = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [hours, setHours] = useState('');
  const [isAdd, setIsAdd] = useState(true);
  const [reasonText, setReasonText] = useState('');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [kpdSearch, setKpdSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Получаем данные пользователей с API
    fetch(`${API_BASE}/api/users`)
      .then(response => response.json())
      .then(data => {
        setUsers(data);
        setFilteredUsers(data);
      });
    // Получаем историю с API
    fetch(`${API_BASE}/api/history`)
      .then(response => response.json())
      .then(data => setHistory(data));

    // Получаем информацию о текущем пользователе, например, через токен
    //toast.error(Cookies.get('admin'));
    if (Cookies.get('admin') == 1) {
      setIsAdmin(true);
    }
    else{
        toast.error("Access denied :)");
        navigate("/");
    }
  }, []);

  useEffect(() => {
    // Фильтрация пользователей по имени в поиске
    setFilteredUsers(
      users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()))
    );
  }, [userSearch, users]);

  useEffect(() => {
    // Фильтрация пользователей для выдачи/списания КПД
    setFilteredUsers(
      users.filter(user => user.name.toLowerCase().includes(kpdSearch.toLowerCase()) || user.username.toLowerCase().includes(kpdSearch.toLowerCase()))
    );
  }, [kpdSearch, users]);

  const handleSubmit = () => {
    if (!selectedUser || !hours || !reasonText || selectedReasons.length === 0) {
        toast.error("Пожалуйста, заполните все обязательные поля.");
      return;
    }

    const action = isAdd ? 'add' : 'subtract';
    fetch(`${API_BASE}/api/kpd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: selectedUser.id,
        hours,
        reason: reasonText,
        action,
        who_id: Cookies.get("user_id"),
      })
    })
    .then(response => response.json())
    .then(data => {
        toast.error(data.message);
      setHours('');
      setReasonText('');
      setSelectedReasons([]);
    });
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setKpdSearch(user.name); // Вставляем имя пользователя в строку поиска
  };

  const handleReasonChange = (reason: string) => {
    setSelectedReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-bold">Админ-панель</h1>

      {/* История КПД */}
      <CollapsibleBlock title="История выданных КПД">
        <ul className="text-sm">
          {history.map(item => (
            <li key={item.id}>
              {item.date} — {item.user} — {item.action === 'add' ? '+' : '-'}{item.count}  [{item.reason}] | Действие: {item.who_name}
            </li>
          ))}
        </ul>
      </CollapsibleBlock>

      {/* Пользователи */}
      <CollapsibleBlock title="Пользователи">
        <Input
          placeholder="Поиск пользователя..."
          value={userSearch}
          onChange={e => setUserSearch(e.target.value)}
        />
        <ul className="max-h-40 overflow-y-auto text-sm">
          {filteredUsers.length > 0
            ? filteredUsers.map(user => (
                <li
                  key={user.id}
                  className="cursor-pointer hover:underline"
                  onClick={() => navigate(`/profile/${user.id}`)}
                >
                  {user.name} ({user.username}) [{user.location}]
                </li>
              ))
            : <li className="text-gray-500">Нет совпадений</li>}
        </ul>
      </CollapsibleBlock>

      {/* Выдача / Списание часов */}
      {isAdmin && (
        <Card>
          <CardContent className="p-4">
            <h2 className="text-xl font-semibold mb-4">Выдача / Списание часов</h2>
            <Input
              placeholder="Введите имя пользователя..."
              value={kpdSearch}
              onChange={e => setKpdSearch(e.target.value)}
            />
            <ul className="max-h-40 overflow-y-auto text-sm mt-2">
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                  <li
                    key={user.id}
                    className="cursor-pointer hover:underline"
                    onClick={() => handleUserSelect(user)} // Выбор пользователя
                  >
                    {user.name} ({user.username}) [{user.location}]
                  </li>
                ))
              ) : (
                <li className="text-gray-500">Нет совпадений</li>
              )}
            </ul>

            {selectedUser && (
              <div className="mt-4">
                <Input
                  placeholder="Количество часов"
                  type="number"
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                />
                <div className="mt-4">
                  <Input
                    placeholder="Причина выдачи КПД (обязательное поле)"
                    value={reasonText}
                    onChange={e => setReasonText(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox
                    checked={selectedReasons.includes('ГРО')}
                    onCheckedChange={() => handleReasonChange('ГРО')}
                  />
                  <label>ГРО</label>
                  <Checkbox
                    checked={selectedReasons.includes('САНКОМ')}
                    onCheckedChange={() => handleReasonChange('САНКОМ')}
                  />
                  <label>САНКОМ</label>
                  <Checkbox
                    checked={selectedReasons.includes('ПРОЧЕЕ')}
                    onCheckedChange={() => handleReasonChange('ПРОЧЕЕ')}
                  />
                  <label>ПРОЧЕЕ</label>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox checked={isAdd} onCheckedChange={val => setIsAdd(!!val)} />
                  <label>{isAdd ? 'Выдать' : 'Списать'} часы</label>
                </div>
                <Button onClick={handleSubmit} className="mt-4">
                  Подтвердить
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminPanel;
