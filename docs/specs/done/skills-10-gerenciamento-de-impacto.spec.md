# skills-10-gerenciamento-de-impacto.spec.md

> Task solta, pedido direto do autor (2026-10-13). Continua a família `skills-01`…`skills-09`
> (guarda-chuva `skills-agentes.spec.md`, já em `done/`). Origem: o botão "Trocar senha" do
> Perfil exibe uma medalha.

## Objetivo

Dar aos agentes um processo obrigatório e um gatilho determinístico para medir o impacto de
alterar algo muito referenciado — ícone, primitivo de `shared/ui/`, token/SCSS de tema, regra pura
de `shared/regras`, DTO/enum de `shared/`, service ou evento usado por vários módulos — **antes**
de alterar, olhando cada consumidor e decidindo o que acontece com ele.

## Motivação

O projeto cresceu além do ponto em que o agente "lembra" quem usa o quê. O caso que motivou o
pedido: em `perfil.page.html` o botão "Trocar senha" usa `<app-icone nome="patente" />`, cujo
desenho é a medalha da Patente. O histórico (`git log -L` no `@case ("patente")`) mostra que o
desenho nunca mudou: o botão nasceu assim em `6b33f25d` (m2-14), **reaproveitando** um ícone com
sentido próprio. É a mesma família de `caderno` × `anotacoes` e `vincular` × `duplicar` — ambos
corrigidos depois de achados ao vivo. Os dois sentidos do problema são impacto:

- **Para fora:** mudar o desenho/comportamento de algo compartilhado muda todos os consumidores,
  inclusive os que só o pegaram emprestado.
- **Para dentro:** reaproveitar um item que já tem sentido próprio acopla o novo uso à evolução
  daquele sentido.

## Entregáveis

1. **Skill `gerenciamento-de-impacto`** em `.claude/skills/` e `.agents/skills/` (cópias
   idênticas, contrato comum de `CLAUDE.md`): `description` como gatilho; ordem de execução
   (localizar consumidores → classificar cada um → decidir → registrar); a regra de decisão do
   autor ("tudo tem impacto": todo consumidor é avaliado, e consumidor afetado além do pedido para
   a tarefa e vai ao autor); regra de reaproveitamento (não pegar emprestado item com sentido
   próprio); tabela de onde procurar consumidores por tipo de item; ponteiros para `regras-do-jogo`,
   `tempo-real`, `design-fidelity` e `convencoes-check` sem repetir o conteúdo delas.
2. **Script `scripts/impacto.mjs`** (`npm run impacto -- <alvo>`): lista os consumidores de um
   arquivo (importadores TS, `@use`/`@import` SCSS, seletor de componente em templates), de um
   ícone (`--icone <nome>`) ou de um símbolo (`--simbolo <Nome>`), agrupados por workspace, sem
   `node_modules`/`dist`. Testes em `scripts/impacto.test.mjs`, rodados por `npm run repo:test`.
3. **Hook do Claude Code** (`PostToolUse` em `Edit|Write|MultiEdit`, registrado em
   `.claude/settings.json`): quando o arquivo editado está numa zona compartilhada, injeta um
   lembrete com a contagem de consumidores e o ponteiro para a skill; uma vez por arquivo por
   sessão; nunca bloqueia.
4. **`CLAUDE.md` e `AGENTS.md`** (idênticos): uma linha em "Antes de alterar código" apontando
   para a skill.
5. **Validação por uso:** aplicar a skill ao botão "Trocar senha" — ícone próprio `senha` (glifo
   "key" da Tabler Icons, MIT, como os demais importados), conferindo os demais consumidores de
   `patente` e registrando o mapa de impacto em
   `docs/specs/<estado>/skills-10-gerenciamento-de-impacto/validacao.md`.

## Critérios de Aceite

- `diff -r .claude/skills .agents/skills` e `diff AGENTS.md CLAUDE.md` vazios.
- `npm run impacto -- --icone patente` lista o Perfil e a aba Patentes da simulação;
  `npm run impacto -- frontend/src/app/shared/ui/botao/botao.component.ts` lista consumidores reais.
- `npm run repo:test` verde, incluindo os testes novos do script.
- O hook, alimentado com a entrada JSON de um `Edit` em `frontend/src/app/shared/icone/...`,
  devolve `additionalContext`; com um arquivo fora das zonas ou repetido na mesma sessão, não
  devolve nada.
- Teste do ícone: `senha` tem assinatura própria, distinta de `patente`. `npm run lint` e o teste
  focado do ícone verdes.
- Gate visual do Perfil (`verify`, `1920×1080` e `360×800`), com a aba Patentes da simulação
  conferida como consumidor não alterado.
- `npm run repo:verificar` verde.

## Fora de Escopo

- Auditar todos os reaproveitamentos de ícone existentes do projeto — achados viram `PROBLEMS.md`.
- Hook para o Codex (o Codex lê a skill via `AGENTS.md`).
- Bloquear edições automaticamente.
- Grafo de dependências completo ou análise semântica (o script é busca textual orientada).

## Dependências

- `docs/design/DESIGN.md` e `icone.component.ts` (convenção dos glifos importados).
- Skills `design-fidelity` e `verify` para o gate visual da validação.

## Riscos e Mitigação

- **Lembrete que vira ruído.** Mitigado por zonas explícitas e deduplicação por sessão.
- **Script com falso negativo** (uso dinâmico, como `icone: 'patente'` em array de abas). Mitigado
  por buscar também o literal entre aspas e por a skill mandar conferir o resultado, não confiar
  nele.
