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
    <div className="flex min-h-screen w-full flex-col bg-background">
      <div className="flex flex-1">
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 pb-16 md:pb-0 relative">
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
