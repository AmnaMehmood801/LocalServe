import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown } from "lucide-react";

type SelectMenuOption = {
  value: string;
  label: string;
};

type SelectMenuProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectMenuOption[];
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  size?: "md" | "sm";
  id?: string;
};

export function SelectMenu({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = "Select an option",
  className = "",
  buttonClassName = "",
  size = "md",
  id,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  useEffect(() => {
    if (!open) return;

    const currentIndex = options.findIndex((option) => option.value === value);
    setHighlightIndex(currentIndex >= 0 ? currentIndex : 0);
  }, [open, options, value]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
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

    optionRefs.current[highlightIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
      } else if (highlightIndex >= 0 && options[highlightIndex]) {
        handleSelect(options[highlightIndex].value);
      }
      return;
    }

    if (!open || options.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((current) =>
        current < 0 ? 0 : (current + 1) % options.length,
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((current) =>
        current < 0 ? 0 : (current - 1 + options.length) % options.length,
      );
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleButtonKeyDown}
        className={`flex ${size === "sm" ? "h-10 px-3 text-sm" : "min-h-12 px-3 py-1.5 pr-10 text-base"} w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white text-left outline-none transition-colors hover:border-[#1DBF73] focus:border-[#1DBF73] focus:outline-none focus:!ring-2 focus:!ring-[#1DBF73]/30 aria-expanded:border-[#1DBF73] aria-expanded:!ring-2 aria-expanded:!ring-[#1DBF73]/30 ${buttonClassName}`}
      >
        <span className="truncate">{selectedOption?.label ?? placeholder}</span>
        <ChevronDown
          size={size === "sm" ? 16 : 18}
          aria-hidden="true"
          className="shrink-0 text-slate-600"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={`${ariaLabel} options`}
          className="absolute left-0 top-full z-50 mt-2 max-h-64 w-full min-w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
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
                className={`flex ${size === "sm" ? "px-3 py-2 text-sm" : "min-h-[44px] px-4 text-base"} w-full cursor-pointer items-center justify-between gap-3 text-left transition-colors duration-150 ${
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
