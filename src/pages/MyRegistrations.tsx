import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRegistrations } from '../hooks/useRegistrations';
import { useEvents } from '../hooks/useEvents';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatDate, formatPrice } from '../utils/formatDate';
import { 
  ClipboardCheck, 
  MapPin, 
  Calendar, 
  Trash2, 
  Star, 
  MessageSquare, 
  CheckCircle2, 
  Sparkles,
  Award,
  QrCode,
  Download,
  Bookmark,
  Clock,
  ArrowRight,
  Ticket,
  X,
  Share2,
  Heart,
  RefreshCw
} from 'lucide-react';

export function MyRegistrations() {
  const { profile } = useAuth();
  const { getRegistrationsByUser, cancelRegistration, addFeedback } = useRegistrations();
  const { getEvents } = useEvents();

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab control for attendee bookings
  const [activeSegmentTab, setActiveSegmentTab] = useState<'upcoming' | 'past' | 'saved'>('upcoming');

  // Digital Ticket view modal state
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  // Feedback popup form state
  const [activeFeedEventId, setActiveFeedEventId] = useState<string | null>(null);
  const [activeFeedEventTitle, setActiveFeedEventTitle] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [feedSubmitting, setFeedSubmitting] = useState(false);
  const [feedSuccess, setFeedSuccess] = useState<string | null>(null);

  // Saved/Bookmarked event IDs list
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);

  // Load complete state data
  const loadRegsAndEvents = async (forceRefresh?: boolean) => {
    if (!profile) return;
    try {
      const [regList, eventList] = await Promise.all([
        getRegistrationsByUser(profile.id, forceRefresh),
        getEvents({ forceRefresh })
      ]);
      setRegistrations(regList);
      setAllEvents(eventList);
      
      // Load local bookmarks
      const saved = JSON.parse(localStorage.getItem(`event-spark-bookmarks-${profile.id}`) || '[]');
      setSavedEventIds(saved);
    } catch (err) {
      console.error('Loader error in registrations board:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegsAndEvents(false);
  }, [profile]);

  // Cancel action implementation
  const handleCancelReg = async (regId: string) => {
    if (confirm('Are you absolutely sure you want to cancel your event registration? This will rescind your ticket immediately.')) {
      try {
        setLoading(true);
        await cancelRegistration(regId);
        await loadRegsAndEvents();
      } catch (err) {
        console.error('Cancel reg failure:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Bookmark toggler
  const toggleBookmark = (eventId: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!profile) return;
    const key = `event-spark-bookmarks-${profile.id}`;
    let saved = JSON.parse(localStorage.getItem(key) || '[]');
    if (saved.includes(eventId)) {
      saved = saved.filter((id: string) => id !== eventId);
    } else {
      saved.push(eventId);
    }
    localStorage.setItem(key, JSON.stringify(saved));
    setSavedEventIds(saved);
  };

  // Review Launcher
  const handleLeaveReview = (eventId: string, eventTitle: string) => {
    setActiveFeedEventId(eventId);
    setActiveFeedEventTitle(eventTitle);
    setRating(5);
    setComment('');
    setFeedSuccess(null);
  };

  // Review Submissions
  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFeedEventId) return;
    setFeedSubmitting(true);
    try {
      await addFeedback(activeFeedEventId, rating, comment.trim());
      setFeedSuccess('Thank you! Your feedback has been posted.');
      setTimeout(() => {
        setActiveFeedEventId(null);
        setActiveFeedEventTitle(null);
        setFeedSuccess(null);
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setFeedSubmitting(false);
    }
  };

  // Download printable pass receipt text file helper
  const handleDownloadReceipt = (reg: any) => {
    if (!reg) return;
    const ticketNo = `ES-REG-${reg.id.substring(0, 8).toUpperCase()}-${profile?.id.substring(0, 4).toUpperCase()}`;
    const txt = `
========================================
       EVENT SPARK DIGITAL TICKET
========================================
TICKET REFERENCE : ${ticketNo}
EVENT TITLE      : ${reg.event?.title || 'Spark Special Event'}
DATE & TIME      : ${formatDate(reg.event?.event_date)}
VENUE ADDRESS    : ${reg.event?.location || 'Venue details pending'}
PRICE PAID       : ${formatPrice(reg.event?.price || 0)}
STATUS           : VERIFIED / CONFIRMED
HOLDER NAME      : ${profile?.full_name || 'Event Guest'}
HOLDER EMAIL     : ${profile?.email || 'Guest Email'}
BOOKING RECEIVED : ${new Date(reg.registered_at).toLocaleString()}

This digital pass acts as standard proof of reservation. 
Please present the associated account QR Code at entry.
----------------------------------------
Sparky Platforms Inc. (C) 2026
    `;
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reg.event?.title.toLowerCase().replace(/\s+/g, '_')}_ticket.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter registrations:
  const registeredList = useMemo(() => {
    return registrations.filter(r => r.status === 'registered');
  }, [registrations]);

  const upcomingRegs = useMemo(() => {
    return registeredList.filter(r => {
      const eDate = r.event?.event_date ? new Date(r.event.event_date) : new Date();
      return eDate >= new Date();
    });
  }, [registeredList]);

  const pastRegs = useMemo(() => {
    return registeredList.filter(r => {
      const eDate = r.event?.event_date ? new Date(r.event.event_date) : new Date();
      return eDate < new Date();
    });
  }, [registeredList]);

  const bookmarkedEvents = useMemo(() => {
    return allEvents.filter(ev => savedEventIds.includes(ev.id));
  }, [allEvents, savedEventIds]);

  // Personalized Recommendation Engine (SaaS smart filtering matches)
  const recommendationsList = useMemo(() => {
    if (allEvents.length === 0) return [];

    // Extract categories user has registered for
    const userCategories = new Set<string>();
    registeredList.forEach(reg => {
      const title = (reg.event?.title || '').toLowerCase();
      const desc = (reg.event?.description || '').toLowerCase();
      if (title.includes('ai') || title.includes('hackathon') || title.includes('tech') || desc.includes('code')) userCategories.add('tech');
      if (title.includes('workshop') || title.includes('learn') || desc.includes('tutorial')) userCategories.add('education');
      if (title.includes('gala') || title.includes('meetup') || title.includes('social')) userCategories.add('social');
      if (title.includes('concert') || title.includes('music')) userCategories.add('music');
    });

    const userRegisteredIds = registeredList.map(r => r.event_id);

    // Match index scoring
    const scoredList = allEvents
      .filter(ev => !userRegisteredIds.includes(ev.id)) // do not recommend already booked events
      .map(ev => {
        let score = 0;
        const title = ev.title.toLowerCase();
        const desc = (ev.description || '').toLowerCase();

        // category score matching
        if (userCategories.has('tech') && (title.includes('ai') || title.includes('hackathon') || title.includes('tech') || desc.includes('code'))) score += 3;
        if (userCategories.has('education') && (title.includes('workshop') || title.includes('learn') || desc.includes('tutorial'))) score += 3;
        if (userCategories.has('social') && (title.includes('gala') || title.includes('meetup') || title.includes('social'))) score += 3;
        if (userCategories.has('music') && (title.includes('concert') || title.includes('music'))) score += 3;

        // popular events higher density
        if (ev.registration_count && ev.registration_count > 10) score += 2;
        // high views
        if (ev.views && ev.views > 400) score += 1;

        return { event: ev, score };
      });

    // Sort by score and slice top 4 recommendation products
    return scoredList
      .sort((a, b) => b.score - a.score)
      .map(item => item.event)
      .slice(0, 4);
  }, [allEvents, registeredList]);

  if (!profile) {
    return <LoadingSpinner size="large" />;
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest bg-indigo-50 text-indigo-700 rounded-md">
            <Ticket className="w-3.5 h-3.5" />
            <span>Attendee Center</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1.5 flex items-center gap-2">
            My Registered Tickets
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Browse active ticket passes, download vouchers, review attended events, and check smart recommendations.
          </p>
        </div>

        {/* Outer segmented view state togglers with Refresh */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadRegsAndEvents(true)}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            title="Force refresh registrations list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveSegmentTab('upcoming')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              activeSegmentTab === 'upcoming' 
                ? 'bg-white text-indigo-600 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Upcoming ({upcomingRegs.length})</span>
          </button>
          
          <button
            onClick={() => setActiveSegmentTab('past')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              activeSegmentTab === 'past' 
                ? 'bg-white text-indigo-600 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Past ({pastRegs.length})</span>
          </button>

          <button
            onClick={() => setActiveSegmentTab('saved')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              activeSegmentTab === 'saved' 
                ? 'bg-white text-indigo-600 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved ({bookmarkedEvents.length})</span>
          </button>
        </div>
      </div>
    </div>

      {loading ? (
        <LoadingSpinner size="medium" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Segment Lists */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Upcoming Reservations Segment */}
            {activeSegmentTab === 'upcoming' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block animate-ping" />
                    <span>Active Digital Passes</span>
                  </h2>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                    Valid Code Entry
                  </span>
                </div>

                {upcomingRegs.length === 0 ? (
                  <div className="text-center py-12 max-w-sm mx-auto">
                    <Ticket className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-800 text-sm">No Active Tickets</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      You do not have any upcoming bookings reserved. Discover and book amazing events on our marketplace!
                    </p>
                    <Link
                      to="/events"
                      className="mt-4 inline-flex items-center space-x-1 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
                    >
                      <span>Explore Event Spark Marketplace</span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingRegs.map((reg) => {
                      const sampleTicketNo = `ES-REG-${reg.id.substring(0, 8).toUpperCase()}`;
                      return (
                        <div
                          key={reg.id}
                          className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs hover:border-slate-350 transition duration-300 flex flex-col md:flex-row bg-white"
                        >
                          {/* Event graphics */}
                          <div className="relative md:w-36 h-28 md:h-auto shrink-0 bg-slate-100 overflow-hidden">
                            {reg.event?.image_url ? (
                              <img
                                src={reg.event.image_url}
                                alt={reg.event.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-tr from-indigo-500 to-indigo-800 flex items-center justify-center font-black text-white text-base">
                                SPARKY
                              </div>
                            )}
                            <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-extrabold text-white">
                              {reg.event?.price === 0 ? 'FREE' : formatPrice(reg.event?.price || 0)}
                            </div>
                          </div>

                          {/* Detail Grid */}
                          <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <Link
                                  to={`/events/${reg.event?.id}`}
                                  className="font-extrabold text-slate-900 hover:text-indigo-650 line-clamp-1 text-sm tracking-tight"
                                >
                                  {reg.event?.title || 'Spark Special Event'}
                                </Link>
                                <button
                                  onClick={() => toggleBookmark(reg.event?.id)}
                                  className="text-slate-400 hover:text-indigo-600 transition"
                                  title="Add to Saved List"
                                >
                                  <Bookmark className={`w-4 h-4 ${savedEventIds.includes(reg.event?.id) ? 'text-indigo-600 fill-indigo-600' : ''}`} />
                                </button>
                              </div>

                              <div className="text-xs text-slate-500 font-medium flex items-center space-x-1.5 mt-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 inline" />
                                <span>{formatDate(reg.event?.event_date)}</span>
                              </div>

                              <div className="text-[11px] text-slate-400 font-medium flex items-center space-x-1.5 mt-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-350 shrink-0" />
                                <span className="truncate">{reg.event?.location || 'Venue details pending'}</span>
                              </div>
                            </div>

                            {/* Ticket parameters */}
                            <div className="flex items-center justify-between border-t border-slate-50 pt-3.5 mt-4 text-xs">
                              <div className="text-[10px] text-slate-400 font-mono">
                                REF: <span className="font-bold text-slate-800">{sampleTicketNo}</span>
                              </div>

                              <div className="flex items-center space-x-2.5">
                                <button
                                  onClick={() => setSelectedTicket(reg)}
                                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs rounded-lg transition flex items-center space-x-1 cursor-pointer"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>View Digital Pass</span>
                                </button>
                                
                                <button
                                  onClick={() => handleCancelReg(reg.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Cancel Registration Pass"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. Past History Segment */}
            {activeSegmentTab === 'past' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-1.5">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    <span>Attendance History</span>
                  </h2>
                  <span className="text-[10px] font-bold text-slate-450">
                    Past listings
                  </span>
                </div>

                {pastRegs.length === 0 ? (
                  <div className="text-center py-12 max-w-sm mx-auto">
                    <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-800 text-sm">No Past Events</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      You haven't attended any event schedules previously or your bookings are all in the future.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pastRegs.map((reg) => (
                      <div
                        key={reg.id}
                        className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
                      >
                        <div className="flex space-x-3.5 items-start">
                          <div className="w-10 h-10 bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center font-bold text-[10px] border border-slate-300">
                            PAST
                          </div>
                          <div>
                            <Link
                              to={`/events/${reg.event?.id}`}
                              className="font-bold text-slate-800 hover:text-indigo-600 block text-sm"
                            >
                              {reg.event?.title || 'Spark Special Scheme'}
                            </Link>
                            <span className="text-xs text-slate-500">{formatDate(reg.event?.event_date)}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleLeaveReview(reg.event?.id, reg.event?.title)}
                            className="text-xs font-bold text-indigo-650 hover:bg-white border border-indigo-100 px-3 py-1.5 rounded-lg transition"
                          >
                            Leave Feedback Review
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. Bookmarked Scheduled Segment */}
            {activeSegmentTab === 'saved' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-1.5">
                    <Bookmark className="w-5 h-5 text-indigo-650 fill-current" />
                    <span>Saved Bookmarks</span>
                  </h2>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                    Organizing list
                  </span>
                </div>

                {bookmarkedEvents.length === 0 ? (
                  <div className="text-center py-12 max-w-sm mx-auto">
                    <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-800 text-sm">No Saved Bookmarks</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Your favorites tray is currently empty. Bookmark events from the feed to watch them closely!
                    </p>
                    <Link
                      to="/events"
                      className="mt-4 inline-flex items-center space-x-1 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition"
                    >
                      Browse Events
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bookmarkedEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-4 border border-slate-150 rounded-2xl bg-white hover:shadow-xs hover:border-slate-300 transition duration-200 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <Link to={`/events/${ev.id}`} className="font-extrabold text-slate-900 hover:text-indigo-600 block truncate text-xs leading-5">
                              {ev.title}
                            </Link>
                            <span className="text-[10px] text-slate-500 font-semibold">{formatDate(ev.event_date)}</span>
                          </div>
                          
                          <button
                            onClick={() => toggleBookmark(ev.id)}
                            className="text-rose-500 hover:text-slate-400 transition ml-2 cursor-pointer"
                          >
                            <Heart className="w-4.5 h-4.5 fill-current" />
                          </button>
                        </div>

                        <div className="text-[10px] text-slate-400 font-medium flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate">{ev.location}</span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                          <span className="font-extrabold text-slate-800 text-xs">{formatPrice(ev.price)}</span>
                          <Link
                            to={`/events/${ev.id}`}
                            className="text-[10px] font-bold text-indigo-600 flex items-center space-x-0.5 hover:underline"
                          >
                            <span>Explore Page</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Personalized Recommendations Section */}
            {recommendationsList.length > 0 && (
              <div className="bg-linear-to-b from-indigo-50/20 to-transparent p-6 rounded-2xl border border-indigo-100/50 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="inline-flex items-center space-x-1 px-2 py-0.5 text-[9px] font-extrabold bg-indigo-50 text-indigo-750 border border-indigo-150 rounded-md">
                      <Sparkles className="w-3 h-3 fill-current" />
                      <span>Spark Intelligent Matching</span>
                    </div>
                    <h3 className="font-black text-slate-900 text-base tracking-tight">Recommended For You</h3>
                  </div>
                  <Link
                    to="/events"
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center space-x-0.5"
                  >
                    <span>View All Feed</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recommendationsList.map((ev) => (
                    <div
                      key={ev.id}
                      className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-2xs hover:shadow-xs hover:border-indigo-200 transition duration-300 flex space-x-3 items-start"
                    >
                      {ev.image_url ? (
                        <img
                          src={ev.image_url}
                          alt={ev.title}
                          className="w-14 h-14 rounded-lg object-cover shrink-0 border border-slate-100"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-100">
                          ES
                        </div>
                      )}

                      <div className="min-w-0 flex-1 flex flex-col justify-between h-full">
                        <div>
                          <Link
                            to={`/events/${ev.id}`}
                            className="font-bold text-xs text-slate-900 hover:text-indigo-600 block truncate"
                          >
                            {ev.title}
                          </Link>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{formatDate(ev.event_date)}</p>
                        </div>

                        <div className="flex items-center justify-between mt-3 text-[10px] pt-1.5 border-t border-slate-50">
                          <span className="font-extrabold text-slate-700">{formatPrice(ev.price)}</span>
                          <Link
                            to={`/events/${ev.id}`}
                            className="text-[10px] font-bold text-indigo-600 flex items-center space-x-0.5 hover:underline"
                          >
                            <span>Book Now</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column Reviews panel / Active review form */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              
              {/* Review card panel */}
              <div className="bg-gradient-to-br from-indigo-50/50 to-slate-50 border border-indigo-150 rounded-2xl p-5 shadow-2xs">
                {activeFeedEventId ? (
                  <div>
                    <div className="flex items-center space-x-2.5 text-indigo-700 font-extrabold mb-2.5">
                      <MessageSquare className="w-5 h-5 text-indigo-650" />
                      <h4 className="text-sm tracking-tight">Post Attendee Feedback</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-normal mb-4">
                      Leave a rating review for <span className="font-bold text-indigo-750">"{activeFeedEventTitle}"</span> to share your thoughts with other peers.
                    </p>

                    {feedSuccess ? (
                      <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs rounded-lg font-medium flex items-center space-x-1.5 animate-pulse">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{feedSuccess}</span>
                      </div>
                    ) : (
                      <form onSubmit={submitReview} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Event Rating (1 to 5 Stars)</label>
                          <div className="flex items-center space-x-1.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className="focus:outline-hidden cursor-pointer group"
                              >
                                <Star
                                  className={`w-6 h-6 transition-all scale-100 active:scale-90 ${
                                    star <= rating
                                      ? 'text-amber-400 fill-amber-400'
                                      : 'text-slate-300 hover:text-amber-302'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Your Review Comment</label>
                          <textarea
                            placeholder="What did you like about this program? What can they improve next time?"
                            rows={4}
                            required
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800 resize-none font-medium"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                          />
                        </div>

                        <div className="flex justify-end space-x-2 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveFeedEventId(null);
                              setActiveFeedEventTitle(null);
                            }}
                            className="px-3 py-1.5 font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          
                          <button
                            type="submit"
                            disabled={feedSubmitting || !comment.trim()}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition disabled:bg-slate-350 cursor-pointer"
                          >
                            <span>Publish Feedback</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500">
                    <Award className="w-10 h-10 text-indigo-400/80 mx-auto mb-2" />
                    <h4 className="font-extrabold text-slate-800 text-xs">Verify Reviews</h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                      Select individual "Leave Feedback" actions under past attendances to review them here.
                    </p>
                  </div>
                )}
              </div>

              {/* Verified Badge Certificate decoration widget */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs relative overflow-hidden">
                <div className="absolute right-0 bottom-0 translate-x-1/3 translate-y-1/3 w-32 h-32 bg-indigo-500/15 blur-2xl rounded-full" />
                <Award className="w-8 h-8 text-amber-400 mb-2.5" />
                <h4 className="font-extrabold text-white text-xs tracking-tight">VIP Fast-Track Access</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                  Verified reservation passes under active tickets include fast-track entry privileges and full digital copy receipt downloads.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 4. Physical Boarding Pass style Digital Ticket Overlay Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl overflow-hidden max-w-sm w-full border border-slate-100 shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-200">
            {/* Modal header banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Ticket className="w-4 h-4 text-indigo-400 fill-current" />
                <span className="font-extrabold text-xs tracking-tight">OFFICIAL SPARK RESERVATION</span>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Boarding-pass Body card layout */}
            <div className="p-6 space-y-6">
              
              {/* Event title */}
              <div className="text-center space-y-1">
                <h3 className="font-extrabold text-slate-900 text-lg leading-tight tracking-tight">
                  {selectedTicket.event?.title || 'Spark Special Event'}
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700">
                  Confirmed Entry
                </span>
              </div>

              {/* Spacers with physical dotted tear-away trim & punch-holes */}
              <div className="relative h-px border-t-2 border-dashed border-slate-200">
                <div className="absolute top-0 left-0 -translate-x-[26px] -translate-y-[4px] w-3 h-3 bg-slate-100 border border-slate-200/50 rounded-full" />
                <div className="absolute top-0 right-0 translate-x-[26px] -translate-y-[4px] w-3 h-3 bg-slate-100 border border-slate-200/50 rounded-full" />
              </div>

              {/* Event parameter lists */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Attendee Holder</span>
                  <span className="font-bold text-slate-800 block truncate">{profile.full_name || 'Guest User'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Pass Category</span>
                  <span className="font-bold text-slate-800 block">General Admission</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Schedule Date</span>
                  <span className="font-bold text-slate-800 block leading-tight">{formatDate(selectedTicket.event?.event_date)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Venue Gate</span>
                  <span className="font-bold text-slate-800 block truncate" title={selectedTicket.event?.location}>{selectedTicket.event?.location || 'TBA'}</span>
                </div>
              </div>

              {/* Dotted separator again */}
              <div className="relative h-px border-t-2 border-dashed border-slate-200">
                <div className="absolute top-0 left-0 -translate-x-[26px] -translate-y-[4px] w-3 h-3 bg-slate-150 rounded-full" />
                <div className="absolute top-0 right-0 translate-x-[26px] -translate-y-[4px] w-3 h-3 bg-slate-150 rounded-full" />
              </div>

              {/* QR Code graphic generator */}
              <div className="flex flex-col items-center justify-center space-y-3.5">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-150 inline-block">
                  {/* Styled clean SVG QR design for premium aesthetic */}
                  <svg className="w-28 h-28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" rx="12" fill="#faf5ff" />
                    {/* Corners */}
                    <rect x="10" y="10" width="24" height="24" rx="4" fill="#6366f1" />
                    <rect x="14" y="14" width="16" height="16" rx="2" fill="#faf5ff" />
                    <rect x="17" y="17" width="10" height="10" rx="1" fill="#6366f1" />

                    <rect x="66" y="10" width="24" height="24" rx="4" fill="#6366f1" />
                    <rect x="70" y="14" width="16" height="16" rx="2" fill="#faf5ff" />
                    <rect x="73" y="17" width="10" height="10" rx="1" fill="#6366f1" />

                    <rect x="10" y="66" width="24" height="24" rx="4" fill="#6366f1" />
                    <rect x="14" y="70" width="16" height="16" rx="2" fill="#faf5ff" />
                    <rect x="17" y="73" width="10" height="10" rx="1" fill="#6366f1" />

                    {/* Small noise grid squares simulating dynamic QR */}
                    <rect x="42" y="15" width="6" height="6" rx="1" fill="#1e293b" />
                    <rect x="52" y="24" width="8" height="6" rx="1" fill="#6366f1" />
                    <rect x="42" y="34" width="6" height="12" rx="1" fill="#1e293b" />
                    <rect x="52" y="44" width="12" height="6" fill="#1e293b" />
                    
                    <rect x="46" y="66" width="10" height="10" rx="2" fill="#6366f1" />
                    <rect x="72" y="48" width="8" height="8" rx="1" fill="#1e293b" />
                    <rect x="80" y="70" width="10" height="10" rx="2" fill="#1e293b" />
                    <rect x="68" y="78" width="6" height="12" rx="1" fill="#1e293b" />
                  </svg>
                </div>

                <div className="text-center font-mono space-y-0.5">
                  <div className="text-[9px] text-slate-450 uppercase tracking-widest font-bold">Ticket Identification No.</div>
                  <div className="text-xs font-black text-slate-700">ES-REG-{selectedTicket.id.substring(0, 12).toUpperCase()}</div>
                </div>
              </div>

            </div>

            {/* Modal action bars */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-stretch gap-2">
              <button
                onClick={() => handleDownloadReceipt(selectedTicket)}
                className="flex-1 inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Receipt</span>
              </button>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs transition cursor-pointer"
                title="Print digital ticket pass"
              >
                <span>Print Pass</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
