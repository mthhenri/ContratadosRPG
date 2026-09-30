# m4-10-refinamento-mobile-criatura-npc.spec.md

> Task 10/10 do milestone `m4-ficha-criatura-npc.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md`; reusar
> `src/styles/tema/_breakpoints.scss` (`$bp-mobile`, mixin `mobile`, `$alvo-toque`) e o
> padrão de densidade por tokens já validado em `m1-15`/`m3-09`. Nada de largura mágica
> por arquivo nem hex/fonte/raio solto (proibição #29).

## Objetivo

Refinamento de UI/UX **mobile** dos dois assistentes de criação (criatura e NPC,
multi-etapas), das fichas prontas de criatura/NPC e da listagem/revelação no painel do mestre
(`m4-04`/`m4-04b`/`m4-08`/`m4-08b`/`m4-09`) —
usáveis em ~360px, sem scroll horizontal, com alvos de toque adequados e navegação de
etapas confortável no polegar. Só apresentação — sem tocar em regra de jogo ou de negócio.
Task explicitamente reservada para o fim do milestone (escopo acordado em
`m4-ficha-criatura-npc.spec.md`).

## Entregáveis

1. **Os dois assistentes de criação** usáveis em ~360px sem scroll horizontal: trilha de
   etapas adaptada a mobile (mesmo padrão do guia de criação de ficha de jogador —
   trilha vira barra de progresso no topo, resumo operacional vira bottom sheet, se
   aplicável ao volume de conteúdo de cada roteiro).
2. **Listagem/revelação do painel do mestre** (`m4-09`) usável em ~360px: cards/linhas que
   refluem, sem rolagem horizontal.
3. **Alvos de toque ≥ 44px** (`$alvo-toque`) em todos os controles interativos dos
   fluxos.
4. **Verificação responsiva registrada** (`360×800`, `390×844`, `430×932`, `960×1080`,
   `1366×768` e `1920×1080` para confirmar que nada regrediu no desktop), na linha do gate
   obrigatório de UI (`AGENTS.md`) e de
   `docs/PARIDADE-M1.md` §6.
5. **Ficha pronta de NPC**: composição/abas e ações inferiores conforme
   `docs/design/FICHA-NPC.md`; comparar com jogador e criatura atuais. Cobrir leitura e
   edição, listas longas/vazias, teclado/foco, Civil sem Energia, Cooperação e histórico
   lateral aberto; nenhuma ação inferior pode cobrir conteúdo. Conferir também a ficha
   pronta de criatura, sem redesenhar seus dados ou sua composição desktop.

## Critérios de Aceite

- Assistentes de criação e listagem do mestre usáveis no mobile (~360px) sem scroll
  horizontal (critério de aceite do milestone).
- Alvos de toque confortáveis; densidade coerente com o padrão já estabelecido no projeto.
- `lint`/`test`/`build` do frontend verdes; identidade "Terminal de Contenção" preservada.
- Executar `verify` no stack real e registrar comparação pessoal contra os análogos,
  estados, viewports e correções. Esta task complementa os gates mobile de `m4-08`,
  `m4-08b` e `m4-09`; não autoriza adiá-los até o fim do milestone.

## Fora de Escopo

- Novas features ou telas além das entregues em `m4-04`/`m4-04b`/`m4-08`/`m4-08b`/`m4-09`.
- Qualquer mudança de regra de negócio, permissão ou de domínio.
- Rework visual desktop.

## Dependências

- `m4-04`, `m4-04b`, `m4-08`, `m4-08b`, `m4-09` (telas base a refinar).
- `m1-15`/`m3-09` (padrão responsivo por tokens já validado no projeto).
- `docs/design/FICHA-NPC.md` (contrato visual do NPC).

## Execução — 2026-09-30

M4-09 concluída e enviada em `03926a60`; árvore limpa e remoto sincronizado antes desta task.
Análogos: guia de jogador (`paginas/criar/`) para progresso, resumo e navegação inferior;
guia de criatura atual para densidade/etapas; ficha de jogador e ficha de criatura atuais
para hierarquia, abas e ações; `CampanhaFichasEspeciais`/acervo para listagem e acesso.
Primitivos reutilizados: Campo/StepInput, Botao/BotaoIcone, Cartao, Abas, ColunaAcoes,
ValorEditavel, EstadoVazio, Stat e Modal. Sem mudança de regra, DTO ou permissão.

Inspeção inicial encontrou alvos pequenos em campos, modificadores, edição inline e
ações inferiores. O autor autorizou ampliar os primitivos em 2026-09-30 (“Pode ajustar”).
Ambos os resumos agora usam Modal inferior no mobile, com foco/Escape/body lock;
ValorEditavel/BarraRecurso/ColunaAcoes preservam piso real de 44px e rolagem interna.
Comparação pessoal também corrigiu o alinhamento de atual/separador/máximo na barra.

Gates concluídos: 2703 testes frontend/195 arquivos, 55 focados, build aprovado e lint
dos três workspaces sem erros; avisos legados separados. Revisão independente sem
achados. Aplicação real percorrida nos seis viewports com os dois assistentes, cinco
categorias, listas/abas, edição/leitura, teclado/foco, Cooperação, histórico, resumos
e campanha. Análogo de jogador observado após a alteração dos primitivos.

Resultado e critérios registrados em `docs/reviews/m4-10-verificacao.md`.
Cenário próprio limpo por soft delete. Nenhuma pendência obrigatória da task;
fecho com commit separado e envio ao remoto conforme autorização do autor.
