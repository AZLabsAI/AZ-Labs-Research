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
      {/* Glowing halo effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-cyan-500/20 to-purple-500/0 rounded-[2rem] blur-3xl opacity-0 group-focus-within:opacity-60 transition-opacity duration-700"></div>
      
      <div className="relative group">
        {/* Glass container */}
        <div className="relative rounded-[2rem] bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/80 dark:to-slate-800/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl hover:shadow-3xl transition-all duration-500 group-focus-within:scale-[1.02] group-focus-within:shadow-blue-500/20 dark:group-focus-within:shadow-blue-500/40">
          <div className="relative flex items-center p-2">
            {/* Search icon */}
            <div className="pl-4 pr-2">
              <Search className="h-5 w-5 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-blue-500" />
            </div>
            
            <Input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask anything... Try 'latest AI breakthroughs' or 'explain quantum computing'"
              className="flex-1 h-14 text-base sm:text-lg border-0 bg-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 font-medium transition-all"
              disabled={isLoading}
            />
            
            {/* Submit button with gradient */}
            <button
              type="submit"
              disabled={isLoading || !input || input.trim() === ''}
              className="relative flex items-center justify-center ml-2 px-6 h-12 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600 hover:from-blue-500 hover:via-cyan-500 hover:to-indigo-500 disabled:from-gray-300 disabled:via-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-700 disabled:cursor-not-allowed active:scale-95 transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 group/btn overflow-hidden"
            >
              {/* Shimmer effect on button */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-1000"></div>
              
              <div className="relative flex items-center gap-2">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <>
                    <span className="hidden sm:inline text-sm font-semibold text-white">Search</span>
                    <svg 
                      fill="none" 
                      height="20" 
                      viewBox="0 0 20 20" 
                      width="20" 
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-white transition-transform group-hover/btn:translate-x-1"
                    >
                      <path 
                        d="M11.6667 4.79163L16.875 9.99994M16.875 9.99994L11.6667 15.2083M16.875 9.99994H3.125" 
                        stroke="currentColor" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth="2"
                      />
                    </svg>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
        
        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 opacity-0 group-focus-within:opacity-20 transition-opacity duration-500 -z-10 blur-xl"></div>
        
        {/* Floating sparkles */}
        <div className="absolute -inset-8 opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></div>
          <div className="absolute top-1/4 right-1/4 w-1 h-1 bg-cyan-400 rounded-full animate-ping" style={{animationDelay: '0.3s'}}></div>
          <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{animationDelay: '0.6s'}}></div>
          <div className="absolute bottom-0 right-1/3 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" style={{animationDelay: '0.9s'}}></div>
        </div>
      </div>
      
      {/* Search suggestions with better styling */}
      <div className="mt-6 text-center opacity-0 group-focus-within:opacity-100 transition-all duration-300 transform group-focus-within:translate-y-0 translate-y-2">
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          <span className="text-gray-400 dark:text-gray-500">Popular:</span>
          {' '}
          <span className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-default">
            AI trends
          </span>
          {' • '}
          <span className="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors cursor-default">
            Market analysis
          </span>
          {' • '}
          <span className="inline-flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors cursor-default">
            Tech news
          </span>
        </p>
      </div>
    </form>
  )
}
