import Link from "next/link"

import { cn } from "@/lib/utils"

interface BrandMarkProps {
  href?: string
  size?: "sm" | "md" | "lg"
  showName?: boolean
  className?: string
}

const sizes = {
  sm: {
    mark: "h-5 w-5",
    text: "text-sm",
  },
  md: {
    mark: "h-6 w-6",
    text: "text-base",
  },
  lg: {
    mark: "h-9 w-9",
    text: "text-[26px]",
  },
}

function BrandMarkContent({ size = "md", showName = true }: Omit<BrandMarkProps, "href" | "className">) {
  const currentSize = sizes[size]

  return (
    <>
      <svg className={currentSize.mark} viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="1.5" opacity=".20" />
        <circle cx="20" cy="20" r="9" stroke="currentColor" strokeWidth="2" opacity=".55" />
        <circle cx="20" cy="20" r="4" fill="currentColor" />
        <circle cx="29" cy="7.2" r="2.5" fill="currentColor" />
      </svg>
      {showName && (
        <span className={cn("font-medium lowercase tracking-normal text-foreground", currentSize.text)}>
          Acrue
        </span>
      )}
    </>
  )
}

export function BrandMark({ href, size = "md", showName = true, className }: BrandMarkProps) {
  const classes = cn("inline-flex items-center justify-center gap-2 text-foreground", className)

  if (href) {
    return (
      <Link href={href} className={cn(classes, "cursor-pointer")} aria-label="Ir al inicio de Acrue">
        <BrandMarkContent size={size} showName={showName} />
      </Link>
    )
  }

  return (
    <div className={classes} aria-label="Acrue">
      <BrandMarkContent size={size} showName={showName} />
    </div>
  )
}
