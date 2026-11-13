/** Transforma erros técnicos em mensagens claras em português. */
export function friendlyError(err, context) {
  const msg = String((err && (err.message || err.error_description)) || err || '');
  const code = String((err && (err.code || err.status)) || '');
  const offline = /failed to fetch|networkerror|load failed|network request failed/i.test(msg) || (typeof navigator !== 'undefined' && navigator.onLine === false);

  if (offline) return 'Sem conexão com a internet ou com o servidor. Confira sua conexão e tente de novo.';

  if (context === 'login') {
    if (err && err.name === 'NotAdminError') return 'Este usuário não tem permissão para administrar a loja. Peça para incluí-lo na lista de administradores.';
    if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos. Confira e tente de novo.';
    if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg)) return 'Este e-mail ainda não foi confirmado no Supabase. Marque o usuário como confirmado no painel do Supabase.';
    if (code === 'over_request_rate_limit' || code === '429' || /rate limit|too many/i.test(msg)) return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
    return 'Não foi possível entrar agora. Tente de novo em instantes.';
  }
  if (context === 'load') {
    if (/relation .* does not exist|schema cache|PGRST205|42P01/i.test(msg + code)) return 'A tabela de produtos ainda não existe. Rode o arquivo supabase/schema.sql no Supabase (veja o README).';
    return 'Não foi possível carregar os produtos agora. Tente novamente.';
  }
  if (context === 'category') {
    if (code === '23505' || /duplicate key|unique/i.test(msg)) return 'Já existe uma categoria com esse nome.';
    if (code === '23503' || code === '23001' || /foreign key|restrict/i.test(msg)) return 'Esta categoria ainda tem produtos. Mude esses produtos de categoria antes de removê-la.';
    if (/relation .* does not exist|schema cache|PGRST205|42P01/i.test(msg + code)) return 'A tabela de categorias ainda não existe. Rode de novo o arquivo supabase/schema.sql no Supabase (veja o README).';
    if (code === '42501' || /row-level security|permission denied/i.test(msg)) return 'Sem permissão. Saia e entre de novo com a conta de administradora.';
    return 'Não foi possível salvar a categoria. Tente de novo.';
  }
  if (context === 'settings') {
    if (/relation .* does not exist|schema cache|PGRST205|42P01/i.test(msg + code)) return 'A tabela de configurações ainda não existe. Rode de novo o arquivo supabase/schema.sql no Supabase (veja o README).';
    if (code === '42501' || /row-level security|permission denied/i.test(msg)) return 'Sem permissão. Saia e entre de novo com a conta de administradora.';
    if (code === '23514' || /check constraint/i.test(msg)) return 'Algum valor não foi aceito. Confira o WhatsApp, o Instagram e o limite de estoque baixo.';
    return 'Não foi possível salvar as configurações. Tente de novo.';
  }
  if (context === 'save' || context === 'delete') {
    if (code === '23503' || /foreign key/i.test(msg)) return 'Essa categoria não existe mais. Escolha outra categoria e tente de novo.';
    if (/stock/i.test(msg) && /check/i.test(msg)) return 'O estoque deve ser um número inteiro, zero ou maior.';
    if (code === '42501' || /row-level security|permission denied|not authorized/i.test(msg)) return 'Sem permissão para salvar. Saia e entre de novo com a conta de administradora.';
    if (/price|check constraint/i.test(msg)) return 'O preço de todos os produtos é fixo em R$ 10,00 e não pode ser alterado.';
    if (/jwt|expired/i.test(msg)) return 'Sua sessão expirou. Entre de novo.';
    return context === 'save' ? 'Não foi possível salvar o produto. Tente de novo.' : 'Não foi possível remover o produto. Tente de novo.';
  }
  if (context === 'upload') {
    if (/bucket not found/i.test(msg)) return 'O espaço de imagens ainda não existe. Rode o arquivo supabase/schema.sql no Supabase (veja o README).';
    if (/exceeded|too large|payload/i.test(msg)) return 'A imagem é grande demais. Escolha uma imagem de até 5 MB.';
    if (code === '42501' || /row-level security|not authorized|unauthorized/i.test(msg)) return 'Sem permissão para enviar imagens. Saia e entre de novo com a conta de administradora.';
    if (/mime|type/i.test(msg)) return 'Formato de imagem não aceito. Use JPG, PNG ou WebP.';
    return 'Não foi possível enviar a imagem. Tente de novo ou cole o link de uma imagem.';
  }
  return 'Algo deu errado. Tente de novo.';
}

export class NotAdminError extends Error {
  constructor() { super('not_admin'); this.name = 'NotAdminError'; }
}
