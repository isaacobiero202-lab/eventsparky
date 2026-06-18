import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { StatsCards } from '../components/dashboard/StatsCards';
import { ChartSection } from '../components/dashboard/ChartSection';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Users, Calendar, ClipboardCheck, BarChart3, AlertTriangle, Sparkles } from 'lucide-react';

export function AdminAnalytics() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errorObj, setErrorObj] = useState<string | null>(null);

  // Stats Counters
  const [userCount, setUserCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [regCount, setRegCount] = useState(0);

  // Chart structures
  const [registrationTrend, setRegistrationTrend] = useState<{ date: string; count: number }[]>([]);
  const [popularEvents, setPopularEvents] = useState<{ name: string; count: number }[]>([]);

  const loadAdminMetrics = async () => {
    setLoading(true);
    setErrorObj(null);
    try {
      // 1. Fetch counters
      const [usersRes, eventsRes, regsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('events').select('id', { count: 'exact' }),
        supabase.from('registrations').select('id', { count: 'exact' }),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (regsRes.error) throw regsRes.error;

      setUserCount(usersRes.count || 0);
      setEventCount(eventsRes.count || 0);
      setRegCount(regsRes.count || 0);

      // 2. Fetch popular events (events joined with registrations)
      const { data: popularData, error: popErr } = await supabase
        .from('events')
        .select(`
          id,
          title,
          registrations(id, status)
        `);

      if (popErr) throw popErr;

      const formattedPopular = (popularData || [])
        .map((ev: any) => {
          const activeRegs = ev.registrations?.filter((r: any) => r.status === 'registered') || [];
          return {
            name: ev.title,
            count: activeRegs.length,
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // top 5 only

      setPopularEvents(formattedPopular);

      // 3. Fetch registration trend for last 7 days
      const { data: trendData, error: trendErr } = await supabase
        .from('registrations')
        .select('registered_at, status')
        .eq('status', 'registered')
        .order('registered_at', { ascending: true });

      if (trendErr) throw trendErr;

      // Group by daily dates (last 7 days list)
      const dailyMap: Record<string, number> = {};
      const today = new Date();
      
      // Initialize daily keys in map for last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyMap[dateKey] = 0;
      }

      // Populate daily keys
      (trendData || []).forEach((r: any) => {
        if (!r.registered_at) return;
        const d = new Date(r.registered_at);
        const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dateKey in dailyMap) {
          dailyMap[dateKey] += 1;
        }
      });

      const formattedTrend = Object.keys(dailyMap).map((key) => ({
        date: key,
        count: dailyMap[key],
      }));

      setRegistrationTrend(formattedTrend);

    } catch (err: any) {
      console.error('Error loading admin analytics:', err);
      setErrorObj(err.message || 'database tables query exception. Check if tables exist.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadAdminMetrics();
    }
  }, [profile]);

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-2" />
        <h2 className="text-xl font-bold text-slate-800">Unauthorised Access</h2>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Only system administrators possess the credentials to enter the admin metrics panel.
        </p>
      </div>
    );
  }

  const statCardsData = [
    {
      label: 'Platform Users',
      value: userCount,
      icon: Users,
      color: 'bg-indigo-600',
      description: 'Total registered profile rows'
    },
    {
      label: 'Hosting Events',
      value: eventCount,
      icon: Calendar,
      color: 'bg-emerald-500',
      description: 'Active/Archived event specifications'
    },
    {
      label: 'Reservations Issued',
      value: regCount,
      icon: ClipboardCheck,
      color: 'bg-amber-500',
      description: 'Completed registrations'
    },
  ];

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center space-x-1 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest bg-slate-900 text-indigo-300 border border-indigo-400/20 rounded-md">
          <Sparkles className="w-3 h-3 fill-current text-indigo-400" />
          <span>Super Admin Operations Panel</span>
        </div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mt-2 flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-indigo-600 animate-pulse" />
          System Analytics & Auditing
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Real-time cross-database telemetry logs, popular assemblies, and global platform registration velocity charts
        </p>
      </div>

      {loading ? (
        <LoadingSpinner size="large" />
      ) : errorObj ? (
        <div className="p-5 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl font-medium text-xs max-w-lg mx-auto flex flex-col items-center text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-600" />
          <div>
            <span className="font-extrabold block text-sm">Supabase tables are not instantiated yet!</span>
            <span className="leading-relaxed mt-1 block">To operationalize this analytics panel, please check your database setup. Create the profiles, events, and registrations tables in your Supabase project query runner first.</span>
          </div>
        </div>
      ) : (
        <>
          {/* STATS COUNT */}
          <StatsCards stats={statCardsData} />

          {/* CHARTS CONTAINER */}
          <ChartSection
            registrationTrendData={registrationTrend}
            popularEventsData={popularEvents}
          />
        </>
      )}
    </div>
  );
}
