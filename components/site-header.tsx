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
    window.location.href = "/"
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[color-mix(in_srgb,var(--outline)_50%,transparent)] bg-[color-mix(in_srgb,var(--surface)_72%,transparent)] backdrop-blur-2xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          onClick={handleLogoClick}
          className="focus-ring inline-flex items-center gap-3 rounded-full px-2 py-1 text-left"
          aria-label="Go to home"
        >
          <Image
            src="/az-labs-logo.png"
            alt="AZ Labs"
            width={320}
            height={86}
            priority
            className="h-14 w-auto select-none"
          />
          <span className="hidden text-xs text-[var(--on-surface-variant)] md:block">
            AI multi-search, multi-source research
          </span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          {!loading &&
            (user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden max-w-24 truncate sm:inline">
                      {user.user_metadata?.full_name || user.email?.split("@")[0]}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.user_metadata?.full_name || "User"}
                      </p>
                      <p className="text-xs leading-none text-[var(--on-surface-variant)]">
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
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-[hsl(var(--destructive))]">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="outline" size="sm" className="h-9">
                <Link href="/auth/login">
                  <LogIn className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sign In</span>
                </Link>
              </Button>
            ))}
        </div>
      </div>
    </header>
  )
}
