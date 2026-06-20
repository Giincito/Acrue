import { Suspense } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { BottomNav } from "@/components/layout/bottom-nav"
import { RouteTransition } from "@/components/layout/module-transition"
import { OfflineBanner } from "@/components/pwa/offline-banner"
import { OfflineSyncStatus } from "@/components/pwa/offline-sync-status"
import { CmdK } from "@/components/ui/cmdk"
import { ChatBotFab } from "@/components/ui/chatbot-fab"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen w-full overflow-x-hidden flex-col bg-background">
      <div className="flex min-w-0 flex-1 overflow-x-hidden">
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>
        <main className="relative min-w-0 flex-1 overflow-x-hidden pb-[72px] md:pb-0">
          <RouteTransition>{children}</RouteTransition>
        </main>
      </div>
      <BottomNav />
      <CmdK />
      <ChatBotFab />
      <OfflineBanner />
      <OfflineSyncStatus />
    </div>
  )
}
