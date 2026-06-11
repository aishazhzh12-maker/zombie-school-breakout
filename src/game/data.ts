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
  battery?: number;     // charges flashlight by N% when used
  givesFlashlight?: boolean; // gives flashlight if you didn't have one
  noise?: number;       // throwable distraction toy — duration in ms dolls are lured
};

export type SearchSpot = {
  id: string;
  // relative position in the room
  where: "desk" | "underDesk" | "shelf" | "drawer" | "trash";
  x: number; // px relative to 800px scene
  item?: LootItem; // if undefined — empty
};

export type Classroom = {
  id: string;
  x: number;
  name: string;
  // legacy — kept as main loot (for compatibility)
  loot: LootItem;
  // new search spots inside the classroom
  spots: SearchSpot[];
};

export type Doll = {
  id: string;
  x: number;
  kind: TaskKind;
  name: string;
};

export type Obstacle = {
  id: string;
  x: number;
  kind: "glass";
};

export type HideSpot = {
  id: string;
  x: number;
  kind: "locker";
};

export type Level = {
  id: number;
  name: string;
  worldW: number;
  exitX: number;
  classrooms: Classroom[];
  dolls: Doll[];
  obstacles?: Obstacle[];
  hideSpots?: HideSpot[];
};

export const FLOOR_Y = 410;
export const CEIL_Y = 90;

// --- helpers ---
const FLASHLIGHT: LootItem = { name: "Flashlight", emoji: "🔦", givesFlashlight: true, battery: 100 };
const BATTERY_S: LootItem = { name: "AA Battery", emoji: "🔋", battery: 35 };
const BATTERY_M: LootItem = { name: "9V Battery", emoji: "🪫", battery: 60 };
const APTECHKA:  LootItem = { name: "Аптечка", emoji: "🩹", hpGain: 40 };
const BANDAGE:   LootItem = { name: "Бинт", emoji: "🩹", hpGain: 25 };
const SANDWICH:  LootItem = { name: "Sandwich", emoji: "🥪", hpGain: 8, foodGain: 35 };
const CHOCO:     LootItem = { name: "Chocolate", emoji: "🍫", hpGain: 5, foodGain: 30 };
const ENERGY:    LootItem = { name: "Energy Drink", emoji: "⚡", hpGain: 10, strengthGain: 1, foodGain: 20 };
const SOUP:      LootItem = { name: "Soup", emoji: "🍲", hpGain: 20, foodGain: 50 };
const PROTEIN:   LootItem = { name: "Protein", emoji: "💪", hpGain: 15, strengthGain: 1, foodGain: 25 };
const BOOK:      LootItem = { name: "Textbook", emoji: "📕", strengthGain: 1 };
const ACID:      LootItem = { name: "Acid", emoji: "🧪", strengthGain: 2 };
const MOP:       LootItem = { name: "Mop", emoji: "🧹", strengthGain: 1 };

// Throwable noise toys — lure dolls when thrown (press T)
const PLUSH:     LootItem = { name: "Plush Bunny", emoji: "🐰", noise: 4000 };
const MUSIC_BOX: LootItem = { name: "Music Box", emoji: "🎵", noise: 6500 };
const BELL:      LootItem = { name: "Bell", emoji: "🔔", noise: 3000 };

