# M4-18 — atributos do NPC com o mesmo ladrilho do Jogador

Data: 2026-10-05. **Implementação e gates da task concluídos.**
Spec: [m4-18](../m4-18-ficha-npc-atributos-como-jogador.spec.md).
As falhas externas `P-095` e `P-096` continuam abertas; a suíte ampla não está toda verde.

## Fontes, diagnóstico e responsabilidade

Leituras: `SYSTEM.SPEC.md`, `CONVENTIONS.md`, `CONTEXT.md`, `PROBLEMS.md`, mapa/histórico
da frente, `DESIGN.md` e handoff `tema/`, sistema e Guia de Mestre nas seções de NPC/DT.
Skills `task-flow`, `design-fidelity`, `verify` e `convencoes-check` exercitadas.
Análogo principal: card Atributos de `FichaVisualizacao` (`#blocoAtributos`); secundário:
`criatura__atributo-card`. Diagnóstico na aplicação real em leitura/edição antes de editar.

O NPC usava nome por extenso/DT em `app-stat`, campo envolvido por `app-campo`, steppers
digitáveis e aviso fixo de recursos. O Jogador usava sigla focável, DT em tooltip, caixa
compacta, valor 22px, steppers `grande`/`discreto` sem digitação e grade fluida com piso de
120px/gap 6px. Criatura conserva outra receita, incluindo seu Modificador de quatro níveis.
As diferenças mensuráveis estão abaixo; alturas móveis são do card inteiro, inclusive a
parte rolável fora da janela (a captura do card inclui o chrome fixo que cruza a viewport).

`AtributoFicha` apresenta estado e emite eventos, sem fórmula, permissão ou persistência.
Os steppers continuam no consumidor por projeção; limites/formulário/PUT do NPC continuam
nos services existentes. A elegibilidade de Maestria vem do Jogador. Os controles internos
extraídos, inclusive a estrela, conservam sua receita aprovada. `NpcAtributos` concentra
somente o card, foco e encaminhamento de edição; retira responsabilidade do componente
extenso. Template do Jogador: **2585 → 2430 linhas (155 a menos)**;
teste existente byte a byte intacto. SCSS local do ladrilho removido do Jogador.

NPC desliga as cinco chaves opcionais, exibe valor base e DT de `shared/regras/npc`, mantém
zero e só exibe aviso de recursos em edição. O chip opcional de fórmula foi perguntado no
diagnóstico; sem resposta, adotada a apresentação mínima da spec, com DT no tooltip.
Nenhuma regra, fórmula, DTO, endpoint, permissão ou evento foi alterado. Criatura não migrou;
a possibilidade está na `I-048`.

## Regressão do Jogador

Antes/depois: **24 pares, zero pixels diferentes** (Pillow, tamanho e canais RGB),
abrangendo quatro viewports × duas fichas (base e estados ativos) × mestre leitura/edição
e jogador com concessão em leitura (`podeRolar=false`). A ficha de estados contém
Maestria em Destreza, lesão em Força, modificadores +4/-2 e ajuste de dados +2/-1.
Manifesto com dimensões/hashes: [comparação](../../../../.artifacts/m4-18/comparacao-jogador.json).
Capturas [antes](../../../../.artifacts/m4-18/antes-jogador-estados-mestre-1920-leitura.png) e
[depois](../../../../.artifacts/m4-18/depois-jogador-estados-mestre-1920-leitura.png); matriz completa na mesma pasta.
O análogo mantém todos os handlers, inputs, rascunhos e classes de estado.

## Medidas

Arredondadas a 0,1px; fontes carregadas. JSON completo:
[antes](../../../../.artifacts/m4-18/antes-medidas.json), [depois](../../../../.artifacts/m4-18/depois-medidas.json).
Valores abaixo são da primeira caixa de cada grupo; caixas com selo de dados podem ser
mais altas. A grade conserva gap 6px e aplica a mesma regra na largura efetiva da coluna.

### Linha de base: Jogador, Criatura e NPC

