// Among-Us style task & room data for "Сбеги из школы"

export type RoomId =
  | "cafeteria"
  | "electrical"
  | "admin"
  | "medbay"
  | "comms"
  | "reactor"
  | "storage"
  | "corridor";

export type Room = {
  id: RoomId;
  name: string;
  x: number; y: number; w: number; h: number;
  color: string;
};

// Map is 1200 x 700
export const rooms: Room[] = [
  { id: "cafeteria", name: "Столовая", x: 480, y: 40, w: 240, h: 180, color: "#2b3a4a" },
  { id: "admin",     name: "Кабинет директора", x: 760, y: 60, w: 200, h: 160, color: "#3a2b4a" },
  { id: "medbay",    name: "Медпункт", x: 80,  y: 260, w: 220, h: 160, color: "#2b4a3a" },
  { id: "electrical",name: "Щитовая",  x: 80,  y: 460, w: 220, h: 180, color: "#4a3a1f" },
  { id: "reactor",   name: "Котельная", x: 360, y: 460, w: 240, h: 180, color: "#4a2222" },
  { id: "comms",     name: "Радиоузел", x: 660, y: 460, w: 220, h: 180, color: "#22384a" },
  { id: "storage",   name: "Склад",     x: 940, y: 300, w: 200, h: 240, color: "#3a3a22" },
  { id: "corridor",  name: "Коридор",   x: 80,  y: 60,  w: 380, h: 160, color: "#1f2530" },
];

export type TaskKind = "wires" | "code" | "download" | "reactor" | "trash" | "switches" | "swipe";

export type Task = {
  id: string;
  kind: TaskKind;
  title: string;
  hint: string;
  room: RoomId;
  x: number; y: number; // marker position on map
};

export const tasks: Task[] = [
  { id: "t-wires",     kind: "wires",     title: "Соединить провода",  hint: "Соедини провода по цвету", room: "electrical", x: 170, y: 540 },
  { id: "t-code",      kind: "code",      title: "Взломать кодовый замок", hint: "Подбери 4-значный код по подсказке", room: "admin", x: 860, y: 140 },
  { id: "t-download",  kind: "download",  title: "Скачать данные с сервера", hint: "Удерживай кнопку, не отпуская", room: "comms", x: 760, y: 540 },
  { id: "t-reactor",   kind: "reactor",   title: "Перезапуск котла", hint: "Повтори последовательность (Simon)", room: "reactor", x: 470, y: 540 },
  { id: "t-trash",     kind: "trash",     title: "Вынести мусор", hint: "Удерживай рычаг, пока бак не опустеет", room: "storage", x: 1030, y: 420 },
  { id: "t-switches",  kind: "switches",  title: "Починить свет", hint: "Все рубильники должны быть ВКЛ", room: "electrical", x: 220, y: 600 },
  { id: "t-swipe",     kind: "swipe",     title: "Прокатить пропуск", hint: "Быстро и плавно проведи пропуск слева направо", room: "medbay", x: 200, y: 320 },
];

export type Crewmate = {
  id: string;
  name: string;
  color: string;
  room: RoomId;
  ox: number; oy: number; // offset inside room
  line: string;
};

export const crewmates: Crewmate[] = [
  { id: "c-mila",  name: "Мила",  color: "#e84545", room: "cafeteria", ox: 60, oy: 100, line: "Лана! Все задания — и мы выберемся. Я держу столовую." },
  { id: "c-arseny",name: "Арсений", color: "#3aa3ff", room: "medbay",  ox: 60, oy: 90,  line: "У меня перевязка. Прокатишь мой пропуск в медпункте?" },
  { id: "c-vika",  name: "Вика",  color: "#ffd23a", room: "comms",     ox: 50, oy: 100, line: "Радио ловит сигнал! Скачай данные — узнаем, где безопасно." },
  { id: "c-timur", name: "Тимур", color: "#7ad84a", room: "reactor",   ox: 60, oy: 100, line: "Котёл вот-вот взорвётся. Перезапуск!" },
];

// Boss riddles (used after all tasks done)
export const bossRiddles: { question: string; options: string[]; answer: number }[] = [
  { question: "Что становится больше, если поставить с ног на голову?", options: ["Гора", "Число 6", "Часы", "Зеркало"], answer: 1 },
  { question: "Я говорю без рта и слышу без ушей. Кто я?", options: ["Тень", "Эхо", "Ветер", "Сон"], answer: 1 },
  { question: "1, 1, 2, 3, 5, 8, 13, ?", options: ["18", "20", "21", "24"], answer: 2 },
];

// Code hint for the admin door
export const ADMIN_CODE = "4071";
export const ADMIN_HINT = "На столе записка: «год основания школы 1740 + 2331»";
