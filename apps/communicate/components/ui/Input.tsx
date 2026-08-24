import { type InputHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-xs uppercase tracking-wider text-foreground-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`h-11 rounded-md border border-border bg-background-elevated px-3 text-sm text-foreground placeholder:text-foreground-muted/60 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";
