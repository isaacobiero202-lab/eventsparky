import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { useEvents } from './useEvents';

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: 'organizer' | 'attendee' | 'admin';
  activity_type: 'registration' | 'booking' | 'creation' | 'update' | 'cancellation' | 'payment' | 'profile_update' | 'ticket_download' | 'report_generation' | 'reminder';
  description: string;
  related_event_id?: string;
  created_at: string;
}

export function useActivityLogs() {
  const { profile } = useAuth();
  const { getEvents } = useEvents();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // 1. In Organizer view, we want to fetch logs for their events OR things they did.
      // So let's fetch all events they organize first to get the ID filter.
      let hostedEventIds: string[] = [];
      if (profile.role === 'organizer') {
        const hosted = await getEvents({ organizerId: profile.id });
        hostedEventIds = hosted.map((e: any) => e.id);
      }

      // Check if real Supabase table works
      const { data, error: dbErr } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbErr) {
        // Fallback to localStorage mock logs if relation doesn't exist yet
        if (dbErr.message?.includes('does not exist') || dbErr.message?.includes('relation')) {
          const localData = JSON.parse(localStorage.getItem('mock_activity_logs') || '[]');
          
          let filtered = [];
          if (profile.role === 'organizer') {
            filtered = localData.filter((log: any) => 
              log.user_id === profile.id || 
              (log.related_event_id && hostedEventIds.includes(log.related_event_id))
            );
          } else {
            // attendee
            filtered = localData.filter((log: any) => log.user_id === profile.id);
          }

          filtered.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setLogs(filtered);
        } else {
          throw dbErr;
        }
      } else {
        // We have active Supabase database response.
        // Let's filter client-side or apply query criteria based on role
        let filtered = data || [];
        if (profile.role === 'organizer') {
          filtered = (data || []).filter((log: any) => 
            log.user_id === profile.id || 
            (log.related_event_id && hostedEventIds.includes(log.related_event_id))
          );
        } else if (profile.role === 'attendee') {
          filtered = (data || []).filter((log: any) => log.user_id === profile.id);
        }

        setLogs(filtered);
      }
    } catch (err: any) {
      console.warn('DB activity_logs retrieve failed, using local storage fallback:', err.message);
      // Fallback
      const localData = JSON.parse(localStorage.getItem('mock_activity_logs') || '[]');
      
      let filtered = [];
      if (profile.role === 'organizer') {
        // Get hosted event IDs to match
        const localEvents = JSON.parse(localStorage.getItem('mock_events') || '[]');
        const hostedIds = localEvents
          .filter((e: any) => e.organizer_id === profile.id)
          .map((e: any) => e.id);

        filtered = localData.filter((log: any) => 
          log.user_id === profile.id || 
          (log.related_event_id && hostedIds.includes(log.related_event_id))
        );
      } else {
        filtered = localData.filter((log: any) => log.user_id === profile.id);
      }

      filtered.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setLogs(filtered);
    } finally {
      setLoading(false);
    }
  }, [profile, getEvents]);

  // Insert a new log entry
  const addLog = useCallback(async (
    activityType: ActivityLog['activity_type'],
    description: string,
    relatedEventId?: string,
    targetOrganizerId?: string
  ) => {
    if (!profile) return;

    const newLog: ActivityLog = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'log-' + Math.random().toString(36).slice(2, 11),
      user_id: profile.id,
      user_name: profile.full_name || 'Event Spark User',
      user_role: profile.role as any,
      activity_type: activityType,
      description,
      related_event_id: relatedEventId,
      created_at: new Date().toISOString()
    };

    // 1. Save to DB
    try {
      const { error: dbErr } = await supabase.from('activity_logs').insert(newLog);
      if (dbErr) {
        // fallback to localStorage
        const localLogs = JSON.parse(localStorage.getItem('mock_activity_logs') || '[]');
        localLogs.push(newLog);
        localStorage.setItem('mock_activity_logs', JSON.stringify(localLogs));
      }
    } catch (err) {
      const localLogs = JSON.parse(localStorage.getItem('mock_activity_logs') || '[]');
      localLogs.push(newLog);
      localStorage.setItem('mock_activity_logs', JSON.stringify(localLogs));
    }

    // 2. Broadcast via SSE for real-time dashboard listeners
    try {
      await fetch('/api/activity-logs/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLog,
          target_organizer_id: targetOrganizerId
        })
      });
    } catch (err: any) {
      console.warn('Real-time log broadcast failed:', err.message);
    }
  }, [profile]);

  // Handle SSE live subscription
  useEffect(() => {
    if (!profile) return;

    fetchLogs();

    // Subscribe to SSE active emitter
    const eventSource = new EventSource(`/api/activity-logs/subscribe?userId=${profile.id}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') return;

        console.log('Real-time activity log received on SSE:', data);

        // Prepend to active state list
        setLogs(prev => {
          if (prev.some(log => log.id === data.id)) return prev;
          return [data, ...prev];
        });
      } catch (err) {
        console.error('Failed to parse incoming real-time activity:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [profile, fetchLogs]);

  return {
    logs,
    loading,
    error,
    addLog,
    refetchLogs: fetchLogs
  };
}
