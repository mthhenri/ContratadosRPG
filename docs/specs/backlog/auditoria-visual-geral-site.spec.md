# auditoria-visual-geral-site.spec.md

> Task avulsa de **auditoria** (levantamento). Origem: pedido do autor após as Sessões 4 e 5 (27/10 e
> 10/11/2026): "ainda há partes visuais confusas pelo site, sem eu saber listar todas". Pedido **E** de
> `PEDIDO_CLAUDE_CODE_SPECS_SITE.md`. Só especificação: a auditoria em si **não** foi executada.
> Produz uma lista priorizada que vira specs menores; **não redesenha nada**.

## Objetivo

Inventariar **completamente** a definição visual e as telas do site e entregar uma lista priorizada de
problemas (onde está, o que confunde, gravidade, sugestão, e se contradiz o `DESIGN.md`), pronta para ser
fatiada em specs de correção e para alimentar os redesigns seguintes (fichas de Criatura/NPC, calendário).

## Estado atual encontrado

Contagens do levantamento de 25/11/2026 (grep/find no repositório; a auditoria deve refazê-las no
início, pois são o ponto de partida e não a verdade final):

| Superfície | Quantidade | Observação |
|---|---|---|
| Componentes `*.component.ts` | 185 | `shared` 56, `ficha` 40, `regras` 53, `documento` 11, `encontro` 8, `campanha` 6, `cena` 4, caderno 4, simulação 2, patchnotes 1 |
| Páginas `*.page.ts` | 46 (~47 rotas navegáveis) | públicas, autenticadas, só-mestre, só-admin e 4 janelas externas |
| Primitivos `shared/ui/` | 33 pastas, 38 specs | só `janela-externa-cabecalho` sem spec |
| Outros componentes visuais em `shared/` | 33 pastas | bandeja-dados, montador-rolagem, cartao-rolagem, tooltip, layout, marca, icone… |
| SCSS de componente/página | 217 | 38 com `@media`; 557 usos de mixin de breakpoint |
| Tokens (`docs/design/tema/_tokens.scss`) | 94 custom properties | cor ~81; tipografia 3; raio 5; espaço 5 + semânticos; **0 de sombra, z-index, duração e breakpoint** |
| Protótipos aprovados | 21 HTMLs em `docs/design/examples/` | `README.md` cita rotas antigas (`/painel`, `/calculadora/agente`) |

Sinais de desvio já medidos (candidatos, **não** veredito; podem incluir falso positivo):

- Hex em SCSS: 98 ocorrências; mais concentradas em `ficha-visualizacao`, `ficha-campanha-card`,
  `compras.page`, `patchnotes.page`, `ficha-inventario`. Em TS fora de spec: 43 (25 em `tema.service.ts`,
  legítimas por serem os presets/base clara).
- `border-radius`: 36 de 594 declarações são numéricas (as demais usam `var(--radius-*)`).
- `font-size` em px: 1.078 de 1.096. **Não é violação por si**: o `DESIGN.md` define a escala em px
  (24/22/15/13/11,5/10). A auditoria precisa checar **px fora da escala**, não px em si.
- Sombra e z-index sem token: 77 `box-shadow:` e 97 `z-index:` (92 literais), embora exista o primitivo
  `empilhamento`.
- `!important`: 22; `rgba()/rgb()` literal: 37; `[style.prop]` em HTML: 55 (os 39 `[style.--x]` são o
  padrão legítimo de custom property); `padding/margin/gap` em px literal: ~1.951 (a escala de 5 degraus
  existe só como variável).
- Espelho do tema **divergente**: `docs/design/tema/_tokens.scss` e `frontend/src/styles/tema/_tokens.scss`
  diferem em texto (também `_base` e `_glow`); a sincronia é manual. O frontend não tem `_componentes.scss`
  nem `tailwind.config.ts` em `tema/`. Verificar se a divergência é só comentário ou valor.
- Código possivelmente órfão: `transcricao.page` e `glossario.page` (módulo `transcricao`) sem rota nem uso
  fora dos specs; confirmar antes de auditar ou reportar como achado.
- **Não existe** catálogo/página de exemplos do design no app, regressão visual automatizada, a11y
  automatizada (axe/lighthouse) ou stylelint. Playwright não é dependência do repositório (global na
  máquina; ver skill `verify`).
- A base clara e os presets de cor de destaque existem em runtime (`tema.service.ts`): a auditoria cobre
  **duas bases × presets**.

### O que já foi auditado (não repetir; reaproveitar o método e os achados)

