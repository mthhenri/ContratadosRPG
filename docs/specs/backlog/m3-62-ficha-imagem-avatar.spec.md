# m3-62-ficha-imagem-avatar.spec.md

> Task 58 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Permitir upload de uma imagem de avatar para a ficha. O binário **não** entra no Postgres —
só o caminho/URL da imagem persiste numa coluna nova; o arquivo em si fica num armazenamento
externo ao banco.

**Decisão adiada pelo autor:** qual provedor de blob storage usar em produção (Supabase
Storage, Cloudflare R2 ou outro) ainda não foi escolhido. Esta task entrega uma **interface de
armazenamento** com uma única implementação concreta por ora — disco local do backend —
projetada para que trocar de provedor depois seja plugar uma segunda implementação atrás da
mesma interface, sem tocar no resto do fluxo (endpoint, DTOs, coluna, frontend).

## Entregáveis

1. Migration `0013 - Ficha imagem.sql`:
   ```sql
   -- UP
   ALTER TABLE ficha ADD COLUMN imagem_url VARCHAR;
   -- DOWN
   ALTER TABLE ficha DROP COLUMN IF EXISTS imagem_url;
   ```
   Nullable, sem `DEFAULT` (proibição #7).
2. Backend — módulo pequeno de armazenamento (local a definir na implementação, ex.
   `backend/src/core/armazenamento/`): interface com dois métodos —
   `salvarImagem(dto): Promise<{ caminho: string }>` e `excluirImagem(dto: { caminho: string })`.
   **Uma implementação por ora**: disco local (`backend/uploads/ficha/<uuid>.<extensão>`),
   servida como estático via `app.useStaticAssets` (`NestExpressApplication`, já habilitado
   por `@nestjs/platform-express` — nenhuma dependência nova) sob o prefixo `/uploads`.
   **Documentar explicitamente** (comentário no código + nota em `docs/DEPLOY.md`): o disco do
   Render é **efêmero** — imagens são perdidas a cada redeploy em produção até um provedor de
   blob storage real ser escolhido e plugado atrás da mesma interface.
3. Endpoint dedicado — não cabe no `PUT /ficha/:id` genérico por ser multipart:
   - `POST /ficha/:id/imagem` (`FileInterceptor('arquivo')`) → controller monta
     `{ id, arquivo }` e chama `FichaService.alterarImagem` (controller continua burra,
     proibição #2). Validações de negócio (`BusinessException` se falhar): MIME em
     `image/jpeg`/`image/png`/`image/webp`; tamanho máximo (ex.: 2MB). Permissão: mesma
     `validarPermissaoEdicao` (dono ou mestre) já usada em `alterarFicha`. Ao trocar de
     imagem, **exclui o arquivo anterior** do armazenamento (não acumula lixo). Retorna
     `FichaImagemAlteradaDto`.
   - `DELETE /ficha/:id/imagem` → remove o avatar (seta `imagem_url = null` e exclui o
     arquivo do armazenamento).
4. DTOs (`shared/src/dtos/ficha/ficha-operacao.dtos.ts`):
   - `FichaImagemAlteradaDto { imagemUrl: string | null }` — saída do upload/remoção.
   - `imagemUrl: string | null` somado aos DTOs de leitura que já carregam `nome`/`cor`:
     `FichaCriadaDto`, `FichaAlteradaDto`, `FichaRecuperadaDto`, e também `FichaResumoDto`
     (para o card do acervo).
5. `FichaRepository`: `imagem_url AS "imagemUrl"` nas `SELECT`s relevantes (`recuperarPorId`,
   `colunasResumo()`) + um método de `UPDATE` dedicado só para esse campo — não passa pelo
   `alterarFicha` genérico, que continua só `nome` + `cor` + `dados`.
6. Frontend:
   - `ficha-ident__avatar` (bloco `ficha-ident` do cabeçalho, hoje um `<span>` decorativo
     vazio): troca por um `<img>` real quando `ficha.imagemUrl` existir, mantendo o
     placeholder atual como fallback. Affordance de upload (ícone sobre o avatar), visível só
     a quem tem permissão de edição do cabeçalho — abre
     `<input type="file" accept="image/jpeg,image/png,image/webp">`, valida tamanho no client
     antes de enviar (feedback imediato), envia via `FormData`
     (`FichaService.alterarImagem(id, arquivo)`), atualiza o signal local direto com a nova
     `imagemUrl` — **sem** passar pelo `agendarPersistencia` debounced (upload é imediato,
     não é edição de campo em lote).
   - Card do acervo (`acervo.page.html`): mesma troca de placeholder por `<img>` real quando o
     item (`FichaResumoDto`) tiver `imagemUrl`.
7. **Assistente/guia de criação também coleta o avatar.** Mesmo raciocínio da cor
   (`m3-61`, item 6):
   - **Hoje** (`FichaCriarDialog`): affordance de upload (mesmo `<input type="file">`
     validado no client) ao lado do Codinome. Como `POST /ficha` cria a ficha antes de existir
     um `id` para usar em `POST /ficha/:id/imagem`, o fluxo é **criar a ficha primeiro, então
     subir a imagem em seguida** (dois requests em sequência); falha no upload não desfaz a
     ficha criada — só fica sem avatar, podendo subir depois pelo cabeçalho.
   - **Quando `m3-57` existir**, entra no **Passo 01 // BASE**, com a mesma ressalva de ordem:
     a ficha só existe de fato após o "Criar ficha" do passo 09 // REVISÃO — o passo 01 apenas
     guarda o arquivo escolhido até lá, e o upload real acontece só depois do `POST /ficha`.

## Critérios de Aceite

- Dono ou mestre sobe uma imagem (jpg/png/webp, até 2MB) pela ficha; ela substitui o avatar
  decorativo no cabeçalho e no card do acervo.
- A imagem também pode ser escolhida no momento da criação (`FichaCriarDialog` hoje; Passo 01
  do guia quando `m3-57` existir), sem impedir a criação da ficha se o upload falhar.
- Trocar a imagem remove a anterior do armazenamento — não acumula arquivo órfão.
- Upload fora do tipo ou tamanho permitido é rejeitado com mensagem clara, sem afetar o resto
  da ficha.
- Nenhum binário de imagem é gravado em coluna do Postgres — só `imagem_url` (caminho/URL).
- Em dev e em produção (por ora), a imagem é servida do disco do backend; documentado que essa
  implementação é efêmera em produção até a escolha de um provedor de blob storage real.

## Fora de Escopo

- Escolha e integração de um provedor remoto de blob storage (Supabase Storage, R2, etc.) —
  decisão adiada pelo autor; a interface de armazenamento já nasce pronta para receber uma
  segunda implementação sem tocar no resto do fluxo.
- Redimensionamento/compressão da imagem no servidor — sem `sharp` por ora, só validação de
  tipo/tamanho.
- Crop/editor de imagem no client.
- Imagem de criatura/NPC (M4, ainda não existe) — a coluna é ficha-wide, mas sem consumidor
  lá ainda.
- Migração de imagens já existentes (não há nenhuma hoje).

## Dependências

- `m3-28` (acervo de fichas, para o card), CRUD de ficha (`m3-03`).
- Enriquece (não bloqueia) `m3-57` quando esta for implementada.
