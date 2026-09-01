# UI-16 — Barra de recurso e recuo do cartão de combatente

> Filha da auditoria visual (seções Cartão de combatente e Componentes novos).
> Mexe em tela de jogo: pede uma rodada de mesa antes de fechar.

## Objetivo

Criar o primitivo de recurso (Vida, Energia, Sanidade) que hoje é remarcado em cada tela, e
corrigir o recuo do estado "já agiu", que apaga justamente os números que o mestre precisa ler.

## Entregáveis

1. `app-barra-recurso`: par rótulo/valor com trilho de 6px, cor por recurso e limiar de alerta
   abaixo de 25%. Tokens: `--vida`, `--energy`, `--warning`, `--surface-2` (trilho),
   `--radius-control`, rótulo 10px/600.
2. Adotar na ficha, no cartão de combatente e no painel do mestre, apagando a marcação própria
   de cada um. No cartão, Vida e Energia deixam de ser texto puro com steppers de 18px em volta —
   os controles sobem para o alvo mínimo.
3. Trocar o recuo de `--agiu`: em vez de `opacity: .62` no cartão inteiro, recuar pela moldura —
   retrato a 0,55, etiqueta "já agiu" em `--text-mute`, borda atenuada — mantendo números e
   barras em contraste cheio.
4. Fixar a precedência entre `--ativo`, `--agiu` e `--morrendo`, que hoje podem coincidir sem
   regra, e documentá-la no `DESIGN.md`.
5. Promover Cadência de nota de rodapé (9px na linha de origem) a chip de severidade info, usando
   o primitivo da `ui-13`.

## Critérios de Aceite

- Uma criatura de Cadência 2 no estado "já agiu" mantém Vida, Defesa e selo de iniciativa
  legíveis; o recuo continua perceptível à distância de leitura da mesa.
- As três combinações de estado têm resultado definido e reproduzível, sem soma de opacidades.
- Steppers de recurso no cartão têm alvo de 44px no mobile.
- Gate visual do encontro nos dois viewports, nos três estados e nas combinações.

## Fora de Escopo

Regras de jogo (valores, limites, cálculo de sobrecarga), reordenar a fila de iniciativa e
redesenhar o retrato.

## Dependências

`ui-13` (chip com severidade), `tema/_tokens.scss`, `docs/design/DESIGN.md`.

## Riscos e Mitigação

- Trocar o recuo pode deixar o "já agiu" fraco demais na mesa. Validar em sessão real antes de
  fechar a task; se necessário, somar um segundo sinal de moldura em vez de voltar à opacidade
  global.
