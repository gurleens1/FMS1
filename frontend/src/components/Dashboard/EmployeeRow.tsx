import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Eye, ExternalLink, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { EmployeeRow, ChildTicket } from '../../types';
import { StatusBadge, PriorityBadge, AgingIndicator } from '../common/Badges';
import { useAuth } from '../../hooks/useAuth';
import clsx from 'clsx';

interface EmployeeRowProps {
  row: EmployeeRow;
  onAssign: (ticketId: number) => void;
  onFlag: (ticketId: number, currentFlag: string | null) => void;
  onDelete?: (ticketId: number) => void; 
}

export function EmployeeTableRow({ row, onAssign, onFlag, onDelete }: EmployeeRowProps) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth(); 

  const canDelete = user?.role === 'SuperAdmin' || user?.role === 'Admin';
  const rowData = row as any;

  return (
    <>
      <tr
        className={clsx(
          'hover:bg-surface-muted transition-colors duration-100 cursor-pointer',
          expanded && 'bg-brand-50/50'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="table-td w-8 pl-4">
          <span className="text-slate-400 transition-transform duration-200 inline-block">
            {expanded ? <ChevronDown size={16} className="text-brand-600" /> : <ChevronRight size={16} />}
          </span>
        </td>

        <td className="table-td">
          <div>
            <p className="font-semibold text-slate-800">{row.employee.name}</p>
            <p className="text-slate-400 text-xs">{row.employee.code}</p>
          </div>
        </td>

        <td className="table-td">
          <span className="text-slate-700 text-sm font-bold">{rowData.feedbackSource}</span>
        </td>

        <td className="table-td">
          <span className="text-slate-600">{row.employee.department || '—'}</span>
        </td>

        <td className="table-td text-center">
          <span className="font-medium text-slate-700">{row.totalFeedback}</span>
        </td>

        <td className="table-td text-center">
          <span className={clsx(
            'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold',
            row.actionPending > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
          )}>
            {row.actionPending}
          </span>
        </td>

        <td className="table-td text-center">
          <span className={clsx(
            'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold',
            row.highPriorityPending > 0 ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-500'
          )}>
            {row.highPriorityPending}
          </span>
        </td>

        <td className="table-td">
          {rowData.oldestPendingDays !== undefined && rowData.oldestPendingDays !== null ? (
            <AgingIndicator days={rowData.oldestPendingDays} />
          ) : (
            <span className="text-xs font-medium text-slate-600">0 days</span>
          )}
        </td>

        <td className="table-td">
          <span className="text-slate-600 font-mono text-xs">
            {rowData.lastFeedbackDate ? format(new Date(rowData.lastFeedbackDate), 'yyyy-MM-dd') : '—'}
          </span>
        </td>

        <td className="table-td pr-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate(`/feedback?employee=${row.employee.id}`)}
              className="btn-ghost p-1.5 rounded-lg text-slate-600 hover:text-slate-900"
              title="View all feedback"
            >
              <Eye size={14} />
            </button>
            
            {canDelete && (
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if(onDelete) onDelete(rowData.parentId); 
                }}
                className="btn-ghost p-1.5 rounded-lg text-slate-600 hover:text-slate-900"
                title="Delete Ticket"
              >
                <Trash2 size={14} />
              </button>
            )}

          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={10} className="p-0">
            <div className="animate-slide-down bg-brand-50/30 border-y border-brand-100">
              <div className="px-8 py-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Feedback Details</p>
                <div className="card overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/50">
                        {['Feedback ID', 'Category', 'Priority', 'Status', 'Aging', 'Primary Assignee', 'Action'].map((h) => (
                          <th key={h} className="table-th text-[10px] uppercase text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {row.children.map((child) => (
                        <ChildTicketRow
                          key={child.id}
                          ticket={child}
                          onView={() => navigate(`/feedback/${child.id}`)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ChildTicketRow({ ticket, onView }: { ticket: ChildTicket; onView: () => void; }) {
  const tData = ticket as any; 
  // FIXED: Searches the nested employee data for the name!
  const realAssigneeName = tData.assignee?.employee?.fullName || tData.assigneeName || tData.primaryAssignee || 'Unassigned';

  return (
    <tr className="hover:bg-white transition-colors">
      <td className="table-td">
        <span className="font-mono text-xs text-brand-600 font-bold">{ticket.feedbackId}</span>
      </td>
      <td className="table-td">
        <span className="text-slate-700 text-xs font-medium">{ticket.category}</span>
      </td>
      <td className="table-td">
        <PriorityBadge priority={ticket.priority} />
      </td>
      <td className="table-td">
        <StatusBadge status={ticket.statusDisplay} />
      </td>
      <td className="table-td">
        {tData.agingDays !== undefined && tData.agingDays !== null ? (
            <AgingIndicator days={tData.agingDays} />
          ) : (
            <span className="text-xs font-medium text-slate-600">0 days</span>
        )}
      </td>
      <td className="table-td">
        <span className="text-slate-600 text-xs font-bold">
          {realAssigneeName}
        </span>
      </td>
      <td className="table-td">
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); onView(); }} 
            className="text-brand-600 hover:text-brand-800 text-xs font-bold flex items-center gap-1 group"
          >
            Open 
            <ExternalLink size={11} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </td>
    </tr>
  );
}