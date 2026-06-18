import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEvents } from '../hooks/useEvents';
import { useRegistrations } from '../hooks/useRegistrations';
import { geminiService } from '../services/gemini';
import { formatDate, formatPrice } from '../utils/formatDate';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  ChevronLeft, 
  ShieldAlert, 
  Sparkles, 
  Send, 
  CheckCircle, 
  Loader, 
  Share2, 
  NotebookText, 
  Star, 
  MessageSquareCode,
  Flame,
  Twitter,
  Facebook,
  MessageCircle,
  Download
} from 'lucide-react';
import { generateICSFile } from '../utils/icsGenerator';

export function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { getEventById, loading: eventLoading } = useEvents();
  const { 
    registerForEvent, 
    cancelRegistration, 
    checkUserRegistration, 
    getFeedbackByEvent,
    loading: regLoading 
  } = useRegistrations();

  const [event, setEvent] = useState<any>(null);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [activeRegId, setActiveRegId] = useState<string | null>(null);
  const [generalLoading, setGeneralLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Gemini State counters
  const [agenda, setAgenda] = useState<string | null>(null);
  const [agendaLoading, setAgendaLoading] = useState(false);

  const [promos, setPromos] = useState<string | null>(null);
  const [promosLoading, setPromosLoading] = useState(false);

  // AI Chat Bot State
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const loadAllDetails = async () => {
    if (!id) return;
    try {
      setGeneralLoading(true);
      setErrorMsg(null);

      // Load event entity
      const item = await getEventById(id);
      if (!item) {
        setErrorMsg('We are unable to resolve this event specifications.');
        return;
      }
      setEvent(item);

      // Load registration status if logged in
      if (profile) {
        const reg = await checkUserRegistration(id, profile.id);
        if (reg) {
          setIsRegistered(true);
          setActiveRegId(reg.id);
        } else {
          setIsRegistered(false);
          setActiveRegId(null);
        }
      }

      // Load feedback reviews
      const feedList = await getFeedbackByEvent(id);
      setFeedback(feedList);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading details.');
    } finally {
      setGeneralLoading(false);
    }
  };

  useEffect(() => {
    setSuccessMsg(null);
    loadAllDetails();
  }, [id, profile]);

  const handleRegister = async () => {
    if (!profile) {
      navigate('/login', { state: { from: { pathname: `/events/${id}` } } });
      return;
    }

    try {
      setRegisterLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      await registerForEvent(event.id);
      setSuccessMsg('Seat successfully booked! We have reserved your spot.');
      await loadAllDetails();
    } catch (err: any) {
      const isAlreadyReg = err.message && (
        err.message.toLowerCase().includes('already registered') || 
        err.message.toLowerCase().includes('already registered for this event')
      );
      if (isAlreadyReg) {
        setSuccessMsg('You are already registered for this event, and your seat is secured!');
        setIsRegistered(true);
        await loadAllDetails();
      } else {
        alert(err.message || 'Failed to complete registration.');
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  // SOCIAL SHARING HANDLERS
  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this event: ${event?.title}`)}&url=${encodeURIComponent(window.location.href)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`Check out this event: ${event?.title} ${window.location.href}`)}`,
  };

  const handleDownloadICS = () => {
    if (!event) return;
    generateICSFile({
      title: event.title,
      description: event.description || '',
      location: event.location || 'Venue Location',
      startDate: event.event_date,
      durationHours: 2, // assume 2h if not specified
    });
  };

  const handleCancelRegistration = async () => {
    if (!activeRegId) return;
    if (confirm('Cancel your ticket reservation for this event?')) {
      try {
        setGeneralLoading(true);
        await cancelRegistration(activeRegId);
        await loadAllDetails();
      } catch (err: any) {
        alert(err.message || 'Failed to cancel reservation.');
      } finally {
        setGeneralLoading(false);
      }
    }
  };

  // GEMINI: Generate Hour Itinerary Agenda
  const handleGenerateAgenda = async () => {
    if (!event) return;
    setAgendaLoading(true);
    setAgenda(null);
    try {
      const generated = await geminiService.generateAgenda({
        title: event.title,
        durationHours: 4, // standard 4 hour schedule duration
      });
      setAgenda(generated);
    } catch (err: any) {
      console.error(err);
      alert('Unable to load schedule. Make sure the Gemini key is valid!');
    } finally {
      setAgendaLoading(false);
    }
  };

  // GEMINI: Generate Promo Captions
  const handleGeneratePromos = async () => {
    if (!event) return;
    setPromosLoading(true);
    setPromos(null);
    try {
      const generated = await geminiService.generatePromotionalContent({
        title: event.title,
        description: event.description || '',
      });
      setPromos(generated);
    } catch (err: any) {
      console.error(err);
      alert('Unable to generate promos. Check server terminal logs.');
    } finally {
      setPromosLoading(false);
    }
  };

  // GEMINI: Send Message to ChatBot
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !event) return;

    const userText = chatMessage.trim();
    setChatMessage('');
    setChatLoading(true);

    // Update conversation block locally
    const updatedHistory = [...chatHistory, { role: 'user' as const, text: userText }];
    setChatHistory(updatedHistory);

    try {
      const aiReply = await geminiService.sendMessage({
        message: userText,
        eventTitle: event.title,
        eventDescription: event.description || 'No description provided.',
        chatHistory: chatHistory,
      });

      setChatHistory([...updatedHistory, { role: 'model' as const, text: aiReply }]);
    } catch (err: any) {
      console.error(err);
      setChatHistory([
        ...updatedHistory,
        { role: 'model' as const, text: 'Oops! My AI circuits are experiencing heavy load right now. Feel free to try again.' }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (generalLoading && !event) {
    return (
      <div className="py-20 bg-slate-50 min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (errorMsg || !event) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <ShieldAlert className="w-14 h-14 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Event Not Resolved</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6 leading-relaxed">
          The event ID is invalid or its records have been removed from the platform database.
        </p>
        <Link to="/events" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs">
          Return to Events Feed
        </Link>
      </div>
    );
  }

  const spotsLeft = event.capacity ? event.capacity - (event.registration_count || 0) : null;
  const isSoldOut = event.capacity > 0 && spotsLeft !== null && spotsLeft <= 0;

  // Calculate Average Feedback Score
  const averageRating = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)
    : null;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Return Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate('/events')}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-indigo-650 transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Browse All Events</span>
        </button>
        
        {/* Quick Edit shortcut if organizer */}
        {profile?.id === event.organizer_id && profile?.role === 'organizer' && (
          <Link
            to={`/edit-event/${event.id}`}
            className="text-xs font-extrabold text-indigo-650 bg-indigo-50 border border-indigo-150 px-3.5 py-1.5 rounded-lg hover:bg-indigo-100 transition"
          >
            Edit Event Parameters
          </Link>
        )}
      </div>

      {/* Hero Visual Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left main area: Description details */}
        <div className="lg:col-span-2 space-y-7">
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-xs">
            <div className="h-72 md:h-96 w-full relative bg-slate-50">
              <img
                src={event.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80'}
                alt={event.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              
              <div className="absolute bottom-6 left-6 right-6 text-white text-left">
                <span className="px-3 py-1 font-bold bg-indigo-600 rounded-md text-xs tracking-wide shadow-xs">
                  {formatPrice(event.price)}
                </span>
                
                <h1 className="text-2xl md:text-4xl font-black mt-3 leading-tight tracking-tight">
                  {event.title}
                </h1>
                
                <p className="text-xs text-indigo-100 mt-2 flex items-center space-x-1.5">
                  <span>Hosted by:</span>
                  <span className="font-extrabold text-white underline decoration-indigo-400">
                    {event.organizer?.full_name || 'Organizer'}
                  </span>
                </p>
              </div>
            </div>

            {/* Event Summary Grid */}
            <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4 border-b border-slate-50 text-slate-700 bg-slate-50/20">
              <div className="flex items-center space-x-2.5">
                <Calendar className="w-5 h-5 text-indigo-555 shrink-0" />
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-slate-400 leading-none">Schedule Time</h4>
                  <span className="text-xs font-bold leading-normal block mt-1">{formatDate(event.event_date)}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2.5">
                <MapPin className="w-5 h-5 text-indigo-555 shrink-0" />
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-slate-400 leading-none">Venue location</h4>
                  <span className="text-xs font-bold leading-normal block mt-1 truncate max-w-[150px]">{event.location || 'Online'}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 col-span-2 md:col-span-1 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                <Users className="w-5 h-5 text-indigo-555 shrink-0" />
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-slate-400 leading-none">Reservations Fill</h4>
                  <span className="text-xs font-bold leading-normal block mt-1">
                    {event.registration_count || 0} / {event.capacity === 0 ? 'Unlimited' : event.capacity} filled
                  </span>
                </div>
              </div>
            </div>

            {/* Description Area */}
            <div className="p-6 space-y-4">
              <h3 className="font-extrabold text-slate-800 text-lg">Event Synopsis</h3>
              <div className="text-slate-650 text-sm leading-relaxed whitespace-pre-wrap select-all">
                {event.description || 'No detailed specifications have been published for this event.'}
              </div>
            </div>
          </div>

          {/* ATTENDEE REVIEWS FEEDBACK SECTION */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-amber-450 fill-amber-400" />
                <h3 className="font-extrabold text-slate-800 text-base">Attendee Reviews</h3>
              </div>
              {averageRating && (
                <div className="flex items-center space-x-1 bg-amber-50 text-amber-800 px-2.5 py-0.5 border border-amber-200 text-xs font-bold rounded-md">
                  <span>★ {averageRating} Avg score</span>
                  <span className="text-slate-400 font-normal">({feedback.length} reviews)</span>
                </div>
              )}
            </div>

            {feedback.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium text-center py-6">
                No reviews posted yet. Be the first to post feedback on this event from your reservations panel!
              </p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {feedback.map((f) => (
                  <div key={f.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {f.user_profile?.avatar_url ? (
                          <img
                            src={f.user_profile.avatar_url}
                            alt="User avatar"
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-[10px]">
                            U
                          </div>
                        )}
                        <span className="text-xs font-bold text-slate-700">
                          {f.user_profile?.full_name || 'Anonymous User'}
                        </span>
                      </div>
                      
                      {/* Rating stars rendering */}
                      <div className="flex space-x-0.5">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className={`w-3.5 h-3.5 ${
                              idx < f.rating ? 'text-amber-400 fill-amber-300' : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-normal pl-8 italic">
                      "{f.comment || 'Complimentary rating stars.'}"
                    </p>
                    <div className="text-[10px] text-slate-400 text-right">
                      {formatDate(f.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Dynamic registration triggers AND AI utilities */}
        <div className="space-y-6">
          
          {/* REGISTRATION BLOCK CARD */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm">Ticket Reservation</h3>

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold text-center flex items-center justify-between space-x-1.5 animate-pulse">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
                <button 
                  onClick={() => setSuccessMsg(null)} 
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm leading-none focus:outline-hidden"
                >
                  ×
                </button>
              </div>
            )}

            {isRegistered ? (
              <div className="space-y-3 p-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl flex flex-col items-center">
                <CheckCircle className="w-10 h-10 text-emerald-600 animate-bounce" />
                <div>
                  <h4 className="font-extrabold text-sm text-center leading-none">Registration Confirmed</h4>
                  <p className="text-[10px] mt-1 text-emerald-600">You hold an active seat reservation.</p>
                </div>
                
                <button
                  onClick={handleCancelRegistration}
                  disabled={registerLoading}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-700 hover:underline pt-2 cursor-pointer disabled:text-rose-300"
                >
                  {registerLoading ? 'Processing...' : 'Cancel Registration?'}
                </button>
              </div>
            ) : isSoldOut ? (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 flex flex-col items-center">
                <Flame className="w-8 h-8 text-rose-500 animate-pulse mb-1.5" />
                <h4 className="font-bold text-sm">Event Sold Out!</h4>
                <p className="text-[10px] text-rose-600 mt-1">This event is already filled to absolute capacity.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>Price:</span>
                  <span className="font-black text-slate-805 text-sm">{formatPrice(event.price)}</span>
                </div>
                
                {spotsLeft !== null && spotsLeft <= 5 && spotsLeft > 0 && (
                  <p className="text-xs text-amber-600 font-bold bg-amber-50 p-2 border border-amber-200 rounded-lg flex items-center justify-center space-x-1 animate-pulse">
                    <span>Hurry! Only {spotsLeft} seats remaining!</span>
                  </p>
                )}

                <button
                  onClick={handleRegister}
                  disabled={registerLoading}
                  className="w-full inline-flex items-center justify-center space-x-2 py-3 px-4 font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed rounded-xl transition shadow-xs cursor-pointer"
                >
                  {registerLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Securing Your Seat...</span>
                    </>
                  ) : (
                    <span>Book Seat Ticket</span>
                  )}
                </button>
              </div>
            )}

            {/* SOCIAL SHARING SECTION */}
            <div className="pt-4 border-t border-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Spread the word</span>
                <button 
                  onClick={handleDownloadICS}
                  className="inline-flex items-center space-x-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Add to Calendar</span>
                </button>
              </div>
              
              <div className="flex items-center justify-center space-x-3">
                <a 
                  href={shareLinks.twitter} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition"
                  title="Share on Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a 
                  href={shareLinks.facebook} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition"
                  title="Share on Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a 
                  href={shareLinks.whatsapp} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition"
                  title="Share on WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* AI COPILOT INTERACTIVE EXPERIENCES */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 p-5 rounded-2xl text-white shadow-md space-y-5">
            <div className="flex items-center space-x-2 border-b border-indigo-400/10 pb-3">
              <Sparkles className="w-5 h-5 text-indigo-400 fill-current animate-pulse shrink-0" />
              <h3 className="font-black tracking-tight text-xs uppercase text-indigo-300">Gemini AI Event Assistant</h3>
            </div>

            {/* Utility Tab Row: Agenda, Promotions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleGenerateAgenda}
                disabled={agendaLoading}
                className="inline-flex items-center justify-center space-x-1 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold transition cursor-pointer"
              >
                {agendaLoading ? <Loader className="w-3 h-3 animate-spin" /> : <NotebookText className="w-3.5 h-3.5 text-indigo-400" />}
                <span>Generate Agenda</span>
              </button>

              <button
                onClick={handleGeneratePromos}
                disabled={promosLoading}
                className="inline-flex items-center justify-center space-x-1 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold transition cursor-pointer"
              >
                {promosLoading ? <Loader className="w-3 h-3 animate-spin" /> : <Share2 className="w-3.5 h-3.5 text-indigo-400" />}
                <span>Promotional Captions</span>
              </button>
            </div>

            {/* Render agenda if generated */}
            {agenda && (
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-xs space-y-1.5 max-h-56 overflow-y-auto">
                <h4 className="font-black text-indigo-350 flex items-center gap-1.5"><NotebookText className="w-3.5 h-3.5 shrink-0" /> Generated Schedule Agenda</h4>
                <div className="whitespace-pre-wrap leading-relaxed text-slate-300 text-[11px] font-medium">{agenda}</div>
              </div>
            )}

            {promos && (
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-xs space-y-1.5 max-h-56 overflow-y-auto">
                <h4 className="font-black text-indigo-350 flex items-center gap-1.5"><Share2 className="w-3.5 h-3.5 shrink-0" /> Social Promotions</h4>
                <div className="whitespace-pre-wrap leading-relaxed text-slate-300 text-[11px] font-mono">{promos}</div>
              </div>
            )}

            {/* CHATBOT STREAMING THREAD PANEL */}
            <div className="border-t border-indigo-400/10 pt-4 space-y-3.5">
              <div className="flex items-center space-x-2 text-indigo-300">
                <MessageSquareCode className="w-4 h-4 text-indigo-400 shrink-0" />
                <h4 className="text-xs font-bold">Ask about this Event</h4>
              </div>

              {/* Thread List box */}
              <div className="h-44 bg-slate-950/80 border border-white/5 rounded-lg p-3 overflow-y-auto text-[11px] leading-relaxed space-y-2.5 scrollbar-thin">
                {chatHistory.length === 0 ? (
                  <p className="text-slate-500 italic text-center py-10 font-medium">
                    Ask regarding pre-requisites, schedules, locations, or pricing!
                  </p>
                ) : (
                  chatHistory.map((chat, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg ${
                        chat.role === 'user'
                          ? 'bg-indigo-600/30 text-indigo-100 border border-indigo-600/20 text-right ml-6'
                          : 'bg-white/5 text-slate-200 border border-white/5 mr-6'
                      }`}
                    >
                      <span className="block text-[8px] font-bold text-slate-400 leading-none mb-1">
                        {chat.role === 'user' ? 'YOU' : 'SPARK BOT'}
                      </span>
                      <span>{chat.text}</span>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex items-center space-x-2 text-indigo-350 p-2 bg-white/5 rounded-lg mr-6">
                    <Loader className="w-3 h-3 animate-spin" />
                    <span>Gemini is modeling thoughts...</span>
                  </div>
                )}
              </div>

              {/* Thread form prompt */}
              <form onSubmit={handleSendChatMessage} className="flex space-x-1.5">
                <input
                  type="text"
                  placeholder="Is it virtual? Is there food?"
                  className="flex-1 bg-slate-950/90 text-xs px-3 py-2 rounded-lg border border-white/10 text-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatMessage.trim()}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:bg-slate-350 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
