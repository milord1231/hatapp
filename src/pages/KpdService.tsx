import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { authFetch } from "@/components/authFetch";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Home, FileText, Upload, Download, Plus, Trash2, Edit, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface KPDMeeting {
  id: number;
  dates: string[];
  status: 'draft' | 'active' | 'completed';
  createdAt: string;
  closedAt?: string;
}

interface Violation {
  id: number;
  date: string;
  description: string;
  floor: number;
  block: string;
  room?: string;
  filePath: string;
}

interface AssignedViolation {
  id: string;
  userId: string;
  userName: string;
  violationId: string;
  date: string;
  hours: number;
  confirmed: boolean;
}

interface Resident {
  id: number;
  name: string;
  room: string;
  block: string;
  floor: number;
}

interface UserInfo {
  id: number;
  login: string;
  FIO: string;
  dormNumber: number;
  floor: number;
  block: string;
  room: number;
  contractNumber: number;
  roles: string;
  admin_right: number;
  profile_image: string;
}

export default function KpdService() {
  const [kpdMeetings, setKpdMeetings] = useState<KPDMeeting[]>([]);
  const [currentMeeting, setCurrentMeeting] = useState<KPDMeeting | null>(null);
  const [pastMeetings, setPastMeetings] = useState<KPDMeeting[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [assignedViolations, setAssignedViolations] = useState<any[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [newViolations, setNewViolations] = useState<AssignedViolation[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentUserInfo, setCurrentUserInfo] = useState<UserInfo | null>(null);
  
  const { roles, userId } = useAuth();
  const { isAdmin } = useAdminAccess();
  const isBlockLeader = roles.includes("block_head");

  useEffect(() => {
    loadUserInfo();
    loadKPDData();
    loadResidents();
  }, [userId]);

  const loadUserInfo = async () => {
    if (!userId) return;
    
    try {
      const res = await authFetch(`/api/get-profile-data?userId=${userId}`);
      const data = await res.json();
      
      // Преобразуем данные в ожидаемый формат
      const userInfo: UserInfo = {
        id: userId,
        login: data.username || "",
        FIO: data.fullName || "",
        dormNumber: data.build || 0,
        floor: data.floor || 0,
        block: data.block || "",
        room: data.room || 0,
        contractNumber: 0, // Нужно добавить в API
        roles: data.status || "",
        admin_right: isAdmin ? 1 : 0,
        profile_image: data.profileImage || ""
      };
      
      setCurrentUserInfo(userInfo);
    } catch (error) {
      console.error("Error loading user info:", error);
    }
  };

  const loadKPDData = async () => {
    try {
      const meetingsRes = await authFetch("/api/kpd/meetings");
      const meetingsData = await meetingsRes.json();
      setKpdMeetings(meetingsData);
      
      const activeMeeting = meetingsData.find((m: KPDMeeting) => m.status === 'active');
      setCurrentMeeting(activeMeeting || null);
      
      if (activeMeeting) {
        const violationsRes = await authFetch(`/api/kpd/meetings/${activeMeeting.id}/violations`);
        const violationsData = await violationsRes.json();
        setViolations(violationsData);
        
        const assignmentsRes = await authFetch(`/api/kpd/meetings/${activeMeeting.id}/assignments`);
        const assignmentsData = await assignmentsRes.json();
        setAssignedViolations(assignmentsData);
      }
      
      const past = meetingsData.filter((m: KPDMeeting) => m.status === 'completed');
      setPastMeetings(past);
    } catch (error) {
      console.error("Error loading KPD data:", error);
    }
  };

  const loadResidents = async () => {
    try {
      const res = await authFetch("/api/residents");
      const data = await res.json();
      setResidents(data);
    } catch (error) {
      console.error("Error loading residents:", error);
    }
  };

  // Получаем информацию о текущем блоке пользователя из API
  const userBlock = currentUserInfo?.block || "";
  const userFloor = currentUserInfo?.floor?.toString() || "";

  // Остальные функции остаются без изменений
 // 1. Обновим состояние выбранного файла
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files.length > 0) {
    setSelectedFile(e.target.files[0]);
  }
};

// 2. Перепишем функцию загрузки
const handleFileUpload = async () => {
  if (!selectedFile || !currentMeeting || !isAdmin) {
    console.error("Не выбраны файл или собрание КПД, или пользователь не админ");
    return;
  }

  setIsUploading(true);
  
  try {
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("meeting_id", currentMeeting.id.toString());

    const res = await authFetch("/api/kpd/upload-zip", {
      method: "POST",
      body: formData,
      // Не нужно явно указывать Content-Type для FormData!
      // Браузер сам установит правильный заголовок с boundary
    });

    if (!res.ok) {
      throw new Error(`Ошибка сервера: ${res.status}`);
    }

    const result = await res.json();
    console.log("Файл успешно загружен:", result);
    
    // Обновляем данные после успешной загрузки
    await loadKPDData();
    setSelectedFile(null);
    
  } catch (error) {
    console.error("Ошибка при загрузке файла:", error);
    // Можно добавить уведомление для пользователя
  } finally {
    setIsUploading(false);
  }
};

// 3. В JSX обновим input для файла


  const addNewViolationAssignment = () => {
    setNewViolations([
      ...newViolations,
      {
        id: `temp-${Date.now()}`,
        userId: "",
        userName: "",
        violationId: "",
        date: "",
        hours: 2,
        confirmed: false,
      },
    ]);
  };

  const updateViolationAssignment = (id: string, field: string, value) => {
    setNewViolations(
      newViolations.map((v) => 
        v.id === id ? { ...v, [field]: value } : v
      )
    );
  };

  const removeViolationAssignment = (id: string) => {
    setNewViolations(newViolations.filter((v) => v.id !== id));
  };

  const submitViolationAssignments = async () => {
    if (!currentMeeting) return;

    try {
      const assignments = newViolations.map(v => ({
        violation_id: v.violationId,
        user_id: v.userId,
        hours: v.hours
      }));

      const res = await authFetch(`/api/kpd/meetings/${currentMeeting.id}/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignments }),
      });
      
      if (res.ok) {
        setNewViolations([]);
        await loadKPDData();
      }
    } catch (error) {
      console.error("Error submitting assignments:", error);
    }
  };

  const confirmViolations = async (meetingId: number) => {
    try {
      const res = await authFetch(`/api/kpd/meetings/${meetingId}/confirm`, {
        method: "POST",
      });
      
      if (res.ok) {
        await loadKPDData();
      }
    } catch (error) {
      console.error("Error confirming violations:", error);
    }
  };

  const getBlockViolations = (block: string) => {
    if (!violations.length) return [];
    return violations.filter(
      v => v.block === block || (v.room && v.room.startsWith(`${block}.`))
    );
  };

  const getAssignedViolationsForBlock = (block: string) => {
    if (!assignedViolations.length) return [];
    return assignedViolations.filter((av) => {
      const violation = violations.find(v => v.id === av.violation_id);
      return violation && (violation.block === block || 
             (violation.room && violation.room.startsWith(`${block}.`)));
    });
  };

  const getResidentsForBlock = (block: string) => {
    return residents.filter(r => r.block === block);
  };

  const getUserViolations = () => {
    if (!violations.length) return [];
    return violations.filter(
      v => v.block === userBlock || (v.room && v.room.startsWith(`${userBlock}.`))
    );
  };

const createNewMeeting = async (dates: string[]) => {
  try {
    const res = await authFetch("/api/kpd/meetings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dates }),
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to create meeting");
    }
    
    const data = await res.json();
    console.log("Meeting created:", data);
    await loadKPDData();
    return data;
    
  } catch (error) {
    console.error("Error creating meeting:", error);
    // Можно добавить уведомление об ошибке
    throw error;
  }
};

// Использование:
const handleCreateMeeting = async () => {
  try {
    const dates = ["2023-11-01"]; // Получайте даты из формы
    await createNewMeeting(dates);
    // Уведомление об успехе
  } catch (error) {
    // Обработка ошибки
  }
};

  const activateMeeting = async (meetingId: number) => {
    try {
      const res = await authFetch(`/api/kpd/meetings/${meetingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: 'active' }),
      });
      
      if (res.ok) {
        await loadKPDData();
      }
    } catch (error) {
      console.error("Error activating meeting:", error);
    }
  };

  // Остальная часть компонента остается без изменений
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
              <BreadcrumbPage>КПД</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <Card>
          <CardHeader>
            <CardTitle>Сервис КПД</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="current" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="current">Текущее КПД</TabsTrigger>
                <TabsTrigger value="past">Прошедшие КПД</TabsTrigger>
                {isAdmin && <TabsTrigger value="admin">Администрирование</TabsTrigger>}
              </TabsList>
              
              {/* Текущее КПД */}
              <TabsContent value="current">
                {currentMeeting ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">
                        Текущее заседание КПД ({currentMeeting.dates.join(", ")})
                      </h3>
                      {isAdmin && (
                        <Button onClick={() => confirmViolations(currentMeeting.id)}>
                          <Check className="mr-2 h-4 w-4" />
                          Подтвердить нарушения
                        </Button>
                      )}
                    </div>
                    
                    {isAdmin ? (
                      <div className="space-y-4">
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">Загрузка актов КПД</h4>
                          <div className="flex gap-2">
                            <Input
                                      type="file"
                                      accept=".zip"
                                      onChange={handleFileChange}  // Используем отдельный обработчик
                                      className="max-w-md"
                                    />
                                    <Button 
                                      onClick={handleFileUpload} 
                                      disabled={!selectedFile || isUploading || !currentMeeting}
                                    >
                                      <Upload className="mr-2 h-4 w-4" />
                                      {isUploading ? "Загрузка..." : "Загрузить"}
                                    </Button>
                          </div>
                        </div>
                        
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">Все нарушения по блокам</h4>
                          <Accordion type="multiple" className="w-full">
                            {Array.from({ length: 14 }, (_, i) => i + 1).map((floor) => (
                              <AccordionItem key={`floor-${floor}`} value={`floor-${floor}`}>
                                <AccordionTrigger>{floor} этаж</AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-4">
                                    {Array.from({ length: 8 }, (_, i) => i + 1).map((block) => {
                                      const blockKey = `${floor}.${block}`;
                                      const blockViolations = getBlockViolations(blockKey);
                                      const assignedViolations = getAssignedViolationsForBlock(blockKey);
                                      
                                      if (blockViolations.length === 0) return null;
                                      
                                      return (
                                        <div key={`block-${blockKey}`} className="border rounded-lg p-3">
                                          <h5 className="font-medium mb-2">Блок {blockKey}</h5>
                                          
                                          <div className="mb-4">
                                            <h6 className="text-sm font-medium mb-1">Акт нарушений:</h6>
                                            {blockViolations.map((violation) => (
                                              <div key={`violation-${violation.id}`} className="text-sm text-gray-600">
                                                {violation.date} - {violation.room || `Блок ${violation.block}`}: {violation.description}
                                              </div>
                                            ))}
                                          </div>
                                          
                                          <div>
                                            <h6 className="text-sm font-medium mb-1">Распределенные нарушения:</h6>
                                            {assignedViolations.length > 0 ? (
                                              <Table>
                                                <TableHeader>
                                                  <TableRow>
                                                    <TableHead>Жилец</TableHead>
                                                    <TableHead>Дата</TableHead>
                                                    <TableHead>Комната</TableHead>
                                                    <TableHead>Часы</TableHead>
                                                    <TableHead>Статус</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {assignedViolations.map((av) => {
                                                    const violation = violations.find(v => v.id === av.violation_id);
                                                    const resident = residents.find(r => r.id === av.user_id);
                                                    return (
                                                      <TableRow key={`assignment-${av.id}`}>
                                                        <TableCell>{resident?.name || "Неизвестно"}</TableCell>
                                                        <TableCell>{violation?.date || ""}</TableCell>
                                                        <TableCell>{violation?.room || "Общий"}</TableCell>
                                                        <TableCell>{av.hours}</TableCell>
                                                        <TableCell>{av.confirmed ? "Подтверждено" : "Ожидает"}</TableCell>
                                                      </TableRow>
                                                    );
                                                  })}
                                                </TableBody>
                                              </Table>
                                            ) : (
                                              <div className="text-sm text-gray-500">Нарушения еще не распределены</div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {isBlockLeader && (
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Нарушения вашего блока ({userFloor}.{userBlock})</h4>
                            
                            {getUserViolations().length > 0 ? (
                              <>
                                <div className="mb-4">
                                  <h5 className="text-sm font-medium mb-1">Акт нарушений:</h5>
                                  {getUserViolations().map((violation) => (
                                    <div key={`user-violation-${violation.id}`} className="text-sm text-gray-600 mb-1">
                                      {violation.date} - {violation.room || `Блок ${violation.block}`}: {violation.description}
                                    </div>
                                  ))}
                                </div>
                                
                                <div className="mb-4">
                                  <h5 className="text-sm font-medium mb-2">Распределить нарушения:</h5>
                                  <div className="space-y-3">
                                    {newViolations.map((violation) => (
                                      <div key={`new-violation-${violation.id}`} className="flex gap-2 items-center">
                                        <Select
                                          value={violation.userId}
                                          onValueChange={(value) => {
                                            const resident = residents.find(r => r.id.toString() === value);
                                            updateViolationAssignment(
                                              violation.id,
                                              "userId",
                                              value
                                            );
                                            updateViolationAssignment(
                                              violation.id,
                                              "userName",
                                              resident?.name || ""
                                            );
                                          }}
                                        >
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Выберите жильца" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {getResidentsForBlock(userBlock).map((resident) => (
                                              <SelectItem key={`resident-${resident.id}`} value={resident.id.toString()}>
                                                {resident.name} ({resident.room})
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        
                                        <Select
                                          value={violation.date}
                                          onValueChange={(value) =>
                                            updateViolationAssignment(violation.id, "date", value)
                                          }
                                        >
                                          <SelectTrigger className="w-[120px]">
                                            <SelectValue placeholder="Дата" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {currentMeeting.dates.map((date) => (
                                              <SelectItem key={`date-${date}`} value={date}>
                                                {date}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        
                                        <Select
                                          value={violation.hours.toString()}
                                          onValueChange={(value) =>
                                            updateViolationAssignment(violation.id, "hours", parseInt(value))
                                          }
                                        >
                                          <SelectTrigger className="w-[80px]">
                                            <SelectValue placeholder="Часы" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {[1, 2, 3, 4, 5].map((hours) => (
                                              <SelectItem key={`hours-${hours}`} value={hours.toString()}>
                                                {hours}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => removeViolationAssignment(violation.id)}
                                        >
                                          <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                      </div>
                                    ))}
                                    
                                    <Button
                                      variant="outline"
                                      className="mt-2"
                                      onClick={addNewViolationAssignment}
                                    >
                                      <Plus className="mr-2 h-4 w-4" />
                                      Добавить нарушение
                                    </Button>
                                  </div>
                                </div>
                                
                                <Button onClick={submitViolationAssignments}>
                                  <Check className="mr-2 h-4 w-4" />
                                  Подтвердить распределение
                                </Button>
                              </>
                            ) : (
                              <div className="text-gray-500">Нет нарушений для вашего блока</div>
                            )}
                          </div>
                        )}
                        
                        {!isBlockLeader && (
                          <div>
                            <h4 className="font-medium mb-2">Текущее заседание КПД</h4>
                            <p className="text-gray-600">
                              Информация о нарушениях будет доступна после распределения старостой блока.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">В настоящее время нет активных заседаний КПД</p>
                  </div>
                )}
              </TabsContent>
              
              {/* Прошедшие КПД */}
              <TabsContent value="past">
                <div className="space-y-4">
                  {pastMeetings.length > 0 ? (
                    <div className="space-y-4">
                      {pastMeetings.map((meeting) => (
                        <div key={`past-meeting-${meeting.id}`} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium">
                              Заседание КПД от {new Date(meeting.createdAt).toLocaleDateString()} ({meeting.dates.join(", ")})
                            </h4>
                            {isAdmin && (
                              <Button variant="outline" size="sm">
                                <Download className="mr-2 h-4 w-4" />
                                Скачать все акты
                              </Button>
                            )}
                          </div>
                          
                          {isAdmin ? (
                            <Accordion type="multiple" className="w-full">
                              {Array.from({ length: 14 }, (_, i) => i + 1).map((floor) => (
                                <AccordionItem key={`past-floor-${floor}`} value={`past-floor-${floor}`}>
                                  <AccordionTrigger>{floor} этаж</AccordionTrigger>
                                  <AccordionContent>
                                    <div className="space-y-3">
                                      {Array.from({ length: 8 }, (_, i) => i + 1).map((block) => {
                                        const blockKey = `${floor}.${block}`;
                                        const blockViolations = violations.filter(
                                          (v) => v.block === blockKey || (v.room && v.room.startsWith(`${blockKey}.`))
                                        );
                                        
                                        if (blockViolations.length === 0) return null;
                                        
                                        return (
                                          <div key={`past-block-${blockKey}`} className="border rounded-lg p-3">
                                            <h5 className="font-medium mb-2">Блок {blockKey}</h5>
                                            
                                            <div className="mb-3">
                                              <h6 className="text-sm font-medium mb-1">Акт нарушений:</h6>
                                              {blockViolations.map((violation) => (
                                                <div key={`past-violation-${violation.id}`} className="text-sm text-gray-600">
                                                  {violation.date} - {violation.room || `Блок ${violation.block}`}: {violation.description}
                                                </div>
                                              ))}
                                            </div>
                                            
                                            <div>
                                              <h6 className="text-sm font-medium mb-1">Распределенные нарушения:</h6>
                                              <Table>
                                                <TableHeader>
                                                  <TableRow>
                                                    <TableHead>Жилец</TableHead>
                                                    <TableHead>Дата</TableHead>
                                                    <TableHead>Комната</TableHead>
                                                    <TableHead>Часы</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {assignedViolations
                                                    .filter((av) => {
                                                      const violation = violations.find(v => v.id === av.violation_id);
                                                      return violation && 
                                                        (violation.block === blockKey || 
                                                         (violation.room && violation.room.startsWith(`${blockKey}.`)));
                                                    })
                                                    .map((av) => {
                                                      const violation = violations.find(v => v.id === av.violation_id);
                                                      const resident = residents.find(r => r.id === av.user_id);
                                                      return (
                                                        <TableRow key={`past-assignment-${av.id}`}>
                                                          <TableCell>{resident?.name || "Неизвестно"}</TableCell>
                                                          <TableCell>{violation?.date || ""}</TableCell>
                                                          <TableCell>{violation?.room || "Общий"}</TableCell>
                                                          <TableCell>{av.hours}</TableCell>
                                                        </TableRow>
                                                      );
                                                    })}
                                                </TableBody>
                                              </Table>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          ) : (
                            <div>
                              <h5 className="text-sm font-medium mb-2">Нарушения вашего блока:</h5>
                              {assignedViolations
                                .filter((av) => {
                                  const violation = violations.find(v => v.id === av.violation_id);
                                  return violation && 
                                    (violation.block === userBlock || 
                                     (violation.room && violation.room.startsWith(`${userBlock}.`)));
                                })
                                .map((av) => {
                                  const violation = violations.find(v => v.id === av.violation_id);
                                  return (
                                    <div key={`user-assignment-${av.id}`} className="text-sm text-gray-600 mb-2">
                                      {violation?.date || ""} - {violation?.room || `Блок ${violation?.block}`}: {av.hours} часов
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Нет данных о прошедших заседаниях КПД</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* Администрирование (только для админов) */}
              {isAdmin && (
                <TabsContent value="admin">
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Создать новое КПД</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Даты нарушений (через запятую)</label>
                          <Input 
                            placeholder="Например: 2023-11-01, 2023-11-02" 
                            onChange={(e) => {
                              const dates = e.target.value.split(',').map(d => d.trim());
                              // Здесь можно добавить валидацию дат
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Загрузить акты КПД (.zip)</label>
                          <div className="flex gap-2">
                            <Input 
                              type="file" 
                              accept=".zip" 
                              className="max-w-md" 
                              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            />
                            <Button onClick={handleFileUpload}>
                              <Upload className="mr-2 h-4 w-4" />
                              Загрузить
                            </Button>
                          </div>
                        </div>
                        <Button 
                          className="mt-2"
                          onClick={() => {
                            // Здесь нужно получить даты из input и вызвать createNewMeeting
                            const dates = ["2023-11-01"]; // Временная заглушка
                            createNewMeeting(dates);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Создать КПД
                        </Button>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Предстоящие КПД</h4>
                      <div className="space-y-2">
                        {kpdMeetings
                          .filter(m => m.status === 'draft')
                          .map((meeting) => (
                            <div key={`draft-meeting-${meeting.id}`} className="flex justify-between items-center p-2 border rounded">
                              <div>
                                <h5 className="font-medium">КПД от {new Date(meeting.createdAt).toLocaleDateString()}</h5>
                                <p className="text-sm text-gray-500">Даты нарушений: {meeting.dates.join(", ")}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                  <Edit className="mr-2 h-4 w-4" />
                                  Редактировать
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => activateMeeting(meeting.id)}
                                >
                                  <Check className="mr-2 h-4 w-4" />
                                  Активировать
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}