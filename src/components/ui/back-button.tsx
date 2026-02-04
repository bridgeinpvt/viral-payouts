"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  /** Text to display on the button */
  label?: string;
  /** Button variant - ghost for subtle, default for prominent */
  variant?: "ghost" | "default";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Additional CSS classes */
  className?: string;
  /** Custom onClick handler - if not provided, uses router.back() */
  onClick?: () => void;
  /** Show icon */
  showIcon?: boolean;
}

export function BackButton({
  label = "Back",
  variant = "ghost",
  size = "default",
  className,
  onClick,
  showIcon = true,
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.back();
    }
  };

  const baseClasses = variant === "ghost"
    ? "text-foreground dark:text-white hover:bg-muted dark:hover:text-white"
    : "bg-primary hover:bg-primary-color dark:text-white";

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn(baseClasses, className, "hidden sm:inline-flex lg:inline-flex md:inline-flex")}
    >
      {showIcon && <ArrowLeft className={cn(
        size === "icon" ? "h-5 w-5" : "h-4 w-4",
        size !== "icon" && "mr-2", ""
      )} />}
      {size !== "icon" && label}
    </Button>
  );
}
