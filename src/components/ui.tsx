"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { InvoiceStatus } from "@/lib/types";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles = {
    primary: "bg-terracotta text-[#fbf6ee] hover:bg-terracotta-deep",
    secondary: "bg-olive text-[#f6f3ec] hover:bg-olive/90",
    ghost: "bg-transparent text-ink-soft hover:bg-paper-2 border border-line",
    danger: "bg-danger text-white hover:bg-danger/90",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-45 disabled:pointer-events-none ${styles} ${className}`}
    />
  );
}

export function Field({
  label,
  hint,
  required,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-ink">
          {label}
          {required ? <span className="text-terracotta"> *</span> : null}
        </span>
        {optional ? <span className="text-[11px] uppercase tracking-wide text-muted">optionnel</span> : null}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p> : null}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm text-ink placeholder:text-muted/70";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} min-h-[5.5rem] ${props.className ?? ""}`} />;
}

export function StatusBadge({ status }: { status: InvoiceStatus | "en_retard" }) {
  const map: Record<string, { label: string; cls: string }> = {
    brouillon: { label: "Brouillon", cls: "bg-paper-2 text-ink-soft" },
    emise: { label: "Émise", cls: "bg-olive-mist text-olive" },
    cobrada: { label: "Cobrada", cls: "bg-[#e7f0d8] text-[#3d5a2c]" },
    en_retard: { label: "En retard", cls: "bg-[#f4d9d4] text-danger" },
  };
  const s = map[status] ?? map.brouillon;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${s.cls}`}>
      {s.label}
    </span>
  );
}

export function PageTitle({
  kicker,
  title,
  action,
}: {
  kicker?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker ? (
          <p className="text-[11px] uppercase tracking-[0.18em] text-terracotta">{kicker}</p>
        ) : null}
        <h1 className="font-display text-3xl md:text-[2rem] leading-tight">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-muted ${className}`}>
      Outil de suivi local — pas un dépôt AEAT / Verifactu. Les montants « à déclarer » sont
      indicatifs, ce n’est pas un conseil fiscal.
    </p>
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="paper-card rounded-2xl px-6 py-10 text-center">
      <p className="font-display text-xl">{title}</p>
      <p className="mt-2 text-sm text-muted max-w-md mx-auto">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
