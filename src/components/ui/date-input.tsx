"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  dateFnsLocale,
  formatDisplayDate,
  formatInputDate,
  maskDisplayDateInput,
  parseDisplayDate,
  parseInputDate,
  toLocalDate,
} from "@/lib/date";

interface DateInputProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (isoDate: string) => void;
  className?: string;
  inputClassName?: string;
  required?: boolean;
  placeholder?: string;
  showPicker?: boolean;
  "aria-label"?: string;
}

function isoToDate(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const parsed = parseInputDate(iso);
  return parsed ?? undefined;
}

export function DateInput({
  id,
  name,
  value: controlledValue,
  defaultValue,
  onChange,
  className,
  inputClassName,
  required,
  placeholder = "dd/mm/rrrr",
  showPicker = true,
  "aria-label": ariaLabel,
}: DateInputProps) {
  const isControlled = controlledValue !== undefined;
  const [internalIso, setInternalIso] = React.useState(defaultValue ?? "");
  const iso = isControlled ? controlledValue : internalIso;
  const selected = isoToDate(iso);

  const [text, setText] = React.useState(() =>
    selected ? formatDisplayDate(selected) : "",
  );
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const d = isoToDate(iso);
    setText(d ? formatDisplayDate(d) : "");
  }, [iso]);

  function commitIso(nextIso: string) {
    if (!isControlled) setInternalIso(nextIso);
    onChange?.(nextIso);
  }

  function selectDate(date: Date | undefined) {
    if (!date) {
      commitIso("");
      setText("");
      setOpen(false);
      return;
    }
    const local = toLocalDate(date);
    commitIso(formatInputDate(local));
    setText(formatDisplayDate(local));
    setOpen(false);
  }

  function handleTextBlur() {
    if (!text.trim()) {
      commitIso("");
      return;
    }
    const parsed = parseDisplayDate(text);
    if (parsed) {
      commitIso(formatInputDate(parsed));
      setText(formatDisplayDate(parsed));
    } else if (selected) {
      setText(formatDisplayDate(selected));
    }
  }

  return (
    <div className={cn("relative", className)}>
      {name ? (
        <input type="hidden" name={name} value={iso} required={required && !iso} />
      ) : null}
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(maskDisplayDateInput(e.target.value))}
        onBlur={handleTextBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleTextBlur();
          }
        }}
        className={cn(
          showPicker ? "bg-white" : "bg-transparent",
          inputClassName,
          showPicker && "pr-8",
        )}
        aria-required={required}
        aria-label={ariaLabel}
        maxLength={10}
      />
      {showPicker ? (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex size-7 items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
          aria-label="Vybrat datum"
        >
          <CalendarIcon className="size-4" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            locale={dateFnsLocale}
            selected={selected}
            onSelect={selectDate}
            defaultMonth={selected}
          />
        </PopoverContent>
      </Popover>
      ) : null}
    </div>
  );
}
