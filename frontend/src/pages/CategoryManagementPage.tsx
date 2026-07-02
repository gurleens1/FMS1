/**
 * CategoryManagementPage.tsx
 * Unified Category & Primary Assignee Management
 * Supports multiple assignees per category with inline change, delete, and add controls.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryApi } from '../services/categoryApi';
import { categoryAssigneeApi } from '../services/categoryAssigneeApi';
import { userMgmtApi, userApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit2, Check, X, ShieldAlert, UserPlus, Tag, UserMinus, Search } from 'lucide-react';

interface Employee {
  id?: number;
  fullName: string;
  employeeCode: string;
  department?: string;
  designation?: string;
}

interface Assignee {
  id: number;
  email: string;
  role: string;
  isActive: boolean;
  employee: Employee;
}

interface CategoryAssignee {
  id: number;
  categoryId: number;
  assigneeId: number;
  assignee: Assignee;
}

interface Category {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  primaryAssignees?: CategoryAssignee[];
}

export function CategoryManagementPage() {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Redirect non-SuperAdmin users
  if (!isSuperAdmin) {
    navigate('/dashboard');
    return null;
  }

  /* ─── UI State ─── */
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [activeSelectCategoryId, setActiveSelectCategoryId] = useState<number | null>(null);
  const [changingAssigneeKey, setChangingAssigneeKey] = useState<string | null>(null); // "catId-assigneeId"
  const [deleteAssigneeKey, setDeleteAssigneeKey] = useState<string | null>(null); // confirm delete
  const [searchCategory, setSearchCategory] = useState('');

  /* ─── Queries ─── */
  // Fetch categories (GET /api/categories returns categories including primaryAssignees relation)
  const { data: categories = [], isLoading: loadingCategories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list().then((r) => r.data),
  });

  // Fetch all potential active assignees in the system
  const { data: allAssignees = [], isLoading: loadingAssignees } = useQuery<any[]>({
    queryKey: ['all-assignees'],
    queryFn: () => userApi.assignees().then((r) => r.data),
  });

  // Define the allowed primary assignees
  const primaryAssigneeNames = [
    'Avni Gupta',
    'Rachna Kohli',
    'Neha',
    'Praket Pati Tiwari',
    'Monika Kataria',
    'Siddharth Shanker Dwivedi',
    'Jessica Gibson Yadav',
    'Tulika Mukherjee'
  ];

  // Safely map and filter the returned assignees list to handle both backend response formats
  const activeAssigneesList = (allAssignees || [])
    .map((u: any) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      isActive: true,
      employee: {
        fullName: u.name || u.employee?.fullName || ''
      }
    }))
    .filter((u) => primaryAssigneeNames.includes(u.employee.fullName));

  /* ─── Category Mutations ─── */
  const addCategory = useMutation({
    mutationFn: (name: string) => categoryApi.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setNewCategoryName('');
      setError('');
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error || 'Failed to create category');
    }
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      categoryApi.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditId(null);
      setEditName('');
      setError('');
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error || 'Failed to update category');
    }
  });

  const deleteCategory = useMutation({
    mutationFn: (id: number) => categoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteConfirmId(null);
      setError('');
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error || 'Failed to delete category');
    }
  });

  /* ─── Assignee Mutations ─── */
  const addAssignee = useMutation({
    mutationFn: ({ categoryId, assigneeId }: { categoryId: number; assigneeId: number }) =>
      categoryAssigneeApi.add(categoryId, assigneeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setActiveSelectCategoryId(null);
      setError('');
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error || 'Failed to assign assignee');
    }
  });

  const changeAssignee = useMutation({
    mutationFn: async ({ categoryId, oldAssigneeId, newAssigneeId }: { categoryId: number; oldAssigneeId: number; newAssigneeId: number }) => {
      if (oldAssigneeId) {
        await categoryAssigneeApi.remove(categoryId, oldAssigneeId);
      }
      return categoryAssigneeApi.add(categoryId, newAssigneeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setError('');
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error || 'Failed to change assignee');
    }
  });

  const removeAssignee = useMutation({
    mutationFn: ({ categoryId, assigneeId }: { categoryId: number; assigneeId: number }) =>
      categoryAssigneeApi.remove(categoryId, assigneeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setError('');
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error || 'Failed to remove assignee');
    }
  });

  /* ─── Handlers ─── */
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    addCategory.mutate(newCategoryName.trim());
  };

  const handleStartEdit = (cat: Category) => {
    setEditId(cat.id);
    setEditName(cat.name);
  };

  const handleSaveEdit = (id: number) => {
    if (!editName.trim()) return;
    updateCategory.mutate({ id, name: editName.trim() });
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setEditName('');
  };

  const handleAssigneeChange = (categoryId: number, oldAssigneeId: number, newAssigneeId: number) => {
    changeAssignee.mutate({ categoryId, oldAssigneeId, newAssigneeId });
  };

  const handleAssigneeDelete = (categoryId: number, assigneeId: number) => {
    removeAssignee.mutate({ categoryId, assigneeId });
  };

  const handleAddAssignee = (categoryId: number, assigneeId: number) => {
    addAssignee.mutate({ categoryId, assigneeId });
  };

  return (
    <div className="page-container p-4 lg:p-6 max-w-7xl mx-auto bg-[#F8F9FA] min-h-screen">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="text-damco-red" size={24} />
            Category & Assignee Management
          </h2>
          <p className="text-gray-500 text-sm font-bold mt-1">
            Create feedback categories and manage their primary auto-assignees
          </p>
        </div>
      </div>

      {/* Add New Category Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <h3 className="font-sans font-bold text-gray-800 text-sm mb-3">Add New Category</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-damco-red/20 focus:border-damco-red transition-all"
            placeholder="Enter category name (e.g. Attendance, Salary Delay, Behavior)…"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
          />
          <button
            onClick={handleAddCategory}
            disabled={!newCategoryName.trim() || addCategory.isPending}
            className="px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-all bg-damco-red hover:bg-damco-red/90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shrink-0"
            style={{ backgroundColor: '#E32200' }}
          >
            {addCategory.isPending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            Add Category
          </button>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
            <ShieldAlert size={14} />
            {error}
          </div>
        )}
      </div>

      {/* Search Category Panel */}
      <div className="mb-4">
        <div className="relative w-full sm:w-[calc(100%-190px)]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-damco-red/20 focus:border-damco-red transition-all"
            placeholder="Search categories..."
            value={searchCategory}
            onChange={(e) => setSearchCategory(e.target.value)}
          />
          {searchCategory && (
            <button onClick={() => setSearchCategory('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Unified Categories & Assignees List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-sans font-bold text-gray-900 text-sm">
            Categories & Primary Auto-Assignees ({categories.filter(c => c.name.toLowerCase().includes(searchCategory.toLowerCase())).length})
          </h3>
        </div>

        {loadingCategories || loadingAssignees ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-damco-red border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 font-bold text-sm">Loading categories & assignee list…</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center">
            <Tag size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-bold text-sm">No categories yet</p>
            <p className="text-gray-400 text-xs mt-1">Get started by creating a category above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">
                    Category Name
                  </th>
                  <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/2">
                    Primary Auto-Assignee(s)
                  </th>
                  <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right w-1/6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.filter(c => c.name.toLowerCase().includes(searchCategory.toLowerCase())).map((cat) => {
                  const assignedAssignees = cat.primaryAssignees || [];
                  const assignedAssigneeIds = new Set(assignedAssignees.map(ca => ca.assigneeId));
                  
                  // Filter out users who are already assigned to this category
                  const availableUsers = activeAssigneesList.filter(
                    (u) => !assignedAssigneeIds.has(u.id)
                  );

                  return (
                    <tr key={cat.id} className="hover:bg-gray-50/40 transition-colors">
                      {/* Category Name Column */}
                      <td className="px-6 py-4 font-semibold text-gray-900 text-sm align-middle">
                        {editId === cat.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              className="px-3 py-1.5 rounded border border-gray-300 text-sm font-semibold text-gray-900 w-full focus:outline-none focus:border-damco-red focus:ring-1 focus:ring-damco-red/20"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(cat.id)}
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(cat.id)}
                              className="p-1.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              title="Save Changes"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1.5 rounded bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{cat.name}</span>
                          </div>
                        )}
                      </td>

                      {/* Primary Auto-Assignee(s) Column */}
                      <td className="px-6 py-4 align-middle">
                        <div className="flex flex-col gap-2">

                          {/* ── Current assignees: each shown as a visible name chip ── */}
                          {assignedAssignees.length > 0 ? (
                            <div className="space-y-2">
                              {assignedAssignees.map((ca) => {
                                const key = `${cat.id}-${ca.assigneeId}`;
                                const isChanging = changingAssigneeKey === key;
                                const isDeleting = deleteAssigneeKey === key;

                                return (
                                  <div key={ca.id} className="flex items-center gap-2 flex-wrap">

                                    {/* ── CHANGE MODE: inline dropdown ── */}
                                    {isChanging ? (
                                      <div className="flex items-center gap-1.5">
                                        <select
                                          defaultValue={ca.assigneeId}
                                          onChange={(e) => {
                                            const newId = Number(e.target.value);
                                            if (newId && newId !== ca.assigneeId) {
                                              handleAssigneeChange(cat.id, ca.assigneeId, newId);
                                            }
                                            setChangingAssigneeKey(null);
                                          }}
                                          className="text-xs font-bold border border-gray-300 rounded px-3 py-1.5 bg-white shadow-sm min-w-[240px] focus:outline-none focus:ring-1 focus:ring-damco-red/20 focus:border-damco-red"
                                          autoFocus
                                        >
                                          {activeAssigneesList.map((a) => (
                                            <option key={a.id} value={a.id}>
                                              {a.employee.fullName} ({a.role})
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          onClick={() => setChangingAssigneeKey(null)}
                                          className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors"
                                          title="Cancel"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>

                                    /* ── DELETE CONFIRM MODE ── */
                                    ) : isDeleting ? (
                                      <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded px-2.5 py-1">
                                        <span className="text-xs font-bold text-red-600">Remove {ca.assignee?.employee?.fullName || 'this assignee'}?</span>
                                        <button
                                          onClick={() => {
                                            handleAssigneeDelete(cat.id, ca.assigneeId);
                                            setDeleteAssigneeKey(null);
                                          }}
                                          disabled={removeAssignee.isPending}
                                          className="text-xs font-bold text-red-700 hover:underline"
                                        >
                                          Yes
                                        </button>
                                        <span className="text-gray-300 text-xs">|</span>
                                        <button
                                          onClick={() => setDeleteAssigneeKey(null)}
                                          className="text-xs font-bold text-gray-500 hover:underline"
                                        >
                                          No
                                        </button>
                                      </div>

                                    /* ── DISPLAY MODE: visible name chip + action icons ── */
                                    ) : (
                                      <>
                                        {/* Assignee Name Badge */}
                                        <span className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-full px-3 py-1 text-xs font-bold text-gray-800">
                                          <span className="w-5 h-5 rounded-full bg-damco-red/10 text-damco-red flex items-center justify-center text-[10px] font-bold shrink-0"
                                                style={{ backgroundColor: 'rgba(227,34,0,0.1)', color: '#E32200' }}>
                                            {(ca.assignee?.employee?.fullName || '?').charAt(0).toUpperCase()}
                                          </span>
                                          {ca.assignee?.employee?.fullName || 'Unknown'}
                                        </span>

                                        {/* Change button */}
                                        <button
                                          onClick={() => setChangingAssigneeKey(key)}
                                          className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                                          title="Change this assignee"
                                        >
                                          <Edit2 size={13} />
                                        </button>

                                        {/* Delete button */}
                                        <button
                                          onClick={() => setDeleteAssigneeKey(key)}
                                          className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                                          title="Remove this assignee"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs italic text-gray-400 font-bold block mb-1">No assignees assigned</span>
                          )}

                          {/* ── ADD ASSIGNEE: inline dropdown or button ── */}
                          {activeSelectCategoryId === cat.id ? (
                            <div className="flex items-center gap-2 mt-1">
                              <select
                                className="text-xs font-bold border border-gray-300 rounded px-3 py-1.5 min-w-[240px] focus:outline-none focus:ring-1 focus:ring-damco-red/20 focus:border-damco-red bg-white"
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddAssignee(cat.id, Number(e.target.value));
                                  }
                                }}
                              >
                                <option value="" disabled>Select User to Add…</option>
                                {availableUsers.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.employee.fullName} ({u.role})
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => setActiveSelectCategoryId(null)}
                                className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveSelectCategoryId(cat.id);
                                setError('');
                              }}
                              className="w-fit inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-damco-red border border-dashed border-gray-300 rounded px-2.5 py-1 hover:border-damco-red/50 transition-all bg-white"
                            >
                              <UserPlus size={12} />
                              Add Assignee
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Row Actions Column */}
                      <td className="px-6 py-4 text-right align-middle">
                        <div className="flex items-center justify-end gap-2">
                          {deleteConfirmId === cat.id ? (
                            <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded px-2 py-1">
                              <span className="text-xs font-bold text-red-600 mr-1.5">Delete Category?</span>
                              <button
                                onClick={() => deleteCategory.mutate(cat.id)}
                                disabled={deleteCategory.isPending}
                                className="text-xs font-bold text-red-700 hover:underline transition-colors"
                              >
                                Yes
                              </button>
                              <span className="text-gray-300 text-xs">|</span>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-xs font-bold text-gray-500 hover:underline transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(cat)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                                title="Edit Category Name"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(cat.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                                title="Delete Category"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
