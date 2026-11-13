// Dados fixos da marca e valores INICIAIS da loja.
// Telefone, Instagram, endereço e instruções podem ser alterados no painel (#admin > Configurações),
// sem mexer no código. Os valores abaixo são usados enquanto nada foi salvo (ou no modo demonstração).
export const STORE = {
  name: 'Luar Makes',
  tagline: 'Realce sua luz',
  city: 'Florianópolis/SC',
};

export const DEFAULT_SETTINGS = {
  whatsapp_number: '5548985055020',
  whatsapp_display: '(48) 98505-5020',
  instagram_url: 'https://www.instagram.com/luarmakeup10/',
  instagram_handle: '@luarmakeup10',
  address: 'Rua Congonhas, 172, Bloco 8 – Fundos, Monte Verde, Florianópolis/SC',
  pickup_instructions: '',
  delivery_instructions: 'Disponibilidade, valor e prazo são combinados com a loja pelo WhatsApp.',
  low_stock_threshold: 3,
};

// Preço único de todos os produtos, em centavos. NÃO existe preço por produto.
// O banco de dados (supabase/schema.sql) também impede qualquer outro valor.
export const PRICE_CENTS = 1000;

// Categorias iniciais (o painel permite criar, renomear, reordenar e remover).
export const DEFAULT_CATEGORIES = ['Lábios e gloss', 'Rosto', 'Olhos e sobrancelhas', 'Acessórios', 'Brincos', 'Outros'];

export const IMAGE_BUCKET = 'product-images';
export const MAX_QTY = 99;