| Spec | Cobertura |
|---|---|
| `regras-auditoria-visual-completa` (done) | Página de Regras (Sistema e Guia): 4 viewports, painel/maximizado/gaveta, base clara, tabelas, busca. Gerou 10 specs de correção. |
| `ui-06-auditoria-conformidade-biblioteca-visual` (done, 30/08/2026) | Matriz de uso dos primitivos por módulo. Está **desatualizada** (há dezenas de specs de UI depois). |
| `ui-27-auditoria-componentes-fantasma` (done) | Componentes locais que duplicam `shared/ui`. |
| `montador-rolagem-cobertura-telas` (done, 22/10/2026) | Cobertura do montador nas telas. |
| `usabilidade-2026-09-13` e `usabilidade-classes-condicoes-2026-10-09` (backlog, parciais) | Jornadas, 4 viewports, 8 + 6 propostas sem aprovação. |

**Lacunas** (nunca auditadas de forma sistemática): lista/detalhe de campanha (mestre, jogador,
espectador, prévia), cenas/iniciativa, Biblioteca, ficha de Jogador/Criatura/NPC (exceto m4-21), acervo,
perfil, admin de usuários, login/registro, patchnotes, Simulação (só usabilidade), janelas externas, base
clara e presets em todas as telas, estados vazio/erro/skeleton.

## Método (regra do autor: inventário **completo**, nada de fora)

1. **Inventário estático completo**, gerado por script e anexado (não amostragem):
   1. tokens: cada token, onde é consumido, e todo valor visual **não** vindo de token (cor, fonte,
      raio, sombra, z-index, espaçamento, duração) por arquivo;
   2. tipografia: cada `font-size`/`font-weight`/`letter-spacing` comparado à escala do `DESIGN.md`;
   3. espaçamento: valores fora dos degraus 4/8/12/16/20 e dos semânticos;
   4. cada primitivo de `shared/ui/` com **todas** as variantes e estados que expõe versus os que os
      consumidores realmente usam (e HTML nativo estilizado à mão onde há primitivo, regra de
      `AGENTS.md`);
   5. cada componente das 33 pastas visuais de `shared/` fora de `ui`;
   6. cada página e fluxo: rota, papel, estados.
2. **Inventário vivo** (obrigatório, não opcional): rodar a aplicação real (skill `verify`) e percorrer
   cada rota nos viewports **360×800 e 1920×1080** (mínimo) e **960×1080 e 1366×768** nas telas
   representativas, em **base escura e clara**, e nos estados vazio, carregando, cheio, erro, desabilitado,
   foco e texto longo. Papéis: anônimo, jogador, mestre, espectador, admin.
3. **Site publicado.** A URL pública do frontend consta em `docs/specs/done/publicar-v1-12-0/verificacao.md`
   (Cloudflare Pages). Comparar o publicado com o ambiente local para separar defeito de código de defeito
   de deploy/dados. Se o ambiente da auditoria não alcançar o site publicado, **pedir ao autor capturas** e
   registrar o limite no relatório (ver pergunta 2). Nada é fabricado a partir do código quando a tela não
   foi vista.
4. **Comparação com o análogo aprovado** e com os protótipos de `docs/design/examples/` (que têm
   rotas antigas no README: corrigir o mapa antes de usar).
5. **Registro por problema**, com campos fixos (tabela única, ID `AV-###`):
   `rota/componente · arquivo:linha · o que confunde · evidência (captura em .artifacts/ ou contagem) ·
   gravidade · contradiz DESIGN.md? (sim/não + seção) · sugestão · spec filha proposta`.
6. **Gravidade** definida antes de auditar: **Crítica** (impede uso ou perde dado/contexto na mesa),
   **Alta** (confunde tarefa frequente de mesa), **Média** (inconsistência visível, sem perda), **Baixa**
   (acabamento).
7. **Fatiamento:** agrupar por causa-raiz (um achado de token ≠ cinquenta achados de tela) e propor
   specs menores ordenadas; **não** corrigir nada na própria auditoria.

## Entregáveis

> Anexos em `auditoria-visual-geral-site/` ao lado desta spec; capturas e saídas brutas em
> `.artifacts/auditoria-visual-geral-site/` (ignorado pelo Git).

1. `inventario-estatico.md` — todos os inventários do Método item 1, com o script que os gera (para
   rodar de novo) e as contagens.
2. `matriz-cobertura.md` — rota × viewport × base × papel × estado, com **observado / não observado /
   não aplicável**. Item não observado fica **aberto**, nunca "ok".
3. `achados.md` — a lista priorizada `AV-###` no formato do Método item 5.
4. `fatiamento.md` — proposta de specs filhas por causa-raiz, ordem e dependência, e o que depende de
   decisão do autor (primitivo novo ou ampliado, mudança de token).
5. `verificacao.md` — o que foi visto, o que não, evidências locais e limites (padrão dos relatórios de
   `docs/specs/done/`).
6. Entradas em `PROBLEMS.md` para defeito confirmado que não vai virar spec próxima e em `IDEAS.md` para
   melhoria; nenhuma correção de código.

## Critérios de Aceite

- A matriz cobre **todas** as rotas listadas no mapa de rotas vigente (`app.routes.ts` e os 13 arquivos
  `*.routes.ts`), com a mesma contagem de rotas do inventário; rotas sem observação aparecem como abertas.
- Cada achado tem os oito campos; achado sem evidência verificável é rejeitado.
- Os números de desvio (hex, raio, sombra, z-index, px fora da escala) são **reproduzíveis** pelo script
  anexo, e a distinção entre "px na escala" e "px fora da escala" está explícita.
- A divergência entre `docs/design/tema/` e `frontend/src/styles/tema/` está classificada (valor ou
  comentário) e listada.
- A auditoria **não** altera código de produto, `DESIGN.md`, tokens, migrations nem `docs/core/`.
- `npm run repo:verificar` sem alerta; relatório lista o que ficou pendente.

## Fora de Escopo

- Corrigir qualquer achado, redesenhar telas, alterar tokens ou criar primitivos.
- Fichas de Criatura e NPC (têm spec própria: `ficha-criatura-npc-revamp-visual`), calendário
  (`calendario-campanha-mundo`) e montador de rolagens (`montador-rolagens-revisao`): a auditoria registra
  achados deles, mas a correção é dessas specs.
- Auditoria de segurança/permissão (já feita em `auditoria-ficha-oculta-*`) e de conteúdo editorial dos
  livros.
- Acessibilidade formal completa WCAG: a auditoria registra o que for visível (contraste, foco, alvo de
  toque de 44px, nome acessível), sem prometer conformidade.
- Remover código órfão: só é registrado.

## Dependências

- Nenhuma para começar. Convém rodar **antes** dos redesigns D e B (alimenta seus achados), porém não os
  bloqueia.
- Fontes: `docs/design/DESIGN.md`, `docs/design/tema/`, `docs/design/MARCAS.md`, skills `design-fidelity` e
  `verify`, `docs/specs/done/regras-auditoria-visual-completa/auditoria.md` (método de referência).

## Impacto (skill `gerenciamento-de-impacto`)

Nenhum código de produto. Cria anexos de spec e, no fecho, entradas de `PROBLEMS.md`/`IDEAS.md`/`HISTORY.md`.
O script de inventário, se versionado, vive junto dos anexos da spec (não em `scripts/` de produto, salvo
decisão do autor).

## Riscos e Mitigação

- **Amostragem disfarçada de inventário:** mitigada pela matriz de cobertura e pelo critério "item não
  observado fica aberto".
- **Esforço desproporcional:** ~47 rotas × 4 viewports × 2 bases × estados × papéis passa de mil
  combinações. Mitigação: mínimo obrigatório em 360×800 e 1920×1080 para todas; os outros dois viewports,
  a base clara e os estados raros por **tela representativa por família**, com a família e o motivo
  registrados. Pode ser fatiada em rodadas (pergunta 3).
- **Falso positivo de grep:** hex em comentário, `px` na escala, `style` de custom property legítimo.
  Mitigação: classificar cada ocorrência.
- **Ambiente sem dados realistas:** campanha, fichas e cenas vazias escondem o problema que o autor
  vê na mesa. Mitigação: usar o cenário de desenvolvimento (`dev-02-cenario-dev-completo`) e registrar
  o que foi populado.
- **Execução paralela duplicada:** não delegar a mesma tela a vários agentes; o gate visual de UI não se
  fecha por relato de subagente (`AGENTS.md`).

## Estratégia de testes e verificação

Sem teste de produto novo. Verificação: reexecutar o script de inventário e conferir as contagens;
reabrir uma amostra de achados no app real; `repo:verificar`.

## Perguntas abertas

1. **Prioridade de áreas:** há telas que o autor sabe que confundem e devem ser auditadas primeiro (por
   exemplo detalhe da campanha do mestre, painel de cena/iniciativa, Biblioteca)?
2. **Site publicado:** a URL do frontend em `done/publicar-v1-12-0/verificacao.md` ainda é a vigente e o
   ambiente da auditoria terá acesso a ela? Se não, o autor envia capturas das telas que mais incomodam?
3. **Rodadas:** fazer tudo numa tarefa ou em rodadas (1: tokens e primitivos; 2: campanha e cena; 3:
   ficha e acervo; 4: o resto)?
4. **Código órfão:** `transcricao.page` e `glossario.page` entram como achado ou o autor já sabe o estado
   deles?
5. **Critério de "confuso":** o autor quer incluir **texto/rótulo/UX** (termos, ordem de ações, mensagens)
   além de aspecto visual?
