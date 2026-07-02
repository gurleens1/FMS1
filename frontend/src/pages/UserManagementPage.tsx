/**
 * UserManagementPage.tsx
 */
import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userMgmtApi, employeeApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const DIVISION_OPTIONS = [
  'Administration',
  'Application Development and Management',
  'Business Excellence',
  'Finance and Accounts',
  'Human Resources',
  'Insurance',
  'IT Support and Staffing',
  'ITeS',
  'Management',
  'Marketing',
  'Marketing Services',
  'Sales',
  'Salesforce',
  'Staffing USA',
  'Strategy Marketing and Sales Enablement (SMS)',
  'Technology Services'
];

type UserRole = 'SuperAdmin' | 'Admin' | 'Assignee';

interface UserRecord {
  id: number;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  employee: {
    fullName: string;
    employeeCode: string;
    department?: string; 
    designation?: string;
  };
}

const ROLE_COLORS: Record<UserRole, string> = {
  SuperAdmin: 'bg-purple-100 text-purple-800',
  Admin:      'bg-red-100 text-red-800',
  Assignee:   'bg-green-100 text-green-800',
};

const ROLE_ICONS: Record<UserRole, string> = {
  SuperAdmin: 'fa-crown',
  Admin:      'fa-shield-halved',
  Assignee:   'fa-user-check',
};

