# M10-04 — Verificação da incorporação aprovada

## Resultado e autorização

Em 08/10/2026 o autor aprovou desenhos, paleta/fundos e crédito da prancha e
autorizou incorporação e gates. A marca própria existente foi preservada, sem
redesenho ou reenquadramento. Recorte de assets/catalogação concluído; página,
topbar/rodapé e níveis são consumidores das M10-06/07, explicitamente fora deste
recorte. O crédito aprovado está em `docs/design/MARCAS.md` e acompanha os assets
em `frontend/public/marcas/LICENCA.md`.

## Aderência à spec e arquitetura

- Quatro SVGs preenchidos, recoloríveis com `currentColor`, sem raster/filtro.
- Oficial reservado a `scp`/`criatura`; marca própria em `contratados`, para Regras,
  níveis e usos gerais. Catálogo anterior conserva traço/tamanho/semântica decorativa.
- Oito cores aprovadas e fundos de suporte nos tokens de design e runtime, iguais
  nas duas bases. Extrema e Catastrófica usam fundo claro; demais usam fundo escuro.
- Licença CC BY-SA 3.0, autores, fonte e adaptações documentados e distribuídos.
- `verificar-assets.mjs`: comparação XML dos cinco paths oficiais aprovados,
  vinte paths/grupo/transformações da marca própria original e template; verifica
  também metadados, ausência de raster/filtros e equivalência dos oito tokens.
- Diff revisado contra spec/convenções: nenhuma regra de domínio, backend ou DTO
  alterado. As duas propriedades computadas ficam no componente de apresentação;
  não acrescentam responsabilidade de negócio ao catálogo extenso.

## Verificação visual real — skill verify

Análogo registrado: `app-icone` existente (vizinho `d20`) dentro de `app-cartao`,
tokens e botão canônicos. Prancha aprovada fornece a geometria e cores. Composição
temporária iniciou a aplicação Angular real com seu `appConfig` e estilos; os
componentes usados são os de produto. Inspeção pessoal do agente principal nas
duas bases em **1920×1080, 1366×768, 960×1080 e 360×800**.

Em cada um dos oito cenários: marcas em **16/20/24/32/48/64/96px**, vizinho `d20`,
oito níveis a 96px, crédito e troca de tema. IBM Plex carregada nos pesos usados;
cores/fundos computados conferidos; sem overflow horizontal ou erros de página.
No celular, 96px quebra para outra linha e os níveis formam duas colunas. Créditos
quebram normalmente. Marcas são decorativas; textos dão o significado, botão
usa o primitivo completo. Não se criaram controles novos de produto.

A comparação confirma a família visual existente, densidade/hierarquia dos
cartões, tokens/controles canônicos e contraste dos fundos. A marca própria
ocupa aproximadamente **74% × 69%** da caixa: em 16px seu desenho ocupa cerca de
12×11px. Detalhes internos se condensam em **16–24px**; em **48–96px** ficam mais
distintos. Essa é a razão da indicação anterior de refino, e é uma limitação
documentada da geometria atual aprovada: não há alegação de leitura independente
de cada detalhe em 16px. Mudança do desenho exige nova aprovação.

Capturas/medidas/scripts em `.artifacts/m10-04/` (ignorados):
`angular-{escuro,claro}-{1920,1366,960,360}.png`, `comparacao-{escuro,claro}.png`,
`angular-medidas.json`, `verificar-angular.cjs`, composição temporária preservada.
Entrada Angular original restaurada, composição/configuração temporárias removidas.

## Gates executados

| Gate | Resultado |
|---|---|
| `node docs/specs/done/m10-04-svg-scp-definitivo/verificar-assets.mjs` | Quatro assets, geometria, template e paleta aprovados |
| Teste focado Angular `icone.component.spec.ts` | **31 testes aprovados**, incluindo quatro novos |
| Suíte Angular, contorno temporário P-106 | **214 arquivos / 3.064 testes aprovados** |
| `npm run lint` | **0 erros**; avisos anteriores: shared 5.890, backend 4.475, frontend 27.100 |
| `npx ng build`, `CI=true`, `NG_BUILD_MAX_WORKERS=2` | Produção aprovada; inicial **580,23 kB**, aviso do orçamento de 450 kB, abaixo do máximo de 1 MB |
| `npm run test` | Shared: 67 arquivos / 974 testes aprovados, dois arquivos falham por P-106; backend: 53 arquivos / 994 testes aprovados e um ignorado; normalizador: 34 aprovados / seis falhas P-105 |

P-105/P-106 já existiam e seguem em `PROBLEMS.md`: livros v4.1.3 e corpus do montador
realocados com referências antigas. O comando agregado não chega ao Angular devido
ao normalizador. A suíte Angular foi executada diretamente, com `tsconfig` temporário
e exclusão dos dois specs do montador (P-106); ambos removidos do contorno ao fim.
Não se corrigiram problemas fora do escopo. Logs locais identificam cada comando.

Gate documental final: `npm run repo:verificar` **aprovado** (organização e espelhos);
`git diff --check` **aprovado**, sem erros de whitespace. Nenhum commit
da M10-04 foi criado neste fecho; a autorização anterior de commit era da M10-05.
