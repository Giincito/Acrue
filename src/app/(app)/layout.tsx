import { Sidebar } from "@/components/layout/sidebar"
import { BottomNav } from "@/components/layout/bottom-nav"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 pb-16 md:pb-0 relative">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
