import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvents } from '../hooks/useEvents';
import { EventForm } from '../components/events/EventForm';
import { ChevronLeft, CheckCircle, AlertCircle } from 'lucide-react';

export function CreateEvent() {
  const { createEvent } = useEvents();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (eventData: any) => {
    setLoading(true);
    setError(null);
    try {
      await createEvent(eventData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      console.error('Create event error:', err);
      setError(err.message || 'Failed to publish event. Please verify your fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Return Navigation */}
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </button>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Post New Event</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Draft ticket pricing, dates, drag & drop graphic posters, and use AI copywriting assistants
        </p>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl font-medium text-sm flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>Event published successfully! Redirecting back to your workspace...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl font-medium text-sm flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Core Spec Form */}
      <EventForm
        onSubmit={handleSubmit}
        submitLabel="Publish Active Event"
        isSubmitting={loading}
      />
    </div>
  );
}
