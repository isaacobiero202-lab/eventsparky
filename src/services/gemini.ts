export interface AIDescriptionInput {
  title: string;
  keywords?: string;
}

export interface AIAgendaInput {
  title: string;
  durationHours?: number;
}

export interface AIChatInput {
  message: string;
  eventTitle: string;
  eventDescription?: string;
  chatHistory?: { role: 'user' | 'model'; text: string }[];
}

export interface AIPromoteInput {
  title: string;
  description?: string;
  platform?: string;
}

/**
 * Service to call Gemini AI proxy routes hosted on our server.
 * Ensures the GEMINI_API_KEY is safely stored on the server side.
 */
export const geminiService = {
  /**
   * Generates a fully detailed event description using Gemini
   */
  async generateDescription(data: AIDescriptionInput): Promise<string> {
    const response = await fetch('/api/ai/description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate event description');
    }
    
    const result = await response.json();
    return result.text;
  },

  /**
   * Generates a scheduled event agenda using Gemini
   */
  async generateAgenda(data: AIAgendaInput): Promise<string> {
    const response = await fetch('/api/ai/agenda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate event agenda');
    }
    
    const result = await response.json();
    return result.text;
  },

  /**
   * Sends user message to AI with specific event description context
   */
  async sendMessage(data: AIChatInput): Promise<string> {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to get chat response');
    }
    
    const result = await response.json();
    return result.text;
  },

  /**
   * Generates catchy promotional social media captions using Gemini
   */
  async generatePromotionalContent(data: AIPromoteInput): Promise<string> {
    const response = await fetch('/api/ai/promote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate promotional posts');
    }
    
    const result = await response.json();
    return result.text;
  }
};
