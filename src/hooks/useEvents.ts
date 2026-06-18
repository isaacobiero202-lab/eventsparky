import { useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Event } from '../types';
import { useAuth } from './useAuth';
import { queryCache } from '../services/supabaseCache';
import { slugify } from '../utils/slugify';

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
    forceRefresh?: boolean;
  }) => {
    const { forceRefresh, ...queryOptions } = options || {};
    const cacheKey = queryCache.generateKey('events:list', queryOptions);

    if (!forceRefresh) {
      const cached = queryCache.get<Event[]>(cacheKey);
      if (cached) return cached;
    }

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

      if (queryOptions?.search) {
        query = query.or(`title.ilike.%${queryOptions.search}%,description.ilike.%${queryOptions.search}%,location.ilike.%${queryOptions.search}%`);
      }

      if (queryOptions?.organizerId) {
        query = query.eq('organizer_id', queryOptions.organizerId);
      }

      if (queryOptions?.upcomingOnly) {
        // filter events from today onwards
        const today = new Date().toISOString();
        query = query.gte('event_date', today);
      }

      // Order by nearest date
      const { data, error: fetchErr } = await query.order('event_date', { ascending: true });

      if (fetchErr) throw fetchErr;

      // Map registrations count nicely
      const localCancelledList = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('eventspark_cancelled_events') || '{}') : {};
      const mappedEvents: Event[] = (data || []).map((item: any) => {
        const activeRegistrations = item.registrations?.filter((r: any) => r.status === 'registered') || [];
        const isCancelled = !!localCancelledList[item.id] || item.is_cancelled === true || item.status === 'cancelled';
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
          is_cancelled: isCancelled,
          status: isCancelled ? 'cancelled' : 'published',
          registration_count: activeRegistrations.length
        };
      });

      queryCache.set(cacheKey, mappedEvents);
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
  const getEventById = useCallback(async (id: string, forceRefresh?: boolean): Promise<Event | null> => {
    return getEventByIdOrSlug(id, forceRefresh);
  }, []);

  /**
   * Fetches full event details for a single event by ID or Slug, including its registration count
   */
  const getEventByIdOrSlug = useCallback(async (idOrSlug: string, forceRefresh?: boolean): Promise<Event | null> => {
    const cacheKey = `events:idOrSlug:${idOrSlug}`;
    if (!forceRefresh) {
      const cached = queryCache.get<Event | null>(cacheKey);
      if (cached !== null && cached !== undefined) return cached;
    }

    setLoading(true);
    setError(null);
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug) || idOrSlug.startsWith('mock-');
      if (isUuid) {
        const { data, error: fetchErr } = await supabase
          .from('events')
          .select(`
            *,
            organizer:profiles(*),
            registrations(id, status)
          `)
          .eq('id', idOrSlug)
          .maybeSingle();

        if (!fetchErr && data) {
          const activeRegistrations = data.registrations?.filter((r: any) => r.status === 'registered') || [];
          const localCancelledList = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('eventspark_cancelled_events') || '{}') : {};
          const isCancelled = !!localCancelledList[data.id] || data.is_cancelled === true || data.status === 'cancelled';
          const eventDetails: Event = {
            id: data.id,
            slug: data.slug || slugify(data.title),
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
            is_cancelled: isCancelled,
            status: isCancelled ? 'cancelled' : 'published',
            registration_count: activeRegistrations.length
          };
          queryCache.set(cacheKey, eventDetails);
          return eventDetails;
        }
      }

      // If not UUID or not found by direct ID, fetch list and scan for matching slug/id
      const { data: list, error: fetchListErr } = await supabase
        .from('events')
        .select(`
          *,
          organizer:profiles(*),
          registrations(id, status)
        `);

      if (fetchListErr) throw fetchListErr;

      const matched = (list || []).find((e: any) => {
        const s = e.slug || slugify(e.title);
        return s === idOrSlug || e.id === idOrSlug;
      });

      if (matched) {
        const activeRegistrations = matched.registrations?.filter((r: any) => r.status === 'registered') || [];
        const localCancelledList = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('eventspark_cancelled_events') || '{}') : {};
        const isCancelled = !!localCancelledList[matched.id] || matched.is_cancelled === true || matched.status === 'cancelled';
        const eventDetails: Event = {
          id: matched.id,
          slug: matched.slug || slugify(matched.title),
          title: matched.title,
          description: matched.description,
          location: matched.location,
          event_date: matched.event_date,
          capacity: matched.capacity,
          price: matched.price ? parseFloat(matched.price) : 0,
          image_url: matched.image_url,
          organizer_id: matched.organizer_id,
          created_at: matched.created_at,
          organizer: matched.organizer,
          is_cancelled: isCancelled,
          status: isCancelled ? 'cancelled' : 'published',
          registration_count: activeRegistrations.length
        };
        queryCache.set(cacheKey, eventDetails);
        return eventDetails;
      }

      return null;
    } catch (err: any) {
      console.error('Error fetching event details by slug/id:', err.message);
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

      // Notify all registered attendees of the brand-new event
      try {
        const { data: attendees } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('role', 'attendee');

        if (attendees && attendees.length > 0) {
          for (const attendee of attendees) {
            const attendeeNotif = {
              id: crypto.randomUUID ? crypto.randomUUID() : 'notif-' + Math.random().toString(36).slice(2, 11),
              user_id: attendee.id,
              type: 'attendee_new_event',
              title: 'New Event Published! 🎉',
              message: `"${data.title}" has been published by ${profile.full_name || 'an Organizer'}. Check out the details page to register!`,
              event_id: data.id,
              is_read: false,
              created_at: new Date().toISOString(),
              metadata: {
                event_title: data.title,
                event_date: data.event_date,
                venue: data.location,
                description: data.description ? data.description.slice(0, 150) + '...' : '',
                recipient_email: attendee.email
              }
            };

            // Store in DB
            try {
              await supabase.from('notifications').insert(attendeeNotif);
            } catch (err) {}

            // Broadcast inside the server SSE stream
            const emailPref = localStorage.getItem('event-spark-email-notifications') !== 'false';
            await fetch('/api/notifications/emit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...attendeeNotif,
                emailEnabled: emailPref
              })
            }).catch(() => {});
          }
        }

        // Add secure activity logs for creation
        try {
          const organizerLog = {
            id: crypto.randomUUID ? crypto.randomUUID() : 'log-' + Math.random().toString(36).slice(2, 11),
            user_id: profile.id,
            user_name: profile.full_name || 'Organizer',
            user_role: 'organizer',
            activity_type: 'creation',
            description: `${profile.full_name || 'Organizer'} published "${data.title}"`,
            related_event_id: data.id,
            created_at: new Date().toISOString()
          };

          // Insert into database
          const { error: dbL } = await supabase.from('activity_logs').insert(organizerLog);
          if (dbL) {
            const localLogs = JSON.parse(localStorage.getItem('mock_activity_logs') || '[]');
            localLogs.push(organizerLog);
            localStorage.setItem('mock_activity_logs', JSON.stringify(localLogs));
          }

          // Broadcast to organizer
          await fetch('/api/activity-logs/emit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(organizerLog)
          }).catch(() => {});

          // Add logs for all registered attendees so they see "New event added: ..."
          if (attendees && attendees.length > 0) {
            const attendeeLogs = attendees.map((att: any) => ({
              id: crypto.randomUUID ? crypto.randomUUID() : 'log-' + Math.random().toString(36).slice(2, 11),
              user_id: att.id,
              user_name: att.full_name,
              user_role: 'attendee',
              activity_type: 'creation',
              description: `New event added: ${data.title}`,
              related_event_id: data.id,
              created_at: new Date().toISOString()
            }));

            try {
              await supabase.from('activity_logs').insert(attendeeLogs);
            } catch (err) {}

            // Save to fallback mock logs as well
            const localLogs = JSON.parse(localStorage.getItem('mock_activity_logs') || '[]');
            localLogs.push(...attendeeLogs);
            localStorage.setItem('mock_activity_logs', JSON.stringify(localLogs));

            // Broadcast to SSE streams for each attendee
            for (const attLog of attendeeLogs) {
              await fetch('/api/activity-logs/emit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(attLog)
              }).catch(() => {});
            }
          }
        } catch (logErr: any) {
          console.warn('Could not launch event creation activity logs stream:', logErr.message);
        }

      } catch (notifErr: any) {
        console.warn('Could not launch attendee event notifications stream:', notifErr.message);
      }

      queryCache.invalidate('events:');
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

      // Intercept is_cancelled / status and handle in localStorage fallback
      const localCancelledList = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('eventspark_cancelled_events') || '{}') : {};
      let localUpdated = false;

      if ('is_cancelled' in payload) {
        localCancelledList[eventId] = !!payload.is_cancelled;
        localUpdated = true;
        delete payload.is_cancelled;
      }
      if ('status' in payload) {
        localCancelledList[eventId] = payload.status === 'cancelled';
        localUpdated = true;
        delete payload.status;
      }

      if (localUpdated && typeof window !== 'undefined') {
        localStorage.setItem('eventspark_cancelled_events', JSON.stringify(localCancelledList));
      }

      let data: any = null;
      if (Object.keys(payload).length > 0) {
        const { data: updateData, error: updateErr } = await supabase
          .from('events')
          .update(payload)
          .eq('id', eventId)
          .select()
          .single();

        if (updateErr) {
          console.warn('Database update error, using local updates only:', updateErr.message);
        } else {
          data = updateData;
        }
      }

      // If payload only was is_cancelled, or supabase failed but local succeeded, construct a partial return
      if (!data) {
        const { data: existing } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .maybeSingle();
        data = existing || { id: eventId, ...payload };
      }

      // Log update action
      try {
        const updateLog = {
          id: crypto.randomUUID ? crypto.randomUUID() : 'log-' + Math.random().toString(36).slice(2, 11),
          user_id: profile?.id || 'unknown',
          user_name: profile?.full_name || 'Organizer',
          user_role: 'organizer',
          activity_type: 'update',
          description: `${profile?.full_name || 'Organizer'} updated event "${data?.title || 'Event'}"`,
          related_event_id: eventId,
          created_at: new Date().toISOString()
        };

        const { error: dbL } = await supabase.from('activity_logs').insert(updateLog);
        if (dbL) {
          const localLogs = JSON.parse(localStorage.getItem('mock_activity_logs') || '[]');
          localLogs.push(updateLog);
          localStorage.setItem('mock_activity_logs', JSON.stringify(localLogs));
        }

        await fetch('/api/activity-logs/emit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateLog)
        }).catch(() => {});
      } catch (logErr) {
        console.warn('Failed to log event update:', logErr);
      }

      queryCache.invalidate('events:');
      return data;
    } catch (err: any) {
      console.error('Error updating event:', err.message);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [profile]);

  /**
   * Deletes an event by ID
   */
  const deleteEvent = useCallback(async (eventId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Get title first before deletion or from local mock
      let eventTitle = 'Event';
      try {
        const { data: evt } = await supabase.from('events').select('title').eq('id', eventId).maybeSingle();
        if (evt) {
          eventTitle = evt.title;
        } else {
          // fallback to localStorage
          const localEvts = JSON.parse(localStorage.getItem('mock_events') || '[]');
          const match = localEvts.find((e: any) => e.id === eventId);
          if (match) eventTitle = match.title;
        }
      } catch (e) {}

      const { error: deleteErr } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (deleteErr) throw deleteErr;

      // Log delete/cancel activity
      try {
        const deleteLog = {
          id: crypto.randomUUID ? crypto.randomUUID() : 'log-' + Math.random().toString(36).slice(2, 11),
          user_id: profile?.id || 'unknown',
          user_name: profile?.full_name || 'Organizer',
          user_role: 'organizer',
          activity_type: 'cancellation',
          description: `${profile?.full_name || 'Organizer'} cancelled event "${eventTitle}"`,
          related_event_id: null,
          created_at: new Date().toISOString()
        };

        const { error: dbL } = await supabase.from('activity_logs').insert(deleteLog);
        if (dbL) {
          const localLogs = JSON.parse(localStorage.getItem('mock_activity_logs') || '[]');
          localLogs.push(deleteLog);
          localStorage.setItem('mock_activity_logs', JSON.stringify(localLogs));
        }

        await fetch('/api/activity-logs/emit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deleteLog)
        }).catch(() => {});
      } catch (logErr) {
        console.warn('Failed to log event deletion:', logErr);
      }

      queryCache.invalidate('events:');
      return true;
    } catch (err: any) {
      console.error('Error deleting event:', err.message);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [profile]);

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
        console.info('Bucket "event-posters" not found. Attempting auto-creation...');
        try {
          await supabase.storage.createBucket('event-posters', { public: true });
          // Retry
          uploadRes = await supabase.storage
            .from('event-posters')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });
        } catch (createErr) {
          console.info('Could not auto-create "event-posters" bucket:', createErr);
        }
      }

      if (uploadRes.error) {
        console.info('Storage upload error, falling back to Base64:', uploadRes.error.message);
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
        console.info('Bucket "avatars" not found. Attempting auto-creation...');
        try {
          await supabase.storage.createBucket('avatars', { public: true });
          // Retry
          uploadRes = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });
        } catch (createErr) {
          console.info('Could not auto-create "avatars" bucket:', createErr);
        }
      }

      if (uploadRes.error) {
        console.info('Storage upload error, falling back to Base64:', uploadRes.error.message);
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
    getEventByIdOrSlug,
    createEvent,
    updateEvent,
    deleteEvent,
    uploadEventPoster,
    uploadAvatar,
  };
}
