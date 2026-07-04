import { Github } from "lucide-react";

type LoginSocialIconsProps = {
  className?: string;
};

export function LoginSocialIcons({ className }: LoginSocialIconsProps) {
  const iconClass = "h-4 w-4";
  const buttonClass =
    "flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-slate-200 transition hover:border-blue-300/40 hover:bg-white/[0.08]";

  return (
    <div className={["flex items-center justify-center gap-3", className].filter(Boolean).join(" ")}>
      <button type="button" className={buttonClass} aria-label="Google">
        <span className="text-sm font-semibold leading-none">G</span>
      </button>
      <button type="button" className={buttonClass} aria-label="GitHub">
        <Github className={iconClass} />
      </button>
    </div>
  );
}
