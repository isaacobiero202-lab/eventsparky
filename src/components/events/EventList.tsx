import React, { useState, useEffect } from 'react';
import { Event } from '../../types';
import { useEvents } from '../../hooks/useEvents';
import { EventCard } from './EventCard';
import { CalendarView } from './CalendarView';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Search, SlidersHorizontal, Sliders, Sparkles, RefreshCw, LayoutGrid, Calendar as CalendarIcon } from 'lucide-react';
import { motion } from 'motion/react';

// Balanced staggered animation presets
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 110,
      damping: 16
    }
  }
};

export function EventList() {
  const { getEvents, deleteEvent, loading } = useEvents();
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [filterPrice, setFilterPrice] = useState<'all' | 'free' | 'paid'>('all');
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');

  const loadEvents = async () => {
    const list = await getEvents({
      search: search.trim() || undefined,
      upcomingOnly: upcomingOnly,
    });
    setEvents(list);
  };

  useEffect(() => {
    // Debounce loadEvents slightly for typing
    const delayDebounce = setTimeout(() => {
      loadEvents();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, filterPrice, upcomingOnly]);

  const handleDelete = async (id: string) => {
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Client-side quick pricing filters
  const filteredEvents = events.filter((ev) => {
    if (filterPrice === 'free') return ev.price === 0;
    if (filterPrice === 'paid') return ev.price > 0;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Search Bar and Advanced Filters */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-4 items-center justify-between transition-colors">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            className="w-full text-sm pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            placeholder="Search events by title, description, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filters Controls ROW */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Price dropdown selector */}
          <div className="flex items-center space-x-1">
            <Sliders className="w-4 h-4 text-slate-400" />
            <select
              className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              value={filterPrice}
              onChange={(e: any) => setFilterPrice(e.target.value)}
            >
              <option value="all">Any Ticket Price</option>
              <option value="free">Free ONLY</option>
              <option value="paid">Paid Ticket</option>
            </select>
          </div>

          {/* Date range filter toggle */}
          <button
            onClick={() => setUpcomingOnly(!upcomingOnly)}
            className={`text-xs font-bold px-3 py-2.5 rounded-lg border transition cursor-pointer ${
              upcomingOnly
                ? 'bg-indigo-50 border-indigo-150 text-indigo-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {upcomingOnly ? 'Showing: Upcoming Events' : 'Showing: All History'}
          </button>

          <button
            onClick={loadEvents}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 transition cursor-pointer"
            title="Reload Events"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 ml-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-white text-indigo-600 shadow-xs border border-slate-100' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === 'calendar' 
                  ? 'bg-white text-indigo-600 shadow-xs border border-slate-100' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Calendar View"
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid listing */}
      {loading ? (
        <LoadingSpinner size="medium" />
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-lg mx-auto transition-colors">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <SlidersHorizontal className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No events found</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            We couldn't find any events matching your search filters. Try clearing your keywords or checking older histories.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setFilterPrice('all');
              setUpcomingOnly(true);
            }}
            className="mt-5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'calendar' ? (
        <CalendarView events={filteredEvents} />
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredEvents.map((event) => (
            <motion.div 
              key={event.id} 
              variants={itemVariants}
              className="h-full"
            >
              <EventCard event={event} onDelete={handleDelete} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