| Ficha / viewport | Estado | Card L×A (px) | Ladrilho L×A (px) | Gap | Colunas |
|---|---|---|---|---|---|
| jogador-base-mestre-1920 | leitura | 723,2×300,4 | 131,4×67,5 | 6px | 5 |
| jogador-base-mestre-1920 | edicao | 723,2×433,0 | 131,4×131,0 | 6px | 5 |
| criatura-mestre-1920 | leitura | 694,0×278,0 | 125,6×66,0 | 6px | 5 |
| criatura-mestre-1920 | edicao | 694,0×552,5 | 213,3×90,0 | 6px | 3 |
| civil-mestre-1920 | leitura | 694,0×362,9 | 124,0×78,6 | 8px | 5 |
| civil-mestre-1920 | edicao | 694,0×383,1 | — (campo, sem ladrilho) | 8px | 5 |
| jogador-base-mestre-360 | leitura | 331,0×631,4 | 146,5×67,5 | 6px | 2 |
| jogador-base-mestre-360 | edicao | 336,0×2214,5 | 304,0×199,0 | 6px | 1 |
| criatura-mestre-360 | leitura | 331,0×566,0 | 146,5×66,0 | 6px | 2 |
| criatura-mestre-360 | edicao | 336,0×900,5 | 149,0×118,0 | 6px | 2 |
| civil-mestre-360 | leitura | 331,0×729,0 | 145,5×78,6 | 8px | 2 |
| civil-mestre-360 | edicao | 331,0×765,2 | — (campo, sem ladrilho) | 8px | 2 |

### NPC após extração: quatro viewports

| Ficha / viewport | Estado | Card L×A (px) | Ladrilho L×A (px) | Gap | Colunas |
|---|---|---|---|---|---|
| civil-mestre-1920 | leitura | 694,0×253,0 | 125,6×54,5 | 6px | 5 |
| civil-mestre-1920 | edicao | 694,0×357,1 | 122,8×73,5 | 6px | 5 |
| civil-mestre-960 | leitura | 859,0×253,0 | 158,6×54,5 | 6px | 5 |
| civil-mestre-960 | edicao | 859,0×675,1 | 398,5×73,5 | 6px | 2 |
| civil-mestre-1366 | leitura | 694,0×253,0 | 125,6×54,5 | 6px | 5 |
| civil-mestre-1366 | edicao | 694,0×357,1 | 122,8×73,5 | 6px | 5 |
| civil-mestre-360 | leitura | 331,0×497,0 | 146,5×54,5 | 6px | 2 |
| civil-mestre-360 | edicao | 336,0×1070,2 | 290,0×79,5 | 6px | 1 |

## Verificação visual e interativa na aplicação real

Somente o stack já rodando foi usado, conforme resposta do autor: API 3100, SPA 4300,
Postgres existente. Nenhum serviço foi iniciado ou encerrado. Chromium/Playwright real,
capturas de baseline antes de editar, sem mock da página; PUT de sucesso enviado à API.
Só o atraso e o erro HTTP foram interceptados para exercitar os respectivos estados.

| Recorte | Viewports | Evidência/resultado |
|---|---|---|
| Jogador base + Maestria/lesão/modificador/dados, mestre e leitor | 1920×1080, 960×1080, 1366×768, 360×800 | 24 pares idênticos; leitura/edição preservadas |
| NPC Civil e Veterano, mestre/leitor | os mesmos quatro | 16 cenários; dez siglas, DT, zero, ausência das cinco mecânicas; leitor sem lápis |
| Edição válida, limite Civil e Salvar | os mesmos quatro | Civil 1→2 válido; 3 bloqueia Salvar/aviso no card; negativo/fracionário cobertos por testes |
| Salvando e falha | os mesmos quatro, mestre, ambas categorias | steppers bloqueados durante PUT; erro mantém rascunho e Cancelar disponível |
| Persistência | ambas categorias × quatro viewports | GET pós-PUT igual ao objeto anterior, mudando só Destreza; snapshots de Vida/Energia e demais dados iguais |
| Tooltip | ambas categorias × quatro viewports | hover e foco revelam Nome — DT; foco delineado; captura final com opacidade 1; mobile toque curto abre/fecha |
| Histórico lateral | ambas categorias × quatro viewports e dois papéis | `npc--apertado`; leitura/edição nos desktops; mobile painel próprio; sem overflow |
| Toque | 360×800, ambas categorias | Salvar/Cancelar ≥44px; steppers 44×44px; lápis 44×44px |

O agente principal inspecionou pessoalmente a UI capturada nos quatro viewports, incluindo
leitura/edição, limite inválido, salvando, erro, foco/tooltip e histórico lateral. Comparação
com o análogo: mesma identidade, densidade, hierarquia, espaçamento e caixa; controles/ícones
canônicos, zero legível, foco e contraste presentes, nenhum overflow. O NPC fecha as linhas
desligadas sem vazio. A grade usa cinco/duas/uma colunas na edição conforme breakpoint e
auto-fit na leitura, acompanhando a largura da coluna e o painel.

