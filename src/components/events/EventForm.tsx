import React, { useState, useRef } from 'react';
import { Event } from '../../types';
import { useEvents } from '../../hooks/useEvents';
import { validateEvent } from '../../utils/validateEvent';
import { AIDescriptionGenerator } from '../ai/AIDescriptionGenerator';
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  Users, 
  Image, 
  UploadCloud, 
  X, 
  Loader, 
  Save, 
  AlertCircle 
} from 'lucide-react';

interface EventFormProps {
  initialData?: Partial<Event>;
  onSubmit: (data: Omit<Event, 'id' | 'created_at' | 'organizer_id' | 'registration_count'>) => Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function EventForm({ initialData = {}, onSubmit, submitLabel = 'Save Event', isSubmitting = false }: EventFormProps) {
  const { uploadEventPoster, loading: storageLoading } = useEvents();

  const [title, setTitle] = useState(initialData.title || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [location, setLocation] = useState(initialData.location || '');
  
  // Format target date for datetime-local input (YYYY-MM-DDTHH:MM)
  const formatInitialDate = (isoString?: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    // Adjust timezone offsets nicely
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  };
  const [eventDate, setEventDate] = useState(formatInitialDate(initialData.event_date));
  
  const [capacity, setCapacity] = useState<number>(initialData.capacity ?? 0);
  const [price, setPrice] = useState<number>(initialData.price ?? 0);
  const [imageUrl, setImageUrl] = useState<string>(initialData.image_url || '');

  // Validation State
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleValidateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Format payload for validation
    const payload = {
      title,
      description,
      location,
      event_date: eventDate ? new Date(eventDate).toISOString() : null,
      capacity: Number(capacity),
      price: Number(price),
      image_url: imageUrl,
    };

    const errors = validateEvent(payload);
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      // scroll to top of form
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setFormErrors({});
    await onSubmit(payload as any);
  };

  // Drag and Drop files uploader logic
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Only image files (.png, .jpg, .webp, etc.) are allowed');
      return;
    }

