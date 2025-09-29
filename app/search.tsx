'use client'

import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SearchComponentProps {
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void
  isLoading: boolean
}

export function SearchComponent({ handleSubmit, input, handleInputChange, isLoading }: SearchComponentProps) {
  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
      {/* Enhanced glow effect */}
      <div className="absolute inset-0 -m-4 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl opacity-0 group-focus-within:opacity-100 transition-all duration-700 animate-pulse"></div>
      
      <div className="relative group">
        <div className="relative flex items-center">
          <Input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask anything... Try 'latest AI news' or 'weather in San Francisco'"
            className="pr-32 h-16 text-lg rounded-3xl border-2 border-slate-200/40 dark:border-slate-700/40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl transition-all duration-500 shadow-2xl shadow-slate-200/40 dark:shadow-slate-900/40 focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:border-cyan-400/60 dark:focus-visible:border-cyan-500/60 hover:border-slate-300/60 dark:hover:border-slate-600/60 hover:shadow-3xl hover:bg-white/80 dark:hover:bg-slate-900/80 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input || input.trim() === ''}
            className="absolute right-4 p-0 flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-500 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed active:scale-95 transition-all duration-300 shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:shadow-2xl"
          >
            <div className="w-18 h-10 flex items-center justify-center">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              ) : (
                <svg 
                  fill="none" 
                  height="24" 
                  viewBox="0 0 20 20" 
                  width="24" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-white transition-transform group-hover:translate-x-1"
                >
                  <path 
                    d="M11.6667 4.79163L16.875 9.99994M16.875 9.99994L11.6667 15.2083M16.875 9.99994H3.125" 
                    stroke="currentColor" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2"
                  />
                </svg>
              )}
            </div>
          </button>
        </div>
        
        {/* Enhanced animated border effect */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-purple-500/30 opacity-0 group-focus-within:opacity-100 transition-all duration-500 -z-10 blur-lg"></div>
        
        {/* Sparkle effect on focus */}
        <div className="absolute -inset-2 rounded-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 -z-20">
          <div className="absolute top-0 left-1/4 w-1 h-1 bg-cyan-400 rounded-full animate-ping"></div>
          <div className="absolute top-1/4 right-1/3 w-1 h-1 bg-blue-400 rounded-full animate-ping delay-300"></div>
          <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-purple-400 rounded-full animate-ping delay-700"></div>
        </div>
      </div>
      
      {/* Search suggestions hint */}
      <div className="mt-4 text-center opacity-0 group-focus-within:opacity-100 transition-opacity duration-300">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Try asking about <span className="text-cyan-600 dark:text-cyan-400 font-medium">news</span>, 
          <span className="text-blue-600 dark:text-blue-400 font-medium"> weather</span>, 
          <span className="text-purple-600 dark:text-purple-400 font-medium"> stocks</span>, or 
          <span className="text-indigo-600 dark:text-indigo-400 font-medium"> research topics</span>
        </p>
      </div>
    </form>
  )
}
