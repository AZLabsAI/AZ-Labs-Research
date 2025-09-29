"use client"

import Link from "next/link"
import Image from "next/image"
import { LogIn, LogOut, User, Settings, BarChart3, ChevronDown } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { useAuth } from "@/app/contexts/auth-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function SiteHeader() {
  const { user, signOut, loading } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  const handleLogoClick = () => {
    // Force a complete page refresh to reset all state
    window.location.href = '/'
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-24 sm:h-28 flex items-center justify-between">
        <button onClick={handleLogoClick} className="flex items-center gap-3 group hover:opacity-90 transition-opacity cursor-pointer">
          <div className="relative">
            <Image
              src="/az-labs-logo.png"
              alt="AZ Labs Logo"
              width={350}
              height={94}
              priority
              className="h-24 w-auto sm:h-28 select-none"
            />
          </div>
          <div className="hidden sm:block">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-none mt-1 text-center">AI multi-search, multi-source research</div>
          </div>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          
          {!loading && (
            user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-gray-200 dark:border-gray-700 gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline max-w-24 truncate">
                        {user.user_metadata?.full_name || user.email?.split('@')[0]}
                      </span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.user_metadata?.full_name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Profile Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 border-gray-200 dark:border-gray-700"
              >
                <Link href="/auth/login">
                  <LogIn className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sign In</span>
                </Link>
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  )
}
