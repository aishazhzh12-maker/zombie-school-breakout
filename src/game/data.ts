export type Puzzle = {
  question: string;
  options?: string[];          // если есть — вариант выбора
  answer: number | string;     // index для options; строка для input/code
  input?: "number" | "text" | "code"; // тип ввода если нет options
  codeLength?: number;         // для input=code: длина кода
  hint?: string;
};

export type Supply = {
  type: "food" | "medkit" | "energy" | "weapon" | "nothing";
  name: string;
  emoji: string;
  hpGain?: number;
  maxHpGain?: number;
  strengthGain?: number;
  scoreGain?: number;
  description: string;
};

export const supplyPool: Supply[] = [
  { type: "food", name: "Бутерброд из столовой", emoji: "🥪", hpGain: 15, scoreGain: 10, description: "Чёрствый, но съедобный. Лана глотает не жуя." },
  { type: "food", name: "Шоколадный батончик", emoji: "🍫", hpGain: 10, scoreGain: 5, description: "Был в кармане у одноклассника. Сахар спасает." },
  { type: "food", name: "Яблоко", emoji: "🍎", hpGain: 8, scoreGain: 5, description: "Из учительской. Хрустит." },
  { type: "energy", name: "Энергетик", emoji: "⚡", hpGain: 5, strengthGain: 1, scoreGain: 15, description: "Запрещённый в школе. Сегодня — спасение." },
  { type: "medkit", name: "Школьная аптечка", emoji: "🩹", hpGain: 35, maxHpGain: 10, scoreGain: 25, description: "Бинты, йод, пара таблеток. Лана выдыхает." },
  { type: "weapon", name: "Швабра уборщицы", emoji: "🧹", strengthGain: 1, scoreGain: 15, description: "Длинная, прочная. Сила +1." },
  { type: "weapon", name: "Учебник физики", emoji: "📕", strengthGain: 1, scoreGain: 10, description: "Тяжёлый. Знания = сила." },
  { type: "food", name: "Бутылка воды", emoji: "💧", hpGain: 12, scoreGain: 5, description: "Холодная. Лана делает три жадных глотка." },
];

