// KpdService.tsx (исправленный)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react"; // Добавлен useCallback
import { authFetch } from "@/components/authFetch";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Home, FileText, Upload, Download, Plus, Trash2, Edit, Check, Calendar, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
const API_BASE = import.meta.env.VITE_API_BASE_URL;
// --- Интерфейсы для типизации данных ---
interface KPDMeeting {
  id: number;
  dates: string[]; // YYYY-MM-DD
  status: 'draft' | 'active' | 'completed';
  createdAt: string; // ISO string
  closedAt?: string; // ISO string
}

interface Violation {
  id: number;
  meetingId: number;
  date: string; // YYYY-MM-DD
  description: string;
  floor: number;
  block: string; // e.g., "6.5"
  room?: string; // e.g., "6.5.1"
  filePath: string;
}

interface AssignedViolation {
  id: number;
  violationId: number;
  userId: number;
  assignedById: number;
  hours: number;
  confirmed: boolean;
  createdAt: string; // ISO string
}

interface Resident {
  id: number;
  name: string;
  login: string;
  room: string; // e.g., "6.5.1"
  block: string; // e.g., "6.5"
  floor: number;
}

interface UserInfo {
  id: number;
  login: string;
  FIO: string;
  dormNumber: number;
  floor: number;
  block: string; // e.g., "6.5"
  room: number;
  contractNumber: number;
  roles: string;
  admin_right: number;
  profile_image: string;
}

// Новый тип для формы назначения нарушений
interface NewViolationAssignment {
  id: string; // Временный ID для новых записей
  violationId: number;
  userId: number | null;
  date: string; // YYYY-MM-DD
  hours: number;
}

// Тип для значения, передаваемого в updateViolationAssignment
type AssignmentValue = string | number | null | boolean;

