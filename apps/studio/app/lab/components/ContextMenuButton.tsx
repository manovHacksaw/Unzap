import { clsx } from "clsx";
import { type LucideIcon } from "lucide-react";

export function ContextMenuButton({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[11px] transition-colors",
        danger ? "text-red-400 hover:bg-red-500/10" : "text-neutral-300 hover:bg-white/5",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}
