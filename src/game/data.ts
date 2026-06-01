// Side-scrolling school corridor data
export type TaskKind = "wires" | "code" | "download" | "reactor" | "trash" | "switches" | "swipe";

export type Classroom = {
  id: string;
  x: number;        // door center x
  name: string;
  loot: { name: string; emoji: string; hpGain?: number; strengthGain?: number };
};

export type Zombie = {
  id: string;
  x: number;        // floor x
  kind: TaskKind;   // which mini-game defeats it
  name: string;
};

export const WORLD_W = 3200;
export const FLOOR_Y = 410;   // y of feet
export const CEIL_Y = 90;

export const classrooms: Classroom[] = [
  { id: "cl-21", x: 300,  name: "Кабинет физики №21", loot: { name: "Бутерброд", emoji: "🥪", hpGain: 20 } },
  { id: "cl-18", x: 700,  name: "Кабинет химии №18",  loot: { name: "Аптечка",    emoji: "🩹", hpGain: 35 } },
  { id: "cl-7",  x: 1150, name: "Кабинет литературы", loot: { name: "Энергетик",  emoji: "⚡", hpGain: 10, strengthGain: 1 } },
  { id: "cl-25", x: 1700, name: "Кабинет биологии",   loot: { name: "Швабра",     emoji: "🧹", strengthGain: 1 } },
  { id: "cl-tu", name: "Учительская", x: 2150, loot: { name: "Шоколад", emoji: "🍫", hpGain: 15 } },
  { id: "cl-arch", name: "Архив",     x: 2550, loot: { name: "Учебник физики", emoji: "📕", strengthGain: 1 } },
];

export const zombies: Zombie[] = [
  { id: "z1", x: 500,  kind: "switches", name: "Зомби-ученик" },
  { id: "z2", x: 950,  kind: "wires",    name: "Зомби-учитель" },
  { id: "z3", x: 1400, kind: "swipe",    name: "Зомби-охранник" },
  { id: "z4", x: 1900, kind: "reactor",  name: "Зомби-повар" },
  { id: "z5", x: 2350, kind: "trash",    name: "Зомби-уборщик" },
  { id: "z6", x: 2750, kind: "download", name: "Зомби-секретарь" },
];

// Final exit door
export const EXIT_X = 3050;

export const ADMIN_CODE = "4071";
export const ADMIN_HINT = "На двери выхода: «1740 + 2331 = ?» — последние 4 цифры.";

export const bossRiddles: { question: string; options: string[]; answer: number }[] = [
  { question: "Что становится больше, если поставить с ног на голову?", options: ["Гора", "Число 6", "Часы", "Зеркало"], answer: 1 },
  { question: "Я говорю без рта и слышу без ушей. Кто я?", options: ["Тень", "Эхо", "Ветер", "Сон"], answer: 1 },
  { question: "1, 1, 2, 3, 5, 8, 13, ?", options: ["18", "20", "21", "24"], answer: 2 },
];
