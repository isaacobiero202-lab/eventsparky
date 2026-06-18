import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEvents } from '../hooks/useEvents';
import { useRegistrations } from '../hooks/useRegistrations';
import { StatsCards } from '../components/dashboard/StatsCards';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AICopilotSidebar } from '../components/dashboard/AICopilotSidebar';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { formatDate, formatPrice } from '../utils/formatDate';
import { 
  Users, 
  Calendar, 
  ClipboardCheck, 
  Sparkles, 
  PlusCircle, 
  ArrowRight, 
  MapPin, 
  Trash2, 
  BadgeHelp,
  BarChart2
} from 'lucide-react';

export function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { getEvents, deleteEvent, loading: eventsLoading } = useEvents();
  const { getRegistrationsByUser, cancelRegistration, loading: regLoading } = useRegistrations();

  const [orgEvents, setOrgEvents] = useState<any[]>([]);
  const [attRegistrations, setAttRegistrations] = useState<any[]>([]);

  const loadDashboardData = async () => {
    if (!profile) return;

    if (profile.role === 'admin') {
      navigate('/admin-analytics', { replace: true });
      return;
    }

    if (profile.role === 'organizer') {
      const list = await getEvents({ organizerId: profile.id });
      setOrgEvents(list);
    } else if (profile.role === 'attendee') {
      const list = await getRegistrationsByUser(profile.id);
      setAttRegistrations(list);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [profile]);

  const handleCancel = async (regId: string) => {
    if (confirm('Are you sure you want to cancel your registration for this event?')) {
      try {
        await cancelRegistration(regId);
        await loadDashboardData();
      } catch (err) {
        console.error('Cancel action failed:', err);
      }
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (confirm('Are you sure you want to delete this event? This will erase all registrars.')) {
      try {
        await deleteEvent(id);
        await loadDashboardData();
      } catch (err) {
        console.error('Delete event action failed:', err);
      }
    }
  };

  const handleGenerateReport = async (eventTitle: string, eventId: string) => {
    try {
      // Simulate CSV file download containing registrant trail data
      const headers = 'ID,Full Name,Email,Registered At,Status\n';
      const rows = `mock-reg-1,John Doe,user@eventspark.com,${new Date().toISOString()},registered\n`;
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `${eventTitle.toLowerCase().replace(/\s+/g, '_')}_registrants_report.csv`);
      a.click();

      // Log report generation activity
      if (profile) {
        const reportLog = {
          id: crypto.randomUUID ? crypto.randomUUID() : 'log-' + Math.random().toString(36).slice(2, 11),
          user_id: profile.id,
          user_name: profile.full_name,
          user_role: profile.role || 'organizer',
          activity_type: 'report_generation',
          description: `Generated download report for "${eventTitle}"`,
          related_event_id: eventId,
          created_at: new Date().toISOString()
        };

        const { supabase } = await import('../services/supabase');
        try {
          await supabase.from('activity_logs').insert(reportLog);
        } catch (err) {}
        
        const localLogs = JSON.parse(localStorage.getItem('mock_activity_logs') || '[]');
        localLogs.push(reportLog);
        localStorage.setItem('mock_activity_logs', JSON.stringify(localLogs));

        await fetch('/api/activity-logs/emit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reportLog)
        }).catch(() => {});
      }

      alert(`Report generated successfully for "${eventTitle}"!`);
    } catch (err: any) {
      console.error('Report simulation failed:', err);
    }
  };

  if (!profile) {
    return <LoadingSpinner size="large" />;
  }

  // Calculate statistics for Organizer Profile
  const organizerStats = [
    {
      label: 'Hosting Events',
      value: orgEvents.length,
      icon: Calendar,
      color: 'bg-indigo-600',
      description: 'Total events created'
    },
    {
      label: 'Total Registrants',
      value: orgEvents.reduce((acc, curr) => acc + (curr.registration_count || 0), 0),
      icon: Users,
      color: 'bg-emerald-500',
      description: 'Across all hosted schedules'
    },
    {
      label: 'Gross Est. Revenue',
      value: formatPrice(orgEvents.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.registration_count || 0)), 0)),
      icon: ClipboardCheck,
      color: 'bg-amber-500',
      description: 'Estimated standard ticket sales'
    }
  ];

  // Calculate statistics for Attendee Profile
  const activeAttendeeRegs = attRegistrations.filter(r => r.status === 'registered');
  const attendeeStats = [
    {
      label: 'Registered Events',
      value: activeAttendeeRegs.length,
      icon: ClipboardCheck,
      color: 'bg-indigo-600',
      description: 'Upcoming scheduled slots'
    },
    {
      label: 'Cancelled Registrations',
      value: attRegistrations.filter(r => r.status === 'cancelled').length,
      icon: Users,
      color: 'bg-rose-500',
      description: 'Past cancelled events'
    },
    {
      label: 'Free Events Booked',
      value: activeAttendeeRegs.filter(r => (r.event?.price || 0) === 0).length,
      icon: Calendar,
      color: 'bg-emerald-500',
      description: 'Complementary workshop tickets'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Dashboard Greetings Header banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-indigo-500/10 blur-3xl rounded-full" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 rounded-md">
              <Sparkles className="w-3 h-3 fill-current" />
              <span>Workspace Control Panel ({profile.role})</span>
            </div>
            <h1 className="text-3xl font-black mt-2 leading-tight">
              Hello, {profile.full_name || 'Event planner'}!
            </h1>
            <p className="text-sm text-indigo-200 mt-1.5 max-w-lg leading-relaxed">
              Track registration analytics, browse events, and launch Gemini AI tools directly from this page.
            </p>
          </div>

          <div className="shrink-0 flex flex-wrap gap-3">
            {profile.role === 'organizer' && (
              <Link
                to="/create-event"
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white text-indigo-900 border border-slate-100 rounded-xl font-bold text-xs hover:bg-slate-50 transition shadow-xs"
              >
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                <span>Launch Project Creation</span>
              </Link>
            )}
            <Link
              to="/events"
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700/95 rounded-xl font-bold text-xs transition shadow-xs"
            >
              <span>Explore Marketplace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {eventsLoading || regLoading ? (
        <LoadingSpinner size="medium" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Primary Dashboard */}
          <div className="lg:col-span-2 space-y-8">
            {/* STATS SECTION */}
            {profile.role === 'organizer' && <StatsCards stats={organizerStats} />}
            {profile.role === 'attendee' && <StatsCards stats={attendeeStats} />}

            {/* MAIN PANELS AND TABLES */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            {profile.role === 'organizer' ? (
              // Organizer Events Owned Grid
              <div>
                <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
                  <h2 className="font-extrabold text-slate-800 text-base">Your Created Events</h2>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md">
                    Total: {orgEvents.length} items
                  </span>
                </div>

                {orgEvents.length === 0 ? (
                  <div className="py-12 text-center max-w-sm mx-auto">
                    <BadgeHelp className="w-12 h-12 text-indigo-500/80 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-800">No events published</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      You haven't designed or hosted any events yet. Open our planner form to design your first Event!
                    </p>
                    <Link
                      to="/create-event"
                      className="mt-4 inline-flex items-center space-x-1 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Create New Event</span>
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase">
                          <th className="py-3 px-4">Event Info</th>
                          <th className="py-3 px-4">Date / Venue</th>
                          <th className="py-3 px-4">Registrants</th>
                          <th className="py-3 px-4">Price</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                        {orgEvents.map((ev) => (
                          <tr key={ev.id} className="hover:bg-slate-50/50 transition duration-150">
                            <td className="py-3 px-4 flex items-center space-x-3.5">
                              {ev.image_url ? (
                                <img
                                  src={ev.image_url}
                                  alt={ev.title}
                                  className="w-10 h-10 rounded-md object-cover border border-slate-100"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-md flex items-center justify-center font-bold text-xs border border-indigo-100">
                                  ES
                                </div>
                              )}
                              <div className="truncate max-w-[180px]">
                                <Link to={`/events/${ev.id}`} className="font-bold text-slate-500 hover:text-indigo-600 truncate block">
                                  {ev.title}
                                </Link>
                                <span className="text-[10px] text-slate-400 leading-none">ID: {ev.id.slice(0,8)}...</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-700 text-xs">{formatDate(ev.event_date)}</div>
                              <div className="text-[10px] text-slate-400 font-medium flex items-center space-x-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-350 shrink-0" />
                                <span className="truncate max-w-[120px]">{ev.location}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100/30">
                                {ev.registration_count || 0} / {ev.capacity === 0 ? '∞' : ev.capacity}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs font-extrabold text-slate-900">
                              {formatPrice(ev.price)}
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              <Link
                                to={`/events/${ev.id}`}
                                className="text-xs font-bold text-indigo-600 hover:underline"
                              >
                                View
                              </Link>
                              <Link
                                to={`/edit-event/${ev.id}`}
                                className="text-xs font-bold text-slate-500 hover:text-indigo-600 pl-2 border-l border-slate-200"
                              >
                                Edit
                              </Link>
                              <button
                                onClick={() => handleDeleteEvent(ev.id)}
                                className="text-xs font-bold text-rose-500 hover:text-rose-700 pl-2 border-l border-slate-200 cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => handleGenerateReport(ev.title, ev.id)}
                                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 pl-2 border-l border-slate-200 cursor-pointer"
                                title="Export complete audit trail as CSV"
                              >
                                Report
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              // Attendee Registrations Grid (or MyRegistrations shortcut)
              <div>
                <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
                  <h2 className="font-extrabold text-slate-800 text-base">Your Active Registrations</h2>
                  <Link
                    to="/my-registrations"
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center space-x-0.5"
                  >
                    <span>View All History</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {activeAttendeeRegs.length === 0 ? (
                  <div className="py-12 text-center max-w-sm mx-auto">
                    <ClipboardCheck className="w-12 h-12 text-indigo-500/80 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-800">No active reservations</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      You are not attending any upcoming events! Browse the Event Spark marketplace to reserve your spot.
                    </p>
                    <Link
                      to="/events"
                      className="mt-4 inline-flex items-center space-x-1 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition"
                    >
                      <span>Explore Marketplace</span>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {activeAttendeeRegs.map((reg) => (
                      <div
                        key={reg.id}
                        className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-white hover:shadow-xs hover:border-slate-200 transition duration-200 flex space-x-4 items-start"
                      >
                        {reg.event?.image_url ? (
                          <img
                            src={reg.event.image_url}
                            alt={reg.event.title}
                            className="w-16 h-16 rounded-lg object-cover shrink-0 border border-slate-100"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-black text-sm shrink-0 border border-indigo-100">
                            ES
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/events/${reg.event?.id}`}
                            className="font-extrabold text-sm text-slate-800 hover:text-indigo-600 block truncate"
                          >
                            {reg.event?.title || 'Unknown Event'}
                          </Link>
                          
                          <p className="text-xs text-slate-500 leading-normal mt-0.5">
                            {formatDate(reg.event?.event_date)}
                          </p>

                          <div className="text-[10px] text-slate-400 font-medium flex items-center space-x-1 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-350" />
                            <span className="truncate">{reg.event?.location || 'Venue TBD'}</span>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <span className="inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100/30">
                              Reserved ({formatPrice(reg.event?.price || 0)})
                            </span>

                            <button
                              onClick={() => handleCancel(reg.id)}
                              className="text-[10px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              Cancel Reservation
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Dynamic Real-time Recent Activity Log Feed */}
            <RecentActivity />
          </div>

        </div>

        {/* Right Column: AI Co-Pilot & Insights */}
        <div className="lg:col-span-1">
          <AICopilotSidebar />
        </div>
      </div>
      )}
    </div>
  );
}
