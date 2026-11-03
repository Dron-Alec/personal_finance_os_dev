import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Only same-origin paths: "/x" yes; "//evil.com", "/\evil.com", "https://..." no.
export function safeRedirect(target: string | null | undefined): string | null {
  return target && /^\/(?![/\\])/.test(target) ? target : null
}
