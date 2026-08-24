import { type SelectHTMLAttributes, forwardRef } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  /** Shrinks it to fit inline next to buttons rather than filling a form row. */
  compact?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", label, error, compact = false, id, children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-xs uppercase tracking-wider text-foreground-muted">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={`rounded-md border border-border bg-background-elevated text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent ${
            compact ? "h-8 px-2 text-xs" : "h-11 px-3 text-sm"
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  }
);
Select.displayName = "Select";
