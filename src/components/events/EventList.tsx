import React, { useState, useEffect, useMemo } from 'react';
import { Event } from '../../types';
import { useEvents } from '../../hooks/useEvents';
import { EventCard } from './EventCard';
import { CalendarView } from './CalendarView';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { 
  Search, 
  SlidersHorizontal, 
  Sparkles, 
  RefreshCw, 
  LayoutGrid, 
  Calendar as CalendarIcon,
  ChevronDown,
  ArrowUpDown,
  X,
  MapPin,
  Laptop
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Balanced staggered animation presets
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 15
    }
  }
};

export function EventList() {
  const { getEvents, deleteEvent, loading } = useEvents();
  const [events, setEvents] = useState<Event[]>([]);
  
  // Search state
  const [search, setSearch] = useState('');
  
  // Collapsible Filters Panel
  const [showFilters, setShowFilters] = useState(false);
  
  // Smart Filters state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVenueType, setSelectedVenueType] = useState<string>('all'); // 'all' | 'physical' | 'virtual'
  const [selectedPriceTier, setSelectedPriceTier] = useState<string>('all'); // 'all' | 'free' | 'under50' | 'above50'
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all'); // 'all' | 'today' | 'week' | 'month'
  const [sortOption, setSortOption] = useState<string>('upcoming'); // 'newest' | 'popular' | 'most-tickets' | 'highest-rated' | 'upcoming'
  
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');

  const loadEvents = async (forceRefresh?: boolean) => {
    const list = await getEvents({
      search: search.trim() || undefined,
      upcomingOnly: upcomingOnly,
      forceRefresh,
    });
    setEvents(list);
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadEvents(false);
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [search, upcomingOnly]);

  const handleDelete = async (id: string) => {
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Helper: map text categories for client filtering
  const getEventCategoryTag = (ev: Event) => {
    const text = ((ev.title || '') + ' ' + (ev.description || '')).toLowerCase();
    if (text.includes('workshop') || text.includes('learn') || text.includes('tutorial') || text.includes('course') || text.includes('teach')) return 'education';
    if (text.includes('hackathon') || text.includes('code') || text.includes('tech') || text.includes('web') || text.includes('ai') || text.includes('development')) return 'tech';
    if (text.includes('meetup') || text.includes('social') || text.includes('party') || text.includes('gala') || text.includes('club')) return 'social';
    if (text.includes('panel') || text.includes('conference') || text.includes('congress') || text.includes('summit')) return 'professional';
    if (text.includes('concert') || text.includes('music') || text.includes('sound') || text.includes('festival') || text.includes('show')) return 'music';
    return 'other';
  };

  // Helper: check virtual venue vs physical
  const isVirtualVenue = (ev: Event) => {
    const loc = (ev.location || '').toLowerCase();
    return loc.includes('online') || loc.includes('zoom') || loc.includes('virtual') || loc.includes('teams') || loc.includes('discord') || loc.includes('youtube');
  };

  // Client side multi-axis Smart Filter and Advanced Search
  const filteredAndSortedEvents = useMemo(() => {
    let result = events.filter(ev => !ev.is_cancelled);

    // 1. Advanced Search processing
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(ev => {
        return ev.title.toLowerCase().includes(q) || 
               (ev.description || '').toLowerCase().includes(q) || 
               (ev.location || '').toLowerCase().includes(q) || 
               (ev.organizer?.full_name || '').toLowerCase().includes(q);
      });
    }

    // 2. Category multi-matching
    if (selectedCategory !== 'all') {
      result = result.filter(ev => getEventCategoryTag(ev) === selectedCategory);
    }

    // 3. Venue multi-matching
    if (selectedVenueType !== 'all') {
      result = result.filter(ev => {
        const virtual = isVirtualVenue(ev);
        return selectedVenueType === 'virtual' ? virtual : !virtual;
      });
    }

    // 4. Ticket price matching
    if (selectedPriceTier !== 'all') {
      result = result.filter(ev => {
        const pr = ev.price || 0;
        if (selectedPriceTier === 'free') return pr === 0;
        if (selectedPriceTier === 'under50') return pr > 0 && pr <= 50;
        if (selectedPriceTier === 'above50') return pr > 50;
        return true;
      });
    }

    // 5. Relative date range matching
    if (selectedDateRange !== 'all') {
      const now = new Date();
      result = result.filter(ev => {
        if (!ev.event_date) return false;
        const eDate = new Date(ev.event_date);
        
        if (selectedDateRange === 'today') {
          return eDate.toDateString() === now.toDateString();
        }
        if (selectedDateRange === 'week') {
          const nextWeek = new Date();
          nextWeek.setDate(now.getDate() + 7);
          return eDate >= now && eDate <= nextWeek;
        }
        if (selectedDateRange === 'month') {
          return eDate.getMonth() === now.getMonth() && eDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    // 6. Advanced Custom Sorting
    result.sort((a, b) => {
      if (sortOption === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortOption === 'popular') {
        // views comparison
        const viewsA = a.views || 100;
        const viewsB = b.views || 100;
        return viewsB - viewsA;
      }
      if (sortOption === 'most-tickets') {
        const regA = a.registration_count || 0;
        const regB = b.registration_count || 0;
        return regB - regA;
      }
      if (sortOption === 'highest-rated') {
        const idDiff = (b.registration_count || 0) - (a.registration_count || 0);
        return idDiff; // fall back to standard ticket counts ratio as satisfaction index
      }
      if (sortOption === 'upcoming') {
        if (!a.event_date) return 1;
        if (!b.event_date) return -1;
        return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
      }
      return 0;
    });

    return result;
  }, [events, search, selectedCategory, selectedVenueType, selectedPriceTier, selectedDateRange, sortOption]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedVenueType !== 'all') count++;
    if (selectedPriceTier !== 'all') count++;
    if (selectedDateRange !== 'all') count++;
    return count;
  }, [selectedCategory, selectedVenueType, selectedPriceTier, selectedDateRange]);

  const resetAllFilters = () => {
    setSelectedCategory('all');
    setSelectedVenueType('all');
    setSelectedPriceTier('all');
    setSelectedDateRange('all');
    setSortOption('upcoming');
    setSearch('');
  };

  return (
    <div className="space-y-6">
      
      {/* Search Bar Cockpit */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3.5 items-stretch md:items-center justify-between">
          {/* Main search input field */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              className="w-full text-sm pl-11 pr-4 py-3 bg-slate-50 border border-slate-180 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition font-medium"
              placeholder="Search by event title, host, agenda or venue location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Quick manual refresh button */}
            <button
              onClick={() => loadEvents(true)}
              className="flex items-center space-x-1.5 px-3.5 py-3 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 font-bold text-xs transition cursor-pointer"
              title="Force refresh events"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Sliding advanced filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-xl border font-bold text-xs transition cursor-pointer relative ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Smart Filters</span>
              {activeFiltersCount > 0 && (
                <span className="h-4.5 min-w-4.5 flex items-center justify-center text-[10px] bg-indigo-600 text-white rounded-full px-1 font-extrabold shadow-sm">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Timelines state selector toggler */}
            <button
              onClick={() => setUpcomingOnly(!upcomingOnly)}
              className={`px-4 py-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                upcomingOnly
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-3xs'
                  : 'bg-slate-50 border-slate-250 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {upcomingOnly ? 'Upcoming events' : 'Show All listings'}
            </button>

            {/* Quick reload tracker */}
            <button
              onClick={loadEvents}
              className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 transition cursor-pointer"
              title="Force reload events stream"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* View Grid vs Calendar modes selector */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 shrink-0 ml-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'grid' 
                    ? 'bg-white text-indigo-600 shadow-2xs border border-slate-100' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Grid layout viewer"
              >
                <LayoutGrid className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'calendar' 
                    ? 'bg-white text-indigo-600 shadow-2xs border border-slate-100' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Calendar matrix viewer"
              >
                <CalendarIcon className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Smart Filter dashboard grid panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-slate-100 pt-4 mt-2 overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                {/* A. Categories Smart List */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">Category Group</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">📁 All Categories</option>
                    <option value="tech">💻 Tech & Innovation</option>
                    <option value="music">🎵 Music & Concerts</option>
                    <option value="education">👨‍🎓 Workshops & Seminars</option>
                    <option value="social">🍻 Social Gatherings</option>
                    <option value="professional">🏢 Summit Conferences</option>
                    <option value="other">✨ Other Assembly</option>
                  </select>
                </div>

                {/* B. Venue Locations Virtual vs Physical List */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">Venue Setting</label>
                  <select
                    value={selectedVenueType}
                    onChange={(e) => setSelectedVenueType(e.target.value)}
                    className="w-full text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">📍 Any Venue Type</option>
                    <option value="physical">🏢 Physical Spaces only</option>
                    <option value="virtual">💻 Virtual / Zoom / Online</option>
                  </select>
                </div>

                {/* C. Prices Tier ranges list */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">Ticket Price Tier</label>
                  <select
                    value={selectedPriceTier}
                    onChange={(e) => setSelectedPriceTier(e.target.value)}
                    className="w-full text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">💰 Any Price Tier</option>
                    <option value="free">🆓 Free Tickets only</option>
                    <option value="under50">💵 Budget (Under $50)</option>
                    <option value="above50">💎 Premium Tier ($50+)</option>
                  </select>
                </div>

                {/* D. Date constraints filters list */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">Starting Date</label>
                  <select
                    value={selectedDateRange}
                    onChange={(e) => setSelectedDateRange(e.target.value)}
                    className="w-full text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">📅 Any Scheduled Time</option>
                    <option value="today">🕐 Matches Today</option>
                    <option value="week">⏳ This Upcoming Week</option>
                    <option value="month">📆 This Calendar Month</option>
                  </select>
                </div>

                {/* E. Five Axis sorting select list */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">Axis Sorting Ordered</label>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="w-full text-xs font-bold text-indigo-700 bg-indigo-50/50 border border-indigo-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="upcoming">⏳ Nearest Scheduled (Date)</option>
                    <option value="newest">🆕 Newest Added first</option>
                    <option value="popular">🔥 High Popularity views</option>
                    <option value="most-tickets">🎟️ Most Tickets Sold</option>
                    <option value="highest-rated">⭐ Highest Rating satisfaction</option>
                  </select>
                </div>

              </div>

              {/* Reset controllers helper row */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 mt-4 text-[11px] text-slate-500 font-medium">
                <div className="flex items-center space-x-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <span>Filtered to: <span className="font-extrabold text-indigo-700">{filteredAndSortedEvents.length} list items</span></span>
                </div>
                
                <button
                  onClick={resetAllFilters}
                  className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center space-x-1.5 cursor-pointer bg-rose-50 px-2.5 py-1.5 rounded-lg transition"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset All Controls</span>
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Grid rendering list */}
      {filteredAndSortedEvents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-110">
            <SlidersHorizontal className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">No events found</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto leading-relaxed font-medium">
            We couldn't locate any events matching your selected search query and sliders. Clear your words or click the reset button below!
          </p>
          <button
            onClick={resetAllFilters}
            className="mt-5 text-xs font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-5 py-2.5 rounded-xl transition cursor-pointer"
          >
            Clear Active Filters Panel
          </button>
        </div>
      ) : viewMode === 'calendar' ? (
        <CalendarView events={filteredAndSortedEvents} />
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredAndSortedEvents.map((event) => (
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
