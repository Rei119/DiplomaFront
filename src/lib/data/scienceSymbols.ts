// src/lib/data/scienceSymbols.ts

export type KeyboardType = 'math' | 'chemistry' | 'physics';

export interface Symbol {
  label: string;        // Display on button
  latex: string;        // Text to insert (Unicode where possible, LaTeX for complex)
  description: string;  // Tooltip
}

// ── Math ──────────────────────────────────────────────────────────────────────

export const MATH_SYMBOLS: Symbol[] = [
  // Powers & indices
  { label: 'x²',  latex: '²',            description: 'Дэд зэрэг 2' },
  { label: 'x³',  latex: '³',            description: 'Дэд зэрэг 3' },
  { label: 'xⁿ',  latex: '^{}',          description: 'Зэрэг (дурын)' },
  { label: 'x₁',  latex: '₁',            description: 'Доод индекс 1' },
  { label: 'x₂',  latex: '₂',            description: 'Доод индекс 2' },
  { label: 'xₙ',  latex: '_{}',          description: 'Доод индекс (дурын)' },

  // Fractions & roots
  { label: '½',   latex: '½',            description: 'Тэн хагас' },
  { label: '⅓',   latex: '⅓',            description: 'Гуравны нэг' },
  { label: 'a/b', latex: '\\frac{}{}',   description: 'Бутархай' },
  { label: '√',   latex: '√',            description: 'Квадрат язгуур' },
  { label: '∛',   latex: '∛',            description: 'Куб язгуур' },
  { label: 'ⁿ√',  latex: '\\sqrt[n]{}', description: 'n-р язгуур' },

  // Basic operators
  { label: '±',   latex: '±',            description: 'Нэмэх/хасах' },
  { label: '×',   latex: '×',            description: 'Үржих' },
  { label: '÷',   latex: '÷',            description: 'Хуваах' },
  { label: '≠',   latex: '≠',            description: 'Тэнцүү биш' },
  { label: '≈',   latex: '≈',            description: 'Ойролцоо тэнцүү' },
  { label: '≤',   latex: '≤',            description: 'Бага буюу тэнцүү' },
  { label: '≥',   latex: '≥',            description: 'Их буюу тэнцүү' },
  { label: '∞',   latex: '∞',            description: 'Тэгш бус' },

  // Greek letters
  { label: 'π',   latex: 'π',            description: 'Пи' },
  { label: 'α',   latex: 'α',            description: 'Альфа' },
  { label: 'β',   latex: 'β',            description: 'Бета' },
  { label: 'γ',   latex: 'γ',            description: 'Гамма' },
  { label: 'δ',   latex: 'δ',            description: 'Дельта' },
  { label: 'θ',   latex: 'θ',            description: 'Тета' },
  { label: 'λ',   latex: 'λ',            description: 'Ламбда' },
  { label: 'σ',   latex: 'σ',            description: 'Сигма' },
  { label: 'Σ',   latex: 'Σ',            description: 'Сигма (том)' },
  { label: 'Δ',   latex: 'Δ',            description: 'Дельта (том)' },
  { label: 'μ',   latex: 'μ',            description: 'Мю' },
  { label: 'Ω',   latex: 'Ω',            description: 'Омега' },

  // Sets & logic
  { label: '∈',   latex: '∈',            description: 'Элемент' },
  { label: '∉',   latex: '∉',            description: 'Элемент биш' },
  { label: '⊂',   latex: '⊂',            description: 'Дэд олонлог' },
  { label: '∪',   latex: '∪',            description: 'Нэгдэл' },
  { label: '∩',   latex: '∩',            description: 'Огтлолцол' },
  { label: '∀',   latex: '∀',            description: 'Бүх' },
  { label: '∃',   latex: '∃',            description: 'Оршино' },

  // Calculus
  { label: '∫',   latex: '∫',            description: 'Интеграл' },
  { label: 'd/dx', latex: 'd/dx',        description: 'Уламжлал' },
  { label: '∂',   latex: '∂',            description: 'Хэсэгчилсэн уламжлал' },
  { label: 'lim', latex: 'lim',          description: 'Хязгаар' },
];

