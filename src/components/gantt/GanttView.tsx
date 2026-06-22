import { useRef, useMemo } from 'react';
import { addDays, subDays, format, isSameDay, differenceInDays, startOfDay } from 'date-fns';
import { useApp } from '../../context/AppContext';
import { isRedAlert } from '../../utils/deadlineUtils';
import { canViewAllRequests } from '../../utils/permissions';
import type { Pipeline } from '../../types';

/* ─── layout ─── */
const LEFT_W  = 220;
const DAY_W   = 44;
const ROW_H   = 84;
const HDR_H   = 74;
const NUM_DAYS = 21;
const BAR_TOP  = 18;
const BAR_H    = 24;

const CLR: Record<Pipeline, { bar: string; post: string; bg: string }> = {
  'PM':                   { bar: '#2d3e6b', post: '#8ca0d0', bg: '#e8ebf1' },
  'Organic':              { bar: '#2e6644', post: '#7ab58f', bg: '#d5e8dc' },
  'Internal requirement': { bar: '#a9674d', post: '#c99a85', bg: '#f5ece7' },
  'Events':               { bar: '#b8882a', post: '#d4bb7a', bg: '#f7f1e3' },
};

const PIPELINES: Pipeline[] = ['PM', 'Organic', 'Internal requirement', 'Events'];

function monthGroups(days: Date[]) {
  const out: { label: string; count: number }[] = [];
  for (const d of days) {
    const lbl = format(d, 'MMM yyyy');
    if (out.length && out[out.length - 1].label === lbl) out[out.length - 1].count++;
    else out.push({ label: lbl, count: 1 });
  }
  return out;
}

