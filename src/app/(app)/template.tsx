"use client"

import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { usePathname } from "next/navigation"

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait">
      <LayoutGroup id={pathname}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="flex-1 w-full h-full"
        >
          {children}
        </motion.div>
      </LayoutGroup>
    </AnimatePresence>
  )
}
