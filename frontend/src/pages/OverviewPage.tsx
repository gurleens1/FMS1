import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/api';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function OverviewPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState('6'); // June
  const [year, setYear] = useState('2026');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-overview', month, year],
    queryFn: () => dashboardApi.getOverview({ month, year }).then(r => r.data),
  });

  const categories = data?.categories || [];
  const sources = data?.sources || [];
  const total = data?.total || 1; // avoid div by 0

  return (
    <div className="page-container p-4 lg:p-6 max-w-7xl mx-auto bg-[#F8F9FA] min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-200 rounded-lg transition-colors bg-white border border-gray-200">
            <ArrowLeft size={16} />
          </button>
          <h2 className="font-display text-2xl font-bold text-damco-black">Overview Statistics</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-sm font-bold text-gray-500">Month</span>
            <select value={month} onChange={e => setMonth(e.target.value)} className="text-sm font-bold bg-transparent outline-none cursor-pointer">
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-sm font-bold text-gray-500">Year</span>
            <select value={year} onChange={e => setYear(e.target.value)} className="text-sm font-bold bg-transparent outline-none cursor-pointer">
              {['2024', '2025', '2026'].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button onClick={() => refetch()} className="p-2 hover:bg-gray-200 rounded-lg transition-colors bg-white border border-gray-200">
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-damco-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category Statistics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-center font-bold text-gray-900 mb-8">Feedback Category Statistics</h3>
            <div className="space-y-4">
              {categories.map((c: any) => {
                const percentage = ((c.count / total) * 100).toFixed(2);
                return (
                  <div key={c.name} className="flex items-center gap-4 text-sm font-bold">
                    <div className="w-1/3 text-right text-gray-600 truncate" title={c.name}>{c.name}</div>
                    <div className="w-2/3 flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 h-6">
                        <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                      </div>
                      <div className="w-16 text-xs text-gray-500">{percentage}%</div>
                    </div>
                  </div>
                );
              })}
              {categories.length === 0 && <div className="text-center text-gray-400 py-10">No data for selected period</div>}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-6 border-t pt-4 px-20">
              <span>0%</span>
              <span>14%</span>
              <span>28%</span>
              <span>42%</span>
              <span>56%</span>
              <span>70%</span>
            </div>
          </div>

          {/* Source Statistics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-center font-bold text-gray-900 mb-8">Feedback Source Statistics</h3>
            <div className="space-y-4">
              {sources.map((s: any) => {
                const percentage = ((s.count / total) * 100).toFixed(2);
                return (
                  <div key={s.name} className="flex items-center gap-4 text-sm font-bold">
                    <div className="w-1/3 text-right text-gray-600 truncate" title={s.name}>{s.name}</div>
                    <div className="w-2/3 flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 h-6">
                        <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                      </div>
                      <div className="w-16 text-xs text-gray-500">{percentage}%</div>
                    </div>
                  </div>
                );
              })}
              {sources.length === 0 && <div className="text-center text-gray-400 py-10">No data for selected period</div>}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-6 border-t pt-4 px-20">
              <span>0%</span>
              <span>14%</span>
              <span>28%</span>
              <span>42%</span>
              <span>56%</span>
              <span>70%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
