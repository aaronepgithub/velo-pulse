import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDisplayDate = (dateStr: string | undefined, full = false) => {
  if (!dateStr) return '';
  
  // If it's a standard activity.formatted_date: YYYY-MM-DD HH:MM
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  let date: Date;
  
  if (match) {
    const [_, year, month, day, hour, minute] = match;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
  } else {
    // If it's ISO, remove 'Z' to treat as literal local time if 'Z' is present
    const cleanDateStr = dateStr.includes('T') ? dateStr.replace('Z', '') : dateStr;
    date = new Date(cleanDateStr);
  }

  if (isNaN(date.getTime())) return dateStr;

  return date.toLocaleString('en-US', { 
    weekday: full ? 'long' : undefined, 
    year: 'numeric', 
    month: full ? 'long' : 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};
