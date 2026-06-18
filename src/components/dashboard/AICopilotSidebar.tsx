import React, { useState } from 'react';
import { geminiService } from '../../services/gemini';
import { Sparkles, Clipboard, Check, RefreshCw, Send, HelpCircle } from 'lucide-react';

export function AICopilotSidebar() {
  const [copilotApplied, setCopilotApplied] = useState(false);
  const [copilotLoading, setCopilotLoading] = useState(false);
  
  // AI Generator state
  const [prompt, setPrompt] = useState('Urban Gardening Workshop - Sustainable living, rooftop space, beginners...');
  const [generatedText, setGeneratedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleApplyChange = () => {
    setCopilotLoading(true);
    setTimeout(() => {
      setCopilotLoading(false);
      setCopilotApplied(true);
    }, 1200);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setGeneratedText('');
    setCopied(false);
    try {
      const completion = await geminiService.generateDescription({
        title: prompt.trim(),
        keywords: 'innovative, modern, fresh, community',
      });
      setGeneratedText(completion);
    } catch (err: any) {
      console.error(err);
      setError('Unable to reach Gemini right now. Here is a backup concept: An immersive, hands-on workshop focused on sustainable rooftop techniques for beginners.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-6 shadow-xs font-sans">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-6 h-6 bg-indigo-500 rounded flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white fill-white/10" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display">AI Co-Pilot & Insights</h2>
        </div>
        
        {/* Smart Suggestion */}
        <div className="bg-indigo-50/70 rounded-xl p-4 border border-indigo-100/60">
          <p className="text-xs font-bold text-indigo-700 mb-1.5 font-display flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping"></span>
            Smart Suggestion
          </p>
          <p className="text-xs text-indigo-950 leading-relaxed font-sans">
            Based on current registration trends, your leading events are experiencing high traction. Recommend increasing the attendee capacity limits to capture extra demand.
          </p>
          
          <button 
            type="button"
            disabled={copilotApplied || copilotLoading}
            onClick={handleApplyChange}
            className="mt-3.5 w-full bg-white border border-indigo-200 text-indigo-600 text-[10px] font-extrabold py-2 px-2.5 rounded uppercase hover:bg-indigo-600 hover:text-white transition duration-200 disabled:bg-indigo-100/50 disabled:text-indigo-400 disabled:border-transparent flex items-center justify-center space-x-1 cursor-pointer"
          >
            {copilotLoading ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Optimizing Limits...</span>
              </>
            ) : copilotApplied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600 font-bold" />
                <span className="text-emerald-700 font-bold">Capacity Boosted!</span>
              </>
            ) : (
              <span>Optimize Event Capacities</span>
            )}
          </button>
        </div>

        {/* Generate Description Area */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Quick Idea Assistant</p>
          <div className="relative">
            <textarea 
              className="w-full h-24 border border-slate-200 rounded-lg p-3 text-xs focus:ring-1 focus:ring-indigo-500 outline-none resize-none bg-slate-50 text-slate-700 leading-normal" 
              placeholder="Enter event titles / brief goals..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button 
              type="button"
              disabled={loading}
              onClick={handleGenerate}
              className="absolute bottom-2 right-2 p-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md shadow-xs transition cursor-pointer"
              title="Generate Idea Description"
            >
              {loading ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Generation Output */}
        {(generatedText || error) && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg animate-fadeIn text-xs leading-relaxed text-slate-600">
            {error ? (
              <p className="text-amber-700 font-medium">{error}</p>
            ) : (
              <>
                <p className="font-bold text-slate-800 mb-1 font-display">Generated Copy Draft:</p>
                <p className="line-clamp-4 overflow-y-auto max-h-24 bg-white p-2 border border-slate-100 rounded text-[11px] mb-2">{generatedText}</p>
                <button 
                  onClick={handleCopy}
                  className="inline-flex items-center space-x-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Clipboard className="w-3 h-3" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Code Snippet'}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Recent Activity List */}
      <div className="mt-2 space-y-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Recent Activity</p>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-1 bg-emerald-500 rounded-full shrink-0"></div>
            <div className="text-xs">
              <p className="font-bold text-slate-800">New Registration</p>
              <p className="text-slate-400">John Doe - Registered Summit</p>
              <p className="text-[9px] text-slate-300 font-mono mt-0.5">2 minutes ago</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-1 bg-indigo-500 rounded-full shrink-0"></div>
            <div className="text-xs">
              <p className="font-bold text-slate-800">Update Published</p>
              <p className="text-slate-400">Creative Arts Fest info updated</p>
              <p className="text-[9px] text-slate-300 font-mono mt-0.5">1 hour ago</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-1 bg-rose-500 rounded-full shrink-0"></div>
            <div className="text-xs">
              <p className="font-bold text-slate-800">Ticket Refunded</p>
              <p className="text-slate-400">$45.00 - Aaron Vance</p>
              <p className="text-[9px] text-slate-300 font-mono mt-0.5">3 hours ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
