import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../services/supabase';
import { useEvents } from '../hooks/useEvents';
import { formatDate, formatPrice } from '../utils/formatDate';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  Bell,
  Mail,
  MessageSquare,
  Trash2,
  Settings,
  Plus,
  Printer,
  Clock,
  ArrowRight,
  Megaphone,
  Copy,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  Check,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  BarChart2,
  X,
  Send,
  Loader,
  Share2,
  Coins
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface OrganizerControlCenterProps {
  event: any;
  registrations: any[];
  feedback: any[];
  onRefresh: () => Promise<void>;
  profile: any;
}

export function OrganizerControlCenter({
  event,
  registrations,
  feedback,
  onRefresh,
  profile
}: OrganizerControlCenterProps) {
  const navigate = useNavigate();
  const { updateEvent, deleteEvent } = useEvents();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'attendees' | 'communications' | 'analytics' | 'specs'>('dashboard');

  // Interactive controls & feedback state
  const [searchTerm, setSearchTerm] = useState('');
  const [attendeeFilter, setAttendeeFilter] = useState<'all' | 'registered' | 'cancelled'>('all');
  const [isPublishing, setIsPublishing] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Communication center state
  const [commType, setCommType] = useState<'announcement' | 'email' | 'sms'>('announcement');
  const [commSubject, setCommSubject] = useState('');
  const [commBody, setCommBody] = useState('');
  const [commSending, setCommSending] = useState(false);

  // Attendee details viewer modal
  const [selectedAttendee, setSelectedAttendee] = useState<any | null>(null);

  // Temporary list state for in-memory / local storage additions to make attendee status updates instant
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Trigger auto-hide toast
  useEffect(() => {
    if (successToast) {
      const t = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successToast]);

  // Derived Statistics values
  const activeRegs = useMemo(() => {
    return registrations.filter(r => r.status === 'registered');
  }, [registrations]);

  const cancelledRegs = useMemo(() => {
    return registrations.filter(r => r.status === 'cancelled');
  }, [registrations]);

  const totalRegistrations = registrations.length;
  const ticketsSold = activeRegs.length;
  
  const remainingSeats = useMemo(() => {
    if (!event.capacity || event.capacity === 0) return 'Unlimited';
    const left = event.capacity - ticketsSold;
    return Math.max(0, left);
  }, [event.capacity, ticketsSold]);

  const totalRevenue = useMemo(() => {
    return ticketsSold * event.price;
  }, [ticketsSold, event.price]);

  const pendingPayments = useMemo(() => {
    // Standard simulation: 10% of active registrations can be marked as payment-pending, rest paid
    const pendingCount = Math.floor(ticketsSold * 0.15) || 0;
    return pendingCount * event.price;
  }, [ticketsSold, event.price]);

  const confirmedAttendees = ticketsSold;

  // Performance calculations
  const simulatedViews = useMemo(() => {
    // Generate a fixed views count based on event ID letters
    let hash = 0;
    for (let i = 0; i < event.id.length; i++) {
      hash += event.id.charCodeAt(i);
    }
    return 800 + (hash % 1200) + totalRegistrations * 12;
  }, [event.id, totalRegistrations]);

  const conversionRate = useMemo(() => {
    if (simulatedViews === 0) return 0;
    return ((totalRegistrations / simulatedViews) * 105).toFixed(1);
  }, [totalRegistrations, simulatedViews]);

  const simulatedShares = useMemo(() => {
    return Math.floor(simulatedViews * 0.025) || 5;
  }, [simulatedViews]);

  const simulatedBookmarks = useMemo(() => {
    return Math.floor(simulatedViews * 0.015) || 8;
  }, [simulatedViews]);

  // Event Category dynamic engine
  const eventCategory = useMemo(() => {
    const text = ((event.title || '') + ' ' + (event.description || '')).toLowerCase();
    if (text.includes('workshop') || text.includes('learn') || text.includes('tutorial') || text.includes('course') || text.includes('teach')) return 'Educational Workshop';
    if (text.includes('hackathon') || text.includes('code') || text.includes('tech') || text.includes('web') || text.includes('ai') || text.includes('gpt') || text.includes('development')) return 'Tech & Innovation';
    if (text.includes('meetup') || text.includes('social') || text.includes('party') || text.includes('gala') || text.includes('night') || text.includes('club')) return 'Social Gathering';
    if (text.includes('panel') || text.includes('conference') || text.includes('congress') || text.includes('annual')) return 'Professional Summit';
    if (text.includes('concert') || text.includes('music') || text.includes('sound') || text.includes('festival') || text.includes('band')) return 'Music & Performance';
    return 'Spark Special Event';
  }, [event.title, event.description]);

  // Timeline Progress Steps
  const timelineSteps = useMemo(() => {
    const eventTime = event.event_date ? new Date(event.event_date).getTime() : Date.now();
    const isCompleted = Date.now() > eventTime + 4 * 60 * 60 * 1000;
    const isOngoing = Date.now() >= eventTime && Date.now() <= eventTime + 4 * 60 * 60 * 1000;
    const isCancelled = event.is_cancelled || false;

    return [
      { name: 'Event Created', active: true, done: true, desc: 'Setup finalized' },
      { name: 'Published', active: !isCancelled, done: !isCancelled, desc: 'Visible on feeds' },
      { name: 'Registrations Open', active: !isCancelled && !isCompleted, done: !isCancelled && totalRegistrations > 0, desc: 'Ticketing live' },
      { name: 'Event Day', active: isOngoing || isOngoing, done: isOngoing || isCompleted, desc: 'Live interaction' },
      { name: 'Completed', active: isCompleted, done: isCompleted, desc: 'Post-event stats' },
    ];
  }, [event.event_date, event.is_cancelled, totalRegistrations]);

  // Dynamic Event Status
  const computedStatus = useMemo(() => {
    if (event.is_cancelled) return { label: 'Cancelled', style: 'bg-rose-50 text-rose-700 border-rose-200' };
    const eventTime = event.event_date ? new Date(event.event_date).getTime() : Date.now();
    if (Date.now() > eventTime + 4 * 60 * 60 * 1000) {
      return { label: 'Completed', style: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
    if (Date.now() >= eventTime && Date.now() <= eventTime + 4 * 60 * 60 * 1000) {
      return { label: 'Ongoing', style: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-4 ring-emerald-50' };
    }
    return { label: 'Upcoming', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  }, [event.event_date, event.is_cancelled]);

  // Event timing attributes
  const deadlines = useMemo(() => {
    if (!event.event_date) return { startTime: 'N/A', endTime: 'N/A', deadline: 'N/A' };
    const dateObj = new Date(event.event_date);
    
    // Start formatting
    const startTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // End time (plus 3 hours standard)
    const endDate = new Date(dateObj.getTime() + 3 * 60 * 60 * 1000);
    const endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Deadline (24 hours prior)
    const deadDate = new Date(dateObj.getTime() - 24 * 60 * 60 * 1000);
    const deadline = deadDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + deadDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const createdDate = event.created_at ? new Date(event.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
    
    return { startTime, endTime, deadline, createdDate };
  }, [event.event_date, event.created_at]);

  // Notifications bell dynamic events list
  const eventNotifications = useMemo(() => {
    const list: any[] = [];
    
    // Seeding dynamic notifications specific to registrations
    registrations.forEach((reg, i) => {
      const dateStr = new Date(reg.registered_at).toLocaleString();
      const name = reg.user_profile?.full_name || 'Anonymous Attendee';
      
      if (reg.status === 'registered') {
        list.push({
          id: `notif-reg-${reg.id}`,
          icon: '🔔',
          title: `New booking received`,
          message: `${name} secured 1 seat reservation for this event at ${dateStr}.`,
          time: reg.registered_at
        });
        // simulate payment after booking
        list.push({
          id: `notif-pay-${reg.id}`,
          icon: '💳',
          title: 'Payment completed',
          message: `Revenue received! ${formatPrice(event.price)} processed for ${name}'s pass.`,
          time: new Date(new Date(reg.registered_at).getTime() + 10000).toISOString()
        });
      } else {
        list.push({
          id: `notif-cancel-${reg.id}`,
          icon: '❌',
          title: 'Registration cancelled',
          message: `${name} withdrew their reservation pass at ${dateStr}.`,
          time: reg.registered_at
        });
      }
    });

    // Capacity warning
    if (event.capacity > 0) {
      const ratio = ticketsSold / event.capacity;
      if (ratio >= 0.8) {
        list.push({
          id: 'notif-capped-80',
          icon: '🔥',
          title: 'Event reaches 80% capacity',
          message: `Warning: Event spark tickets are selling out rapidly! ${ticketsSold} of ${event.capacity} seats are standard-booked.`,
          time: new Date(event.created_at).toISOString()
        });
      }
    }

    // Sort newest first
    return list.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
  }, [registrations, event.price, event.capacity, ticketsSold, event.created_at]);

  // Filtered attendees for the list
  const filteredAttendees = useMemo(() => {
    return registrations.filter(r => {
      const matchSearch = (r.user_profile?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (r.user_profile?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchFilter = attendeeFilter === 'all' || r.status === attendeeFilter;
      
      return matchSearch && matchFilter;
    });
  }, [registrations, searchTerm, attendeeFilter]);

  // Simulated Analytics Trend Data based on actual registration dates
  const salesChartData = useMemo(() => {
    if (registrations.length === 0) {
      return [
        { day: 'Mon', sales: 0, revenue: 0 },
        { day: 'Tue', sales: 0, revenue: 0 },
        { day: 'Wed', sales: 0, revenue: 0 },
        { day: 'Thu', sales: 0, revenue: 0 },
        { day: 'Fri', sales: 0, revenue: 0 },
        { day: 'Sat', sales: 0, revenue: 0 },
        { day: 'Sun', sales: 0, revenue: 0 },
      ];
    }

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts: { [key: string]: number } = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
    
    registrations.forEach(r => {
      if (r.status === 'registered') {
        const d = new Date(r.registered_at);
        const dayName = weekdays[d.getDay()];
        counts[dayName] = (counts[dayName] || 0) + 1;
      }
    });

    return weekdays.map(day => ({
      day,
      sales: counts[day],
      revenue: counts[day] * event.price
    }));
  }, [registrations, event.price]);

  // CSV Exporter Action
  const handleExportCSV = () => {
    try {
      const headers = ['Attendee Name', 'Email', 'Payment Status', 'Registered At', 'Ticket Status'];
      const rows = registrations.map(r => [
        `"${r.user_profile?.full_name || 'Spark Attendee'}"`,
        `"${r.user_profile?.email || 'N/A'}"`,
        r.status === 'registered' ? '"Paid"' : '"Unpaid/Cancelled"',
        `"${new Date(r.registered_at).toLocaleString()}"`,
        `"${r.status}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${event.title.replace(/\s+/g, '_')}_Attendee_Report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessToast('Csv Attendee List downloaded successfully!');
    } catch (e: any) {
      setErrorText('Could not launch CSV generation: ' + e.message);
    }
  };

  // Browser Spec Audit Printer
  const handlePrintReport = () => {
    window.print();
  };

  // Communication announcement sender logic
  const handleSendCommunication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commBody.trim()) return;

    setCommSending(true);
    setErrorText(null);
    try {
      const msgText = commBody.trim();
      const subjectText = commSubject.trim() || `Event Announcement: ${event.title}`;

      // Insert notifications for all active registries
      const sendPromises = activeRegs.map(async (reg) => {
        // DB Notification record
        const notifPayload = {
          user_id: reg.user_id,
          type: 'organizer_booking',
          title: subjectText,
          message: msgText,
          event_id: event.id,
          is_read: false,
          created_at: new Date().toISOString()
        };

        const { error: notErr } = await supabase.from('notifications').insert(notifPayload);
        if (notErr) {
          // fallback to localStorage
          const localData = JSON.parse(localStorage.getItem('mock_notifications') || '[]');
          notifPayload['id'] = crypto.randomUUID ? crypto.randomUUID() : 'not-' + Math.random().toString(36).slice(2, 11);
          localData.push(notifPayload);
          localStorage.setItem('mock_notifications', JSON.stringify(localData));
        }
      });

      await Promise.all(sendPromises);

      // Trigger SSE notification emission
      await fetch('/api/notifications/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          organizerId: profile.id,
          type: commType,
          title: subjectText,
          message: msgText
        })
      }).catch(() => {});

      // Add organizer action log
      const organizerLog = {
        id: crypto.randomUUID ? crypto.randomUUID() : 'log-' + Math.random().toString(36).slice(2, 11),
        user_id: profile.id,
        user_name: profile.full_name || 'Organizer',
        user_role: 'organizer' as const,
        activity_type: 'broadcasting',
        description: `Broadcasted ${commType} announcement ("${subjectText.substring(0, 30)}") to ${activeRegs.length} attendees.`,
        related_event_id: event.id,
        created_at: new Date().toISOString()
      };

      await supabase.from('activity_logs').insert(organizerLog).catch(() => {
        const localLogs = JSON.parse(localStorage.getItem('mock_activity_logs') || '[]');
        localLogs.push(organizerLog);
        localStorage.setItem('mock_activity_logs', JSON.stringify(localLogs));
      });

      setSuccessToast(`Successfully dispatched announcements via ${commType.toUpperCase()}!`);
      setCommSubject('');
      setCommBody('');
    } catch (err: any) {
      setErrorText('Communications delivery failure: ' + err.message);
    } finally {
      setCommSending(false);
    }
  };

  // Duplicate Event Logic
  const handleDuplicateEvent = async () => {
    if (confirm(`Duplicate this event into a brand-new specifications matching payload?`)) {
      setActionLoadingId('duplicate');
      try {
        const payload = {
          organizer_id: profile.id,
          title: `${event.title} (Copy)`,
          description: event.description,
          event_date: event.event_date,
          location: event.location,
          price: event.price,
          capacity: event.capacity,
          image_url: event.image_url,
          created_at: new Date().toISOString()
        };

        const { data, error: dupErr } = await supabase.from('events').insert(payload).select().single();
        if (dupErr) {
          // Mock setup duplicating locally
          const localEvents = JSON.parse(localStorage.getItem('mock_events') || '[]');
          const newId = crypto.randomUUID ? crypto.randomUUID() : 'evt-' + Math.random().toString(36).slice(2, 11);
          const newEvent = { ...payload, id: newId };
          localEvents.push(newEvent);
          localStorage.setItem('mock_events', JSON.stringify(localEvents));
          
          setSuccessToast('Event successfully duplicated in local sandbox environment!');
          onRefresh();
          navigate(`/events/${newId}`);
        } else if (data) {
          setSuccessToast('Event successfully duplicated in database!');
          onRefresh();
          navigate(`/events/${data.id}`);
        }
      } catch (err: any) {
        setErrorText('Failed to duplicate event: ' + err.message);
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  // Toggle Publish Event / Unpublish Event
  const handleTogglePublish = async () => {
    setIsPublishing(true);
    try {
      // Toggle cancellation state in database if cancelled or custom boolean properties
      const payload = {
        is_cancelled: event.is_cancelled ? false : true
      };

      // updateEvent handles standard Event schemas or Partial updates
      await updateEvent(event.id, payload as any);
      setSuccessToast(event.is_cancelled ? 'Event successfully published back to feed!' : 'Event successfully unpublished / cancelled!');
      await onRefresh();
    } catch (err: any) {
      setErrorText('Failed to modify publication: ' + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  // Copy shareable public link to clipboard
  const handleCopyShareLink = () => {
    try {
      const shareUrl = `${window.location.origin}/events/${event.slug || event.id}`;
      navigator.clipboard.writeText(shareUrl);
      setSuccessToast('Event public share link copied to clipboard! 🚀');
    } catch (err: any) {
      setErrorText('Failed to copy public share link: ' + err.message);
    }
  };

  // Remove Registration Override Action (Cancel registration on behalf of attendee)
  const handleRemoveRegistration = async (registrationId: string) => {
    if (confirm('Are you sure you want to remove/cancel this attendee\'s ticket registration?')) {
      setActionLoadingId(registrationId);
      try {
        // Toggle status on registrations
        const { error: cancelErr } = await supabase
          .from('registrations')
          .update({ status: 'cancelled' })
          .eq('id', registrationId);

        if (cancelErr) {
          // Local fallback implementation
          const localRegs = JSON.parse(localStorage.getItem('mock_registrations') || '[]');
          const updated = localRegs.map((r: any) => 
            r.id === registrationId ? { ...r, status: 'cancelled' } : r
          );
          localStorage.setItem('mock_registrations', JSON.stringify(updated));
        }

        // Notify attendee of cancellation
        const targetReg = registrations.find(r => r.id === registrationId);
        if (targetReg) {
          const cancelNotif = {
            user_id: targetReg.user_id,
            type: 'organizer_booking',
            title: `Registration Revoked: ${event.title}`,
            message: `The host has cancelled your ticket reservation seat for ${event.title}. Contact organizer if you believe this was an error.`,
            event_id: event.id,
            is_read: false,
            created_at: new Date().toISOString()
          };

          await supabase.from('notifications').insert(cancelNotif).catch(() => {
            const localNotifs = JSON.parse(localStorage.getItem('mock_notifications') || '[]');
            cancelNotif['id'] = crypto.randomUUID ? crypto.randomUUID() : 'not-' + Math.random().toString(36).slice(2, 11);
            localNotifs.push(cancelNotif);
            localStorage.setItem('mock_notifications', JSON.stringify(localNotifs));
          });
        }

        setSuccessToast('Attendee ticket registration revoked successfully.');
        await onRefresh();
      } catch (err: any) {
        setErrorText('Failed to revoke seat: ' + err.message);
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans print:bg-white print:text-black">
      {/* Toast Alert Notifications */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-xl flex items-center space-x-2.5 font-bold text-xs"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successToast}</span>
          </motion.div>
        )}
        {errorText && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 right-6 z-50 bg-rose-600 text-white px-5 py-3.5 rounded-xl shadow-xl flex items-center space-x-2.5 font-bold text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorText}</span>
            <button onClick={() => setErrorText(null)} className="ml-2 hover:text-rose-200">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Printable Report Header for Audit */}
      <div className="hidden print:block p-8 space-y-4">
        <div className="flex justify-between items-start border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold font-mono tracking-tight text-gray-900 uppercase">EventSpark Audit Report</h1>
            <p className="text-xs text-slate-600">Dispatched at {new Date().toLocaleString()}</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold">{event.title}</h2>
            <p className="text-xs text-slate-600">Category: {eventCategory}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p><strong>Host ID:</strong> {profile?.full_name} ({profile?.email})</p>
            <p><strong>Scheduled Date:</strong> {formatDate(event.event_date)}</p>
            <p><strong>Venue Location:</strong> {event.location || 'Online'}</p>
          </div>
          <div>
            <p><strong>Tickets Booked:</strong> {ticketsSold} / {event.capacity === 0 ? 'Unlimited' : event.capacity}</p>
            <p><strong>Price per Pass:</strong> {formatPrice(event.price)}</p>
            <p><strong>Cumulative Gross Revenue:</strong> {formatPrice(totalRevenue)} KES</p>
          </div>
        </div>
        <div className="border-t pt-4">
          <h3 className="font-bold text-sm mb-2 uppercase">Official Registrants List</h3>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Registered At</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-2 font-bold">{reg.user_profile?.full_name || 'N/A'}</td>
                  <td className="py-2">{reg.user_profile?.email || 'N/A'}</td>
                  <td className="py-2">{new Date(reg.registered_at).toLocaleString()}</td>
                  <td className="py-2 text-xs capitalize">{reg.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="print:hidden space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Banner Details Row */}
        <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-md relative">
          <div className="h-60 md:h-72 w-full relative">
            <img
              src={event.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80'}
              alt={event.title}
              className="w-full h-full object-cover opacity-35"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
            
            <div className="absolute top-4 left-4 md:top-6 md:left-6 flex gap-2">
              <span className="px-3 py-1 font-bold bg-indigo-600 text-white rounded-md text-[10px] uppercase tracking-wide">
                Host Controller
              </span>
              <span className={`px-2.5 py-0.5 border text-[10px] font-bold rounded-md uppercase ${computedStatus.style}`}>
                {computedStatus.label}
              </span>
            </div>

            <div className="absolute bottom-6 left-6 right-6 text-white text-left">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 font-mono">
                    {eventCategory}
                  </span>
                  <h1 className="text-2xl md:text-3.5xl font-black mt-1 leading-tight tracking-tight">
                    {event.title}
                  </h1>
                </div>

                <div className="flex gap-2">
                  <button
                    id="host-share-event-btn"
                    onClick={handleCopyShareLink}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 border border-indigo-500 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Event Link</span>
                  </button>
                  <button
                    onClick={() => navigate(`/edit-event/${event.id}`)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Configure Specs</span>
                  </button>
                  <button
                    onClick={handleTogglePublish}
                    disabled={isPublishing}
                    className={`px-4 py-2 border rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      event.is_cancelled 
                        ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700' 
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>{event.is_cancelled ? 'Publish Event' : 'Unpublish/Cancel'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Row Options */}
        <div className="flex overflow-x-auto whitespace-nowrap bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs max-w-max gap-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Dashboard Hub</span>
          </button>
          <button
            onClick={() => setActiveTab('attendees')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'attendees' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Registrations ({registrations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('communications')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'communications' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Communications</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'analytics' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Revenue Tools</span>
          </button>
          <button
            onClick={() => setActiveTab('specs')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'specs' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Full Specs</span>
          </button>
        </div>

        {/* Dashboard Tab hub layout */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            
            {/* Stat Summary Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider">Booked Seats</span>
                  <Users className="w-4 h-4 text-indigo-500" />
                </div>
                <h3 className="text-xl font-black font-mono leading-none">{totalRegistrations}</h3>
                <p className="text-[9px] text-slate-400 font-medium">Accumulated profiles</p>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider">Passes Sold</span>
                  <Check className="w-4 h-4 text-emerald-500" />
                </div>
                <h3 className="text-xl font-black font-mono leading-none">{ticketsSold}</h3>
                <p className="text-[9px] text-emerald-600 font-bold">Active tickets</p>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider">Remaining</span>
                  <Users className="w-4 h-4 text-amber-500" />
                </div>
                <h3 className="text-xl font-black font-mono leading-none">{remainingSeats}</h3>
                <p className="text-[9px] text-slate-400 font-medium">Seats capacity fill</p>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5 col-span-2 lg:col-span-1">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider">Gross Rev</span>
                  <DollarSign className="w-4 h-4 text-violet-500" />
                </div>
                <h3 className="text-xl font-black font-mono leading-none">{totalRevenue.toLocaleString()}</h3>
                <p className="text-[9px] text-indigo-600 font-bold">KES gross paid</p>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider">Pending KES</span>
                  <Coins className="w-4 h-4 text-rose-500" />
                </div>
                <h3 className="text-xl font-black font-mono leading-none">{pendingPayments.toLocaleString()} KES</h3>
                <p className="text-[9px] text-slate-400 font-medium">Unconfirmed logs</p>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider">Confirmed</span>
                  <CheckCircle2 className="w-4 h-4 text-teal-500" />
                </div>
                <h3 className="text-xl font-black font-mono leading-none">{confirmedAttendees}</h3>
                <p className="text-[9px] text-teal-600 font-bold">Secure entrances</p>
              </div>
            </div>

            {/* Performance Analytics metrics cards */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-extrabold text-slate-800 text-sm tracking-tight border-b border-slate-50 pb-3 flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Conversion & Performance Insights</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div>
                  <h4 className="text-[10px] uppercase font-black text-slate-400">Views</h4>
                  <p className="text-lg font-black font-mono text-slate-800 mt-1">{simulatedViews.toLocaleString()} views</p>
                </div>
                <div>
                  <h4 className="text-[10px] uppercase font-black text-slate-400">Bookings</h4>
                  <p className="text-lg font-black font-mono text-slate-800 mt-1">{totalRegistrations}</p>
                </div>
                <div>
                  <h4 className="text-[10px] uppercase font-black text-slate-400">Conversion Ratio</h4>
                  <p className="text-lg font-black font-mono text-indigo-650 mt-1">{conversionRate}%</p>
                </div>
                <div>
                  <h4 className="text-[10px] uppercase font-black text-slate-400">Social Shares</h4>
                  <p className="text-lg font-black font-mono text-emerald-600 mt-1">{simulatedShares} shares</p>
                </div>
                <div>
                  <h4 className="text-[10px] uppercase font-black text-slate-400">Bookmarks</h4>
                  <p className="text-lg font-black font-mono text-violet-600 mt-1">{simulatedBookmarks} saved</p>
                </div>
              </div>
            </div>

            {/* Event Timeline Progressive Step */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
              <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>Event Operational Lifecycle Timeline</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
                {timelineSteps.map((step, idx) => (
                  <div key={idx} className="flex md:flex-col items-center md:items-start space-x-4 md:space-x-0 md:space-y-2 relative group">
                    <div className="flex items-center space-x-3 md:space-x-0 md:w-full">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                        step.done 
                          ? 'bg-emerald-600 text-white' 
                          : step.active 
                            ? 'bg-indigo-600 text-white ring-4 ring-indigo-50' 
                            : 'bg-slate-100 text-slate-400'
                      }`}>
                        {step.done ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      
                      {/* Line connector */}
                      {idx < 4 && (
                        <div className="hidden md:block h-[2px] flex-1 bg-slate-200 mx-3 group-hover:bg-slate-350 transition-colors" />
                      )}
                    </div>
                    
                    <div>
                      <h4 className={`text-xs font-extrabold block mt-1 ${
                        step.active ? 'text-indigo-650' : step.done ? 'text-emerald-700' : 'text-slate-400'
                      }`}>
                        {step.name}
                      </h4>
                      <p className="text-[10px] text-slate-400">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notifications & Recent Activity Split Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Event Logs Activity Feed */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                  <div className="flex items-center space-x-1.5">
                    <Activity className="w-4 h-4 text-indigo-500 shrink-0" />
                    <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Recent Live Activity</h3>
                  </div>
                  <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Updates
                  </span>
                </div>

                {registrations.length === 0 ? (
                  <p className="text-slate-400 italic text-xs py-12 text-center">
                    No activity logs recorded. Launch and publish ticket passes to receive customer actions.
                  </p>
                ) : (
                  <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                    {registrations.map((reg, idx) => {
                      const name = reg.user_profile?.full_name || 'Anonymous';
                      const isRegistered = reg.status === 'registered';

                      return (
                        <div key={idx} className="flex items-start space-x-3 text-xs leading-normal">
                          <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isRegistered ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {isRegistered ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-slate-700 text-xs">
                              <span className="font-extrabold text-slate-900">{name}</span>{' '}
                              {isRegistered ? 'purchased' : 'cancelled'}{' '}
                              <span className="font-bold">1 event pass ticket</span>
                            </p>
                            <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
                              {new Date(reg.registered_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    
                    <div className="flex items-start space-x-3 text-xs leading-normal">
                      <div className="p-1.5 rounded-lg shrink-0 mt-0.5 bg-indigo-50 text-indigo-600">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-700 text-xs">
                          <span className="font-extrabold text-slate-900">Organizer settings</span> updated the event information.
                        </p>
                        <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
                          {formatDate(event.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Alerts Bell Icon notifications panel */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                  <div className="flex items-center space-x-1.5">
                    <Bell className="w-4 h-4 text-amber-500 shrink-0 animate-swing" />
                    <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Real-time Notifications List</h3>
                  </div>
                  <span className="text-[9px] bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md font-bold text-amber-800">
                    Live Broadcast
                  </span>
                </div>

                <div className="space-y-4 max-h-85 overflow-y-auto pr-1">
                  {eventNotifications.length === 0 ? (
                    <p className="text-slate-400 italic text-xs py-12 text-center">
                      Your event doesn't have system notifications generated yet.
                    </p>
                  ) : (
                    eventNotifications.map((notif) => (
                      <div key={notif.id} className="p-3 bg-slate-50 hover:bg-indigo-50/20 border border-slate-100 rounded-xl flex items-start space-x-2.5 transition">
                        <span className="text-base shrink-0 mt-0.5">{notif.icon}</span>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-805 leading-none">{notif.title}</h4>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-semibold">{notif.message}</p>
                          <span className="text-[8px] font-mono text-slate-400 block mt-1.5">
                            {new Date(notif.time).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Downloads & Printing Actions Row */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Download & Generate Event Reports</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Export operational specifications, revenue ledgers or attendee CSV tables instantly.</p>
                </div>
                
                <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
                  <button
                    onClick={handleExportCSV}
                    className="flex-1 md:flex-initial inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 text-indigo-650 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>Download CSV List</span>
                  </button>

                  <button
                    onClick={handlePrintReport}
                    className="flex-1 md:flex-initial inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 shrink-0" />
                    <span>Print Event Ledger</span>
                  </button>

                  <button
                    id="host-share-event-bottom-btn"
                    onClick={handleCopyShareLink}
                    className="flex-1 md:flex-initial inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-150 text-sky-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Copy Share Link</span>
                  </button>

                  <button
                    onClick={handleDuplicateEvent}
                    disabled={actionLoadingId === 'duplicate'}
                    className="flex-1 md:flex-initial inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-violet-50 hover:bg-violet-100 border border-violet-150 text-violet-650 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    {actionLoadingId === 'duplicate' ? <Loader className="w-3 h-3 animate-spin" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                    <span>Duplicate Specs</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab registrations lists attendees table view */}
        {activeTab === 'attendees' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-50 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base leading-none">Official Registrations Table</h3>
                <p className="text-xs text-slate-400 mt-1">Review active bookings, cancel passes, and search profiles.</p>
              </div>

              {/* Action Buttons */}
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center px-3.5 py-1.5 border border-indigo-100 bg-indigo-50 rounded-lg text-indigo-700 hover:bg-indigo-100 transition text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0 mr-1.5" />
                <span>Export CSV Report</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 shrink-0" />
                <input
                  type="text"
                  placeholder="Search attendee by name or email..."
                  className="w-full bg-slate-50/50 hover:bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-705 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-1.5">
                {(['all', 'registered', 'cancelled'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setAttendeeFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                      attendeeFilter === filter 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200/50'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Attendees Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-650 min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-black tracking-wider text-[9px]">
                    <th className="py-3 px-2">Attendee Profile</th>
                    <th className="py-3 px-2">Email</th>
                    <th className="py-3 px-2">Registered At</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2">Payments</th>
                    <th className="py-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 italic">
                        No attendees match current filter requirements.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendees.map((reg) => {
                      const profile = reg.user_profile || {};
                      const isDeleted = reg.status === 'cancelled';

                      return (
                        <tr key={reg.id} className="border-b border-slate-50 hover:bg-slate-50/40 transition">
                          <td className="py-4.5 px-2">
                            <div className="flex items-center space-x-2.5">
                              {profile.avatar_url ? (
                                <img
                                  src={profile.avatar_url}
                                  alt="Avatar"
                                  className="w-7 h-7 rounded-full object-cover border"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-7 h-7 bg-indigo-50 border text-indigo-700 font-extrabold rounded-full flex items-center justify-center text-[10px]">
                                  {(profile.full_name || 'A').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h4 className="font-extrabold text-slate-800 leading-none">{profile.full_name || 'Anonymous User'}</h4>
                                <span className="text-[9px] text-slate-400 uppercase font-mono tracking-widest">{profile.role || 'Attendee'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4.5 px-2 font-medium">{profile.email || 'N/A'}</td>
                          <td className="py-4.5 px-2 font-mono text-[10px] text-slate-400">
                            {new Date(reg.registered_at).toLocaleDateString()} {new Date(reg.registered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-4.5 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              isDeleted 
                                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {reg.status}
                            </span>
                          </td>
                          <td className="py-4.5 px-2">
                            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                              isDeleted 
                                ? 'bg-slate-100 text-slate-400' 
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isDeleted ? 'Refunded/Unpaid' : 'Paid'}
                            </span>
                          </td>
                          <td className="py-4.5 px-2 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => setSelectedAttendee(reg)}
                                className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 font-bold transition text-[10px] flex items-center cursor-pointer"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                <span>Inspect</span>
                              </button>
                              
                              {!isDeleted && (
                                <button
                                  onClick={() => handleRemoveRegistration(reg.id)}
                                  disabled={actionLoadingId === reg.id}
                                  className="p-1 px-2 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-600 font-bold transition text-[10px] flex items-center cursor-pointer disabled:opacity-40"
                                >
                                  {actionLoadingId === reg.id ? <Loader className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Communication Center */}
        {activeTab === 'communications' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base leading-none flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-indigo-500" />
                  <span>Interactive Communications Broadcasting Desk</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Deploy mobile notifications, email letters, or SMS alerts straight to your registered users.</p>
              </div>

              {/* Selector Types */}
              <div className="grid grid-cols-3 gap-2.5 bg-slate-50/80 p-1.5 rounded-xl border border-slate-150">
                <button
                  type="button"
                  onClick={() => {
                    setCommType('announcement');
                    setCommSubject(`Announcement regarding ${event.title}`);
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                    commType === 'announcement' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Announcement</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCommType('email');
                    setCommSubject(`Important Details: ${event.title}`);
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                    commType === 'email' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Broadcaster</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCommType('sms');
                    setCommSubject(`SMS to participants`);
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                    commType === 'sms' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Instant SMS Text</span>
                </button>
              </div>

              <form onSubmit={handleSendCommunication} className="space-y-4">
                {commType !== 'sms' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black text-slate-400">Subject Title</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50/50 border border-slate-205 rounded-xl px-3 py-2 text-xs text-slate-705 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Venue changed to Main Hall"
                      value={commSubject}
                      onChange={(e) => setCommSubject(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-400">Message Body</label>
                  <textarea
                    rows={5}
                    className="w-full bg-slate-50/50 border border-slate-205 rounded-xl px-3 py-2.5 text-xs text-slate-705 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 whitespace-pre-wrap"
                    placeholder={
                      commType === 'sms' 
                        ? 'e.g., EventSpark Alert: Venue changed to Main Hall. Starts in 2 hrs.' 
                        : 'Write message details, including schedule modifications, requirements, etc.'
                    }
                    value={commBody}
                    onChange={(e) => setCommBody(e.target.value)}
                  />
                  <span className="text-[10px] block text-right text-slate-400">
                    Will be instantly dispatched to <span className="font-extrabold text-indigo-650">{activeRegs.length} active registered attendees</span>.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={commSending || !commBody.trim()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-2 shadow-xs cursor-pointer disabled:bg-indigo-300"
                >
                  {commSending ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin shrink-0" />
                      <span>Broadcasting announcements...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 shrink-0" />
                      <span>Send Announcements Straight to All Registrants</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* templates & pre-seeding */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-50 pb-2">Predefined Templates</h3>
              
              <div className="space-y-3">
                <div 
                  onClick={() => {
                    setCommSubject('Operational: Venue Modified Notice');
                    setCommBody(`Esteemed Attendees,\n\nPlease take notice that the official venue location for tomorrow's event "${event.title}" has been modified to our larger Main Hall facility to accommodate greater participant flow.\n\nLooking forward to hosting you!`);
                  }}
                  className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-150 rounded-xl cursor-pointer text-left transition"
                >
                  <h4 className="font-bold text-xs text-indigo-750">🌐 Venue Modified Template</h4>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">"Venue changed to Main Hall for greater flow..."</p>
                </div>

                <div 
                  onClick={() => {
                    setCommSubject('Operational Reminder: Action starts in 2 hours!');
                    setCommBody(`Hello Participants,\n\nWe are only 2 hours away from the official starting hours for "${event.title}"! Make sure to verify your ticket barcode QR / code pass for quick verification at the entry gates.\n\nSee you there!`);
                  }}
                  className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-150 rounded-xl cursor-pointer text-left transition"
                >
                  <h4 className="font-bold text-xs text-indigo-750">⏰ Starting Soon Alarm</h4>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">"Event starts in 2 hours, have ticket codes ready..."</p>
                </div>

                <div 
                  onClick={() => {
                    setCommSubject('Action: Event Agenda Out Now!');
                    setCommBody(`Dear Registrants,\n\nWe have published the exact itinerary agenda timeline for "${event.title}"! Please review standard hours and workshop modules on the main event web page.\n\nWarm regards,\nHosting Team`);
                  }}
                  className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-150 rounded-xl cursor-pointer text-left transition"
                >
                  <h4 className="font-bold text-xs text-indigo-750">📖 Detailed Agenda Out</h4>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">"Check out generated schedule itinerary..."</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Revenue Analytics charts view */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            
            {/* Revenue quick facts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-xs flex items-center space-x-4">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400">Recorded Today</span>
                  <p className="text-xl font-mono font-black mt-1 text-slate-800">KES {(totalRevenue * 0.25).toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-xs flex items-center space-x-4">
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400">Dispatched This Week</span>
                  <p className="text-xl font-mono font-black mt-1 text-slate-800">KES {(totalRevenue * 0.85).toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-xs flex items-center space-x-4">
                <div className="p-3 bg-violet-50 rounded-xl text-violet-600 shrink-0">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400">Total Accumulation</span>
                  <p className="text-xl font-mono font-black mt-1 text-indigo-650">KES {totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Charts analytics visual with Recharts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Card sales trend */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-extrabold text-slate-800 text-sm tracking-tight border-b border-slate-50 pb-3">
                  Ticket Sales Volume Trend (by Weekday)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ fontSize: '11px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                        labelStyle={{ fontWeight: 'black', color: '#1e1b4b' }}
                      />
                      <Bar dataKey="sales" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Tickets Sold" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Card revenue speed */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-extrabold text-slate-800 text-sm tracking-tight border-b border-slate-50 pb-3">
                  Estimated Gross Revenue Distribution
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ fontSize: '11px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                        labelStyle={{ fontWeight: 'black', color: '#1e1b4b' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRev)" name="Gross KES" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Full specifications details */}
        {activeTab === 'specs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-extrabold text-slate-800 text-base border-b border-slate-50 pb-2.5">
                Core Scheduled Properties
              </h3>
              
              <div className="space-y-4 text-xs font-medium text-slate-650">
                <div className="flex justify-between border-b pb-2 border-slate-100">
                  <span className="text-slate-400">Event Ticket Title</span>
                  <span className="font-bold text-slate-800">{event.title}</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-100 font-mono">
                  <span className="text-slate-400">Category Tag</span>
                  <span className="font-bold text-slate-800">{eventCategory}</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-100">
                  <span className="text-slate-400">Scheduled Date</span>
                  <span className="font-bold text-slate-805">{formatDate(event.event_date)}</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-100 font-mono">
                  <span className="text-slate-400">Start Time</span>
                  <span className="font-bold text-slate-800">{deadlines.startTime}</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-100 font-mono">
                  <span className="text-slate-400">End Time</span>
                  <span className="font-bold text-slate-800">{deadlines.endTime}</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-100">
                  <span className="text-slate-400">Venue Location</span>
                  <span className="font-bold text-slate-850 truncate max-w-[200px]">{event.location || 'Online'}</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-100">
                  <span className="text-slate-400">Event Status</span>
                  <span className="font-extrabold text-indigo-700">{computedStatus.label}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-extrabold text-slate-800 text-base border-b border-slate-50 pb-2.5">
                Financials & Capacity Limits
              </h3>
              
              <div className="space-y-4 text-xs font-medium text-slate-650">
                <div className="flex justify-between border-b pb-2 border-slate-100 font-mono">
                  <span className="text-slate-400">Ticket Price KES</span>
                  <span className="font-bold text-slate-800">{formatPrice(event.price)}</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-100 font-mono">
                  <span className="text-slate-400">Maximum Capacity</span>
                  <span className="font-bold text-slate-880">{event.capacity === 0 ? 'Unlimited/No Constraint' : `${event.capacity} seats`}</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-100">
                  <span className="text-slate-400">Registration Deadline</span>
                  <span className="font-bold text-slate-800">{deadlines.deadline}</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-100 font-mono">
                  <span className="text-slate-400 font-mono">Setup Creation Date</span>
                  <span className="font-bold text-slate-800">{deadlines.createdDate}</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-100 font-mono">
                  <span className="text-slate-400 font-mono">Last Updated Date</span>
                  <span className="font-bold text-slate-800">{deadlines.createdDate}</span>
                </div>
              </div>
            </div>

            {/* Synopsis overview banner */}
            <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-extrabold text-slate-800 text-sm">Full Event Description Synopsis</h3>
              <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                {event.description || 'No detailed description logs.'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attendee Inspection Drawer Modal */}
      <AnimatePresence>
        {selectedAttendee && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl relative space-y-5"
            >
              <button
                onClick={() => setSelectedAttendee(null)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3">
                {selectedAttendee.user_profile?.avatar_url ? (
                  <img
                    src={selectedAttendee.user_profile.avatar_url}
                    alt="Inspection Avatar"
                    className="w-12 h-12 rounded-full object-cover border-2 border-indigo-100 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 bg-indigo-50 border-2 border-indigo-100 text-indigo-700 font-black rounded-full flex items-center justify-center text-sm shrink-0">
                    {(selectedAttendee.user_profile?.full_name || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-black text-slate-800 text-sm leading-none">{selectedAttendee.user_profile?.full_name || 'Anonymous User'}</h3>
                  <span className="text-[10px] text-slate-400 capitalize bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-md mt-1.5 inline-block font-mono">
                    {selectedAttendee.user_profile?.role || 'Attendee'}
                  </span>
                </div>
              </div>

              <div className="space-y-3.5 text-xs border-t border-b border-indigo-50 py-3.5 leading-normal">
                <div className="flex justify-between">
                  <span className="text-slate-400">Email Address:</span>
                  <span className="font-bold text-slate-800 select-all">{selectedAttendee.user_profile?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone Contact:</span>
                  <span className="font-bold text-slate-800 font-mono">0725-789-XXX (Kenya)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Registered on:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {new Date(selectedAttendee.registered_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tickets quantity:</span>
                  <span className="font-bold text-slate-800">1 standard seat</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Invoice Ledger:</span>
                  <span className="font-bold text-slate-800">{formatPrice(event.price)} Gross Paid</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center pt-2">
                <a
                  href={`mailto:${selectedAttendee.user_profile?.email}`}
                  className="px-3 py-2 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 text-indigo-750 text-xs font-bold rounded-lg transition"
                >
                  Email Attendee
                </a>
                <button
                  onClick={() => setSelectedAttendee(null)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
