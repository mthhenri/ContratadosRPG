# m9-06-refinamento-mobile-biblioteca.spec.md

> Sexta e última task do milestone `m9-documentos-campanha.spec.md` — responsivo. Reservada para o fim
> do milestone, como a `m4-10` e a `m7-26` (o passe do hub de cenas e dos painéis).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` (inclusive "Breakpoints" e a seção "Biblioteca
> de documentos") e reusar `src/styles/tema/_breakpoints.scss` (`$bp-mobile`, mixin `mobile`,
> `$alvo-toque`) e o padrão de densidade por tokens já validado em `m1-15`/`m3-09`. Nada de largura
> mágica por arquivo nem hex/fonte/raio solto (proibição #29). Todo controle continua usando o
> primitivo de `shared/ui/`; se faltar um, **parar e perguntar ao autor**.

## Objetivo

Refinar a **apresentação** das duas bibliotecas (mestre e jogador/espectador), do leitor de documento, da
busca e do dialog "Novo documento" nos quatro viewports padrão do projeto — em especial `360×800`, onde
a tela precisa ser usável com uma mão, sem rolagem horizontal. Só apresentação: nenhuma regra, permissão
ou contrato muda.

## Análogo aprovado (registrar no fecho da task)

Os próprios painéis da `m9-04`/`m9-05` no desktop, mais o Caderno em duas vistas
(`modules/pagina-caderno/caderno-conteudo.component`) e o hub de cenas em `360×800`
(`modules/cena/paginas/hub/`, `m7-23`/`m7-26`) como referência de densidade do celular.

## Estado atual

- Depois da `m9-04` e da `m9-05` a tela **funciona** em `360×800` (duas vistas: lista ↔ documento) e
  no desktop (lista à esquerda, painel à direita), mas só esses dois viewports foram olhados. A faixa
  **entre o mobile (`$bp-mobile`, `560px`) e o tablet (`$bp-tablet`, `1080px`)** — onde cai o
  `960×1080` de uma janela dividida — e o notebook `1366×768` (altura de 768 px) nunca foram
  exercitados; é onde aparecem o painel espremido e o conteúdo cortado por altura fixa.
- O editor Markdown tem comportamento próprio no celular (barra ancorada acima do teclado virtual,
  `docs/specs/done/editor-markdown-barra-e-mobile.spec.md`) que o painel do documento precisa acomodar.
- Documentos reais trazem o que a tela de teste não traz: título de 120 caracteres, tabela larga em
  Markdown, imagem maior que a tela, dezenas de itens na lista.

## Entregáveis

1. **Os quatro viewports** (`360×800`, `960×1080`, `1366×768`, `1920×1080`) para as três páginas
   (mestre, jogador, espectador). Para `561–1080 px`, decidir e registrar o comportamento — lista e
   painel lado a lado com a lista estreita, ou as duas vistas do celular — pelo que **cabe sem
   espremer** o leitor; sem estado intermediário quebrado.
2. **Lista:** título de até 120 caracteres sem estourar o cartão (reusar o truncamento que o projeto já
   tem, `shared/clamp-truncado`, em vez de uma regra local); dezenas de documentos rolam sem cortar o
   último item; as setas de reordenar do mestre têm alvo de toque ≥ 44 px no celular.
3. **Painel do documento (mestre):** as ações **Revelar/Ocultar**, **Editar** e **Remover** cabem em
   `360 px` em uma ou duas linhas, cada uma com alvo ≥ 44 px, e **Revelar/Ocultar nunca fica escondida
   atrás de um menu** (é a ação mais frequente da sessão). O cabeçalho do painel com título longo e chip
   de estado não empurra as ações para fora.
4. **Editor no celular:** com o `app-editor-markdown` focado, a barra ancorada acima do teclado não cobre
   o campo de título nem o botão **Salvar**; Salvar/Cancelar continuam alcançáveis (verificar
   simulando a redução de `visualViewport`, como a spec do editor fez).
5. **Leitor:** tabela larga do Markdown rola **dentro do bloco**, nunca a página; imagem maior que a
   tela rola no "tamanho real" e o gesto de pinça nativo não é bloqueado; a alternância "ajustar à
   largura ↔ tamanho real" tem alvo ≥ 44 px.
6. **Busca:** o campo não some sob o teclado virtual; a lista de resultados e o "Carregar mais" cabem
   no celular; o trecho com destaque quebra linha sem overflow.
7. **Dialog "Novo documento":** cabe em `360×800` com o teclado aberto (título e tipo visíveis, botões
   alcançáveis); o controle de arquivo é utilizável com o toque.
8. **Estados:** vazio, esqueleto, erro de carga, "documento não está mais disponível" e conflito de
   versão legíveis e sem overflow em todos os viewports.
9. **Alvos e foco:** todo controle interativo com alvo ≥ `$alvo-toque` no celular; foco de teclado
   visível e contraste dos chips Revelado/Oculto conferidos nos dois estados.

## Critérios de Aceite

- Nas três páginas, **nenhum scroll horizontal** em nenhum dos quatro viewports, medido pelo
  `scrollWidth - clientWidth` do documento e conferido a olho nas capturas.
- `npm run test -w frontend` e `npm run lint -w frontend` verdes (testes só onde a apresentação
  altera comportamento — troca de vista, ações visíveis).
- **Verificação pela skill `verify`** nos quatro viewports, com documentos de teste "difíceis": título
  de 120 caracteres, tabela de cinco colunas, imagem de `4000×3000`, 40 itens na lista, e os estados
  do item 8. No celular, com o teclado (editor e busca focados). Comparação visual registrada com o
  análogo: mesma densidade e hierarquia do desktop, sem controle cortado.
- **Regressão zero no desktop** (`1920×1080`): as capturas antes e depois do passe coincidem no que não
  foi pedido para mudar.

## Fora de Escopo

- Novas funcionalidades, telas ou regras além das entregues em `m9-04`/`m9-05`.
- Qualquer mudança de contrato, permissão, backend ou tempo real.
- Rework visual do desktop.
- O passe do painel da Investigação (`m7-25`), que é da `m7-26`.

## Dependências

`m9-04` e `m9-05` (telas base a refinar), `m1-15`/`m3-09` (padrão responsivo por tokens),
`docs/specs/done/editor-markdown-barra-e-mobile.spec.md`, `docs/design/DESIGN.md`.
