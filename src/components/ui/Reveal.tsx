"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";
import { useReveal } from "@/hooks/useReveal";

type RevealProps = {
  children: ReactNode;
  /** Тег обёртки (div по умолчанию). */
  as?: ElementType;
  /** Задержка появления, мс (для каскада). */
  delay?: number;
  className?: string;
  /** Доп. инлайн-стили (мерджатся с transitionDelay). */
  style?: CSSProperties;
};

/**
 * Обёртка reveal-анимации: при попадании во вьюпорт элемент плавно
 * проявляется и поднимается (≤300мс, ease-out). При reduced-motion
 * показывается сразу (логика в useReveal).
 */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className = "",
  style,
}: RevealProps) {
  const { ref, visible } = useReveal<HTMLElement>();

  return (
    <Tag
      ref={ref}
      style={{ ...style, transitionDelay: visible ? `${delay}ms` : "0ms" }}
      className={`transition-[opacity,transform] duration-300 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
