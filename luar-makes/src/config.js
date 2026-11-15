// Dados fixos da marca e valores INICIAIS da loja.
// Telefone, Instagram, endereço e instruções podem ser alterados no painel (#admin > Configurações),
// sem mexer no código. Os valores abaixo são usados enquanto nada foi salvo (ou no modo demonstração).
export const STORE = {
  name: 'Luar Make Up',
  tagline: 'Realce sua luz!',
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
  // Pagamento via Pix (opcional): a cliente que compra pode optar por pagar via Pix e ver a
  // chave/QR Code da loja ao finalizar o pedido. Nada disso é processado automaticamente —
  // é só mostrar a chave e deixar registrado no pedido que a cliente diz ter pago.
  pix_enabled: false,
  pix_key_type: 'email', // 'cpf' | 'cnpj' | 'email' | 'celular' | 'aleatoria'
  pix_key: '',
  pix_receiver_name: '',
  pix_city: '',
};

// Preço único de todos os produtos, em centavos. NÃO existe preço por produto.
// O banco de dados (supabase/schema.sql) também impede qualquer outro valor.
export const PRICE_CENTS = 1000;

// Categorias iniciais (o painel permite criar, renomear, reordenar e remover).
export const DEFAULT_CATEGORIES = ['Lábios e gloss', 'Rosto', 'Olhos e sobrancelhas', 'Acessórios', 'Brincos', 'Outros'];

export const IMAGE_BUCKET = 'product-images';
export const MAX_QTY = 99;

// Notificações push (opcional): chave pública VAPID. É gerada uma única vez (ver README, seção de
// notificações) e configurada pela variável de ambiente VITE_VAPID_PUBLIC_KEY. Sem essa variável
// configurada, o recurso de notificação simplesmente fica invisível (não aparece banner nem botão).
export const VAPID_PUBLIC_KEY = (import.meta.env?.VITE_VAPID_PUBLIC_KEY || '').trim();
