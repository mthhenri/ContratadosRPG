# M10-04 — proposta v1, aguardando aprovação

**Uso revisto pelo autor em 08/10/2026:** logo SCP oficial somente na identidade
de Criatura. A marca própria SCP + D20 é o padrão geral, inclusive Regras e
níveis. A prancha foi alinhada e usa `frontend/public/logo-black.svg` recolorido
para apresentar a marca existente, sem redesenhar sua identidade. Seu refino
para pequenos tamanhos continua aberto. A variante oficial de silhueta abaixo
fica preservada como asset preparado; deixou de ser a proposta para os níveis.

Esta pasta contém desenhos candidatos; nenhum foi incorporado ao produto.

As capturas da prancha e os oito PNGs extraídos do livro ficam em
`.artifacts/m10-04/` (locais, não distribuídos no clone). Para reproduzir os
originais e a prancha a partir do livro versionado, rode
`node docs/specs/done/m10-04-svg-scp-definitivo/proposta/gerar-prancha.mjs`;
o script usa `playwright`/`pngjs` do ambiente de verificação. Para verificar
a prancha, rode o `verificar-prancha.mjs` desta pasta; suas saídas também são locais.
SVGs candidatos, paleta de referência e fontes da prancha continuam versionados.
A [spec ativa](../../m10-04-svg-scp-definitivo.spec.md) exige
aprovação de cada versão do SVG e conferência do texto do crédito pelo autor.

Referência visual: [exemplão de Regras](../../../backlog/m10-regras/m10-regras-exemplao.html), aba Ícones
e níveis de ameaça. Mesma hierarquia mono, superfícies, bordas discretas e
densidade; prancha estática, sem controles novos ou biblioteca alternativa.

## Geometria e licença

Origem: [SCP Foundation (emblem), Wikimedia Commons](https://commons.wikimedia.org/wiki/File:SCP_Foundation_(emblem).svg),
revisão de 16/06/2023 por BmboB, sobre a simplificação de Vizorsols.
Logo original de far2; primeira versão PNG de alta resolução de Aelanna.
[Guia da Fundação](https://scp-wiki.wikidot.com/licensing-guide).

Os SVGs derivados desta proposta são distribuídos sob
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
Adaptação vetorial para ContratadosRPG, com assistência do Codex:
contornos convertidos em preenchimentos (aproximação poligonal simplificada
com tolerância de 0,05 na fonte 135), cor herdada por `currentColor`,
viewBox 24 e margem preservada. A variante de ícone reforça o contorno exterior
de 4 para 6 unidades da fonte 135; a silhueta conserva a espessura original.
Não há imagem raster, filtro, máscara, cor fixa ou traço nos SVGs candidatos.

## Paleta candidata

Fonte: `docs/core/sistema-v4.1.4.md`, definições `image1`…`image8`.
Método: RGB mais frequente entre pixels de alfa máximo; não amostrar fundo,
relevo ou antialiasing. A cor é apresentada opaca para cumprir a silhueta sólida.
O alfa de origem é registrado; não se alterou o livro.

| Nível | Imagem | RGB dominante | Alfa máximo original |
|---|---|---|---|
| Desconhecida | image1 | #00fffc | 128/255 |
| Nula | image2 | #7fff8e | 255/255 |
| Baixa | image3 | #fdff7f | 255/255 |
| Média | image4 | #ffc77f | 255/255 |
| Alta | image5 | #ff7f7f | 255/255 |
| Extrema | image6 | #7800ff | 128/255 |
| Catastrófica | image7 | #000000 | 128/255 |
| Apocalíptica | image8 | #ffffff | 128/255 |

Os tokens candidatos estão isolados na prancha. Após aprovação, passarão
para `docs/design/tema/_tokens.scss` e seu espelho no frontend, comuns às
bases clara/escura. Fundos de suporte usam superfícies do tema: claro para
Catastrófica e Extrema; escuro para os demais níveis. Assim se preservam as
cores do livro sem perder a leitura nas duas bases. Nome e número acompanham toda cor.

## Crédito proposto para o rodapé futuro de Regras

Logo SCP: far2; versão de alta resolução por Aelanna; vetor de Vizorsols
e BmboB. Adaptado para ContratadosRPG. Licença CC BY-SA 3.0.

No rodapé, “Logo SCP” terá o link de origem acima e “CC BY-SA 3.0” o link
da licença. O texto é candidato e depende da conferência do autor.
O rodapé será consumido na M10-06, que cria a página; não existe ainda
uma página de Regras nesta task. A M10-04 prepara o crédito e os assets.
