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

  // API ROUTE: Trigger / Publish notification logs or mock SMTP dispatches
  app.post('/api/notifications/emit', (req, res) => {
    const notification = req.body;
    if (!notification || !notification.user_id) {
      return res.status(400).json({ error: 'Notification and target recipient user_id is required' });
    }

    // Handle optional secure email logging alongside
    if (notification.emailEnabled !== false) {
      const recipientEmail = notification.metadata?.recipient_email || 'user@eventspark.com';
      console.log(`\n\x1b[35m=== [EMAIL DISPATCH] EventSpark SMTP Server Log ===\x1b[0m`);
      console.log(`\x1b[36mRecipient Address:\x1b[0m ${recipientEmail}`);
      console.log(`\x1b[36mSubject Line:\x1b[0m      🔔 EventSpark: ${notification.title}`);
      console.log(`\x1b[36mMessage Body:\x1b[0m      ${notification.message}`);
      console.log(`\x1b[36mDispatch Date:\x1b[0m     ${new Date().toLocaleString()}`);
      console.log(`\x1b[36mStatus Code:\x1b[0m       250 OK - Queued & Transfer Completed`);
      console.log(`\x1b[35m===================================================\x1b[0m\n`);
    }

    res.json({ success: true, sseBroadcastCount: 0 });
  });

  // API ROUTE: Broadcaster for Real-time Activity Logs (silent log helper)
  app.post('/api/activity-logs/emit', (req, res) => {
    const activity = req.body;
    if (!activity) {
      return res.status(400).json({ error: 'Activity details are required' });
    }
    res.json({ success: true, sseBroadcastCount: 0 });
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
      
      let text = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
        });
        text = response.text || '';
      } catch (err: any) {
        console.warn('Gemini error generating description, initiating offline fallback copywriter:', err.message);
        const keywordsStr = keywords ? ` using elements of ${keywords}` : '';
        text = `Welcome to "${title}"! This uniquely curated event is designed to inspire, connect, and elevate all participants${keywordsStr}.\n\nThroughout the session, we will engage in specialized deep-dives, hands-on masterclasses, and vibrant networking moments configured to help you unlock new perspectives.\n\n**What You Will Gain:**\n- **Practical Skill Sets** via structured interactive lessons\n- **Professional Connections** with industry peers and innovators\n- **Comprehensive Takehome Resources** and checklist templates\n\nNo matter your current background, this workshop will provide the scaffolding needed to advance your goals. We look forward to seeing you there!`;
      }

      res.json({ text });
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
      
      let text = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
        });
        text = response.text || '';
      } catch (err: any) {
        console.warn('Gemini error generating agenda, initiating offline fallback scheduler:', err.message);
        let scheduleLines = `### Proposed Agenda for "${title}" (${hours} Hours)\n\n| Time | Session Topic | Focus & Activities |\n| :--- | :--- | :--- |\n`;
        
        for (let i = 1; i <= hours; i++) {
          const hourNum = 8 + i; // Start at 9:00 AM
          const timeStr = `${hourNum < 10 ? '0' + hourNum : hourNum}:00 - ${hourNum + 1}:00`;
          
          if (i === 1) {
            scheduleLines += `| ${timeStr} | Session 1: Welcome & Overview | Attendee check-in, orientation, setting expectations, and a warm-up introduction activity. |\n`;
          } else if (i === hours) {
            scheduleLines += `| ${timeStr} | Session ${i}: Round-table Q&A & Wrap-up | Open floor for questions, collective feedback, next action items, and group photos. |\n`;
          } else if (i === 2) {
            scheduleLines += `| ${timeStr} | Session 2: Core Concepts Demonstration | Live deep-dive presentation of key workshop principles, strategies, and industry examples. |\n`;
          } else {
            scheduleLines += `| ${timeStr} | Session ${i}: Team Dynamic Session | Hands-on collaborative exercise with peer groups to construct practical mock workflows. |\n`;
          }
        }
        text = scheduleLines;
      }

      res.json({ text });
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

      let text = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
        });
        text = response.text || '';
      } catch (err: any) {
        console.warn('Gemini error generating promoters, initiating offline fallback copywriter:', err.message);
        const tag = title.replace(/[^a-zA-Z0-9]/g, '');
        text = `### 👔 LinkedIn (Professional Outreach)
Excited to announce our upcoming masterclass: **"${title}"**! 🚀

Whether you're looking to acquire state-of-the-art skills or establish connections with industry-leading peers, this session is tailored specifically for immersive professional development.

👉 Register now to secure your spot today! #ProfessionalDevelopment #Networking #${tag} #WorkplaceGrowth

---

### ⚡ Twitter / X (Catchy & Urgent)
Elevate your skills at "**${title}**"! 🎓 Spark conversations, study expert models, and level up with a motivated community.

Seats are strictly limited — reserve your ticker before it's too late! 🎟️👇 #Meetup #${tag} #Learning

---

### 📸 Instagram (Visual & Engaging)
Ready to make moves? 👊 Join us at **"${title}"** for an unforgettable experience filled with learning, collaboration, and high energy! ✨

📅 Mark your calendars and tag a friend who needs to run with this! Link to sign up is in our bio. 🔗 #UpcomingEvent #Motivation #SuccessGuide #${tag}`;
      }

      res.json({ text });
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

      let text = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: contents,
          config: {
            systemInstruction,
          },
        });
        text = response.text || '';
      } catch (err: any) {
        console.warn('Gemini chatbot error, fallback to rule-based dialog helper:', err.message);
        const inputLower = message.toLowerCase();
        
        if (inputLower.includes('price') || inputLower.includes('how much') || inputLower.includes('cost') || inputLower.includes('ticket')) {
          text = `Regarding the ticket prices for "${eventTitle}", please refer to the event card page, as registering for tickets is managed natively on our dashboard. Free tier registrations are also supported where applicable!`;
        } else if (inputLower.includes('where') || inputLower.includes('location') || inputLower.includes('map') || inputLower.includes('address')) {
          text = `The event "${eventTitle}" takes place at the location published on the event's specifications page. Be sure to check the description cards for maps or travel guidelines!`;
        } else if (inputLower.includes('schedule') || inputLower.includes('agenda') || inputLower.includes('time') || inputLower.includes('when')) {
          text = `To see the full timeline and schedule for "${eventTitle}", check out the Interactive Schedule tab where the hour-by-hour program is detailed!`;
        } else if (inputLower.includes('who') || inputLower.includes('speaker') || inputLower.includes('host') || inputLower.includes('organizer')) {
          text = `This event is hosted by our certified coordinators. You can view the creator's profile picture and email linked on the specifications details tab during active registration!`;
        } else {
          if (eventDescription && eventDescription.length > 20) {
            const highlight = eventDescription.slice(0, 140) + '...';
            text = `Regarding your query about "${eventTitle}": based on event guidelines, "${highlight}" Let me know if you would like me to clarify other schedules!`;
          } else {
            text = `Thank you for asking about "${eventTitle}"! For more info on schedules or special accommodations, please drop a note to the event organizers directly on our feedback section!`;
          }
        }
      }

      res.json({ text });
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
