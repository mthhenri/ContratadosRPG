# Marcas de ContratadosRPG — M10-04

## Uso aprovado

O autor aprovou em 08/10/2026 os desenhos, a paleta/fundos e o texto de crédito
da [prancha M10-04](../specs/done/m10-04-svg-scp-definitivo/m10-04-scp-aprovacao.html).

- **Logo SCP oficial:** somente identidade de Criatura; `app-icone` com `nome="scp"`
  ou `nome="criatura"` (mesmo desenho). Não usar nos níveis de ameaça ou na topbar.
- **Marca própria SCP + D20:** padrão geral do produto, Regras e níveis de ameaça;
  `app-icone` com `nome="contratados"`. Desenho do `logo-black.svg` existente
  preservado integralmente, inclusive suas margens; não houve redesenho.

As duas marcas usam formas preenchidas em `currentColor`, sem traço, raster,
filtro ou relevo. `app-icone` mantém `viewBox` 24, tamanho herdado `1.15em` e
`aria-hidden`; os ícones anteriores continuam com contorno `1.75`. O consumidor
fornece rótulo acessível e tamanho/layout.

## Assets e escala

Arquivos de produto em `frontend/public/marcas/`:

| Asset | Geometria | Uso |
|---|---|---|
| `scp-icone.svg` | viewBox 24, contorno oficial reforçado da proposta aprovada | Identidade de Criatura |
| `scp-silhueta.svg` | viewBox 24, espessura original da proposta aprovada | Variante oficial preservada; não amplia os usos permitidos |
| `contratados-icone.svg` | viewBox 24, escala uniforme do grupo original de 1000 unidades | Regras e usos compactos |
| `contratados-silhueta.svg` | viewBox 1000, grupo original recolorível | Oito níveis e usos maiores |

16/20/24/32/48/64/96px são as escalas de conferência. A marca própria ocupa cerca
de 74% da largura e 69% da altura da caixa original. Em 16–24px os detalhes internos
se juntam; em 48–96px ficam mais distintos. Isso motivou a indicação anterior de
refino. A incorporação usa o desenho atual aprovado; alteração futura de geometria
ou enquadramento exige nova versão para aprovação do autor.

## Cores e fundos de suporte

Fonte única: `docs/design/tema/_tokens.scss`, com valores equivalentes em
`frontend/src/styles/tema/_tokens.scss`. `--ameaca-<chave>` guarda as oito cores
extraídas das imagens `image1`…`image8` de `docs/core/sistema-v4.1.4.md`.
Valores permanecem iguais em claro/escuro: não dependem do accent nem da conta.
Método/originais em `m10-04-svg-scp-definitivo/proposta/paleta.json`, junto da spec.

| Nível | Token | Fundo de suporte |
|---|---|---|
| Desconhecida | `--ameaca-desconhecida` | `--ameaca-fundo-escuro` |
| Nula | `--ameaca-nula` | `--ameaca-fundo-escuro` |
| Baixa | `--ameaca-baixa` | `--ameaca-fundo-escuro` |
| Média | `--ameaca-media` | `--ameaca-fundo-escuro` |
| Alta | `--ameaca-alta` | `--ameaca-fundo-escuro` |
| Extrema | `--ameaca-extrema` | `--ameaca-fundo-claro` |
| Catastrófica | `--ameaca-catastrofica` | `--ameaca-fundo-claro` |
| Apocalíptica | `--ameaca-apocaliptica` | `--ameaca-fundo-escuro` |

Fundos fixos preservam o contraste da cor do livro nas duas bases. Cor sempre
acompanhada de nome/número. A M10-07 renderiza os níveis, sem criar cores locais.

## Origem, licença e crédito aprovado

Registro distribuído com os assets: `frontend/public/marcas/LICENCA.md`.
Fonte do logo oficial: [SCP Foundation (emblem), Wikimedia Commons](https://commons.wikimedia.org/wiki/File:SCP_Foundation_(emblem).svg),
vetor de Vizorsols/BmboB, logo original de far2 e versão de alta resolução de Aelanna.
SVG oficial adaptado em formas preenchidas, com cor herdada e escala para o produto;
marca própria acrescenta o D20. Derivados sob
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).

Texto aprovado para o rodapé da página de Regras, implementada na M10-06:

> Logo SCP: far2; versão de alta resolução por Aelanna; vetor de Vizorsols
> e BmboB. Adaptado para ContratadosRPG. Licença CC BY-SA 3.0.

“Logo SCP” aponta para a fonte acima; “CC BY-SA 3.0” aponta para a licença.
A M10-04 prepara os assets e este crédito; não cria a página ou seu rodapé.
