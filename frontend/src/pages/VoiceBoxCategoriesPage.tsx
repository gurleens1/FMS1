import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryApi } from '../services/categoryApi';
import { Plus, Trash2, Edit2, Search, Check, X } from 'lucide-react';
import clsx from 'clsx';

export function VoiceBoxCategoriesPage() {
  const queryClient = useQueryClient();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list().then((r) => r.data),
  });

  const addCategory = useMutation({
    mutationFn: (name: string) => categoryApi.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setNewCategoryName('');
    }
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => categoryApi.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditId(null);
      setEditName('');
    }
  });

  const deleteCategory = useMutation({
    mutationFn: (id: number) => categoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });

  const filteredCategories = categories.filter((c: any) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container p-4 lg:p-6 max-w-7xl mx-auto bg-[#F8F9FA] min-h-screen">
      <h2 className="font-display text-2xl font-bold text-damco-black mb-6">Voice Box Category List</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search categories..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-damco-red"
            />
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="New category name" 
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-damco-red"
            />
            <button 
              onClick={() => { if(newCategoryName.trim()) addCategory.mutate(newCategoryName); }}
              disabled={!newCategoryName.trim() || addCategory.isPending}
              className="px-6 py-2 bg-damco-red text-white text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-red-700 disabled:opacity-50"
              style={{backgroundColor: '#E32200'}}
            >
              <Plus size={16} /> Add
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200">
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={2} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : filteredCategories.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {editId === c.id ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-damco-red"
                          autoFocus
                        />
                        <button onClick={() => updateCategory.mutate({ id: c.id, name: editName })} className="text-green-600 p-1"><Check size={16}/></button>
                        <button onClick={() => setEditId(null)} className="text-gray-500 p-1"><X size={16}/></button>
                      </div>
                    ) : (
                      c.name
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editId !== c.id && (
                      <div className="flex justify-end gap-3">
                        <button onClick={() => { setEditId(c.id); setEditName(c.name); }} className="text-blue-500 hover:text-blue-700 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => { if(confirm('Delete category?')) deleteCategory.mutate(c.id); }} className="text-red-500 hover:text-red-700 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredCategories.length === 0 && !isLoading && (
                <tr><td colSpan={2} className="text-center py-10 text-gray-400">No categories found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
