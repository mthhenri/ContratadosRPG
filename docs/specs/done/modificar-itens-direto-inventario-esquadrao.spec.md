# modificar-itens-direto-inventario-esquadrao.spec.md

> **Task avulsa (pedido do autor, 2026-08-26), não é feature de milestone.**

## Objetivo

Permitir que o Mestre e os membros autorizados adicionem ao inventário de esquadrão tanto um item
custom quanto um item do catálogo já com modificações estruturadas, sem exigir a passagem prévia
pelo inventário de uma ficha.

## Escopo

- O fluxo **Adicionar itens** passa a permitir configurar modificações antes da confirmação de um
  item normal do catálogo.
- O formulário **Item custom** recebe a mesma configuração antes de criar o item.
- A configuração usa as modificações canônicas de `MODIFICACOES`, `ModificacaoAplicadaDto` e as
  regras de compras de `shared/`; nenhuma regra de modificação é reimplementada no frontend ou no
  backend. Modificações livres, custo pessoal, prestígio e Fragmentos não cabem no inventário
  coletivo, que não possui personagem dono.
- A seleção respeita a categoria do item e, quando aplicável, os mesmos limites de empilhamento;
  item sem modificação continua com o fluxo atual.
- A prévia e o card persistido usam o chip somente leitura de `InventarioEsquadrao`.
- Itens iguais só empilham quando as modificações também são estruturalmente iguais, conforme a
  spec anterior já concluída.

## Fora de escopo

- Editar modificações de um item já guardado na base.
- Aplicar/editar Fragmentos, amplificadores, equipamento, porte ou containers na base.
- Alterar regra, catálogo ou efeitos de modificação; a tarefa só consome a regra existente.

## Critérios de aceite

- Um item de catálogo (por exemplo, arma Corpo a Corpo) pode entrar no inventário de esquadrão com
  uma modificação válida já aplicada.
- Um item custom pode entrar com uma modificação canônica válida para sua categoria.
- O chip de cada modificação aparece antes da confirmação e após recarregar o inventário.
- Item sem modificação mantém o comportamento atual.
- As modificações enviadas ao backend são preservadas no JSONB e participam da identidade do stack.
- Testes de shared/backend/frontend, lint, build e gate visual em `1920×1080` e `360×800` passam.
