import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, RefreshCw, TrendingUp, AlertTriangle, BarChart2 } from 'lucide-react';
import { insightsApi } from '../../services/api';
import type { AiInsight } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { AxiosResponse } from 'axios';

const INSIGHT_ICONS = { summary: BarChart2, trend: TrendingUp, anomaly: AlertTriangle };
const INSIGHT_COLORS = { summary: 'text-brand-600 bg-brand-50', trend: 'text-emerald-600 bg-emerald-50', anomaly: 'text-amber-600 bg-amber-50' };

export function InsightsSummary({ onRefresh }: { onRefresh?: () => void }) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: insights = [] } = useQuery<AiInsight[]>({
    queryKey: ['insights-latest'],
    queryFn: () => (insightsApi as any).latest().then((r: AxiosResponse<AiInsight[]>) => r.data),
    staleTime: 300_000,
  });

  const generate = useMutation({
    mutationFn: () => (insightsApi as any).generate().then((r: AxiosResponse<AiInsight[]>) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insights-latest'] });
      if (onRefresh) onRefresh();
    },
  });

  if (insights.length === 0 && !isAdmin) return null;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-50"><Sparkles size={14} className="text-brand-600" /></div>
          <h3 className="font-semibold text-slate-800 text-sm">Insights Summary</h3>
          {insights[0] && <span className="text-xs text-slate-400">· Updated {formatDistanceToNow(new Date(insights[0].generatedAt))} ago</span>}
        </div>
        {isAdmin && (
          <button onClick={() => generate.mutate()} disabled={generate.isPending} className="btn-ghost text-xs gap-1.5">
            <RefreshCw size={12} className={clsx(generate.isPending && 'animate-spin')} />
            {generate.isPending ? 'Generating…' : 'Refresh Insights'}
          </button>
        )}
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-6">
          <Sparkles size={24} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No insights generated yet.</p>
          {isAdmin && <button onClick={() => generate.mutate()} className="btn-primary mt-3 text-xs">Generate Insights</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {insights.slice(0, 3).map((insight) => {
            const insightType = insight.insightType as keyof typeof INSIGHT_ICONS;
            const Icon = INSIGHT_ICONS[insightType] || BarChart2;
            const colorClass = INSIGHT_COLORS[insightType] || INSIGHT_COLORS.summary;
            return (
              <div key={insight.id} className="flex items-start gap-3 p-3 rounded-lg bg-surface-subtle border border-surface-border">
                <div className={clsx('p-1.5 rounded-lg shrink-0', colorClass)}><Icon size={13} /></div>
                <p className="text-sm text-slate-600 leading-snug">{insight.insightText}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}