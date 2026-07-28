# m3-54-ficha-calculadora-flutuante.spec.md

> Task 51 do milestone `m3-ficha-jogador.spec.md`. Lote de refino da ficha (`m3-40`…`m3-56`).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Adicionar uma **calculadora comum** (aritmética normal — **não** a calculadora do sistema)
acessível na ficha por um **ícone no canto inferior direito**. Ao clicar, abre um **popup
arrastável** pela tela com um **"x"** para fechar. O **histórico de cálculos existe só enquanto a
tela vive** (F5 zera). Estilizada no tema de Contratados.

## Entregáveis

1. **Componente novo standalone** (ex.:
   `frontend/src/app/shared/calculadora-flutuante/`), Signals para estado (expressão, resultado,
   histórico volátil) — **sem backend, sem persistência**.
2. **Gatilho:** ícone fixo no canto inferior direito da tela da ficha
   (`modules/ficha/paginas/visualizar/`), com alvo de toque ≥44px.
3. **Popup arrastável:** janela flutuante movível pela tela (drag via Angular CDK
   `cdkDrag`/`cdkDragHandle` ou handlers próprios), com botão "x" no canto. Fica por cima do
   conteúdo (z-index coerente) sem travar o resto da ficha.
4. **Calculadora aritmética:** operações básicas (+ − × ÷, %, parênteses, limpar), teclado +
   clique. **Histórico** dos cálculos da sessão, listado no popup; **F5/reload zera** (só em
   memória — nenhum storage).
5. **Estilo:** cartão `--surface`, mono para números/rótulos, botões no padrão do tema; tokens de
   `_tokens.scss`. Reusar padrões de `_componentes.scss` (card/stepper/botão).

## Critérios de Aceite

- Ícone no canto inferior direito abre o popup; "x" fecha.
- O popup pode ser arrastado pela tela.
- Faz contas aritméticas corretas e mostra histórico da sessão.
- Recarregar a página zera o histórico (nada persiste).
- Visual coerente com o tema (sem hex/fonte solta).

## Fora de Escopo

- Qualquer relação com a calculadora do sistema (M1) ou com os dados da ficha — é uma calculadora
  comum, isolada.
- Persistir histórico entre sessões.

## Dependências

- Nenhuma de dados (feature de UI isolada). Tema `docs/design/`.
