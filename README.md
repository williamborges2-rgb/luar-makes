# Luar Makes — loja virtual

Site da **Luar Makes** (Florianópolis/SC): *Realce sua luz*. **Tudo por R$ 10,00.**

- Vitrine com busca e filtro por categoria; visual para celular em primeiro lugar
- Carrinho (total = quantidade de itens × R$ 10,00)
- Pedido pela conversa do WhatsApp, com a mensagem já pronta para a cliente revisar e enviar
- Opções **Retirar na loja** e **Consultar entrega** (sem prometer frete, prazo ou cobertura)
- **Painel da loja** em `/#admin`: produtos, **estoque** (com alerta de estoque baixo), **categorias** e **configurações** (WhatsApp, Instagram, endereço, retirada/entrega), sem mexer no código
- Dados, fotos e login no **Supabase**

O site é estático (HTML + JavaScript, feito com Vite). Não existe servidor próprio para manter.

---

## 1. Ver o site funcionando agora (sem Supabase)

Precisa do [Node.js](https://nodejs.org) 18 ou mais novo.

```bash
npm install
npm run dev
```

Abra o endereço que aparecer (normalmente http://localhost:5173).
Sem Supabase configurado o site abre em **modo demonstração**: mostra os produtos de exemplo, aparece uma faixa avisando isso, e o painel `/#admin` é só uma prévia (nada é salvo).

---

## 2. Configurar o Supabase (passo a passo, do zero)

Você não precisa ter nada pronto. O plano gratuito atende uma loja pequena.

### 2.1 Criar a conta e o projeto
1. Entre em https://supabase.com e crie uma conta.
2. Clique em **New project**. Escolha um nome (ex.: `luar-makes`), crie uma **senha do banco** (guarde-a) e a região mais próxima (ex.: *South America (São Paulo)*).
3. Aguarde alguns minutos até o projeto ficar pronto.

### 2.2 Criar as tabelas, as regras de segurança e o espaço das fotos
1. No menu lateral, abra **SQL Editor** → **New query**.
2. Abra o arquivo `supabase/schema.sql` deste projeto, copie **tudo**, cole no editor e clique em **Run**. Deve aparecer *Success*.
   Esse arquivo cria as tabelas de produtos, categorias e configurações, as regras de acesso, o espaço de fotos (`product-images`) e **trava o preço em R$ 10,00 no próprio banco**. Ele pode ser rodado de novo sem problema (também atualiza bancos criados pela versão anterior).
3. (Opcional, recomendado) Em outra query, cole `supabase/seed.sql` e clique em **Run** para carregar os 22 produtos de exemplo. Só insere se a tabela estiver vazia.

### 2.3 Criar o usuário da administradora
1. Menu **Authentication** → **Users** → **Add user** → **Create new user**.
2. Informe o e-mail e uma senha forte da dona da loja e marque **Auto Confirm User**.
3. Volte ao **SQL Editor**, abra `supabase/first-admin.sql`, troque `TROQUE-PELO-EMAIL-DA-DONA@exemplo.com` pelo **mesmo e-mail** do passo anterior e clique em **Run**. O resultado deve listar uma linha com o e-mail dela.

   Só e-mails que estão na tabela `admins` conseguem alterar produtos e fotos. Para incluir outra pessoa, repita 2.3 com o e-mail dela.

### 2.4 Impedir cadastros de estranhos (importante)
Em **Authentication** → **Sign In / Providers** (ou *Providers → Email*), **desative** a opção *Allow new users to sign up*. Assim ninguém cria conta sozinho. Mesmo que criasse, não seria administradora, mas é melhor deixar fechado.

### 2.5 Pegar o endereço e a chave pública
Em **Project Settings** → **API** (ou *Data API / API Keys*), copie:
- **Project URL** (algo como `https://abcdxyz.supabase.co`)
- a chave pública **anon** (também chamada *publishable*)

> ⚠️ Use **somente a chave pública (anon/publishable)**. **Nunca** coloque a chave `service_role` / *secret* no site: ela dá acesso total ao banco.

### 2.6 Ligar o site ao Supabase
```bash
cp .env.example .env
```
Abra o `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Depois:

```bash
npm run dev
```
O aviso de "modo demonstração" desaparece, a vitrine passa a ler do Supabase e o painel `http://localhost:5173/#admin` pede e-mail e senha.

---

## 3. Publicar o site

O comando abaixo gera a pasta `dist/` com o site pronto:

```bash
npm run build
```

### Opção A — Netlify (mais simples, grátis)
1. Suba esta pasta para um repositório no GitHub (o `.env` **não** vai junto, já está no `.gitignore`).
2. Em https://app.netlify.com: **Add new site → Import an existing project** e escolha o repositório.
3. Build command `npm run build` e publish directory `dist` (o arquivo `netlify.toml` já informa isso).
4. Em **Site configuration → Environment variables**, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
5. Faça o deploy. Se mudar as variáveis depois, faça um novo deploy.

Sem GitHub: rode `npm run build` e arraste a pasta `dist` em https://app.netlify.com/drop. Nesse caso o `.env` precisa estar preenchido antes do build.

### Opção B — Vercel ou Cloudflare Pages
Importe o repositório. Framework **Vite**, build `npm run build`, saída `dist`, e as mesmas duas variáveis de ambiente.

### Fotos dos produtos de exemplo (importante)
Os produtos de exemplo apontam para as fotos do catálogo do fornecedor **RS Makes** (`arquivos.facilzap.app.br`). Isso funciona para demonstrar, mas é um link de terceiros: se o fornecedor mudar ou apagar a foto, o site mostra uma ilustração no lugar. Para o site **não depender do fornecedor**, baixe as fotos para dentro do projeto antes de publicar (precisa de internet; leva alguns segundos):

```bash
npm run images      # baixa para public/products/ e troca os links em src/data/demo-products.json
npm run seed:sql    # regenera supabase/seed.sql com os novos caminhos (só se for usar o Supabase)
npm run build
```

Depois disso as fotos são servidas pelo **próprio site publicado** (`/products/…`), junto com o resto dos arquivos. Se alguma falhar, o script avisa qual e mantém o link original; rode de novo mais tarde.
As fotos **reais da loja** não passam por aí: sobem pelo painel (*Novo produto → Foto*) e ficam no **Supabase Storage**, em endereço público e estável.

### Domínio próprio
Nas três hospedagens há uma tela para ligar um domínio (ex.: `luarmakes.com.br`).

---

## 4. Gerenciar os produtos (a dona não edita código)

Abra `https://SEU-SITE/#admin` (também há o link **Área da loja** no rodapé) e entre com e-mail e senha.

Há três abas: **Produtos**, **Categorias** e **Configurações**.

**Produtos**
- **Novo produto:** nome, descrição curta, categoria, unidades em estoque, foto, disponível, destaque.
- **Editar:** botão *Editar* em cada produto.
- **Buscar, filtrar e ordenar:** busca por nome; filtros por categoria, disponibilidade, destaque e estoque baixo; ordenação por nome, categoria ou quantidade em estoque.
- **Indisponível sem apagar:** chave *Disponível*. O produto continua na vitrine, mas sem o botão de compra.
- **Remover:** botão *Remover*, com confirmação.
- **Preço:** não existe campo. Todo produto custa **R$ 10,00**.

**Estoque**
- O campo *Unidades em estoque* é opcional. **Vazio** = a loja não controla (sem limite no carrinho; é o caso dos exemplos). **Um número** = a cliente não consegue pôr no carrinho mais do que isso. **Zero** = aparece como *Esgotado*.
- O alerta de **estoque baixo** usa o limite definido em *Configurações* (padrão: 3 unidades). Aparece um aviso no topo da aba Produtos e o filtro *Só estoque baixo*.
- O estoque **não diminui sozinho** quando uma cliente abre o WhatsApp, porque a mensagem ainda não é uma venda confirmada. A dona atualiza o número depois de confirmar o pedido. Não há integração de pedidos confirmados nesta versão.
- O limite vale na tela da cliente. Como o pedido sai como mensagem de WhatsApp (nada é gravado), ele não impede que duas clientes peçam a mesma última unidade ao mesmo tempo: a confirmação continua sendo da dona.

**Categorias**
- Criar, renomear (os produtos acompanham o novo nome), mudar a ordem (setas) e remover. Não dá para remover uma categoria que ainda tem produtos: mude esses produtos de categoria antes.
- A ordem daqui é a ordem na loja. Categorias sem produtos não aparecem para as clientes (por isso *Brincos* só aparece quando houver algum brinco cadastrado).

**Configurações** (valem na loja na hora, sem alterar o código)
- WhatsApp (com DDD), Instagram (`@usuario` ou link), endereço, instruções de retirada, instruções de entrega e limite de estoque baixo.
- Os pedidos passam a abrir a conversa com o WhatsApp salvo aqui. Não prometa horários, prazos ou entrega grátis que a loja não possa cumprir.

### Como trocar produtos e imagens de exemplo
1. No painel, clique em **Remover produtos de exemplo** (aparece enquanto houver algum). Isso apaga só os produtos marcados como exemplo e mantém os que ela cadastrou.
2. Cadastre os produtos reais com **Novo produto**. Em *Foto do produto* escolha o arquivo no celular (câmera ou galeria) ou computador: a foto é reduzida e guardada no Supabase, com prévia antes de salvar. Também dá para colar o link de uma imagem.
3. Para trocar só a foto de um item, abra *Editar* e escolha outra (a anterior é apagada do armazenamento).
4. Para trocar as **categorias**, use a aba *Categorias*.

Os nomes e fotos de exemplo vêm do catálogo do fornecedor **RS Makes**, só para demonstrar a vitrine. **A Luar Makes não é afiliada nem patrocinada pela RS Makes.** Todos aparecem por R$ 10,00; os preços do fornecedor não foram copiados. O catálogo consultado não tem brincos: a categoria *Brincos* existe, mas está vazia até a loja cadastrar os seus.

Pelo SQL: `delete from public.products where is_demo;` remove todos os exemplos de uma vez. Os dados de exemplo ficam em `src/data/demo-products.json`; depois de editá-lo, rode `npm run seed:sql` para regenerar `supabase/seed.sql`.

---

## 5. Alterar dados da loja

Com o Supabase ligado, **telefone, Instagram, endereço e instruções** são editados no painel (aba *Configurações*) e as **categorias** na aba *Categorias*. Os valores de `src/config.js` (`DEFAULT_SETTINGS`, `DEFAULT_CATEGORIES`) só valem como ponto de partida e no modo demonstração. O nome da marca e a frase *Realce sua luz* também ficam em `src/config.js`. O preço único é `PRICE_CENTS = 1000`, mas **o banco só aceita R$ 10,00**: para mudar o valor no futuro, altere a constante e a regra `check (price = 10.00)` em `supabase/schema.sql`.

### Visual
Cores e fontes estão no início de `src/styles.css` (`:root`). Os **números** (preços, quantidades, totais) usam um subconjunto da fonte Inter embutido em `src/fonts/` (só algarismos), para o "1" nunca parecer uma letra. Não troque a fonte dos números por uma fonte com algarismos "antigos" (como a Cormorant Garamond), que é o que causa essa confusão.

---

## 6. Como a segurança funciona

- Só a chave **anon** (pública) vai para o navegador. Ela é pública por desenho.
- Quem protege os dados são as **políticas RLS** do banco: qualquer pessoa **lê** a vitrine, as categorias e as configurações (o site precisa do WhatsApp e do endereço); só quem está em `admins` **grava** produtos, categorias, configurações ou envia fotos.
- O **preço** é validado no banco (`check (price = 10.00)`): nem uma chamada direta à API consegue gravar outro valor.
- O painel não envia preço. A mensagem do WhatsApp e o total do carrinho usam a constante R$ 10,00, nunca um valor vindo do banco.
- Nenhum pedido é gravado: o pedido existe como mensagem no WhatsApp. O site não confirma pedido nem pagamento.

---

## 7. Se algo der errado

| Mensagem | O que fazer |
| --- | --- |
| *A tabela de produtos / categorias / configurações ainda não existe* | Rode `supabase/schema.sql` (passo 2.2). Pode rodar de novo sem medo. |
| *Esta categoria ainda tem produtos* | Mude esses produtos para outra categoria e remova de novo. |
| *E-mail ou senha incorretos* | Confira o usuário em Authentication → Users. |
| *Este usuário não tem permissão para administrar* | Rode `supabase/first-admin.sql` com o e-mail dele (passo 2.3). |
| *Este e-mail ainda não foi confirmado* | No Supabase, abra o usuário e confirme-o (ou crie de novo com *Auto Confirm*). |
| *Sem permissão para salvar / enviar imagens* | Saia e entre de novo. Se persistir, confira a tabela `admins`. |
| *O espaço de imagens ainda não existe* | Rode `supabase/schema.sql` de novo. |
| *Sem conexão* | Confira a internet e se `VITE_SUPABASE_URL` está correto. |
| Faixa *Modo demonstração* no site publicado | As variáveis de ambiente não foram cadastradas na hospedagem. Cadastre e faça novo deploy. |

---

## 8. Estrutura

```
index.html               página
src/main.js              vitrine, carrinho, rotas
src/config.js            marca, valores iniciais da loja, preço
src/fonts/               algarismos nítidos (Inter, só 0–9)
src/lib/cart.js          carrinho (qtd × R$ 10,00, limite de estoque)
src/lib/stock.js         regras de estoque e alerta de estoque baixo
src/lib/settings.js      configurações da loja, WhatsApp e Instagram
src/lib/whatsapp.js      mensagem e link do WhatsApp
src/lib/supabaseStore.js leitura, login, gravação e fotos no Supabase
src/lib/demoStore.js     dados de demonstração em memória
src/ui/admin.js          painel da loja
src/data/demo-products.json  produtos de exemplo
supabase/schema.sql      tabelas, RLS, preço fixo, estoque, categorias, configurações, imagens
supabase/seed.sql        produtos de exemplo (gerado)
supabase/first-admin.sql primeira administradora
scripts/fetch-images.mjs baixa as fotos de exemplo para public/products/
tests/order.test.mjs     testes do total, estoque, configurações e mensagem
```

Comandos: `npm run dev` · `npm run build` · `npm test` · `npm run images` · `npm run seed:sql` · `npm run build:prototype` (gera um HTML único em `dist-prototype/`, usado no protótipo do Claude).

## 9. O que depende de configuração externa

- Conta e projeto no Supabase, execução dos SQLs e criação do usuário (seção 2).
- Hospedagem e variáveis de ambiente (seção 3).
- Fotos e produtos reais da loja (seção 4) e, antes de publicar, `npm run images` para as fotos de exemplo ficarem no próprio site (seção 3).
- Estoque: a dona atualiza as quantidades depois de confirmar cada pedido (não há integração de pedidos confirmados).
- Confirmar com a loja as condições de entrega antes de divulgar qualquer informação sobre elas. O site só oferece *Consultar entrega*.
