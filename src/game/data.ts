export type Puzzle = {
  question: string;
  options: string[];
  answer: number;
  hint?: string;
};

export type Level = {
  id: string;
  location: string;
  intro: string;
  zombiesToKill: number;
  hasClassmate: boolean;
  classmateName?: string;
  classmateLine?: string;
  doorTitle: string;
  doorStory: string;
  puzzle: Puzzle;
};

export const levels: Level[] = [
  {
    id: "classroom",
    location: "КАБИНЕТ №13",
    intro: "Лана выбралась из класса. В коридоре — первые заражённые.",
    zombiesToKill: 3,
    hasClassmate: true,
    classmateName: "МИША",
    classmateLine: "Спасибо, Лана! Держи аптечку!",
    doorTitle: "ЗАМОК НА ДВЕРИ",
    doorStory: "Кодовый замок учителя информатики. На двери — задание мелом.",
    puzzle: {
      question: "2, 6, 12, 20, 30, ? — что дальше?",
      options: ["36", "40", "42", "44"],
      answer: 2,
      hint: "Разница растёт на 2.",
    },
  },
  {
    id: "corridor",
    location: "ВОСТОЧНЫЙ КОРИДОР",
    intro: "Аварийки мигают. Зомби-учителя бредут к Лане.",
    zombiesToKill: 4,
    hasClassmate: true,
    classmateName: "ОЛЯ",
    classmateLine: "Возьми мой батончик — будешь сильнее!",
    doorTitle: "ШКАФЧИКИ ВЫЖИВШИХ",
    doorStory: "Три шкафчика. Только одна записка — правда.",
    puzzle: {
      question: "A:«Ключ здесь». B:«Здесь не ключ». C:«Ключ не в A». Одна правда. Где ключ?",
      options: ["A", "B", "C", "Нигде"],
      answer: 1,
      hint: "Если A правда, то C тоже — противоречие.",
    },
  },
  {
    id: "cafeteria",
    location: "СТОЛОВАЯ",
    intro: "У раздачи — повара-зомби. Прорывайся, Лана!",
    zombiesToKill: 5,
    hasClassmate: true,
    classmateName: "ЖЕНЯ",
    classmateLine: "Возьми поднос — будет щитом!",
    doorTitle: "ВЕСЫ ПОВАРЁНКА",
    doorStory: "У кассы записка: «Если выживешь — реши».",
    puzzle: {
      question: "8 яблок, одно легче. За сколько взвешиваний найдёшь?",
      options: ["1", "2", "3", "4"],
      answer: 1,
      hint: "Делим 3-3-2.",
    },
  },
  {
    id: "library",
    location: "БИБЛИОТЕКА",
    intro: "Стеллажи падают. Зомби-читатели уже близко.",
    zombiesToKill: 5,
    hasClassmate: false,
    doorTitle: "ШИФР МАРИНЫ ПЕТРОВНЫ",
    doorStory: "Раскрытая тетрадь. Кровавый отпечаток.",
    puzzle: {
      question: "ШКОЛА=24, УРОК=16. ЗОМБИ=?",
      options: ["18", "20", "22", "25"],
      answer: 1,
      hint: "Букв × 4.",
    },
  },
  {
    id: "gym",
    location: "СПОРТЗАЛ · БОСС",
    intro: "Директор-зомби. Финал. Бей и отвечай!",
    zombiesToKill: 0,
    hasClassmate: false,
    doorTitle: "КОРОЛЬ-ДИРЕКТОР",
    doorStory: "«Лана… ответь на три загадки — и я открою выход».",
    puzzle: {
      question: "Говорю без рта, оживаю с ветром. Кто я?",
      options: ["Тень", "Эхо", "Призрак", "Мысль"],
      answer: 1,
      hint: "Крикни в горах.",
    },
  },
];

export const bossExtraPuzzles: Puzzle[] = [
  {
    question: "Отец Марии имеет 5 дочерей: Чача, Чече, Чичи, Чочо… пятая?",
    options: ["Чучу", "Мария", "Чача-2", "Неизвестно"],
    answer: 1,
    hint: "Перечитай первое слово.",
  },
  {
    question: "Что становится больше, если поставить с ног на голову?",
    options: ["Гора", "Число 6", "Часы", "Зеркало"],
    answer: 1,
    hint: "6 ↔ 9.",
  },
];
