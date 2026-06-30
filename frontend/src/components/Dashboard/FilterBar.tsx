import React, { useState } from 'react';
import { X, Download, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { userApi, exportApi } from '../../services/api';
import type { Assignee, DashboardFilters } from '../../types';
import { useAuth } from '../../hooks/useAuth';

const DATE_RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom' },
];

// EXACT REAL OPTIONS REQUESTED
const STATUS_OPTIONS = [
  { value: 'Open', label: 'New' }, // Maps 'Open' from DB to 'New' on frontend
  { value: 'Acknowledged', label: 'Acknowledged' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Closed', label: 'Closed' },
  { value: 'CWC', label: 'CWC' }
];

const PRIORITY_OPTIONS = [
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' }
];

const NATURE_OPTIONS = [
  { value: 'Suggestion', label: 'Suggestion' },
  { value: 'Query', label: 'Query' },
  { value: 'Positive', label: 'Positive' },
  { value: 'Negative/Grievance', label: 'Negative/Grievance' }
];

interface FilterBarProps {
  filters: DashboardFilters;
  onChange: (f: Partial<DashboardFilters>) => void;
  onClear: () => void;
}

export function FilterBar({ filters, onChange, onClear }: FilterBarProps) {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [dateRange, setDateRange] = useState('30d');
  const [exporting, setExporting] = useState(false);

  const { data: assignees = [] } = useQuery<Assignee[]>({
    queryKey: ['assignees'],
    queryFn: () => userApi.assignees().then((r) => r.data),
    staleTime: 300_000,
  });

  function applyDateRange(val: string) {
    setDateRange(val);
    const now = new Date();
    const days = val === '7d' ? 7 : val === '30d' ? 30 : val === '90d' ? 90 : null;
    if (days) {
      const from = new Date(now.getTime() - days * 86400_000);
      onChange({ dateFrom: from.toISOString().split('T')[0], dateTo: undefined });
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params: Record<string, unknown> = {
        ...(filters.status ? { status: Array.isArray(filters.status) ? filters.status.join(',') : filters.status } : {}),
        ...(filters.priority ? { priority: Array.isArray(filters.priority) ? filters.priority.join(',') : filters.priority } : {}),
        ...(filters.nature ? { nature: Array.isArray(filters.nature) ? filters.nature.join(',') : filters.nature } : {}),
        ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
      };
      const response = await exportApi.csv(params);
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `FMS_Export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setExporting(false);
    }
  }

  // UPDATED SELECT COMPONENT: Uses 'disabled hidden' so the placeholder cannot be selected
  const Select = ({ label, value, options, onChange: onChg }: {
    label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
  }) => (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChg(e.target.value)}
        className="form-select pr-7 py-1.5 text-sm min-w-[130px] border-gray-300 rounded-md shadow-sm focus:ring-damco-red bg-white"
      >
        {/* This option shows before clicking, but disappears from the list of choices */}
        <option value="" disabled hidden>{label}</option>
        
        {/* ONLY REAL OPTIONS BELOW */}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="card p-4 bg-white shadow-sm border border-gray-100 rounded-xl mb-6">
      <div className="flex flex-wrap items-center gap-3">
        
        <Select
          label="Filter by Date"
          value={dateRange}
          options={DATE_RANGES}
          onChange={applyDateRange}
        />

        {/* STATUS FILTER */}
        <Select
          label="Select Status"
          value={Array.isArray(filters.status) ? filters.status[0] : (filters.status || '')}
          options={STATUS_OPTIONS}
          onChange={(v) => onChange({ status: v ? [v] : undefined })}
        />

        {/* PRIORITY FILTER */}
        <Select
          label="Select Priority"
          value={Array.isArray(filters.priority) ? filters.priority[0] : (filters.priority || '')}
          options={PRIORITY_OPTIONS}
          onChange={(v) => onChange({ priority: v ? [v] : undefined })}
        />

        {/* NATURE FILTER */}
        <Select
          label="Select Nature"
          value={Array.isArray(filters.nature) ? filters.nature[0] : (filters.nature || '')}
          options={NATURE_OPTIONS}
          onChange={(v) => onChange({ nature: v ? [v] : undefined })}
        />

        {/* ASSIGNEE FILTER (Admin Only) */}
        {isAdmin && (
          <Select
            label="Select Assignee"
            value={filters.assigneeId?.toString() || ''}
            options={assignees.map((a) => ({ value: String(a.id), label: a.name }))}
            onChange={(v) => onChange({ assigneeId: v ? parseInt(v) : undefined })}
          />
        )}

        <div className="flex-1" />

        {/* CLEAR BUTTON */}
        <button onClick={onClear} className="text-gray-500 hover:text-red-600 text-xs flex items-center gap-1 px-2 py-1 transition-colors">
          <X size={14} />
          Clear
        </button>

        <button onClick={handleExport} disabled={exporting} className="btn-secondary text-xs flex items-center gap-2 py-1.5 px-3 border border-gray-200 rounded-md hover:bg-gray-50">
          <Download size={14} />
          {exporting ? 'Exporting…' : 'Export'}
        </button>

        {['SuperAdmin', 'Admin', 'Assignee'].includes(user?.role || '') && (
          <button onClick={() => navigate('/feedback/new')} className="btn-primary text-xs flex items-center gap-2 py-1.5 px-4 rounded-md text-white font-bold" style={{ backgroundColor: '#E32200' }}>
            <PlusCircle size={14} />
            Add New Feedback
          </button>
        )}
      </div>
    </div>
  );
}