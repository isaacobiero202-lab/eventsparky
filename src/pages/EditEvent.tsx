import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEvents } from '../hooks/useEvents';
import { EventForm } from '../components/events/EventForm';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ChevronLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Event } from '../types';

export function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const { getEventById, updateEvent } = useEvents();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadEvent = async () => {
    if (!id) return;
    try {
      const data = await getEventById(id);
      if (data) {
        setEvent(data);
      } else {
        setError('Event post could not be resolved or fetched.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while loading event details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();
  }, [id]);

  const handleSubmit = async (eventData: any) => {
    if (!id) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await updateEvent(id, eventData);
      setSuccess(true);
      setTimeout(() => {
        navigate(`/events/${id}`);
      }, 1500);
    } catch (err: any) {
      console.error('Update event error:', err);
      setError(err.message || 'Failed to update event details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Return Navigation */}
      <button
        onClick={() => navigate(`/events/${id}`)}
        className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Return to Event Details</span>
      </button>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Edit Event specifications</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Modify event parameters, pricing, venues, or regenerate copywriting with AI
        </p>
      </div>

      {loading ? (
        <LoadingSpinner size="medium" />
      ) : (
        <>
          {success && (
            <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl font-medium text-sm flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>Event changes saved successfully! Returning to details...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl font-medium text-sm flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {event && (
            <EventForm
              initialData={event}
              onSubmit={handleSubmit}
              submitLabel="Save Specifications"
              isSubmitting={isSubmitting}
            />
          )}
        </>
      )}
    </div>
  );
}