// ── Chemistry ─────────────────────────────────────────────────────────────────

export const CHEMISTRY_SYMBOLS: Symbol[] = [
  // Common molecules
  { label: 'H₂O',   latex: 'H₂O',    description: 'Ус' },
  { label: 'CO₂',   latex: 'CO₂',    description: 'Нүүрсхүчлийн хий' },
  { label: 'O₂',    latex: 'O₂',     description: 'Хүчилтөрөгч' },
  { label: 'N₂',    latex: 'N₂',     description: 'Азот' },
  { label: 'H₂',    latex: 'H₂',     description: 'Устөрөгч' },
  { label: 'H₂SO₄', latex: 'H₂SO₄', description: 'Хүхрийн хүчил' },
  { label: 'HCl',   latex: 'HCl',    description: 'Давсны хүчил' },
  { label: 'NaCl',  latex: 'NaCl',   description: 'Давс' },
  { label: 'NaOH',  latex: 'NaOH',   description: 'Натрийн гидроксид' },
  { label: 'NH₃',   latex: 'NH₃',    description: 'Аммиак' },

  // Ions
  { label: 'e⁻',    latex: 'e⁻',     description: 'Электрон' },
  { label: 'H⁺',    latex: 'H⁺',     description: 'Устөрөгчийн ион' },
  { label: 'OH⁻',   latex: 'OH⁻',    description: 'Гидроксил' },
  { label: 'Na⁺',   latex: 'Na⁺',    description: 'Натрийн ион' },
  { label: 'Cl⁻',   latex: 'Cl⁻',    description: 'Хлорын ион' },
  { label: 'Ca²⁺',  latex: 'Ca²⁺',   description: 'Кальцийн ион' },

  // Subscript / superscript digits
  { label: '²',  latex: '²',  description: 'Дээд индекс 2' },
  { label: '³',  latex: '³',  description: 'Дээд индекс 3' },
  { label: '₁',  latex: '₁',  description: 'Доод индекс 1' },
  { label: '₂',  latex: '₂',  description: 'Доод индекс 2' },
  { label: '₃',  latex: '₃',  description: 'Доод индекс 3' },
  { label: '₄',  latex: '₄',  description: 'Доод индекс 4' },

  // Arrows
  { label: '→',  latex: '→',  description: 'Урвал' },
  { label: '⇌',  latex: '⇌',  description: 'Урвуу урвал' },
  { label: '↑',  latex: '↑',  description: 'Хий гарах' },
  { label: '↓',  latex: '↓',  description: 'Тунадас' },
  { label: 'Δ',  latex: 'Δ',  description: 'Дулаан (Дельта)' },

  // States
  { label: '(s)',  latex: '(s)',  description: 'Хатуу' },
  { label: '(l)',  latex: '(l)',  description: 'Шингэн' },
  { label: '(g)',  latex: '(g)',  description: 'Хийн' },
  { label: '(aq)', latex: '(aq)', description: 'Усан уусмал' },
];

// ── Physics ───────────────────────────────────────────────────────────────────

