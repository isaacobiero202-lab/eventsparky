import { Event } from '../types';

/**
 * Validates the core values submitted in an event creation/editing form.
 * Ensures that and returns any standard field valuation validation failures.
 * 
 * @param {Partial<Event>} event - The partial event fields to validate.
 * @returns {Record<string, string>} A dictionary mapping fields to descriptive validation errors.
 */
export function validateEvent(event: Partial<Event>): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!event.title || event.title.trim() === '') {
    errors.title = 'Event title is required';
  } else if (event.title.length < 3) {
    errors.title = 'Event title must be at least 3 characters long';
  }

  if (!event.location || event.location.trim() === '') {
    errors.location = 'Location is required (use Online for virtual events)';
  }

  if (!event.event_date) {
    errors.event_date = 'Event date and time is required';
  } else {
    const selectedDate = new Date(event.event_date);
    if (isNaN(selectedDate.getTime())) {
      errors.event_date = 'Invalid date and time specified';
    } else if (selectedDate < new Date()) {
      errors.event_date = 'Event date cannot be in the past';
    }
  }

  if (event.capacity === undefined || event.capacity === null) {
    errors.capacity = 'Capacity is required';
  } else {
    const capNum = Number(event.capacity);
    if (isNaN(capNum) || capNum < 0) {
      errors.capacity = 'Capacity must be 0 or greater (0 for unlimited)';
    }
  }

  if (event.price === undefined || event.price === null) {
    errors.price = 'Price is required';
  } else {
    const priceNum = Number(event.price);
    if (isNaN(priceNum) || priceNum < 0) {
      errors.price = 'Price cannot be negative';
    }
  }

  return errors;
}
