import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEvents } from '../hooks/useEvents';
import { useRegistrations } from '../hooks/useRegistrations';
import { supabase } from '../services/supabase';
import { geminiService } from '../services/gemini';
import { formatDate, formatPrice } from '../utils/formatDate';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { OrganizerControlCenter } from '../components/OrganizerControlCenter';
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
  Download,
  Activity,
  Clock,
  User,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
  Copy,
  CopyCheck
} from 'lucide-react';
import { generateICSFile } from '../utils/icsGenerator';

export function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { getEventById, getEvents, loading: eventLoading } = useEvents();
  const { 
    registerForEvent, 
    cancelRegistration, 
    checkUserRegistration, 
    getFeedbackByEvent,
    getRegistrationsByEvent,
    loading: regLoading 
  } = useRegistrations();

  const [event, setEvent] = useState<any>(null);
  const [allEventsList, setAllEventsList] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [activeRegId, setActiveRegId] = useState<string | null>(null);
  const [generalLoading, setGeneralLoading] = useState(true);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [organizerMode, setOrganizerMode] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  // Gemini State counters
  const [agenda, setAgenda] = useState<string | null>(null);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [promos, setPromos] = useState<string | null>(null);
  const [promosLoading, setPromosLoading] = useState(false);

  // AI Chat Bot State
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Countdown clock tick values
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, live: false });

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

      // Load surrounding events for similar section
      const list = await getEvents();
      setAllEventsList(list);

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

      // Load registrations if current user is the owner/organizer or admin
      if (profile && (profile.id === item.organizer_id || profile.role === 'admin')) {
        setRegistrationsLoading(true);
        try {
          const regs = await getRegistrationsByEvent(id);
          setRegistrations(regs);
        } catch (err) {
          console.warn('Failed to fetch event registrations:', err);
        } finally {
          setRegistrationsLoading(false);
        }
      }

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

  // Real-time pre-event countdown calculations
  useEffect(() => {
    if (!event?.event_date) return;
    const updateCountdown = () => {
      const future = new Date(event.event_date).getTime();
      const difference = future - Date.now();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, live: true });
        return;
      }
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds, live: false });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [event?.event_date]);

  const handleRegister = async () => {
    if (!profile) {
      navigate('/login', { state: { from: { pathname: `/events/${id}` } } });
      return;
    }

    if (event && profile && profile.id === event.organizer_id) {
      setErrorMsg('As the host of this event, you cannot register to book a seat.');
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
        setIsRegistered(true);
        setSuccessMsg("You are already registered for this event.");
      } else {
        setErrorMsg(err.message || 'Error booking seat ticket.');
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!activeRegId) return;
    if (confirm('Are you absolutely sure you want to cancel your seat registration? This will relinquish your ticket immediately.')) {
      try {
        setRegisterLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        await cancelRegistration(activeRegId);
        setIsRegistered(false);
        setActiveRegId(null);
        setSuccessMsg('Your ticket reservation has been cancelled.');
        await loadAllDetails();
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to cancel registration.');
      } finally {
        setRegisterLoading(false);
      }
    }
  };

  // Share link Copier
  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  // Download ICS Dynamic event 
  const handleDownloadICS = () => {
    if (!event) return;
    try {
      generateICSFile({
        title: event.title,
        description: event.description || '',
        startDate: event.event_date || new Date().toISOString(),
        location: event.location || 'TBD',
      });
    } catch (err) {
      console.error(err);
      alert('Failed to generate calendar file.');
    }
  };

  // GEMINI: Generate Smart Agenda
  const handleGenerateAgenda = async () => {
    if (!event) return;
    setAgendaLoading(true);
    setAgenda(null);
    try {
      const generated = await geminiService.generateAgenda({
        title: event.title,
        durationHours: 4,
      });
      setAgenda(generated);
    } catch (err: any) {
      console.error(err);
      alert('Unable to generate agenda. Check server terminal logs.');
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

  // Similar events matching
  const similarEvents = useMemo(() => {
    if (!event) return [];
    
    const selfText = (event.title + ' ' + (event.description || '')).toLowerCase();
    const selfIsTech = selfText.includes('ai') || selfText.includes('code') || selfText.includes('tech');
    const selfIsWorkshop = selfText.includes('workshop') || selfText.includes('learn') || selfText.includes('seminar');

    return allEventsList
      .filter(ev => ev.id !== event.id)
      .map(ev => {
        let score = 0;
        const otherText = (ev.title + ' ' + (ev.description || '')).toLowerCase();
        
        if (selfIsTech && (otherText.includes('ai') || otherText.includes('code') || otherText.includes('tech'))) score += 3;
        if (selfIsWorkshop && (otherText.includes('workshop') || otherText.includes('learn') || otherText.includes('seminar'))) score += 3;
        
        return { event: ev, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.event)
      .slice(0, 3);
  }, [allEventsList, event]);

  if (authLoading) {
    return (
      <div className="py-20 bg-slate-50 min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Auth Protection Gate
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20 px-4">
        <div id="auth-gate-card" className="max-w-md w-full bg-white rounded-3xl border border-slate-100 shadow-xl p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Access Restricted</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              This event's scheduling details, maps, agenda outlines, and seat reservations are protected. You need to sign in to access this information.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              id="auth-gate-login"
              to="/login"
              state={{ from: { pathname: `/events/${id}` } }}
              className="flex-1 px-5 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-700 transition duration-200 text-center"
            >
              Log In to Account
            </Link>
            <Link
              id="auth-gate-register"
              to="/register"
              className="flex-1 px-5 py-3 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold transition duration-200 text-center"
            >
              Create Account
            </Link>
          </div>
          <div className="pt-2 border-t border-slate-100">
            <Link to="/events" className="text-xs text-indigo-600 hover:underline font-semibold">
              ← Return to public events feed
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (generalLoading && !event) {
    return (
      <div className="py-20 bg-slate-50 min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (errorMsg && !event) {
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

  const isOrganizerUser = profile && (profile.id === event.organizer_id || profile.role === 'admin');

  // Static Fallback Agenda Timeline if none defined:
  const eventAgendaData = event.agenda || [
    { time: '09:00 AM - 09:30 AM', title: 'Reception & Breakfast', desc: 'Arrive at the gate, check-in with your digital passes, and secure coffee.' },
    { time: '09:30 AM - 10:45 AM', title: 'Opening Remarks & Keynote', desc: 'High-level introduction of the roadmap and panel perspectives.' },
    { time: '11:00 AM - 12:30 PM', title: 'Hands-on Interactive Lab', desc: 'Interactive workshop sessions with host mentorship.' },
    { time: '12:30 PM - 01:30 PM', title: 'Networking Luncheon', desc: 'Complementary refreshments served in the main atrium.' },
    { time: '01:45 PM - 03:00 PM', title: 'Q&A Open Atrium Roundtable', desc: 'Share ideas and receive direct feedback on active templates.' }
  ];

  // Static Fallback Speakers Panel if none:
  const eventSpeakersData = event.speakers || [
    { name: event.organizer?.full_name || 'Event Host', role: 'Main Developer Facilitator', company: 'Spark Assembly Principal', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80' },
    { name: 'Dr. Evelyn Sterling', role: 'Distinguished Engineer', company: 'Noveau AI Laboratory', img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80' }
  ];

  // Static Fallback FAQs if none:
  const eventFaqsData = event.faqs || [
    { q: 'Is there visual parking onsite?', a: 'Yes. Free parking is allocated for all registered attendees behind the main campus lot.' },
    { q: 'Can I bring a guest?', a: 'Every attendee must secure their own digital QR boarding pass individually for check-in safety.' },
    { q: 'Is there food or lunch serves?', a: 'Complementary refreshments, coffee, tea, and warm luncheons are fully covered for premium tickets.' }
  ];

  // Static Fallback Policies if none:
  const eventPoliciesData = event.policies || [
    { title: 'Refund Policy', desc: 'Cancellations completed prior to 24 hours of scheduled launch are eligible for 100% refund equivalents.' },
    { title: 'Code of Conduct', desc: 'We foster inclusive, collaborative atmospheres. Harassment of any nature triggers instant egress.' },
    { title: 'Photography & Recordings', desc: 'Portions of lectures are captured for template documentation. Please notify the gate if you wish to opt out.' }
  ];

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
            className="text-xs font-extrabold text-indigo-650 bg-indigo-50 border border-indigo-150 px-3.5 py-1.5 rounded-lg hover:bg-indigo-100 transition shadow-2xs"
          >
            Edit Event Parameters
          </Link>
        )}
      </div>

      {/* Control Panel Toggle headers */}
      {isOrganizerUser && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 text-left">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
              <Activity className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">You are Authorized as the Event Host</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Access attendee details, revenue distributions, announcements dispatching, and stats.
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => setOrganizerMode(true)}
              className={`flex-1 md:flex-initial px-4 py-2 text-xs font-black rounded-xl transition cursor-pointer ${
                organizerMode ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              ⚡ Control Center
            </button>
            <button
              onClick={() => setOrganizerMode(false)}
              className={`flex-1 md:flex-initial px-4 py-2 text-xs font-black rounded-xl transition cursor-pointer ${
                !organizerMode ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              👁️ Preview Attendee View
            </button>
          </div>
        </div>
      )}

      {isOrganizerUser && organizerMode ? (
        <OrganizerControlCenter
          event={event}
          registrations={registrations}
          feedback={feedback}
          onRefresh={loadAllDetails}
          profile={profile}
        />
      ) : (
        /* Regular Attendee view markup below */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
          {/* Left main area: Description details and dynamic features sections */}
          <div className="lg:col-span-2 space-y-7">
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
              <div className="h-72 md:h-96 w-full relative bg-slate-50">
                <img
                  src={event.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80'}
                  alt={event.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                
                <div className="absolute bottom-6 left-6 right-6 text-white text-left space-y-3.5">
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 font-extrabold bg-indigo-600 rounded-md text-xs tracking-wide shadow-xs shrink-0 text-white">
                      {formatPrice(event.price)}
                    </span>
                    {isSoldOut ? (
                      <span className="px-2.5 py-1 text-[10px] font-extrabold bg-rose-650 text-white rounded-md tracking-widest uppercase">
                        SOLD OUT
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-[10px] bg-slate-900/80 backdrop-blur-xs font-bold text-slate-300 rounded-md">
                        {spotsLeft !== null ? `${spotsLeft} entries left` : 'Unlimited seats'}
                      </span>
                    )}
                  </div>
                  
                  <h1 className="text-2xl md:text-4xl font-black leading-tight tracking-tight text-white drop-shadow-sm">
                    {event.title}
                  </h1>
                  
                  <p className="text-xs text-indigo-100 flex items-center space-x-1.5">
                    <span>Hosted by:</span>
                    <span className="font-extrabold text-white underline decoration-indigo-400">
                      {event.organizer?.full_name || 'Organizer Partner'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Countdown Ticker Bar (Engagement feature) */}
              {!timeLeft.live && (
                <div className="bg-slate-900 text-white px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
                  <div className="flex items-center space-x-2 text-indigo-400 font-bold shrink-0">
                    <Clock className="w-4.5 h-4.5 animate-pulse" />
                    <span>LAUNCH COUNTDOWN :</span>
                  </div>

                  <div className="flex items-center space-x-4 font-mono text-center font-bold text-xs sm:text-sm">
                    <div>
                      <span className="bg-white/10 px-2.5 py-1 rounded-md text-slate-100 text-sm font-black inline-block">{String(timeLeft.days).padStart(2, '0')}</span>
                      <span className="block text-[8px] text-slate-400 uppercase mt-0.5 font-sans">Days</span>
                    </div>
                    <div>
                      <span className="bg-white/10 px-2.5 py-1 rounded-md text-slate-100 text-sm font-black inline-block">{String(timeLeft.hours).padStart(2, '0')}</span>
                      <span className="block text-[8px] text-slate-400 uppercase mt-0.5 font-sans">Hours</span>
                    </div>
                    <div>
                      <span className="bg-white/10 px-2.5 py-1 rounded-md text-slate-100 text-sm font-black inline-block">{String(timeLeft.minutes).padStart(2, '0')}</span>
                      <span className="block text-[8px] text-slate-400 uppercase mt-0.5 font-sans">Mins</span>
                    </div>
                    <div>
                      <span className="bg-white/10 px-2.5 py-1 rounded-md text-slate-100 text-sm font-black inline-block text-amber-400">{String(timeLeft.seconds).padStart(2, '0')}</span>
                      <span className="block text-[8px] text-slate-450 uppercase mt-0.5 font-sans">Secs</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Event Summary Grid */}
              <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4 border-b border-slate-100 text-slate-705 bg-slate-50/20">
                <div className="flex items-center space-x-2.5">
                  <Calendar className="w-5 h-5 text-indigo-500 shrink-0" />
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-slate-400 leading-none">Schedule Time</h4>
                    <span className="text-xs font-bold leading-normal block mt-1">{formatDate(event.event_date)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5">
                  <MapPin className="w-5 h-5 text-indigo-500 shrink-0" />
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-slate-400 leading-none">Venue location</h4>
                    <span className="text-xs font-bold leading-normal block mt-1 truncate max-w-[150px]">{event.location || 'Online / Zoom'}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 col-span-2 md:col-span-1 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                  <Users className="w-5 h-5 text-indigo-500 shrink-0" />
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-slate-400 leading-none">Reservations Fill</h4>
                    <span className="text-xs font-bold leading-normal block mt-1">
                      {event.registration_count || 0} / {event.capacity === 0 ? 'Unlimited' : event.capacity} filled
                    </span>
                  </div>
                </div>
              </div>

              {/* Synopsis Details Area */}
              <div className="p-6 space-y-3">
                <h3 className="font-extrabold text-slate-900 text-base">Event Synopsis</h3>
                <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap select-all font-medium">
                  {event.description || 'No detailed specifications have been published for this event.'}
                </div>
              </div>
            </div>

            {/* EVENT AGENDA TIMELINE (Phase 6 requirement) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-3xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <NotebookText className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-900 text-base">Chronological Agenda Timeline</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400">Chronicle map</span>
              </div>

              <div className="space-y-6">
                {eventAgendaData.map((item: any, idx: number) => (
                  <div key={idx} className="relative flex items-start pl-6 md:pl-8 group">
                    {/* Vertical link line indicator */}
                    {idx !== eventAgendaData.length - 1 && (
                      <div className="absolute left-2 md:left-2.5 top-6 bottom-[-16px] w-[2px] bg-indigo-100 group-hover:bg-indigo-200 transition" />
                    )}
                    
                    {/* Tick ball */}
                    <div className="absolute left-0.5 md:left-1 top-1.5 w-3 h-3 bg-indigo-600 rounded-full border-2 border-white ring-4 ring-indigo-50" />

                    <div className="space-y-1">
                      <span className="text-xs font-mono font-extrabold text-indigo-650 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                        {item.time}
                      </span>
                      <h4 className="font-black text-slate-900 text-sm">{item.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* HOST & SPEAKERS SECTION (Phase 6 requirement) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-3xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-900 text-base">Speakers & Facilitators Spotlight</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400">Registry profiles</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {eventSpeakersData.map((sp: any, idx: number) => (
                  <div key={idx} className="p-4 border border-slate-150 rounded-2xl bg-slate-50/40 flex items-center space-x-4">
                    <img
                      src={sp.img}
                      alt={sp.name}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-250/50"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-800 text-sm truncate">{sp.name}</h4>
                      <p className="text-xs text-indigo-650 font-bold truncate">{sp.role}</p>
                      <p className="text-[10px] text-slate-405 font-semibold truncate">{sp.company}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COLLAPSIBLE FAQ ACCORDION (Phase 6 requirement) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-900 text-base">Frequently Asked Questions</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-405">Answers</span>
              </div>

              <div className="space-y-3.5 divide-y divide-slate-100">
                {eventFaqsData.map((faq: any, idx: number) => (
                  <div key={idx} className={`pt-3.5 ${idx === 0 ? 'pt-0' : ''}`}>
                    <h4 className="font-extrabold text-slate-905 text-sm flex items-start gap-1.5 text-left">
                      <span className="text-indigo-600 font-black">Q:</span>
                      <span>{faq.q}</span>
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold pl-4.5 mt-1 text-left">
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* POLICY AND POLICIES SECTION (Phase 6 requirement) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-900 text-base">Host & Venue Policies</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-405">Code bounds</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                {eventPoliciesData.map((pol: any, idx: number) => (
                  <div key={idx} className="p-4 bg-indigo-50/15 border border-indigo-100/30 rounded-xl space-y-1.5 flex flex-col justify-between">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-tight">{pol.title}</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">{pol.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* REVIEWS FEEDBACK SECTION */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-3xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <h3 className="font-extrabold text-slate-800 text-base">Attendee Reviews</h3>
                </div>
                {averageRating && (
                  <div className="flex items-center space-x-1 bg-amber-50 text-amber-805 px-2.5 py-0.5 border border-amber-250 text-xs font-bold rounded-md">
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
                        
                        <div className="flex space-x-0.5 animate-pulse">
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

                      <p className="text-xs text-slate-600 leading-normal pl-8 italic font-semibold">
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

            {/* SIMILAR EVENTS RECOMMENDATION STRIP (Phase 6 requirement) */}
            {similarEvents.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 text-base">Similar Events You May Access</h3>
                  <Link to="/events" className="text-xs font-bold text-indigo-600 flex items-center space-x-0.5 hover:underline">
                    <span>Explore more</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {similarEvents.map((sim: any) => (
                    <div
                      key={sim.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs hover:border-indigo-200 transition duration-300 overflow-hidden flex flex-col justify-between"
                    >
                      <div className="h-28 bg-slate-100 overflow-hidden relative">
                        {sim.image_url ? (
                          <img
                            src={sim.image_url}
                            alt={sim.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                            ES
                          </div>
                        )}
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs rounded-md text-[10px] font-extrabold text-white">
                          {formatPrice(sim.price)}
                        </span>
                      </div>

                      <div className="p-3.5 space-y-2 flex-grow flex flex-col justify-between">
                        <div>
                          <Link to={`/events/${sim.id}`} className="font-extrabold text-slate-900 block truncate text-xs hover:text-indigo-600">
                            {sim.title}
                          </Link>
                          <p className="text-[10px] text-slate-400 font-semibold">{formatDate(sim.event_date)}</p>
                        </div>
                        
                        <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-50 mt-2">
                          <span className="truncate text-slate-405">{sim.location || 'Online'}</span>
                          <Link to={`/events/${sim.id}`} className="font-black text-indigo-600 flex items-center space-x-0.5 hover:underline shrink-0">
                            <span>Book</span>
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

          {/* Right Sidebar: Dynamic registration triggers AND AI utilities */}
          <div className="space-y-6">
            
            {/* REGISTRATION BLOCK CARD */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-center space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight border-b border-slate-50 pb-2 flex items-center justify-between">
                <span>Pass Reservation</span>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                  Single seat
                </span>
              </h3>

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-xl text-xs font-semibold text-center flex items-center justify-between space-x-1.5">
                  <div className="flex items-center space-x-1.5 text-left">
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

              {profile && profile.id === event.organizer_id ? (
                <div className="p-4 bg-indigo-50/70 border border-indigo-100/50 rounded-2xl text-indigo-900 flex flex-col items-center space-y-3">
                  <ShieldAlert className="w-8 h-8 text-indigo-600 shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-xs text-center leading-normal">Event Host Mode</h4>
                    <p className="text-[10px] text-indigo-650 mt-1 font-semibold leading-relaxed">
                      You are the organizer/host of this event. Spot bookings are limited to public attendees since your host seat is preserved.
                    </p>
                  </div>
                </div>
              ) : isRegistered ? (
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
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Spread the word</span>
                  <button 
                    onClick={handleDownloadICS}
                    className="inline-flex items-center space-x-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Add to Calendar</span>
                  </button>
                </div>
                
                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={handleCopyShareLink}
                    className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-700 text-xs font-bold transition cursor-pointer"
                  >
                    {shareCopied ? (
                      <>
                        <CopyCheck className="w-4 h-4 text-emerald-650" />
                        <span className="text-emerald-705">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Share Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ORGANIZER PROFILE WIDGET (Phase 6 requirement) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-left">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Organizer Profile</h4>
              
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 bg-indigo-550 text-white rounded-xl flex items-center justify-center font-black text-base border border-indigo-150 relative">
                  {event.organizer?.full_name ? event.organizer.full_name.substring(0, 2).toUpperCase() : 'ES'}
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-slate-900 text-sm truncate">{event.organizer?.full_name || 'Spark Host Agent'}</h4>
                  <p className="text-[10.5px] text-slate-500 font-semibold uppercase leading-none mt-1">Verified organizer</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="block font-black text-slate-800">4.9★</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Satisfaction</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="block font-black text-slate-800">22+</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Hosted Events</span>
                </div>
              </div>
            </div>

            {/* AI COPILOT INTERACTIVE EXPERIENCES */}
            <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 p-5 rounded-2xl text-white shadow-md space-y-5">
              <div className="flex items-center space-x-2 border-b border-indigo-400/10 pb-3">
                <Sparkles className="w-5 h-5 text-indigo-400 fill-current animate-pulse shrink-0" />
                <h3 className="font-black tracking-tight text-xs uppercase text-indigo-300">Gemini AI Event Assistant</h3>
              </div>

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

              <div className="border-t border-indigo-400/10 pt-4 space-y-3.5">
                <div className="flex items-center space-x-2 text-indigo-300">
                  <MessageSquareCode className="w-4 h-4 text-indigo-400 shrink-0" />
                  <h4 className="text-xs font-bold">Ask about this Event</h4>
                </div>

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
                    <div className="flex items-center space-x-2 text-indigo-355 p-2 bg-white/5 rounded-lg mr-6">
                      <Loader className="w-3 h-3 animate-spin" />
                      <span>Gemini is modeling thoughts...</span>
                    </div>
                  )}
                </div>

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
      )}
    </div>
  );
}
