# M10-04 — prancha v1, aprovação pendente

Data: 2026-10-08. [Spec ativa](../m10-04-svg-scp-definitivo.spec.md).

**Revisão de uso pelo autor:** oficial só na identidade de Criatura; marca própria
SCP + D20 nos níveis, Regras e usos gerais. Prancha atualizada com o SVG existente
`logo-black.svg` recolorido. Capturas e medidas regeneradas nos mesmos quatro
viewports. O relato da primeira proposta abaixo preserva sua preparação; a
silhueta oficial nos níveis foi substituída por decisão do autor. Refino da
marca própria para pequenos tamanhos e gates de produto continuam abertos.

## Recorte preparado

[Prancha](m10-04-scp-aprovacao.html), duas variantes SVG preenchidas
(`scp-icone-v1.svg`, `scp-silhueta-v1.svg`), oito originais extraídos do Markdown e
[paleta reproduzível](proposta/paleta.json).
[Origem, licença e texto de crédito candidato](proposta/README.md).

Análogo registrado antes de editar: exemplão de Regras, aba Ícones/níveis.
Hierarquia IBM Plex Mono/Sans, superfícies, bordas, raios e espaços do handoff.
Prancha estática de desenho, sem controle novo, sem rota ou componente de produto.

As cores do exemplão eram aproximações visuais; a proposta extrai o RGB modal entre
os pixels de alfa máximo de cada `image1`…`image8` do livro atual v4.1.4.
Não há dependência do caminho v4.1.3 (P-105) neste preparo; nenhuma regra mudou.
Quatro imagens usam alfa 128/255; os candidatos usam preenchimento opaco sem relevo.

## Verificação da proposta

`gerar-prancha.mjs` e `verificar-prancha.mjs` executados com Playwright/Edge local.
`node --check` nos dois scripts aprovado; Prettier aplicado ao HTML.
SVGs são XML válidos, viewBox 24, cinco paths preenchidos, sem raster ou filtros.

O agente principal inspecionou pessoalmente as capturas finais:

| Viewport | Evidência |
|---|---|
| 1920×1080 | [Prancha](../../../../.artifacts/m10-04/prancha-1920x1080.png) |
| 360×800 | [Prancha](../../../../.artifacts/m10-04/prancha-360x800.png) |
| 960×1080 | [Prancha](../../../../.artifacts/m10-04/prancha-960x1080.png) |
| 1366×768 | [Prancha](../../../../.artifacts/m10-04/prancha-1366x768.png) |

Cada cenário contém ambas as bases, 44 SVGs, 16 níveis (8 por base), imagens completas,
dimensões 16/20/24/32/48/64/96px e zero erro de página/overflow horizontal.
[Medidas](../../../../.artifacts/m10-04/verificacao.json),
[detalhe de ícone](../../../../.artifacts/m10-04/detalhe-icone.png).
Shell estático mantém a densidade/hierarquia do análogo; sem controles, estados de
carga ou alvo de toque próprio. Links de crédito conservam foco visível.

Na inspeção foram corrigidos: simplificação indevida do contorno exterior fechado;
contraste dos tons claros sobre a base clara e do violeta sobre a base escura.
Fundos de suporte usam as superfícies do tema, sem mudar as oito cores do livro.

## Aberto

1. Autor aprovar os desenhos, a paleta sólida/fundos e o texto de crédito.
2. Incorporar `scp` e a identidade `criatura` em `app-icone`, preparar a marca
   própria para Regras/níveis, assets e tokens no handoff/runtime; revisar o diff
   e executar gates de produto, respeitando a aprovação dos desenhos exigida na spec.
3. Skill `verify`: inspeção dos componentes Angular reais nos quatro viewports,
   incluindo a comparação com ícones existentes. Esta prancha não substitui esse gate.
4. Rodapé da página de Regras só tem consumidor na M10-06; M10-04 prepara seu crédito.

Nenhum arquivo do frontend/shared/backend foi alterado. Build, lint e suítes de produto
não foram executados nesta etapa de aprovação. A task permanece em `active/`, não concluída.

## Validação para o commit de preparação

Autorizada pelo autor após a revisão de uso. `convencoes-check`: diff documental
lido integralmente; scripts e HTML revisados, sem alteração de produto, SQL,
DTO, regra ou permissão. Os valores de cor estão nos tokens da prancha candidata;
geometria é asset, não estilo de controle. Não se criou UI de produto ou primitivo.

- `node --check` nos dois scripts: aprovado.
- `npx prettier --check docs/specs/done/m10-04-svg-scp-definitivo/m10-04-scp-aprovacao.html`: aprovado.
- `verificar-prancha.mjs`: quatro viewports aprovados, cores computadas iguais
  à paleta, dimensões 16/20/24/32/48/64/96px com tolerância de 0,1px e identidades
  separadas por viewBox (oficial 24 em Criatura; marca existente 1000 nos níveis/Regras).
- Conferência independente com Pillow: oito PNGs idênticos byte a byte aos dados
  embutidos no livro; oito RGBs dominantes, alfas e contagens iguais ao JSON.
- XML: dois SVGs oficiais válidos, cinco paths, `currentColor`, sem raster,
  scripts, filtros, handlers ou cores fixas.
- `git diff --check`: aprovado.

É validação da preparação. A marca própria atual continua ruidosa nos tamanhos
pequenos; o refino e a validação com os componentes reais permanecem abertos.
Suítes/build/lint de produto não são gate deste commit exclusivamente em `docs/`;
continuam exigidos antes da incorporação e do fecho da task.

## Reprodução dos scripts

Os scripts aceitam `CODEX_BROWSER_PACKAGES` apontando para a pasta de pacotes Node
do runtime do Codex (Playwright e pngjs); usam o Edge instalado, sem baixar browser.
Executar o gerador, formatar o HTML com Prettier e executar o verificador.
Capturas são lidas diretamente do arquivo local, sem servidor permanente.


> Organização em 2026-10-08: capturas e saídas brutas citadas neste registro
> são evidências locais em `.artifacts/`, não distribuídas no clone. A migração
> preserva os resultados e limites originais e não executa novamente os gates.
