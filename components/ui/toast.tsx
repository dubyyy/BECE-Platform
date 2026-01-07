"use client"

import * as React from "react"
import { X, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ToastProps {
  id: string
  title?: string
  description?: string
  variant?: "default" | "success" | "error" | "warning"
  duration?: number
  onClose: (id: string) => void
}

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ id, title, description, variant = "default", onClose }, ref) => {
    const variantStyles = {
      default: "bg-white border-gray-200",
      success: "bg-green-50 border-green-200",
      error: "bg-red-50 border-red-200",
      warning: "bg-yellow-50 border-yellow-200",
    }

    const textStyles = {
      default: "text-gray-900",
      success: "text-green-900",
      error: "text-red-900",
      warning: "text-yellow-900",
    }

    const iconStyles = {
      default: "text-gray-500",
      success: "text-green-600",
      error: "text-red-600",
      warning: "text-yellow-600",
    }

    const IconComponent = {
      default: AlertCircle,
      success: CheckCircle2,
      error: XCircle,
      warning: AlertCircle,
    }[variant]

    return (
      <div
        ref={ref}
        className={cn(
          "pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border p-4 pr-8 shadow-lg transition-all",
          variantStyles[variant],
          "animate-in slide-in-from-right-full duration-300"
        )}
      >
        <IconComponent className={cn("h-5 w-5 shrink-0 mt-0.5", iconStyles[variant])} />
        <div className="flex-1 space-y-1">
          {title && (
            <div className={cn("text-sm font-semibold", textStyles[variant])}>
              {title}
            </div>
          )}
          {description && (
            <div className={cn("text-sm opacity-90", textStyles[variant])}>
              {description}
            </div>
          )}
        </div>
        <button
          onClick={() => onClose(id)}
          className={cn(
            "absolute right-2 top-2 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100",
            textStyles[variant]
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }
)

Toast.displayName = "Toast"

export const ToastContainer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div className="fixed top-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:flex-col sm:top-4 sm:right-4 sm:max-w-md">
      {children}
    </div>
  )
}
