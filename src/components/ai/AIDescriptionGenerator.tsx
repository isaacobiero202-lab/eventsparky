import React, { useState } from 'react';
import { geminiService } from '../../services/gemini';
import { Sparkles, Check, RefreshCw } from 'lucide-react';

interface AIDescriptionGeneratorProps {
  initialTitle?: string;
  onSelectDescription: (desc: string) => void;
}

export function AIDescriptionGenerator({ initialTitle = '', onSelectDescription }: AIDescriptionGeneratorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [keywords, setKeywords] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('An event title is required to generate a description.');
      return;
    }

    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const completion = await geminiService.generateDescription({
        title: title.trim(),
        keywords: keywords.trim(),
      });
      setGeneratedText(completion);
    } catch (err: any) {
      console.error('AI Generator Error:', err);
      setError(err.message || 'Unable to summon Gemini to generate details right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!generatedText) return;
    onSelectDescription(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100 rounded-xl p-5 shadow-xs">
      <div className="flex items-center space-x-2 text-indigo-700 font-extrabold mb-3">
        <Sparkles className="w-5 h-5 fill-indigo-200 animate-pulse text-indigo-600" />
        <h4 className="text-base tracking-tight">AI Event Copywriter (Gemini)</h4>
      </div>

      <p className="text-xs text-slate-500 mb-4">
        Need some inspiration? Get a fully-formatted, engaging description generated from your title and custom keywords.
      </p>

      <form onSubmit={handleGenerate} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Temp/Target Title
          </label>
          <input
            type="text"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800"
            placeholder="e.g. Next-Gen Front-End Workshop"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Keywords & Vibe (optional)
          </label>
          <input
            type="text"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800"
            placeholder="e.g. React, networking, fun, snacks, practical"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg transition shadow-xs cursor-pointer"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Drafting Description...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Copy</span>
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-3 p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg font-medium border border-rose-100">
          {error}
        </div>
      )}

      {generatedText && (
        <div className="mt-4 p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            AI Generated Proposal:
          </label>
          <div className="text-xs text-slate-600 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed p-2 bg-slate-50 border border-slate-100 rounded-md">
            {generatedText}
          </div>
          <div className="mt-2.5 flex justify-end">
            <button
              type="button"
              onClick={handleApply}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                copied
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Applied successfully!</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Insert into Description</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
