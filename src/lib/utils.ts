import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "₹"): string {
  return `${currency}${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function generateDays() {
  return Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i + 1,
    entries: [],
  }));
}

export function calculateTotalSpending(
  days: Array<{ entries: Array<{ amount: number }> }>
): number {
  return days.reduce((total, day) => {
    return (
      total +
      day.entries.reduce((dayTotal, entry) => dayTotal + entry.amount, 0)
    );
  }, 0);
}

export function getDayName(dayIndex: number): string {
  const days = [
    "Day 1 (Mon)",
    "Day 2 (Tue)",
    "Day 3 (Wed)",
    "Day 4 (Thu)",
    "Day 5 (Fri)",
    "Day 6 (Sat)",
    "Day 7 (Sun)",
  ];
  return days[dayIndex - 1] || `Day ${dayIndex}`;
}
