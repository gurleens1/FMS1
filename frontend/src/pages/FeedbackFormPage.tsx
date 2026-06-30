import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { feedbackApi, employeeApi, userApi } from '../services/api';
import { categoryApi } from '../services/categoryApi';
import { categoryAssigneeApi } from '../services/categoryAssigneeApi';
import type { Employee, Assignee } from '../types';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, User, Eye, EyeOff, Lock, Unlock, Paperclip, Search } from 'lucide-react';
import clsx from 'clsx';

// Shared option lists — imported from single source of truth
import { NATURES, PRIORITIES } from '../constants/feedbackOptions';

const FEEDBACK_SOURCES = [
  'Compassion Space', 'Email/Teams', 'Employee Engagement / Experience Feedback',
  'Employee Review Platforms ( Ambition Box )', 'Employee Review Platforms ( Glassdoor)', 
  'Employee Review Platforms ( Google Business )', 'Employee Review Platforms ( Others )', 
  'Employee Touchpoints Feedback', 'Exit Interview', 'Helpdesks', 'Managers', 'Others', 'Pulse Check', 'Voice Box'
];
const DIVISIONS = ['Administration', 'Application Development and Management', 'Business Excellence', 'Finance and Accounts', 'Human Resources', 'Insurance', 'IT Support and Staffing', 'ITeS', 'Management', 'Marketing', 'Marketing Services', 'Sales', 'Salesforce', 'Staffing USA', 'Strategy Marketing and Sales Enablement (SMS)', 'Technology Services'];

const SOURCE_TO_ENUM: Record<string, string> = {
  'Pulse Check': 'PulseCheck',
  'Exit Interview': 'ExitInterview',
  'Voice Box': 'VoiceBox',
  'Helpdesks': 'Helpdesks',
  'Managers': 'Managers'
};

