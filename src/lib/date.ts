import { format, parse, isValid } from "date-fns";
import { cs } from "date-fns/locale";

/** Zobrazení: den/měsíc/rok (např. 21/05/2026) */
export const DISPLAY_DATE_FORMAT = "dd/MM/yyyy";

/** Hodnota pro formuláře, URL a API */
export const INPUT_DATE_FORMAT = "yyyy-MM-dd";

export const dateFnsLocale = cs;

/** Datum bez časové složky v lokální časové zóně */
export function toLocalDate(value: Date | string): Date {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatDisplayDate(value: Date | string): string {
  return format(toLocalDate(value), DISPLAY_DATE_FORMAT, { locale: cs });
}

export function formatInputDate(value: Date | string): string {
  return format(toLocalDate(value), INPUT_DATE_FORMAT);
}

export function parseInputDate(value: string): Date | null {
  if (!value) return null;
  const parsed = parse(value, INPUT_DATE_FORMAT, new Date());
  return isValid(parsed) ? toLocalDate(parsed) : null;
}

export function parseDisplayDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  for (const pattern of ["dd/MM/yyyy", "d/M/yyyy", "dd.MM.yyyy", "d.M.yyyy"]) {
    const parsed = parse(trimmed, pattern, new Date());
    if (isValid(parsed)) return toLocalDate(parsed);
  }
  return null;
}

/** Maskuje číslice při psaní do tvaru dd/mm/yyyy (max. 8 číslic). */
export function maskDisplayDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
