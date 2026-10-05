import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type AreaSelectOption = {
  value: string;
  label: string;
};

type AreaSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: AreaSelectOption[];
  className?: string;
};

export function AreaSelect({
  value,
  onChange,
  options,
  className = "",
}: AreaSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );

  useEffect(() => {
    if (!open) return;

    const currentIndex = options.findIndex((option) => option.value === value);
    setHighlightIndex(currentIndex >= 0 ? currentIndex : 0);
  }, [open, options, value]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
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

    const activeOption = optionRefs.current[highlightIndex];
    activeOption?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  function handleButtonKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) {
        if (highlightIndex >= 0 && options[highlightIndex]) {
          handleSelect(options[highlightIndex].value);
        }
      } else {
        setOpen(true);
      }
      return;
    }

    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((current) => {
        const next = current < 0 ? 0 : (current + 1) % options.length;
        return next;
      });
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((current) => {
        const next =
          current < 0 ? 0 : (current - 1 + options.length) % options.length;
        return next;
      });
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select area"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleButtonKeyDown}
        className="flex min-h-[40px] items-center justify-between gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 pr-8 text-sm text-white outline-none transition-colors hover:border-[#1DBF73] hover:bg-white/10 focus:border-[#1DBF73] focus:outline-none focus:!ring-2 focus:!ring-[#1DBF73]/30 aria-expanded:border-[#1DBF73] aria-expanded:!ring-2 aria-expanded:!ring-[#1DBF73]/30"
      >
        <span className="truncate max-w-[110px] sm:max-w-[180px]">
          {selectedOption?.label ?? "Select area"}
        </span>
        <ChevronDown size={14} aria-hidden="true" className="shrink-0" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Area options"
          className="absolute left-0 top-full z-50 mt-2 min-w-[12rem] max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightIndex;

            return (
              <button
                key={option.value}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option.value)}
                className={`flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-3 px-4 text-left text-base transition-colors duration-150 ${
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