export function UserManagementPage() {
  const { isSuperAdmin, user: currentUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search,        setSearch]       = useState('');
  const [roleFilter,    setRoleFilter]   = useState('');
  const [statusFilter,  setStatusFilter] = useState('');
  const [showForm,      setShowForm]     = useState(false);
  const [editUser,      setEditUser]     = useState<UserRecord | null>(null);

  if (!isSuperAdmin) {
    navigate('/dashboard');
    return null;
  }

  const { data: users = [], isLoading } = useQuery<UserRecord[]>({
    queryKey: ['users', search, roleFilter, statusFilter],
    queryFn: () => userMgmtApi.list({ search, role: roleFilter, status: statusFilter }).then(r => r.data),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      userMgmtApi.update(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) => userMgmtApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const stats = {
    total:     users.length,
    active:    users.filter(u => u.isActive).length,
    inactive:  users.filter(u => !u.isActive).length,
    admins:    users.filter(u => u.role === 'Admin').length,
    assignees: users.filter(u => u.role === 'Assignee').length,
  };

  return (
    <div className="page-container pb-24 lg:pb-6 p-4 lg:p-6 max-w-[1600px] mx-auto bg-[#F8F9FA] min-h-screen">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-900">
            <i className="fa-solid fa-users-gear mr-2 text-damco-red" />
            User Management
          </h2>
          <p className="text-gray-500 text-sm font-bold mt-0.5">Manage system users, roles and access</p>
        </div>
        <button onClick={() => { setEditUser(null); setShowForm(true); }} className="btn-primary text-sm font-bold py-2 px-4" style={{ background: '#E32200' }}>
          <i className="fa-solid fa-user-plus mr-2" /> Add User
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Users',   value: stats.total,     icon: 'fa-users',         color: 'text-gray-600' },
          { label: 'Active',        value: stats.active,    icon: 'fa-circle-check',  color: 'text-green-600' },
          { label: 'Inactive',      value: stats.inactive,  icon: 'fa-circle-xmark',  color: 'text-damco-red' },
          { label: 'Admins',        value: stats.admins,    icon: 'fa-shield-halved', color: 'text-red-600' },
          { label: 'Assignees',     value: stats.assignees, icon: 'fa-user-check',    color: 'text-green-600' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="card p-5 text-center flex flex-col items-center justify-center border border-gray-200 shadow-sm bg-white rounded-xl">
            <i className={`fa-solid ${icon} ${color} text-2xl mb-2`} />
            <p className="font-display text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-sm font-bold text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative w-full sm:w-64">
          <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input 
            type="text" 
            className="w-full px-9 py-2 rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-900 shadow-sm outline-none focus:outline-none focus:ring-0 focus:border-gray-200" 
            placeholder="Search by name or email…"
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
        
        <select 
          className="w-fit px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-900 shadow-sm cursor-pointer outline-none focus:outline-none focus:ring-0 focus:border-gray-200" 
          value={roleFilter} 
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="" disabled hidden>Role</option>
          <option value="SuperAdmin">SuperAdmin</option>
          <option value="Admin">Admin</option>
          <option value="Assignee">Assignee</option>
        </select>

        <select 
          className="w-fit px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-900 shadow-sm cursor-pointer outline-none focus:outline-none focus:ring-0 focus:border-gray-200" 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="" disabled hidden>Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {(search || roleFilter || statusFilter) && (
          <button 
            onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter(''); }} 
            className="w-fit px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-bold text-damco-red shadow-sm cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all outline-none focus:outline-none focus:ring-0 focus:border-gray-200"
          >
            Clear Filters
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="card p-12 text-center bg-white rounded-xl shadow-sm border border-gray-200">
          <i className="fa-solid fa-circle-notch fa-spin text-damco-red text-2xl" />
          <p className="text-gray-500 font-bold mt-2">Loading users…</p>
        </div>
      ) : (
        <>
          <div className="card hidden md:block overflow-hidden bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr>
                    <th className="table-th">User</th>
                    <th className="table-th">Role</th>
                    <th className="table-th">Division</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Joined</th>
                    <th className="table-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-damco-red font-bold text-sm shrink-0">
                            {u.employee.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{u.employee.fullName}</p>
                            <p className="text-xs font-bold text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-td">
                        <span className={`badge font-bold px-2.5 py-1 rounded-md text-xs ${ROLE_COLORS[u.role]}`}>
                          <i className={`fa-solid ${ROLE_ICONS[u.role]} mr-1 text-xs`} />
                          {u.role}
                        </span>
                      </td>
                      <td className="table-td text-gray-500 font-bold text-sm">{u.employee.department || '—'}</td>
                      <td className="table-td">
                        <span className={`badge font-bold px-2.5 py-1 rounded-md text-xs ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          <i className={`fa-solid ${u.isActive ? 'fa-circle-check' : 'fa-circle-xmark'} mr-1 text-xs`} />
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-td text-gray-400 font-bold text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="table-td text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditUser(u); setShowForm(true); }}
                            className="p-2 rounded hover:bg-blue-50 text-blue-600 transition-colors" title="Edit">
                            <i className="fa-solid fa-pen-to-square text-sm" />
                          </button>
                          {u.id !== currentUser?.id && (
                            <>
                              <button onClick={() => toggleStatus.mutate({ id: u.id, isActive: !u.isActive })}
                                className={`p-2 rounded transition-colors text-sm ${u.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                                title={u.isActive ? 'Deactivate' : 'Activate'}>
                                <i className={`fa-solid ${u.isActive ? 'fa-user-slash' : 'fa-user-check'}`} />
                              </button>
                              <button onClick={() => { if (confirm(`Delete ${u.employee.fullName}?`)) deleteUser.mutate(u.id); }}
                                className="p-2 rounded text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                                <i className="fa-solid fa-trash text-sm" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={6} className="table-td text-center py-16 text-gray-400 font-bold text-sm">
                      <i className="fa-solid fa-users-slash text-3xl mb-3 block text-gray-300" />
                      No users match the selected filters.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {users.map((u) => (
              <div key={u.id} className="card p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-damco-red font-bold">
                      {u.employee.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{u.employee.fullName}</p>
                      <p className="text-xs font-bold text-gray-400">{u.email}</p>
                    </div>
                  </div>
                  <span className={`badge font-bold px-2 py-0.5 rounded-md text-xs ${ROLE_COLORS[u.role]} shrink-0`}>
                    <i className={`fa-solid ${ROLE_ICONS[u.role]} mr-1 text-[10px]`} />
                    {u.role}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className={`badge font-bold px-2 py-0.5 rounded-md text-xs ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {isSuperAdmin && u.id !== currentUser?.id && (
                    <div className="flex gap-1">
                      <button onClick={() => { setEditUser(u); setShowForm(true); }} className="btn-ghost p-2 rounded text-blue-600 hover:bg-blue-50">
                        <i className="fa-solid fa-pen-to-square" />
                      </button>
                      <button onClick={() => { if (confirm(`Delete ${u.employee.fullName}?`)) deleteUser.mutate(u.id); }} className="btn-ghost p-2 rounded text-red-600 hover:bg-red-50">
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="card p-12 text-center text-gray-400 font-bold bg-white rounded-xl shadow-sm border border-gray-200">
                <i className="fa-solid fa-users-slash text-3xl mb-3 block text-gray-300" />No users found
              </div>
            )}
          </div>
        </>
      )}

      {showForm && isSuperAdmin && (
        <UserFormModal
          key={editUser ? `user-${editUser.id}` : 'new-user'}
          user={editUser}
          onClose={() => { setShowForm(false); setEditUser(null); }}
          onSuccess={() => { setShowForm(false); setEditUser(null); queryClient.invalidateQueries({ queryKey: ['users'] }); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// User Form Modal (Create / Edit)
// ─────────────────────────────────────────────
function UserFormModal({
  user, onClose, onSuccess,
}: { user: UserRecord | null; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!user;
  
  // Removed password from the initial state
  const initialFormState = () => ({
    fullName:     user?.employee.fullName || '',
    email:        user?.email || '', 
    employeeCode: user?.employee.employeeCode || '',
    department:   user?.employee.department || '',
    designation:  user?.employee.designation || '',
    role:         (user?.role || 'Assignee') as UserRole,
    isActive:     user?.isActive ?? true,
  });

  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [lookupError, setLookupError] = useState('');
  const [empNameSearch, setEmpNameSearch] = useState('');
  const [empEmailSearch, setEmpEmailSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);

  useEffect(() => {
    setForm(initialFormState());
    setError('');
    setLookupError('');
    setEmpNameSearch('');
    setEmpEmailSearch('');
    setLoading(false);
  }, [user]);

  async function lookupEmployee(query: string) {
    if (!query) return;
    setLookupError('');
    try {
      const { data } = await employeeApi.externalLookup(query);
      if (data && data.length > 0) {
        if (data.length === 1) {
          selectEmployee(data[0]);
        } else {
          setSearchResults(data);
          setShowSearchModal(true);
        }
      } else {
        setLookupError('Employee not found.');
      }
    } catch {
      setLookupError('Employee not found.');
    }
  }

  function selectEmployee(data: any) {
    setShowSearchModal(false);
    setEmpNameSearch(data.fullName || '');
    setEmpEmailSearch(data.email || '');
    setForm((f) => ({
      ...f,
      fullName: data.fullName || '',
      email: data.email || '',
      employeeCode: data.empCode || data.employeeCode || '',
      department: data.division || data.department || '',
      designation: data.designation || '',
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (isEdit) {
        // SAVING EDITS TO BOTH USER AND EMPLOYEE MODELS
        const payload: Record<string, any> = {
          fullName: form.fullName, 
          department: form.department,
          designation: form.designation, 
          role: form.role, 
          isActive: form.isActive,
        };
        await userMgmtApi.update(user!.id, payload);
      } else {
        await userMgmtApi.create({
          fullName: form.fullName, 
          email: form.email.trim().toLowerCase(), 
          employeeCode: form.employeeCode, 
          department: form.department,
          designation: form.designation, 
          role: form.role,
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(
        err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Operation failed.'
      );
    } finally { setLoading(false); }
  }

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="font-display text-lg font-bold text-gray-900">
            <i className={`fa-solid ${isEdit ? 'fa-pen-to-square' : 'fa-user-plus'} mr-2 text-damco-red`} />
            {isEdit ? 'Edit User' : 'Add New User'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors outline-none focus:outline-none">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4" autoComplete="off">
          
          <input type="text" style={{ display: 'none' }} aria-hidden="true" autoComplete="username" />
          <input type="password" style={{ display: 'none' }} aria-hidden="true" autoComplete="new-password" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isEdit && (
              <>
                <div className="sm:col-span-2">
                  <label className="form-label font-bold text-xs"><i className="fa-solid fa-magnifying-glass mr-1.5 text-gray-400" />Employee Name Lookup</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Search by name" className="form-input outline-none focus:ring-0 focus:border-damco-red flex-1" value={empNameSearch} onChange={(e) => setEmpNameSearch(e.target.value)} autoComplete="off" data-lpignore="true" />
                    <button type="button" onClick={() => lookupEmployee(empNameSearch)} className="bg-damco-red text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-damco-red/90 transition-colors">Lookup</button>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label font-bold text-xs"><i className="fa-solid fa-magnifying-glass mr-1.5 text-gray-400" />Employee Email Lookup</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Search by email" className="form-input outline-none focus:ring-0 focus:border-damco-red flex-1" value={empEmailSearch} onChange={(e) => setEmpEmailSearch(e.target.value)} autoComplete="off" data-lpignore="true" />
                    <button type="button" onClick={() => lookupEmployee(empEmailSearch)} className="bg-damco-red text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-damco-red/90 transition-colors">Lookup</button>
                  </div>
                </div>
                {lookupError && <div className="sm:col-span-2"><p className="text-red-500 font-bold text-xs">{lookupError}</p></div>}
              </>
            )}

            <div className="sm:col-span-2">
              <label className="form-label font-bold text-xs"><i className="fa-solid fa-user mr-1.5 text-gray-400" />Full Name *</label>
              <input className="form-input outline-none focus:ring-0 focus:border-damco-red" value={form.fullName} onChange={set('fullName')} required autoComplete="off" data-lpignore="true" />
            </div>

            {!isEdit && (
              <>
                <div>
                  <label className="form-label font-bold text-xs"><i className="fa-solid fa-envelope mr-1.5 text-gray-400" />Email *</label>
                  <input type="email" className="form-input outline-none focus:ring-0 focus:border-damco-red bg-gray-50" value={form.email} onChange={set('email')} required autoComplete="off" data-lpignore="true" />
                </div>
                <div>
                  <label className="form-label font-bold text-xs"><i className="fa-solid fa-id-badge mr-1.5 text-gray-400" />Employee Code *</label>
                  <input className="form-input outline-none focus:ring-0 focus:border-damco-red bg-gray-50" placeholder="EMP-001" value={form.employeeCode} onChange={set('employeeCode')} required autoComplete="off" data-lpignore="true" />
                </div>
              </>
            )}
            <div>
              <label className="form-label font-bold text-xs"><i className="fa-solid fa-shield-halved mr-1.5 text-gray-400" />Role *</label>
              <select className="form-select outline-none focus:ring-0 focus:border-damco-red" value={form.role} onChange={set('role') as any}>
                <option value="SuperAdmin">SuperAdmin</option>
                <option value="Admin">Admin</option>
                <option value="Assignee">Assignee</option>
              </select>
            </div>
            <div>
              <label className="form-label font-bold text-xs"><i className="fa-solid fa-building mr-1.5 text-gray-400" />Division</label>
              <select className="form-select outline-none focus:ring-0 focus:border-damco-red" value={form.department} onChange={set('department')}>
                <option value="" disabled hidden>Select Division</option>
                {DIVISION_OPTIONS.map((div) => <option key={div} value={div}>{div}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="form-label font-bold text-xs"><i className="fa-solid fa-briefcase mr-1.5 text-gray-400" />Designation</label>
              <input className="form-input outline-none focus:ring-0 focus:border-damco-red" value={form.designation} onChange={set('designation')} autoComplete="off" />
            </div>
            
            {isEdit && (
              <div className="sm:col-span-2 flex items-center gap-3 mt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-green-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5 peer-checked:after:border-white" />
                </label>
                <span className="text-sm font-bold text-gray-700">
                  {form.isActive ? 'Active User' : 'Inactive User'}
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-bold mt-4">
              <i className="fa-solid fa-circle-exclamation" />{error}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200 mt-6">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg text-gray-600 font-bold text-sm bg-gray-100 hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-lg text-white font-bold text-sm bg-damco-red hover:bg-damco-red/90 transition-colors shadow flex items-center gap-2">
              {loading && <i className="fa-solid fa-spinner animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>

        {showSearchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-lg text-damco-black">Select Employee</h3>
                <button type="button" onClick={() => setShowSearchModal(false)} className="text-gray-400 hover:text-gray-600 font-bold p-1">✕</button>
              </div>
              <div className="overflow-y-auto p-4 flex-1">
                {searchResults.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No employees found.</p>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((emp, i) => (
                      <div key={i} onClick={() => selectEmployee(emp)} className="p-3 border border-gray-100 rounded-lg hover:border-damco-red/30 hover:bg-damco-red/5 cursor-pointer transition-colors">
                        <div className="font-bold text-damco-black text-sm">{emp.fullName}</div>
                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          <span>{emp.email}</span>
                          <span>{emp.department}</span>
                          <span>Code: {emp.empCode || emp.employeeCode}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-200 text-right">
                <button type="button" onClick={() => setShowSearchModal(false)} className="px-4 py-2 text-sm font-bold bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}