// Pool of logic questions used to "defeat" a zombie. Right answer = kill.
export const combatPuzzles: Puzzle[] = [
  { question: "Если все розы — цветы, и некоторые цветы быстро вянут, то…", options: ["Все розы быстро вянут", "Некоторые розы могут быстро вянуть", "Розы не вянут", "Никаких выводов"], answer: 1, hint: "«Некоторые» допускает оба варианта." },
  { question: "Продолжи: 1, 1, 2, 3, 5, 8, ?", options: ["11", "12", "13", "15"], answer: 2, hint: "Сумма двух предыдущих." },
  { question: "В корзине 5 яблок. Раздай 5 детям так, чтобы одно яблоко осталось в корзине.", options: ["Невозможно", "Отдать корзину с яблоком", "Разрезать яблоко", "Дать 4 детям"], answer: 1, hint: "Одно яблоко может уйти вместе с корзиной." },
  { question: "Какое число лишнее: 9, 16, 25, 36, 49, 50?", options: ["9", "36", "49", "50"], answer: 3, hint: "Квадраты целых чисел." },
  { question: "Что тяжелее: килограмм пуха или килограмм железа?", options: ["Железо", "Пух", "Одинаково", "Зависит от объёма"], answer: 2, hint: "Килограмм есть килограмм." },
  { question: "Часы показывают 15:15. Какой угол между стрелками?", options: ["0°", "7,5°", "15°", "30°"], answer: 1, hint: "Часовая стрелка не стоит на 3." },
  { question: "Если 5 машин делают 5 деталей за 5 минут, за сколько 100 машин сделают 100 деталей?", options: ["1 мин", "5 мин", "20 мин", "100 мин"], answer: 1, hint: "Скорость не зависит от количества машин." },
  { question: "У отца 6 сыновей. У каждого сына — одна сестра. Сколько детей всего?", options: ["6", "7", "12", "13"], answer: 1, hint: "Сестра у всех — одна и та же." },
  { question: "Какое слово содержит 6 букв «о»?", options: ["Колобок", "Хорошо", "Молоковоз", "Обороноспособность"], answer: 3, hint: "Длинное." },
  { question: "Лана идёт со скоростью 4 км/ч. За сколько пройдёт 2 км?", options: ["15 мин", "20 мин", "30 мин", "45 мин"], answer: 2, hint: "Время = путь / скорость." },
  { question: "Какая цифра пропущена: 2, 4, 8, 16, ?, 64", options: ["24", "30", "32", "48"], answer: 2, hint: "Каждое × 2." },
  { question: "В комнате 4 угла. В каждом сидит кошка. Напротив каждой кошки — 3 кошки. Сколько кошек всего?", options: ["3", "4", "12", "16"], answer: 1, hint: "Перечитай: их 4." },
  { question: "Дочь моего отца — но не моя сестра. Кто она?", options: ["Мать", "Тётя", "Я сама", "Бабушка"], answer: 2, hint: "Подумай о себе." },
  { question: "У меня 3 свечи. 2 потухли. Сколько свечей осталось?", options: ["1", "2", "3", "0"], answer: 1, hint: "Те, что горят — сгорят." },
  { question: "Найди закономерность: ПН, ВТ, СР, ?, ПТ", options: ["ВС", "СБ", "ЧТ", "ПН"], answer: 2, hint: "Дни недели." },
  { question: "Что можно увидеть с закрытыми глазами?", options: ["Свет", "Сон", "Цвет", "Ничего"], answer: 1, hint: "Случается ночью." },
  { question: "Если вчера была среда, какой день будет послезавтра?", options: ["Пятница", "Суббота", "Воскресенье", "Понедельник"], answer: 1, hint: "Сегодня — четверг." },
  { question: "На столе 4 кружки, по 2 в каждом ряду и в каждом столбце. Как?", options: ["Невозможно", "В форме квадрата", "В форме треугольника", "В одну линию"], answer: 1, hint: "Квадрат 2×2." },
  // ===== Математические задачи (ввод числа) =====
  { question: "Реши: 17 × 6 = ?", input: "number", answer: "102", hint: "17×6 = 17×5 + 17." },
  { question: "В рюкзаке 3 тетради по 48 страниц. Всего страниц?", input: "number", answer: "144", hint: "3 × 48." },
  { question: "Лана пробежала 250 м за 50 секунд. Скорость в м/с?", input: "number", answer: "5", hint: "путь / время." },
  { question: "Корень из 169 = ?", input: "number", answer: "13", hint: "13² = 169." },
  { question: "Сколько секунд в 2 часах 15 минутах?", input: "number", answer: "8100", hint: "2·3600 + 15·60." },
  { question: "Уравнение: 3x + 7 = 28. Чему равен x?", input: "number", answer: "7", hint: "3x = 21." },
  { question: "Половина от четверти от 800?", input: "number", answer: "100", hint: "800/4 = 200, /2 = 100." },
  { question: "Сколько простых чисел от 1 до 20?", input: "number", answer: "8", hint: "2,3,5,7,11,13,17,19." },
];

export type Level = {
  id: string;
  location: string;
  intro: string;
  classroomsToCheck: number;
  zombiesToDefeat: number;
  bgGradient: string;
  exitTitle: string;
  exitStory: string;
  exitPuzzle: Puzzle;
};

