"use client";

import { ReactNode, CSSProperties } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export function GlassCard({ children, className = "", style, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`glass-card p-6 transition-all duration-300 ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
