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
  noise?: number;       // throwable distraction toy — duration in ms zombies are lured
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

export type Zombie = {
  id: string;
  x: number;
  kind: TaskKind;
  name: string;
  sleeping?: boolean;
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
  zombies: Zombie[];
  obstacles?: Obstacle[];
  hideSpots?: HideSpot[];
};

export const FLOOR_Y = 410;
export const CEIL_Y = 90;

// --- helpers ---
const FLASHLIGHT: LootItem = { name: "Flashlight", emoji: "🔦", givesFlashlight: true, battery: 100 };
const BATTERY_S: LootItem = { name: "AA Battery", emoji: "🔋", battery: 35 };
const BATTERY_M: LootItem = { name: "9V Battery", emoji: "🪫", battery: 60 };
const APTECHKA:  LootItem = { name: "Medkit", emoji: "🩹", hpGain: 40 };
const BANDAGE:   LootItem = { name: "Bandage", emoji: "🩹", hpGain: 25 };
const SANDWICH:  LootItem = { name: "Sandwich", emoji: "🥪", hpGain: 8, foodGain: 35 };
const CHOCO:     LootItem = { name: "Chocolate", emoji: "🍫", hpGain: 5, foodGain: 30 };
const ENERGY:    LootItem = { name: "Energy Drink", emoji: "⚡", hpGain: 10, strengthGain: 1, foodGain: 20 };
const SOUP:      LootItem = { name: "Soup", emoji: "🍲", hpGain: 20, foodGain: 50 };
const PROTEIN:   LootItem = { name: "Protein", emoji: "💪", hpGain: 15, strengthGain: 1, foodGain: 25 };
const BOOK:      LootItem = { name: "Textbook", emoji: "📕", strengthGain: 1 };
const ACID:      LootItem = { name: "Acid", emoji: "🧪", strengthGain: 2 };
const MOP:       LootItem = { name: "Mop", emoji: "🧹", strengthGain: 1 };

