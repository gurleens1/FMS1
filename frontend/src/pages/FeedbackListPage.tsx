import React, { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { feedbackApi, userApi, exportApi } from '../services/api';
import { categoryApi } from '../services/categoryApi';
import type { FeedbackTicket, Assignee, PaginationMeta } from '../types';
import { StatusBadge, PriorityBadge, FlagBadge } from '../components/common/Badges';
import { Search, X, Download, RefreshCw, Eye, Filter, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import clsx from 'clsx';

function parseUtcDateOnly(value: string | undefined | null): Date | null {
  if (!value) return null;
  const dateOnly = value.split('T')[0];
  const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  }
  return null;
}

function getAgingDays(value: string | undefined | null): number {
  const startDate = parseUtcDateOnly(value);
  if (!startDate) return 0;
  const today = new Date();
  const utcStart = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(0, Math.floor((utcToday - utcStart) / (1000 * 60 * 60 * 24)));
}
 
const SOURCE_OPTIONS = [
  'Compassion Space', 'Emails/Teams', 'Employee Engagement/Experience Feedback',
  'Employee Review Platforms(Ambition Box)', 'Employee Review Platforms(Glassdoor)',
  'Employee Review Platforms (Google Business)', 'Employee Review Platforms (Others)',
  'Employee Touchpoints Feedback', 'Exit Interview', 'Helpdesks', 'Managers',
  'Others', 'Pulse Check', 'Voice Box'
];
 
// Categories will be fetched dynamically
 
const STATUS_OPTIONS = ['New', 'Acknowledged', 'In Progress', 'Resolved', 'Closed', 'CWC'];
const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];
const NATURE_OPTIONS = ['Suggestion', 'Query', 'Positive', 'Negative/Grievance'];
 
const PAGE_SIZES = [25, 50, 100];
 
interface Filters {
  search:    string;
  status:    string;
  priority:  string;
  nature:    string;
  source:    string;
  category:  string;
  assigneeId:string;
  employeeId:string; 
  dateFrom:  string;
  dateTo:    string;
}
 
const EMPTY_FILTERS: Filters = {
  search:'', status:'', priority:'', nature:'',
  source:'', category:'', assigneeId:'', employeeId: '', dateFrom:'', dateTo:'',
};
 
