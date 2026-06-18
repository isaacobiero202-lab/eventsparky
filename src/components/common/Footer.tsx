/**
 * Shared layout Footer component.
 */
export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 justify-between items-center gap-6">
          <div>
            <h3 className="text-white font-extrabold text-lg tracking-tight font-display">
              Event<span className="text-indigo-400 font-light">Spark</span>
            </h3>
            <p className="text-sm mt-2 max-w-sm font-sans text-slate-400">
              An AI-powered, modular event platform streamlining planning, promotions, and real-time attendee connections.
            </p>
          </div>
          <div className="md:text-right text-xs font-sans">
            <p className="text-slate-300">© {new Date().getFullYear()} Event Spark. All rights reserved.</p>
            <p className="mt-1 text-slate-500">
              Empowering communities with smart AI description generation and instant schedules.
            </p>
          </div>
        </div>
      </div>

      {/* Simple Status Bar from Geometric Balance Theme */}
      <div className="bg-slate-950 text-slate-400 border-t border-slate-800/60 h-10 flex items-center px-6 justify-between text-[10px] uppercase tracking-widest font-mono">
        <div className="flex gap-4 items-center">
          <span className="opacity-70">System Status: <span className="text-emerald-400 font-bold">Healthy</span></span>
          <span className="opacity-30">|</span>
          <span className="opacity-70">Database: <span className="text-emerald-400 font-bold" style={{ color: '#34d399' }}>Connected</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="opacity-75">Live Real-time Syncing</span>
        </div>
      </div>
    </footer>
  );
}
