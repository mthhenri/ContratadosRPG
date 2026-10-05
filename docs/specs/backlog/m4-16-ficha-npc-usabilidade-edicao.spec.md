# m4-16-ficha-npc-usabilidade-edicao.spec.md

> Task adicional do milestone `m4-ficha-criatura-npc.spec.md`, continuação da revisão do NPC
> (`m4-12`…`m4-15`, em `done/`). Pedido direto do autor (2026-10-05): *"quando você clica no
> editar, ele não tem um cancelar… ele só tem um editar e é isso. Então temos que rever toda a
> usabilidade desse cara."* Retoma o que a `m4-14` deixou de fora de propósito — o **modelo e o
> fluxo de edição** (decisão 1 da `m4-14`) — agora a pedido do autor.
>
> **Ordem das três specs desta frente:** `m4-16` (esta) → `m4-17`
> (`m4-17-ficha-npc-coluna-identidade-compacta.spec.md`) → `m4-18`
> (`m4-18-ficha-npc-atributos-como-jogador.spec.md`). As duas últimas **consomem o padrão de
> edição definido aqui**; por isso esta vem primeiro.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e o handoff em `docs/design/tema/`.
> **Análogos aprovados obrigatórios** (registrar no fecho qual serviu para quê):
> - a edição do card **Atributos da ficha de Jogador**
>   (`componentes/ficha-visualizacao/ficha-visualizacao.component.html`, bloco `#blocoAtributos`,
>   `editandoAtributos()`): lápis no cabeçalho **some** ao editar e **Salvar + Cancelar**
>   (`app-botao`) aparecem logo abaixo do cabeçalho do próprio card;
> - a edição do card **Atributos da ficha de Criatura**
>   (`componentes/criatura-visualizacao/criatura-visualizacao.component.html`,
>   `atributosEmEdicao()`): `criatura__atributos-acoes` com Salvar/Cancelar `tamanho="pequeno"`
>   e avisos de validação **dentro** do card; a classificação usa o lápis que vira ✕
>   ("Cancelar edição") — `criatura__lapis--ativo`.
> Mapear shell, densidade, hierarquia, espaçamento, controles, estados, iconografia e
> comportamento responsivo — não só "usar os tokens".

## Objetivo

Hoje, ao clicar no lápis de um bloco da ficha de NPC, os campos aparecem no lugar, mas o
**Cancelar** e o **Salvar alterações** estão num cartão de rascunho (`ficha-pagina__rascunho`)
colocado em `visualizar-npc.page.html` **depois** das duas colunas — longe do bloco editado e,
no mobile, no fim da página inteira. O lápis continua o mesmo ("Editar") e não oferece saída.
Esta task faz toda edição da ficha de NPC ter **entrada, saída e confirmação no próprio bloco**,
com o mesmo desenho que Jogador e Criatura já usam, e revisa a usabilidade ponta a ponta
(foco, teclado, erro, estado de salvando, saída da página).

## Decisões de abertura (confirmar com o autor **antes** de implementar)

O modelo atual (`NpcEdicaoFormulario` + `FichaEdicaoNpcService`) tem **um** rascunho de ficha e
**um** `grupo` ativo por vez, mas o rascunho **acumula** os grupos já editados (`mesclarDocumento`)
e o texto do cartão diz *"Salvar confirma todos os grupos editados"* — o autor não vê quais
blocos estão alterados. Há duas formas de resolver; **pergunte** (`AskUserQuestion`) e só
implemente a escolhida:

1. **Salvar por bloco (recomendada).** Cada bloco (Identidade, Recursos, Cooperação, Atributos,
   Conduta, Habilidades, Sequelas/Traumas) edita sozinho: **Salvar** grava só aquele bloco e
   **Cancelar** descarta só aquele bloco. Um bloco em edição por vez; clicar no lápis de outro
   enquanto um está em edição é bloqueado com explicação (lápis desabilitado + `appTooltip`
   "Conclua ou cancele a edição de <bloco>"). O cartão de rascunho global some. É o mesmo modelo
   do card de Atributos de Jogador e Criatura. O PUT continua sendo da ficha inteira
   (`alterarFichaNpc`), com o `dados` completo e a validação de `shared/regras/npc` — só muda
   **quando** e **o que** o formulário monta.
