import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Category {
  id: string;
  name: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from('organic_categories')
      .select('id, name')
      .order('name');
    if (data) setCategories(data);
  }, []);

  useEffect(() => {
    reload().then(() => setLoading(false));

    const channel = supabase
      .channel('organic_categories_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organic_categories' }, reload)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [reload]);

  const addCategory = useCallback(async (name: string): Promise<string | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = categories.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.name;

    const { data, error } = await supabase
      .from('organic_categories')
      .insert({ name: trimmed })
      .select('id, name')
      .single();

    if (error) {
      console.error('[Categories] Add failed:', error.message);
      return null;
    }
    setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data.name;
  }, [categories]);

  const updateCategory = useCallback(async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { error } = await supabase
      .from('organic_categories')
      .update({ name: trimmed })
      .eq('id', id);
    if (error) {
      console.error('[Categories] Update failed:', error.message);
      return;
    }
    setCategories(prev =>
      prev.map(c => c.id === id ? { ...c, name: trimmed } : c)
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('organic_categories')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[Categories] Delete failed:', error.message);
      return;
    }
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  return { categories, loading, addCategory, updateCategory, deleteCategory };
}
