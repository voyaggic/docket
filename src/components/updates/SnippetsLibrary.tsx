import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Star, Info, Check } from 'lucide-react';
import { Snippet } from './types';

interface SnippetsLibraryProps {
  companyId: string;
  onInsert: (content: string) => void;
  onClose: () => void;
}

export default function SnippetsLibrary({ companyId, onInsert, onClose }: SnippetsLibraryProps) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/firm/${companyId}/snippets`, { credentials: 'include' })
      .then(res => res.json())
      .then(setSnippets)
      .catch(err => console.error('Failed to load snippets:', err))
      .finally(() => setIsLoading(false));
  }, [companyId]);

  // Favorites are a personal UI preference, not firm data — kept as local
  // state deliberately, not persisted to the backend.
  const [favorites, setFavorites] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAdd, setShowAdd] = useState(false);

  // New Snippet Form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Greetings');
  const [newContent, setNewContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
    if (!newTitle || !newContent) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/firm/${companyId}/snippets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: newTitle, category: newCategory, richContent: newContent, variables: [] })
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const created = await res.json();
      setSnippets([created, ...snippets]);
      setNewTitle('');
      setNewContent('');
      setShowAdd(false);
    } catch (err) {
      console.error('Failed to save snippet:', err);
      alert('Failed to save snippet. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const filtered = snippets
    .filter(s => {
      const matchSearch = s.title.toLowerCase().includes(search.toLowerCase()) || 
                          s.richContent.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'All' || s.category === selectedCategory;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      const favA = favorites.includes(a.id) ? 1 : 0;
      const favB = favorites.includes(b.id) ? 1 : 0;
      if (favA !== favB) return favB - favA;
      return b.usageCount - a.usageCount;
    });

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-slate-200 z-40 flex flex-col shadow-2xl animate-slide-in">
      {/* Pane title */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-indigo-600 fill-indigo-600" />
          <span className="text-xs font-black uppercase text-slate-800 tracking-wider">Snippets Library</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-slate-400">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3 border-b border-slate-100 space-y-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 text-slate-400 h-3.5 w-3.5" />
          <input
            type="text"
            placeholder="Search snippets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs border pl-8 pr-3 py-1.5 bg-slate-50 rounded-lg outline-none"
          />
        </div>

        {/* Category filters */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
          {['All', 'Greetings', 'Closings', 'Legal Clauses', 'Disclaimers', 'Court', 'Custom'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-[11px] font-black uppercase tracking-wider px-2 py-1 rounded transition select-none cursor-pointer whitespace-nowrap ${
                selectedCategory === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Pane Main body scroll */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {showAdd ? (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3.5 text-[11px] font-semibold">
            <h4 className="text-[11px] font-black uppercase text-slate-700">Add New Snippet</h4>
            
            <div className="space-y-1">
              <label className="text-slate-450 uppercase block">Title *</label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Closing signature etc..."
                className="w-full p-2 border bg-white rounded-lg outline-none text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-450 uppercase block">Category *</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full p-2 border bg-white rounded-lg outline-none text-xs"
              >
                <option value="Greetings">Greetings</option>
                <option value="Closings">Closings</option>
                <option value="Legal Clauses">Legal Clauses</option>
                <option value="Disclaimers">Disclaimers</option>
                <option value="Court">Court</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-450 uppercase block">Content * (Supports simple HTML/tags)</label>
              <textarea
                rows={4}
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="Enter client snippet text. Use variables like [CLIENT_NAME]."
                className="w-full p-2 border bg-white rounded-lg outline-none text-xs font-mono resize-none leading-relaxed"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 p-2 bg-white text-slate-500 border rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTitle || !newContent || isSaving}
                className="flex-1 p-2 bg-indigo-600 text-white rounded-lg cursor-pointer disabled:opacity-50 font-bold"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowAdd(true)}
              className="w-full flex items-center justify-center gap-1.5 border border-dashed border-indigo-300 hover:bg-indigo-50/50 text-indigo-600 p-2.5 rounded-xl font-bold text-[11px] transition cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Snippet
            </button>

            <div className="space-y-2">
              {isLoading && <p className="text-center italic text-slate-400 py-6">Loading snippets...</p>}
              {!isLoading && filtered.map(s => {
                const isFav = favorites.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      onInsert(s.richContent);
                      fetch(`/api/firm/${companyId}/snippets/${s.id}/use`, { method: 'POST', credentials: 'include' })
                        .then(res => res.ok ? res.json() : null)
                        .then(updated => {
                          if (updated) setSnippets(prev => prev.map(sn => sn.id === s.id ? updated : sn));
                        })
                        .catch(err => console.error('Failed to record snippet usage:', err));
                    }}
                    className="p-3 bg-white border border-slate-100 hover:border-indigo-300 rounded-xl transition cursor-pointer space-y-1.5 text-left relative group shadow-xxs"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-black text-slate-800 leading-tight block truncate pr-5">
                        {s.title}
                      </span>
                      <button
                        onClick={(e) => toggleFavorite(s.id, e)}
                        className="text-slate-300 hover:text-amber-500 transition absolute right-3"
                      >
                        <Star className={`h-3 w-3 ${isFav ? 'text-amber-500 fill-amber-500' : ''}`} />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-3 leading-snug font-medium italic" dangerouslySetInnerHTML={{ __html: s.richContent }} />

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold pt-1 border-t border-slate-50">
                      <span className="bg-slate-100 px-1 py-0.5 rounded font-black uppercase text-slate-500">{s.category}</span>
                      <span>Used {s.usageCount} times</span>
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <p className="text-center italic text-slate-405 py-6">No matching snippets found.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
