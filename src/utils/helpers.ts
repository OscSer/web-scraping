const BOGOTA_TIME_ZONE = "America/Bogota";

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function formatBogotaDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

export function getCurrentTradeDate(): string {
  return formatBogotaDate(new Date());
}

function getBogotaWeekday(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BOGOTA_TIME_ZONE,
    weekday: "short",
  }).formatToParts(date);

  const weekday = parts.find((p) => p.type === "weekday")?.value;

  if (!weekday) {
    throw new Error("Unable to determine Bogota weekday");
  }

  const mapped = WEEKDAY_MAP[weekday];
  if (mapped === undefined) {
    throw new Error(`Unexpected weekday value: ${weekday}`);
  }

  return mapped;
}

function subtractDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function isWeekendBogota(date: Date): boolean {
  const weekday = getBogotaWeekday(date);
  return weekday === 0 || weekday === 6;
}

function getPreviousBusinessDayBogota(from: Date): Date {
  let cursor = subtractDays(from, 1);
  while (isWeekendBogota(cursor)) {
    cursor = subtractDays(cursor, 1);
  }
  return cursor;
}

export function getTradeDatesToTry(options?: {
  maxPreviousBusinessDays?: number;
}): string[] {
  const maxPreviousBusinessDays = options?.maxPreviousBusinessDays ?? 0;

  const today = new Date();
  const dates: string[] = [];

  let cursor = today;

  if (isWeekendBogota(cursor)) {
    cursor = getPreviousBusinessDayBogota(cursor);
  }
  dates.push(formatBogotaDate(cursor));

  for (let i = 0; i < maxPreviousBusinessDays; i++) {
    cursor = getPreviousBusinessDayBogota(cursor);
    dates.push(formatBogotaDate(cursor));
  }

  return dates;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
