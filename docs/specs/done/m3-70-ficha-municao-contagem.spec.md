# m3-70-ficha-municao-contagem.spec.md

> Task do milestone `m3-ficha-jogador.spec.md`. Complementa `m3-14` (inventário), `m3-65` (Munição
> Construtor) e a tabela de Munições em `docs/core/sistema-v4.1.0.md` (~1054).

> **Antes de codar:** reler `docs/core/sistema-v4.1.0.md` — tabelas “Munições” e “Modificações”
> (~1054–1083), a habilidade Mercenário “Munição Eficiente” (~481) e “Construtor” (~1950). O
> documento vence o código.

## Objetivo

Transformar a duração de cada item de Munição em saldo jogável e persistido. O jogador ou mestre
deve poder consumir manualmente cenas ou disparos, enxergar quando a munição está vazia e corrigir
livremente tanto o saldo atual quanto o máximo. O sistema preenche os valores automaticamente só
quando cria a munição e quando uma modificação que concede cenas é adicionada ou removida.

Não há sistema automático de cenas/missão: o consumo acontece por botões explícitos no inventário.

## Modelo de dados e catálogo

1. Criar no contrato compartilhado do item um bloco opcional de contagem de munição, persistido no
   JSONB, com os valores absolutos:

   ```ts
   interface MunicaoContagemDto {
     readonly atual: number;
     readonly maxima: number;
     readonly unidade: 'CENA' | 'DISPARO';
   }
   ```

   A unidade identifica a semântica e o rótulo da interação; não é inferida a partir do texto
   exibido no card. Ambos os números são inteiros maiores ou iguais a zero e `atual <= maxima`.

2. O catálogo tipado de Munições passa a declarar a duração-base de cada entrada — quantidade e
   unidade — como dado próprio, sem analisar `informacao`. Os textos atuais (“Dura 2 cenas”, “Dura
   1 disparo”) continuam sendo a informação humana do catálogo, mas não são fonte de cálculo.

3. Ao adicionar ao inventário uma munição de catálogo, criar sua `contagemMunicao` cheia: `atual`
   e `maxima` recebem a duração-base do catálogo. Munição custom e itens de outra categoria não
   recebem o bloco automaticamente.

4. Munição de Fragmento Construtor é uma munição rastreável de duração-base **1 cena**. Ela nasce
   com `atual: 1`, `maxima: 1` e `unidade: 'CENA'`, preservando separadamente a ação existente
   “Recarregar” (Energia + bônus de dano naquela cena).

5. Fichas já salvas sem `contagemMunicao` são compatíveis: quando o frontend as lê, uma munição
   conhecida do catálogo é apresentada cheia a partir de sua duração-base. O bloco só precisa ser
   gravado no JSONB quando o item sofrer uma mutação desta tarefa (consumo, edição manual ou
   modificação de duração). Não migrar a tabela `ficha` nem regravar fichas em lote.

## Modificação que concede cenas

1. Modelar explicitamente no catálogo de modificações que **Munição Extra** concede `+1 cena`.
   Não detectar a regra pelo nome ou descrição da modificação. A regra do livro é: “adiciona +1
   cena de duração (caso a duração seja cena)”.

2. Ao adicionar Munição Extra a uma munição cuja `unidade` é `CENA`, aumentar **ambos** os valores
   persistidos em 1: `maxima += 1` e `atual += 1`. O incremento acontece uma vez por compra válida
   da modificação — a entrada ocupa os três empilhamentos definidos pelo catálogo, mas concede uma
   única cena.

3. Ao remover Munição Extra de uma munição por cena, reduzir `maxima` em 1 (mínimo zero) e limitar
   `atual` ao novo máximo. Não alterar o máximo de munição unitária: Míssil continua com `1
   disparo`, mesmo se a modificação for tentada/forçada em um dado antigo. O filtro normal de
   modificações permanece a autoridade para permitir a compra.

4. Os valores não são derivados novamente a cada renderização nem recalculados ao editar outro
   aspecto do item. Depois de criados, `atual` e `maxima` são o estado autoritativo. Portanto, uma
   alteração manual do máximo continua preservada após recarregar a página; uma nova Munição Extra
   soma +1 sobre esse máximo manual persistido, e sua remoção subtrai +1 dele.

## Interface e interações

1. Em todo card de Munição com contagem, exibir o indicador compacto `Atual / Máxima` e a unidade
   no plural correto, por exemplo `2 / 3 cenas` e `1 / 1 disparo`.