2. **Manter o rascunho acumulado**, mas tornar visível: Salvar/Cancelar no bloco ativo, um
   indicador (ponto/etiqueta "Alterado") nos blocos que têm mudança pendente e o cartão global
   reduzido a um resumo ("2 blocos com alterações — Salvar tudo / Descartar tudo").

Se o autor escolher a 1, `NpcEdicaoFormulario`/`FichaEdicaoNpcService` mudam (ver item 2). Em
qualquer escolha, **contrato, DTO, endpoint, permissão, regra de domínio e tempo real não mudam**.

## Entregáveis

### 1. Auditoria de usabilidade (primeiro passo, antes de editar)

Com o app real rodando (**pedir autorização ao autor antes de subir o stack**; ver `verify`),
percorrer **todo ponto de edição** da ficha de NPC em `1920×1080` e `360×800` e registrar uma
**tabela** no fecho: *ponto de entrada → como cancela → como salva → onde o botão aparece na tela
→ foco depois de entrar/sair → onde o erro de validação aparece*. Pontos: Identidade (nome,
função, categoria, nível, cooperação, cor), Recursos (Vida/Defesa/Bloquear/Esquivar/Energia/
Recarga), Cooperação, Atributos, Conduta (3 campos), Habilidades (adicionar/editar/remover item),
Sequelas/Traumas, retrato (escolher/enquadrar/remover — já imediato, fora do rascunho), ajuste
rápido de Vida/Energia (`app-barra-recurso` editável, imediato), Anotações (painel flutuante, já
tem Salvar/Cancelar próprios). A tabela é o contrato dos itens 2–5: **não implementar nada que
não esteja nela**. Hipóteses já vistas no código, a confirmar ao vivo:

- Salvar/Cancelar fora da viewport do bloco editado (cartão no fim da página).
- Lápis permanece igual durante a edição; não há saída óbvia no bloco.
- Dois lápis ("Editar identidade" e "Alterar Cooperação") abrem o **mesmo** grupo `identidade`
  — o autor não sabe que editar um abre os campos do outro.
- Erro de validação (`edicao.erro()`, `formulario.erroFormulario()`, `edicao.violacoes()`) sai
  em `ficha-pagina__erro`/`ficha-pagina__pendencias`, fora do bloco.
- Habilidades/Sequelas/Traumas: "Concluir" por item **e** Salvar global — dois níveis de
  confirmação.
- Sem foco gerenciado, sem Esc para cancelar, sem aviso de qual bloco está editando.

### 2. Padrão único de edição por bloco

Seguindo a decisão de abertura escolhida (recomendada: 1):

- Cabeçalho do bloco: com o bloco **fora** de edição, lápis (`app-botao-icone`, `app-icone
  nome="editar"`, `appTooltip`); em edição, o lápis **some** (padrão Jogador) e, logo abaixo do
  cabeçalho **do próprio bloco**, aparece a linha de ações com **Salvar** (`app-botao
  variante="primario"`) e **Cancelar** (`app-botao variante="secundario"`), `tamanho="pequeno"` no
  desktop e alvo ≥ 44 px no mobile, na mesma ordem e com a mesma classe de receita do análogo.
  Nada de botão nativo estilizado à mão; usar a API completa dos primitivos (`[variante]`,
  `[estilo]`, `[tamanho]`, `[carregando]`).
- Salvar: `[carregando]` + `[disabled]` enquanto `edicao.salvando()`; desabilitado quando há
  violação conhecida. Cancelar: desabilitado só enquanto salvando.
- Erro de validação e violações de `validarFichaNpc` aparecem **dentro do bloco editado**,
  logo abaixo da linha de ações (como `criatura__atributos-aviso`), com `role="alert"`; o
  `ficha-pagina__erro` global fica só para falha de carga/rede sem bloco associado.