export default function GanttView() {
  const { requests: allRequests, openModal, dateRange, activePipelines, currentUser } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  /* Role + pipeline filter only — Gantt manages its own time window */
  const requests = useMemo(() => {
    let r = allRequests;
    if (!canViewAllRequests(currentUser.role)) {
      r = r.filter(x =>
        x.requesterId === currentUser.id || x.ownerId === currentUser.id ||
        x.assigneeIds.includes(currentUser.id) || x.reviewerIds.includes(currentUser.id)
      );
    }
    if (activePipelines.length > 0) r = r.filter(x => activePipelines.includes(x.pipeline));
    return r;
  }, [allRequests, activePipelines, currentUser]);

  const windowStart = useMemo(() =>
    dateRange.start ? startOfDay(dateRange.start) : subDays(today, 4),
    [dateRange.start, today]
  );

  const days      = Array.from({ length: NUM_DAYS }, (_, i) => addDays(windowStart, i));
  const timelineW = NUM_DAYS * DAY_W;
  const groups    = monthGroups(days);
  const todayPx   = differenceInDays(today, windowStart) * DAY_W + DAY_W / 2;

  /* ── pixel helpers ── */
  const clamp  = (v: number) => Math.max(0, Math.min(v, timelineW));
  /* left edge of a date's column */
  const px     = (d: Date) => clamp(differenceInDays(startOfDay(d), windowStart) * DAY_W);
  /* right edge of a date's column */
  const pxEnd  = (d: Date) => clamp((differenceInDays(startOfDay(d), windowStart) + 1) * DAY_W);
  /* center of a date's column */
  const pxMid  = (d: Date) => clamp(differenceInDays(startOfDay(d), windowStart) * DAY_W + DAY_W / 2);
  const inWin  = (d: Date) => { const diff = differenceInDays(startOfDay(d), windowStart); return diff >= 0 && diff < NUM_DAYS; };

  return (
    <div className="flex flex-col h-full" style={{ background: '#f8f7f4' }}>
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left panel ── */}
        <div
          className="flex-shrink-0 bg-white flex flex-col z-10"
          style={{ width: LEFT_W, borderRight: '1.5px solid #e8e8e8' }}
        >
          <div
            className="flex items-end px-5 flex-shrink-0 border-b"
            style={{ height: HDR_H, background: '#fafafa', borderColor: '#ebebeb' }}
          >
            <span className="text-[10px] font-black tracking-[0.14em] uppercase text-gray-400 pb-2.5">
              Request / Pipeline
            </span>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden" id="gantt-left">
            {PIPELINES.map(pipeline => {
              const reqs = requests.filter(r => r.pipeline === pipeline);
              if (!reqs.length) return null;
              const c = CLR[pipeline];
              return (
                <div key={pipeline}>
                  <div
                    className="flex items-center gap-2.5 px-5 border-b"
                    style={{ height: 40, background: c.bg, borderColor: '#e4e4e4' }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.bar }} />
                    <span className="text-[12px] font-black tracking-tight" style={{ color: c.bar }}>
                      {pipeline}
                    </span>
                  </div>
                  {reqs.map(req => (
                    <div
                      key={req.id}
                      onClick={() => openModal({ type: 'designer-task', requestId: req.id })}
                      className="flex flex-col justify-center px-5 border-b cursor-pointer hover:bg-gray-50/80 transition-colors"
                      style={{ height: ROW_H, borderColor: '#f3f3f3' }}
                    >
                      <span className="text-[10px] font-mono text-gray-400 mb-1">{req.id}</span>
                      <span className="text-[13px] font-bold text-gray-800 truncate leading-tight">{req.title}</span>
                    </div>
                  ))}
                </div>
              );
            })}
            {!requests.length && (
              <div className="flex items-center justify-center h-28 text-xs text-gray-400">
                No tasks match current filters
              </div>
            )}
          </div>
        </div>

        {/* ── Timeline ── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto"
          onScroll={e => {
            const el = document.getElementById('gantt-left');
            if (el) el.scrollTop = (e.target as HTMLDivElement).scrollTop;
          }}
          style={{ background: 'white' }}
        >
          <div style={{ width: Math.max(timelineW, 1), minWidth: '100%' }}>

            {/* Sticky header */}
            <div className="sticky top-0 z-20 bg-white border-b" style={{ height: HDR_H, borderColor: '#e8e8e8' }}>
              {/* Month row */}
              <div className="flex border-b" style={{ height: 28, borderColor: '#efefef', background: '#fafafa' }}>
                {groups.map((g, i) => (
                  <div
                    key={i}
                    className="flex items-center px-3 border-r last:border-r-0"
                    style={{ width: g.count * DAY_W, minWidth: g.count * DAY_W, borderColor: '#efefef' }}
                  >
                    <span className="text-[11px] font-bold text-gray-600">{g.label}</span>
                  </div>
                ))}
              </div>
              {/* Date + weekday row */}
              <div className="flex" style={{ height: 46, background: '#fafafa' }}>
                {days.map(d => {
                  const isT = isSameDay(d, today);
                  return (
                    <div
                      key={d.toISOString()}
                      className="flex-shrink-0 flex flex-col items-center justify-center gap-1 border-r last:border-r-0"
                      style={{
                        width: DAY_W,
                        borderColor: '#efefef',
                        background: isT ? '#eef2ff' : undefined,
                      }}
                    >
                      <span className={`text-[14px] font-bold leading-none ${isT ? 'text-indigo-600' : 'text-gray-700'}`}>
                        {format(d, 'd')}
                      </span>
                      <span className={`text-[10px] font-bold leading-none tracking-widest ${isT ? 'text-indigo-400' : 'text-gray-400'}`}>
                        {format(d, 'EEE').toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pipeline swimlanes */}
            {PIPELINES.map(pipeline => {
              const reqs = requests.filter(r => r.pipeline === pipeline);
              if (!reqs.length) return null;
              const c = CLR[pipeline];

              return (
                <div key={pipeline}>
                  {/* Pipeline label row */}
                  <div
                    className="relative border-b overflow-hidden"
                    style={{ height: 40, background: c.bg, borderColor: '#e4e4e4' }}
                  >
                    {days.map((d, i) => (
                      <div
                        key={d.toISOString()}
                        className="absolute top-0 bottom-0 border-r"
                        style={{ left: i * DAY_W, width: DAY_W, borderColor: 'rgba(0,0,0,0.04)' }}
                      />
                    ))}
                    {todayPx >= 0 && todayPx < timelineW && (
                      <div className="absolute top-0 bottom-0 pointer-events-none"
                        style={{ left: todayPx, width: 1.5, background: 'rgba(99,102,241,0.3)' }} />
                    )}
                  </div>

                  {/* Task rows */}
                  {reqs.map(req => {
                    const alert = isRedAlert(req);

                    /*
                     * ONE unified bar: [createdAt ──── dark ──── internalDeadline ── light ──── postDate]
                     * x0 = left edge of createdAt column
                     * x1 = left edge of internalDeadline column  (the color split)
                     * x2 = right edge of postDate column
                     *
                     * Both segments live inside a single <button> so there is zero gap.
                     */
                    const x0 = px(req.createdAt);
                    const x1 = px(req.internalDeadline);
                    const x2 = pxEnd(req.postDate);

                    const totalW = x2 - x0;
                    const darkW  = x1 - x0;
                    const lightW = x2 - x1;
                    const hasBar = totalW > 0;

                    const showDue  = inWin(req.internalDeadline);
                    const showPost = inWin(req.postDate) && !isSameDay(req.internalDeadline, req.postDate);

                    return (
                      <div
                        key={req.id}
                        className="relative border-b"
                        style={{ height: ROW_H, borderColor: '#f3f3f3', background: 'white' }}
                      >
                        {/* Column grid */}
                        {days.map((d, i) => {
                          const isT = isSameDay(d, today);
                          return (
                            <div
                              key={d.toISOString()}
                              className="absolute top-0 bottom-0 border-r"
                              style={{
                                left: i * DAY_W,
                                width: DAY_W,
                                borderColor: isT ? 'rgba(199,210,254,0.25)' : '#f3f3f3',
                                background: isT ? 'rgba(238,242,255,0.25)' : undefined,
                              }}
                            />
                          );
                        })}

                        {/* Today line */}
                        {todayPx >= 0 && todayPx < timelineW && (
                          <div
                            className="absolute top-0 bottom-0 z-20 pointer-events-none"
                            style={{ left: todayPx, width: 1.5, background: 'rgba(99,102,241,0.55)' }}
                          />
                        )}

                        {/* ── Dual-color bar (single element, zero seam) ── */}
                        {hasBar && (
                          <button
                            onClick={() => openModal({ type: 'designer-task', requestId: req.id })}
                            className="absolute z-10 overflow-hidden focus:outline-none hover:brightness-95 transition-[filter] cursor-pointer"
                            style={{
                              left:         x0,
                              width:        totalW,
                              top:          BAR_TOP,
                              height:       BAR_H,
                              borderRadius: 6,
                              boxShadow:    alert
                                ? `0 0 0 2px #ef4444, 0 2px 8px rgba(0,0,0,0.15)`
                                : `0 2px 8px rgba(0,0,0,0.12)`,
                            }}
                            aria-label={req.title}
                          >
                            {/* Dark segment — created → due */}
                            {darkW > 0 && (
                              <div
                                className="absolute inset-y-0"
                                style={{ left: 0, width: darkW, background: c.bar }}
                              />
                            )}
                            {/* Light segment — due → post */}
                            {lightW > 0 && (
                              <div
                                className="absolute inset-y-0"
                                style={{ left: darkW, right: 0, background: c.post }}
                              />
                            )}
                          </button>
                        )}

                        {/* Due date label */}
                        {showDue && (
                          <span
                            className="absolute z-30 pointer-events-none select-none"
                            style={{
                              left:         pxMid(req.internalDeadline),
                              top:          BAR_TOP + BAR_H + 6,
                              transform:    'translateX(-50%)',
                              fontSize:     10,
                              fontWeight:   700,
                              color:        '#92400e',
                              background:   '#fffbeb',
                              border:       '1.5px solid #fcd34d',
                              borderRadius: 4,
                              padding:      '2px 6px',
                              whiteSpace:   'nowrap',
                              lineHeight:   '15px',
                            }}
                          >
                            Due {format(req.internalDeadline, 'MMM d')}
                          </span>
                        )}

                        {/* Post date label */}
                        {showPost && (
                          <span
                            className="absolute z-30 pointer-events-none select-none"
                            style={{
                              left:         pxMid(req.postDate),
                              top:          BAR_TOP + BAR_H + 6,
                              transform:    'translateX(-50%)',
                              fontSize:     10,
                              fontWeight:   700,
                              color:        '#374151',
                              background:   '#ffffff',
                              border:       '1.5px solid #d1d5db',
                              borderRadius: 4,
                              padding:      '2px 6px',
                              whiteSpace:   'nowrap',
                              lineHeight:   '15px',
                            }}
                          >
                            Post {format(req.postDate, 'MMM d')}
                          </span>
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

      {/* ── Bottom legend + info ── */}
      <div className="bg-white border-t flex-shrink-0 px-6 py-4 flex flex-col gap-3" style={{ borderColor: '#e8e8e8' }}>
        <div className="flex items-center gap-6 flex-wrap">
          {PIPELINES.filter(p => requests.some(r => r.pipeline === p)).flatMap(p => {
            const c = CLR[p];
            return [
              <div key={`${p}-d`} className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                <span className="w-4 h-4 rounded-sm flex-shrink-0" style={{ background: c.bar }} />
                Due Date (Start – Due)
              </div>,
              <div key={`${p}-p`} className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                <span className="w-4 h-4 rounded-sm flex-shrink-0" style={{ background: c.post }} />
                Post Date (Due – Post)
              </div>,
            ];
          })}
        </div>

        <div
          className="flex gap-2.5 items-start rounded-xl p-3.5 text-[12px] text-gray-600"
          style={{ background: '#f9fafb', border: '1px solid #ebebeb' }}
        >
          <span className="text-[15px] text-gray-400 leading-none mt-0.5 flex-shrink-0">ⓘ</span>
          <div>
            <p className="font-semibold text-gray-700">
              Gantt bars start from the <strong>Created Date</strong> and end on the <strong>Post Date.</strong>
            </p>
            <p className="text-gray-500 mt-0.5">
              Each bar is divided into two sections:&nbsp;
              <strong className="text-gray-700">Dark color</strong> up to Due Date and&nbsp;
              <strong className="text-gray-700">Light color</strong> from Due Date to Post Date.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
