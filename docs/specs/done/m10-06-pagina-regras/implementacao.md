# M10-06 — Corte de implementação

Task aberta em 08/10/2026, após commit da M10-04 `9d1a81d6`.

## Fonte e análogo antes da UI

Spec proprietária: `../m10-06-pagina-regras.spec.md`. Fonte visual: exemplão M10,
aba Protótipo, página/Coluna. Análogo aprovado: patchnotes (sumário, observer de
capítulos e rolagem). Shell alinhado à esquerda, sumário sticky de cerca de 300px,
documento máximo 960px; títulos mono e texto longo sans, bordas/filetes dos
tokens. Segmentado e botão completos, chips/esqueletos/estado vazio canônicos.
No celular o sumário fica acima do documento até a M10-08; tabelas rolam em sua
própria caixa. As marcas e o crédito seguem `docs/design/MARCAS.md`.

## Responsabilidades

- Carga/cache HTTP e árvore/âncoras: service e helpers próprios, testes de concorrência/retry.
- Blocos básicos: componente por tipo, renderer recursivo pequeno, sem HTML cru.
- Página: seleção/carregamento, trilhos, ciclo de vida da navegação, URL e avisos.
- Topbar: entrada pública Regras; PDF anterior disponível como download provisório.
- Blocos ricos ficam na M10-07; tabelas de origem preservam seu conteúdo nesta etapa.

Chips de custo usam a variante existente secundário/contorno com texto `N E`, e
REAÇÃO usa primário/contorno. Nenhum primitivo é ampliado; o ícone de Energia só
entra após sua task específica. Versão exibida vem do JSON, não do nome do livro.

## Gates de fecho previstos

Testes focados de carga, árvore, blocos, rotas/topbar/navegação; integração Angular,
lint/build e organização. Skill verify: aplicação real em 1920×1080, 1366×768,
960×1080 e 360×800, claro/escuro, abertura/troca/âncora direta/link interno/inexistente,
carregamento/erro, rolagem e acessibilidade. Principal inspeciona pessoalmente.
P-105/P-106 anteriores serão discriminados, sem correções fora deste recorte.

Execução concluída; evidências e limites em [m10-06-verificacao.md](m10-06-verificacao.md).