2. Quando a contagem for maior que zero, disponibilizar um botão pequeno e acessível para consumir
   uma unidade: “Reduzir uma cena” ou “Reduzir um disparo”. Ele persiste o novo `atual` usando o
   mesmo fluxo otimista/em lote já empregado pelo inventário.

3. Ao chegar a zero, o card e o indicador recebem variante de alerta vermelha, com texto visível
   “Vazia”. O botão de consumo fica desabilitado ou ausente; jamais produz valor negativo. Editar o
   valor atual para cima volta o item ao estado normal.

4. No modo editável, oferecer controles numéricos explícitos para **Atual** e **Máxima**. Ambos são
   edição manual legítima para jogador e mestre. A interface impede números negativos e, ao reduzir
   Máxima abaixo de Atual, ajusta Atual imediatamente para a nova Máxima. Alterar Atual acima da
   Máxima limita-o à Máxima.

5. Em modo somente leitura, o saldo é exibido mas não há botões de consumo ou edição. As regras
   atuais de permissão de ficha continuam valendo; esta task não cria uma permissão nova.

6. O botão “Recarregar” de uma Munição Construtor mantém o contrato de `m3-65`: cobra Energia e
   alterna seu bônus de dano por uma cena. Ele não aumenta, restaura nem consome `contagemMunicao`.
   O consumo da cena da munição é a ação independente descrita nesta task.

7. Aplicar o tema Terminal de Contenção exclusivamente por tokens e pelos padrões BEM já usados em
   `ficha-inventario`; não usar hex, fonte ou raio hardcoded. O estado vazio deve preservar contraste
   e ter sinalização textual, não depender apenas de vermelho.

## Contrato visual responsivo

> Referências obrigatórias: `docs/design/DESIGN.md`, `docs/design/tema/_tokens.scss`,
> `frontend/src/styles/tema/_breakpoints.scss` e os padrões existentes de
> `ficha-inventario.component.scss`. O breakpoint canônico de mobile é `bp.mobile` (até 560px), e
> o alvo mínimo de toque é `bp.$alvo-toque` (44px). Não introduzir media query ou métrica paralela.

1. **Desktop e tablet acima de 560px.** A contagem integra o card atual de item sem criar outro
   card ou coluna: fica na área de metadados do item, junto de custo/peso, como dado mono compacto.
   O consumo rápido permanece entre as ações do item, com ícone e rótulo “− Cena” ou “− Disparo”.
   Os controles de edição de Atual/Máxima aparecem no painel expandido do próprio item em uma linha
   de dois campos/steppers de largura equivalente, sem deslocar ou encobrir as ações existentes
   (Modificar, Recarregar, mover, vestir e remover).

2. **Mobile até 560px.** A contagem não pode disputar a mesma linha com nome, custo, peso e os
   demais comandos. Ela ocupa uma faixa própria logo após os dados do item: indicador `Atual /
   Máxima + unidade` à esquerda e consumo rápido à direita. Se não couber, a faixa quebra entre
   indicador e botão, nunca dentro de números, unidade ou rótulo. Os steppers Atual/Máxima
   empilham em uma coluna no painel expandido, com largura total e ordem Atual antes de Máxima.

3. Em ambos os tamanhos, botão de consumo e botões `−`/`+` dos steppers respeitam área clicável de
   ao menos 44×44px no mobile, têm `aria-label` com item e unidade, mostram foco visível global e
   não dependem de hover para transmitir estado. No card compacto, pode-se ocultar rótulos visuais
   auxiliares apenas se o `aria-label` preservá-los; o valor e “Vazia” nunca podem ser só ícone ou
   tooltip.

4. O estado vazio usa a semântica visual de Vida (`--vida` e `--vida-border`), mais superfície e
   borda do tema, sem hex novo. O card não muda de altura abruptamente ao alternar entre disponível
   e vazio: o selo textual “Vazia” ocupa a mesma faixa do controle/indicador, e o botão indisponível
   preserva seu espaço ou é substituído por esse selo de igual área.

5. Respeitar o fluxo atual da ficha: em `modo='compacto'`, a mesma informação cabe dentro da coluna
   Status sem gerar rolagem horizontal; na ficha completa, a contagem acompanha o card de inventário
   sem comprometer a grade de três colunas. Não criar scroll horizontal nem alterar os `overflow`
   canônicos que preservam elementos sticky.

## Validação, persistência e tempo real

