import { useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Registration, Feedback } from '../types';
import { useAuth } from './useAuth';

/**
 * Custom hook for managing event registrations and feedback / reviews.
 * Includes client-side safety guards such as capacity bounds checking.
 */
export function useRegistrations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  /**
   * Registers the current logged-in user for an event, checks capacity and duplicates
   */
  const registerForEvent = useCallback(async (eventId: string): Promise<boolean> => {
    if (!profile) throw new Error('You must be signed in to register for events');
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch event capacity details and active registrations
      const { data: event, error: eventErr } = await supabase
        .from('events')
        .select('title, organizer_id, capacity, registrations(id, status)')
        .eq('id', eventId)
        .single();

      if (eventErr) throw eventErr;

      const activeRegs = event.registrations?.filter((r: any) => r.status === 'registered') || [];
      const capacity = event.capacity || 0;

      // 2. Perform capacity check if capacity > 0
      if (capacity > 0 && activeRegs.length >= capacity) {
        throw new Error('This event is already full! No more registrations allowed.');
      }

      // 3. Check for an existing registration (including cancelled ones) for this user and event
      const { data: existingReg, error: findErr } = await supabase
        .from('registrations')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (findErr) throw findErr;

      let regErr;
      if (existingReg) {
        if (existingReg.status === 'registered') {
          throw new Error('You are already registered for this event.');
        }
        // Update the existing registration back to 'registered'
        const { error: updateErr } = await supabase
          .from('registrations')
          .update({
            status: 'registered',
            registered_at: new Date().toISOString()
          })
          .eq('id', existingReg.id);
        regErr = updateErr;
      } else {
        // Insert a new token/registration record
        const { error: insertErr } = await supabase
          .from('registrations')
          .insert({
            event_id: eventId,
            user_id: profile.id,
            status: 'registered',
            registered_at: new Date().toISOString()
          });
        regErr = insertErr;
      }

      if (regErr) {
        if (regErr.code === '23505') {
          throw new Error('You are already registered for this event.');
        }
        throw regErr;
      }

      // Generate instant organizer notification
      try {
        const { data: orgProfile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', event.organizer_id)
          .single();

        const organizerEmail = orgProfile?.email || 'organizer@eventspark.com';

        const newNotif = {
          id: crypto.randomUUID ? crypto.randomUUID() : 'notif-' + Math.random().toString(36).slice(2, 11),
          user_id: event.organizer_id,
          type: 'organizer_booking',
          title: 'New Ticket Booking! 🎟️',
          message: `${profile.full_name} has successfully registered a ticket for "${event.title}".`,
          event_id: eventId,
          is_read: false,
          created_at: new Date().toISOString(),
          metadata: {
            attendee_name: profile.full_name,
            event_name: event.title,
            tickets_count: 1,
            booking_time: new Date().toLocaleString(),
            recipient_email: organizerEmail
          }
        };

        // Insert into DB
        await supabase.from('notifications').insert(newNotif);

        // Broadcast real-time SSE notification
        const emailPref = localStorage.getItem('event-spark-email-notifications') !== 'false';
        await fetch('/api/notifications/emit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newNotif,
            emailEnabled: emailPref
          })
        });

        // Add secure activity logs & broadcast real-time status
        try {
          const registrationLog = {
            id: crypto.randomUUID ? crypto.randomUUID() : 'log-' + Math.random().toString(36).slice(2, 11),
            user_id: profile.id,
            user_name: profile.full_name,
            user_role: 'attendee',
            activity_type: 'booking',
            description: `${profile.full_name} registered for ${event.title}`,
            related_event_id: eventId,
            created_at: new Date().toISOString()
          };

          const paymentLog = {
            id: crypto.randomUUID ? crypto.randomUUID() : 'log-' + Math.random().toString(36).slice(2, 11),
            user_id: profile.id,
            user_name: profile.full_name,
            user_role: 'attendee',
            activity_type: 'payment',
            description: `Payment confirmed for ${event.title}`,
            related_event_id: eventId,
            created_at: new Date().toISOString()
          };

          // Insert into Supabase (if table exists, else fallback to mock storage)
          const { error: dbL1 } = await supabase.from('activity_logs').insert([registrationLog, paymentLog]);
          if (dbL1) {
            const localLogs = JSON.parse(localStorage.getItem('mock_activity_logs') || '[]');
            localLogs.push(registrationLog, paymentLog);
            localStorage.setItem('mock_activity_logs', JSON.stringify(localLogs));
          }

          // Broadcast registration log to organizer & attendee live Dashboard SSE streams
          await fetch('/api/activity-logs/emit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...registrationLog,
              target_organizer_id: event.organizer_id
            })
          }).catch(() => {});

          // Broadcast payment log to organizer & attendee live Dashboard SSE streams
          await fetch('/api/activity-logs/emit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...paymentLog,
              target_organizer_id: event.organizer_id
            })
          }).catch(() => {});

        } catch (logErr: any) {
          console.warn('Could not launch registration activity logs stream:', logErr.message);
        }

      } catch (notifErr: any) {
        console.warn('Failed to send real-time notification to organizer:', notifErr.message);
      }

      return true;
    } catch (err: any) {
      console.error('Registration failed:', err.message);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [profile]);

  /**
   * Cancels/deregisters from a registered event (either soft-updates status or deletes)
   */
  const cancelRegistration = useCallback(async (registrationId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const { error: cancelErr } = await supabase
        .from('registrations')
        .update({ status: 'cancelled' })
        .eq('id', registrationId);

      if (cancelErr) throw cancelErr;
      return true;
    } catch (err: any) {
      console.error('Cancel registration failed:', err.message);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Checks if the active user is registered for a specific event
   */
  const checkUserRegistration = useCallback(async (eventId: string, userId: string): Promise<Registration | null> => {
    try {
      const { data, error: checkErr } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('status', 'registered')
        .maybeSingle();

      if (checkErr) return null;
      return data as Registration;
    } catch {
      return null;
    }
  }, []);

  /**
   * Fetches registrations belonging to a specific user id
   */
  const getRegistrationsByUser = useCallback(async (userId: string): Promise<Registration[]> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('registrations')
        .select(`
          *,
          event:events(*, organizer:profiles(*))
        `)
        .eq('user_id', userId)
        .order('registered_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      return (data || []) as Registration[];
    } catch (err: any) {
      console.error('Fetch user registrations error:', err.message);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetches registrations registered to a specific event
   */
  const getRegistrationsByEvent = useCallback(async (eventId: string): Promise<Registration[]> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('registrations')
        .select(`
          *,
          user_profile:profiles(*)
        `)
        .eq('event_id', eventId);

      if (fetchErr) throw fetchErr;
      return (data || []) as Registration[];
    } catch (err: any) {
      console.error('Fetch event registrations error:', err.message);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Adds feedback (rating & comment review) for an event
   */
  const addFeedback = useCallback(async (eventId: string, rating: number, comment: string): Promise<Feedback> => {
    if (!profile) throw new Error('Must be signed in to leave reviews');
    setLoading(true);
    setError(null);
    try {
      const { data, error: feedErr } = await supabase
        .from('feedback')
        .insert({
          event_id: eventId,
          user_id: profile.id,
          rating,
          comment
        })
        .select()
        .single();

      if (feedErr) throw feedErr;
      return data as Feedback;
    } catch (err: any) {
      console.error('Leave review failed:', err.message);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [profile]);

  /**
   * Fetches reviews/feedback left on a specific event
   */
  const getFeedbackByEvent = useCallback(async (eventId: string): Promise<Feedback[]> => {
    try {
      const { data, error: feedErr } = await supabase
        .from('feedback')
        .select(`
          *,
          user_profile:profiles(*)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (feedErr) throw feedErr;
      return (data || []) as Feedback[];
    } catch (err: any) {
      console.error('Fetch feedback exception:', err.message);
      return [];
    }
  }, []);

  return {
    loading,
    error,
    registerForEvent,
    cancelRegistration,
    checkUserRegistration,
    getRegistrationsByUser,
    getRegistrationsByEvent,
    addFeedback,
    getFeedbackByEvent
  };
}
