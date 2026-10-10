# Organização documental e artefatos — revisão de 08/10/2026

A revisão concentrou os documentos de execução junto das specs e retirou as
capturas/saídas brutas da árvore candidata ao versionamento. Não implementou M10,
não alterou regras do jogo e não declarou concluídas avaliações parciais.

## Inventário e resultado

| Origem | Arquivos antes | Destino/decisão |
|---|---:|---|
| `docs/reviews/` | 510: 23 Markdown, 463 PNG, 24 JSON | Markdown junto das specs; PNG/JSON em `.artifacts/` |
| `docs/auditorias/` | 2: relatório e saída REST/WS | Relatório junto da investigação; saída bruta local |
| `docs/superpowers/` | 51: 23 designs e 28 planos | Anexos de specs existentes ou registros explícitos de legado |
| `docs/design/propostas/` | 25 | Propostas/corpus/fontes junto da spec; 13 PNG e um resultado JSON locais |
| Auditorias pontuais em `docs/design/` | 2 | Anexos de UI-06 e UI-27 |
| `cenario.json` na raiz | 1 | Cenário local da avaliação de usabilidade |

Total: **591 arquivos realocados**, **88 anexos versionáveis** e **503 artefatos
locais** (476 PNG + 27 JSON, 27,92 MiB). Os quatro depósitos antigos ficaram sem
arquivos. Os 463 PNG de reviews, isoladamente, ocupavam 26,58 MiB.

Cada movimentação foi conferida por SHA-256 antes de corrigir ponteiros.
Os 503 artefatos originais permanecem íntegros, inclusive após reproduzir a
prancha. O manifesto detalhado com tamanho/hash está localmente em
`.artifacts/organizacao-documentacao-e-artefatos/migracao.json`; a tabela abaixo
registra os destinos textuais/fontes no próprio clone.

## O que continua versionado e por quê

- Livros em `docs/core/`: fontes autorais e PDFs necessários ao sistema.
- `docs/design/tema/`, `DESIGN.md`, `FICHA-NPC.md` e `examples/`: contrato visual
  permanente e exemplos aprovados exigidos pelos gates do projeto. Os HTMLs
  maiores contêm referências visuais incorporadas; não são capturas de execução.
- Assets de `frontend/public/` e `backend/tools/database/assets/`: identidade do
  produto e imagens das fixtures reproduzíveis do ambiente de desenvolvimento.
- `docs/generic_base/`: modelos reutilizáveis; `docs/patchnotes/`: notas de versão.
- SVGs/paleta/fontes de M10-04 e corpus do montador: insumos de aprovação/aceite,
  distintos dos screenshots ou dumps produzidos durante a inspeção.
- `render.yaml` e o runbook antigo: pendência já explicitada em CONTEXT; o autor
  pediu manter Render como fallback até o cutover. Esta revisão não remove essa
  configuração nem opera serviços de produção.

## Estado dos registros

Cinco contratos fundadores implementados sem spec dona ganharam registros
retrospectivos em `done/`: ajuste manual de dados de atributo; equipe/ocultação;
prévia local antiga/avatar; cadernos privados/busca; inventário de esquadrão.
O registro preserva o relato histórico, sem recertificar gates. A prévia local
antiga foi substituída pela M8-04 e não é apresentada como contrato atual.

Seis documentos de quatro recortes sem fecho convincente ficaram sob
[legado a conferir](../../done/legado-superpowers-conferir-fecho.spec.md):
bônus de atributo no guia, ações da ficha no painel do jogador, aumento de avatar
e identidade Markdown do Caderno. Não foi inferido que essas features faltem;
nenhum plano antigo passa a ser autorização nova de implementação.

A [avaliação de usabilidade](../../backlog/usabilidade-2026-09-13.spec.md) permanece em
`active/`. A auditoria de ficha oculta preserva a rodada histórica em `done/`,
conforme P-098, e sua cobertura restante tem
[registro de retomada no backlog](../../backlog/auditoria-ficha-oculta-retomada-cobertura.spec.md).
M10-04 continua ativa, com aprovação/incorporação pendentes; demais estados de
M10 preservados. Vínculos por continuidade, sem spec específica original,
servem à organização dos anexos e não ampliam retroativamente o aceite.

## Prevenção aplicada