export const PHYSICS_SYMBOLS: Symbol[] = [
  // Greek letters
  { label: 'α',  latex: 'α',  description: 'Альфа (өнцөг)' },
  { label: 'β',  latex: 'β',  description: 'Бета' },
  { label: 'γ',  latex: 'γ',  description: 'Гамма' },
  { label: 'Δ',  latex: 'Δ',  description: 'Дельта (өөрчлөлт)' },
  { label: 'ε',  latex: 'ε',  description: 'Эпсилон' },
  { label: 'θ',  latex: 'θ',  description: 'Тета (өнцөг)' },
  { label: 'λ',  latex: 'λ',  description: 'Ламбда (долгион)' },
  { label: 'μ',  latex: 'μ',  description: 'Мю (коэффициент)' },
  { label: 'ρ',  latex: 'ρ',  description: 'Ро (нягт)' },
  { label: 'σ',  latex: 'σ',  description: 'Сигма' },
  { label: 'τ',  latex: 'τ',  description: 'Тау (момент)' },
  { label: 'ω',  latex: 'ω',  description: 'Омега (өнцгийн хурд)' },
  { label: 'π',  latex: 'π',  description: 'Пи' },
  { label: 'Ω',  latex: 'Ω',  description: 'Ом' },

  // Powers
  { label: 'x²', latex: '²',  description: 'Квадрат зэрэг' },
  { label: 'x³', latex: '³',  description: 'Куб зэрэг' },
  { label: 'x⁻¹', latex: '⁻¹', description: 'Урвуу' },
  { label: 'x⁻²', latex: '⁻²', description: 'Квадрат урвуу' },

  // Units
  { label: 'm/s',  latex: 'm/s',  description: 'Метр/секунд' },
  { label: 'm/s²', latex: 'm/s²', description: 'Хурдатгал' },
  { label: 'kg',   latex: 'kg',   description: 'Килограмм' },
  { label: 'N',    latex: 'N',    description: 'Ньютон' },
  { label: 'J',    latex: 'J',    description: 'Жоуль' },
  { label: 'W',    latex: 'W',    description: 'Ватт' },
  { label: 'V',    latex: 'V',    description: 'Вольт' },
  { label: 'A',    latex: 'A',    description: 'Ампер' },
  { label: 'Hz',   latex: 'Hz',   description: 'Герц' },
  { label: '°C',   latex: '°C',   description: 'Цельс' },
  { label: 'K',    latex: 'K',    description: 'Кельвин' },
  { label: 'Pa',   latex: 'Pa',   description: 'Паскаль' },

  // Operators & misc
  { label: '·',  latex: '·',  description: 'Цэг үржвэр' },
  { label: '×',  latex: '×',  description: 'Векторын үржвэр' },
  { label: '±',  latex: '±',  description: 'Нэмэх/хасах' },
  { label: '≈',  latex: '≈',  description: 'Ойролцоо тэнцүү' },
  { label: '∂',  latex: '∂',  description: 'Хэсэгчилсэн уламжлал' },
  { label: '∇',  latex: '∇',  description: 'Набла' },
  { label: '∞',  latex: '∞',  description: 'Мөнх' },
  { label: '→',  latex: '→',  description: 'Чиглэл' },
];

// ── Formula templates ─────────────────────────────────────────────────────────

export const FORMULA_TEMPLATES = {
  math: [
    { label: 'Квадрат тэгшитгэл',  latex: 'ax² + bx + c = 0' },
    { label: 'Пифагорын теорем',    latex: 'a² + b² = c²' },
    { label: 'Дискриминант',        latex: 'D = b² - 4ac' },
    { label: 'Квадрат язгуур',      latex: 'x = (-b ± √(b²-4ac)) / 2a' },
  ],
  chemistry: [
    { label: 'Усны задрал',  latex: '2H₂O → 2H₂ + O₂' },
    { label: 'Шаталт',       latex: 'CH₄ + 2O₂ → CO₂ + 2H₂O' },
    { label: 'Фотосинтез',   latex: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂' },
  ],
  physics: [
    { label: 'Ньютоны 2-р хууль', latex: 'F = ma' },
    { label: 'Эйнштейний томъёо', latex: 'E = mc²' },
    { label: 'Омын хууль',        latex: 'V = IR' },
    { label: 'Кинетик энерги',    latex: 'Eₖ = ½mv²' },
    { label: 'Потенциал энерги',  latex: 'Eₚ = mgh' },
  ],
};

export const getSymbolsByType = (type: KeyboardType): Symbol[] => {
  switch (type) {
    case 'math':       return MATH_SYMBOLS;
    case 'chemistry':  return CHEMISTRY_SYMBOLS;
    case 'physics':    return PHYSICS_SYMBOLS;
    default:           return MATH_SYMBOLS;
  }
};
