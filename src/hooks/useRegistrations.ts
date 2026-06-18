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
        .select('capacity, registrations(id, status)')
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