export function FeedbackListPage() {
  const navigate   = useNavigate();
  const { isAdmin, isSuperAdmin } = useAuth();
  const [searchParams] = useSearchParams();
 
  const [filters, setFilters] = useState<Filters>({
    ...EMPTY_FILTERS,
    employeeId: searchParams.get('employee') || '',
  });
  const [page, setPage]       = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting]     = useState(false);
 
  useEffect(() => {
    const empId = searchParams.get('employee');
    if (empId) {
      setFilters(f => ({ ...f, employeeId: empId }));
      setPage(1);
    }
  }, [searchParams]);
 
  const queryParams = {
    page:  String(page),
    limit: String(pageSize),
    ...(filters.search     ? { search:     filters.search }      : {}),
    ...(filters.status     ? { status:     filters.status }      : {}),
    ...(filters.priority   ? { priority:   filters.priority }    : {}),
    ...(filters.nature     ? { nature:     filters.nature }      : {}),
    ...(filters.source     ? { source:     filters.source.replace(/\s/g, '') } : {}),
    ...(filters.category   ? { category:   filters.category }    : {}),
    ...(filters.assigneeId ? { assigneeId: filters.assigneeId }  : {}),
    ...(filters.employeeId ? { employeeId: filters.employeeId }  : {}),
    ...(filters.dateFrom   ? { dateFrom:   filters.dateFrom }    : {}),
    ...(filters.dateTo     ? { dateTo:     filters.dateTo }      : {}),
  };
 
  const { data, isLoading, isFetching, refetch } = useQuery<{
    data: FeedbackTicket[]; pagination: PaginationMeta;
  }>({
    queryKey: ['feedback-list', queryParams],
    queryFn:  () => feedbackApi.list(queryParams).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
 
  const { data: assignees = [] } = useQuery<Assignee[]>({
    queryKey: ['assignees'],
    queryFn:  () => userApi.assignees().then((r) => r.data),
    enabled:  isAdmin || isSuperAdmin,
    staleTime: 300_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list().then((r) => r.data),
    staleTime: 300_000,
  });
 
  const setFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }, []);
 
  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    navigate('/feedback', { replace: true });
    setPage(1);
  }, [navigate]);
 
  const hasActiveFilters = Object.values(filters).some(Boolean);
 
  async function handleExport() {
    setExporting(true);
    try {
      const response = await exportApi.csv(queryParams);
      const url = URL.createObjectURL(new Blob([response.data as BlobPart]));
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `FMS_Export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }
 
  const totalPages = data?.pagination?.totalPages || 1;
  const ticketsList = Array.isArray(data) ? data : (data?.data || []);
  
  // FIXED: If pagination object is completely missing from API, strictly count the array length
  const totalRecords = data?.pagination?.total !== undefined ? data.pagination.total : ticketsList.length;
 
  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1600px] mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">Feedback List</h2>
          {data && (
            <p className="text-sm text-slate-500 mt-0.5">
              {totalRecords === 1 ? '1 Record' : `${totalRecords.toLocaleString()} Records`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx('btn-secondary text-xs gap-1.5', showFilters && 'bg-brand-50 border-brand-300 text-brand-700')}
          >
            <Filter size={13} />
            Filters
            {hasActiveFilters && (
              <span className="ml-0.5 bg-brand-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                {Object.values(filters).filter(Boolean).length}
              </span>
            )}
          </button>
          <button onClick={() => refetch()} disabled={isFetching} className="btn-ghost text-xs gap-1.5">
            <RefreshCw size={13} className={clsx(isFetching && 'animate-spin')} />
          </button>
          <button onClick={handleExport} disabled={exporting} className="btn-secondary text-xs gap-1.5">
            <Download size={13} />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>
 
      {/* ── Search bar ── */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          placeholder="Search by employee name, email, category…"
          className="form-input pl-9 pr-9"
        />
        {filters.search && (
          <button onClick={() => setFilter('search', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>
 
      {/* ── Filter panel ── */}
      {showFilters && (
        <div className="card p-4 animate-slide-down">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2">
              <div>
                <label className="form-label text-xs">From</label>
                <input type="date" value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)} className="form-input text-xs py-1.5 w-36" />
              </div>
              <div>
                <label className="form-label text-xs">To</label>
                <input type="date" value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)} className="form-input text-xs py-1.5 w-36" />
              </div>
            </div>
 
            <div>
              <label className="form-label text-xs">Source</label>
              <select value={filters.source} onChange={(e) => setFilter('source', e.target.value)} className="form-select text-xs py-1.5 w-36">
                <option value="">Source</option>
                {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
 
            <div>
              <label className="form-label text-xs">Assignee</label>
              <select value={filters.assigneeId} onChange={(e) => setFilter('assigneeId', e.target.value)} className="form-select text-xs py-1.5 w-44">
                <option value="">Assignee</option>
                {assignees.map((a) => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
              </select>
            </div>
 
            <div>
              <label className="form-label text-xs">Category</label>
              <select value={filters.category} onChange={(e) => setFilter('category', e.target.value)} className="form-select text-xs py-1.5 w-44">
                <option value="">Category</option>
                {categories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
 
            <div>
              <label className="form-label text-xs">Status</label>
              <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="form-select text-xs py-1.5 w-36">
                <option value="">Status</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
 
            <div>
              <label className="form-label text-xs">Priority</label>
              <select value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)} className="form-select text-xs py-1.5 w-28">
                <option value="">Priority</option>
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
 
            <div>
              <label className="form-label text-xs">Nature</label>
              <select value={filters.nature} onChange={(e) => setFilter('nature', e.target.value)} className="form-select text-xs py-1.5 w-28">
                <option value="">Nature</option>
                {NATURE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
 
            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn-ghost text-xs gap-1.5 mb-0.5">
                <X size={12} /> Clear All
              </button>
            )}
          </div>
        </div>
      )}
 
      {/* ── Table ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr>
                <th className="table-th">ID</th>
                <th className="table-th">Primary Assignee</th>
                <th className="table-th">Source</th>
                <th className="table-th">Created By</th>
                <th className="table-th">Reg. Date</th>
                <th className="table-th">Category</th>
                <th className="table-th">Priority</th>
                <th className="table-th">Nature</th>
                <th className="table-th">Status</th>
                <th className="table-th">Flag</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 11 }).map((__, j) => (
                      <td key={j} className="table-td">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : ticketsList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Search size={32} className="text-slate-200" />
                      <p className="text-sm font-medium">No records found</p>
                      {hasActiveFilters && (
                        <button onClick={clearFilters} className="text-brand-600 text-xs hover:underline">
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                ticketsList.map((ticket) => (
                  <TicketRow key={ticket.id} ticket={ticket} onView={() => navigate(`/feedback/${ticket.id}`)} />
                ))
              )}
            </tbody>
          </table>
        </div>
 
        {/* ── Pagination ── */}
        {data && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-surface-muted/50">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                {/* FIXED: Bottom left string display uses the accurate length check */}
                {totalRecords === 0 
                  ? '0 Records' 
                  : totalRecords === 1 
                    ? '1 Record' 
                    : `${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, totalRecords)} of ${totalRecords.toLocaleString()} Records`}
              </span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="text-xs border border-surface-border rounded-lg px-2 py-1 bg-white text-slate-600"
              >
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
              </select>
            </div>
 
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1} className="btn-ghost p-1.5 text-xs disabled:opacity-40">«</button>
                <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="btn-ghost p-1.5 disabled:opacity-40">
                  <ChevronLeft size={15} />
                </button>
  
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 7) { p = i + 1; }
                  else if (page <= 4) { p = i + 1; }
                  else if (page >= totalPages - 3) { p = totalPages - 6 + i; }
                  else { p = page - 3 + i; }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={clsx(
                        'w-7 h-7 rounded text-xs font-medium transition-colors',
                        p === page ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-surface-subtle'
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
  
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="btn-ghost p-1.5 disabled:opacity-40">
                  <ChevronRight size={15} />
                </button>
                <button onClick={() => setPage(totalPages)} disabled={page >= totalPages} className="btn-ghost p-1.5 text-xs disabled:opacity-40">»</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
 
// ── Individual row ──
function TicketRow({ ticket, onView }: { ticket: FeedbackTicket; onView: () => void }) {
  const SOURCE_LABELS: Record<string, string> = {
    PulseCheck: 'Pulse Check',
    ExitInterview: 'Exit Interview',
    VoiceBox: 'Voice Box',
    Individual: 'Individual',
    Other: 'Other',
    OthersHelpdesks: 'Helpdesks',
    OthersManagers: 'Managers'
  };
 
  const tData = ticket as any; 
 
  const getFlag = () => {
    if (['Resolved', 'Closed', 'Deleted'].includes(ticket.status)) return null;
    const daysDiff = getAgingDays(ticket.feedbackRegistrationDate || ticket.createdAt);
    if (daysDiff >= 6) return 'LateInput';
    if (daysDiff >= 3) return 'Warning';
    return ticket.flag || null;
  };

  return (
    <tr className="hover:bg-surface-muted/50 transition-colors cursor-pointer" onClick={onView}>
      <td className="table-td">
        <span className="font-mono text-xs text-brand-600 font-medium">{ticket.feedbackId}</span>
      </td>
      <td className="table-td">
        <span className="text-xs text-slate-700 font-bold">
          {/* FIXED: Checks nested employee tree for true profile Name mapping */}
          {tData.assignee?.employee?.fullName || tData.assignee?.name || tData.assigneeName || tData.primaryAssignee || 'Unassigned'}
        </span>
      </td>
      <td className="table-td">
        <span className="text-slate-600 text-xs font-medium">{tData.feedbackSourceDisplay || SOURCE_LABELS[ticket.feedbackSource] || ticket.feedbackSource}</span>
      </td>
      <td className="table-td">
        <div>
          <p className="text-slate-800 font-medium text-xs">{tData.employee?.fullName || tData.employeeName || 'Anonymous'}</p>
          {(tData.employee?.department || tData.empDepartment) && (
            <p className="text-slate-400 text-[10px] font-bold">{tData.employee?.department || tData.empDepartment}</p>
          )}
        </div>
      </td>
      <td className="table-td">
        <span className="text-xs text-slate-500 font-mono">
          {(() => {
            const parsed = parseUtcDateOnly(ticket.feedbackRegistrationDate || ticket.createdAt);
            return parsed ? format(parsed, 'yyyy-MM-dd') : ticket.createdAt ? format(new Date(ticket.createdAt), 'yyyy-MM-dd') : '—';
          })()}
        </span>
      </td>
      <td className="table-td">
        <span className="text-slate-700 text-xs font-medium">{ticket.category}</span>
      </td>
      <td className="table-td">
        <PriorityBadge priority={ticket.priority} />
      </td>
      <td className="table-td">
        <span className="text-slate-700 text-xs font-medium">{ticket.nature || '—'}</span>
      </td>
      <td className="table-td">
        <StatusBadge status={ticket.statusDisplay || ticket.status} />
      </td>
      <td className="table-td">
        <FlagBadge flag={getFlag()} />
      </td>
      <td className="table-td" onClick={(e) => { e.stopPropagation(); onView(); }}>
        <button className="p-1.5 hover:bg-slate-200 rounded-lg" title="View">
          <Eye size={14} />
        </button>
      </td>
    </tr>
  );
}