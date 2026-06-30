import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, TrendingUp, Clock, UserX, Timer } from 'lucide-react';
import { dashboardApi } from '../../services/api';
import type { DashboardSummary } from '../../types';
import { TrendIndicator } from '../common/Badges';
import clsx from 'clsx';

interface KpiCard {
  key: keyof Omit<DashboardSummary, 'trends'>;
  label: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trendKey: string;
  inverse?: boolean;
  suffix?: string;
}

const CARDS: KpiCard[] = [
  {
    key: 'total',
    label: 'Total Feedback',
    icon: TrendingUp,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    trendKey: 'total',
  },
  {
    key: 'resolved',
    label: 'Total Resolutions',
    icon: AlertCircle,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    trendKey: 'resolved',
  },
  {
    key: 'late',
    label: 'Total Late Inputs',
    icon: Clock,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    trendKey: 'late',
  },
  {
    key: 'new',
    label: 'Total New',
    icon: UserX,
    iconBg: 'bg-slate-50',
    iconColor: 'text-slate-600',
    trendKey: 'new',
  },
  {
    key: 'urgent',
    label: 'Urgent Attention',
    icon: Timer,
    iconBg: 'bg-brand-50',
    iconColor: 'text-brand-600',
    trendKey: 'urgent',
  },
];

export function SummaryCards() {
  const { data, isLoading } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.getSummary().then((r) => r.data),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {CARDS.map((_, i) => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-3 bg-slate-100 rounded w-2/3 mb-3" />
            <div className="h-8 bg-slate-100 rounded w-1/3 mb-2" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {CARDS.map(({ key, label, icon: Icon, iconBg, iconColor, trendKey, inverse, suffix }) => {
        const value = data[key] as number;
        const trend = data.trends?.[trendKey];

        return (
          <div key={key} className="card card-hover p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide leading-tight">
                {label}
              </p>
              <div className={clsx('p-1.5 rounded-lg', iconBg)}>
                <Icon size={14} className={iconColor} />
              </div>
            </div>
            <p className="font-display text-3xl font-bold text-slate-900 mb-1.5">
              {value}{suffix || ''}
            </p>
            {trend !== undefined && (
              <TrendIndicator value={trend} inverse={inverse} />
            )}
          </div>
        );
      })}
    </div>
  );
}
