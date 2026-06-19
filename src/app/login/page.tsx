"use client"

import { Suspense, useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import { useSearchParams } from "next/navigation"

import { BrandMark } from "@/components/ui/brand-mark"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const handleLogin = async () => {
    setIsLoading(true)
    const supabase = createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    const authBaseUrl = appUrl && !isLocalhost ? appUrl : window.location.origin

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${authBaseUrl}/auth/callback`,
      },
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-[360px] flex-col justify-center space-y-6">
      <div className="flex flex-col items-center space-y-3 text-center">
        <BrandMark size="lg" />
        <h1 className="text-[24px] font-light">Acceso</h1>
        <p className="text-sm text-muted-foreground">
          Iniciá sesión con Google para continuar
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{decodeURIComponent(error)}</p>
        </div>
      )}

      <Button
        variant="default"
        onClick={handleLogin}
        disabled={isLoading}
        className="w-full cursor-pointer bg-accent text-accent-foreground hover:bg-accent/90"
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Continuar con Google
      </Button>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <Suspense
        fallback={
          <div className="mx-auto flex w-full max-w-[360px] flex-col justify-center space-y-6">
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </div>
        }
      >
        <LoginContent />
      </Suspense>
    </div>
  )
}
