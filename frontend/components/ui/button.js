import { cn } from "../../lib/utils"

export function Button({ className, variant = "default", size = "default", disabled, children, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-40",
        {
          "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm": variant === "default",
          "bg-white text-blue-700 border border-blue-200 hover:bg-blue-50": variant === "outline",
          "bg-slate-100 text-slate-500 cursor-not-allowed": variant === "ghost",
        },
        {
          "px-5 py-2.5 text-sm": size === "default",
          "px-3 py-1.5 text-xs": size === "sm",
          "px-6 py-3 text-base": size === "lg",
        },
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
