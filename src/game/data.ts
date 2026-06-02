// Side-scrolling school corridor data — multi-level
export type TaskKind =
  | "wires" | "download" | "reactor" | "trash" | "switches"
  | "quiz" | "aim";

export type LootItem = {
  name: string;
  emoji: string;
  hpGain?: number;
  strengthGain?: number;
  foodGain?: number;
  battery?: number;     // заряжает фонарь на N% при использовании
  givesFlashlight?: boolean; // даёт фонарик, если его не было
};

export type SearchSpot = {
  id: string;
  // относительное место в комнате
  where: "desk" | "underDesk" | "shelf" | "drawer" | "trash";
  x: number; // px относительно сцены 800px
  item?: LootItem; // если undefined — пусто
};

export type Classroom = {
  id: string;
  x: number;
  name: string;
  // legacy — оставляем как «главную» находку (для совместимости)
  loot: LootItem;
  // новые точки поиска внутри класса
  spots: SearchSpot[];
};

export type Zombie = {
  id: string;
  x: number;
  kind: TaskKind;
  name: string;
  sleeping?: boolean;
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

// --- helpers ---
const FLASHLIGHT: LootItem = { name: "Фонарик", emoji: "🔦", givesFlashlight: true, battery: 100 };
const BATTERY_S: LootItem = { name: "Батарейка АА", emoji: "🔋", battery: 35 };
const BATTERY_M: LootItem = { name: "Батарейка Крона", emoji: "🪫", battery: 60 };
const APTECHKA:  LootItem = { name: "Аптечка", emoji: "🩹", hpGain: 40 };
const BANDAGE:   LootItem = { name: "Бинт", emoji: "🩹", hpGain: 25 };
const SANDWICH:  LootItem = { name: "Бутерброд", emoji: "🥪", hpGain: 8, foodGain: 35 };
const CHOCO:     LootItem = { name: "Шоколад", emoji: "🍫", hpGain: 5, foodGain: 30 };
const ENERGY:    LootItem = { name: "Энергетик", emoji: "⚡", hpGain: 10, strengthGain: 1, foodGain: 20 };
const SOUP:      LootItem = { name: "Обед", emoji: "🍲", hpGain: 20, foodGain: 50 };
const PROTEIN:   LootItem = { name: "Протеин", emoji: "💪", hpGain: 15, strengthGain: 1, foodGain: 25 };
const BOOK:      LootItem = { name: "Учебник", emoji: "📕", strengthGain: 1 };
const ACID:      LootItem = { name: "Кислота", emoji: "🧪", strengthGain: 2 };
const MOP:       LootItem = { name: "Швабра", emoji: "🧹", strengthGain: 1 };

export const levels: Level[] = [
  {
    id: 1,
    name: "1 этаж · Главный коридор",
    worldW: 3000,
    exitX: 2850,
    classrooms: [
      { id: "l1-21", x: 300, name: "Кабинет физики №21", loot: SANDWICH, spots: [
        { id: "s1", where: "desk", x: 200, item: SANDWICH },
        { id: "s2", where: "underDesk", x: 380, item: BATTERY_S },
        { id: "s3", where: "shelf", x: 560, item: BOOK },
        { id: "s4", where: "drawer", x: 680 },
      ]},
      { id: "l1-18", x: 750, name: "Кабинет химии №18", loot: APTECHKA, spots: [
        { id: "s1", where: "shelf", x: 180, item: APTECHKA },
        { id: "s2", where: "desk", x: 360, item: ACID },
        { id: "s3", where: "underDesk", x: 540, item: BATTERY_S },
        { id: "s4", where: "trash", x: 700 },
      ]},
      { id: "l1-7", x: 1450, name: "Кабинет литературы", loot: ENERGY, spots: [
        { id: "s1", where: "desk", x: 200, item: ENERGY },
        { id: "s2", where: "desk", x: 380, item: BOOK },
        { id: "s3", where: "underDesk", x: 560, item: FLASHLIGHT },
        { id: "s4", where: "drawer", x: 700, item: BATTERY_M },
      ]},
      { id: "l1-bio", x: 2150, name: "Кабинет биологии", loot: MOP, spots: [
        { id: "s1", where: "shelf", x: 180, item: MOP },
        { id: "s2", where: "underDesk", x: 380, item: BANDAGE },
        { id: "s3", where: "desk", x: 560, item: BATTERY_S },
        { id: "s4", where: "trash", x: 700, item: CHOCO },
      ]},
    ],
    zombies: [
      { id: "l1-z1", x: 500, kind: "switches", name: "Зомби-ученик" },
      { id: "l1-z2", x: 950, kind: "trash", name: "Спящий уборщик", sleeping: true },
      { id: "l1-z3", x: 1050, kind: "trash", name: "Зомби-уборщик" },
      { id: "l1-z4", x: 1750, kind: "wires", name: "Зомби-электрик" },
      { id: "l1-z5", x: 2050, kind: "quiz", name: "Спящий учитель", sleeping: true },
      { id: "l1-z6", x: 2450, kind: "quiz", name: "Зомби-учитель" },
    ],
  },
  {
    id: 2,
    name: "2 этаж · Учебный сектор",
    worldW: 3400,
    exitX: 3250,
    classrooms: [
      { id: "l2-tu", x: 350, name: "Учительская", loot: CHOCO, spots: [
        { id: "s1", where: "desk", x: 180, item: CHOCO },
        { id: "s2", where: "drawer", x: 360, item: BATTERY_M },
        { id: "s3", where: "underDesk", x: 540, item: BANDAGE },
        { id: "s4", where: "shelf", x: 700, item: BOOK },
      ]},
      { id: "l2-eng", x: 850, name: "Кабинет английского", loot: BANDAGE, spots: [
        { id: "s1", where: "desk", x: 200, item: BANDAGE },
        { id: "s2", where: "desk", x: 380, item: BATTERY_S },
        { id: "s3", where: "underDesk", x: 560, item: FLASHLIGHT },
        { id: "s4", where: "trash", x: 700 },
      ]},
      { id: "l2-inf", x: 1500, name: "Кабинет информатики", loot: BATTERY_M, spots: [
        { id: "s1", where: "desk", x: 180, item: BATTERY_M },
        { id: "s2", where: "drawer", x: 360, item: BATTERY_M },
        { id: "s3", where: "shelf", x: 540, item: BOOK },
        { id: "s4", where: "underDesk", x: 700, item: ENERGY },
      ]},
      { id: "l2-mus", x: 2100, name: "Музыкальный класс", loot: { name: "Гитара", emoji: "🎸", strengthGain: 2 }, spots: [
        { id: "s1", where: "shelf", x: 200, item: { name: "Гитара", emoji: "🎸", strengthGain: 2 } },
        { id: "s2", where: "underDesk", x: 400, item: BATTERY_S },
        { id: "s3", where: "drawer", x: 580, item: BANDAGE },
        { id: "s4", where: "trash", x: 700, item: CHOCO },
      ]},
      { id: "l2-gym", x: 2700, name: "Спортзал", loot: PROTEIN, spots: [
        { id: "s1", where: "shelf", x: 180, item: PROTEIN },
        { id: "s2", where: "desk", x: 360, item: { name: "Бита", emoji: "🏏", strengthGain: 1 } },
        { id: "s3", where: "underDesk", x: 540, item: BATTERY_M },
        { id: "s4", where: "trash", x: 700, item: APTECHKA },
      ]},
    ],
    zombies: [
      { id: "l2-z1", x: 600, kind: "lock", name: "Зомби-завуч" },
      { id: "l2-z2", x: 1000, kind: "download", name: "Спящий секретарь", sleeping: true },
      { id: "l2-z3", x: 1200, kind: "download", name: "Зомби-секретарь" },
      { id: "l2-z4", x: 1800, kind: "reactor", name: "Зомби-повар" },
      { id: "l2-z5", x: 2200, kind: "trash", name: "Спящий охранник", sleeping: true },
      { id: "l2-z6", x: 2400, kind: "aim", name: "Зомби-физрук" },
      { id: "l2-z7", x: 2950, kind: "trash", name: "Зомби-уборщик" },
    ],
  },
  {
    id: 3,
    name: "3 этаж · Кабинет директора",
    worldW: 3600,
    exitX: 3450,
    classrooms: [
      { id: "l3-arch", x: 400, name: "Архив", loot: BOOK, spots: [
        { id: "s1", where: "shelf", x: 180, item: BOOK },
        { id: "s2", where: "drawer", x: 360, item: BATTERY_M },
        { id: "s3", where: "underDesk", x: 540, item: BATTERY_S },
        { id: "s4", where: "trash", x: 700, item: BANDAGE },
      ]},
      { id: "l3-med", x: 950, name: "Медкабинет", loot: { name: "Большая аптечка", emoji: "💉", hpGain: 60 }, spots: [
        { id: "s1", where: "shelf", x: 180, item: { name: "Большая аптечка", emoji: "💉", hpGain: 60 } },
        { id: "s2", where: "drawer", x: 360, item: APTECHKA },
        { id: "s3", where: "desk", x: 540, item: BANDAGE },
        { id: "s4", where: "underDesk", x: 700, item: BATTERY_M },
      ]},
      { id: "l3-lab", x: 1600, name: "Лаборатория", loot: ACID, spots: [
        { id: "s1", where: "desk", x: 180, item: ACID },
        { id: "s2", where: "shelf", x: 360, item: FLASHLIGHT },
        { id: "s3", where: "drawer", x: 540, item: BATTERY_M },
        { id: "s4", where: "underDesk", x: 700, item: BATTERY_M },
      ]},
      { id: "l3-libr", x: 2250, name: "Библиотека", loot: BOOK, spots: [
        { id: "s1", where: "shelf", x: 180, item: BOOK },
        { id: "s2", where: "shelf", x: 360, item: BOOK },
        { id: "s3", where: "underDesk", x: 540, item: BATTERY_S },
        { id: "s4", where: "drawer", x: 700, item: CHOCO },
      ]},
      { id: "l3-canteen", x: 2900, name: "Столовая", loot: SOUP, spots: [
        { id: "s1", where: "desk", x: 180, item: SOUP },
        { id: "s2", where: "shelf", x: 360, item: SANDWICH },
        { id: "s3", where: "drawer", x: 540, item: CHOCO },
        { id: "s4", where: "underDesk", x: 700, item: BATTERY_M },
      ]},
    ],
    zombies: [
      { id: "l3-z1", x: 600, kind: "reactor", name: "Зомби-завкафедрой" },
      { id: "l3-z2", x: 1000, kind: "quiz", name: "Спящий психолог", sleeping: true },
      { id: "l3-z3", x: 1200, kind: "quiz", name: "Зомби-психолог" },
      { id: "l3-z4", x: 1800, kind: "wires", name: "Зомби-электрик" },
      { id: "l3-z5", x: 2150, kind: "lock", name: "Спящий охранник", sleeping: true },
      { id: "l3-z6", x: 2500, kind: "lock", name: "Зомби-охранник" },
      { id: "l3-z7", x: 2850, kind: "reactor", name: "Спящий завхоз", sleeping: true },
      { id: "l3-z8", x: 3100, kind: "code", name: "Зомби-заместитель" },
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
