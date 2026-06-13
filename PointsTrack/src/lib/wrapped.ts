// Computes a "Semester Wrapped" recap from the student's points ledger.
// Pure + framework-free so it's easy to reason about and reuse.

export interface LedgerRow {
  title: string;
  type?: string;
  points: number;
  date: string; // 'YYYY-MM-DD'
  clubName?: string | null;
}

export interface WrappedStudent {
  name?: string;
  lateralEntry?: boolean;
  requiredPoints?: number;
}

export interface Wrapped {
  name: string;
  semesterLabel: string;
  semesterPoints: number;
  activityCount: number;
  topCategory: { name: string; points: number; persona: string; emoji: string } | null;
  topClub: { name: string; count: number } | null;
  biggest: { title: string; points: number; clubName?: string | null } | null;
  busiestMonth: { label: string; count: number } | null;
  categories: { name: string; points: number }[];
  allTimePoints: number;
  goal: number;
  goalPct: number;
  isEmpty: boolean;
}

const PERSONAS: Record<string, { persona: string; emoji: string }> = {
  technical: { persona: 'The Technophile', emoji: '💻' },
  innovation: { persona: 'The Innovator', emoji: '💡' },
  ipr: { persona: 'The Innovator', emoji: '💡' },
  entrepreneurship: { persona: 'The Founder', emoji: '🚀' },
  sports: { persona: 'The Athlete', emoji: '🏅' },
  cultural: { persona: 'The Performer', emoji: '🎭' },
  nss: { persona: 'The Changemaker', emoji: '🌱' },
  community: { persona: 'The Changemaker', emoji: '🌱' },
  social: { persona: 'The Changemaker', emoji: '🌱' },
  leadership: { persona: 'The Leader', emoji: '🧭' },
};

function personaFor(category: string): { persona: string; emoji: string } {
  const key = category.toLowerCase();
  for (const k of Object.keys(PERSONAS)) {
    if (key.includes(k)) return PERSONAS[k];
  }
  return { persona: 'The All-Rounder', emoji: '⭐' };
}

// Current academic semester window: Jan–Jun (even) or Jul–Dec (odd).
function currentSemester(now = new Date()) {
  const y = now.getFullYear();
  const isFirstHalf = now.getMonth() <= 5;
  return {
    start: isFirstHalf ? new Date(y, 0, 1) : new Date(y, 6, 1),
    end: isFirstHalf ? new Date(y, 5, 30, 23, 59, 59) : new Date(y, 11, 31, 23, 59, 59),
    label: `${isFirstHalf ? 'Jan–Jun' : 'Jul–Dec'} ${y}`,
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function topEntry<T>(map: Map<string, T>, score: (v: T) => number): [string, T] | null {
  let best: [string, T] | null = null;
  for (const e of map.entries()) {
    if (!best || score(e[1]) > score(best[1])) best = e;
  }
  return best;
}

export function computeWrapped(rows: LedgerRow[], student: WrappedStudent, now = new Date()): Wrapped {
  const sem = currentSemester(now);
  const goal = student.lateralEntry ? 80 : student.requiredPoints ?? 100;
  const allTimePoints = rows.reduce((s, r) => s + (Number(r.points) || 0), 0);

  const inWindow = rows.filter((r) => {
    const d = new Date(r.date);
    return !isNaN(d.getTime()) && d >= sem.start && d <= sem.end;
  });

  const base = {
    name: student.name || 'Student',
    semesterLabel: sem.label,
    allTimePoints,
    goal,
    goalPct: Math.min(100, Math.round((allTimePoints / goal) * 100)),
  };

  if (inWindow.length === 0) {
    return {
      ...base,
      semesterPoints: 0,
      activityCount: 0,
      topCategory: null,
      topClub: null,
      biggest: null,
      busiestMonth: null,
      categories: [],
      isEmpty: true,
    };
  }

  // Category totals
  const catMap = new Map<string, number>();
  for (const r of inWindow) {
    const c = r.type?.trim() || 'Activity';
    catMap.set(c, (catMap.get(c) ?? 0) + (Number(r.points) || 0));
  }
  const categories = [...catMap.entries()]
    .map(([name, points]) => ({ name, points }))
    .sort((a, b) => b.points - a.points);
  const topCat = categories[0];

  // Club frequency
  const clubMap = new Map<string, number>();
  for (const r of inWindow) {
    if (r.clubName) clubMap.set(r.clubName, (clubMap.get(r.clubName) ?? 0) + 1);
  }
  const topClubEntry = topEntry(clubMap, (v) => v);

  // Busiest month
  const monthMap = new Map<string, number>();
  for (const r of inWindow) {
    const d = new Date(r.date);
    const key = MONTHS[d.getMonth()];
    monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
  }
  const busiestEntry = topEntry(monthMap, (v) => v);

  // Biggest single award
  const biggest = inWindow.reduce((max, r) => ((Number(r.points) || 0) > (Number(max.points) || 0) ? r : max), inWindow[0]);

  return {
    ...base,
    semesterPoints: inWindow.reduce((s, r) => s + (Number(r.points) || 0), 0),
    activityCount: inWindow.length,
    topCategory: topCat
      ? { name: topCat.name, points: topCat.points, ...personaFor(topCat.name) }
      : null,
    topClub: topClubEntry ? { name: topClubEntry[0], count: topClubEntry[1] } : null,
    biggest: { title: biggest.title, points: biggest.points, clubName: biggest.clubName },
    busiestMonth: busiestEntry ? { label: busiestEntry[0], count: busiestEntry[1] } : null,
    categories,
    isEmpty: false,
  };
}