const formatDisplayDate = (dateObj: Date) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${days[dateObj.getDay()]}, ${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`; 
};

const localTodayObj = new Date();
const todayFormatted = formatDisplayDate(localTodayObj); 
const todayISO = `${localTodayObj.getFullYear()}-${String(localTodayObj.getMonth() + 1).padStart(2, '0')}-${String(localTodayObj.getDate()).padStart(2, '0')}`;

export function FeedbackFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth(); 

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isConfidential, setIsConfidential] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [empEmail, setEmpEmail] = useState('');
  const [empLookup, setEmpLookup] = useState<Employee | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ─── Query: Fetch all categories with their assignees ─── */
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list().then((r) => r.data),
  });

  /* ─── Query: Fetch category assignees for selected category ─── */
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const { data: categoryAssignees = [] } = useQuery({
    queryKey: ['category-assignees', selectedCategoryId],
    queryFn: () =>
      selectedCategoryId
        ? categoryAssigneeApi.listByCategory(selectedCategoryId).then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!selectedCategoryId,
  });

  /* ─── Query: Fetch all assignees for secondary selection ─── */
  const { data: assignees = [] } = useQuery<Assignee[]>({
    queryKey: ['assignees-list'],
    queryFn: () => userApi.assignees().then((r) => r.data),
  });

  // Extract unique assignee objects from category assignees
  const categoryPrimaryAssignees = categoryAssignees.map((ca) => ca.assignee);

  const [form, setForm] = useState({
    title: '',
    feedbackSource: '',
    category: '',
    priority: '',
    nature: '',
    primaryAssigneeId: '', 
    secondaryAssigneeId: '', 
    feedbackRegistrationDate: todayFormatted, 
    description: '',
    empFullName: '',
    empCode: '',
    empDesignation: '',
    empDepartment: '',
    empDivision: '',
    empJoiningDate: '',
  });

  useEffect(() => {
    if (success) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/dashboard');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [success, navigate]);

  async function lookupEmployee(email: string) {
    if (!email || isAnonymous) return;
    setLookupError('');
    try {
      const { data } = await employeeApi.lookup(email.toLowerCase());
      setEmpLookup(data);
      setForm((f) => ({
        ...f,
        empFullName: data.fullName || '',
        empCode: data.employeeCode || '',
        empDesignation: data.designation || '',
        empDepartment: '',
        empDivision: data.department || '', 
        empJoiningDate: data.joiningDate ? formatDisplayDate(new Date(data.joiningDate)) : 'Mon, 24 March, 2025',
      }));
    } catch {
      setEmpLookup(null);
      setLookupError('Employee not found.');
    }
  }

  const createMutation = useMutation({
    mutationFn: (data: Record<string, any>) => feedbackApi.create(data),
    onSuccess: () => {
      setSuccess(true);
    },
  });

  function validate() {
    const e: Record<string, string> = {};
    if (!form.title) e.title = 'Title is required';
    if (!form.feedbackSource) e.feedbackSource = 'Feedback source is required';
    if (!form.category) e.category = 'Category is required';
    if (!form.priority) e.priority = 'Priority is required';
    if (!form.primaryAssigneeId) e.primaryAssigneeId = 'Assignee is required';
    if (!form.description) e.description = 'Description is required';
    if (!isAnonymous && !empEmail) e.empEmail = 'Employee email is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    let attachmentData = null;
    if (attachment) {
      try {
        const base64 = await fileToBase64(attachment);
        attachmentData = {
          fileName: attachment.name,
          fileData: base64,
          mimeType: attachment.type
        };
      } catch (err) {
        console.error("Failed to read attachment:", err);
      }
    }

    let selectedSource = SOURCE_TO_ENUM[form.feedbackSource] || form.feedbackSource;

    createMutation.mutate({
      title: form.title || '',
      description: form.description || '',
      feedbackSource: selectedSource,
      category: form.category,
      priority: form.priority,
      nature: form.nature || '',
      assigneeId: form.primaryAssigneeId ? parseInt(form.primaryAssigneeId) : undefined, 
      secondaryAssigneeId: form.secondaryAssigneeId ? parseInt(form.secondaryAssigneeId) : undefined,
      isAnonymous: Boolean(isAnonymous),
      isConfidential: Boolean(isConfidential),
      feedbackRegistrationDate: todayISO,
      empEmail: isAnonymous ? "" : (empEmail.toLowerCase() || ""),
      empFullName: isAnonymous ? "Anonymous" : (form.empFullName || ""),
      empCode: isAnonymous ? "" : (form.empCode || ""),
      empJoiningDate: isAnonymous ? "" : (form.empJoiningDate || ""),
      empDesignation: isAnonymous ? "" : (form.empDesignation || ""),
      empDepartment: isAnonymous ? "" : (form.empDivision || form.empDepartment || ""),
      attachment: attachmentData || undefined
    });
  }

  function F(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  }

  /**
   * Handle category change: Update form and auto-select first primary assignee
   * If multiple assignees exist for a category, the user should select one manually
   */
  function handleCategoryChange(categoryValue: string) {
    F('category', categoryValue);
    
    // Find the selected category
    const selectedCat = categories.find((c) => c.name === categoryValue);
    if (selectedCat) {
      setSelectedCategoryId(selectedCat.id);
      
      // Auto-select the first primary assignee if any exist
      const primaryAssignees = selectedCat.primaryAssignees || [];
      if (primaryAssignees.length >= 1) {
        F('primaryAssigneeId', String(primaryAssignees[0].assigneeId));
      } else {
        // Clear selection if no assignees
        F('primaryAssigneeId', '');
      }
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/90 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 max-w-lg w-full text-center flex flex-col items-center">
          <div className="mb-6 rounded-full bg-emerald-50 p-4 inline-block">
            <CheckCircle size={56} className="text-emerald-500" />
          </div>
          <h3 className="font-display text-2xl font-bold text-damco-black mb-3">Feedback Registered!</h3>
          <p className="text-gray-500 text-sm mb-6">You will be redirected to the dashboard in <span className="font-bold text-damco-red">{countdown}</span> seconds…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-damco-black">Feedback Registration</h2>
        <p className="text-damco-black/60 font-bold text-sm mt-1">Submit a new feedback record for an employee</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 border border-gray-200 shadow-sm">
          <h3 className="font-sans font-bold text-damco-black text-sm mb-4 pb-2 border-b border-gray-200">Feedback Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="form-label">Feedback Title *</label>
              <input type="text" value={form.title} onChange={(e) => F('title', e.target.value)} placeholder="Enter a Title ( Maximum 20 Words )" className={clsx('form-input focus:ring-0 focus:border-damco-red', errors.title && 'border-red-500')} />
              {errors.title && <p className="text-red-500 font-bold text-xs mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="form-label">Feedback Source *</label>
              <select value={form.feedbackSource} onChange={(e) => F('feedbackSource', e.target.value)} className={clsx('form-select focus:ring-0 focus:border-damco-red', errors.feedbackSource && 'border-red-500')}>
                <option value="" disabled hidden>Select source…</option>
                {FEEDBACK_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.feedbackSource && <p className="text-red-500 font-bold text-xs mt-1">{errors.feedbackSource}</p>}
            </div>

            <div>
              <label className="form-label">Feedback Collection Date *</label>
              <input 
                type="text" 
                value={form.feedbackRegistrationDate} 
                readOnly
                className="form-input bg-gray-50 focus:ring-0 cursor-not-allowed font-medium text-gray-600" 
              />
            </div>

            <div>
              <label className="form-label">Category *</label>
              <select 
                value={form.category} 
                onChange={(e) => handleCategoryChange(e.target.value)} 
                className={clsx('form-select focus:ring-0 focus:border-damco-red', errors.category && 'border-red-500')}
              >
                <option value="" disabled hidden>Select category…</option>
                {loadingCategories ? (
                  <option disabled>Loading categories…</option>
                ) : categories.length === 0 ? (
                  <option disabled>No categories available</option>
                ) : (
                  categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)
                )}
              </select>
              {errors.category && <p className="text-red-500 font-bold text-xs mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="form-label">Priority *</label>
              <select value={form.priority} onChange={(e) => F('priority', e.target.value)} className={clsx('form-select focus:ring-0 focus:border-damco-red', errors.priority && 'border-red-500')}>
                <option value="" disabled hidden>Select priority…</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="form-label">Nature *</label>
              <select value={form.nature} onChange={(e) => F('nature', e.target.value)} className="form-select focus:ring-0 focus:border-damco-red">
                <option value="" disabled hidden>Select nature…</option>
                {NATURES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div>
              <label className="form-label">Primary Assignee *</label>
              <select 
                value={form.primaryAssigneeId} 
                onChange={(e) => F('primaryAssigneeId', e.target.value)} 
                className={clsx('form-select focus:ring-0 focus:border-damco-red', errors.primaryAssigneeId && 'border-red-500')}
              >
                <option value="" disabled hidden>Select Primary Assignee</option>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>{assignee.name}</option>
                ))}
              </select>
              {errors.primaryAssigneeId && <p className="text-red-500 font-bold text-xs mt-1">{errors.primaryAssigneeId}</p>}
            </div>

            {(user?.role === 'SuperAdmin' || user?.role === 'Admin') && (
              <div>
                <label className="form-label">Secondary Assignee</label>
                <select value={form.secondaryAssigneeId} onChange={(e) => F('secondaryAssigneeId', e.target.value)} className="form-select focus:ring-0 focus:border-damco-red">
                  <option value="" disabled hidden>Select Secondary Assignee</option>
                  {assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}

            <div className="md:col-span-2 mt-2">
              <label className="form-label">Feedback Description *</label>
              <textarea value={form.description} onChange={(e) => F('description', e.target.value)} rows={4} className={clsx('form-input resize-none focus:ring-0 focus:border-damco-red', errors.description && 'border-red-500')} placeholder="Description" />
            </div>

            <div className="md:col-span-2">
              <label className="form-label">Attachment</label>
              <div className="border border-gray-300 rounded-lg p-3 flex items-center justify-between bg-white shadow-sm">
                <span className="text-sm font-bold text-damco-black/70 truncate mr-4">{attachment ? attachment.name : "No file attached."}</span>
                <label className="cursor-pointer flex items-center gap-2 text-damco-black hover:text-damco-red transition-colors text-sm font-bold shrink-0">
                  <Paperclip size={16} /> Attach file
                  <input type="file" className="hidden" onChange={(e) => setAttachment(e.target.files?.[0] || null)} />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6 border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-gray-200">
            <h3 className="font-sans font-bold text-damco-black text-sm">Employee Information</h3>
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-sm font-bold text-damco-black/70">Is Anonymous</span>
                <button type="button" onClick={() => setIsAnonymous(!isAnonymous)} className={clsx('relative inline-flex h-5 w-9 rounded-full transition-colors duration-200', isAnonymous ? 'bg-damco-red' : 'bg-gray-300')}>
                  <span className={clsx('absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200', isAnonymous && 'translate-x-4')} />
                </button>
                {isAnonymous ? <EyeOff size={16} className="text-damco-red" /> : <Eye size={16} className="text-damco-black/50" />}
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-sm font-bold text-damco-black/70">Is Confidential</span>
                <button type="button" onClick={() => setIsConfidential(!isConfidential)} className={clsx('relative inline-flex h-5 w-9 rounded-full transition-colors duration-200', isConfidential ? 'bg-damco-red' : 'bg-gray-300')}>
                  <span className={clsx('absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200', isConfidential && 'translate-x-4')} />
                </button>
                {isConfidential ? <Lock size={16} className="text-damco-red" /> : <Unlock size={16} className="text-damco-black/50" />}
              </label>
            </div>
          </div>

          {!isAnonymous ? (
            <div className="space-y-4">
              <div>
                <label className="form-label">Employee Email *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} onBlur={() => lookupEmployee(empEmail)} placeholder="employee@damcogroup.com" className={clsx('form-input pl-9 focus:ring-0 focus:border-damco-red', (errors.empEmail || lookupError) && 'border-red-500')} />
                  </div>
                  <button type="button" onClick={() => lookupEmployee(empEmail)} className="btn-secondary text-sm font-bold px-4">Lookup</button>
                </div>
                {errors.empEmail && <p className="text-red-500 font-bold text-xs mt-1">{errors.empEmail}</p>}
                {empLookup && <p className="text-emerald-600 font-bold text-xs mt-1 flex items-center gap-1"><CheckCircle size={11} /> Found: {empLookup.fullName}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="form-label">Employee Full Name *</label>
                  <input type="text" value={form.empFullName} readOnly={!!empLookup} onChange={(e) => F('empFullName', e.target.value)} className="form-input bg-gray-50 font-bold" placeholder="Auto-filled" />
                </div>
                <div>
                  <label className="form-label">Employee Code</label>
                  <input type="text" value={empLookup ? (form.empCode || 'Not Provided') : ''} readOnly className="form-input bg-gray-50" placeholder="Auto-filled" />
                </div>
                <div>
                  <label className="form-label">Joining Date</label>
                  <input 
                    type="text" 
                    value={empLookup ? (form.empJoiningDate || 'Not Provided') : ''} 
                    readOnly 
                    className="form-input bg-gray-50 font-medium text-gray-600" 
                    placeholder="Auto-filled" 
                  />
                </div>
                <div>
                  <label className="form-label">Designation</label>
                  <input type="text" value={empLookup ? (form.empDesignation || 'Not Provided') : ''} readOnly className="form-input bg-gray-50" placeholder="Auto-filled" />
                </div>
                <div>
                  <label className="form-label">Department</label>
                  <input type="text" value={empLookup ? (form.empDepartment || '—') : ''} readOnly className="form-input bg-gray-50" placeholder="Auto-filled" />
                </div>
                <div>
                  <label className="form-label">Division *</label>
                  <input type="text" value={empLookup ? (form.empDivision || 'Not Provided') : ''} readOnly className="form-input bg-gray-50 font-bold" placeholder="Auto-filled" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-4 px-5 rounded-lg bg-damco-red/5 border border-damco-red/20">
              <User size={18} className="text-damco-red shrink-0" />
              <p className="text-damco-black font-bold text-sm">Employee Information is hidden for Anonymous feedback.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary" style={{ backgroundColor: '#E32200' }}>
            {createMutation.isPending ? 'Saving…' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  );
}