"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const variants = {
  primary:
    "bg-gradient-to-r from-velion-blue to-[#01308a] text-white hover:from-[#01308a] hover:to-velion-blue shadow-lg shadow-velion-blue/20",
  secondary:
    "bg-glass-bg border border-velion-cyan/30 text-velion-cyan hover:bg-velion-cyan/10",
  ghost:
    "bg-transparent text-velion-blue dark:text-velion-cyan hover:bg-white/10",
  danger:
    "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-3.5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
