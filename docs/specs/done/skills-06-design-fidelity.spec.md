# skills-06-design-fidelity.spec.md

> Task 6/9 do guarda-chuva `skills-agentes.spec.md`. Skill nova: `design-fidelity`.

## Objetivo

Criar a skill `design-fidelity`, que executa o **gate visual obrigatório** do repositório: escolher
e registrar o componente análogo aprovado, construir sobre os padrões que já existem, e comparar
a tela renderizada com o análogo antes de apresentar o trabalho ao autor.

## Motivação

`verify` ensina **como rodar e dirigir o app**. Nenhuma skill ensina **contra o que comparar** —
e é essa a parte que o `CLAUDE.md` mais detalha ("Processo obrigatório para qualquer UI ou
estilo", seis passos) e a que mais falha na prática:

- `P-028` · `CONTORNADO`: Maestria de Vigor commitada sem nenhuma evidência visual ao vivo, com
  testes e lint verdes — exatamente o atalho que o gate existe para impedir.
- `P-020` · **CRÍTICO**: templates e SCSS compactados, resultado de construir sem padrão.
- `P-005`: barra de abas cortando letra no desktop, achada só em auditoria posterior.
- `SYSTEM.SPEC.md` §16.31 registra o gate como proibição absoluta: nunca declarar UI pronta sem
  verificação visual ao vivo, comparando **pessoalmente** com um análogo aprovado.

O material para comparar existe e está subaproveitado: `docs/design/examples/` tem 24 capturas do
app real, em pares desktop/mobile (`<tela>.html` e `<tela>--mobile.html`), com a tabela de
"padrões visuais a reaproveitar" por tela.

## Entregáveis

1. **`design-fidelity/SKILL.md`** nas duas pastas, na ordem dos seis passos do `CLAUDE.md`:
   - **Antes de editar:** ler `docs/design/DESIGN.md` e o handoff de `docs/design/tema/`;
     escolher e **registrar por escrito** o componente análogo aprovado, mapeando não só cor mas
     shell, densidade, hierarquia, espaçamento, controles, estados, iconografia e comportamento
     responsivo. "Usar os tokens" não é escolher análogo.
   - **Como escolher o análogo:** tabela de partida ligando tipo de tela ao arquivo de
     `docs/design/examples/` e ao componente vivo correspondente em `frontend/src/app/` — por
     exemplo formulário → `login.html`/`cadastro.html`; listagem de cards →
     `campanhas.html`/`acervo-de-fichas.html`; tela densa com abas → `ficha-de-jogador.html`;
     fluxo por passos → `ficha-criacao-guia.html`; painel de mestre/combate →
     `iniciativa-desktop.html`/`iniciativa-mobile.html`. Montar a tabela a partir do README de
     `examples/`, conferindo cada par de arquivos.
   - **Construir:** consumir tokens (`var(--surface)`, `var(--accent)`, `var(--font-mono)`…),
     nunca hex/fonte/raio hardcoded; copiar o bloco BEM canônico de
     `docs/design/tema/_componentes.scss` para o `.scss` scoped; BEM em português; Tailwind para
     layout/espaçamento/tipografia; `[appTooltip]` em vez do `title` nativo; primeiro um corte
     visual representativo — não um formulário HTML genérico coberto de tokens.
   - **Verificar:** chamar a skill `verify` (ponteiro, sem duplicar o procedimento) em
     `1920×1080` **e** `360×800`, mais os viewports e estados que a spec exigir; percorrer os
     estados reais (vazio, carregando/skeleton, cheio, erro, desabilitado, foco, item longo) —
     captura só do estado inicial não valida tela interativa.
   - **Comparar e decidir:** checklist explícito de aprovação — parece parte do mesmo produto;
     mesma densidade e hierarquia; controles, ícones e estados canônicos; não parece HTML
     genérico; sem overflow; foco, contraste e alvo de toque corretos.
   - **Corrigir antes de apresentar:** divergência encontrada se corrige na mesma task; build,
     testes, lint e uso correto de token **não** substituem a comparação.
2. **Regra de delegação** citada de forma inequívoca: relato ou screenshot de subagente não
   encerra o gate — o agente principal inspeciona pessoalmente nos viewports obrigatórios. Se a
   aplicação real não puder ser executada ou observada, a tarefa visual permanece **aberta**.
3. **Aviso sobre `docs/design/examples/`**: são capturas estáticas do app real, com `<script>`
   removido — servem para forma, cor, densidade e padrão, não para comportamento; e envelhecem.
   Se a tela mudou de verdade, recapturar (ponteiro para "Como regenerar" no README) em vez de
   comparar com captura velha.
4. **Nota anti-`P-020`**: o corte visual entregue precisa ser legível no fonte — sem template ou
   SCSS compactado em linha única; ponteiro para `npm run format:html-scss -w frontend`.
5. **`description` como gatilho**: UI, tela, layout, componente, estilo, SCSS, tema, responsivo,
   mobile, visual — e disparando também em "criar página" e "ajustar tela", que não citam nenhuma
   dessas palavras.
6. **Corte de tamanho**: se passar de ~150 linhas, mover a tabela de análogos por tipo de tela
   para `design-fidelity/references/analogos.md` nas duas pastas.

## Critérios de Aceite

- Todo arquivo de `docs/design/examples/` citado na tabela de análogos existe (conferir com `ls`),
  e o par mobile correspondente também.
- A skill aponta para `verify` para levantar o stack em vez de repetir o procedimento.
- O checklist de comparação é acionável: cada item pode ser respondido com sim/não olhando a tela,
  sem interpretação.
- **Validação por uso:** exercitar a skill sobre uma tela **já existente e aprovada** (não uma
  mudança nova) — escolher o análogo, capturar os dois viewports pela `verify` e responder o
  checklist inteiro. Uma tela já aprovada deve passar; se reprovar, ou o checklist está errado ou
  achou-se um defeito real (nesse caso registrar em `PROBLEMS.md`, não corrigir aqui). Registrar
  o exercício e as capturas usadas no fecho.
- `diff -r .claude/skills .agents/skills` vazio.
- Fecho completo conforme `AGENTS.md`.

## Fora de Escopo

- **Corrigir `P-005`, `P-028` ou `P-020`.** A skill existe para não repeti-los. `P-028` em
  particular exige a verificação ao vivo da Maestria de Vigor — é task própria, não esta.
- Regenerar as capturas de `docs/design/examples/`. Se a validação por uso mostrar que alguma
  está desatualizada, registrar; recapturar é trabalho separado.
- Alterar tokens, `_componentes.scss` ou qualquer decisão de `docs/design/` — a skill executa a
  identidade visual, não a define.
- Absorver o conteúdo de `verify` (stack, Playwright, sessão, WebSocket). Ponteiro, nunca cópia.
- Ferramenta de comparação automática de screenshot (regressão visual). Cabe em `IDEAS.md`.

## Dependências

- `skills-03` (`verify` alinhada) — esta skill aponta para ela; alinhar antes evita apontar para
  a cópia pobre.
- `skills-01` (contrato).

## Riscos e Mitigação

- **Virar paráfrase do `CLAUDE.md`.** O valor próprio desta skill é a **tabela de análogos** e o
  **checklist acionável** — se a implementação sair sem essas duas coisas, ela não justifica
  existir.
- **Checklist longo demais para ser usado sob pressa.** Manter no máximo os sete itens do passo
  de comparação; o resto vira `references/`.
