# ui-09-adocao-botoes-dominio.spec.md

> Correção filha da auditoria `ui-06`. Origem: `docs/design/AUDITORIA-BIBLIOTECA-VISUAL.md`.

## Objetivo

Classificar e substituir os botões de ação locais que ainda carregam identidade duplicada nos
fluxos de inventário e Loja/Vendas, usando `app-botao`, `app-botao-icone` ou um componente de
domínio somente quando a interação não couber em nenhum deles.

## Entregáveis

1. Levantar, por arquivo, as famílias `ficha-inv__btn`, `ficha-inv__mini-btn`, `compras-btn` e
   `ficha-cartao__acao`, separando ação rotulada, ação por ícone, incremento/decremento e edição
   composta; registrar a decisão de destino de cada família antes de alterar marcação.
2. Migrar ações rotuladas para `app-botao` e ações unitárias por ícone para o primitivo da
   `ui-08`, removendo SCSS que duplica fonte, borda, cor, foco ou estado desses controles.
3. Para incremento/decremento, seleção de quantidade e edição derivada, reutilizar o primitivo
   existente quando o contrato comportar o caso ou abrir uma spec separada com dois consumidores
   reais; não adicionar props hipotéticas ao botão.

## Levantamento e destinos

| Arquivo | Família | Destino |
|---|---|---|
| `ficha-inventario.component.html` | `ficha-inv__btn` | `app-botao` para todas as ações rotuladas; os modificadores locais ficam só com responsabilidade de layout ou animação de feedback. |
| `ficha-inventario.component.html` | `ficha-inv__btn--icone` e a ação unitária `ficha-inv__mini-btn` de consumir munição | `app-botao-icone`, com nome acessível e tooltip já existentes. |
| `ficha-inventario.component.html` | Demais `ficha-inv__mini-btn` | Controles compostos de incremento/edição de domínio. Os três seletores de quantidade em modal migram para `app-step-input`; os demais preservam o contrato próprio, sem ampliar a API de botão. |
| `compras.page.html` | `compras-btn` | `app-botao` para ação rotulada e `app-botao-icone` para confirmação/remoção por ícone. As classes `compras-btn--*` passam a servir somente ao layout e ao feedback de adição. |
| `ficha-visualizacao.component.html` | `ficha-cartao__acao` | `app-botao`; a classe permanece como gancho de largura nos grupos de ações. |

## Critérios de Aceite

- Cada ocorrência das quatro famílias recebe destino explícito e nenhuma ação comum conserva uma
  identidade local só por ser preexistente.
- Comprar, vender, editar e estado desabilitado são percorridos nos dois viewports, com conteúdo
  longo e limites de quantidade quando aplicáveis; não há overflow ou perda de foco.
- Lint, testes/builds proporcionais e gate visual completo passam sem erro novo.

## Fora de Escopo

- Mudar regras de compra, inventário, preço, permissões ou dados da ficha.
- Resolver o stat editável (`I-025`) e os usos derivados/compactos de stepper (`I-026`) nesta task.

## Dependências

- `ui-08-primitivo-botao-icone.spec.md`, `I-025`, `I-026` e `docs/design/DESIGN.md`.

## Riscos e Mitigação

- Tratar uma edição derivada como botão simples permitiria modificar dado que não é gravável.
  Preservar o contrato de domínio e separar a API quando a interação for diferente.