export const levels: Level[] = [
  {
    id: 1,
    name: "Floor 1 · Main Hallway",
    worldW: 4200,
    exitX: 4050,
    classrooms: [
      { id: "l1-21", x: 300, name: "Кабинет физики #21", loot: SANDWICH, spots: [
        { id: "s1", where: "desk", x: 200, item: SANDWICH },
        { id: "s2", where: "underDesk", x: 380, item: BATTERY_S },
        { id: "s3", where: "shelf", x: 560, item: BOOK },
        { id: "s4", where: "drawer", x: 680, item: PLUSH },
      ]},
      { id: "l1-18", x: 750, name: "Кабинет математики #18", loot: APTECHKA, spots: [
        { id: "s1", where: "shelf", x: 180, item: APTECHKA },
        { id: "s2", where: "desk", x: 360, item: BOOK },
        { id: "s3", where: "underDesk", x: 540, item: BATTERY_S },
        { id: "s4", where: "trash", x: 700, item: BELL },
      ]},
      { id: "l1-7", x: 1450, name: "Кабинет литературы", loot: ENERGY, spots: [
        { id: "s1", where: "desk", x: 200, item: ENERGY },
        { id: "s2", where: "desk", x: 380, item: BOOK },
        { id: "s3", where: "underDesk", x: 560, item: FLASHLIGHT },
        { id: "s4", where: "drawer", x: 700, item: MUSIC_BOX },
      ]},
      { id: "l1-bio", x: 2150, name: "Кабинет биологии", loot: MOP, spots: [
        { id: "s1", where: "shelf", x: 180, item: MOP },
        { id: "s2", where: "underDesk", x: 380, item: BANDAGE },
        { id: "s3", where: "desk", x: 560, item: BATTERY_S },
        { id: "s4", where: "trash", x: 700, item: PLUSH },
      ]},
      { id: "l1-basement-stairs", x: 2850, name: "Лестница в подвал", loot: BATTERY_M, spots: [
        { id: "s1", where: "drawer", x: 180, item: BATTERY_M },
        { id: "s2", where: "underDesk", x: 360, item: BANDAGE },
        { id: "s3", where: "shelf", x: 540, item: BELL },
        { id: "s4", where: "trash", x: 700 },
      ]},
      { id: "l1-boiler", x: 3350, name: "Котельная", loot: ENERGY, spots: [
        { id: "s1", where: "shelf", x: 180, item: ENERGY },
        { id: "s2", where: "drawer", x: 360, item: BATTERY_M },
        { id: "s3", where: "underDesk", x: 540, item: MOP },
        { id: "s4", where: "trash", x: 700, item: CHOCO },
      ]},
      { id: "l1-laundry", x: 3750, name: "Прачечная подвала", loot: SANDWICH, spots: [
        { id: "s1", where: "desk", x: 180, item: SANDWICH },
        { id: "s2", where: "drawer", x: 360, item: BATTERY_S },
        { id: "s3", where: "shelf", x: 540, item: PLUSH },
        { id: "s4", where: "trash", x: 700, item: BANDAGE },
      ]},
      { id: "l1-map", x: 3300, name: "Кабинет географии", loot: BOOK, spots: [
        { id: "s1", where: "shelf", x: 180, item: BOOK },
        { id: "s2", where: "desk", x: 360, item: BATTERY_S },
        { id: "s3", where: "drawer", x: 540, item: CHOCO },
        { id: "s4", where: "trash", x: 700, item: BELL },
      ]},
      { id: "l1-east-hall", x: 3850, name: "Восточный класс", loot: SOUP, spots: [
        { id: "s1", where: "desk", x: 180, item: SOUP },
        { id: "s2", where: "underDesk", x: 360, item: BATTERY_M },
        { id: "s3", where: "shelf", x: 540, item: BOOK },
        { id: "s4", where: "drawer", x: 700, item: MUSIC_BOX },
      ]},
    ],
    dolls: [
      { id: "l1-z1", x: 500, kind: "switches", name: "Button-Eye Bear" },
      { id: "l1-z2", x: 950, kind: "download", name: "Plush Bear" },
      { id: "l1-z3", x: 1050, kind: "quiz", name: "Old Plush Bear" },
      { id: "l1-z4", x: 1750, kind: "wires", name: "Torn School Bear" },
      { id: "l1-z5", x: 2050, kind: "aim", name: "Button Bear" },
      { id: "l1-z6", x: 2450, kind: "switches", name: "Locker Plush Bear" },
      { id: "l1-z7", x: 3050, kind: "trash", name: "Basement Plush Bear" },
      { id: "l1-z8", x: 3500, kind: "reactor", name: "Boiler Bear" },
      { id: "l1-z9", x: 3850, kind: "download", name: "Laundry Plush Bear" },
    ],
    obstacles: [
      { id: "l1-g1", x: 700, kind: "glass" },
      { id: "l1-g2", x: 1350, kind: "glass" },
      { id: "l1-g3", x: 1950, kind: "glass" },
      { id: "l1-g4", x: 2650, kind: "glass" },
      { id: "l1-g5", x: 3200, kind: "glass" },
      { id: "l1-g6", x: 3800, kind: "glass" },
    ],
    hideSpots: [
      { id: "l1-h1", x: 600, kind: "locker" },
      { id: "l1-h2", x: 1250, kind: "locker" },
      { id: "l1-h3", x: 1900, kind: "locker" },
      { id: "l1-h4", x: 2350, kind: "locker" },
      { id: "l1-h5", x: 3050, kind: "locker" },
      { id: "l1-h6", x: 3500, kind: "locker" },
      { id: "l1-h7", x: 3950, kind: "locker" },
    ],
  },
  {
    id: 2,
    name: "Floor 2 · Study Wing",
    worldW: 4400,
    exitX: 4250,
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
      { id: "l2-inf", x: 1500, name: "Компьютерный класс", loot: BATTERY_M, spots: [
        { id: "s1", where: "desk", x: 180, item: BATTERY_M },
        { id: "s2", where: "drawer", x: 360, item: BATTERY_M },
        { id: "s3", where: "shelf", x: 540, item: BOOK },
        { id: "s4", where: "underDesk", x: 700, item: ENERGY },
      ]},
      { id: "l2-mus", x: 2100, name: "Кабинет музыки", loot: { name: "Guitar", emoji: "🎸", strengthGain: 2 }, spots: [
        { id: "s1", where: "shelf", x: 200, item: { name: "Guitar", emoji: "🎸", strengthGain: 2 } },
        { id: "s2", where: "underDesk", x: 400, item: BATTERY_S },
        { id: "s3", where: "drawer", x: 580, item: BANDAGE },
        { id: "s4", where: "trash", x: 700, item: CHOCO },
      ]},
      { id: "l2-gym", x: 2700, name: "Спортзал", loot: PROTEIN, spots: [
        { id: "s1", where: "shelf", x: 180, item: PROTEIN },
        { id: "s2", where: "desk", x: 360, item: { name: "Whistle", emoji: "📣", strengthGain: 1 } },
        { id: "s3", where: "underDesk", x: 540, item: BATTERY_M },
        { id: "s4", where: "trash", x: 700, item: APTECHKA },
      ]},
      { id: "l2-map", x: 3300, name: "Кабинет географии", loot: BOOK, spots: [
        { id: "s1", where: "shelf", x: 180, item: BOOK },
        { id: "s2", where: "desk", x: 360, item: BATTERY_S },
        { id: "s3", where: "drawer", x: 540, item: CHOCO },
        { id: "s4", where: "trash", x: 700, item: BELL },
      ]},
      { id: "l2-east-hall", x: 3850, name: "Восточный класс", loot: SOUP, spots: [
        { id: "s1", where: "desk", x: 180, item: SOUP },
        { id: "s2", where: "underDesk", x: 360, item: BATTERY_M },
        { id: "s3", where: "shelf", x: 540, item: BOOK },
        { id: "s4", where: "drawer", x: 700, item: MUSIC_BOX },
      ]},
    ],
    dolls: [
      { id: "l2-z1", x: 650, kind: "switches", name: "Porcelain Ballerina Doll" },
      { id: "l2-z2", x: 1650, kind: "download", name: "Music Box Ballerina Doll" },
      { id: "l2-z3", x: 2750, kind: "wires", name: "Crawling Porcelain Ballerina" },
      { id: "l2-z4", x: 3800, kind: "quiz", name: "Hall Ballerina Doll" },
    ],
    obstacles: [
      { id: "l2-g1", x: 600, kind: "glass" },
      { id: "l2-g2", x: 1300, kind: "glass" },
      { id: "l2-g3", x: 1900, kind: "glass" },
      { id: "l2-g4", x: 2550, kind: "glass" },
      { id: "l2-g5", x: 3050, kind: "glass" },
      { id: "l2-g6", x: 3600, kind: "glass" },
      { id: "l2-g7", x: 4100, kind: "glass" },
    ],
    hideSpots: [
      { id: "l2-h1", x: 500, kind: "locker" },
      { id: "l2-h2", x: 1150, kind: "locker" },
      { id: "l2-h3", x: 1700, kind: "locker" },
      { id: "l2-h4", x: 2350, kind: "locker" },
      { id: "l2-h5", x: 2850, kind: "locker" },
      { id: "l2-h6", x: 3500, kind: "locker" },
      { id: "l2-h7", x: 4050, kind: "locker" },
    ],
  },
  {
    id: 3,
    name: "Floor 3 · Creative Rooms",
    worldW: 4300,
    exitX: 4150,
    classrooms: [
      { id: "l3a-art", x: 350, name: "Кабинет рисования", loot: BOOK, spots: [
        { id: "s1", where: "desk", x: 180 },
        { id: "s2", where: "shelf", x: 360, item: BOOK },
        { id: "s3", where: "underDesk", x: 540, item: BATTERY_S },
        { id: "s4", where: "drawer", x: 700, item: BANDAGE },
      ]},
      { id: "l3a-tech", x: 900, name: "Мастерская", loot: { name: "Hammer", emoji: "🔨", strengthGain: 2 }, spots: [
        { id: "s1", where: "shelf", x: 180, item: { name: "Hammer", emoji: "🔨", strengthGain: 2 } },
        { id: "s2", where: "desk", x: 360, item: { name: "Screwdriver", emoji: "🪛", strengthGain: 1 } },
        { id: "s3", where: "drawer", x: 540, item: BATTERY_M },
        { id: "s4", where: "trash", x: 700, item: CHOCO },
      ]},
      { id: "l3a-geo", x: 1500, name: "Кабинет географии", loot: BOOK, spots: [
        { id: "s1", where: "shelf", x: 180, item: BOOK },
        { id: "s2", where: "desk", x: 360, item: SANDWICH },
        { id: "s3", where: "underDesk", x: 540, item: BATTERY_S },
        { id: "s4", where: "drawer", x: 700, item: BANDAGE },
      ]},
      { id: "l3a-hist", x: 2100, name: "Кабинет истории", loot: ENERGY, spots: [
        { id: "s1", where: "desk", x: 180, item: ENERGY },
        { id: "s2", where: "shelf", x: 360, item: BOOK },
        { id: "s3", where: "drawer", x: 540, item: BATTERY_M },
        { id: "s4", where: "underDesk", x: 700, item: APTECHKA },
      ]},
      { id: "l3a-astr", x: 2700, name: "Кабинет астрономии", loot: FLASHLIGHT, spots: [
        { id: "s1", where: "shelf", x: 180, item: FLASHLIGHT },
        { id: "s2", where: "desk", x: 360, item: BATTERY_M },
        { id: "s3", where: "drawer", x: 540, item: CHOCO },
        { id: "s4", where: "trash", x: 700, item: BATTERY_S },
      ]},
      { id: "l3a-studio", x: 3300, name: "Творческая студия", loot: ENERGY, spots: [
        { id: "s1", where: "desk", x: 180, item: ENERGY },
        { id: "s2", where: "shelf", x: 360, item: BOOK },
        { id: "s3", where: "drawer", x: 540, item: BATTERY_S },
        { id: "s4", where: "trash", x: 700, item: PLUSH },
      ]},
      { id: "l3a-greenhouse", x: 3800, name: "Оранжерея", loot: SANDWICH, spots: [
        { id: "s1", where: "shelf", x: 180, item: SANDWICH },
        { id: "s2", where: "underDesk", x: 360, item: BANDAGE },
        { id: "s3", where: "drawer", x: 540, item: BATTERY_M },
        { id: "s4", where: "trash", x: 700, item: CHOCO },
      ]},
    ],
    dolls: [
      { id: "l3a-z1", x: 650, kind: "aim", name: "Paint-Stained Clockwork Monkey" },
      { id: "l3a-z2", x: 1700, kind: "reactor", name: "Globe-Head Monkey" },
      { id: "l3a-z3", x: 2850, kind: "trash", name: "Star-Gazer Toy Monkey" },
      { id: "l3a-z4", x: 3800, kind: "switches", name: "Long-Armed Clockwork Monkey" },
    ],
    obstacles: [
      { id: "l3a-g1", x: 750, kind: "glass" },
      { id: "l3a-g2", x: 1350, kind: "glass" },
      { id: "l3a-g3", x: 2000, kind: "glass" },
      { id: "l3a-g4", x: 2650, kind: "glass" },
      { id: "l3a-g5", x: 3400, kind: "glass" },
      { id: "l3a-g6", x: 3950, kind: "glass" },
    ],
    hideSpots: [
      { id: "l3a-h1", x: 650, kind: "locker" },
      { id: "l3a-h2", x: 1200, kind: "locker" },
      { id: "l3a-h3", x: 1900, kind: "locker" },
      { id: "l3a-h4", x: 2400, kind: "locker" },
      { id: "l3a-h5", x: 3300, kind: "locker" },
      { id: "l3a-h6", x: 3850, kind: "locker" },
    ],
  },
  {
    id: 4,
    name: "Floor 4 · Чердак & Storage",
    worldW: 4800,
    exitX: 4650,
    classrooms: [
      { id: "l4-store", x: 350, name: "Склад инвентаря", loot: { name: "Crowbar", emoji: "⛏️", strengthGain: 2 }, spots: [
        { id: "s1", where: "shelf", x: 180, item: { name: "Crowbar", emoji: "⛏️", strengthGain: 2 } },
        { id: "s2", where: "drawer", x: 360, item: BATTERY_M },
        { id: "s3", where: "underDesk", x: 540, item: MOP },
        { id: "s4", where: "trash", x: 700, item: BANDAGE },
      ]},
      { id: "l4-attic", x: 900, name: "Чердак", loot: FLASHLIGHT, spots: [
        { id: "s1", where: "shelf", x: 180, item: FLASHLIGHT },
        { id: "s2", where: "drawer", x: 360, item: BATTERY_M },
        { id: "s3", where: "underDesk", x: 540, item: BATTERY_S },
        { id: "s4", where: "trash", x: 700, item: CHOCO },
      ]},
      { id: "l4-server", x: 1500, name: "Серверная", loot: BATTERY_M, spots: [
        { id: "s1", where: "desk", x: 180, item: BATTERY_M },
        { id: "s2", where: "shelf", x: 360, item: BATTERY_M },
        { id: "s3", where: "drawer", x: 540, item: BATTERY_S },
        { id: "s4", where: "underDesk", x: 700, item: ENERGY },
      ]},
      { id: "l4-locker", x: 2100, name: "Раздевалка", loot: PROTEIN, spots: [
        { id: "s1", where: "shelf", x: 180, item: PROTEIN },
        { id: "s2", where: "drawer", x: 360, item: SANDWICH },
        { id: "s3", where: "desk", x: 540, item: BANDAGE },
        { id: "s4", where: "trash", x: 700, item: BATTERY_S },
      ]},
      { id: "l4-aux", x: 2750, name: "Подсобка", loot: APTECHKA, spots: [
        { id: "s1", where: "shelf", x: 180, item: APTECHKA },
        { id: "s2", where: "drawer", x: 360, item: MOP },
        { id: "s3", where: "underDesk", x: 540, item: BATTERY_M },
        { id: "s4", where: "trash", x: 700, item: CHOCO },
      ]},
      { id: "l4-dusty-attic", x: 3350, name: "Dusty Чердак Hall", loot: BOOK, spots: [
        { id: "s1", where: "shelf", x: 180, item: BOOK },
        { id: "s2", where: "drawer", x: 360, item: BATTERY_M },
        { id: "s3", where: "underDesk", x: 540, item: MUSIC_BOX },
        { id: "s4", where: "trash", x: 700, item: BANDAGE },
      ]},
      { id: "l4-roof-storage", x: 3900, name: "Склад на крыше", loot: FLASHLIGHT, spots: [
        { id: "s1", where: "shelf", x: 180, item: FLASHLIGHT },
        { id: "s2", where: "desk", x: 360, item: BATTERY_M },
        { id: "s3", where: "drawer", x: 540, item: CHOCO },
        { id: "s4", where: "trash", x: 700, item: PLUSH },
      ]},
      { id: "l4-water-tank", x: 4350, name: "Чердак с баком", loot: PROTEIN, spots: [
        { id: "s1", where: "shelf", x: 180, item: PROTEIN },
        { id: "s2", where: "underDesk", x: 360, item: BATTERY_S },
        { id: "s3", where: "drawer", x: 540, item: APTECHKA },
        { id: "s4", where: "trash", x: 700 },
      ]},
    ],
    dolls: [
      { id: "l4-z1", x: 700, kind: "trash", name: "Storage Marionette Clown" },
      { id: "l4-z2", x: 1850, kind: "wires", name: "Wire Marionette Clown" },
      { id: "l4-z3", x: 3050, kind: "aim", name: "Locker Clown" },
      { id: "l4-z4", x: 4250, kind: "reactor", name: "Tank Clown Keeper" },
    ],
    obstacles: [
      { id: "l4-g1", x: 700, kind: "glass" },
      { id: "l4-g2", x: 1400, kind: "glass" },
      { id: "l4-g3", x: 2000, kind: "glass" },
      { id: "l4-g4", x: 2700, kind: "glass" },
      { id: "l4-g5", x: 3100, kind: "glass" },
      { id: "l4-g6", x: 3600, kind: "glass" },
      { id: "l4-g7", x: 4200, kind: "glass" },
    ],
    hideSpots: [
      { id: "l4-h1", x: 600, kind: "locker" },
      { id: "l4-h2", x: 1300, kind: "locker" },
      { id: "l4-h3", x: 1900, kind: "locker" },
      { id: "l4-h4", x: 2500, kind: "locker" },
      { id: "l4-h5", x: 3000, kind: "locker" },
      { id: "l4-h6", x: 3550, kind: "locker" },
      { id: "l4-h7", x: 4150, kind: "locker" },
      { id: "l4-h8", x: 4550, kind: "locker" },
    ],
  },
  {
    id: 5,
    name: "Floor 5 · Principal's Office",
    worldW: 4600,
    exitX: 4450,
    classrooms: [
      { id: "l3-arch", x: 400, name: "Архив", loot: BOOK, spots: [
        { id: "s1", where: "shelf", x: 180, item: BOOK },
        { id: "s2", where: "drawer", x: 360, item: BATTERY_M },
        { id: "s3", where: "underDesk", x: 540, item: BATTERY_S },
        { id: "s4", where: "trash", x: 700, item: BANDAGE },
      ]},
      { id: "l3-med", x: 950, name: "Кабинет медсестры", loot: { name: "Large Medkit", emoji: "💉", hpGain: 60 }, spots: [
        { id: "s1", where: "shelf", x: 180, item: { name: "Large Medkit", emoji: "💉", hpGain: 60 } },
        { id: "s2", where: "drawer", x: 360, item: APTECHKA },
        { id: "s3", where: "desk", x: 540, item: BANDAGE },
        { id: "s4", where: "underDesk", x: 700, item: BATTERY_M },
      ]},
      { id: "l3-lab", x: 1600, name: "Лаборатория", loot: BOOK, spots: [
        { id: "s1", where: "desk", x: 180 },
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
      { id: "l5-trophy", x: 3450, name: "Зал кубков", loot: PROTEIN, spots: [
        { id: "s1", where: "shelf", x: 180, item: PROTEIN },
        { id: "s2", where: "desk", x: 360, item: BOOK },
        { id: "s3", where: "drawer", x: 540, item: BATTERY_M },
        { id: "s4", where: "trash", x: 700, item: BELL },
      ]},
      { id: "l5-roof-passage", x: 4000, name: "Проход на крышу", loot: APTECHKA, spots: [
        { id: "s1", where: "shelf", x: 180, item: APTECHKA },
        { id: "s2", where: "underDesk", x: 360, item: BATTERY_M },
        { id: "s3", where: "drawer", x: 540, item: MUSIC_BOX },
        { id: "s4", where: "trash", x: 700, item: CHOCO },
      ]},
    ],
    dolls: [
      { id: "l3-z1", x: 600, kind: "switches", name: "Matron Doll" },
      { id: "l3-z2", x: 1000, kind: "quiz", name: "Matron Ballerina Doll" },
      { id: "l3-z3", x: 1200, kind: "trash", name: "Nurse Matron Doll" },
      { id: "l3-z4", x: 1800, kind: "wires", name: "Лаборатория Matron Doll" },
      { id: "l3-z5", x: 2150, kind: "download", name: "Библиотека Matron Doll" },
      { id: "l3-z6", x: 2500, kind: "switches", name: "Библиотека Guard Matron Doll" },
      { id: "l3-z7", x: 2850, kind: "reactor", name: "Canteen Matron Doll" },
      { id: "l3-z8", x: 3100, kind: "aim", name: "Canteen Matron Doll" },
      { id: "l5-z9", x: 3600, kind: "trash", name: "Trophy Guard Matron Doll" },
      { id: "l5-z10", x: 4100, kind: "quiz", name: "Roof Matron Doll" },
    ],
    obstacles: [
      { id: "l5-g1", x: 800, kind: "glass" },
      { id: "l5-g2", x: 1500, kind: "glass" },
      { id: "l5-g3", x: 2200, kind: "glass" },
      { id: "l5-g4", x: 3350, kind: "glass" },
      { id: "l5-g5", x: 3950, kind: "glass" },
    ],
    hideSpots: [
      { id: "l5-h1", x: 700, kind: "locker" },
      { id: "l5-h2", x: 1400, kind: "locker" },
      { id: "l5-h3", x: 2050, kind: "locker" },
      { id: "l5-h4", x: 2700, kind: "locker" },
      { id: "l5-h5", x: 3500, kind: "locker" },
      { id: "l5-h6", x: 4100, kind: "locker" },
    ],
  },
];


export const bossRiddles: { question: string; options: string[]; answer: number }[] = [
  { question: "Что нужно Лане, чтобы видеть в темноте?", options: ["Фонарик", "Мел", "Ложка", "Мяч"], answer: 0 },
  { question: "Где безопаснее спрятаться от куклы?", options: ["В шкафчике", "У окна", "На полу", "В коридоре"], answer: 0 },
  { question: "Что делают батарейки?", options: ["Заряжают фонарик", "Открывают дверь", "Лечат Лану", "Будят куклу"], answer: 0 },
  { question: "Кто главная героиня игры?", options: ["Дина", "Лана", "Карл", "Матрона"], answer: 1 },
];
