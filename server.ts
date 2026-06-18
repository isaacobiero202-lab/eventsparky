import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Initializes and starts the Full-Stack Express and Vite development/production server on Port 3000.
 */
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API ROUTE: Get Supabase Credentials dynamically from backend environment
  app.get('/api/supabase-config', (req, res) => {
    res.json({
      supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
    });
  });

  // Initialize server-side Gemini AI client securely
  const apiKey = process.env.GEMINI_API_KEY || '';
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // API ROUTE: AI Event Description Copier Generator (Gemini)
  app.post('/api/ai/description', async (req, res) => {
    try {
      const { title, keywords } = req.body;
      if (!title) {
        return res.status(400).json({ error: 'Title field is required for AI generation' });
      }

      const prompt = `Generate an inspiring, professional, and descriptive marketing outline for an event titled "${title}". Use these keywords if provided: "${keywords || ''}". Format with clean spacing, bullet points for key achievements, and an engaging vibe. Keep it concise (around 150-200 words).`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error('Gemini error generating description:', err);
      res.status(500).json({ error: err.message || 'Gemini processing exception' });
    }
  });

  // API ROUTE: AI Hour-by-Hour Event Agenda Generator (Gemini)
  app.post('/api/ai/agenda', async (req, res) => {
    try {
      const { title, durationHours } = req.body;
      if (!title) {
        return res.status(400).json({ error: 'Title field is required to map agenda schedules' });
      }

      const hours = durationHours || 4;
      const prompt = `Build a structured, elegant hour-by-hour visual schedule/agenda table for a ${hours}-hour workshop event titled "${title}". List each hour, session topic (e.g. keynote, networking, snacks Q&A), and a 1-sentence description. Render cleanly with timestamps inside.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error('Gemini error generating agenda:', err);
      res.status(500).json({ error: err.message || 'Gemini processing exception' });
    }
  });

  // API ROUTE: Social Media Promotional Content Copywriter (Gemini)
  app.post('/api/ai/promote', async (req, res) => {
    try {
      const { title, description } = req.body;
      if (!title) {
        return res.status(400).json({ error: 'Title field is required to draft promoters' });
      }

      const prompt = `Develop 3 distinctive, high-converting social media marketing posts with hashtags and emojis to promote this event:
Title: "${title}"
Background details: "${description || ''}"

Design output SPECIFICALLY optimized for these platforms:
Post 1: Professional (LinkedIn style summary)
Post 2: Catchy & Urgent (Twitter/X style with character efficiency)
Post 3: Bold & Creative (Instagram style with emojis and high-contrast lines)`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error('Gemini error generating promoters:', err);
      res.status(500).json({ error: err.message || 'Gemini processing exception' });
    }
  });

  // API ROUTE: Attendee Interactive Help Chatbot (Gemini Grounded on Specifications)
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, eventTitle, eventDescription, chatHistory } = req.body;
      if (!message || !eventTitle) {
        return res.status(400).json({ error: 'Message payload and target title bounds are required' });
      }

      const systemInstruction = `You are a helpful, professional, and welcoming information assistant for an event titled "${eventTitle}".
Here are the official event specifications:
"${eventDescription || 'No description published.'}"

Answer any user questions concisely, clearly, and supportively based ONLY on this context. Keep answers to at most 2 sentences. If they ask about details not specified, politely inform them that details are currently TBD and they should contact organizers. Do not makeup any schedules, coordinates, or prices.`;

      const contents = [];
      if (chatHistory && Array.isArray(chatHistory)) {
        for (const turn of chatHistory) {
          contents.push({ role: turn.role, parts: [{ text: turn.text }] });
        }
      }
      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents,
        config: {
          systemInstruction,
        },
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error('Gemini chatbot error:', err);
      res.status(500).json({ error: err.message || 'Gemini processing exception' });
    }
  });

  // Vite development middleware vs production static builds
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind server listener exclusively on Port 3000 is required
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server launched successfully at http://0.0.0.0:${PORT}`);
  });
}

startServer();
