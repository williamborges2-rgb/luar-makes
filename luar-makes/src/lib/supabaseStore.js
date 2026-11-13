import { createClient } from '@supabase/supabase-js';
import { IMAGE_BUCKET } from '../config.js';
import { NotAdminError } from './errors.js';
import { shrinkImage } from './image.js';

/**
 * Persistência real no Supabase.
 * - Só a chave pública (anon) é usada aqui. A segurança vem das políticas RLS
 *   do banco (supabase/schema.sql): qualquer pessoa lê, só administradoras gravam.
 * - O preço NÃO é enviado: o banco fixa e exige R$ 10,00.
 */
export function createSupabaseStore(url, anonKey) {
  const sb = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });

  async function checkAdmin() {
    const { data: s } = await sb.auth.getSession();
    const user = s?.session?.user;
    if (!user) return null;
    const { data, error } = await sb.rpc('is_admin');
    if (error) throw error;
    return data === true ? { email: user.email } : null;
  }

  const storagePathFromUrl = (u) => {
    const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
    const i = (u || '').indexOf(marker);
    return i >= 0 ? decodeURIComponent(u.slice(i + marker.length).split('?')[0]) : null;
  };
  const dropStored = async (u) => {
    const path = storagePathFromUrl(u);
    if (path) { try { await sb.storage.from(IMAGE_BUCKET).remove([path]); } catch { /* melhor esforço */ } }
  };

  return {
    mode: 'supabase',
    persistent: true,

    async listProducts() {
      const { data, error } = await sb.from('products').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },

    async listCategories() {
      const { data, error } = await sb.from('categories').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    async getSettings() {
      const { data, error } = await sb.from('store_settings').select('*').eq('id', true).maybeSingle();
      if (error) throw error;
      return data || {};
    },

    getAdmin: checkAdmin,
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const admin = await checkAdmin();
      if (!admin) { await sb.auth.signOut(); throw new NotAdminError(); }
      return admin;
    },
    async signOut() { await sb.auth.signOut(); },
    onAuthChange(fn) {
      // setTimeout evita travar o cliente do Supabase ao chamá-lo de dentro do callback de autenticação
      const { data } = sb.auth.onAuthStateChange(() => setTimeout(fn, 0));
      return () => data.subscription.unsubscribe();
    },

    async saveProduct(p) {
      const clean = {
        name: p.name, description: p.description || '', category: p.category,
        image_url: p.image_url || null, available: !!p.available, featured: !!p.featured,
        stock: p.stock === null || p.stock === undefined ? null : p.stock,
      };
      if (p.id) {
        const { data, error } = await sb.from('products').update(clean).eq('id', p.id).select().single();
        if (error) throw error;
        if (p._oldImage && p._oldImage !== clean.image_url) await dropStored(p._oldImage);
        return data;
      }
      const { data, error } = await sb.from('products').insert({ ...clean, is_demo: false }).select().single();
      if (error) throw error;
      return data;
    },
    async setAvailable(id, available) {
      const { error } = await sb.from('products').update({ available }).eq('id', id);
      if (error) throw error;
    },
    async deleteProduct(id, imageUrl) {
      const { error } = await sb.from('products').delete().eq('id', id);
      if (error) throw error;
      await dropStored(imageUrl);
    },
    async deleteDemoProducts() {
      const { error } = await sb.from('products').delete().eq('is_demo', true);
      if (error) throw error;
    },
    async saveCategory({ id, name }) {
      const n = name.trim();
      if (id) {
        const { error } = await sb.from('categories').update({ name: n }).eq('id', id);
        if (error) throw error;
      } else {
        const { data: last } = await sb.from('categories').select('sort_order').order('sort_order', { ascending: false }).limit(1);
        const next = last && last.length ? last[0].sort_order + 1 : 0;
        const { error } = await sb.from('categories').insert({ name: n, sort_order: next });
        if (error) throw error;
      }
    },
    async deleteCategory(id) {
      const { error } = await sb.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    async reorderCategories(ids) {
      for (let i = 0; i < ids.length; i++) {
        const { error } = await sb.from('categories').update({ sort_order: i }).eq('id', ids[i]);
        if (error) throw error;
      }
    },
    async saveSettings(s) {
      const { data, error } = await sb.from('store_settings').upsert({ id: true, ...s }).select().single();
      if (error) throw error;
      return data;
    },
    async uploadImage(file) {
      const blob = await shrinkImage(file);
      const path = `${crypto.randomUUID()}.jpg`;
      const { error } = await sb.storage.from(IMAGE_BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
      if (error) throw error;
      return sb.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
    },
  };
}
