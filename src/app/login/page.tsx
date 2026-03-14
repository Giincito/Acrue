"use client"

import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true)
    const supabase = createClient()
    
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Acceso Acrue</h1>
          <p className="text-sm text-muted-foreground">
            Inicia sesión con Google para continuar
          </p>
        </div>
        <Button
          variant="default"
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full bg-[#2282fa] text-white hover:bg-[#2282fa]/90"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Continuar con Google
        </Button>
      </div>
    </div>
  )
}
