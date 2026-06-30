import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, exportApi } from '../services/api';
import { EmployeeTableRow } from '../components/Dashboard/EmployeeRow';
import { InsightsSummary } from '../components/Dashboard/InsightsSummary';
import type { DashboardFilters, EmployeePageResult } from '../types';
import { RefreshCw, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import clsx from 'clsx';

const DEFAULT_FILTERS: DashboardFilters = { tab: 'PulseCheck' };

const TABS: { key: DashboardFilters['tab']; label: string }[] = [
  { key: 'PulseCheck',    label: 'Pulse Check' },
  { key: 'ExitInterview', label: 'Exit Interview' },
  { key: 'VoiceBox',      label: 'Voice Box' },
];

const OTHER_SOURCES = [
  "Others", "Helpdesks", "Managers", "Compassion Space", "Email/Teams",
  "Employee Engagement / Experience Feedback", "Employee Review Platforms ( Ambition Box )",
  "Employee Review Platforms ( Glassdoor)", "Employee Review Platforms ( Google Business )",
  "Employee Review Platforms ( Others )", "Employee Touchpoints Feedback"
];

export function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [activeKpi, setActiveKpi] = useState<string>('total');
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const queryClient = useQueryClient();

  const formatParam = (val: string | string[] | undefined): string | undefined => {
    if (!val) return undefined;
    return Array.isArray(val) ? val.join(',') : val;
  };

  const queryParams: Record<string, string | number | undefined> = {
    tab: filters.tab,
    page: String(page),
    limit: '20',
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    status: formatParam(filters.status),
    priority: formatParam(filters.priority),
    nature: formatParam(filters.nature),
    ...(filters.tab === 'VoiceBox' ? { source: 'VoiceBox' } : {}),
    ...(activeKpi === 'resolved' ? { status: 'Resolved' } : {}),
    ...(activeKpi === 'new'      ? { status: 'Open' }     : {}),
    ...(activeKpi === 'urgent'   ? { priority: 'High' }   : {}),
    ...(activeKpi === 'late'     ? { flag: 'LateInput' }  : {}),
  };

  const { data, isLoading, isFetching, refetch: refetchEmployees } = useQuery<EmployeePageResult>({
    queryKey: ['dashboard-employees', queryParams],
    queryFn: () => dashboardApi.getEmployees(queryParams).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: summaryData, refetch: refetchSummary } = useQuery({
    queryKey: ['dashboard-summary'], 
    queryFn: () => dashboardApi.getSummary().then((r) => r.data),
  });

  const handleRefresh = async () => {
    await Promise.all([
      refetchEmployees(),
      refetchSummary(),
      queryClient.invalidateQueries({ queryKey: ['insights-latest'] })
    ]);
  };

  const handleFilterChange = useCallback((field: string, value: string) => {
    setActiveKpi('total'); 
    setFilters((f) => ({ ...f, [field]: value }));
    setPage(1);
  }, []);

  const handleTabChange = (tab: string) => {
    setFilters({ tab: tab as any }); 
    setActiveKpi('total');
    setPage(1);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await exportApi.csv(queryParams);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fms_dashboard_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async (parentId: number) => {
    if (window.confirm("Are you sure to delete this ticket?")) {
      try {
        await dashboardApi.deleteParentTicket(parentId);
        await handleRefresh();
      } catch (error: any) {
        console.error("Failed to delete ticket:", error);
      }
    }
  };

  const isOtherTabActive = !TABS.some(t => t.key === filters.tab);
  const totalRecords = data?.pagination?.total || 0;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto bg-[#F8F9FA] min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-damco-black">Dashboard</h2>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} disabled={isFetching} className="btn-secondary text-xs bg-white border-gray-200">
            <RefreshCw size={14} className={clsx(isFetching && 'animate-spin')} />
            Refresh
          </button>
          <button onClick={handleExport} disabled={isExporting} className="btn-primary text-xs bg-damco-red text-white font-bold px-4 py-2 rounded-lg transition-all" style={{background: '#E32200'}}>
            <Download size={14} className={clsx(isExporting && 'animate-bounce')} />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {[
          { id: 'total', label: 'Total Feedback', icon: 'fa-comments', value: summaryData?.total || 0, color: 'text-blue-500', bg: 'bg-blue-100' },
          { id: 'resolved', label: 'Total Resolutions', icon: 'fa-circle-check', value: summaryData?.resolved || 0, color: 'text-green-500', bg: 'bg-green-100' },
          { id: 'late', label: 'Total Late Inputs', icon: 'fa-clock-rotate-left', value: summaryData?.late || 0, color: 'text-orange-500', bg: 'bg-orange-100' },
          { id: 'new', label: 'Total New', icon: 'fa-box', value: summaryData?.new || 0, color: 'text-damco-red', bg: 'bg-red-100' },
          { id: 'urgent', label: 'Urgent Attention', icon: 'fa-circle-exclamation', value: summaryData?.urgent || 0, color: 'text-damco-red', bg: 'bg-red-100' },
        ].map((kpi) => (
          <div
            key={kpi.id}
            onClick={() => { setActiveKpi(kpi.id); setPage(1); }}
            className={clsx(
              "bg-white rounded-xl p-5 border cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg flex items-center gap-4",
              activeKpi === kpi.id ? "border-damco-red ring-1 ring-damco-red shadow-md" : "border-gray-200"
            )}
          >
            <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center shrink-0", kpi.bg)}>
              <i className={`fa-solid ${kpi.icon} text-xl ${kpi.color}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{kpi.label}</p>
              <p className="font-display text-2xl font-bold text-damco-black leading-tight">
                {kpi.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={filters.status || ''} onChange={(e) => handleFilterChange('status', e.target.value)} className="w-32 px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm font-bold text-damco-black outline-none focus:ring-0">
          <option value="" disabled hidden>Status</option>
          <option value="Open">New</option>
          <option value="Acknowledged">Acknowledged</option>
          <option value="InProgress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
          <option value="CWC">CWC</option>
        </select>
        <select value={filters.priority || ''} onChange={(e) => handleFilterChange('priority', e.target.value)} className="w-28 px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm font-bold text-damco-black outline-none focus:ring-0">
          <option value="" disabled hidden>Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <select value={filters.nature || ''} onChange={(e) => handleFilterChange('nature', e.target.value)} className="w-32 px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm font-bold text-damco-black outline-none focus:ring-0">
          <option value="" disabled hidden>Nature</option>
          <option value="Suggestion">Suggestion</option>
          <option value="Query">Query</option>
          <option value="Positive">Positive</option>
          <option value="Negative/Grievance">Negative/Grievance</option>
        </select>
        <button onClick={() => { setFilters(DEFAULT_FILTERS); setActiveKpi('total'); setPage(1); }} className="w-fit px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-bold text-damco-red hover:bg-gray-50 outline-none focus:ring-0 transition-colors">
          Clear Filters
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide items-end">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => handleTabChange(key)} className={clsx('px-8 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap outline-none focus:ring-0', filters.tab === key && !isOtherTabActive ? 'border-damco-red text-damco-red bg-red-50/30' : 'border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50')}>{label}</button>
          ))}
          
          <div className={clsx('flex items-center border-b-2 transition-all pl-2', isOtherTabActive ? 'border-damco-red bg-red-50/30' : 'border-transparent hover:bg-gray-50')}>
            <button 
              onClick={() => handleTabChange('Others')}
              className={clsx(
                "pl-4 py-4 text-sm font-bold outline-none whitespace-nowrap",
                isOtherTabActive ? "text-damco-red" : "text-gray-400 hover:text-gray-700"
              )}
            >
              Others
            </button>
            <select 
              value={isOtherTabActive ? filters.tab : "Others"} 
              onChange={(e) => handleTabChange(e.target.value)} 
              className={clsx(
                "px-3 py-4 text-sm font-bold bg-transparent outline-none cursor-pointer appearance-none ml-1", 
                isOtherTabActive ? "text-damco-red" : "text-gray-400 hover:text-gray-700"
              )}
            >
              <option value="Others" disabled hidden>▾</option>
              {OTHER_SOURCES.filter(s => s !== "Others").map((source) => (
                <option key={source} value={source} className="text-black bg-white">
                  {source}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[1000px] text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200">
                <th className="px-4 py-3 w-8" />
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Total Feedback</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Action Pending</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">High Priority Pending</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Oldest Pending</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Last Feedback Date</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && !data ? (
                <tr><td colSpan={10} className="p-16 text-center text-gray-400 font-bold animate-pulse">Fetching records...</td></tr>
              ) : (!data || data.data.length === 0) ? (
                <tr><td colSpan={10} className="py-24 text-center text-gray-400 font-bold">No records found for the current selection.</td></tr>
              ) : (
                data.data.map((row: any) => (
                  <EmployeeTableRow 
                    key={row.parentId} 
                    row={row} 
                    // FIXED: Explicitly allow flag to be string | null
                    onAssign={(id: number) => console.log('Assign logic:', id)} 
                    onFlag={(id: number, flag: string | null) => console.log('Flag logic:', id, flag)} 
                    onDelete={handleDelete} 
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {data && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50/30">
            <p className="text-xs font-bold text-gray-400">
              {totalRecords === 0 
                ? '0 Records' 
                : totalRecords === 1 
                  ? 'Showing 1 Record' 
                  : `Showing ${((page - 1) * 20) + 1} to ${Math.min(page * 20, totalRecords)} of ${totalRecords} Records`}
            </p>
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="p-2 disabled:opacity-30 hover:bg-gray-200 rounded-lg transition-colors"><ChevronLeft size={16} /></button>
                {Array.from({ length: Math.min(data.pagination.totalPages, 5) }).map((_, i) => (
                  <button key={i + 1} onClick={() => setPage(i + 1)} className={clsx('w-8 h-8 rounded-lg text-xs font-bold transition-all', page === i + 1 ? 'bg-damco-red text-white' : 'text-gray-500 hover:bg-gray-200')}>{i + 1}</button>
                ))}
                <button onClick={() => setPage((p) => p + 1)} disabled={page === data.pagination.totalPages} className="p-2 disabled:opacity-30 hover:bg-gray-200 rounded-lg transition-colors"><ChevronRight size={16} /></button>
              </div>
            )}
          </div>
        )}
      </div>
      <InsightsSummary onRefresh={handleRefresh} />
    </div>
  );
}