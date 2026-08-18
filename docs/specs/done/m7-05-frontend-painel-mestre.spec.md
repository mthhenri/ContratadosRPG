# m7-05-frontend-painel-mestre.spec.md

> Task 5/8 do milestone `m7-encontro-combate.spec.md`.

## Objetivo

Construir o **painel de combate do mestre** (desktop) fiel ao mockup
`docs/design/examples/iniciativa-desktop.html`: montagem do encontro, cartões de combatente e os
controles de condução. Visão do jogador é a `m7-06`; log é a `m7-07`; mobile é a `m7-08`.

## Entregáveis

1. **Módulo** `frontend/src/app/modules/encontro` (Angular standalone + Signals), rota guardada
   pelo `mestre-campanha.guard` já existente. Rótulo de UI: **"Iniciativa"**
   (`Iniciativa · <nome do encontro>`) — "Encontro" é nome de domínio, não texto de tela.
2. **Cabeçalho de condução**: `Rodada N`, `Turno N/total`, faixa "Age agora — <combatente>" e os
   botões `Voltar`, `Avançar`, `Rolar tudo`, `Encerrar`.
3. **Cartão de combatente** conforme o mockup: iniciativa em destaque + rótulo `inic`; etiqueta de
   estado (`Age agora`, `Já agiu`) ou natureza (`Ameaça · NA <n>`, `Aliado NPC`, `Avulso`,
   `Morrendo`); linha de origem; nome; **steppers `−`/`+`** de Vida e Energia; faixa de defesas;
   chips de condição com duração.
   - **Regra vence o mockup (§16 #27):** criatura exibe **somente Defesa** — sem Esquiva/Bloqueio/
     Contra-Ataque, que não existem em `FichaCriaturaDadosDto`. Avulso exibe só Vida.
     Energia aparece só para quem a tem.
4. **Montagem**: adicionar combatente (ficha da campanha ou avulso com nome/vida/cadência), remover
   combatente, atribuir/ajustar iniciativa à mão, `Rolar tudo`, iniciar o combate.
5. **Estado do servidor** via service Angular consumindo os endpoints da `m7-03`/`m7-04`; a ordem e
   os rótulos derivados vêm de `shared/regras/encontro` e dos rótulos já existentes
   (`rotulos-criatura.ts`) — **nenhuma regra reimplementada no frontend**.
6. **Processo obrigatório de UI (AGENTS.md)**: registrar o **componente análogo aprovado**
   (a ficha de criatura da `m4-04b` é a referência de densidade/abas/cartões), consumir apenas
   tokens de `docs/design/tema/_tokens.scss`, reusar os padrões BEM de `_componentes.scss` e o
   `.botao` encapsulado por componente. Nunca `title` nativo — sempre `appTooltip`.
7. Botões de editar/remover por item **sob demanda** (modo de edição explícito), nunca sempre
   visíveis.

## Critérios de Aceite

- Painel comparado visualmente ao mockup e ao análogo aprovado, em `1920×1080`, via skill `verify`
  rodando a aplicação real; estados percorridos: montagem, ativo, combatente morrendo, encerrado
- Criatura sem Esquiva/Bloqueio/Contra na tela
- Sem hex/fonte/raio hardcoded; sem overflow; foco e contraste corretos
- `npm run test -w frontend` verde; `npm run lint -w frontend` limpo

## Dependências

- `m7-04` (API completa de condução)