Correções durante integração: seletor `:host` dos estados preserva Maestria/lesão após a
extração; tamanho compacto do Jogador atravessa a fronteira por variável CSS; foco da edição
NPC vai ao botão Diminuir (o campo deixou de ser digitável). Antes da comparação final,
corrigidas expectativas de teste de foco e mensagem genérica de erro, sem alterar o service.
Captura de tooltip foi repetida após a transição terminar para avaliar o contraste final.
Não restou divergência visual da task.

Evidências representativas: [NPC desktop](../../../../.artifacts/m4-18/depois-civil-mestre-1920-leitura.png),
[edição mobile](../../../../.artifacts/m4-18/depois-civil-mestre-360-edicao.png),
[tela dividida + histórico](../../../../.artifacts/m4-18/estado-civil-mestre-960-historico-edicao.png),
[notebook leitor](../../../../.artifacts/m4-18/estado-veterano-leitor-1366-historico.png),
[erro](../../../../.artifacts/m4-18/estado-veterano-mestre-1366-falha.png),
[limite](../../../../.artifacts/m4-18/estado-civil-mestre-360-invalido.png),
[tooltip por toque](../../../../.artifacts/m4-18/tooltip-estavel-veterano-360.png).
[Medidas de toque](../../../../.artifacts/m4-18/estados-medidas.json).

## Gates de código

| Comando/checagem | Resultado |
|---|---|
| Teste focado inicial dos novos critérios | RED: implementação anterior não tinha primitivo/card extraído |
| `npm run test --workspace=frontend -- --watch=false --include=src/app/shared/ui/atributo-ficha/atributo-ficha.component.spec.ts --include=src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts --include=src/app/modules/ficha/componentes/npc-visualizacao/npc-visualizacao.component.spec.ts --include=src/app/modules/campanha/paginas/detalhe/campanha-detalhe-dados.service.spec.ts` | 243/243 (11 primitivo + 164 Jogador intactos + 30 NPC + 38 feed, inclui P-095 isolado) |
| `npm run test --workspaces --if-present -- --watch=false` | shared 1073/1073; backend 953 passaram, 1 falhou (P-096), 1 pulado; frontend 2925 passaram, 1 falhou (P-095) |
| `npm run test --workspace=backend -- src/modules/rolagem/rolagem.service.spec.ts` | 16/16; confirma P-096 intermitente |
| `npm run lint` | shared/backend limpos (backend também tsc); frontend apontou variável de teste não usada, corrigida |
| `npm run lint --workspace=frontend` após correção | zero erros; 26404 warnings do legado; três arquivos TS novos sem erros/warnings no lint individual |
| `npm run build --workspace=frontend` | passou; bundle 556,39kB, warning acima de 450kB, abaixo do teto de erro existente; budget inalterado |
| Revisão do diff contra spec/convenções | sem regra duplicada/DTO local/hex/fonte/raio avulso; biblioteca via API correta; projeção conserva controles; revisão independente sem achado concreto |

Os resultados auditáveis ficam na tabela acima; scripts e logs temporários foram removidos
no fecho, mantendo as capturas, medidas e o manifesto de comparação do Jogador.

`P-095` já estava registrado antes da task: datas iguais na fixture empatam a ordem do feed.
`P-096` foi descoberto no gate: o mock e a expectativa criam resumos com relógios 1ms
diferentes. Os dois arquivos estão intocados; passaram isolados. Não foram corrigidos
de passagem. Essas pendências da suíte permanecem abertas em `PROBLEMS.md`.

## Encerramento e dados de verificação

Campanha temporária 33 (`Verificação M4-18`), fichas 181–185, criadas só para este gate;
recursos restaurados após cada PUT de teste e registros removidos por soft delete ao fechar.
Usuários locais de desenvolvimento preexistentes preservados. Specs e trabalho de outras
sessões preservados. `I-047` aponta para esta spec em `done/`; `I-048` registra a Criatura;
próxima task é `m4-19`. Nenhum gate obrigatório da m4-18 pendente.


> Organização em 2026-10-08: capturas e saídas brutas citadas neste registro
> são evidências locais em `.artifacts/`, não distribuídas no clone. A migração
> preserva os resultados e limites originais e não executa novamente os gates.
