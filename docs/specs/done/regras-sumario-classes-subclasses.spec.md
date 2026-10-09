# regras-sumario-classes-subclasses.spec.md

> Task solta, solicitada pelo autor em 09/10/2026: classes e subclasses ausentes do menu lateral do Sistema.

## Objetivo

Permitir navegar diretamente às três classes e três subclasses pelo sumário do Sistema,
na página pública e no leitor flutuante, inclusive pela gaveta mobile.

## Entregáveis

1. Âncoras únicas e estáveis nos blocos ricos de classe/subclasse, derivadas de seus nomes.
2. Itens subordinados a Classes e Arquétipos e Subclasse, na ordem da fonte, reutilizando
   integralmente o sumário existente como análogo aprovado (shell, recuo, densidade, seleção,
   foco e gaveta), sem nova receita de controle ou estilo.
3. Navegação, URL, seleção ativa e memória usando as mesmas âncoras dos cartões renderizados;
   IDs isolados por leitor quando página e painel coexistem.
4. Testes de regressão e relatório em `regras-sumario-classes-subclasses/`; saídas locais em
   `.artifacts/regras-sumario-classes-subclasses/`.

## Critérios de Aceite

- Testes conferem seis nomes/âncoras, hierarquia, colisões e destinos renderizados.
- Testes, lint e build do frontend passam; `npm run repo:verificar` passa.
- Aplicação real em 1920×1080 e 360×800: seis entradas, clique e fragmento, seleção ativa,
  recarga por link, gaveta fechando ao navegar, painel com rolagem local e sem overflow.
- Comparação visual pessoal com o sumário existente: mesma densidade/hierarquia, controles
  canônicos, foco visível e alvos mobile de 44px.

## Fora de Escopo

Alterar conteúdo/regras dos livros, incluir arquétipos ou habilidades no menu, reformular
o sumário, revisar PDF ou interferir na alteração preexistente de `docs/core/sistema-v4.1.4.md`.

## Dependências

Leitor e normalizador M10; `docs/core/sistema-v4.1.4.md`, `docs/design/DESIGN.md` e
`docs/design/tema/` como fontes de conteúdo e identidade.

## Fecho — 09/10/2026

Entregáveis e aceite cumpridos; [verificação e limites](regras-sumario-classes-subclasses/verificacao.md).
Build aprovado com `CI=true`; falha nativa do cache local registrada separadamente em P-111.
