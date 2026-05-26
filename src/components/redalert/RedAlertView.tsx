import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ArrowUpDown, Download, Edit2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { daysToDeadline, getUrgency } from '../../utils/deadlineUtils';
import Badge from '../shared/Badge';
import { USERS } from '../../data/mockData';
import type { ContentRequest } from '../../types';

function KPITile({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let frame: number;
    let start = 0;
    const step = () => {
      start += 1;
      setDisplayed(Math.min(start, value));
      if (start < value) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-1" style={{ backgroundColor: bg }}>
      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
      <span className="text-3xl font-bold" style={{ color }}>{displayed}</span>
    </div>
  );
}

export default function RedAlertView() {
  const { filteredRequests: requests, currentUser, openModal } = useApp();
  const [sortKey, setSortKey] = useState<keyof ContentRequest>('postDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const active = requests.filter(r => r.status !== 'Done');
  const overdue = active.filter(r => getUrgency(r) === 'overdue').length;
  const within48h = active.filter(r => {
    const d = daysToDeadline(r.internalDeadline);
    return d >= 0 && d < 2;
  }).length;
  const onTrack = active.filter(r => getUrgency(r) === 'on-track').length;
  const shipped = requests.filter(r => r.status === 'Done' && r.approvedAt).length;

  const sortedRequests = [...requests].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (av instanceof Date && bv instanceof Date) {
      return sortDir === 'asc' ? av.getTime() - bv.getTime() : bv.getTime() - av.getTime();
    }
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return 0;
  });

  const toggleSort = (key: keyof ContentRequest) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const urgencyColor: Record<string, string> = {
    'overdue':  '#EF4444',
    'urgent':   '#F59E0B',
    'due-soon': '#8B5CF6',
    'on-track': '#10B981',
  };

  return (
    <div className="flex flex-col h-full px-6 py-4 gap-5">
      {/* KPI tiles */}
      <div className="grid grid-cols-4 gap-4">
        <KPITile label="Overdue" value={overdue} color="#DC2626" bg="#FEF2F2" />
        <KPITile label="Due within 48h" value={within48h} color="#D97706" bg="#FFFBEB" />
        <KPITile label="On track" value={onTrack} color="#4F46E5" bg="#EEF2FF" />
        <KPITile label="Shipped this cycle" value={shipped} color="#059669" bg="#ECFDF5" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">All requests</h3>
          <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
            <Download size={13} />
            Export
          </button>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {[
                  { key: 'id', label: 'Request ID' },
                  { key: 'title', label: 'Title' },
                  { key: 'pipeline', label: 'Pipeline' },
                  { key: 'assigneeId', label: 'Owner' },
                  { key: 'internalDeadline', label: 'Urgency' },
                  { key: 'postDate', label: 'Post Date' },
                ].map(col => (
                  <th
                    key={col.key}
                    className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => toggleSort(col.key as keyof ContentRequest)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRequests.map(req => {
                const urgency = getUrgency(req);
                const days = daysToDeadline(req.internalDeadline);
                const urgencyPct = req.status === 'Done' ? 100 :
                  Math.max(0, Math.min(100, ((req.daysNeeded - days) / req.daysNeeded) * 100));
                const owner = USERS.find(u => u.id === req.assigneeId);
                const color = urgencyColor[urgency];

                return (
                  <tr key={req.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-[11px] font-mono text-gray-400">{req.id}</td>
                    <td className="px-5 py-3 text-[13px] font-medium text-gray-800 max-w-[200px] truncate">{req.title}</td>
                    <td className="px-5 py-3"><Badge pipeline={req.pipeline} /></td>
                    <td className="px-5 py-3 text-[12px] text-gray-600">{owner?.name ?? '—'}</td>
                    <td className="px-5 py-3 w-40">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${urgencyPct}%`, backgroundColor: color }}
                          />
                        </div>
                        <span className="text-[11px] font-medium w-14 text-right" style={{ color }}>
                          {req.status === 'Done' ? 'Shipped' : urgency.replace('-', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-gray-600">{format(req.postDate, 'MMM d, yyyy')}</span>
                        {currentUser.role === 'manager' && (
                          <button
                            onClick={() => openModal({ type: 'edit-post-date', requestId: req.id })}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Edit post date"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
