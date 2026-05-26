import { useState, useRef } from 'react';
import {
  addDays, subDays, format, isSameDay, differenceInDays,
} from 'date-fns';
import { Maximize2, MoreHorizontal } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isRedAlert } from '../../utils/deadlineUtils';
import type { Pipeline } from '../../types';

/* ─── constants ─── */
const LEFT_W   = 264;   // px – left label column
const DAY_W    = 44;    // px – each day column
const ROW_H    = 52;    // px – request row height
const BAR_H    = 30;    // px – bar height
const BAR_TOP  = (ROW_H - BAR_H) / 2;

type WindowSize = 'Week' | '3 Weeks' | 'Month';
const WINDOW_DAYS: Record<WindowSize, number> = { Week: 7, '3 Weeks': 21, Month: 30 };

const PIPELINE_COLOR: Record<Pipeline, { bar: string; light: string; text: string }> = {
  'PM':          { bar: '#7C3AED', light: '#EDE9FE', text: '#fff' },
  'Content':     { bar: '#0EA5E9', light: '#E0F2FE', text: '#fff' },
  'Art / Design':{ bar: '#EC4899', light: '#FCE7F3', text: '#fff' },
  'Events':      { bar: '#F59E0B', light: '#FEF3C7', text: '#fff' },
};

const PIPELINES: Pipeline[] = ['PM', 'Content', 'Art / Design', 'Events'];

/* ─── helpers ─── */
function groupDaysByMonth(days: Date[]) {
  const groups: { label: string; count: number }[] = [];
  days.forEach(d => {
    const lbl = format(d, 'MMM yyyy');
    if (groups.length && groups[groups.length - 1].label === lbl) {
      groups[groups.length - 1].count++;
    } else {
      groups.push({ label: lbl, count: 1 });
    }
  });
  return groups;
}

