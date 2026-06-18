import React, { useState } from 'react';
import { useActivityLogs, ActivityLog } from '../../hooks/useActivityLogs';
import { 
  Activity, 
  Ticket, 
  CalendarPlus, 
  RefreshCw, 
  Trash2, 
  CreditCard, 
  UserRound, 
  Download, 
  FileSpreadsheet, 
  Clock, 
  X, 
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffMs < 0 || diffSec < 8) return 'Just now';
  if (diffSec < 60) return `${diffSec} seconds ago`;
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHr === 1) return '1 hour ago';
  if (diffHr < 24) return `${diffHr} hours ago`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function getActivityIcon(type: ActivityLog['activity_type']) {
  switch (type) {
    case 'booking':
    case 'registration':
      return {
        icon: Ticket,
        bg: 'bg-emerald-50 text-emerald-600 border-emerald-100/40',
      };
    case 'creation':
      return {
        icon: CalendarPlus,
        bg: 'bg-indigo-50 text-indigo-600 border-indigo-100/45',
      };
    case 'update':
      return {
        icon: RefreshCw,
        bg: 'bg-amber-50 text-amber-600 border-amber-100/45',
      };
    case 'cancellation':
      return {
        icon: Trash2,
        bg: 'bg-rose-50 text-rose-600 border-rose-100/45',
      };
    case 'payment':
      return {
        icon: CreditCard,
        bg: 'bg-teal-50 text-teal-600 border-teal-100/45',
      };
    case 'profile_update':
      return {
        icon: UserRound,
        bg: 'bg-sky-50 text-sky-600 border-sky-100/45',
      };
    case 'ticket_download':
      return {
        icon: Download,
        bg: 'bg-purple-50 text-purple-600 border-purple-100/45',
      };
    case 'report_generation':
      return {
        icon: FileSpreadsheet,
        bg: 'bg-cyan-50 text-cyan-600 border-cyan-100/45',
      };
    default:
      return {
        icon: Activity,
        bg: 'bg-slate-50 text-slate-600 border-slate-100/45',
      };
  }
}

export function RecentActivity() {
  const { logs, loading } = useActivityLogs();
  const [showAllOpen, setShowAllOpen] = useState(false);

  const displayedLogs = showAllOpen ? logs : logs.slice(0, 10);

  return (
    <div id="recent-activity-panel" className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs relative overflow-hidden transition-all">
      <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-5">
        <div className="flex items-center space-x-2">
          <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-100/30">
            <Activity className="w-4 h-4 text-indigo-600 animate-pulse" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-800 text-base">Recent Activity</h2>
            <p className="text-[10px] text-slate-400 font-medium">Real-time system actions</p>
          </div>
        </div>

        {logs.length > 10 && (
          <button
            onClick={() => setShowAllOpen(true)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading && logs.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Syncing activity logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-8 text-center max-w-sm mx-auto">
          <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-xs text-slate-700">No activity recorded yet</p>
          <p className="text-[10px] text-slate-400 leading-normal mt-1">
            Perform actions (launch events, update profile, book registrations) to populate log details.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {displayedLogs.map((log) => {
            const { icon: Icon, bg } = getActivityIcon(log.activity_type);
            return (
              <div key={log.id} className="py-3 flex items-start space-x-3.5 group hover:bg-slate-50/50 -mx-4 px-4 rounded-md transition duration-150">
                <div className={`p-2 rounded-lg border ${bg} shrink-0 mt-0.5`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 leading-normal transition">
                    {log.description}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50/60 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      {log.user_role}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-350" />
                      <span>{formatTimeAgo(log.created_at)}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW ALL FULL SCREEN PANEL / SLIDE-IN MODAL */}
      {showAllOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-100/30">
                  <Activity className="w-4 h-4 text-indigo-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">All Registered Activities</h3>
                  <p className="text-[11px] text-slate-400 font-medium">{logs.length} operations stored for auditing</p>
                </div>
              </div>
              <button
                onClick={() => setShowAllOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal List View */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5">
              {logs.map((log) => {
                const { icon: Icon, bg } = getActivityIcon(log.activity_type);
                return (
                  <div key={log.id} className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/30 flex items-start space-x-4 transition">
                    <div className={`p-2 rounded-lg border ${bg} shrink-0 mt-0.5`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 leading-normal">
                        {log.description}
                      </p>
                      
                      <div className="flex items-center space-x-3 mt-1.5 border-t border-slate-100/50 pt-1.5">
                        <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                          Issuer: {log.user_name} ({log.user_role})
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold flex items-center space-x-1">
                          <X className="w-2.5 h-2.5 hidden" /> {/* dummy spacer */}
                          <span>ID: {log.id.slice(0, 12)}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium flex items-center space-x-1 ml-auto">
                          <Clock className="w-3 h-3 text-slate-350" />
                          <span>{formatTimeAgo(log.created_at)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              <div className="flex items-center space-x-1">
                <AlertCircle className="w-4 h-4 text-indigo-500" />
                <span>Audited Cryptographic Log Trail</span>
              </div>
              <button
                onClick={() => setShowAllOpen(false)}
                className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg transition text-xs font-bold shrink-0 shadow-xs cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
