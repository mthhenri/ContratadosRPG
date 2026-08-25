# Edição de item custom no inventário do agente

> **Task avulsa (pedido direto do autor, 2026-08-24), não é feature de milestone.**

## Objetivo

Permitir que o dono ou mestre edite nome, descrição, custo e peso de um item custom já existente
no inventário da ficha do agente. O botão de edição deve abrir uma `p-dialog` real, visualmente
idêntica à dialog de criação de item custom, usando o mesmo formulário completo já existente e
preenchendo-o com os dados atuais do item.

O inventário do esquadrão não faz parte desta tarefa e deve permanecer inalterado.

## Fonte visual e comportamento existente

- O análogo aprovado é a própria dialog de criação de item custom de `FichaInventario`, incluindo
  shell PrimeNG, largura, breakpoints, densidade, campos, steppers, botões e tokens do tema.
- O lápis usa o mesmo controle e iconografia da edição de apelido existente no card.
- Item custom é identificado quando nome e categoria não correspondem a uma entrada de
  `CATALOGO_ITENS[item.categoria]`; presença de descrição não é critério suficiente.
- `FichaInventario` é controlado: a alteração substitui o item no array e emite
  `inventarioMudou` com o `FichaInventarioDto` completo para a página persistir.

## Entregáveis

1. `ItemInventarioVM` expõe `custom: boolean`, calculado pela correspondência de nome e categoria
   no catálogo canônico.
2. Apenas item custom e editável mostra o botão de lápis “Editar informações”. Itens de catálogo
   não mostram essa ação.
3. Ao clicar no lápis, abre uma `p-dialog` real mesmo quando o inventário está em apresentação
   `inline`. A dialog reutiliza `formItemCustomTemplate`, a mesma configuração visual e os mesmos
   breakpoints da criação.
4. O formulário abre preenchido com nome, categoria, descrição, custo, peso e campos mecânicos do
   item. Nome, descrição, custo e peso permanecem editáveis. Categoria e campos mecânicos ficam
   bloqueados durante a edição.
5. O botão principal mostra “Salvar alterações”. Ao confirmar, substitui apenas nome, descrição,
   custo e peso no item original e preserva categoria, quantidade, guarda, modificações,
   munição, módulo, categoria emprestada e demais campos mecânicos.
6. Nome e descrição são aparados; descrição vazia remove a propriedade. Custo e peso recebem piso
   zero. Cancelar ou fechar a dialog não altera o inventário.

## Critérios de aceite

- O lápis de um item custom abre uma dialog modal, não um formulário expandido dentro do card.
- A dialog tem a mesma aparência e estrutura da criação, com todos os dados do item preenchidos.
- É possível alterar também o nome do item custom.
- Salvar atualiza imediatamente o card e persiste pelo fluxo normal da ficha.
- Reabrir a edição apresenta os valores alterados.
- Itens de catálogo não ganham a ação de edição.
- Nenhuma mudança funcional ou visual é introduzida no inventário do esquadrão.
- Testes do frontend cobrem detecção de item custom, abertura da dialog, preenchimento, bloqueio
  dos campos fora do escopo e preservação dos dados mecânicos.
- Gate visual executado na aplicação real em `1920×1080` e `360×800`, conferindo modalidade,
  responsividade, ausência de overflow, foco, contraste, alvos de toque e alinhamento com a dialog
  de criação.

## Fora de escopo

- Editar itens de catálogo.
- Editar categoria, quantidade, dano, informação, resistência, bônus, módulo, categoria emprestada,
  modificações, munição ou estado de guarda.
- Criar endpoint ou DTO de campanha.
- Alterar qualquer comportamento do inventário do esquadrão.

## Arquivos principais

- `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.ts`
- `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.html`
- `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.spec.ts`
- `shared/src/regras/compras/compras.dados.ts` (`CATALOGO_ITENS`, somente como fonte de verdade)
