# m3-61-ficha-cor-tema.spec.md

> Task 57 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Permitir que o dono (ou o mestre) escolha uma **cor de identidade visual** para uma ficha, de
forma que as rolagens feitas por aquele personagem apareçam diferenciadas por cor — na
bandeja de dados da própria ficha, no histórico de rolagens e no feed "Rolagens Recentes" do
painel de campanha do mestre.

**Atenção — não confundir com `--accent`:** `--accent` já é a cor de tema escolhida por
**cada usuário** (`TemaService`, seletor M1, persistida em `localStorage`, aplicada via
`style.setProperty` no `<html>`). A cor da ficha é uma identidade **por personagem**, visível
igualmente para todo mundo que olha a rolagem — precisa ser um token **novo e independente**
(`--cor-ficha`), nunca uma substituição do `--accent` do viewer.

## Entregáveis

1. Migration `0012 - Ficha cor.sql`:
   ```sql
   -- UP
   ALTER TABLE ficha ADD COLUMN cor VARCHAR;
   -- DOWN
   ALTER TABLE ficha DROP COLUMN IF EXISTS cor;
   ```
   Nullable, sem `DEFAULT` (proibição #7) — ficha existente nasce sem cor definida.
2. `cor: string | null` somado aos DTOs de operação de ficha que já carregam `nome`
   (`shared/src/dtos/ficha/ficha-operacao.dtos.ts`): `FichaCriarDto`, `FichaCriadaDto`,
   `FichaAlterarDto`, `FichaAlteradaDto`, `FichaRecuperadaDto`.
3. Backend:
   - `FichaRepository`: `cor` entra no `INSERT ... SELECT ... RETURNING` de `criarFicha`, no
     `SELECT` de `recuperarPorId`, e no `UPDATE` de `alterarFicha` — mesmo padrão relacional
     de `nome`, ao lado (não dentro) do JSONB `dados`.
   - `FichaService.criarFicha`/`alterarFicha` repassam o campo. **Sem trava de imutabilidade
     nova** — dono ou mestre editam livremente, reusando a `validarPermissaoEdicao` já
     existente (não é regra de jogo, é preferência cosmética).
   - Validação estrutural (camada 1, class-validator): `cor` opcional; quando presente,
     formato hex de 6 dígitos (`@Matches(/^#[0-9A-Fa-f]{6}$/)`).
4. **Threading para o sistema de rolagem** (o ponto central da feature):
   - `RolagemResumoDto` (`shared/src/dtos/rolagem/rolagem-operacao.dtos.ts`) ganha
     `corFicha: string | null`.
   - `RolagemRepository` (`colunasResumo()`/`juncoesResumo()`, `backend/src/modules/rolagem/rolagem.repository.ts`)
     soma `ficha.cor AS "corFicha"` na mesma query que já resolve `nomeFicha`/`nomeAutor` via
     `INNER JOIN ficha` — sem qualquer mudança em `RolagemService` ou no gateway: o campo já
     "pega carona" no `RolagemResumoDto` que hoje trafega tanto no REST (`listarPorFicha`,
     `listarPorCampanha`) quanto no evento WebSocket `rolagem:registrada`
     (`CampanhaGateway.emitirRolagemRegistrada`).
5. Frontend:
   - Novo token de tema, **independente do `--accent`**: `--cor-ficha` (+ variantes
     `--cor-ficha-dim`/`--cor-ficha-border` via `color-mix()`, mesma receita do `--accent` em
     `docs/design/tema/_tokens.scss`), sempre setado **inline por instância**
     (`[style.--cor-ficha]`) — nunca um valor global fixo no SCSS. Documentar o padrão em
     `DESIGN.md`.
   - `ficha-visualizacao.component` (bloco `ficha-ident` do cabeçalho): swatch/color-picker
     (`<input type="color">` embrulhado em `FormControl`/Reactive Forms, mesmo padrão de
     `configuracoes-tema.component`), visível a quem tem permissão de editar o cabeçalho;
     emite um `@Output() ajusteCor`, que `visualizar.page.ts` persiste com o mesmo padrão
     otimista + debounced já usado por `ajustarNome`/`ajustarPersonalidade`
     (`agendarPersistencia()`).
   - `BandejaDadosService`/`EntradaBandeja` (`frontend/src/app/shared/bandeja-dados/`): novo
     campo opcional `corFicha`; os chamadores ficha-scoped (`ficha-visualizacao`,
     `ficha-rolagens`, `ficha-inventario`, `ficha-combos` — todos já têm a ficha atual em
     escopo) passam a cor da ficha ao chamar `bandeja.mostrar(...)`.
   - `ResultadoRolagem` (`frontend/src/app/shared/resultado-rolagem/`, componente único
     reusado pela bandeja e pelo histórico): novo `input()` opcional `corFicha`; `.scss`
     troca `var(--accent)` por `var(--cor-ficha, var(--accent))` no total/crítico — cai no
     accent do viewer quando a ficha não tem cor definida (fichas antigas, sem quebra).
   - `HistoricoRolagensSidebar` (`frontend/src/app/shared/historico-rolagens-sidebar/`,
     reusado tanto na aba Histórico da ficha quanto no feed "Rolagens Recentes" do painel de
     campanha): lê `item.corFicha` por linha, binda `[style.--cor-ficha]` no item da lista e
     repassa pro `<app-resultado-rolagem>` aninhado. **Sem mudança nenhuma** em
     `campanha/paginas/detalhe/detalhe.page.ts` — o componente só encaminha os itens que já
     chegam com `corFicha`.
6. **Assistente/guia de criação também coleta a cor.** A escolha não fica só pra depois, no
   cabeçalho — entra já na criação da ficha, junto do Codinome:
   - **Hoje** (`FichaCriarDialog`,
     `frontend/src/app/modules/ficha/componentes/ficha-criar-dialog/`, ponto de criação
     atual): soma o mesmo swatch do item 5 ao lado do campo Codinome; o valor entra no
     `FichaAssistenteResultado`/`construirFichaInicial` (`modules/ficha/ficha-padrao.ts`)
     como `cor`, indo para o `POST /ficha` inicial (`FichaCriarDto.cor`).
   - **Quando `m3-57` (guia de criação por passos) existir**, o mesmo swatch entra no
     **Passo 01 // BASE** (identidade inicial: dono + Codinome/Agente) — ajuste já registrado
     na própria spec `m3-57`.

## Critérios de Aceite

- Dono ou mestre define/altera a cor pelo cabeçalho da ficha; persiste via `PUT /ficha/:id`.
- A cor também pode ser escolhida no momento da criação (`FichaCriarDialog` hoje; Passo 01 do
  guia quando `m3-57` existir).
- Rolagens feitas por aquela ficha aparecem coloridas com a cor definida: na bandeja de dados
  da própria ficha, na aba Histórico da ficha e no feed "Rolagens Recentes" do painel de
  campanha — tanto ao carregar via REST quanto em tempo real (WebSocket).
- Ficha sem cor definida (`null`) cai no `--accent` atual de quem está olhando — comportamento
  de hoje, sem quebra para fichas existentes.
- A cor de ficha nunca sobrescreve nem interfere no `--accent` global do viewer — o seletor de
  tema M1 continua funcionando isolado, para qualquer ficha.

## Fora de Escopo

- Acento visual da cor no card do acervo (`/fichas`) ou no chip de campanha.
- Trava de contraste mínimo na escolha da cor (color-picker nativo livre — ao contrário do
  seletor de tema M1, que tem `CONTRASTE_MINIMO`).
- UI de criatura/NPC (M4, ainda não existe) — a coluna é ficha-wide, mas sem consumidor lá
  ainda.

## Dependências

- `m3-10` (edição no próprio lugar do cabeçalho), sistema de rolagem (`m3-15` em diante),
  `m3-27` (histórico de rolagem), painel de campanha (`m2-16`/detalhe).
- Enriquece (não bloqueia) `m3-57` quando esta for implementada.