- Cooperação e Identidade deixam de compartilhar sem aviso o mesmo formulário: ou viram **um**
  bloco com **um** lápis (a Cooperação passa a ser editada na própria Identidade, ver `m4-17`),
  ou cada lápis abre só os campos do seu bloco. Registrar a escolha no fecho.
- Habilidades, Sequelas e Traumas: o lápis do cabeçalho da lista liga o modo de edição **da
  lista** com Salvar/Cancelar no cabeçalho da lista; o "Concluir" por item deixa de existir como
  segundo nível de confirmação (o item editado é parte do rascunho da lista), mantendo editar/
  remover por item **somente** depois do lápis (memória do projeto: "botões sob demanda").
- Se a decisão for a 1: remover `ficha-pagina__rascunho` e `ficha-pagina__rascunho-acoes` da
  página (e o SCSS morto); `visualizar-npc.page.ts` perde `salvar()`/`textoPersistencia` do
  rascunho global, ou o reduz ao estado "Salvando…/Salvo/Falha ao salvar" do cabeçalho.

### 3. Teclado, foco e acessibilidade

- Ao entrar em edição, o foco vai para o primeiro campo do bloco; ao salvar ou cancelar, volta
  ao lápis do bloco (ou ao próprio bloco, se o lápis sumiu — usar `tabindex="-1"` no cabeçalho).
- **Esc** dentro do bloco em edição cancela (mesma ação do botão), exceto com um menu/seleção
  aberto; **Ctrl/Cmd+Enter** salva; **Enter** em campo de uma linha não salva sozinho (evita
  salvar sem querer), a menos que o análogo já faça diferente — nesse caso seguir o análogo.
- O bloco em edição ganha estado visual de "editando" (borda/realce de acento já usados por
  `criatura__lapis--ativo` ou pelo card de Atributos em edição — **sem inventar token**) e
  `aria-busy` enquanto salva; o resumo para leitor de tela anuncia "Editando <bloco>".
- Contraste, foco visível e alvos de toque corretos nos dois viewports.

### 4. Saída da página e perda de dados

- Manter o guard de saída existente (`canDeactivate`, `edicaoPendente`/`imagemPendente`) —
  agora disparado quando **há bloco em edição com alteração**, não só rascunho global.
- Cancelar um bloco **sem alterações** não pergunta nada; cancelar com alterações descarta sem
  confirmação (padrão Jogador/Criatura) — **a menos que o autor peça confirmação**; registrar.
- Falha de salvamento mantém o bloco aberto com o erro dentro dele e os valores digitados
  preservados (nunca fechar o bloco nem perder o texto).

### 5. Modo leitor, concorrência e estados raros

- Modo leitor (`gerenciavel() === false`): nenhum lápis, nenhuma linha de ações, nada de foco
  forçado — como hoje.
- Revogação de acesso, exclusão da ficha por outro mestre e reconexão **durante** a edição:
  comportamento atual preservado (testes existentes de reconexão/revogação continuam
  passando); se o bloco em edição perder a ficha, sair do modo de edição com mensagem no bloco.
- Dois blocos nunca editam ao mesmo tempo (decisão 1) ou o indicador deixa claro quais estão
  alterados (decisão 2).

## Critérios de Aceite

- Em `1920×1080` e `360×800`, **todo** bloco editável mostra Salvar e Cancelar **dentro do
  próprio bloco**, visíveis sem rolar além do bloco; nenhum Salvar/Cancelar fica no fim da
  página (decisão 1) e o texto *"Salvar confirma todos os grupos editados"* não existe mais.
- Tabela da auditoria (item 1) no fecho com cada linha marcada como resolvida.
- Comparação lado a lado com o card de Atributos de Jogador/Criatura em edição: mesmo desenho
  de ações, mesma densidade, mesmos controles; **não parece HTML genérico**.
- Esc/Ctrl+Enter/foco funcionam e estão cobertos por teste; erro de validação aparece no bloco.
- Nenhuma mudança de conteúdo, regra, fórmula, permissão, DTO, endpoint, rolagem ou tempo real;
  os mesmos campos editam e persistem como antes (conferir `alterarFichaNpc` por teste).
