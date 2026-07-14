import { Sparkles } from 'lucide-react'

export function SelemeneHeader() {
  return (
    <header className="px-6 py-5 border-b border-gold/10 bg-void/90 backdrop-blur sticky top-0 z-10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gold/10">
            <Sparkles className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h1 className="text-lg font-display font-semibold text-parchment tracking-wide">
              URANIA 137
            </h1>
            <p className="text-xs text-silver uppercase tracking-widest font-display">
              Selemene Report Console
            </p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm text-silver">
          <span className="hover:text-parchment cursor-pointer transition-colors">Archive</span>
          <span className="hover:text-parchment cursor-pointer transition-colors">Engines</span>
          <span className="hover:text-parchment cursor-pointer transition-colors">Settings</span>
        </nav>
      </div>
    </header>
  )
}
