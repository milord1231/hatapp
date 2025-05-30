import Cookies from 'js-cookie';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'react-router-dom';
import { authFetch } from '@/components/authFetch';
import { toast } from "sonner";
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { X, Plus, Check, LogOut } from "lucide-react";
import PushNotification from '@/components/PushNotifications';

interface ProfileData {
  fullName: string;
  status: string;
  build: number;
  floor: number;
  block: number;
  room: number;
  kpdScore: number;
  profileImage: string;
  is_admin: boolean;
}

interface ProfileCardProps {
  profileData: ProfileData;
}

interface StatusType {
  text: string;
  bgColor: string;
  textColor: string;
}

// Predefined role colors and priorities
const roleColors: Record<string, { bg: string; text: string }> = {
  "Комендант": { bg: "rgb(185, 13, 13)", text: "rgb(255, 255, 255)" },
  "Содтрудник общежития": { bg: "rgb(126, 46, 46)", text: "rgb(255, 255, 255)" },
  "Пред-ль Общежития": { bg: "rgb(192, 6, 83)", text: "rgb(255, 255, 255)" },
  "Пред-ль СанКома": { bg: "rgb(112, 45, 76)", text: "rgb(255, 255, 255)" },
  "Командир ГРО": { bg: "rgb(156, 35, 55)", text: "rgb(255, 255, 255)" },
  "Пред-ль КПД": { bg: "rgb(0, 0, 0)", text: "rgb(255, 255, 255)" },
  "Культорг": { bg: "rgb(91, 60, 230)", text: "rgb(255, 255, 255)" },
  "Спорторг": { bg: "rgb(233, 122, 122)", text: "rgb(255, 255, 255)" },
  "Профорг": { bg: "rgb(201, 199, 81)", text: "rgb(255, 255, 255)" },
  "Член ССО": { bg: "rgb(216, 48, 174)", text: "rgb(255, 255, 255)" },
  "ГРО": { bg: "rgb(156, 138, 35)", text: "rgb(255, 255, 255)" },
  "Санка": { bg: "rgb(114, 214, 114)", text: "rgb(255, 255, 255)" },
  "Староста этажа": { bg: "rgb(43, 163, 107)", text: "rgb(255, 255, 255)" },
  "Ответственный за прачечную": { bg: "rgb(85, 123, 247)", text: "rgb(255, 255, 255)" },
  "Ответственный за комп. класс": { bg: "rgb(85, 123, 247)", text: "rgb(255, 255, 255)" },
  "Любимка": { bg: "rgb(21,146,144)", text: "white" },
  "Проживающий": { bg: "rgb(62, 74, 245)", text: "rgb(255, 255, 255)" },
  "Студент КАИ": { bg: "rgb(151, 160, 160)", text: "rgb(204, 206, 206)" },
  default: { bg: "rgb(151, 160, 160)", text: "rgb(204, 206, 206)" },
};

