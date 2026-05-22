"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type MultiSelectItem = {
  value: string;
  label: React.ReactNode;
};

export type MultiSelectGroup = {
  label: React.ReactNode;
  items: MultiSelectItem[];
};

type MultiSelectFieldProps = {
  id?: string;
  placeholder: string;
  value: string[];
  onChange: (value: string[]) => void;
  items?: MultiSelectItem[];
  groups?: MultiSelectGroup[];
  disabled?: boolean;
  required?: boolean;
  className?: string;
  summary?: (selected: MultiSelectItem[]) => React.ReactNode;
};

function flattenItems(
  items?: MultiSelectItem[],
  groups?: MultiSelectGroup[],
): MultiSelectItem[] {
  if (items) return items;
  return groups?.flatMap((g) => g.items) ?? [];
}

function toggleValue(value: string[], id: string): string[] {
  return value.includes(id) ? value.filter((v) => v !== id) : [...value, id];
}

export function MultiSelectField({
  id,
  placeholder,
  value,
  onChange,
  items,
  groups,
  disabled,
  required,
  className,
  summary,
}: MultiSelectFieldProps) {
  const [open, setOpen] = React.useState(false);
  const allItems = flattenItems(items, groups);
  const selected = allItems.filter((item) => value.includes(item.value));

  const display =
    selected.length === 0 ? (
      <span className="text-muted-foreground">{placeholder}</span>
    ) : summary ? (
      summary(selected)
    ) : selected.length === 1 ? (
      selected[0].label
    ) : (
      <span>{selected.length} vybráno</span>
    );

  function renderOption(item: MultiSelectItem) {
    const checked = value.includes(item.value);
    return (
      <label
        key={item.value}
        className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
      >
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded border border-input",
            checked && "border-primary bg-primary text-primary-foreground",
          )}
        >
          {checked ? <CheckIcon className="size-3" /> : null}
        </span>
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={() => onChange(toggleValue(value, item.value))}
        />
        <span className="flex min-w-0 flex-1 items-center gap-2">{item.label}</span>
      </label>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        type="button"
        disabled={disabled}
        aria-required={required}
        data-slot="select-trigger"
        data-size="default"
        className={cn(
          "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50",
          className,
        )}
      >
        <span className="flex min-w-0 flex-1 truncate text-left">{display}</span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--anchor-width) max-h-64 overflow-y-auto p-1"
      >
        {items?.map(renderOption)}
        {groups?.map((group) => (
          <div key={String(group.label)} className="py-0.5">
            <p className="px-1.5 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.label}
            </p>
            {group.items.map(renderOption)}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