- Nenhum SCSS/template morto (`ficha-pagina__rascunho*` se removidos); sem hardcode; sem overflow.

## Verificação exigida

- **Testes:** `npc-edicao-formulario.service.spec.ts`, `ficha-edicao-npc.service.spec.ts`,
  `npc-visualizacao.component.spec.ts` e `visualizar-npc.page.spec.ts` ajustados ao novo fluxo,
  **sem enfraquecer** as asserções de comportamento (edição por bloco, ajuste de Vida/Energia,
  "Confirmar socorro", modo leitor, salvar/cancelar, reconexão, revogação, guard de saída).
  Novos testes: Salvar/Cancelar dentro do bloco, lápis some em edição, erro dentro do bloco,
  Esc cancela, foco volta ao lápis, bloqueio de segundo bloco (decisão 1), falha de salvamento
  preserva valores. Rodar o spec focado a cada passo e a suíte completa + lint no fecho.
- **Gate visual obrigatório** (`AGENTS.md`, skills `verify` e `design-fidelity`), em
  `1920×1080` **e** `360×800`, percorrendo cada bloco em edição com: valor válido, valor
  inválido (violação), salvando (atraso simulado de rede), falha de rede, cancelar com e sem
  alteração; NPC combatente e Civil (sem Energia); modo mestre e modo leitor; painel de
  histórico aberto; teclado (Tab, Esc, Ctrl+Enter). O agente principal inspeciona pessoalmente.
- Dados de teste por soft delete ao fim; nenhuma ficha real tocada.

## Fora de Escopo

- Qualquer mudança visual de **layout** da coluna de identidade (`m4-17`) ou dos atributos
  (`m4-18`) — esta task só muda **como se edita**, não **como cada bloco se vê em leitura**.
- Itens da coluna de ações, conteúdo/regras do NPC, rolagens, tempo real, o painel de
  Anotações (já tem Salvar/Cancelar próprios), o upload/enquadramento do retrato (já
  imediato).
- Backend, `shared/regras/npc`, DTOs, rotas e permissões.
- Ficha de Criatura e de Jogador (são o análogo, não o alvo).
- Achado fora do escopo vira `PROBLEMS.md`/`IDEAS.md` e aviso ao autor, sem corrigir aqui.

## Dependências

- `m4-14` (`done`) — a ficha de NPC no casco atual; `m4-15`, `m4-13`, `m4-12` (`done`).
- Fontes: `docs/design/DESIGN.md`, `docs/design/tema/`, `docs/SYSTEM.SPEC.md`,
  `docs/CONVENTIONS.md`, e a memória do projeto "botões de editar/remover sob demanda" e
  "edição no próprio lugar".
- Antecede `m4-17` e `m4-18`.

## Riscos e Mitigação

- **Mexer no modelo de edição quebra a reconexão/revogação.** Há testes de reconexão e revogação
  em `visualizar-npc.page.spec.ts`; reutilizá-los como rede de segurança e **não** enfraquecer.
- **Salvar por bloco com PUT da ficha inteira** pode sobrescrever alteração concorrente de outro
  bloco feita por outro cliente. Hoje já é assim (rascunho da ficha inteira); manter a mesma
  garantia e **registrar**, não resolver aqui. Se aparecer, `PROBLEMS.md`.
- **Atalho tentador:** esconder o cartão de rascunho por CSS ou duplicar botões Salvar/Cancelar
  em cada template. Extrair um subcomponente de ações de bloco (ou usar um já existente em
  `shared/ui/` se houver) — se `shared/ui/` não cobrir (ex.: uma "barra de ações de edição"
  compartilhada), **parar e perguntar ao autor** antes de criar ou ampliar primitivo.
- `npc-visualizacao.component.html` já tem ~490 linhas: **extrair** o bloco de ações de edição e,
  se necessário, os blocos Identidade/Recursos em subcomponentes antes de acrescentar lógica;
  registrar no fecho a razão se não extrair.
