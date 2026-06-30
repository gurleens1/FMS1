import React from 'react';
import clsx from 'clsx';
import { AlertCircle, Clock, Flag, CheckCircle2 } from 'lucide-react';

// ── Status Badge ──
// Maps status to exact color scheme from original Power Fx logic
const STATUS_STYLES: Record<string, string> = {
  new:          'bg-blue-50 text-blue-700 border border-blue-200',
  open:         'bg-blue-50 text-blue-700 border border-blue-200',
  'in progress': 'bg-amber-50 text-amber-700 border border-amber-200',
  inprogress:   'bg-amber-50 text-amber-700 border border-amber-200',
  acknowledged: 'bg-violet-50 text-violet-700 border border-violet-200',
  resolved:     'bg-emerald-50 text-emerald-700 border border-emerald-200',
  closed:       'bg-red-50 text-red-700 border border-red-200',
  cwc:          'bg-lime-50 text-lime-700 border border-lime-200',
  'action planned': 'bg-sky-50 text-sky-700 border border-sky-200',
  voicebox:     'bg-orange-50 text-orange-700 border border-orange-200',
};

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/[_-]/g, ' ');
  const style = STATUS_STYLES[key] || 'bg-slate-50 text-slate-600 border border-slate-200';
  
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold capitalize', style)}>
      {(status.toLowerCase() === 'new' || status.toLowerCase() === 'open') && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
      {status === 'new' || status === 'Open' ? 'new' : status.toLowerCase()}
    </span>
  );
}

// ── Priority Badge ──
const PRIORITY_STYLES: Record<string, string> = {
  High:   'bg-red-50 text-red-700 border border-red-200',
  Medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  Low:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

export function PriorityBadge({ priority }: { priority: string }) {
  const style = PRIORITY_STYLES[priority] || 'bg-slate-50 text-slate-600 border border-slate-200';
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider', style)}>
      {priority}
    </span>
  );
}

// ── Aging Indicator ──
export function AgingIndicator({ days }: { days: number }) {
  let color = 'text-emerald-600 bg-emerald-50 border border-emerald-100';
  let icon = <CheckCircle2 size={10} className="mr-1" />;
  
  if (days >= 6) {
    color = 'text-red-600 bg-red-50 border border-red-100';
    icon = <AlertCircle size={10} className="mr-1" />;
  } else if (days >= 3) {
    color = 'text-amber-600 bg-amber-50 border border-amber-100';
    icon = <Clock size={10} className="mr-1" />;
  }

  return (
    <span className={clsx('inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap', color)}>
      {icon}
      {days} {days === 1 ? 'day' : 'days'}
    </span>
  );
}

// ── Flag Badge ──
// Updated to support the new dynamic backend flag logic
export function FlagBadge({ flag }: { flag: string | null | undefined }) {
  if (!flag) return <span className="text-slate-300 text-xs font-medium italic">—</span>;

  const isWarning = flag === 'Warning';
  const isUrgent = flag === 'UrgentAttention';
  const isLate = flag === 'LateInput' || flag === 'Critical';

  if (isWarning) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">
        <Flag size={10} className="fill-amber-600" />
        WARNING
      </span>
    );
  }

  if (isLate || isUrgent) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">
        <Flag size={10} className="fill-red-600" />
        {isUrgent ? 'URGENT' : 'LATE INPUT'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
      <Flag size={10} />
      {flag.toUpperCase()}
    </span>
  );
}

// ── Trend Indicator ──
export function TrendIndicator({ value, inverse = false }: { value: number; inverse?: boolean }) {
  if (value === 0) return <span className="text-xs text-slate-400">—</span>;
  const isPositive = inverse ? value < 0 : value > 0;
  return (
    <span className={clsx('text-xs font-medium flex items-center gap-0.5',
      isPositive ? 'text-red-500' : 'text-emerald-500'
    )}>
      {value > 0 ? '↑' : '↓'} {Math.abs(value)} vs last month
    </span>
  );
}