A fonte da regra é `SYSTEM.SPEC.md` §3.1. AGENTS/CLAUDE apontam para ela;
`task-flow` determina localizar o proprietário antes de gravar anexos e mover
spec/pasta juntos; `verify` encaminha capturas e resultados brutos para o destino
local. Os destinos padrão de skills externas não abrem outro ciclo documental.

`npm run repo:verificar` valida a árvore local; `--staged` valida nomes e conteúdo
no índice. Recusa depósitos paralelos, specs externas, anexos órfãos, capturas
em specs ou dispersas, mídia fora de fontes/assets/fixtures canônicos e espelhos
diferentes, inclusive auxiliares das skills. O CI roda testes do verificador e
confere o índice antes de instalar as dependências dos workspaces.

O guard não infere o significado de qualquer Markdown/JSON: classificar um
arquivo como fonte/fixture em vez de saída bruta continua sendo parte da revisão
da spec e do diff. A proteção de caminhos complementa a regra, não substitui
essa avaliação. Nova família legítima de assets exige ajuste explícito do guard.

## Verificação e correções

- `npm run repo:test`: **7/7 testes aprovados**, incluindo Git real temporário,
  captura incluída à força, diferença escondida no índice e exclusão preparada.
- `npm run repo:verificar`: árvore aprovada. Índice candidato temporário:
  **2.042 arquivos**, zero nos depósitos removidos, guard `--staged` aprovado;
  SHA-256 do índice real preservado. O índice real não foi preparado/alterado.
- Links: checagem mecânica comparou 429 referências da árvore anterior; zero
  regressões. A revisão independente conferiu 127 Markdown/347 links locais
  fora de código: oito quebrados já existiam. A checagem mecânica registra 54
  referências ausentes preexistentes, incluindo menções que não são links reais.
- A revisão independente encontrou 26 chamadas de exemplos confundidas com
  links pela transformação inicial. Foram restauradas; **558 blocos de código**
  migrados conferidos contra o original, permitindo somente troca de caminhos.
- Destinos antigos ainda prescritos nas specs abertas M10-04 e Ícones de Recursos
  corrigidos. Escapes de captura fora das pastas antigas acrescentados aos testes.
- Espelhos integrais de AGENTS/CLAUDE e das duas árvores de skills conferidos;
  `quick_validate.py` em `task-flow` e `verify`; sintaxe dos quatro scripts afetados.
- Gerador de M10-04 reproduziu as fontes; verificador da prancha passou em
  1920×1080, 360×800, 960×1080 e 1366×768: imagens carregadas, fontes presentes,
  geometria/paleta válidas, zero erros e zero overflow. Principal inspecionou
  as capturas desktop/mobile. DOM e estilos equivalentes ao original; formatação
  anterior preservada. O gerador escreve PNGs em `.artifacts/m10-04/`; o
  verificador grava suas capturas/JSON no mesmo destino local.
- `git diff --check` aprovado no fecho. Mudança no produto somente no ponteiro
  de um comentário HTML; nenhuma lógica, controle ou estilo do app alterado.
  Builds/lint/suítes de produto não foram repetidos para essa alteração documental.

Os testes de Git temporário e a inicialização do navegador falharam dentro do
sandbox por permissão; passaram fora dele. Não são falhas do produto nem gates
pendentes desta organização. Revisão independente: Codex/explorer (modelo
herdado), mapeamento do legado e análise do diff; três achados procedentes corrigidos.

Não houve commit, push nem reescrita do histórico Git. Os binários antigos ainda
existem nos commits anteriores; reduzir o histórico é uma operação diferente.
Os gates/aprovações das tarefas abertas acima permanecem pendentes.

## Mapa dos anexos realocados

