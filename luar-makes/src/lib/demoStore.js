import demo from '../data/demo-products.json';
import { DEFAULT_CATEGORIES } from '../config.js';
import { normalizeSettings } from './settings.js';

/**
 * Dados de demonstração, só em memória. Serve para o protótipo e para rodar o site
 * antes de configurar o Supabase. NÃO é um painel compartilhado: o que for
 * alterado aqui some ao recarregar a página.
 */
export function createDemoStore(mode) {
  let rows = demo.map((p) => ({ ...p }));
  let cats = DEFAULT_CATEGORIES.map((name, i) => ({ id: `cat-${i}`, name, sort_order: i }));
  let settings = normalizeSettings();
  let signedIn = false;
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn());
  let seq = 0;
  const sorted = () => [...cats].sort((a, b) => a.sort_order - b.sort_order);
  const fail = (message, code) => Object.assign(new Error(message), { code });

  return {
    mode,
    persistent: false,
    async listProducts() { return rows.map((p) => ({ ...p })); },
    async listCategories() { return sorted().map((c) => ({ ...c })); },
    async getSettings() { return { ...settings }; },

    // "Login" da prévia: não há senha, é só para mostrar o painel.
    async getAdmin() { return signedIn ? { email: 'prévia@exemplo' } : null; },
    async signIn() { signedIn = true; emit(); return { email: 'prévia@exemplo' }; },
    async signOut() { signedIn = false; emit(); },
    onAuthChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    async saveProduct(p) {
      const clean = {
        name: p.name, description: p.description || '', category: p.category,
        image_url: p.image_url || '', available: !!p.available, featured: !!p.featured,
        stock: p.stock === null || p.stock === undefined ? null : p.stock,
      };
      if (p.id) {
        rows = rows.map((r) => (r.id === p.id ? { ...r, ...clean } : r));
        return rows.find((r) => r.id === p.id);
      }
      const row = { id: `novo-${++seq}`, ...clean, is_demo: false, sort_order: -rows.length - 1 };
      rows = [row, ...rows];
      return row;
    },
    async setAvailable(id, available) { rows = rows.map((r) => (r.id === id ? { ...r, available } : r)); },
    async deleteProduct(id) { rows = rows.filter((r) => r.id !== id); },
    async deleteDemoProducts() { rows = rows.filter((r) => !r.is_demo); },
    async uploadImage(file) { return URL.createObjectURL(file); },

    async saveCategory({ id, name }) {
      const n = name.trim();
      if (cats.some((c) => c.id !== id && c.name.toLowerCase() === n.toLowerCase())) throw fail('duplicate key', '23505');
      if (id) {
        const old = cats.find((c) => c.id === id);
        cats = cats.map((c) => (c.id === id ? { ...c, name: n } : c));
        rows = rows.map((r) => (r.category === old.name ? { ...r, category: n } : r));
      } else {
        cats = [...cats, { id: `cat-n${++seq}`, name: n, sort_order: cats.length }];
      }
    },
    async deleteCategory(id) {
      const c = cats.find((x) => x.id === id);
      if (c && rows.some((r) => r.category === c.name)) throw fail('foreign key', '23503');
      cats = cats.filter((x) => x.id !== id);
    },
    async reorderCategories(ids) { cats = cats.map((c) => ({ ...c, sort_order: ids.indexOf(c.id) })); },

    async saveSettings(s) { settings = normalizeSettings({ ...settings, ...s }); return { ...settings }; },
  };
}