// Throwable noise toys — lure zombies when thrown (press T)
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
      { id: "l1-21", x: 300, name: "Physics Room #21", loot: SANDWICH, spots: [
        { id: "s1", where: "desk", x: 200, item: SANDWICH },
        { id: "s2", where: "underDesk", x: 380, item: BATTERY_S },
        { id: "s3", where: "shelf", x: 560, item: BOOK },
        { id: "s4", where: "drawer", x: 680, item: PLUSH },
      ]},
      { id: "l1-18", x: 750, name: "Math Room #18", loot: APTECHKA, spots: [
        { id: "s1", where: "shelf", x: 180, item: APTECHKA },
        { id: "s2", where: "desk", x: 360, item: BOOK },
        { id: "s3", where: "underDesk", x: 540, item: BATTERY_S },
        { id: "s4", where: "trash", x: 700, item: BELL },
      ]},
      { id: "l1-7", x: 1450, name: "Literature Room", loot: ENERGY, spots: [
        { id: "s1", where: "desk", x: 200, item: ENERGY },
        { id: "s2", where: "desk", x: 380, item: BOOK },
        { id: "s3", where: "underDesk", x: 560, item: FLASHLIGHT },
        { id: "s4", where: "drawer", x: 700, item: MUSIC_BOX },
      ]},
      { id: "l1-bio", x: 2150, name: "Biology Room", loot: MOP, spots: [
        { id: "s1", where: "shelf", x: 180, item: MOP },
        { id: "s2", where: "underDesk", x: 380, item: BANDAGE },
        { id: "s3", where: "desk", x: 560, item: BATTERY_S },
        { id: "s4", where: "trash", x: 700, item: PLUSH },
      ]},
      { id: "l1-basement-stairs", x: 2850, name: "Basement Stairwell", loot: BATTERY_M, spots: [
        { id: "s1", where: "drawer", x: 180, item: BATTERY_M },
        { id: "s2", where: "underDesk", x: 360, item: BANDAGE },
        { id: "s3", where: "shelf", x: 540, item: BELL },
        { id: "s4", where: "trash", x: 700 },
      ]},
      { id: "l1-boiler", x: 3350, name: "Boiler Basement", loot: ENERGY, spots: [
        { id: "s1", where: "shelf", x: 180, item: ENERGY },
        { id: "s2", where: "drawer", x: 360, item: BATTERY_M },
        { id: "s3", where: "underDesk", x: 540, item: MOP },
        { id: "s4", where: "trash", x: 700, item: CHOCO },
      ]},
      { id: "l1-laundry", x: 3750, name: "Basement Laundry", loot: SANDWICH, spots: [
        { id: "s1", where: "desk", x: 180, item: SANDWICH },
        { id: "s2", where: "drawer", x: 360, item: BATTERY_S },
        { id: "s3", where: "shelf", x: 540, item: PLUSH },
        { id: "s4", where: "trash", x: 700, item: BANDAGE },
      ]},
      { id: "l1-map", x: 3300, name: "Map Room", loot: BOOK, spots: [
        { id: "s1", where: "shelf", x: 180, item: BOOK },
        { id: "s2", where: "desk", x: 360, item: BATTERY_S },
        { id: "s3", where: "drawer", x: 540, item: CHOCO },
        { id: "s4", where: "trash", x: 700, item: BELL },
      ]},
      { id: "l1-east-hall", x: 3850, name: "East Hall Classroom", loot: SOUP, spots: [
        { id: "s1", where: "desk", x: 180, item: SOUP },
        { id: "s2", where: "underDesk", x: 360, item: BATTERY_M },
        { id: "s3", where: "shelf", x: 540, item: BOOK },
        { id: "s4", where: "drawer", x: 700, item: MUSIC_BOX },
      ]},
    ],
    zombies: [
      { id: "l1-z1", x: 500, kind: "switches", name: "Cracked Toy Soldier" },
      { id: "l1-z2", x: 950, kind: "trash", name: "Sleeping Plush Bear", sleeping: true },
      { id: "l1-z3", x: 1050, kind: "trash", name: "Plush Bear" },
      { id: "l1-z4", x: 1750, kind: "wires", name: "Broken Tin Robot" },
      { id: "l1-z5", x: 2050, kind: "trash", name: "Sleeping Rag Doll", sleeping: true },
      { id: "l1-z6", x: 2450, kind: "trash", name: "Rag Doll" },
      { id: "l1-z7", x: 3050, kind: "quiz", name: "Basement Doll" },
      { id: "l1-z8", x: 3500, kind: "wires", name: "Sleeping Boiler Puppet", sleeping: true },
      { id: "l1-z9", x: 3850, kind: "trash", name: "Laundry Clown" },
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
      { id: "l2-tu", x: 350, name: "Teachers Lounge", loot: CHOCO, spots: [
        { id: "s1", where: "desk", x: 180, item: CHOCO },
        { id: "s2", where: "drawer", x: 360, item: BATTERY_M },
        { id: "s3", where: "underDesk", x: 540, item: BANDAGE },
        { id: "s4", where: "shelf", x: 700, item: BOOK },
      ]},
      { id: "l2-eng", x: 850, name: "English Room", loot: BANDAGE, spots: [
        { id: "s1", where: "desk", x: 200, item: BANDAGE },
        { id: "s2", where: "desk", x: 380, item: BATTERY_S },
        { id: "s3", where: "underDesk", x: 560, item: FLASHLIGHT },
        { id: "s4", where: "trash", x: 700 },
      ]},
      { id: "l2-inf", x: 1500, name: "Computer Lab", loot: BATTERY_M, spots: [
        { id: "s1", where: "desk", x: 180, item: BATTERY_M },
        { id: "s2", where: "drawer", x: 360, item: BATTERY_M },
        { id: "s3", where: "shelf", x: 540, item: BOOK },
        { id: "s4", where: "underDesk", x: 700, item: ENERGY },
      ]},
      { id: "l2-mus", x: 2100, name: "Music Room", loot: { name: "Guitar", emoji: "🎸", strengthGain: 2 }, spots: [
        { id: "s1", where: "shelf", x: 200, item: { name: "Guitar", emoji: "🎸", strengthGain: 2 } },
        { id: "s2", where: "underDesk", x: 400, item: BATTERY_S },
        { id: "s3", where: "drawer", x: 580, item: BANDAGE },
        { id: "s4", where: "trash", x: 700, item: CHOCO },
      ]},
      { id: "l2-gym", x: 2700, name: "Gym", loot: PROTEIN, spots: [
        { id: "s1", where: "shelf", x: 180, item: PROTEIN },
        { id: "s2", where: "desk", x: 360, item: { name: "Whistle", emoji: "📣", strengthGain: 1 } },
        { id: "s3", where: "underDesk", x: 540, item: BATTERY_M },
        { id: "s4", where: "trash", x: 700, item: APTECHKA },
      ]},
      { id: "l2-map", x: 3300, name: "Map Room", loot: BOOK, spots: [
        { id: "s1", where: "shelf", x: 180, item: BOOK },
        { id: "s2", where: "desk", x: 360, item: BATTERY_S },
        { id: "s3", where: "drawer", x: 540, item: CHOCO },
        { id: "s4", where: "trash", x: 700, item: BELL },
      ]},
      { id: "l2-east-hall", x: 3850, name: "East Hall Classroom", loot: SOUP, spots: [
        { id: "s1", where: "desk", x: 180, item: SOUP },
        { id: "s2", where: "underDesk", x: 360, item: BATTERY_M },
        { id: "s3", where: "shelf", x: 540, item: BOOK },
        { id: "s4", where: "drawer", x: 700, item: MUSIC_BOX },
      ]},
    ],
    zombies: [
      { id: "l2-z1", x: 600, kind: "switches", name: "Porcelain Hall Doll" },
      { id: "l2-z2", x: 1000, kind: "download", name: "Sleeping Music Box", sleeping: true },
      { id: "l2-z3", x: 1200, kind: "download", name: "Music Box" },
      { id: "l2-z4", x: 1800, kind: "switches", name: "Kitchen Puppet" },
      { id: "l2-z5", x: 2200, kind: "trash", name: "Sleeping Toy Guard", sleeping: true },
      { id: "l2-z6", x: 2400, kind: "aim", name: "Clockwork Monkey" },
      { id: "l2-z7", x: 2950, kind: "trash", name: "Mop-Head Doll" },
      { id: "l2-z8", x: 3450, kind: "quiz", name: "Maproom Marionette" },
      { id: "l2-z9", x: 4000, kind: "wires", name: "Sleeping Hall Marionette", sleeping: true },
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
      { id: "l3a-art", x: 350, name: "Art Room", loot: BOOK, spots: [
        { id: "s1", where: "desk", x: 180 },
        { id: "s2", where: "shelf", x: 360, item: BOOK },
        { id: "s3", where: "underDesk", x: 540, item: BATTERY_S },
        { id: "s4", where: "drawer", x: 700, item: BANDAGE },
      ]},
      { id: "l3a-tech", x: 900, name: "Shop Class", loot: { name: "Hammer", emoji: "🔨", strengthGain: 2 }, spots: [
        { id: "s1", where: "shelf", x: 180, item: { name: "Hammer", emoji: "🔨", strengthGain: 2 } },
        { id: "s2", where: "desk", x: 360, item: { name: "Screwdriver", emoji: "🪛", strengthGain: 1 } },
        { id: "s3", where: "drawer", x: 540, item: BATTERY_M },
        { id: "s4", where: "trash", x: 700, item: CHOCO },
      ]},
      { id: "l3a-geo", x: 1500, name: "Geography Room", loot: BOOK, spots: [
        { id: "s1", where: "shelf", x: 180, item: BOOK },
        { id: "s2", where: "desk", x: 360, item: SANDWICH },
        { id: "s3", where: "underDesk", x: 540, item: BATTERY_S },
        { id: "s4", where: "drawer", x: 700, item: BANDAGE },
      ]},
      { id: "l3a-hist", x: 2100, name: "History Room", loot: ENERGY, spots: [
        { id: "s1", where: "desk", x: 180, item: ENERGY },
        { id: "s2", where: "shelf", x: 360, item: BOOK },
        { id: "s3", where: "drawer", x: 540, item: BATTERY_M },
        { id: "s4", where: "underDesk", x: 700, item: APTECHKA },
      ]},
      { id: "l3a-astr", x: 2700, name: "Astronomy Room", loot: FLASHLIGHT, spots: [
        { id: "s1", where: "shelf", x: 180, item: FLASHLIGHT },
        { id: "s2", where: "desk", x: 360, item: BATTERY_M },
        { id: "s3", where: "drawer", x: 540, item: CHOCO },
        { id: "s4", where: "trash", x: 700, item: BATTERY_S },
      ]},
      { id: "l3a-studio", x: 3300, name: "Studio Annex", loot: ENERGY, spots: [
        { id: "s1", where: "desk", x: 180, item: ENERGY },
        { id: "s2", where: "shelf", x: 360, item: BOOK },
        { id: "s3", where: "drawer", x: 540, item: BATTERY_S },
        { id: "s4", where: "trash", x: 700, item: PLUSH },
      ]},
      { id: "l3a-greenhouse", x: 3800, name: "Greenhouse Hall", loot: SANDWICH, spots: [
        { id: "s1", where: "shelf", x: 180, item: SANDWICH },
        { id: "s2", where: "underDesk", x: 360, item: BANDAGE },
        { id: "s3", where: "drawer", x: 540, item: BATTERY_M },
        { id: "s4", where: "trash", x: 700, item: CHOCO },
      ]},
    ],
    zombies: [
      { id: "l3a-z1", x: 550, kind: "aim", name: "Paint-Stained Doll" },
      { id: "l3a-z2", x: 1100, kind: "wires", name: "Sleeping Workshop Puppet", sleeping: true },
      { id: "l3a-z3", x: 1300, kind: "switches", name: "Workshop Puppet" },
      { id: "l3a-z4", x: 1750, kind: "trash", name: "Globe-Head Doll" },
      { id: "l3a-z5", x: 2300, kind: "download", name: "Sleeping History Doll", sleeping: true },
      { id: "l3a-z6", x: 2550, kind: "switches", name: "Star-Gazer Doll" },
      { id: "l3a-z7", x: 3350, kind: "aim", name: "Long-Armed Clown" },
      { id: "l3a-z8", x: 3900, kind: "download", name: "Sleeping Garden Doll", sleeping: true },
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
    name: "Floor 4 · Attic & Storage",
    worldW: 4800,
    exitX: 4650,
    classrooms: [
      { id: "l4-store", x: 350, name: "Equipment Storage", loot: { name: "Crowbar", emoji: "⛏️", strengthGain: 2 }, spots: [
        { id: "s1", where: "shelf", x: 180, item: { name: "Crowbar", emoji: "⛏️", strengthGain: 2 } },
        { id: "s2", where: "drawer", x: 360, item: BATTERY_M },
        { id: "s3", where: "underDesk", x: 540, item: MOP },
        { id: "s4", where: "trash", x: 700, item: BANDAGE },
      ]},
      { id: "l4-attic", x: 900, name: "Attic", loot: FLASHLIGHT, spots: [
        { id: "s1", where: "shelf", x: 180, item: FLASHLIGHT },
        { id: "s2", where: "drawer", x: 360, item: BATTERY_M },
        { id: "s3", where: "underDesk", x: 540, item: BATTERY_S },
        { id: "s4", where: "trash", x: 700, item: CHOCO },
      ]},
      { id: "l4-server", x: 1500, name: "Server Room", loot: BATTERY_M, spots: [
        { id: "s1", where: "desk", x: 180, item: BATTERY_M },
        { id: "s2", where: "shelf", x: 360, item: BATTERY_M },
        { id: "s3", where: "drawer", x: 540, item: BATTERY_S },
        { id: "s4", where: "underDesk", x: 700, item: ENERGY },
      ]},
      { id: "l4-locker", x: 2100, name: "Locker Room", loot: PROTEIN, spots: [
        { id: "s1", where: "shelf", x: 180, item: PROTEIN },
        { id: "s2", where: "drawer", x: 360, item: SANDWICH },
        { id: "s3", where: "desk", x: 540, item: BANDAGE },
        { id: "s4", where: "trash", x: 700, item: BATTERY_S },
      ]},
      { id: "l4-aux", x: 2750, name: "Utility Room", loot: APTECHKA, spots: [
        { id: "s1", where: "shelf", x: 180, item: APTECHKA },
        { id: "s2", where: "drawer", x: 360, item: MOP },
        { id: "s3", where: "underDesk", x: 540, item: BATTERY_M },
        { id: "s4", where: "trash", x: 700, item: CHOCO },
      ]},
      { id: "l4-dusty-attic", x: 3350, name: "Dusty Attic Hall", loot: BOOK, spots: [
        { id: "s1", where: "shelf", x: 180, item: BOOK },
        { id: "s2", where: "drawer", x: 360, item: BATTERY_M },
        { id: "s3", where: "underDesk", x: 540, item: MUSIC_BOX },
        { id: "s4", where: "trash", x: 700, item: BANDAGE },
      ]},
      { id: "l4-roof-storage", x: 3900, name: "Roof Storage", loot: FLASHLIGHT, spots: [
        { id: "s1", where: "shelf", x: 180, item: FLASHLIGHT },
        { id: "s2", where: "desk", x: 360, item: BATTERY_M },
        { id: "s3", where: "drawer", x: 540, item: CHOCO },
        { id: "s4", where: "trash", x: 700, item: PLUSH },
      ]},
      { id: "l4-water-tank", x: 4350, name: "Water Tank Loft", loot: PROTEIN, spots: [
        { id: "s1", where: "shelf", x: 180, item: PROTEIN },
        { id: "s2", where: "underDesk", x: 360, item: BATTERY_S },
        { id: "s3", where: "drawer", x: 540, item: APTECHKA },
        { id: "s4", where: "trash", x: 700 },
      ]},
    ],
    zombies: [
      { id: "l4-z1", x: 550, kind: "trash", name: "Storage Bear" },
      { id: "l4-z2", x: 1050, kind: "switches", name: "Sleeping Wire Puppet", sleeping: true },
      { id: "l4-z3", x: 1250, kind: "wires", name: "Wire Puppet" },
      { id: "l4-z4", x: 1750, kind: "download", name: "Server Room Toy" },
      { id: "l4-z5", x: 2300, kind: "aim", name: "Sleeping Gym Monkey", sleeping: true },
      { id: "l4-z6", x: 2600, kind: "switches", name: "Locker Doll" },
      { id: "l4-z7", x: 2950, kind: "trash", name: "Method Doll" },
      { id: "l4-z8", x: 3500, kind: "quiz", name: "Attic Archivist" },
      { id: "l4-z9", x: 4050, kind: "aim", name: "Sleeping Roof Watcher", sleeping: true },
      { id: "l4-z10", x: 4450, kind: "download", name: "Zombie Tank Keeper" },
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
      { id: "l3-arch", x: 400, name: "Archive", loot: BOOK, spots: [
        { id: "s1", where: "shelf", x: 180, item: BOOK },
        { id: "s2", where: "drawer", x: 360, item: BATTERY_M },
        { id: "s3", where: "underDesk", x: 540, item: BATTERY_S },
        { id: "s4", where: "trash", x: 700, item: BANDAGE },
      ]},
      { id: "l3-med", x: 950, name: "Nurse Office", loot: { name: "Large Medkit", emoji: "💉", hpGain: 60 }, spots: [
        { id: "s1", where: "shelf", x: 180, item: { name: "Large Medkit", emoji: "💉", hpGain: 60 } },
        { id: "s2", where: "drawer", x: 360, item: APTECHKA },
        { id: "s3", where: "desk", x: 540, item: BANDAGE },
        { id: "s4", where: "underDesk", x: 700, item: BATTERY_M },
      ]},
      { id: "l3-lab", x: 1600, name: "Laboratory", loot: BOOK, spots: [
        { id: "s1", where: "desk", x: 180 },
        { id: "s2", where: "shelf", x: 360, item: FLASHLIGHT },
        { id: "s3", where: "drawer", x: 540, item: BATTERY_M },
        { id: "s4", where: "underDesk", x: 700, item: BATTERY_M },
      ]},
      { id: "l3-libr", x: 2250, name: "Library", loot: BOOK, spots: [
        { id: "s1", where: "shelf", x: 180, item: BOOK },
        { id: "s2", where: "shelf", x: 360, item: BOOK },
        { id: "s3", where: "underDesk", x: 540, item: BATTERY_S },
        { id: "s4", where: "drawer", x: 700, item: CHOCO },
      ]},
      { id: "l3-canteen", x: 2900, name: "Cafeteria", loot: SOUP, spots: [
        { id: "s1", where: "desk", x: 180, item: SOUP },
        { id: "s2", where: "shelf", x: 360, item: SANDWICH },
        { id: "s3", where: "drawer", x: 540, item: CHOCO },
        { id: "s4", where: "underDesk", x: 700, item: BATTERY_M },
      ]},
      { id: "l5-trophy", x: 3450, name: "Trophy Hall", loot: PROTEIN, spots: [
        { id: "s1", where: "shelf", x: 180, item: PROTEIN },
        { id: "s2", where: "desk", x: 360, item: BOOK },
        { id: "s3", where: "drawer", x: 540, item: BATTERY_M },
        { id: "s4", where: "trash", x: 700, item: BELL },
      ]},
      { id: "l5-roof-passage", x: 4000, name: "Roof Passage", loot: APTECHKA, spots: [
        { id: "s1", where: "shelf", x: 180, item: APTECHKA },
        { id: "s2", where: "underDesk", x: 360, item: BATTERY_M },
        { id: "s3", where: "drawer", x: 540, item: MUSIC_BOX },
        { id: "s4", where: "trash", x: 700, item: CHOCO },
      ]},
    ],
    zombies: [
      { id: "l3-z1", x: 600, kind: "switches", name: "Archive Doll" },
      { id: "l3-z2", x: 1000, kind: "trash", name: "Sleeping Nurse Doll", sleeping: true },
      { id: "l3-z3", x: 1200, kind: "trash", name: "Nurse Doll" },
      { id: "l3-z4", x: 1800, kind: "wires", name: "Laboratory Puppet" },
      { id: "l3-z5", x: 2150, kind: "switches", name: "Sleeping Library Guard", sleeping: true },
      { id: "l3-z6", x: 2500, kind: "switches", name: "Library Guard Doll" },
      { id: "l3-z7", x: 2850, kind: "switches", name: "Sleeping Canteen Clown", sleeping: true },
      { id: "l3-z8", x: 3100, kind: "download", name: "Canteen Clown" },
      { id: "l5-z9", x: 3600, kind: "aim", name: "Trophy Guard Doll" },
      { id: "l5-z10", x: 4100, kind: "quiz", name: "Sleeping Roof Doll", sleeping: true },
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
  { question: "What gets bigger when you turn it upside down?", options: ["Mountain", "Number 6", "Clock", "Mirror"], answer: 1 },
  { question: "I speak without a mouth and hear without ears. What am I?", options: ["Shadow", "Echo", "Wind", "Sleep"], answer: 1 },
  { question: "1, 1, 2, 3, 5, 8, 13, ?", options: ["18", "20", "21", "24"], answer: 2 },
  { question: "Mary's father has 5 daughters: ChaCha, CheChe, ChiChi, ChoCho… What's the fifth one's name?", options: ["ChuChu", "Mary", "ChaCha", "Don't know"], answer: 1 },
];