    try {
      setFormErrors((prev) => ({ ...prev, imageUrl: '' }));
      const publicUrl = await uploadEventPoster(file);
      if (publicUrl) {
        setImageUrl(publicUrl);
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      setFormErrors((prev) => ({ ...prev, imageUrl: err.message || 'Error uploading file' }));
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Form Core Details */}
      <form onSubmit={handleValidateAndSubmit} className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-5">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-50 pb-3">
            Event Specifications
          </h3>

          {/* Event Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between">
              <span>Event Title *</span>
              {formErrors.title && <span className="text-xs text-rose-500 font-medium flex items-center"><AlertCircle className="w-3 h-3 mr-1" /> {formErrors.title}</span>}
            </label>
            <input
              type="text"
              placeholder="e.g. Modern Web Development Summit"
              className={`w-full text-sm px-4 py-2.5 bg-slate-50 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition ${
                formErrors.title ? 'border-rose-400 bg-rose-50/10' : 'border-slate-200'
              }`}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (formErrors.title) setFormErrors((prev) => { const c = {...prev}; delete c.title; return c; });
              }}
            />
          </div>

          {/* Event Date & Location In Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between">
                <span>Date & Time *</span>
                {formErrors.event_date && (
                  <span className="text-xs text-rose-500 font-medium flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" /> {formErrors.event_date}
                  </span>
                )}
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="datetime-local"
                  className={`w-full text-sm pl-11 pr-4 py-2.5 bg-slate-50 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition ${
                    formErrors.event_date ? 'border-rose-400 bg-rose-50/10' : 'border-slate-200'
                  }`}
                  value={eventDate}
                  onChange={(e) => {
                    setEventDate(e.target.value);
                    if (formErrors.event_date) setFormErrors((prev) => { const c = {...prev}; delete c.event_date; return c; });
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between">
                <span>Venue Location *</span>
                {formErrors.location && (
                  <span className="text-xs text-rose-500 font-medium flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" /> {formErrors.location}
                  </span>
                )}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. San Francisco, CA or Online (Zoom)"
                  className={`w-full text-sm pl-11 pr-4 py-2.5 bg-slate-50 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition ${
                    formErrors.location ? 'border-rose-400 bg-rose-50/10' : 'border-slate-200'
                  }`}
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    if (formErrors.location) setFormErrors((prev) => { const c = {...prev}; delete c.location; return c; });
                  }}
                />
              </div>
            </div>
          </div>

          {/* Pricing & Capacity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between">
                <span>Ticket Price (Ksh) *</span>
                {formErrors.price && (
                  <span className="text-xs text-rose-500 font-medium flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" /> {formErrors.price}
                  </span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400 pointer-events-none font-mono">Ksh</span>
                <input
                  type="number"
                  placeholder="0 for Free events"
                  min="0"
                  step="0.01"
                  className={`w-full text-sm pl-12 pr-4 py-2.5 bg-slate-50 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition ${
                    formErrors.price ? 'border-rose-400 bg-rose-50/10' : 'border-slate-200'
                  }`}
                  value={price === 0 ? '' : price}
                  onChange={(e) => {
                    setPrice(e.target.value === '' ? 0 : parseFloat(e.target.value));
                    if (formErrors.price) setFormErrors((prev) => { const c = {...prev}; delete c.price; return c; });
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between">
                <span>Event capacity *</span>
                {formErrors.capacity && (
                  <span className="text-xs text-rose-500 font-medium flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" /> {formErrors.capacity}
                  </span>
                )}
              </label>
              <div className="relative">
                <Users className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="number"
                  placeholder="0 for Unlimited capacity"
                  min="0"
                  step="1"
                  className={`w-full text-sm pl-11 pr-4 py-2.5 bg-slate-50 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition ${
                    formErrors.capacity ? 'border-rose-400 bg-rose-50/10' : 'border-slate-200'
                  }`}
                  value={capacity === 0 ? '' : capacity}
                  onChange={(e) => {
                    setCapacity(e.target.value === '' ? 0 : parseInt(e.target.value, 10));
                    if (formErrors.capacity) setFormErrors((prev) => { const c = {...prev}; delete c.capacity; return c; });
                  }}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between">
              <span>Detailed Description</span>
            </label>
            <textarea
              placeholder="What is this event about? Write goals, schedules, prerequisites, etc."
              rows={6}
              className="w-full text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Drag and Drop Poster Upload */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Event Poster / Cover Graphic</h3>

          {imageUrl ? (
            <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 h-56">
              <img
                src={imageUrl}
                alt="Selected Event Poster"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="absolute top-3 right-3 p-1.5 bg-rose-600 text-white hover:bg-rose-700 rounded-full shadow-xs transition cursor-pointer"
                title="Remove Photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition ${
                dragActive ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 hover:border-slate-300'
              }`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              
              {storageLoading ? (
                <div className="flex flex-col items-center">
                  <Loader className="w-10 h-10 text-indigo-600 animate-spin mb-2" />
                  <p className="text-sm font-medium text-indigo-600">Uploading poster to cloud Storage...</p>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-10 h-10 text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-750">
                    <button
                      type="button"
                      className="text-indigo-600 font-bold hover:underline cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Click to upload
                    </button>{' '}
                    or drag & drop your image here
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Supports high-resolution PNG, JPG, or WEBP (Max 5MB)
                  </p>
                </>
              )}
            </div>
          )}
          {formErrors.imageUrl && (
            <p className="text-xs text-rose-500 font-medium mt-1 flex items-center">
              <AlertCircle className="w-3.5 h-3.5 mr-1" /> {formErrors.imageUrl}
            </p>
          )}
        </div>

        {/* Submit Actions Row */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting || storageLoading}
            className="inline-flex items-center space-x-2 px-6 py-3 text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-xl transition shadow-xs cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Processing Event...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{submitLabel}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Right Column: AI Co-Planner Toolbar */}
      <div className="space-y-6">
        <div className="sticky top-20">
          <AIDescriptionGenerator
            initialTitle={title}
            onSelectDescription={(desc) => {
              setDescription(desc);
              // Auto fill the title if empty
              if (!title && initialData.title) {
                 setTitle(initialData.title);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
