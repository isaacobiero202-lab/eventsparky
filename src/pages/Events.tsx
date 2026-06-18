import { EventList } from '../components/events/EventList';
import { Calendar, Sparkles } from 'lucide-react';

export function Events() {
  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md">
            <Sparkles className="w-3 h-3 fill-current" />
            <span>Curated Assembly Spark</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mt-2 flex items-center gap-2">
            <Calendar className="w-8 h-8 text-indigo-600" />
            Discover Dynamic Events
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1 max-w-xl">
            Register for developer meetups, professional seminars, local bootcamps, and creative workshops powered by AI copywriting and schedule planning tooling.
          </p>
        </div>
      </div>

      {/* Main Listing Grid */}
      <EventList />
    </div>
  );
}
