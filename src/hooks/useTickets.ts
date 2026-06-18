import { useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { queryCache } from '../services/supabaseCache';

export interface Ticket {
  id: string;
  event_id: string;
  user_id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  ticket_category: string; // 'General' | 'VIP' | 'Student'
  price_paid: number;
  ticket_code: string;
  qr_code: string;
  status: 'valid' | 'used' | 'cancelled';
  created_at: string;
  event?: any;
}

export function useTickets() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  const getTicketsByUser = useCallback(async (forceRefresh?: boolean): Promise<Ticket[]> => {
    if (!profile) return [];
    const cacheKey = `tickets:user:${profile.id}`;
    if (!forceRefresh) {
      const cached = queryCache.get<Ticket[]>(cacheKey);
      if (cached) return cached;
    }

    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('tickets')
        .select(`
          *,
          event:events(*)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (err) {
        // Fallback for mock tickets
        const localTickets = JSON.parse(localStorage.getItem('mock_tickets') || '[]');
        const eventsList = JSON.parse(localStorage.getItem('mock_events') || '[]');
        const userTkts = localTickets.filter((t: any) => t.user_id === profile.id);
        const enriched = userTkts.map((t: any) => {
          const ev = eventsList.find((e: any) => e.id === t.event_id) || null;
          return { ...t, event: ev };
        });
        queryCache.set(cacheKey, enriched);
        return enriched;
      }
      const result = data || [];
      queryCache.set(cacheKey, result);
      return result;
    } catch (err: any) {
      console.error('Error fetching tickets:', err.message);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const createTicket = useCallback(async (ticketData: Omit<Ticket, 'id' | 'created_at' | 'user_id' | 'status'>): Promise<Ticket> => {
    if (!profile) throw new Error('Not authenticated');
    setLoading(true);
    try {
      const ticketId = crypto.randomUUID ? crypto.randomUUID() : 'tkt-' + Math.random().toString(36).slice(2, 11);
      const newTicket: Ticket = {
        id: ticketId,
        user_id: profile.id,
        created_at: new Date().toISOString(),
        status: 'valid',
        ...ticketData
      };

      const { data, error: err } = await supabase
        .from('tickets')
        .insert(newTicket)
        .select()
        .single();

      if (err) {
        // Fallback for mock client/failures
        const localTickets = JSON.parse(localStorage.getItem('mock_tickets') || '[]');
        localTickets.push(newTicket);
        localStorage.setItem('mock_tickets', JSON.stringify(localTickets));
        queryCache.invalidate(`tickets:user:${profile.id}`);
        return newTicket;
      }

      queryCache.invalidate(`tickets:user:${profile.id}`);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const verifyTicket = useCallback(async (ticketCode: string): Promise<{ success: boolean; message: string; ticket?: Ticket }> => {
    setLoading(true);
    try {
      const { data: list, error: err } = await supabase
        .from('tickets')
        .select('*, event:events(*)');

      if (err) {
        // Fallback mock check
        const localTickets = JSON.parse(localStorage.getItem('mock_tickets') || '[]');
        const tkt = localTickets.find((t: any) => t.ticket_code === ticketCode);
        if (!tkt) return { success: false, message: 'Ticket not found' };
        if (tkt.status === 'used') return { success: false, message: 'Ticket already scanned/used', ticket: tkt };
        if (tkt.status === 'cancelled') return { success: false, message: 'Ticket has been cancelled', ticket: tkt };
        tkt.status = 'used';
        localStorage.setItem('mock_tickets', JSON.stringify(localTickets));
        return { success: true, message: 'Verified successfully!', ticket: tkt };
      }

      const tkt = (list || []).find((t: any) => t.ticket_code === ticketCode);
      if (!tkt) return { success: false, message: 'Ticket not found' };
      if (tkt.status === 'used') return { success: false, message: 'Ticket already scanned/used', ticket: tkt };
      if (tkt.status === 'cancelled') return { success: false, message: 'Ticket has been cancelled', ticket: tkt };

      await supabase.from('tickets').update({ status: 'used' }).eq('id', tkt.id);
      tkt.status = 'used';
      return { success: true, message: 'Verified successfully!', ticket: tkt };
    } catch (err: any) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getTicketsByUser,
    createTicket,
    verifyTicket
  };
}
