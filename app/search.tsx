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
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto pt-8 relative">
      {/* Subtle glow effect */}
      <div className="absolute inset-0 -m-2 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative group">
        <div className="relative flex items-center">
          <Input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask anything..."
            className="pr-28 h-16 text-lg rounded-2xl border-2 border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl transition-all duration-300 shadow-lg shadow-gray-200/20 dark:shadow-gray-900/20 focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:border-blue-400 dark:focus-visible:border-blue-500 hover:border-gray-300/80 dark:hover:border-gray-600/80 hover:shadow-xl"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input || input.trim() === ''}
            className="absolute right-3 p-0 flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed active:scale-95 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
          >
            <div className="w-[68px] h-[44px] flex items-center justify-center">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <svg 
                  fill="none" 
                  height="22" 
                  viewBox="0 0 20 20" 
                  width="22" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-white"
                >
                  <path 
                    d="M11.6667 4.79163L16.875 9.99994M16.875 9.99994L11.6667 15.2083M16.875 9.99994H3.125" 
                    stroke="currentColor" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="1.8"
                  />
                </svg>
              )}
            </div>
          </button>
        </div>
        
        {/* Animated border effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-0 group-focus-within:opacity-20 transition-opacity duration-300 -z-10 blur-sm"></div>
      </div>
    </form>
  )
}
