type RoleBadgeProps = {
    role: string;
  };
  

  const rolePriority: Record<string, number> = {
    "Комендант": 0,
    "Содтрудник общежития": 1,
    "Пред-ль Общежития": 2,
    "Пред-ль СанКома": 3,
    "Командир ГРО": 4,
    "Пред-ль КПД": 5,
    "Культорг": 6,
    "Спорторг": 7,
    "Профорг": 8,
    "Член ССО": 9,
    "ГРО": 10,
    "Санка": 11,
    "Староста этажа": 12,
    "Ответственный за прачечную": 13,
    "Ответственный за комп. класс": 14,
    "Любимка": 15,
    "Проживающий": 16,
    "Студент КАИ": 17,
  };
  


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
  
  export const RoleBadge = ({ role }: RoleBadgeProps) => {
    const color = roleColors[role] || roleColors.default;
  
    return (
      <div
        style={{ backgroundColor: color.bg, color: color.text, margin: 2}}
        className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
      >
        {role}
      </div>
    );
  };
  
  export default RoleBadge;
  