/* ─── component ─── */
export default function GanttView() {
  const { filteredRequests: requests, openModal } = useApp();
  const [windowSize, setWindowSize] = useState<WindowSize>('3 Weeks');
  const scrollRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const numDays = WINDOW_DAYS[windowSize];
  const windowStart = subDays(today, Math.floor(numDays / 4));
  const days = Array.from({ length: numDays }, (_, i) => addDays(windowStart, i));
  const monthGroups = groupDaysByMonth(days);
  const timelineW = numDays * DAY_W;
  const todayOffset = differenceInDays(today, windowStart) * DAY_W;

  /* Bar geometry */
  const getBar = (postDate: Date, daysNeeded: number) => {
    const rawStart = subDays(postDate, daysNeeded);
    const rawEnd   = postDate;
    const visStart = rawStart < windowStart ? windowStart : rawStart;
    const visEnd   = rawEnd > addDays(windowStart, numDays - 1) ? addDays(windowStart, numDays - 1) : rawEnd;
    if (visStart > visEnd) return null;
    const left  = differenceInDays(visStart, windowStart) * DAY_W;
    const width = (differenceInDays(visEnd, visStart) + 1) * DAY_W;
    const clippedLeft  = rawStart < windowStart;
    const clippedRight = rawEnd > addDays(windowStart, numDays - 1);
    return { left, width, clippedLeft, clippedRight };
  };

  return (
    <div className="flex flex-col h-full bg-app-bg">
      {/* ── top bar ── */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-900">Production timeline</h2>
          <button className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors">
            <MoreHorizontal size={15} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Window toggle */}
          <div className="flex items-center gap-0.5 p-1 bg-gray-100 rounded-lg">
            {(['Week', '3 Weeks', 'Month'] as WindowSize[]).map(v => (
              <button
                key={v}
                onClick={() => setWindowSize(v)}
                className={`px-3 py-1 rounded-md text-[12px] font-medium transition-all ${
                  windowSize === v
                    ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors" aria-label="Expand">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* ── gantt body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── sticky left label panel ── */}
        <div className="flex-shrink-0 flex flex-col bg-white border-r border-gray-200 z-10" style={{ width: LEFT_W }}>
          {/* header spacer (month row + day row) */}
          <div className="border-b border-gray-200 bg-gray-50 flex-shrink-0" style={{ height: 56 }}>
            <div className="px-4 h-full flex items-end pb-2">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Request / Pipeline</span>
            </div>
          </div>

          {/* swimlane rows */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden" id="left-scroll">
            {PIPELINES.map(pipeline => {
              const pipeReqs = requests.filter(r => r.pipeline === pipeline);
              if (pipeReqs.length === 0) return null;
              const clr = PIPELINE_COLOR[pipeline];

              return (
                <div key={pipeline}>
                  {/* swimlane header */}
                  <div
                    className="flex items-center gap-2 px-4 border-b border-gray-100"
                    style={{ height: 36, backgroundColor: clr.light + '60' }}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: clr.bar }} />
                    <span className="text-[12px] font-bold" style={{ color: clr.bar }}>{pipeline}</span>
                  </div>
                  {/* request label rows */}
                  {pipeReqs.map(req => (
                    <div
                      key={req.id}
                      className="flex flex-col justify-center px-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ height: ROW_H }}
                      onClick={() => openModal({ type: 'designer-task', requestId: req.id })}
                    >
                      <p className="text-[11px] font-mono text-gray-400 leading-none mb-0.5 truncate">{req.id}</p>
                      <p className="text-[12px] font-semibold text-gray-800 truncate leading-snug">{req.title}</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── scrollable timeline ── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto"
          onScroll={e => {
            const leftEl = document.getElementById('left-scroll');
            if (leftEl) leftEl.scrollTop = (e.target as HTMLDivElement).scrollTop;
          }}
        >
          <div style={{ width: timelineW, minWidth: '100%' }}>

            {/* ── date headers ── */}
            <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200" style={{ height: 56 }}>
              {/* Month row */}
              <div className="flex border-b border-gray-100" style={{ height: 24 }}>
                {monthGroups.map((g, i) => (
                  <div
                    key={i}
                    className="flex items-center px-2 border-r border-gray-200 last:border-r-0"
                    style={{ width: g.count * DAY_W, minWidth: g.count * DAY_W }}
                  >
                    <span className="text-[11px] font-semibold text-gray-500">{g.label}</span>
                  </div>
                ))}
              </div>
              {/* Day row */}
              <div className="flex" style={{ height: 32 }}>
                {days.map(day => {
                  const isT = isSameDay(day, today);
                  return (
                    <div
                      key={day.toISOString()}
                      className={`flex-shrink-0 flex flex-col items-center justify-center border-r border-gray-100 last:border-r-0 ${isT ? 'bg-indigo-50' : ''}`}
                      style={{ width: DAY_W }}
                    >
                      <span className="text-[10px] text-gray-400 leading-none">{format(day, 'EEE')[0]}</span>
                      <span className={`text-[12px] font-bold leading-none mt-0.5 ${isT ? 'text-indigo-600' : 'text-gray-600'}`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── swimlanes with bars ── */}
            {PIPELINES.map(pipeline => {
              const pipeReqs = requests.filter(r => r.pipeline === pipeline);
              if (pipeReqs.length === 0) return null;
              const clr = PIPELINE_COLOR[pipeline];

              return (
                <div key={pipeline}>
                  {/* swimlane header strip */}
                  <div
                    className="relative border-b border-gray-100"
                    style={{ height: 36, backgroundColor: clr.light + '60' }}
                  >
                    {/* today line */}
                    {todayOffset >= 0 && todayOffset < timelineW && (
                      <div className="absolute top-0 bottom-0 w-px bg-indigo-400/40 z-10" style={{ left: todayOffset + DAY_W / 2 }} />
                    )}
                    {/* column lines */}
                    {days.map((d, i) => (
                      <div
                        key={d.toISOString()}
                        className={`absolute top-0 bottom-0 border-r ${isSameDay(d, today) ? 'border-indigo-200/60' : 'border-gray-100'}`}
                        style={{ left: i * DAY_W, width: DAY_W }}
                      />
                    ))}
                  </div>

                  {/* request rows */}
                  {pipeReqs.map(req => {
                    const bar = getBar(req.postDate, req.daysNeeded);
                    const alert = isRedAlert(req);

                    return (
                      <div
                        key={req.id}
                        className="relative border-b border-gray-50"
                        style={{ height: ROW_H }}
                      >
                        {/* column backgrounds + lines */}
                        {days.map((d, i) => (
                          <div
                            key={d.toISOString()}
                            className={`absolute top-0 bottom-0 border-r border-gray-100 ${isSameDay(d, today) ? 'bg-indigo-50/50' : ''}`}
                            style={{ left: i * DAY_W, width: DAY_W }}
                          />
                        ))}

                        {/* today vertical line */}
                        {todayOffset >= 0 && todayOffset < timelineW && (
                          <div
                            className="absolute top-0 bottom-0 w-px bg-indigo-400 z-10 pointer-events-none"
                            style={{ left: todayOffset + DAY_W / 2 }}
                          />
                        )}

                        {/* the bar */}
                        {bar && (
                          <button
                            onClick={() => openModal({ type: 'designer-task', requestId: req.id })}
                            className="absolute flex items-center px-3 z-20 transition-all hover:opacity-90 hover:shadow-md active:scale-[0.99] group"
                            style={{
                              left: bar.left + 2,
                              width: bar.width - 4,
                              top: BAR_TOP,
                              height: BAR_H,
                              backgroundColor: clr.bar,
                              borderRadius: `${bar.clippedLeft ? 0 : 20}px ${bar.clippedRight ? 0 : 20}px ${bar.clippedRight ? 0 : 20}px ${bar.clippedLeft ? 0 : 20}px`,
                              boxShadow: `0 2px 8px ${clr.bar}55`,
                              outline: alert ? `2px solid #EF4444` : 'none',
                              outlineOffset: 1,
                            }}
                            aria-label={req.title}
                          >
                            {/* Glossy shine */}
                            <div
                              className="absolute inset-0 opacity-20 pointer-events-none"
                              style={{
                                borderRadius: 'inherit',
                                background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 60%)',
                              }}
                            />
                            <span className="text-[11px] font-semibold text-white truncate relative z-10 drop-shadow-sm">
                              {alert && '⏰ '}
                              {req.title}
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

          </div>
        </div>
      </div>
    </div>
  );
}
