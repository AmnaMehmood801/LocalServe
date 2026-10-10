import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { groupAreaOptions } from "../../lib/areaGroups";

type AreaSelectOption = {
  value: string;
  label: string;
  group?: string;
};

type AreaSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: AreaSelectOption[];
  className?: string;
};

type AreaSelectRow =
  | { type: "group"; group: string; count: number }
  | { type: "option"; option: AreaSelectOption };

function getVisibleRows(
  groups: ReturnType<typeof groupAreaOptions<AreaSelectOption>>,
  expandedGroup: string | null,
): AreaSelectRow[] {
  return groups.flatMap(({ group, options: groupOptions }) => {
    if (!group) {
      return groupOptions.map((option) => ({
        type: "option" as const,
        option,
      }));
    }

    return [
      { type: "group" as const, group, count: groupOptions.length },
      ...(expandedGroup === group
        ? groupOptions.map((option) => ({ type: "option" as const, option }))
        : []),
    ];
  });
}

export function AreaSelect({
  value,
  onChange,
  options,
  className = "",
}: AreaSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );
  const optionGroups = useMemo(() => groupAreaOptions(options), [options]);
  const visibleRows = useMemo(
    () => getVisibleRows(optionGroups, expandedGroup),
    [expandedGroup, optionGroups],
  );
  const hasGroupedOptions = optionGroups.some((optionGroup) =>
    Boolean(optionGroup.group),
  );

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (highlightIndex < 0 || !open) return;

    rowRefs.current[highlightIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  function openMenu() {
    const nextExpandedGroup =
      options.find((option) => option.value === value)?.group ?? null;
    const rows = getVisibleRows(optionGroups, nextExpandedGroup);
    const selectedIndex = rows.findIndex(
      (row) => row.type === "option" && row.option.value === value,
    );

    setExpandedGroup(nextExpandedGroup);
    setHighlightIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function activateRow(index: number) {
    const row = visibleRows[index];
    if (!row) return;

    if (row.type === "group") {
      const nextExpandedGroup = expandedGroup === row.group ? null : row.group;
      const nextRows = getVisibleRows(optionGroups, nextExpandedGroup);
      const nextIndex = nextRows.findIndex(
        (nextRow) => nextRow.type === "group" && nextRow.group === row.group,
      );

      setExpandedGroup(nextExpandedGroup);
      setHighlightIndex(nextIndex);
    } else {
      handleSelect(row.option.value);
    }
  }

  function moveHighlight(index: number, direction: -1 | 1) {
    if (visibleRows.length === 0) return;

    const nextIndex =
      index < 0
        ? direction === 1
          ? 0
          : visibleRows.length - 1
        : (index + direction + visibleRows.length) % visibleRows.length;
    setHighlightIndex(nextIndex);
    if (hasGroupedOptions) rowRefs.current[nextIndex]?.focus();
  }

  function handleButtonKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) {
        activateRow(highlightIndex);
      } else {
        openMenu();
      }
      return;
    }

    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(highlightIndex, 1);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(highlightIndex, -1);
    }
  }

  function handleRowKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(index, 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(index, -1);
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select area"
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleButtonKeyDown}
        className="flex w-auto min-h-[40px] max-w-full shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white outline-none transition-colors hover:border-[#1DBF73] hover:bg-white/10 focus:border-[#1DBF73] focus:outline-none focus:!ring-2 focus:!ring-[#1DBF73]/30 aria-expanded:border-[#1DBF73] aria-expanded:!ring-2 aria-expanded:!ring-[#1DBF73]/30 lg:min-w-[9rem] xl:min-w-[11rem]"
      >
        <span className="min-w-0 max-w-[12rem] truncate max-[399px]:max-w-[100px]">
          {selectedOption?.label ?? "Select area"}
        </span>
        <ChevronDown size={14} aria-hidden="true" className="shrink-0" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Area options"
          className="absolute start-0 top-full z-50 mt-2 min-w-[12rem] max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          {visibleRows.map((row, index) => {
            const isHighlighted = index === highlightIndex;

            if (row.type === "group") {
              const isExpanded = expandedGroup === row.group;

              return (
                <button
                  key={`group-${row.group}`}
                  ref={(element) => {
                    rowRefs.current[index] = element;
                  }}
                  type="button"
                  aria-expanded={isExpanded}
                  aria-label={`${row.group}, ${row.count} areas`}
                  onClick={() => activateRow(index)}
                  onKeyDown={(event) => handleRowKeyDown(event, index)}
                  className={`flex min-h-9 w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide transition-colors duration-150 ${
                    isHighlighted
                      ? "bg-[#F0FAF4] text-slate-900"
                      : "bg-white text-slate-600 hover:bg-[#F0FAF4]"
                  }`}
                >
                  <span className="truncate">{row.group}</span>
                  <span className="ms-auto shrink-0 text-xs font-medium normal-case tracking-normal text-slate-500">
                    {row.count}
                  </span>
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={`shrink-0 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
                  />
                </button>
              );
            }

            const option = row.option;
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                ref={(element) => {
                  rowRefs.current[index] = element;
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option.value)}
                onKeyDown={(event) => handleRowKeyDown(event, index)}
                className={`flex ${option.group ? "min-h-[34px] px-4 py-1.5 text-sm" : "min-h-[44px] px-4 text-base"} w-full cursor-pointer items-center justify-between gap-3 text-start transition-colors duration-150 ${
                  isSelected
                    ? "bg-[#E3F7EC] font-medium text-[#168A55] hover:bg-[#D3F0DF]"
                    : isHighlighted
                      ? "bg-[#F0FAF4] text-slate-900"
                      : "bg-white text-slate-900 hover:bg-[#F0FAF4]"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && (
                  <Check
                    size={16}
                    color="#1DBF73"
                    aria-hidden="true"
                    className="shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