| Origem | Destino junto da spec |
|---|---|
| `docs/superpowers/plans/2026-07-16-m3-23-identidade.md` | [`done/m3-23-contrato-motor-identidade/2026-07-16-m3-23-identidade.md`](../../done/m3-23-contrato-motor-identidade/2026-07-16-m3-23-identidade.md) |
| `docs/superpowers/plans/2026-07-21-ficha-contra-ataque-calculado.md` | [`done/m3-39-ficha-contra-ataque-calculado/2026-07-21-ficha-contra-ataque-calculado.md`](../../done/m3-39-ficha-contra-ataque-calculado/2026-07-21-ficha-contra-ataque-calculado.md) |
| `docs/superpowers/plans/2026-08-02-ajuste-manual-dados-atributo.md` | [`done/registro-ajuste-manual-dados-atributo/2026-08-02-ajuste-manual-dados-atributo.md`](../../done/registro-ajuste-manual-dados-atributo/2026-08-02-ajuste-manual-dados-atributo.md) |
| `docs/superpowers/plans/2026-08-02-layout-lista-edicao-atributos.md` | [`done/m3-38-ficha-redesenho-comparacao-visual/2026-08-02-layout-lista-edicao-atributos.md`](../../done/m3-38-ficha-redesenho-comparacao-visual/2026-08-02-layout-lista-edicao-atributos.md) |
| `docs/superpowers/plans/2026-08-05-alinhamento-filtros-inventario.md` | [`done/m3-38-ficha-redesenho-comparacao-visual/2026-08-05-alinhamento-filtros-inventario.md`](../../done/m3-38-ficha-redesenho-comparacao-visual/2026-08-05-alinhamento-filtros-inventario.md) |
| `docs/superpowers/plans/2026-08-05-barra-filtro-inventario.md` | [`done/m3-38-ficha-redesenho-comparacao-visual/2026-08-05-barra-filtro-inventario.md`](../../done/m3-38-ficha-redesenho-comparacao-visual/2026-08-05-barra-filtro-inventario.md) |
| `docs/superpowers/plans/2026-08-05-ficha-extras-subnavegacao.md` | [`done/m3-71-ficha-extras-subnavegacao/2026-08-05-ficha-extras-subnavegacao.md`](../../done/m3-71-ficha-extras-subnavegacao/2026-08-05-ficha-extras-subnavegacao.md) |
| `docs/superpowers/plans/2026-08-05-m3-70-municao-contagem.md` | [`done/m3-70-ficha-municao-contagem/2026-08-05-m3-70-municao-contagem.md`](../../done/m3-70-ficha-municao-contagem/2026-08-05-m3-70-municao-contagem.md) |
| `docs/superpowers/plans/2026-08-07-experimento-peculiaridade-origem.md` | [`done/m3-57-guia-criacao-ficha/2026-08-07-experimento-peculiaridade-origem.md`](../../done/m3-57-guia-criacao-ficha/2026-08-07-experimento-peculiaridade-origem.md) |
| `docs/superpowers/plans/2026-08-07-guia-habilidades-progressao-e-resumo-identidade.md` | [`done/m3-64-guia-habilidades-progressao-avulsa/2026-08-07-guia-habilidades-progressao-e-resumo-identidade.md`](../../done/m3-64-guia-habilidades-progressao-avulsa/2026-08-07-guia-habilidades-progressao-e-resumo-identidade.md) |
| `docs/superpowers/plans/2026-08-08-guia-criacao-bonus-atributo-escolha.md` | [`done/legado-superpowers-conferir-fecho/2026-08-08-guia-criacao-bonus-atributo-escolha.md`](../../done/legado-superpowers-conferir-fecho/2026-08-08-guia-criacao-bonus-atributo-escolha.md) |
| `docs/superpowers/plans/2026-08-08-painel-jogador-acoes-ficha.md` | [`done/legado-superpowers-conferir-fecho/2026-08-08-painel-jogador-acoes-ficha.md`](../../done/legado-superpowers-conferir-fecho/2026-08-08-painel-jogador-acoes-ficha.md) |
| `docs/superpowers/plans/2026-08-10-equipe-completa-e-ficha-oculta.md` | [`done/registro-equipe-completa-e-ficha-oculta/2026-08-10-equipe-completa-e-ficha-oculta.md`](../../done/registro-equipe-completa-e-ficha-oculta/2026-08-10-equipe-completa-e-ficha-oculta.md) |
| `docs/superpowers/plans/2026-08-10-ficha-visibilidade-confirmacao-tempo-real.md` | [`done/m3-65a-ficha-visibilidade-confirmacao-tempo-real/2026-08-10-ficha-visibilidade-confirmacao-tempo-real.md`](../../done/m3-65a-ficha-visibilidade-confirmacao-tempo-real/2026-08-10-ficha-visibilidade-confirmacao-tempo-real.md) |
| `docs/superpowers/plans/2026-08-10-preview-jogador-e-avatar-esquadrao.md` | [`done/registro-previa-local-e-avatar-esquadrao/2026-08-10-preview-jogador-e-avatar-esquadrao.md`](../../done/registro-previa-local-e-avatar-esquadrao/2026-08-10-preview-jogador-e-avatar-esquadrao.md) |
| `docs/superpowers/plans/2026-08-11-reset-seed-desenvolvimento.md` | [`done/dev-01-reset-seed-desenvolvimento/2026-08-11-reset-seed-desenvolvimento.md`](../../done/dev-01-reset-seed-desenvolvimento/2026-08-11-reset-seed-desenvolvimento.md) |
| `docs/superpowers/plans/2026-08-12-acesso-negado-isolado.md` | [`done/m6-06-frontend-gate-tester-acesso-negado/2026-08-12-acesso-negado-isolado.md`](../../done/m6-06-frontend-gate-tester-acesso-negado/2026-08-12-acesso-negado-isolado.md) |
| `docs/superpowers/plans/2026-08-12-inventario-de-esquadrao-backend.md` | [`done/registro-inventario-de-esquadrao/2026-08-12-inventario-de-esquadrao-backend.md`](../../done/registro-inventario-de-esquadrao/2026-08-12-inventario-de-esquadrao-backend.md) |
| `docs/superpowers/plans/2026-08-12-m6-04-operacoes-sensiveis.md` | [`done/m6-04-backend-operacoes-sensiveis-invariantes/2026-08-12-m6-04-operacoes-sensiveis.md`](../../done/m6-04-backend-operacoes-sensiveis-invariantes/2026-08-12-m6-04-operacoes-sensiveis.md) |
| `docs/superpowers/plans/2026-08-12-m6-05-gestao-usuarios.md` | [`done/m6-05-frontend-gestao-usuarios/2026-08-12-m6-05-gestao-usuarios.md`](../../done/m6-05-frontend-gestao-usuarios/2026-08-12-m6-05-gestao-usuarios.md) |
| `docs/superpowers/plans/2026-08-12-registro-expurgado-variavel.md` | [`done/m6-06-frontend-gate-tester-acesso-negado/2026-08-12-registro-expurgado-variavel.md`](../../done/m6-06-frontend-gate-tester-acesso-negado/2026-08-12-registro-expurgado-variavel.md) |
| `docs/superpowers/plans/2026-08-13-inventario-de-esquadrao-frontend.md` | [`done/registro-inventario-de-esquadrao/2026-08-13-inventario-de-esquadrao-frontend.md`](../../done/registro-inventario-de-esquadrao/2026-08-13-inventario-de-esquadrao-frontend.md) |
| `docs/superpowers/plans/2026-08-14-cadernos-campanha-busca.md` | [`done/registro-cadernos-privados-e-busca/2026-08-14-cadernos-campanha-busca.md`](../../done/registro-cadernos-privados-e-busca/2026-08-14-cadernos-campanha-busca.md) |
| `docs/superpowers/plans/2026-08-15-visualizacao-ficha-criatura.md` | [`done/m4-04b-frontend-visualizacao-criatura/2026-08-15-visualizacao-ficha-criatura.md`](../../done/m4-04b-frontend-visualizacao-criatura/2026-08-15-visualizacao-ficha-criatura.md) |
| `docs/superpowers/plans/2026-08-27-caderno-esquadrao-colaborativo.md` | [`done/caderno-esquadrao-colaborativo/2026-08-27-caderno-esquadrao-colaborativo.md`](../../done/caderno-esquadrao-colaborativo/2026-08-27-caderno-esquadrao-colaborativo.md) |
| `docs/superpowers/plans/2026-09-08-campanha-detalhe-mestre-coluna-acoes.md` | [`done/campanha-detalhe-mestre-coluna-acoes/2026-09-08-campanha-detalhe-mestre-coluna-acoes.md`](../../done/campanha-detalhe-mestre-coluna-acoes/2026-09-08-campanha-detalhe-mestre-coluna-acoes.md) |
| `docs/superpowers/plans/2026-09-16-montador-rolagem-ajustes.md` | [`done/montador-rolagem-ajustes/2026-09-16-montador-rolagem-ajustes.md`](../../done/montador-rolagem-ajustes/2026-09-16-montador-rolagem-ajustes.md) |
| `docs/superpowers/plans/2026-09-21-rede-01-ciclo-vida-salas.md` | [`done/rede-01-ciclo-vida-salas-tempo-real/2026-09-21-rede-01-ciclo-vida-salas.md`](../../done/rede-01-ciclo-vida-salas-tempo-real/2026-09-21-rede-01-ciclo-vida-salas.md) |
| `docs/superpowers/plans/2026-09-22-i-027-rolagens-janela-contextos.md` | [`done/i-027-rolagens-janela-contextos/2026-09-22-i-027-rolagens-janela-contextos.md`](../../done/i-027-rolagens-janela-contextos/2026-09-22-i-027-rolagens-janela-contextos.md) |
| `docs/superpowers/plans/2026-09-29-m7-27-investigacao-jogador-esquadrao.md` | [`done/m7-27-investigacao-jogador-visao-esquadrao/2026-09-29-m7-27-investigacao-jogador-esquadrao.md`](../../done/m7-27-investigacao-jogador-visao-esquadrao/2026-09-29-m7-27-investigacao-jogador-esquadrao.md) |
| `docs/superpowers/specs/2026-07-14-habilidades-do-sistema-design.md` | [`done/m3-13-ficha-editor-habilidades/2026-07-14-habilidades-do-sistema-design.md`](../../done/m3-13-ficha-editor-habilidades/2026-07-14-habilidades-do-sistema-design.md) |
| `docs/superpowers/specs/2026-08-02-ajuste-manual-dados-atributo-design.md` | [`done/registro-ajuste-manual-dados-atributo/2026-08-02-ajuste-manual-dados-atributo-design.md`](../../done/registro-ajuste-manual-dados-atributo/2026-08-02-ajuste-manual-dados-atributo-design.md) |
| `docs/superpowers/specs/2026-08-02-layout-lista-edicao-atributos-design.md` | [`done/m3-38-ficha-redesenho-comparacao-visual/2026-08-02-layout-lista-edicao-atributos-design.md`](../../done/m3-38-ficha-redesenho-comparacao-visual/2026-08-02-layout-lista-edicao-atributos-design.md) |
| `docs/superpowers/specs/2026-08-05-alinhamento-filtros-inventario-design.md` | [`done/m3-38-ficha-redesenho-comparacao-visual/2026-08-05-alinhamento-filtros-inventario-design.md`](../../done/m3-38-ficha-redesenho-comparacao-visual/2026-08-05-alinhamento-filtros-inventario-design.md) |
| `docs/superpowers/specs/2026-08-05-barra-filtro-inventario-design.md` | [`done/m3-38-ficha-redesenho-comparacao-visual/2026-08-05-barra-filtro-inventario-design.md`](../../done/m3-38-ficha-redesenho-comparacao-visual/2026-08-05-barra-filtro-inventario-design.md) |
| `docs/superpowers/specs/2026-08-07-experimento-peculiaridade-origem-design.md` | [`done/m3-57-guia-criacao-ficha/2026-08-07-experimento-peculiaridade-origem-design.md`](../../done/m3-57-guia-criacao-ficha/2026-08-07-experimento-peculiaridade-origem-design.md) |
| `docs/superpowers/specs/2026-08-07-guia-habilidades-progressao-e-resumo-identidade-design.md` | [`done/m3-64-guia-habilidades-progressao-avulsa/2026-08-07-guia-habilidades-progressao-e-resumo-identidade-design.md`](../../done/m3-64-guia-habilidades-progressao-avulsa/2026-08-07-guia-habilidades-progressao-e-resumo-identidade-design.md) |
| `docs/superpowers/specs/2026-08-08-guia-criacao-bonus-atributo-escolha-design.md` | [`done/legado-superpowers-conferir-fecho/2026-08-08-guia-criacao-bonus-atributo-escolha-design.md`](../../done/legado-superpowers-conferir-fecho/2026-08-08-guia-criacao-bonus-atributo-escolha-design.md) |
| `docs/superpowers/specs/2026-08-08-painel-jogador-acoes-ficha-design.md` | [`done/legado-superpowers-conferir-fecho/2026-08-08-painel-jogador-acoes-ficha-design.md`](../../done/legado-superpowers-conferir-fecho/2026-08-08-painel-jogador-acoes-ficha-design.md) |
| `docs/superpowers/specs/2026-08-10-avatar-maior-ficha-design.md` | [`done/legado-superpowers-conferir-fecho/2026-08-10-avatar-maior-ficha-design.md`](../../done/legado-superpowers-conferir-fecho/2026-08-10-avatar-maior-ficha-design.md) |
| `docs/superpowers/specs/2026-08-10-equipe-completa-e-ficha-oculta-design.md` | [`done/registro-equipe-completa-e-ficha-oculta/2026-08-10-equipe-completa-e-ficha-oculta-design.md`](../../done/registro-equipe-completa-e-ficha-oculta/2026-08-10-equipe-completa-e-ficha-oculta-design.md) |
| `docs/superpowers/specs/2026-08-10-ficha-visibilidade-confirmacao-tempo-real-design.md` | [`done/m3-65a-ficha-visibilidade-confirmacao-tempo-real/2026-08-10-ficha-visibilidade-confirmacao-tempo-real-design.md`](../../done/m3-65a-ficha-visibilidade-confirmacao-tempo-real/2026-08-10-ficha-visibilidade-confirmacao-tempo-real-design.md) |
| `docs/superpowers/specs/2026-08-10-preview-jogador-e-avatar-esquadrao-design.md` | [`done/registro-previa-local-e-avatar-esquadrao/2026-08-10-preview-jogador-e-avatar-esquadrao-design.md`](../../done/registro-previa-local-e-avatar-esquadrao/2026-08-10-preview-jogador-e-avatar-esquadrao-design.md) |
| `docs/superpowers/specs/2026-08-11-reset-seed-desenvolvimento-design.md` | [`done/dev-01-reset-seed-desenvolvimento/2026-08-11-reset-seed-desenvolvimento-design.md`](../../done/dev-01-reset-seed-desenvolvimento/2026-08-11-reset-seed-desenvolvimento-design.md) |
| `docs/superpowers/specs/2026-08-12-acesso-negado-isolado-design.md` | [`done/m6-06-frontend-gate-tester-acesso-negado/2026-08-12-acesso-negado-isolado-design.md`](../../done/m6-06-frontend-gate-tester-acesso-negado/2026-08-12-acesso-negado-isolado-design.md) |
| `docs/superpowers/specs/2026-08-12-cadernos-campanha-busca-design.md` | [`done/registro-cadernos-privados-e-busca/2026-08-12-cadernos-campanha-busca-design.md`](../../done/registro-cadernos-privados-e-busca/2026-08-12-cadernos-campanha-busca-design.md) |
| `docs/superpowers/specs/2026-08-12-inventario-de-esquadrao-design.md` | [`done/registro-inventario-de-esquadrao/2026-08-12-inventario-de-esquadrao-design.md`](../../done/registro-inventario-de-esquadrao/2026-08-12-inventario-de-esquadrao-design.md) |
| `docs/superpowers/specs/2026-08-12-m6-05-gestao-usuarios-design.md` | [`done/m6-05-frontend-gestao-usuarios/2026-08-12-m6-05-gestao-usuarios-design.md`](../../done/m6-05-frontend-gestao-usuarios/2026-08-12-m6-05-gestao-usuarios-design.md) |
| `docs/superpowers/specs/2026-08-12-registro-expurgado-variavel-design.md` | [`done/m6-06-frontend-gate-tester-acesso-negado/2026-08-12-registro-expurgado-variavel-design.md`](../../done/m6-06-frontend-gate-tester-acesso-negado/2026-08-12-registro-expurgado-variavel-design.md) |
| `docs/superpowers/specs/2026-08-27-caderno-esquadrao-colaborativo-design.md` | [`done/caderno-esquadrao-colaborativo/2026-08-27-caderno-esquadrao-colaborativo-design.md`](../../done/caderno-esquadrao-colaborativo/2026-08-27-caderno-esquadrao-colaborativo-design.md) |
| `docs/superpowers/specs/2026-09-02-caderno-markdown-identidade-design.md` | [`done/legado-superpowers-conferir-fecho/2026-09-02-caderno-markdown-identidade-design.md`](../../done/legado-superpowers-conferir-fecho/2026-09-02-caderno-markdown-identidade-design.md) |
| `docs/reviews/espectador-documentos-cena/RELATORIO.md` | [`done/espectador-documentos-cena/RELATORIO.md`](../../done/espectador-documentos-cena/RELATORIO.md) |
| `docs/reviews/fix-documentos-investigacao/VERIFICACAO.md` | [`done/fix-documentos-investigacao-selecao-e-leitura/VERIFICACAO.md`](../../done/fix-documentos-investigacao-selecao-e-leitura/VERIFICACAO.md) |
| `docs/reviews/m10-01-verificacao.md` | [`done/m10-01-normalizador-nucleo/m10-01-verificacao.md`](../../done/m10-01-normalizador-nucleo/m10-01-verificacao.md) |
| `docs/reviews/m10-02-verificacao.md` | [`done/m10-02-normalizador-casos-explicitos/m10-02-verificacao.md`](../../done/m10-02-normalizador-casos-explicitos/m10-02-verificacao.md) |
| `docs/reviews/m10-03-verificacao.md` | [`done/m10-03-icones-identidade/m10-03-verificacao.md`](../../done/m10-03-icones-identidade/m10-03-verificacao.md) |
| `docs/reviews/m10-04-proposta-v1.md` | [`done/m10-04-svg-scp-definitivo/m10-04-proposta-v1.md`](../../done/m10-04-svg-scp-definitivo/m10-04-proposta-v1.md) |
| `docs/reviews/m4-08b-verificacao.md` | [`done/m4-08b-frontend-visualizacao-npc/m4-08b-verificacao.md`](../../done/m4-08b-frontend-visualizacao-npc/m4-08b-verificacao.md) |
| `docs/reviews/m4-09-verificacao.md` | [`done/m4-09-frontend-listagem-revelacao-mestre/m4-09-verificacao.md`](../../done/m4-09-frontend-listagem-revelacao-mestre/m4-09-verificacao.md) |
| `docs/reviews/m4-10-verificacao.md` | [`done/m4-10-refinamento-mobile-criatura-npc/m4-10-verificacao.md`](../../done/m4-10-refinamento-mobile-criatura-npc/m4-10-verificacao.md) |
| `docs/reviews/m4-18-verificacao.md` | [`done/m4-18-ficha-npc-atributos-como-jogador/m4-18-verificacao.md`](../../done/m4-18-ficha-npc-atributos-como-jogador/m4-18-verificacao.md) |
| `docs/reviews/m4-19-auditoria.md` | [`done/m4-19-npc-testes-de-atributo-regra-e-rolagem/m4-19-auditoria.md`](../../done/m4-19-npc-testes-de-atributo-regra-e-rolagem/m4-19-auditoria.md) |
| `docs/reviews/m4-19-revisao-guia-v4.2.0.md` | [`done/m4-19-npc-testes-de-atributo-regra-e-rolagem/m4-19-revisao-guia-v4.2.0.md`](../../done/m4-19-npc-testes-de-atributo-regra-e-rolagem/m4-19-revisao-guia-v4.2.0.md) |
| `docs/reviews/m4-19-verificacao.md` | [`done/m4-19-npc-testes-de-atributo-regra-e-rolagem/m4-19-verificacao.md`](../../done/m4-19-npc-testes-de-atributo-regra-e-rolagem/m4-19-verificacao.md) |
| `docs/reviews/m4-20-verificacao.md` | [`done/m4-20-npc-ataques-e-equipamentos/m4-20-verificacao.md`](../../done/m4-20-npc-ataques-e-equipamentos/m4-20-verificacao.md) |
| `docs/reviews/m4-21-verificacao.md` | [`done/m4-21-ficha-npc-revisao-visual-usabilidade/m4-21-verificacao.md`](../../done/m4-21-ficha-npc-revisao-visual-usabilidade/m4-21-verificacao.md) |
| `docs/reviews/npc-ataques-equipamentos-investigacao.md` | [`done/npc-ataques-e-equipamentos-guia-v4.2.0/npc-ataques-equipamentos-investigacao.md`](../../done/npc-ataques-e-equipamentos-guia-v4.2.0/npc-ataques-equipamentos-investigacao.md) |
| `docs/reviews/p-097-sistema-v4.1.3.md` | [`done/p-097-revisao-critico-testes/p-097-sistema-v4.1.3.md`](../../done/p-097-revisao-critico-testes/p-097-sistema-v4.1.3.md) |
| `docs/reviews/p-097-verificacao.md` | [`done/p-097-01-critico-e-sistema-v4.1.3/p-097-verificacao.md`](../../done/p-097-01-critico-e-sistema-v4.1.3/p-097-verificacao.md) |
| `docs/reviews/p-100-verificacao.md` | [`done/p-100-npc-criacao-atributo-zero/p-100-verificacao.md`](../../done/p-100-npc-criacao-atributo-zero/p-100-verificacao.md) |
| `docs/reviews/p-101-verificacao.md` | [`done/p-101-criaturas-guia-v4.2.0/p-101-verificacao.md`](../../done/p-101-criaturas-guia-v4.2.0/p-101-verificacao.md) |
| `docs/reviews/p-102-verificacao.md` | [`done/p-102-referencias-documentos-vigentes/p-102-verificacao.md`](../../done/p-102-referencias-documentos-vigentes/p-102-verificacao.md) |
| `docs/reviews/requests-2026-09-26.md` | [`done/requests-correcoes/requests-2026-09-26.md`](../../done/requests-correcoes/requests-2026-09-26.md) |
| `docs/reviews/usabilidade-2026-09-13/RELATORIO.md` | [`backlog/usabilidade-2026-09-13/RELATORIO.md`](../../backlog/usabilidade-2026-09-13/RELATORIO.md) |
| `docs/auditorias/ficha-oculta-todos-consumidores.md` | [`done/auditoria-ficha-oculta-todos-consumidores/ficha-oculta-todos-consumidores.md`](../../done/auditoria-ficha-oculta-todos-consumidores/ficha-oculta-todos-consumidores.md) |
| `docs/design/AUDITORIA-BIBLIOTECA-VISUAL.md` | [`done/ui-06-auditoria-conformidade-biblioteca-visual/AUDITORIA-BIBLIOTECA-VISUAL.md`](../../done/ui-06-auditoria-conformidade-biblioteca-visual/AUDITORIA-BIBLIOTECA-VISUAL.md) |
| `docs/design/AUDITORIA-COMPONENTES-FANTASMA.md` | [`done/ui-27-auditoria-componentes-fantasma/AUDITORIA-COMPONENTES-FANTASMA.md`](../../done/ui-27-auditoria-componentes-fantasma/AUDITORIA-COMPONENTES-FANTASMA.md) |
| `docs/design/propostas/investigacao-jogador-esquadrao.html` | [`done/m7-27-investigacao-jogador-visao-esquadrao/investigacao-jogador-esquadrao.html`](../../done/m7-27-investigacao-jogador-visao-esquadrao/investigacao-jogador-esquadrao.html) |
| `docs/design/propostas/m10-04-scp-aprovacao.html` | [`done/m10-04-svg-scp-definitivo/m10-04-scp-aprovacao.html`](../../done/m10-04-svg-scp-definitivo/m10-04-scp-aprovacao.html) |
| `docs/design/propostas/m10-04/README.md` | [`done/m10-04-svg-scp-definitivo/proposta/README.md`](../../done/m10-04-svg-scp-definitivo/proposta/README.md) |
| `docs/design/propostas/m10-04/gerar-prancha.mjs` | [`done/m10-04-svg-scp-definitivo/proposta/gerar-prancha.mjs`](../../done/m10-04-svg-scp-definitivo/proposta/gerar-prancha.mjs) |
| `docs/design/propostas/m10-04/paleta.json` | [`done/m10-04-svg-scp-definitivo/proposta/paleta.json`](../../done/m10-04-svg-scp-definitivo/proposta/paleta.json) |
| `docs/design/propostas/m10-04/scp-icone-v1.svg` | [`done/m10-04-svg-scp-definitivo/proposta/scp-icone-v1.svg`](../../done/m10-04-svg-scp-definitivo/proposta/scp-icone-v1.svg) |
| `docs/design/propostas/m10-04/scp-silhueta-v1.svg` | [`done/m10-04-svg-scp-definitivo/proposta/scp-silhueta-v1.svg`](../../done/m10-04-svg-scp-definitivo/proposta/scp-silhueta-v1.svg) |
| `docs/design/propostas/m10-04/verificar-prancha.mjs` | [`done/m10-04-svg-scp-definitivo/proposta/verificar-prancha.mjs`](../../done/m10-04-svg-scp-definitivo/proposta/verificar-prancha.mjs) |
| `docs/design/propostas/m10-regras-exemplao.html` | [`done/m10-regras/m10-regras-exemplao.html`](../../done/m10-regras/m10-regras-exemplao.html) |
| `docs/design/propostas/montador-rolagem-formulas.json` | [`active/montador-rolagem-experimento/montador-rolagem-formulas.json`](../../active/montador-rolagem-experimento/montador-rolagem-formulas.json) |
| `docs/design/propostas/montador-rolagem-simplificado.html` | [`active/montador-rolagem-experimento/montador-rolagem-simplificado.html`](../../active/montador-rolagem-experimento/montador-rolagem-simplificado.html) |
