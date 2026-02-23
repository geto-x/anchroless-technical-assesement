import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ActionTone = "accent" | "success" | "destructive";

const TONE_CLASS: Record<ActionTone, string> = {
  accent:
    "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800 focus-visible:ring-sky-300",
  success:
    "bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/20 focus-visible:ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:hover:bg-emerald-400/20 dark:focus-visible:ring-emerald-400/40",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/30",
};

type ActionButtonProps = ComponentProps<typeof Button> & {
  tone?: ActionTone;
  icon?: LucideIcon;
};

export function ActionButton({
  tone = "accent",
  icon: Icon,
  children,
  className,
  ...props
}: ActionButtonProps) {
  return (
    <Button
      className={cn(
        "h-10 min-w-[118px] gap-2 px-4 text-sm font-medium",
        TONE_CLASS[tone],
        className
      )}
      {...props}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </Button>
  );
}

