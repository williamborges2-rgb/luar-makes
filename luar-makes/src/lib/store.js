import { createDemoStore } from './demoStore.js';

/**
 * Escolhe a fonte de dados:
 *  - VITE_PROTOTYPE=1                 -> protótipo (demonstração em memória)
 *  - VITE_SUPABASE_URL + ANON_KEY     -> Supabase (versão real)
 *  - nenhum dos dois                  -> modo demonstração (aviso visível na loja)
 */
export async function createStore() {
  const env = import.meta.env;
  if (env.VITE_PROTOTYPE === '1') return createDemoStore('prototype');
  const url = (env.VITE_SUPABASE_URL || '').trim();
  const key = (env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (url && key) {
    const { createSupabaseStore } = await import('./supabaseStore.js');
    return createSupabaseStore(url, key);
  }
  return createDemoStore('demo');
}