export default function KpdService() {
  // --- Состояния ---
  const [kpdMeetings, setKpdMeetings] = useState<KPDMeeting[]>([]);
  const [currentMeeting, setCurrentMeeting] = useState<KPDMeeting | null>(null);
  const [pastMeetings, setPastMeetings] = useState<KPDMeeting[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [assignedViolations, setAssignedViolations] = useState<AssignedViolation[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [newViolations, setNewViolations] = useState<NewViolationAssignment[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentUserInfo, setCurrentUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Для вкладки администратора
  const [newMeetingDates, setNewMeetingDates] = useState<string[]>([]);
  const [newMeetingDateInput, setNewMeetingDateInput] = useState<string>("");
  const [newMeetingTime, setNewMeetingTime] = useState<string>("12:00"); // HH:mm

  const { roles, userId } = useAuth();
  const { isAdmin } = useAdminAccess();
  const isBlockLeader = roles.includes("block_head");

  // --- Функции загрузки данных (обернуты в useCallback) ---
  const loadUserInfo = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await authFetch(`${API_BASE}/api/get-profile-data?userId=${userId}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      
      const userInfo: UserInfo = {
        id: userId,
        login: data.username || "",
        FIO: data.fullName || "",
        dormNumber: data.build || 0,
        floor: data.floor || 0,
        block: data.block || "",
        room: data.room || 0,
        contractNumber: 0,
        roles: data.status || "",
        admin_right: isAdmin ? 1 : 0,
        profile_image: data.profileImage || ""
      };
      setCurrentUserInfo(userInfo);
    } catch (error: unknown) { // Исправлено: any -> unknown
      console.error("Error loading user info:", error);
      // Можно дополнительно обработать ошибку, если она является экземпляром Error
      if (error instanceof Error) {
          toast({
            title: "Ошибка загрузки профиля",
            description: error.message,
            variant: "destructive",
          });
      } else {
          toast({
            title: "Ошибка загрузки профиля",
            description: "Произошла неизвестная ошибка.",
            variant: "destructive",
          });
      }
      // Не перебрасываем ошибку, так как она обрабатывается здесь
    }
  }, [userId, isAdmin]); // Зависимости useCallback

  const loadKPDData = useCallback(async () => {
    try {
      const meetingsRes = await authFetch(`${API_BASE}/api/kpd/meetings`);
      if (!meetingsRes.ok) throw new Error(`HTTP error! status: ${meetingsRes.status}`);
      const meetingsData: KPDMeeting[] = await meetingsRes.json();
      setKpdMeetings(meetingsData);

      const activeMeeting = meetingsData.find((m) => m.status === 'active');
      setCurrentMeeting(activeMeeting || null);

      if (activeMeeting) {
        const [violationsRes, assignmentsRes] = await Promise.all([
          authFetch(`${API_BASE}/api/kpd/meetings/${activeMeeting.id}/violations`),
          authFetch(`${API_BASE}/api/kpd/meetings/${activeMeeting.id}/assignments`)
        ]);

        if (!violationsRes.ok) throw new Error(`HTTP error! status: ${violationsRes.status}`);
        if (!assignmentsRes.ok) throw new Error(`HTTP error! status: ${assignmentsRes.status}`);

        const violationsData: Violation[] = await violationsRes.json();
        const assignmentsData: AssignedViolation[] = await assignmentsRes.json();

        setViolations(violationsData);
        setAssignedViolations(assignmentsData);
      }

      const past = meetingsData.filter((m) => m.status === 'completed');
      setPastMeetings(past);
    } catch (error: unknown) { // Исправлено: any -> unknown
      console.error("Error loading KPD data:", error);
      if (error instanceof Error) {
          toast({
            title: "Ошибка загрузки КПД",
            description: error.message,
            variant: "destructive",
          });
      } else {
          toast({
            title: "Ошибка загрузки КПД",
            description: "Произошла неизвестная ошибка.",
            variant: "destructive",
          });
      }
    }
  }, []); // Зависимости useCallback (authFetch должно быть стабильным)

  const loadResidents = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/api/residents`); // Предполагаем, что этот эндпоинт существует
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data: Resident[] = await res.json();
      setResidents(data);
    } catch (error: unknown) { // Исправлено: any -> unknown
      console.error("Error loading residents:", error);
      if (error instanceof Error) {
          toast({
            title: "Ошибка загрузки жильцов",
            description: error.message,
            variant: "destructive",
          });
      } else {
          toast({
            title: "Ошибка загрузки жильцов",
            description: "Произошла неизвестная ошибка.",
            variant: "destructive",
          });
      }
    }
  }, []); // Зависимости useCallback (authFetch должно быть стабильным)

  // --- Эффекты ---
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all([
          loadUserInfo(),
          loadKPDData(),
          loadResidents()
        ]);
      } catch (err: unknown) { // Исправлено: any -> unknown
        console.error("Ошибка при загрузке данных:", err);
        setError("Не удалось загрузить данные. Попробуйте позже.");
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить данные.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      loadData();
    }
  }, [userId, loadUserInfo, loadKPDData, loadResidents]); // Исправлено: добавлены зависимости useCallback

  // --- Вспомогательные функции ---
  const getUserBlock = () => currentUserInfo?.block || "";
  const getUserFloor = () => currentUserInfo?.floor || 0;

  const getBlockViolations = (block: string) => {
    return violations.filter(
      v => v.block === block || (v.room && v.room.startsWith(`${block}.`))
    );
  };

  const getAssignedViolationsForBlock = (block: string) => {
    return assignedViolations.filter((av) => {
      const violation = violations.find(v => v.id === av.violationId);
      return violation && (violation.block === block || 
             (violation.room && violation.room.startsWith(`${block}.`)));
    });
  };

  const getResidentsForBlock = (block: string) => {
    return residents.filter(r => r.block === block);
  };

  const getUserViolations = () => {
    const userBlock = getUserBlock();
    return violations.filter(
      v => v.block === userBlock || (v.room && v.room.startsWith(`${userBlock}.`))
    );
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) {
        return "Дата не указана";
    }

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            throw new Error("Invalid date");
        }
        return format(date, 'dd.MM.yyyy', { locale: ru });
    } catch (error) {
        console.error("Ошибка при форматировании даты:", error);
        return "Ошибка формата даты";
    }
};

  // --- Функции для взаимодействия с API ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !currentMeeting || !isAdmin) {
      toast({
        title: "Ошибка",
        description: "Файл не выбран, собрание не активно или у вас нет прав администратора.",
        variant: "destructive",
      });
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("meeting_id", currentMeeting.id.toString());

      const res = await authFetch(`${API_BASE}/api/kpd/upload-zip`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Ошибка сервера: ${res.status}`);
      }

      const result = await res.json();
      console.log("Файл успешно загружен:", result);
      toast({
        title: "Успех",
        description: "Файлы успешно загружены и обработаны.",
      });
      await loadKPDData(); // Перезагружаем данные
      setSelectedFile(null);
    } catch (error: unknown) { // Исправлено: any -> unknown
      console.error("Ошибка при загрузке файла:", error);
      let errorMessage = "Произошла ошибка при загрузке файла.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Ошибка загрузки",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const addNewViolationAssignment = () => {
    const userViolations = getUserViolations();
    if (userViolations.length === 0) {
      toast({
        title: "Нет нарушений",
        description: "Нет нарушений для распределения.",
        variant: "destructive",
      });
      return;
    }

    const defaultViolation = userViolations[0];
    setNewViolations([
      ...newViolations,
      {
        id: `temp-${Date.now()}`,
        violationId: defaultViolation.id,
        userId: null,
        date: defaultViolation.date,
        hours: 2,
      },
    ]);
  };

  const updateViolationAssignment = (id: string, field: keyof NewViolationAssignment, value: AssignmentValue) => { // Исправлено: any -> AssignmentValue
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
    if (!currentMeeting || newViolations.length === 0) {
      toast({
        title: "Ошибка",
        description: "Нет активного собрания или нарушений для отправки.",
        variant: "destructive",
      });
      return;
    }

    // Валидация: все поля должны быть заполнены
    const isValid = newViolations.every(v => v.userId !== null && v.date && v.hours > 0);
    if (!isValid) {
      toast({
        title: "Ошибка валидации",
        description: "Пожалуйста, заполните все поля для каждого нарушения.",
        variant: "destructive",
      });
      return;
    }

    try {
      const assignments = newViolations.map(v => ({
        violation_id: v.violationId,
        user_id: v.userId,
        hours: v.hours
      }));

      const res = await authFetch(`${API_BASE}/api/kpd/meetings/${currentMeeting.id}/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignments }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Ошибка сервера: ${res.status}`);
      }

      const result = await res.json();
      console.log("Назначения успешно отправлены:", result);
      toast({
        title: "Успех",
        description: "Нарушения успешно распределены.",
      });
      setNewViolations([]); // Очищаем форму
      await loadKPDData(); // Перезагружаем данные
    } catch (error: unknown) { // Исправлено: any -> unknown
      console.error("Error submitting assignments:", error);
      let errorMessage = "Произошла ошибка при отправке назначений.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Ошибка отправки",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const confirmViolations = async (meetingId: number) => {
    if (!isAdmin) {
      toast({
        title: "Ошибка",
        description: "У вас нет прав для подтверждения нарушений.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await authFetch(`${API_BASE}/api/kpd/meetings/${meetingId}/confirm`, {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Ошибка сервера: ${res.status}`);
      }

      const result = await res.json();
      console.log("Нарушения подтверждены:", result);
      toast({
        title: "Успех",
        description: "Нарушения подтверждены и часы выданы.",
      });
      await loadKPDData(); // Перезагружаем данные
    } catch (error: unknown) { // Исправлено: any -> unknown
      console.error("Error confirming violations:", error);
      let errorMessage = "Произошла ошибка при подтверждении нарушений.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Ошибка подтверждения",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const createNewMeeting = async () => {
    if (!isAdmin || newMeetingDates.length === 0) {
      toast({
        title: "Ошибка",
        description: "Укажите даты собрания или у вас нет прав администратора.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await authFetch(`${API_BASE}/api/kpd/meetings`, {
        method: "POST",
        body: JSON.stringify({ dates: newMeetingDates }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Ошибка сервера: ${res.status}`);
      }

      const data = await res.json();
      console.log("Meeting created:", data);
      toast({
        title: "Успех",
        description: "Новое собрание КПД создано.",
      });
      setNewMeetingDates([]); // Очищаем форму
      setNewMeetingDateInput("");
      await loadKPDData(); // Перезагружаем данные
    } catch (error: unknown) { // Исправлено: any -> unknown
      console.error("Error creating meeting:", error);
      let errorMessage = "Произошла ошибка при создании собрания.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Ошибка создания",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const addDateToNewMeeting = () => {
    if (newMeetingDateInput && !newMeetingDates.includes(newMeetingDateInput)) {
      setNewMeetingDates([...newMeetingDates, newMeetingDateInput]);
      setNewMeetingDateInput("");
    }
  };

  const removeDateFromNewMeeting = (date: string) => {
    setNewMeetingDates(newMeetingDates.filter(d => d !== date));
  };

  const activateMeeting = async (meetingId: number) => {
    if (!isAdmin) {
      toast({
        title: "Ошибка",
        description: "У вас нет прав для активации собрания.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await authFetch(`${API_BASE}/api/kpd/meetings/${meetingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: 'active' }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Ошибка сервера: ${res.status}`);
      }

      const result = await res.json();
      console.log("Meeting activated:", result);
      toast({
        title: "Успех",
        description: "Собрание КПД активировано.",
      });
      await loadKPDData(); // Перезагружаем данные
    } catch (error: unknown) { // Исправлено: any -> unknown
      console.error("Error activating meeting:", error);
      let errorMessage = "Произошла ошибка при активации собрания.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Ошибка активации",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // --- Рендеринг ---
  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Загрузка...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500">{error}</div>;
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
                        Текущее заседание КПД ({currentMeeting.dates.map(formatDate).join(", ")})
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
                        {/* Загрузка актов КПД */}
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">Загрузка актов КПД</h4>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              type="file"
                              accept=".zip"
                              onChange={handleFileChange}
                              className="flex-grow"
                              disabled={isUploading}
                            />
                            <Button 
                              onClick={handleFileUpload} 
                              disabled={!selectedFile || isUploading}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              {isUploading ? "Загрузка..." : "Загрузить"}
                            </Button>
                          </div>
                        </div>

                        {/* Все нарушения по блокам для админа */}
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">Все нарушения по блокам</h4>
                          <Accordion type="multiple" className="w-full">
                            {Array.from({ length: 14 }, (_, i) => i + 1).map((floor) => (
                              <AccordionItem key={`floor-${floor}`} value={`floor-${floor}`}>
                                <AccordionTrigger>{floor} этаж</AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-4">
                                    {Array.from({ length: 8 }, (_, i) => i + 1).map((blockNum) => {
                                      const blockKey = `${floor}.${blockNum}`;
                                      const blockViolations = getBlockViolations(blockKey);
                                      const assignedViolationsForBlock = getAssignedViolationsForBlock(blockKey);
                                      
                                      if (blockViolations.length === 0) return null;
                                      
                                      return (
                                        <div key={`block-${blockKey}`} className="border rounded-lg p-3">
                                          <h5 className="font-medium mb-2">Блок {blockKey}</h5>
                                          
                                          {/* Акт нарушений */}
                                          <div className="mb-4">
                                            <h6 className="text-sm font-medium mb-1">Акт нарушений:</h6>
                                            {blockViolations.map((violation) => (
                                              <div key={`violation-${violation.id}`} className="text-sm text-gray-600 mb-1 flex justify-between items-start">
                                                <span>
                                                  {formatDate(violation.date)} - {violation.room || `Блок ${violation.block}`}: {violation.description}
                                                </span>
                                                <Button variant="ghost" size="sm" className="p-1 h-auto">
                                                  <Download className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            ))}
                                          </div>

                                          {/* Распределенные нарушения */}
                                          <div>
                                            <h6 className="text-sm font-medium mb-1">Распределенные нарушения:</h6>
                                            {assignedViolationsForBlock.length > 0 ? (
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
                                                  {assignedViolationsForBlock.map((av) => {
                                                    const violation = violations.find(v => v.id === av.violationId);
                                                    const resident = residents.find(r => r.id === av.userId);
                                                    return (
                                                      <TableRow key={`assignment-${av.id}`}>
                                                        <TableCell>{resident?.name || "Неизвестно"}</TableCell>
                                                        <TableCell>{violation ? formatDate(violation.date) : ""}</TableCell>
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
                      // Интерфейс для жильца/старосты блока
                      <div className="space-y-4">
                        {isBlockLeader ? (
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Нарушения вашего блока ({getUserBlock()})</h4>
                            
                            {getUserViolations().length > 0 ? (
                              <>
                                {/* Акт нарушений */}
                                <div className="mb-4">
                                  <h5 className="text-sm font-medium mb-1">Акт нарушений:</h5>
                                  {getUserViolations().map((violation) => (
                                    <div key={`user-violation-${violation.id}`} className="text-sm text-gray-600 mb-1">
                                      {formatDate(violation.date)} - {violation.room || `Блок ${violation.block}`}: {violation.description}
                                    </div>
                                  ))}
                                </div>

                                {/* Форма распределения нарушений */}
                                <div className="mb-4">
                                  <h5 className="text-sm font-medium mb-2">Распределить нарушения:</h5>
                                  <div className="space-y-3">
                                    {newViolations.map((violation) => (
                                      <div key={`new-violation-${violation.id}`} className="flex flex-wrap gap-2 items-center p-2 border rounded">
                                        <div className="flex-1 min-w-[120px]">
                                          <Label className="text-xs">Жилец</Label>
                                          <Select
                                            value={violation.userId?.toString() || ""}
                                            onValueChange={(value) => updateViolationAssignment(violation.id, "userId", parseInt(value))}
                                          >
                                            <SelectTrigger className="w-full">
                                              <SelectValue placeholder="Выберите жильца" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {getResidentsForBlock(getUserBlock()).map((resident) => (
                                                <SelectItem key={`resident-${resident.id}`} value={resident.id.toString()}>
                                                  {resident.name} ({resident.room})
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        
                                        <div className="flex-1 min-w-[100px]">
                                          <Label className="text-xs">Дата</Label>
                                          <Select
                                            value={violation.date}
                                            onValueChange={(value) => updateViolationAssignment(violation.id, "date", value)}
                                          >
                                            <SelectTrigger className="w-full">
                                              <SelectValue placeholder="Дата" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {currentMeeting.dates.map((date) => (
                                                <SelectItem key={`date-${date}`} value={date}>
                                                  {formatDate(date)}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        
                                        <div className="flex-1 min-w-[80px]">
                                          <Label className="text-xs">Часы</Label>
                                          <Select
                                            value={violation.hours.toString()}
                                            onValueChange={(value) => updateViolationAssignment(violation.id, "hours", parseInt(value))}
                                          >
                                            <SelectTrigger className="w-full">
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
                                        </div>
                                        
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => removeViolationAssignment(violation.id)}
                                          className="mt-5"
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
                        ) : (
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
                              Заседание КПД от {formatDate(meeting.createdAt)} ({meeting.dates.map(formatDate).join(", ")})
                            </h4>
                            {isAdmin && (
                              <Button variant="outline" size="sm">
                                <Download className="mr-2 h-4 w-4" />
                                Скачать все акты
                              </Button>
                            )}
                          </div>
                          
                          {isAdmin ? (
                            // Интерфейс админа для прошедших КПД
                            <Accordion type="multiple" className="w-full">
                              {Array.from({ length: 14 }, (_, i) => i + 1).map((floor) => (
                                <AccordionItem key={`past-floor-${floor}`} value={`past-floor-${floor}`}>
                                  <AccordionTrigger>{floor} этаж</AccordionTrigger>
                                  <AccordionContent>
                                    <div className="space-y-3">
                                      {Array.from({ length: 8 }, (_, i) => i + 1).map((blockNum) => {
                                        const blockKey = `${floor}.${blockNum}`;
                                        const blockViolations = violations.filter(
                                          (v) => v.meetingId === meeting.id && (v.block === blockKey || (v.room && v.room.startsWith(`${blockKey}.`)))
                                        );
                                        
                                        if (blockViolations.length === 0) return null;
                                        
                                        return (
                                          <div key={`past-block-${blockKey}`} className="border rounded-lg p-3">
                                            <h5 className="font-medium mb-2">Блок {blockKey}</h5>
                                            
                                            {/* Акт нарушений */}
                                            <div className="mb-3">
                                              <h6 className="text-sm font-medium mb-1">Акт нарушений:</h6>
                                              {blockViolations.map((violation) => (
                                                <div key={`past-violation-${violation.id}`} className="text-sm text-gray-600 mb-1 flex justify-between items-start">
                                                  <span>
                                                    {formatDate(violation.date)} - {violation.room || `Блок ${violation.block}`}: {violation.description}
                                                  </span>
                                                  <Button variant="ghost" size="sm" className="p-1 h-auto">
                                                    <Download className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                              ))}
                                            </div>

                                            {/* Распределенные нарушения */}
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
                                                      const violation = violations.find(v => v.id === av.violationId);
                                                      return violation && violation.meetingId === meeting.id &&
                                                        (violation.block === blockKey || 
                                                         (violation.room && violation.room.startsWith(`${blockKey}.`)));
                                                    })
                                                    .map((av) => {
                                                      const violation = violations.find(v => v.id === av.violationId);
                                                      const resident = residents.find(r => r.id === av.userId);
                                                      return (
                                                        <TableRow key={`past-assignment-${av.id}`}>
                                                          <TableCell>{resident?.name || "Неизвестно"}</TableCell>
                                                          <TableCell>{violation ? formatDate(violation.date) : ""}</TableCell>
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
                            // Интерфейс жильца для прошедших КПД
                            <div>
                              <h5 className="text-sm font-medium mb-2">Нарушения вашего блока:</h5>
                              {assignedViolations
                                .filter((av) => {
                                  const violation = violations.find(v => v.id === av.violationId);
                                  return violation && violation.meetingId === meeting.id &&
                                    (violation.block === getUserBlock() || 
                                     (violation.room && violation.room.startsWith(`${getUserBlock()}.`)));
                                })
                                .map((av) => {
                                  const violation = violations.find(v => v.id === av.violationId);
                                  return (
                                    <div key={`user-assignment-${av.id}`} className="text-sm text-gray-600 mb-2">
                                      {violation ? formatDate(violation.date) : ""} - {violation?.room || `Блок ${violation?.block}`}: {av.hours} часов
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
                  <div className="space-y-6">
                    {/* Создать новое КПД */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">Создать новое КПД</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <Label className="block text-sm font-medium mb-1">Даты нарушений</Label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {newMeetingDates.map((date) => (
                              <div key={date} className="flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm">
                                {formatDate(date)}
                                <button
                                  type="button"
                                  onClick={() => removeDateFromNewMeeting(date)}
                                  className="ml-2 text-gray-500 hover:text-gray-700"
                                >
                                  &times;
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              type="date"
                              value={newMeetingDateInput}
                              onChange={(e) => setNewMeetingDateInput(e.target.value)}
                              className="flex-grow max-w-xs"
                            />
                            <Button onClick={addDateToNewMeeting} variant="outline">
                              <Plus className="mr-2 h-4 w-4" />
                              Добавить дату
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label className="block text-sm font-medium mb-1">Время собрания (необязательно)</Label>
                          <Input
                            type="time"
                            value={newMeetingTime}
                            onChange={(e) => setNewMeetingTime(e.target.value)}
                            className="max-w-xs"
                          />
                        </div>

                        <div>
                          <Label className="block text-sm font-medium mb-1">Загрузить акты КПД (.zip)</Label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              type="file"
                              accept=".zip"
                              className="flex-grow"
                              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                              disabled={isUploading}
                            />
                            <Button onClick={handleFileUpload} disabled={!selectedFile || isUploading}>
                              <Upload className="mr-2 h-4 w-4" />
                              {isUploading ? "Загрузка..." : "Загрузить"}
                            </Button>
                          </div>
                        </div>

                        <Button onClick={createNewMeeting}>
                          <Plus className="mr-2 h-4 w-4" />
                          Создать КПД
                        </Button>
                      </div>
                    </div>

                    {/* Предстоящие КПД */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Предстоящие КПД</h4>
                      <div className="space-y-3">
                        {kpdMeetings
                          .filter(m => m.status === 'draft')
                          .map((meeting) => (
                            <div key={`draft-meeting-${meeting.id}`} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded gap-2">
                              <div>
                                <h5 className="font-medium">КПД от {formatDate(meeting.createdAt)}</h5>
                                <p className="text-sm text-gray-500">Даты нарушений: {meeting.dates.map(formatDate).join(", ")}</p>
                                {meeting.closedAt && (
                                  <p className="text-xs text-gray-400">Закрыто: {formatDate(meeting.closedAt)}</p>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
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