- A validação de `FichaDados` no backend aceita o bloco somente em itens de Munição e em Fragmento
  Construtor cuja `categoriaEmprestada` seja Munição; rejeita unidade inválida, números fracionários,
  valores negativos e `atual > maxima`.
- O backend mantém a validação existente de inventário e de modificações. Nenhuma regra é validada
  apenas no frontend.
- Cada alteração de contagem segue a persistência existente de dados da ficha e emite o evento
  `ficha:alterada` já usado para sincronizar outros clientes autorizados. Não criar evento de socket
  específico.
- A habilidade Mercenário “Munição Eficiente” não é automatizada nesta task: a regra de a primeira
  cena não ser gasta continua decisão do jogador/mestre ao clicar no controle. Registrá-la como
  contexto de teste manual, sem criar estado adicional ou dedução automática.

## Critérios de aceite

- Uma 9mm adquirida pelo catálogo surge com sua contagem-base cheia, exibe cenas e persiste o saldo
  após reduzir uma cena e recarregar a página.
- Uma Munição Extra adicionada a uma munição por cena aumenta o máximo e o saldo em uma cena; sua
  remoção reduz o máximo e limita o saldo, sem recalcular nem desfazer um ajuste manual não
  relacionado.
- Um Míssil exibe `1 / 1 disparo`, pode ser reduzido a `0 / 1`, fica marcado como “Vazia” e não pode
  ser reduzido abaixo de zero. Munição Extra não aumenta sua contagem.
- Jogador autorizado e mestre conseguem editar Atual e Máxima; a ficha de terceiro em leitura não.
  Os limites `0 <= atual <= maxima` sobrevivem a todos os caminhos de edição.
- Uma Munição Construtor tem contagem inicial `1 / 1 cena`; seu botão Recarregar continua cobrando
  Energia e ativando apenas o bônus de dano, sem adulterar a contagem.
- Munições existentes em fichas antigas continuam renderizando sem erro e aparecem cheias até a
  primeira mutação, sem migração de banco em lote.
- O estado vazio é distinguível visualmente e por texto, tanto na ficha completa quanto no modo
  compacto quando o item estiver visível.
- Em desktop/tablet, a contagem e suas duas edições cabem no card sem sobrepor ações ou metadados.
  Em 360px, 390px e 430px de largura, o indicador, “Vazia” e os controles de toque permanecem
  íntegros, operáveis e sem corte ou rolagem horizontal.

## Testes exigidos

1. **Shared:** dados tipados de duração-base para todas as munições; criação de contagem cheia;
   soma e remoção de Munição Extra; Míssil imune ao bônus; invariante `0 <= atual <= maxima`;
   Munição Construtor com uma cena.
2. **Frontend:** renderização de cenas e disparos, botão de reduzir, bloqueio em zero, estado
   acessível “Vazia”, edição manual e clamp entre Atual/Máxima, adição/remoção de Munição Extra e
   manutenção independente de Recarregar.
3. **Backend:** validação do novo bloco dentro de `FichaDados`, persistência da mutação e emissão de
   `ficha:alterada`; regressão de uma ficha legada sem o bloco.
4. **Manual:** abrir a mesma ficha em duas sessões autorizadas e confirmar que consumir ou editar
   a contagem na primeira atualiza a segunda pelo fluxo de tempo real existente.
5. **Visual responsivo:** inspecionar a ficha completa e `modo='compacto'` em desktop/tablet e em
   360px, 390px, 430px e 560px. Confirmar ausência de overflow horizontal/corte, alvo de toque de
   44px, foco por teclado, contraste e estabilidade de altura ao zerar e restaurar uma munição.

## Fora de escopo

- Detectar automaticamente começo/fim de cena, combate, descanso, missão ou disparo de arma.
- Consumir munição automaticamente ao rolar dano ou ao registrar uma rolagem.
- Automatizar “Munição Eficiente” do Mercenário.
- Criar tipos novos de munição custom com duração calculada automaticamente; estes podem receber
  contagem manual somente se o contrato de criação de item vier a expor essa escolha em task futura.
- Reabastecimento, compra recorrente, descarte automático de munição vazia ou vínculo automático
  entre arma e pacote de munição.

## Dependências

- `m3-14-ficha-editor-inventario` — contrato e editor do inventário.
- `m3-65-fragmentos-tabela-construtor` — Munição Construtor e ação Recarregar.
- Catálogos e motor de compras em `shared/src/regras/compras/`.
