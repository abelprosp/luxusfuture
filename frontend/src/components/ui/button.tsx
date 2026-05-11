type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Button({ className = "", variant = "primary", ...rest }: Props) {
  const base =
    variant === "primary"
      ? "bg-luxus-primary text-white hover:bg-luxus-primary-dark disabled:bg-luxus-border disabled:text-luxus-muted"
      : "border border-luxus-border bg-white text-luxus-primary hover:bg-luxus-bg disabled:opacity-50";
  return (
    <button
      {...rest}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition ${base} ${className}`}
    />
  );
}
