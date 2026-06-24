import { useState, useRef, useEffect } from 'react';
import { Search, Pencil, Trash2, Check, X, Plus } from 'lucide-react';
import { useCategories } from '../../hooks/useCategories';

interface CategoryPickerProps {
  value: string;
  onChange: (val: string) => void;
  isManager: boolean;
}

export default function CategoryPicker({ value, onChange, isManager }: CategoryPickerProps) {
  const { categories, loading, addCategory, updateCategory, deleteCategory } = useCategories();
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [confirmAdd, setConfirmAdd] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setConfirmAdd(null);
        setInput('');
        setEditingId(null);
        setDeletingId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(input.toLowerCase())
  );
  const hasExactMatch = categories.some(
    c => c.name.toLowerCase() === input.trim().toLowerCase()
  );
  const showAddOption = input.trim().length > 0 && !hasExactMatch;

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelect = (name: string) => {
    onChange(name);
    setInput('');
    setIsOpen(false);
    setConfirmAdd(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (confirmAdd) {
        doConfirmAdd();
      } else if (showAddOption) {
        setConfirmAdd(input.trim());
      } else if (filtered.length === 1) {
        handleSelect(filtered[0].name);
      }
    }
    if (e.key === 'Escape') {
      if (confirmAdd) { setConfirmAdd(null); inputRef.current?.focus(); }
      else { setIsOpen(false); setInput(''); }
    }
  };

  const doConfirmAdd = async () => {
    if (!confirmAdd) return;
    const name = await addCategory(confirmAdd);
    if (name) onChange(name);
    setConfirmAdd(null);
    setInput('');
    setIsOpen(false);
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditValue(name);
    setDeletingId(null);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) return;
    const cat = categories.find(c => c.id === id);
    if (cat && value === cat.name) onChange(editValue.trim());
    await updateCategory(id, editValue.trim());
    setEditingId(null);
  };

  const doDelete = async (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (cat && value === cat.name) onChange('');
    await deleteCategory(id);
    setDeletingId(null);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger field */}
      <div
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-text transition-all ${
          isOpen
            ? 'border-[#a9674d] ring-2 ring-[#a9674d]/20'
            : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={handleOpen}
      >
        <Search size={13} className="text-gray-400 flex-shrink-0" />
        {isOpen ? (
          <input
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); setConfirmAdd(null); }}
            onKeyDown={handleKeyDown}
            placeholder={value || 'Type to search or add...'}
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
          />
        ) : (
          <span className={`text-sm flex-1 ${value ? 'text-gray-800' : 'text-gray-400'}`}>
            {value || 'Select or type a category...'}
          </span>
        )}
        {value && !isOpen && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(''); }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full mt-1 left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
          style={{ maxHeight: 240, overflowY: 'auto' }}
        >
          {/* Confirmation prompt for new category */}
          {confirmAdd && (
            <div className="px-3 py-3 bg-[#fef9f5] border-b border-[#f5ece7]">
              <p className="text-[12px] text-gray-600 mb-2.5">
                Add <strong className="text-gray-900">"{confirmAdd}"</strong> as a new category?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={doConfirmAdd}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#a9674d] hover:bg-[#8a4f39] text-white text-[12px] font-semibold transition-colors"
                >
                  <Check size={11} />
                  Yes, add
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirmAdd(null); inputRef.current?.focus(); }}
                  className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-[12px] font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Category list */}
          {loading ? (
            <div className="px-3 py-3 text-[12px] text-gray-400">Loading...</div>
          ) : filtered.length === 0 && !showAddOption ? (
            <div className="px-3 py-3 text-[12px] text-gray-400">No categories yet. Type to add one.</div>
          ) : (
            filtered.map(cat => (
              <div
                key={cat.id}
                className={`flex items-center group px-3 py-2 transition-colors ${
                  cat.name === value ? 'bg-[#fef4f0]' : 'hover:bg-[#f5f2e9]'
                }`}
              >
                {editingId === cat.id ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      ref={editInputRef}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); saveEdit(cat.id); }
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 text-[12px] px-2 py-0.5 border border-[#a9674d] rounded focus:outline-none"
                    />
                    <button type="button" onClick={() => saveEdit(cat.id)} className="p-0.5 text-emerald-600 hover:text-emerald-700">
                      <Check size={13} />
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="p-0.5 text-gray-400 hover:text-gray-600">
                      <X size={13} />
                    </button>
                  </div>
                ) : deletingId === cat.id ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="flex-1 text-[12px] text-red-600 font-medium">Delete "{cat.name}"?</span>
                    <button type="button" onClick={() => doDelete(cat.id)} className="p-0.5 text-red-600 hover:text-red-700">
                      <Check size={13} />
                    </button>
                    <button type="button" onClick={() => setDeletingId(null)} className="p-0.5 text-gray-400 hover:text-gray-600">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="flex-1 text-left text-[13px] text-gray-700 flex items-center gap-1.5"
                      onClick={() => handleSelect(cat.name)}
                    >
                      {cat.name}
                      {cat.name === value && <Check size={11} className="text-[#a9674d]" />}
                    </button>
                    {isManager && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); startEdit(cat.id, cat.name); }}
                          className="p-1 rounded text-gray-400 hover:text-[#a9674d] hover:bg-[#f5ece7] transition-colors"
                          title="Edit"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setDeletingId(cat.id); setEditingId(null); }}
                          className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}

          {/* Add new option */}
          {showAddOption && !confirmAdd && (
            <button
              type="button"
              onClick={() => setConfirmAdd(input.trim())}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-[#a9674d] hover:bg-[#f5ece7] transition-colors border-t border-gray-100"
            >
              <Plus size={12} />
              Add <strong className="ml-0.5">"{input.trim()}"</strong>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
