import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';

export interface Notification {
  id: string;
  user_id: string;
  type: 'organizer_booking' | 'attendee_new_event';
  title: string;
  message: string;
  event_id: string;
  is_read: boolean;
  created_at: string;
  metadata?: {
    attendee_name?: string;
    event_name?: string;
    tickets_count?: number;
    booking_time?: string;
    event_title?: string;
    event_date?: string;
    venue?: string;
    description?: string;
    recipient_email?: string;
  };
}

export function useNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailEnabled, setEmailEnabled] = useState<boolean>(() => {
    return localStorage.getItem('event-spark-email-notifications') !== 'false';
  });

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (fetchErr) {
        // Fallback to local storage if table doesn't exist in Supabase yet
        if (fetchErr.message?.includes('does not exist') || fetchErr.message?.includes('relation')) {
          const lKey = `mock_notifications`;
          const localData = JSON.parse(localStorage.getItem(lKey) || '[]');
          const parsed = localData.filter((item: any) => item.user_id === profile.id)
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setNotifications(parsed);
        } else {
          throw fetchErr;
        }
      } else {
        setNotifications(data || []);
      }
    } catch (err: any) {
      console.warn('Failed to fetch notifications, trying local storage:', err.message);
      const localData = JSON.parse(localStorage.getItem('mock_notifications') || '[]');
      const parsed = localData.filter((item: any) => item.user_id === profile.id)
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotifications(parsed);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // Mark a single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!profile) return;
    try {
      const { error: patchErr } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (patchErr) {
        // Fallback
        const localData = JSON.parse(localStorage.getItem('mock_notifications') || '[]');
        const updated = localData.map((item: any) => 
          item.id === notificationId ? { ...item, is_read: true } : item
        );
        localStorage.setItem('mock_notifications', JSON.stringify(updated));
      }
      
      setNotifications(prev => 
        prev.map(item => item.id === notificationId ? { ...item, is_read: true } : item)
      );
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err.message);
    }
  }, [profile]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!profile) return;
    try {
      const { error: patchErr } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id);

      if (patchErr) {
        const localData = JSON.parse(localStorage.getItem('mock_notifications') || '[]');
        const updated = localData.map((item: any) => 
          item.user_id === profile.id ? { ...item, is_read: true } : item
        );
        localStorage.setItem('mock_notifications', JSON.stringify(updated));
      }

      setNotifications(prev => prev.map(item => ({ ...item, is_read: true })));
    } catch (err: any) {
      console.error('Failed to mark all as read:', err.message);
    }
  }, [profile]);

  // Clear all notifications
  const clearNotifications = useCallback(async () => {
    if (!profile) return;
    try {
      const { error: deleteErr } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', profile.id);

      if (deleteErr) {
        const localData = JSON.parse(localStorage.getItem('mock_notifications') || '[]');
        const rest = localData.filter((item: any) => item.user_id !== profile.id);
        localStorage.setItem('mock_notifications', JSON.stringify(rest));
      }

      setNotifications([]);
    } catch (err: any) {
      console.error('Failed to clear notifications:', err.message);
    }
  }, [profile]);

  // Add notification to database and trigger broadcast
  const sendNotification = useCallback(async (nData: Omit<Notification, 'id' | 'is_read' | 'created_at'>) => {
    const newNotification: Notification = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'notif-' + Math.random().toString(36).slice(2, 11),
      is_read: false,
      created_at: new Date().toISOString(),
      ...nData
    };

    try {
      // 1. Store in database
      const { error: insertErr } = await supabase
        .from('notifications')
        .insert(newNotification);

      if (insertErr) {
        // Fallback to mock storage
        const localData = JSON.parse(localStorage.getItem('mock_notifications') || '[]');
        localData.push(newNotification);
        localStorage.setItem('mock_notifications', JSON.stringify(localData));
      }

      // 2. Broadcast inside the server SSE stream
      await fetch('/api/notifications/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newNotification,
          emailEnabled // Send whether the recipient/sender prefers mock emails dispatching
        })
      });
    } catch (err: any) {
      console.warn('Notify broadcast failure: ', err.message);
    }
  }, [emailEnabled]);

  // Toggle emails preference
  const toggleEmailEnabled = useCallback(() => {
    const nextVal = !emailEnabled;
    setEmailEnabled(nextVal);
    localStorage.setItem('event-spark-email-notifications', String(nextVal));
  }, [emailEnabled]);

  // Real-time subscription hook
  useEffect(() => {
    if (!profile) return;

    fetchNotifications();

    // Setup Server-Sent Events client
    const eventSource = new EventSource(`/api/notifications/subscribe?userId=${profile.id}`);

    eventSource.onopen = () => {
      console.log(`SSE notification path connected for user ${profile.id}`);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') return;

        console.log('Real-time notification socket event received:', data);
        
        // Check if recipient matches or matches everyone (broadcast for attendee)
        if (data.user_id === profile.id) {
          // Prepend to list in state
          setNotifications(prev => {
            // Guard duplicate reads of the exact same ID
            if (prev.some(notif => notif.id === data.id)) return prev;
            return [data, ...prev];
          });

          // Dispatch visual browser notification chime/audio
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
            audio.volume = 0.35;
            audio.play().catch(() => {});
          } catch (ae) {}
        }
      } catch (err) {
        console.error('Error parsing SSE event data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE subscription error or timeout (will auto-reconnect):', err);
    };

    return () => {
      eventSource.close();
    };
  }, [profile, fetchNotifications]);

  const unreadCount = notifications.filter(item => !item.is_read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    emailEnabled,
    toggleEmailEnabled,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    sendNotification
  };
}
