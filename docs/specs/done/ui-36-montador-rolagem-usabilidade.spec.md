# ui-36-montador-rolagem-usabilidade.spec.md

> Spec avulsa, fora da fila de milestone. Revisão de usabilidade do `MontadorRolagem` (`ui-35`,
> já commitado) depois de usar de verdade — pedido do autor numa única mensagem, com plano
> aprovado antes de implementar (ver `HISTORY.md`).

## Objetivo

Tornar o teclado de tokens da "Rolagem rápida" realmente fácil de usar por um jogador que não
conhece a sintaxe da fórmula: virar caixa flutuante (arrastável, como `CalculadoraFlutuante`),
trocar texto por ícone de dado real com `D{faces}` sobreposto, fazer clique repetido no mesmo
dado somar quantidade em vez de duplicar token, simplificar `kh`/`kl` (sempre 1), tirar
explosão/implosão da UI por enquanto, deixar os tokens curtos em tiles quadrados, renomear a
seção de atributo+ajuste, e fixar Limpar/Apagar/Rolar num rodapé sempre visível. Nenhuma regra de
dados nova — `validarFormula` continua sendo quem decide o que é aceito.

## Entregáveis

1. `MontadorRolagem` reescrito como caixa flutuante: gatilho inline (estilo do botão "Rolar" —
   `.ficha-rol__btn--rolar` — como toggle), `app-painel-flutuante` (ui-17) com visor editável
   fixo no topo, corpo rolável com os grupos de token e rodapé fixo (Apagar último/Limpar/Rolar).
2. `incrementarUltimoDado` (`montador-rolagem.util.ts`, função pura testável sem `TestBed`):
   clique num dado soma 1 no último termo `NdM`/`dM` cru daquela face já presente na fórmula
   (ignorando `ATRdM` e blocos compostos `(ATR±n)dM`), ou insere um termo novo quando não existe
   nenhum ainda.
3. Tiles de dado com `app-icone` (`d4`..`d20`, fallback `dado` genérico pro `d3`) + rótulo
   `D{faces}` sobreposto — mesma receita de `resultado-rolagem__dado` (grid compartilhado,
   silhueta esmaecida, halo no texto).
4. `Manter maior`/`Manter menor` sempre `kh`/`kl` bare (=1, sem stepper), lado a lado numa linha
   só. `Margem de crítico` continua com `app-step-input` (aceita N>1), mesma linha de antes.
   Botões de Explosão (`!`)/Implosão (`?`) removidos da UI.
5. Seção "Dado por atributo + ajuste" renomeada para "Dado por Propriedade + Ajuste"; os botões
   de dado dessa seção ganham o mesmo visual (ícone+`D{faces}`), mas continuam montando um bloco
   `(ATR±n)dM` novo a cada clique (sem incremento inteligente — mesclar num dos vários blocos já
   presentes seria ambíguo).
6. Tokens curtos (dado, atributo, tipo de dano — agora por sigla, dígito, operador, parêntese)
   em tiles quadrados (`__tile`); botões de rótulo longo continuam retangulares (`__tecla`), com
   cantos mais retos que antes.
7. `MontadorRolagem` ganha `readonly formulaValida = input<boolean | null>(null)` e
   `readonly rolar = output<void>()`; `ficha-rolagens.component` passa `[formulaValida]="rapidaValida()"`
   e escuta `(rolar)="rolarRapida()"` — o painel não fecha sozinho ao rolar.
8. `ficha-rolagens.component`: remove o gatilho antigo (`app-botao-icone` + `@if`) e os campos
   `montadorAberto`/`alternarMontador` — `<app-montador-rolagem>` sempre presente, primeiro filho
   de `.ficha-rol__rapida-linha`, controlando o próprio aberto/fechado.

## Critérios de Aceite

- `npm run test --workspace=shared` sem regressão (motor não muda).
- `montador-rolagem.util.spec.ts` cobrindo: clique repetido soma quantidade; sempre o último
  termo daquela face (não o último token digitado); não incrementa `ATRdM` nem dentro de
  `(ATR±n)dM`; não confunde `d1` com substring de `d10`/`d12`.
- `montador-rolagem.component.spec.ts`/`ficha-rolagens.component.spec.ts` reescritos e verdes —
  caixa nasce fechada, visor editável, incremento inteligente via clique real, `kh`/`kl` sem
  stepper, explosão/implosão ausentes, rodapé fixo, `(rolar)` chega no pai.
- Lint (0 erros) e build de produção sem novo aviso.
- Gate visual obrigatório (`verify`, `1920×1080` e `360×800`, stack real): abrir a caixa
  flutuante pelo gatilho, montar os três exemplos originais da `ui-35` só clicando — incluindo
  clicar o mesmo dado várias vezes seguidas para provar o incremento —, rolar pelo rodapé (não só
  pelo botão externo) e conferir o resultado na bandeja de dados. Confirmar tiles quadrados,
  ícone+rótulo legível no dado, rodapé sempre visível mesmo rolando o corpo, e que no mobile o
  painel vira folha cheia utilizável.

## Fora de Escopo

- Incremento inteligente nos botões de dado da seção "Dado por Propriedade + Ajuste".
- Qualquer mudança no motor `shared/src/regras/rolagem/` — gramática inalterada.
- Reintroduzir explosão/implosão na UI (registrar como ideia futura se o autor quiser de volta).
- Campo `formula` do formulário de preset e `rolagem-avulso.component` — só a "Rolagem rápida".

## Dependências

`ui-35-montador-rolagem.spec.md` (`done/`) — esta task reformula a UI que ela entregou, sem
alterar o motor por trás.

## Riscos e Mitigação

- **Painel flutuante herdar a mesma armadilha da v1** (coluna Status trava altura, `contain:
  size`) — mitigado por construção: agora o conteúdo vive dentro de `app-painel-flutuante`
  (`position: fixed`, fora do fluxo da coluna), não mais inline dentro da aba — confirmado ao
  vivo que a coluna Status não afeta mais o painel.
- **Regex do incremento inteligente casar errado** (substring de outra face, ou dentro de um
  bloco composto) — coberto por casos de teste dedicados no util, isolados de qualquer
  renderização.