export const levels: Level[] = [
  {
    id: "first-floor",
    location: "Первый этаж · 14:32",
    intro: "Лана выскользнула из кабинета №13. Коридор пуст… пока что.",
    classroomsToCheck: 3,
    zombiesToDefeat: 2,
    bgGradient: "linear-gradient(180deg, #1a2a22 0%, #0e1812 60%, #1a1410 100%)",
    exitTitle: "Дверь на лестницу",
    exitStory: "Дверь заперта цифровым замком учителя информатики.",
    exitPuzzle: { question: "2, 6, 12, 20, 30, ?", options: ["36", "40", "42", "44"], answer: 2, hint: "Разница растёт на 2." },
  },
  {
    id: "east-wing",
    location: "Восточное крыло · 14:55",
    intro: "Лампы мигают. Из-за поворота уже слышны стоны.",
    classroomsToCheck: 3,
    zombiesToDefeat: 3,
    bgGradient: "linear-gradient(180deg, #1f1a28 0%, #100c16 60%, #161018 100%)",
    exitTitle: "Кодовый замок",
    exitStory: "На стене кровью: «3-помножь-первую, 7-плюс-2, разделить-на-3, минус-1». Шифр учителя информатики.",
    exitPuzzle: { question: "Введи 4-значный код. Подсказка: ШИФР = 3·первая_цифра_класса, +9, /3, -1. Класс №13.", input: "code", codeLength: 4, answer: "3942", hint: "3·1=3, 3+9·1=… Нет, читай буквально: 3·1=3, 9, 9/3=3, 13-1=12 → объединить по одной цифре каждого шага: 3,9,3,12 — берём 2. Код: 3-9-3-2? Перечитай: 3·1, 9, 3, 12→2." },
  },
  {
    id: "east-wing-old",
    location: "_unused",
    intro: "",
    classroomsToCheck: 0,
    zombiesToDefeat: 0,
    bgGradient: "",
    exitTitle: "",
    exitStory: "",
    exitPuzzle: { question: "A:«Ключ здесь». B:«Здесь не ключ». C:«Ключ не в A». Одна правда. Где ключ?", options: ["A", "B", "C", "Нигде"], answer: 1, hint: "Если A правда, то C тоже — противоречие." },
  },
  {
    id: "cafeteria",
    location: "Столовая · 15:22",
    intro: "Запах гнилой еды. У раздачи — повара с мёртвыми глазами.",
    classroomsToCheck: 2,
    zombiesToDefeat: 4,
    bgGradient: "linear-gradient(180deg, #1f2a2f 0%, #0e1418 60%, #181214 100%)",
    exitTitle: "Весы поварёнка",
    exitStory: "У кассы — записка.",
    exitPuzzle: { question: "8 яблок, одно легче. За сколько взвешиваний найдёшь его на чашечных весах?", options: ["1", "2", "3", "4"], answer: 1, hint: "Делим 3-3-2." },
  },
  {
    id: "library",
    location: "Библиотека · 15:48",
    intro: "Стеллажи рухнули. Зомби-читатели всё ещё «читают».",
    classroomsToCheck: 3,
    zombiesToDefeat: 4,
    bgGradient: "linear-gradient(180deg, #2a1f14 0%, #160e08 60%, #1a1410 100%)",
    exitTitle: "Шифр Марины Петровны",
    exitStory: "Тетрадь библиотекаря. Кровавый отпечаток.",
    exitPuzzle: { question: "ШКОЛА=24, УРОК=16. ЗОМБИ=?", options: ["18", "20", "22", "25"], answer: 1, hint: "Букв × 4." },
  },
  {
    id: "gym",
    location: "Спортзал · 16:10 · ФИНАЛ",
    intro: "Двери закрылись. В центре — ОН. Директор Анатолий Сергеевич.",
    classroomsToCheck: 0,
    zombiesToDefeat: 0,
    bgGradient: "linear-gradient(180deg, #2a1818 0%, #180a0a 60%, #1a0a0a 100%)",
    exitTitle: "Король-Директор",
    exitStory: "«Лана… ответь на три загадки — и я открою выход. Иначе…»",
    exitPuzzle: { question: "Говорю без рта, оживаю с ветром. Кто я?", options: ["Тень", "Эхо", "Призрак", "Мысль"], answer: 1, hint: "Крикни в горах." },
  },
];

export const bossExtraPuzzles: Puzzle[] = [
  { question: "Отец Марии имеет 5 дочерей: Чача, Чече, Чичи, Чочо… пятая?", options: ["Чучу", "Мария", "Чача-2", "Неизвестно"], answer: 1, hint: "Перечитай первое слово." },
  { question: "Что становится больше, если поставить с ног на голову?", options: ["Гора", "Число 6", "Часы", "Зеркало"], answer: 1, hint: "6 ↔ 9." },
];

// Classroom flavor names per level
export const classroomNames = [
  "Кабинет физики №21",
  "Учительская",
  "Кабинет химии №18",
  "Кабинет литературы №7",
  "Раздевалка",
  "Кладовая",
  "Кабинет биологии №25",
  "Архив",
  "Кабинет рисования",
];