const RoleBadge = ({ role, onDelete = null }) => {
  const color = roleColors[role] || roleColors.default;

  return (
    <div
      style={{ backgroundColor: color.bg, color: color.text }}
      className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium relative group"
    >
      {role}
      {onDelete && (
        <button 
          onClick={() => onDelete(role)} 
          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

const StatusSelector = ({ isOpen, onClose, onAddStatus, existingStatuses }) => {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [customStatus, setCustomStatus] = useState("");
  const [bgColor, setBgColor] = useState("#4B5563");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [showColorPickers, setShowColorPickers] = useState(false);
  const [statusType, setStatusType] = useState("predefined");

  const availableStatuses = Object.keys(roleColors)
    .filter(role => !existingStatuses.includes(role));

  const handleAddStatus = () => {
    if (statusType === "predefined" && selectedStatus) {
      onAddStatus({
        text: selectedStatus,
        bgColor: roleColors[selectedStatus]?.bg || roleColors.default.bg,
        textColor: roleColors[selectedStatus]?.text || roleColors.default.text
      });
    } else if (statusType === "custom" && customStatus) {
      onAddStatus({
        text: customStatus,
        bgColor: bgColor,
        textColor: textColor
      });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить статус</DialogTitle>
        </DialogHeader>
        
        <div className="flex space-x-4 mb-2">
          <button
            className={`px-3 py-1 rounded ${statusType === "predefined" ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setStatusType("predefined")}
          >
            Существующий
          </button>
          <button
            className={`px-3 py-1 rounded ${statusType === "custom" ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setStatusType("custom")}
          >
            Новый
          </button>
        </div>

        {statusType === "predefined" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {availableStatuses.map(status => (
                <div 
                  key={status}
                  className={`cursor-pointer p-2 border rounded hover:bg-gray-100 ${selectedStatus === status ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedStatus(status)}
                >
                  <RoleBadge role={status} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Название статуса</label>
              <Input 
                value={customStatus} 
                onChange={(e) => setCustomStatus(e.target.value)}
                placeholder="Введите название статуса" 
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <button 
                className="text-sm text-blue-600 underline" 
                onClick={() => setShowColorPickers(!showColorPickers)}
              >
                {showColorPickers ? "Скрыть настройки цвета" : "Настроить цвета"}
              </button>
            </div>
            
            {showColorPickers && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Цвет фона</label>
                  <div className="relative">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-10 h-10 rounded border cursor-pointer"
                        style={{ backgroundColor: bgColor }}
                      ></div>
                      <Input 
                        type="color"
                        value={bgColor} 
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-10 h-10 p-0 overflow-hidden cursor-pointer"
                      />
                    </div>
                    <Input 
                      value={bgColor} 
                      onChange={(e) => setBgColor(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Цвет текста</label>
                  <div className="relative">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: textColor }}
                      ></div>
                      <Input 
                        type="color"
                        value={textColor} 
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-10 h-10 p-0 overflow-hidden"
                        style={{ padding: 0, cursor: 'pointer' }}
                      />
                    </div>
                    <Input 
                      value={textColor} 
                      onChange={(e) => setTextColor(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Предпросмотр</label>
              <div
                style={{ backgroundColor: bgColor, color: textColor }}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
              >
                {customStatus || "Предпросмотр"}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleAddStatus} disabled={(statusType === "predefined" && !selectedStatus) || (statusType === "custom" && !customStatus)}>
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CustomCheckbox = ({ checked, onChange, label }) => {
  return (
    <label className="flex items-center space-x-2 cursor-pointer group">
      <div className={`w-5 h-5 flex items-center justify-center rounded border transition-all ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'}`}>
        {checked && <Check size={16} className="text-white" />}
      </div>
      <span className="text-sm">{label}</span>
    </label>
  );
};

const ProfileCard: React.FC<ProfileCardProps> = ({ profileData }) => {
  const { logout } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const [editMode, setEditMode] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  
  // Состояния для запроса изменений (для не-админов)
  const [newBuild, setNewBuild] = useState("");
  const [newFloor, setNewFloor] = useState("");
  const [newBlock, setNewBlock] = useState("");
  const [newRoom, setNewRoom] = useState("");
  
  // Parse statuses into array of status objects
  const parseStatuses = (statusString) => {
    if (!statusString) return [];
    
    try {
      return statusString.split(',').map(status => {
        const trimmedStatus = status.trim();
        const color = roleColors[trimmedStatus] || roleColors.default;
        return {
          text: trimmedStatus,
          bgColor: color.bg,
          textColor: color.text
        };
      });
    } catch (error) {
      console.error("Error parsing statuses:", error);
      return [];
    }
  };
  
  // Stringify statuses into comma-separated string
  const stringifyStatuses = (statusArray) => {
    if (!statusArray || !statusArray.length) return '';
    return statusArray.map(status => status.text).join(', ');
  };
  
  const [editableData, setEditableData] = useState<ProfileData & { statuses: StatusType[] }>({
    ...profileData,
    statuses: parseStatuses(profileData.status)
  });

  const { isLoading, isAdmin, isSuperAdmin } = useAdminAccess();

  useEffect(() => {
    if (isLoading) return;
    setEditableData({
      ...profileData,
      statuses: parseStatuses(profileData.status)
    });
  }, [profileData, isLoading]);

  useEffect(() => {
    if (editMode) {
      setEditableData({
        ...profileData,
        statuses: parseStatuses(profileData.status)
      });
    }
  }, [editMode, profileData]);

  const handleSave = async () => {
    try {
      const statusString = stringifyStatuses(editableData.statuses);
      
      const residenceResponse = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/api/user/${Cookies.get("user_id")}/residence`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json'
        },
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
  
      const statusResponse = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/api/user/${Cookies.get("user_id")}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: statusString,
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

  const handleDeleteStatus = (statusToDelete) => {
    setEditableData({
      ...editableData,
      statuses: editableData.statuses.filter(status => status.text !== statusToDelete)
    });
  };

  const handleAddStatus = (newStatus) => {
    setEditableData({
      ...editableData,
      statuses: [...editableData.statuses, newStatus]
    });
  };

  // Функция для отправки запроса на изменение (для не-админов)
  const handleSendRequest = async () => {
    const userId = Cookies.get("user_id");
    const payload = {
      user_id: Number(userId),
      old_build: profileData.build,
      old_floor: profileData.floor,
      old_block: profileData.block,
      old_room: profileData.room,
      new_build: Number(newBuild),
      new_floor: Number(newFloor),
      new_block: Number(newBlock),
      new_room: Number(newRoom),
      requests: []
    };
  
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/change-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${Cookies.get("access_token")}`
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });
  
      if (res.ok) {
        toast.info("Запрос отправлен. Ожидайте подтверждения.");
        setNewBuild(""); 
        setNewFloor(""); 
        setNewBlock(""); 
        setNewRoom("");
      } else {
        toast.error("Ошибка. Не удалось отправить запрос");
      }
    } catch (err) {
      toast.error("Ошибка сети. Проверьте соединение");
    }
  };

  return (
    <Card className="shadow-md relative">
      <CardHeader className="bg-gray-50 border-b flex flex-row justify-between items-center">
        <CardTitle className="text-xl">Информация профиля</CardTitle>
        
        {/* Правая часть заголовка с уведомлениями, админ-панелью и выходом */}
        <div className="flex items-center space-x-2">
          <PushNotification />
          
          {isAdmin && !editMode && (
            <>
              <NavLink to="/admin">
                <Button size="sm" variant="outline">Админ-панель</Button>
              </NavLink>
              <Button size="sm" onClick={() => setEditMode(true)}>Редактировать</Button>
            </>
          )}
          
          {editMode && (
            <Button size="sm" onClick={handleSave}>Сохранить</Button>
          )}
          
          <NavLink to="/login">
            <Button 
              onClick={logout} 
              variant="outline" 
              size="sm" 
              className="bg-white hover:bg-red-50 text-red-500 border-red-200 hover:border-red-300 transition-colors"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Выйти
            </Button>
          </NavLink>
        </div>
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
              <div>
                <div className="flex flex-wrap gap-2">
                  {editableData.statuses.map((status, index) => (
                    <RoleBadge 
                      key={index} 
                      role={status.text} 
                      onDelete={handleDeleteStatus} 
                    />
                  ))}
                  <button 
                    onClick={() => setStatusDialogOpen(true)}
                    className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-gray-200 hover:bg-gray-300 text-gray-700"
                  >
                    <Plus size={14} className="mr-1" /> Добавить
                  </button>
                </div>
                <StatusSelector 
                  isOpen={statusDialogOpen}
                  onClose={() => setStatusDialogOpen(false)}
                  onAddStatus={handleAddStatus}
                  existingStatuses={editableData.statuses.map(s => s.text)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {parseStatuses(profileData.status).map((status, index) => (
                    <div
                      key={index}
                      style={{ backgroundColor: status.bgColor, color: status.textColor }}
                      className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {status.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-sm text-gray-500">КПД</p>
            <div className="flex items-center">
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full ${
                  editableData.kpdScore === 0 ? 'bg-green-500' : 
                  editableData.kpdScore <= 10 ? 'bg-yellow-500' : 
                  editableData.kpdScore <= 25 ? 'bg-orange-500' : 
                  'bg-red-500'
                } mr-2`}></div>
                <span className="font-medium">{profileData.kpdScore}</span>
              </div>
              <NavLink to={`/kpd-history?userId=${userId || Cookies.get('user_id')}`} className="ml-3 text-sm text-blue-600 hover:underline">
                История
              </NavLink>
            </div>
            
            {/* Мотивационные сообщения */}
            {profileData.kpdScore <= 0 && <span className="font-medium text-green-700">Ты молодец!</span>}
            {profileData.kpdScore > 0 && profileData.kpdScore <= 10 && <span className="font-medium text-yellow-500">Не всё так плохо, не грусти</span>}
            {profileData.kpdScore > 10 && profileData.kpdScore <= 25 && <span className="font-medium text-orange-500">Всё поправимо...</span>}
            {profileData.kpdScore > 25 && <span className="font-medium text-red-500">Э о а э... мяу.</span>}
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
              <div className="space-y-2">
                <div className="font-medium">
                  <p>Общежитие №{profileData.build}, Этаж {profileData.floor}</p>
                  <p>Блок {profileData.block}, Комната {profileData.room}</p>
                </div>
                
                {/* Кнопка запроса изменений для не-админов */}
                {!isAdmin && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="mt-2" variant="outline" size="sm">
                        Запросить изменения
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Изменение места проживания</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div>
                          <Label>Здание</Label>
                          <Input type="number" value={newBuild} onChange={e => setNewBuild(e.target.value)} />
                        </div>
                        <div>
                          <Label>Этаж</Label>
                          <Input type="number" value={newFloor} onChange={e => setNewFloor(e.target.value)} />
                        </div>
                        <div>
                          <Label>Блок</Label>
                          <Input type="number" value={newBlock} onChange={e => setNewBlock(e.target.value)} />
                        </div>
                        <div>
                          <Label>Комната</Label>
                          <Input type="number" value={newRoom} onChange={e => setNewRoom(e.target.value)} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleSendRequest}>Отправить</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}
          </div>
        </div>

        {isSuperAdmin && editMode && (
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Админ</p>
            <CustomCheckbox
              checked={editableData.is_admin}
              onChange={() => setEditableData({ ...editableData, is_admin: !editableData.is_admin })}
              label="Назначить админом"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileCard;