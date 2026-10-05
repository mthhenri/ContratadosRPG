# m4-14-ficha-npc-aparencia-estrutura.spec.md

> Task adicional do milestone `m4-ficha-criatura-npc.spec.md`, revisão do trabalho de NPC.
> Pedido direto do autor (2026-10-04): a ficha completa de NPC *"tem que ser ajustada e temos que
> revisar"*; instado a precisar, o autor apontou **aparência e estrutura** (e **não** ações da
> coluna, conteúdo/regras nem edição/rolagens). Revisa a `m4-08b`
> (`docs/specs/done/m4-08b-frontend-visualizacao-npc.spec.md`).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e o handoff em `docs/design/tema/`.
> **Análogo aprovado obrigatório:** a ficha de Criatura — página
> (`paginas/visualizar-criatura/`) e componente
> (`componentes/criatura-visualizacao/`) —, também do mestre. A ficha de Jogador
> (`paginas/visualizar/`, `componentes/ficha-visualizacao/`) é referência secundária para o
> casco de página. Mapear shell, densidade, hierarquia, espaçamento, controles, estados,
> iconografia e comportamento responsivo — não só "usar os tokens".

## Objetivo

A ficha de NPC (`/fichas/npc/:id`) foi construída com casco e vocabulário próprios (`npc-pagina__*`
na página, `npc__*` na visualização), enquanto Jogador e Criatura compartilham `ficha-pagina__*` e
a mesma linguagem de cartões. O resultado não lê como parte do mesmo produto. Esta task alinha
**aparência e estrutura** da ficha de NPC com a de Criatura, sem alterar o que ela mostra, edita
ou calcula.

## Decisões de abertura

Tomadas com o autor antes da escrita:

1. **Escopo: aparência e estrutura.** Ficam **fora** — e permanecem exatamente como estão —:
   itens da coluna de ações (sem Caderno, Ocultar/Exibir ficha, Ocultar rolagens ou janela
   externa), conteúdo e regras do NPC, e o modelo de edição (por grupo, com rascunho e "Salvar").
2. **Referência: a ficha de Criatura.** Mesmo público (mestre), mesma densidade esperada.

## Entregáveis

### 1. Diagnóstico visual (primeiro passo, antes de editar)

Com o app real rodando (**pedir autorização ao autor antes de subir o stack**; ver `verify`),
abrir lado a lado uma ficha de NPC e uma de Criatura em `1920×1080` e `360×800` e registrar uma
**lista de divergências** (cabeçalho, ordem e agrupamento das seções, hierarquia dos títulos,
densidade e espaçamento, cartões de identidade/recursos/habilidades/sanidade, estados de
edição, comportamento do painel lateral aberto, mobile). Essa lista é o contrato dos itens 2 e 3 e
entra no fecho — **não implementar nada que não esteja nela**. Se o diagnóstico revelar uma
divergência que exija ampliar um primitivo de `shared/ui/` ou criar um novo, **parar e perguntar
ao autor** antes de seguir.

### 2. Casco da página (`visualizar-npc.page.{html,scss}`)

Trocar `npc-pagina__*` pelo casco `ficha-pagina__*` da ficha de Criatura, preservando o
comportamento já existente:

- Cabeçalho (`ficha-pagina__cabecalho`): voltar (`app-botao-icone`), `//`, título (nome do NPC),
  chip/nome da campanha, régua, estado de persistência (Salvando…/Salvo/Falha ao salvar/
  Rascunho). O voltar continua indo para `rotaSaida()` (acervo ou campanha).
- Raiz `ficha-pagina` com o modificador de painel lateral aberto, no mesmo contrato da criatura
  (o NPC já tem `historicoAberto`; só o nome/classe do modificador converge).
- Esqueleto de carga, erro de carga com "Tentar novamente" e o cartão de rascunho
  ("Alterações em rascunho…") consumindo os mesmos primitivos/padrões da criatura onde existirem;
  onde a criatura não tem equivalente, manter o do NPC.
- A coluna de ações (`app-coluna-acoes`) **não muda de itens** (decisão 1).

### 3. Estrutura da visualização (`npc-visualizacao.component.{html,scss}`)

Reorganizar conforme o diagnóstico (item 1), para a hierarquia de cartões e a densidade da
criatura. Direção já visível no código, **a confirmar no diagnóstico**:

- O cartão "Identidade" concentra hoje perfil, retrato, Vida, Energia, Defesa/Bloquear/Esquivar,
  Cooperação e dois botões de edição soltos ("Alterar Cooperação", "Editar recursos"). Convergir
  para o desenho da criatura: identidade/retrato separados dos recursos, controles de edição no
  lugar e na forma do análogo (ícone de editar no cabeçalho do cartão), sem botões de contorno
  soltos no corpo.
- Chips e metadados (`app-chip`), barras de recurso, stats e botões usam a API completa dos
  primitivos (`[variante]`, `[estilo]`, `[tamanho]`, `[posicaoIcone]`); nenhum `<button>`/campo
  nativo estilizado à mão.
- O componente tem 462 linhas de template e responsabilidades de identidade, recursos, edição
  por grupo e listas. Antes de acrescentar qualquer coisa, avaliar a extração em subcomponentes
  (ele já extrai `npc-habilidades-lista` e `npc-sanidade-lista`); se a reorganização pedir um
  bloco novo, extrair, e registrar no fecho a razão se não extrair.
- `npc-visualizacao.scss` passa a consumir tokens e padrões BEM do projeto; remover o que ficar
  morto. Nenhum hex, fonte ou raio solto.
- Modo leitor (`gerenciavel() === false`, "Somente leitura") mantém o que mostra hoje, no novo
  casco.

## Critérios de Aceite

- Lado a lado com a ficha de Criatura em `1920×1080` e `360×800`: mesmo casco de página, mesma
  hierarquia de cartões, mesma densidade, mesmos controles, ícones e estados; **não parece HTML
  genérico**, sem botões de contorno soltos no corpo.
- Nenhuma mudança de conteúdo, regra, fórmula, permissão, edição, rolagem, tempo real, DTO ou
  endpoint; os mesmos campos aparecem e editam como antes (por grupo, com Salvar/Descartar).
- Itens da coluna de ações inalterados.
- Modo mestre e modo leitor corretos; painel lateral aberto (histórico) não gera overflow.
- Foco, contraste e alvos de toque ≥ 44 px corretos; sem overflow em nenhum viewport.
- Nenhum `npc-pagina__*`/`npc__*` remanescente que duplique o que o casco da criatura oferece;
  nenhum estilo morto; nenhum hardcode.

## Verificação exigida

- **Testes**: `visualizar-npc.page.spec.ts` e `npc-visualizacao.component.spec.ts` ajustados ao
  novo casco/estrutura, sem enfraquecer asserções de comportamento (edição por grupo, ajuste de
  Vida/Energia, "Confirmar socorro", modo leitor, salvar/descartar). **Reutilizar** as
  asserções existentes; só seletores/estrutura mudam.
- **Gate visual obrigatório** (`AGENTS.md`, skills `verify` e `design-fidelity`), em
  `1920×1080` **e** `360×800`, percorrendo: NPC combatente e NPC Civil (sem Energia); modo mestre
  e modo leitor; cada grupo em edição (identidade, recursos, habilidades, conduta/sanidade) com
  rascunho e erro de validação; painel de histórico aberto; carga e erro de carga. Comparação com
  a ficha de Criatura registrada no fecho, com as divergências do item 1 marcadas como
  resolvidas. O agente principal inspeciona pessoalmente.
- Estados persistidos em `localStorage` (se a ficha tiver algum): plantar a chave e capturar o
  estado não padrão.

## Fora de Escopo

- Ações da coluna, conteúdo/regras do NPC, modelo e fluxo de edição, rolagens e tempo real (todos
  marcados como "não" pelo autor na abertura).
- Qualquer mudança em `shared/regras/npc`, backend, DTO, rota ou permissão.
- A ficha de Criatura e a de Jogador — são o análogo, não o alvo.
- O guia de criação de NPC (`m4-13`) e o acervo (`m4-12`).
- Se o diagnóstico revelar problema **fora** de aparência/estrutura (regra errada, campo
  faltando, ação ausente): **registrar em `docs/context/PROBLEMS.md` ou `IDEAS.md`** e avisar o
  autor, sem corrigir aqui.

## Dependências

- `m4-08b` (`done`) — a ficha de NPC atual; `m4-10` (`done`) — refinamento mobile que precisa
  sobreviver à reorganização.
- `m4-04b` (`done`) — a ficha de Criatura (análogo).
- `m4-13` é independente; pode ser feita antes ou depois.
