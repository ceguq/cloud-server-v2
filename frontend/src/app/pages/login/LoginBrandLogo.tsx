import { Cloud } from "lucide-react";

type LoginBrandLogoProps = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
};

export function LoginBrandLogo({
  title = "Nimbus",
  subtitle,
  className,
}: LoginBrandLogoProps) {
  return (
    <div
      className={[
        "nimbus-logo-float mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-300/20 bg-gradient-to-br from-blue-500 to-cyan-400 shadow-[0_14px_45px_rgba(59,130,246,0.38)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Nimbus logo"
    >
      <Cloud size={27} className="text-white" />
      {title ? null : null}
      {subtitle ? null : null}
    </div>
  );
}
