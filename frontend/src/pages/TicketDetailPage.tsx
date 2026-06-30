import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackApi, userApi } from '../services/api';
import { StatusBadge, PriorityBadge, AgingIndicator, FlagBadge } from '../components/common/Badges';
import { ArrowLeft, CheckCircle, Clock, User, MessageSquare, RefreshCw, Mail, Briefcase, Calendar, Building2, AlignLeft, Hash, Paperclip, FileText, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { CATEGORIES, NATURES } from '../constants/feedbackOptions';

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

function getAgingDays(ticket: any): number {
  const source = ticket.feedbackRegistrationDate || ticket.createdAt;
  const startDate = parseUtcDateOnly(source);
  if (!startDate) return ticket.agingDays ?? 0;
  const today = new Date();
  const utcStart = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(0, Math.floor((utcToday - utcStart) / (1000 * 60 * 60 * 24)));
}

const STATUS_OPTIONS = [
  { value: 'Open', label: 'Open' },
  { value: 'Acknowledged', label: 'Acknowledged' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Closed', label: 'Closed' },
  { value: 'CWC', label: 'CWC' }
];

export function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, isSuperAdmin } = useAuth();
  
  // Both Admin and SuperAdmin can edit ticket fields
  const canEdit = isSuperAdmin || isAdmin;
  const [showSuccess, setShowSuccess] = useState(false);
  const [adminFile, setAdminFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [editStatus, setEditStatus] = useState('');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editSecAssigneeId, setEditSecAssigneeId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPriority, setEditPriority] = useState('Medium');
  const [editCategory, setEditCategory] = useState('');
  const [editNature, setEditNature] = useState('');

  const { data: ticket, isLoading } = useQuery<any>({
    queryKey: ['ticket', id],
    queryFn: () => feedbackApi.get(Number(id)).then(r => r.data),
  });

  const { data: assignees = [] } = useQuery<any[]>({
    queryKey: ['assignees'],
    queryFn: () => userApi.assignees().then(r => r.data),
    enabled: canEdit,
  });

  useEffect(() => {
    if (ticket) {
      setEditStatus(ticket.status);
      setEditAssigneeId(ticket.assigneeId ? String(ticket.assigneeId) : '');
      setEditSecAssigneeId(ticket.secondaryAssigneeId ? String(ticket.secondaryAssigneeId) : '');
      // Reset the action notes input on open (do not prefill with existing saved notes)
      setEditNotes('');
      setEditPriority(ticket.priority || 'Medium');
      setEditCategory(ticket.category || '');
      setEditNature(ticket.nature || '');
    }
  }, [ticket]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => feedbackApi.update(Number(id), data),
    onSuccess: (updatedData) => {
      // Optimistically update the cache to reflect changes instantly
      queryClient.setQueryData(['ticket', id], (oldData: any) => {
          return {
              ...oldData,
              ...updatedData.data // Ensure the response data format matches
          };
      });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setShowSuccess(true);
      setEditNotes('');
      setTimeout(() => setShowSuccess(false), 3000);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      status: editStatus,
      assigneeId: editAssigneeId ? parseInt(editAssigneeId) : null,
      secondaryAssigneeId: editSecAssigneeId ? parseInt(editSecAssigneeId) : null,
      notes: editNotes,
      priority: editPriority,
      category: editCategory,
      nature: editNature
    });
  };

  const handleAdminFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAdminFile(e.target.files[0]);
    }
  };

  const uploadAdminFile = async () => {
    if (!adminFile) return;
    setUploadingFile(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(adminFile);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });

      await feedbackApi.uploadAttachment(Number(id), {
        fileName: adminFile.name,
        fileData: base64,
        mimeType: adminFile.type
      });

      setAdminFile(null);
      const fileInput = document.getElementById('admin-file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    } catch (err) {
      console.error('Failed to upload file:', err);
    } finally {
      setUploadingFile(false);
    }
  };

  if (isLoading) return <div className="p-10 text-center font-bold text-slate-400">Loading details...</div>;
  if (!ticket) return <div className="p-10 text-center font-bold text-red-500">Ticket Not Found</div>;

  // 1. Date & Aging
  const parsedRegDate = parseUtcDateOnly(ticket.feedbackRegistrationDate || ticket.createdAt) || new Date(ticket.createdAt);
  const agingDays = getAgingDays(ticket);

  // 2. Employee Details
  const empFullName = ticket.empFullName || ticket.employee?.fullName || ticket.parentTicket?.employee?.fullName || '';
  const empCode = ticket.empCode || ticket.employee?.employeeCode || ticket.parentTicket?.employee?.employeeCode || '';
  const empEmail = ticket.empEmail || ticket.employee?.email || ticket.parentTicket?.employee?.email || '';
  const empDesignation = ticket.empDesignation || ticket.employee?.designation || ticket.parentTicket?.employee?.designation || '';
  
  const rawDept = ticket.empDepartment || ticket.employee?.department || ticket.parentTicket?.employee?.department || '';
  const rawDiv = ticket.empDepartment || ticket.employee?.division || ticket.parentTicket?.employee?.division || '';
  const displayDivision = rawDiv || '—'; 
  const displayDepartment = rawDept || '—'; 
  
  // Joining Date Mapping logic
  const joiningDateValue = ticket.empJoiningDate || ticket.employee?.joiningDate || ticket.parentTicket?.employee?.joiningDate;
  const displayJoiningDate = joiningDateValue ? format(new Date(joiningDateValue), 'dd MMM yyyy') : '—';

  // 3. Names
  const createdByName = ticket.createdBy?.name || ticket.createdBy || empFullName || 'System';
  
  const primaryAssignee = (ticket.assigneeName && ticket.assigneeName !== 'Unassigned')
    ? ticket.assigneeName
    : (ticket.assignee?.employee?.fullName ||
       ticket.assignee?.name ||
       (ticket.assigneeId && assignees.find(a => a.id === Number(ticket.assigneeId))?.name) ||
       'Unassigned');
  
  // Robust Secondary Assignee Mapping
  const secondaryAssignee = (ticket.secondaryAssigneeName && ticket.secondaryAssigneeName !== 'None')
    ? ticket.secondaryAssigneeName
    : (ticket.secondaryAssignee?.employee?.fullName ||
       ticket.secondaryAssignee?.name ||
       (ticket.secondaryAssigneeId && assignees.find(a => a.id === Number(ticket.secondaryAssigneeId))?.name) ||
       'None');

  // 4. Feedback Text, Source, & Title
  const feedbackTitle = ticket.feedbackTitle || ticket.title || '—';
  
  // Strict check for Employee Feedback Description from DB mapping (must NEVER fallback to internal notes)
  const rawEmployeeDesc = ticket.employeeFeedbackDescription || ticket.description || '';
  const feedbackDescription = rawEmployeeDesc.trim() ? rawEmployeeDesc : 'No additional comments were provided by the employee during registration.';
  
  const displaySource = ticket.feedbackSourceDisplay || ticket.feedbackSource || '—';

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      {showSuccess && (
        <div className="fixed top-6 right-6 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-2 z-50 animate-slide-down">
          <CheckCircle size={18} /> <span className="font-bold">Update Successful</span>
        </div>
      )}

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-damco-red font-bold text-xs uppercase transition-colors">
        <ArrowLeft size={14} /> Back to Feedback List
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-red-50 text-damco-red font-bold text-[10px] rounded-full border border-red-100 uppercase tracking-tighter">
                    {ticket.feedbackId || `FB-${String(ticket.id).padStart(4, '0')}`}
                  </span>
                  <StatusBadge status={ticket.statusDisplay || ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                  <FlagBadge flag={ticket.flag} />
                  {ticket.isAnonymous && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase tracking-wider">
                      Anonymous
                    </span>
                  )}
                  {ticket.isConfidential && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded uppercase tracking-wider">
                      Confidential
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-slate-900 leading-tight">{ticket.category}</h1>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1">Aging</p>
                <AgingIndicator days={agingDays} />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-8 gap-x-4">
              {[
                { label: 'Feedback Title ', value: feedbackTitle },
                { label: 'Feedback Source', value: displaySource },
                { label: 'Nature of Input', value: ticket.nature || '—' },
                { label: 'Assignment Number', value: ticket.assignmentNumber?.toString() || '1' },
                { label: 'Created By', value: createdByName },
                { label: 'Registration Date', value: format(parsedRegDate, 'dd MMM yyyy') },
                { label: 'Primary Assignee', value: primaryAssignee },
                { label: 'Secondary Assignee', value: secondaryAssignee },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{item.label}</p>
                  <p className="text-sm font-bold text-slate-700">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 bg-blue-50/50 p-6 rounded-2xl border border-blue-100/50">
              <h3 className="text-[10px] font-bold text-blue-400 uppercase mb-3 flex items-center gap-2 tracking-widest">
                <MessageSquare size={14} /> Employee Feedback Description
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed italic whitespace-pre-wrap">
                "{feedbackDescription}"
              </p>
            </div>

          <div className="mt-6 bg-white p-6 rounded-2xl border border-slate-100">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest">Ticket Comment</h3>
            <div className="space-y-4">
              {ticket.activities && ticket.activities.length > 0 && (
                ticket.activities.map((a: any) => (
                  <div key={a.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[12px] text-slate-600 font-bold">{a.performer?.employee?.fullName || a.performer?.name || 'System'}</div>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap mt-1 leading-relaxed">{a.action || ''}</div>
                    <div className="text-xs text-slate-400 mt-2">{a.timestamp ? format(new Date(a.timestamp), 'dd MMM yyyy HH:mm') : ''}</div>
                  </div>
                ))
              )}
              {ticket.internalNotes ? (
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100">
                  <div className="text-[12px] text-amber-700 font-bold mb-1">Saved Notes (Legacy)</div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ticket.internalNotes}</div>
                </div>
              ) : null}
              {(!ticket.activities || ticket.activities.length === 0) && !ticket.internalNotes && (
                <div className="text-sm text-slate-400 italic py-2">No comments have been added yet.</div>
              )}
            </div>
          </div>
          </div>

          {!ticket.isAnonymous && (
            <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-8 flex items-center gap-2">
                <User size={18} className="text-damco-red" /> Employee Identity & Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  { label: 'Full Name', value: empFullName || '—', icon: User },
                  { label: 'Employee Code', value: empCode || '—', icon: Hash },
                  { label: 'Email', value: empEmail || '—', icon: Mail },
                  { label: 'Designation', value: empDesignation || '—', icon: Briefcase },
                  { label: 'Division', value: displayDivision || '—', icon: AlignLeft },
                  { label: 'Department', value: displayDepartment, icon: Building2 },
                  { label: 'Joining Date', value: displayJoiningDate, icon: Calendar },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 shrink-0">
                      <item.icon size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{item.label}</p>
                      <p className="text-sm font-bold text-slate-700">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments Section */}
          <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Paperclip size={18} className="text-damco-red" /> Attachments
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Employee Uploaded Attachments */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Employee Attachments</h4>
                {ticket.attachments && ticket.attachments.filter((a: any) => a.uploadedByRole === 'Employee').length > 0 ? (
                  <div className="space-y-2">
                    {ticket.attachments.filter((a: any) => a.uploadedByRole === 'Employee').map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                          <FileText size={16} className="text-slate-400 shrink-0" />
                          <span className="text-xs font-bold text-slate-700 truncate" title={a.fileName}>{a.fileName}</span>
                        </div>
                        <a 
                          href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/feedback/attachments/download/${a.id}?token=${localStorage.getItem('fms_auth_token')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-red-50 text-damco-red hover:bg-damco-red hover:text-white rounded-xl text-[10px] font-bold uppercase transition-all shrink-0"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No employee attachments uploaded.</p>
                )}
              </div>

              {/* Admin/SuperAdmin Uploaded Attachments */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admin/SuperAdmin Attachments</h4>
                {ticket.attachments && ticket.attachments.filter((a: any) => a.uploadedByRole !== 'Employee').length > 0 ? (
                  <div className="space-y-2">
                    {ticket.attachments.filter((a: any) => a.uploadedByRole !== 'Employee').map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                          <FileText size={16} className="text-slate-400 shrink-0" />
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-xs font-bold text-slate-700 truncate" title={a.fileName}>{a.fileName}</span>
                            <span className="text-[9px] text-slate-400 font-bold">Uploaded by {a.uploadedByRole}</span>
                          </div>
                        </div>
                        <a 
                          href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/feedback/attachments/download/${a.id}?token=${localStorage.getItem('fms_auth_token')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-red-50 text-damco-red hover:bg-damco-red hover:text-white rounded-xl text-[10px] font-bold uppercase transition-all shrink-0"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No admin attachments uploaded.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border-2 border-red-50 shadow-xl sticky top-6">
            <h3 className="font-bold text-slate-900 mb-6 text-sm">Manage Ticket</h3>
            <div className="space-y-5">
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Process Stage</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="form-select text-sm font-bold bg-slate-50 border-transparent rounded-2xl py-3 w-full">
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {canEdit && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Priority</label>
                    <select value={editPriority} onChange={e => setEditPriority(e.target.value)} className="form-select text-sm font-bold bg-slate-50 border-transparent rounded-2xl py-3 w-full">
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Nature of Input</label>
                    <select value={editNature} onChange={e => setEditNature(e.target.value)} className="form-select text-sm font-bold bg-slate-50 border-transparent rounded-2xl py-3 w-full">
                      <option value="">Select nature…</option>
                      {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Category</label>
                    <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className="form-select text-sm font-bold bg-slate-50 border-transparent rounded-2xl py-3 w-full">
                      <option value="">Select category…</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Primary Assignee</label>
                    <select value={editAssigneeId} onChange={e => setEditAssigneeId(e.target.value)} className="form-select text-sm font-bold bg-slate-50 border-transparent rounded-2xl py-3 w-full">
                      <option value="">Unassigned</option>
                      {assignees.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Secondary Assignee</label>
                    <select value={editSecAssigneeId} onChange={e => setEditSecAssigneeId(e.target.value)} className="form-select text-sm font-bold bg-slate-50 border-transparent rounded-2xl py-3 w-full">
                      <option value="">None</option>
                      {assignees.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                    </select>
                  </div>

                  <div className="pt-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Upload Attachment</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="file" 
                        id="admin-file-upload"
                        className="hidden" 
                        onChange={handleAdminFileUpload}
                      />
                      <label 
                        htmlFor="admin-file-upload" 
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl cursor-pointer text-xs font-bold text-slate-600 transition-colors"
                      >
                        <Upload size={14} className="text-slate-400" />
                        {adminFile ? adminFile.name : 'Choose File'}
                      </label>
                      {adminFile && (
                        <button 
                          onClick={uploadAdminFile}
                          disabled={uploadingFile}
                          className="px-4 py-3 bg-damco-red hover:bg-red-700 text-white rounded-2xl text-xs font-bold uppercase transition-colors shrink-0 disabled:opacity-50"
                          style={{ background: '#E32200' }}
                        >
                          {uploadingFile ? 'Uploading...' : 'Upload'}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Internal Notes / Action Taken</label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Add resolution notes, internal comments, or actions taken here..."
                  rows={5}
                  style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', overflowY: 'auto', resize: 'vertical' }}
                  className="form-textarea text-sm font-medium bg-slate-50 border-transparent rounded-2xl py-3 px-4 w-full min-h-[120px] max-h-[400px] focus:ring-2 focus:ring-damco-red/20 leading-relaxed"
                />
              </div>

              <button 
                onClick={handleSave} 
                disabled={updateMutation.isPending} 
                className="w-full bg-damco-red text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2" 
                style={{ background: '#E32200' }}
              >
                {updateMutation.isPending ? <RefreshCw size={18} className="animate-spin" /> : 'Apply Changes'}
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}