// Side-scrolling school corridor data — multi-level
export type TaskKind =
  | "wires" | "code" | "download" | "reactor" | "trash" | "switches"
  | "quiz" | "lock" | "aim";

export type Classroom = {
  id: string;
  x: number;
  name: string;
  loot: { name: string; emoji: string; hpGain?: number; strengthGain?: number };
};

export type Zombie = {
  id: string;
  x: number;
  kind: TaskKind;
  name: string;
};

export type Level = {
  id: number;
  name: string;
  worldW: number;
  exitX: number;
  classrooms: Classroom[];
  zombies: Zombie[];
};

export const FLOOR_Y = 410;
export const CEIL_Y = 90;

export const levels: Level[] = [
  {
    id: 1,
    name: "1 этаж · Главный коридор",
    worldW: 3000,
    exitX: 2850,
    classrooms: [
      { id: "l1-21", x: 300, name: "Кабинет физики №21", loot: { name: "Бутерброд", emoji: "🥪", hpGain: 20 } },
      { id: "l1-18", x: 750, name: "Кабинет химии №18", loot: { name: "Аптечка", emoji: "🩹", hpGain: 35 } },
      { id: "l1-7", x: 1450, name: "Кабинет литературы", loot: { name: "Энергетик", emoji: "⚡", hpGain: 10, strengthGain: 1 } },
      { id: "l1-bio", x: 2150, name: "Кабинет биологии", loot: { name: "Швабра", emoji: "🧹", strengthGain: 1 } },
    ],
    zombies: [
      { id: "l1-z1", x: 500, kind: "switches", name: "Зомби-ученик" },
      { id: "l1-z2", x: 1050, kind: "trash", name: "Зомби-уборщик" },
      { id: "l1-z3", x: 1750, kind: "wires", name: "Зомби-электрик" },
      { id: "l1-z4", x: 2450, kind: "quiz", name: "Зомби-учитель" },
    ],
  },
  {
    id: 2,
    name: "2 этаж · Учебный сектор",
    worldW: 3400,
    exitX: 3250,
    classrooms: [
      { id: "l2-tu", x: 350, name: "Учительская", loot: { name: "Шоколад", emoji: "🍫", hpGain: 15 } },
      { id: "l2-eng", x: 850, name: "Кабинет английского", loot: { name: "Бинт", emoji: "🩹", hpGain: 25 } },
      { id: "l2-inf", x: 1500, name: "Кабинет информатики", loot: { name: "Флешка", emoji: "💾", strengthGain: 1 } },
      { id: "l2-mus", x: 2100, name: "Музыкальный класс", loot: { name: "Гитара", emoji: "🎸", strengthGain: 2 } },
      { id: "l2-gym", x: 2700, name: "Спортзал", loot: { name: "Протеин", emoji: "💪", hpGain: 20, strengthGain: 1 } },
    ],
    zombies: [
      { id: "l2-z1", x: 600, kind: "lock", name: "Зомби-завуч" },
      { id: "l2-z2", x: 1200, kind: "download", name: "Зомби-секретарь" },
      { id: "l2-z3", x: 1800, kind: "reactor", name: "Зомби-повар" },
      { id: "l2-z4", x: 2400, kind: "aim", name: "Зомби-физрук" },
      { id: "l2-z5", x: 2950, kind: "trash", name: "Зомби-уборщик" },
    ],
  },
  {
    id: 3,
    name: "3 этаж · Кабинет директора",
    worldW: 3600,
    exitX: 3450,
    classrooms: [
      { id: "l3-arch", x: 400, name: "Архив", loot: { name: "Учебник физики", emoji: "📕", strengthGain: 1 } },
      { id: "l3-med", x: 950, name: "Медкабинет", loot: { name: "Большая аптечка", emoji: "💉", hpGain: 50 } },
      { id: "l3-lab", x: 1600, name: "Лаборатория", loot: { name: "Кислота", emoji: "🧪", strengthGain: 2 } },
      { id: "l3-libr", x: 2250, name: "Библиотека", loot: { name: "Том знаний", emoji: "📚", strengthGain: 1, hpGain: 10 } },
      { id: "l3-canteen", x: 2900, name: "Столовая", loot: { name: "Обед", emoji: "🍲", hpGain: 40 } },
    ],
    zombies: [
      { id: "l3-z1", x: 600, kind: "reactor", name: "Зомби-завкафедрой" },
      { id: "l3-z2", x: 1200, kind: "quiz", name: "Зомби-психолог" },
      { id: "l3-z3", x: 1800, kind: "wires", name: "Зомби-электрик" },
      { id: "l3-z4", x: 2500, kind: "lock", name: "Зомби-охранник" },
      { id: "l3-z5", x: 3100, kind: "code", name: "Зомби-заместитель" },
    ],
  },
];

export const ADMIN_CODE = "4071";
export const ADMIN_HINT = "На двери: «1740 + 2331 = ?» — последние 4 цифры.";

export const bossRiddles: { question: string; options: string[]; answer: number }[] = [
  { question: "Что становится больше, если поставить с ног на голову?", options: ["Гора", "Число 6", "Часы", "Зеркало"], answer: 1 },
  { question: "Я говорю без рта и слышу без ушей. Кто я?", options: ["Тень", "Эхо", "Ветер", "Сон"], answer: 1 },
  { question: "1, 1, 2, 3, 5, 8, 13, ?", options: ["18", "20", "21", "24"], answer: 2 },
  { question: "У отца Мэри 5 дочерей: Чача, Чече, Чичи, Чочо… Как зовут пятую?", options: ["Чучу", "Мэри", "Чача", "Не знаю"], answer: 1 },
];
