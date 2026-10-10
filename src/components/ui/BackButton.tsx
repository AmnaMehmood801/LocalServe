import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type BackButtonProps = {
  fallback: string;
  label?: string;
  className?: string;
};

export function BackButton({
  fallback,
  label = "Back",
  className = "",
}: BackButtonProps) {
  const navigate = useNavigate();

  function handleClick() {
    const historyIndex = window.history.state?.idx;
    if (typeof historyIndex === "number" && historyIndex > 0) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 -ms-3 text-sm font-medium text-slate-700 transition-colors hover:bg-[#E3F7EC] hover:text-[#168A55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DBF73]/40 ${className}`}
    >
      <ArrowLeft size={18} className="rtl:rotate-180" aria-hidden="true" />
      {label}
    </button>
  );
}
