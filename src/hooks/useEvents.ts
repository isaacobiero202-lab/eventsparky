import { useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Event } from '../types';
import { useAuth } from './useAuth';

/**
 * Custom hook for managing event-related actions in Supabase.
 * Governs fetching, creating, editing, deleting, and uploading poster images.
 */
export function useEvents() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  /**
   * Fetches the complete list of events, supporting search term, category/date filters, and pricing.
   * Also aggregates registration count for each event.
   */
  const getEvents = useCallback(async (options?: {
    search?: string;
    upcomingOnly?: boolean;
    organizerId?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('events')
        .select(`
          *,
          organizer:profiles(*),
          registrations(id, status)
        `);

      if (options?.search) {
        query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%,location.ilike.%${options.search}%`);
      }

      if (options?.organizerId) {
        query = query.eq('organizer_id', options.organizerId);
      }

      if (options?.upcomingOnly) {
        // filter events from today onwards
        const today = new Date().toISOString();
        query = query.gte('event_date', today);
      }

      // Order by nearest date
      const { data, error: fetchErr } = await query.order('event_date', { ascending: true });

      if (fetchErr) throw fetchErr;

      // Map registrations count nicely
      const mappedEvents: Event[] = (data || []).map((item: any) => {
        const activeRegistrations = item.registrations?.filter((r: any) => r.status === 'registered') || [];
        return {
          id: item.id,
          title: item.title,
          description: item.description,
          location: item.location,
          event_date: item.event_date,
          capacity: item.capacity,
          price: item.price ? parseFloat(item.price) : 0,
          image_url: item.image_url,
          organizer_id: item.organizer_id,
          created_at: item.created_at,
          organizer: item.organizer,
          registration_count: activeRegistrations.length
        };
      });

      return mappedEvents;
    } catch (err: any) {
      console.error('Error fetching events:', err.message);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetches full event details for a single event by ID, including its registration count
   */
  const getEventById = useCallback(async (id: string): Promise<Event | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('events')
        .select(`
          *,
          organizer:profiles(*),
          registrations(id, status)
        `)
        .eq('id', id)
        .single();

      if (fetchErr) throw fetchErr;

      const activeRegistrations = data.registrations?.filter((r: any) => r.status === 'registered') || [];

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        location: data.location,
        event_date: data.event_date,
        capacity: data.capacity,
        price: data.price ? parseFloat(data.price) : 0,
        image_url: data.image_url,
        organizer_id: data.organizer_id,
        created_at: data.created_at,
        organizer: data.organizer,
        registration_count: activeRegistrations.length
      };
    } catch (err: any) {
      console.error('Error fetching event details:', err.message);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Creates a new event in the database
   */
  const createEvent = useCallback(async (eventData: Omit<Event, 'id' | 'created_at' | 'organizer_id' | 'registration_count'>) => {
    if (!profile) throw new Error('Not authenticated');
    setLoading(true);
    setError(null);
    try {
      const { data, error: createErr } = await supabase
        .from('events')
        .insert({
          ...eventData,
          organizer_id: profile.id,
        })
        .select()
        .single();

      if (createErr) throw createErr;
      return data;
    } catch (err: any) {
      console.error('Error creating event:', err.message);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [profile]);

  /**
   * Edits/updates an existing event in the database
   */
  const updateEvent = useCallback(async (eventId: string, eventData: Partial<Event>) => {
    setLoading(true);
    setError(null);
    try {
      // Remove joined fields if passed
      const { organizer, registration_count, ...payload } = eventData as any;

      const { data, error: updateErr } = await supabase
        .from('events')
        .update(payload)
        .eq('id', eventId)
        .select()
        .single();

      if (updateErr) throw updateErr;
      return data;
    } catch (err: any) {
      console.error('Error updating event:', err.message);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Deletes an event by ID
   */
  const deleteEvent = useCallback(async (eventId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error: deleteErr } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (deleteErr) throw deleteErr;
      return true;
    } catch (err: any) {
      console.error('Error deleting event:', err.message);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Helper to read a file as a Base64 string for robust fallback
   */
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  /**
   * Uploads an event poster image to the Supabase Storage bucket 'event-posters' & returns the public URL
   */
  const uploadEventPoster = useCallback(async (file: File): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `posters/${fileName}`;

      // Upload file to 'event-posters' bucket
      let uploadRes = await supabase.storage
        .from('event-posters')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      // If bucket is missing or rules are not set up, try creating the bucket first and retrying
      if (uploadRes.error && (uploadRes.error.message?.includes('not found') || uploadRes.error.message?.includes('Bucket'))) {
        console.warn('Bucket "event-posters" not found. Attempting auto-creation...');
        try {
          await supabase.storage.createBucket('event-posters', { public: true });
          // Retry
          uploadRes = await supabase.storage
            .from('event-posters')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });
        } catch (createErr) {
          console.warn('Could not auto-create "event-posters" bucket:', createErr);
        }
      }

      if (uploadRes.error) {
        console.warn('Storage upload error, falling back to Base64:', uploadRes.error.message);
        const base64Data = await readFileAsDataURL(file);
        return base64Data;
      }

      // Generate public URL
      const { data } = supabase.storage
        .from('event-posters')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err: any) {
      console.warn('Error uploading poster, using Base64 fallback:', err.message);
      try {
        const base64Data = await readFileAsDataURL(file);
        return base64Data;
      } catch (fallbackErr: any) {
        setError(fallbackErr.message || err.message);
        throw fallbackErr;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Uploads profile picture/avatar to 'avatars' bucket & returns public URL
   */
  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      let uploadRes = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      // If bucket is missing, try creating it and retrying
      if (uploadRes.error && (uploadRes.error.message?.includes('not found') || uploadRes.error.message?.includes('Bucket'))) {
        console.warn('Bucket "avatars" not found. Attempting auto-creation...');
        try {
          await supabase.storage.createBucket('avatars', { public: true });
          // Retry
          uploadRes = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });
        } catch (createErr) {
          console.warn('Could not auto-create "avatars" bucket:', createErr);
        }
      }

      if (uploadRes.error) {
        console.warn('Storage upload error, falling back to Base64:', uploadRes.error.message);
        const base64Data = await readFileAsDataURL(file);
        return base64Data;
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err: any) {
      console.warn('Error uploading avatar, using Base64 fallback:', err.message);
      try {
        const base64Data = await readFileAsDataURL(file);
        return base64Data;
      } catch (fallbackErr: any) {
        setError(fallbackErr.message || err.message);
        throw fallbackErr;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    uploadEventPoster,
    uploadAvatar,
  };
}
