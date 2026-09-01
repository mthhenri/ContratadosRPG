# UI-13 — Chip com severidade e ícone

> Filha da auditoria visual (seção Cartão · Stat · Chip). Absorve cinco cópias da mesma receita.

## Objetivo

Ampliar o `app-chip` — hoje duas variantes de texto puro — para cobrir o selo que já existe
copiado à mão em cinco lugares, e migrar esses consumidores.

## Entregáveis

1. Adicionar ao `app-chip` as entradas `[severidade]` e `[tom]` e um slot de ícone opcional. A
   receita nasce do que já está no código: mono uppercase, borda a 40% e fundo a 12% da cor da
   severidade, com `--tracking-label`.
2. Migrar `.indicador-tempo-real`, `.historico-rolagens__privada`,
   `.bandeja__visibilidade--privada`, `.combatente__condicao` e `.combatente__etiqueta--ameaca`
   para o primitivo, apagando a identidade BEM local de cada um e preservando só a classe de
   layout quando ainda for necessária.
3. Promover o raio 3px do selo a token (`--radius-selo`) em `_tokens.scss`: o valor é real e se
   repete nos seis arquivos, mas está fora dos dois tokens de forma (6px/4px).
4. Documentar no `DESIGN.md` as severidades aceitas e a regra de escolha entre chip de rótulo e
   chip de severidade.

## Critérios de Aceite

- Nenhuma das cinco classes migradas ainda declara cor de borda, cor de fundo ou tipografia de
  selo; `grep` por `rgba(` com 0.12/0.4 nos arquivos tocados volta vazio.
- O raio 3px não aparece mais literal em nenhum dos seis arquivos.
- Os selos mantêm a aparência atual nos dois viewports (comparação lado a lado antes/depois) e o
  gate visual de encontro, histórico e bandeja passa sem diferença não intencional.

## Fora de Escopo

Criar chip removível, chip clicável ou severidades que nenhum consumidor usa hoje. Estado "sem
valor" do `app-stat` e rodapé do `app-cartao` ficam para uma task própria.

## Dependências

`ui-12` (mapa de severidade), `ui-03`, `app-icone`.
