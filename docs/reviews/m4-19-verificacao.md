# M4-19 — verificação de Competências e testes de atributo do NPC

Data: 2026-10-06. Implementação e gates concluídos. Fontes autorais preservadas.

## Decisões e extração da regra

O autor pediu fechar as decisões e implementar; após a apresentação das propostas,
pediu continuar. O teste explícito do NPC aplica +2 uma vez pelo D20 crítico mantido,
sem dobrar Nível, ajustes ou Competência. O cabeçalho informa “Rolagens ocultas”;
não há alternância pública. P-099 continua descartada: nenhuma classificação nova
de fórmula livre ou inferência de dano/cura posteriores.

| Fonte | Contrato implementado |
|---|---|
| Guia v4.2.0, NPC, Nível (`:954`) | Nível 0–20, independente da Categoria; soma ao teste |
| Guia, Competências (`:970–987`) | Civil 0; Operativo 2×1D4; Veterano 3×1D6; Elite 4×2D6; Lendário 5×3D6 — quantidade de escolhas × dados por atributo competente |
| Guia, restrições (`:985`) | Atributo base positivo; não modifica atributo/D20/DT; dados da Categoria não dobram no crítico |
| Guia, DT (`:1029`) | `10 + Nível + 2 × atributo`, sem ajustes de teste ou Competência |
| Sistema v4.1.3, Testes/Crítico (`:1227–1233`) e decisão da execução | Teste NPC explicitamente identificado: +2 uma vez; dano/cura posteriores independentes |
| Motor vigente e decisão anterior m3-31 | Pool zero: 2D20, menor; pool negativo: `2 + abs(pool)` D20, menor |
| Autor, acesso e ocultação | Leitor vê valores/bônus, sem editar/rolar/histórico privado/Anotações; servidor força `PRIVADA` |

Mapas manuais opcionais de inteiros com chaves de atributo; negativos livres.
`modificadoresTeste` soma ao resultado e `dadosTeste` altera apenas a quantidade de D20.
Ausência de Competências identifica legado, sem seleção automática. Criação exige
a quantidade canônica; configurar o bloco exige escolhas válidas. Categoria/atributo
incompatível mantém as escolhas e bloqueia Salvar com mensagens.

## Arquitetura e revisão

- DTOs em `shared/src/dtos/ficha/`; tabela, validação, composição e execução em
  `shared/src/regras/npc/testes.ts`. Motor existente recebe contexto explícito do teste;
  `ehFormulaTeste` permanece intacto. Teste de regressão mantém a fórmula livre com
  dois pools em 30, enquanto a ação NPC competente totaliza 32.
- Backend valida documento/criação e impede retirar `competencias` de uma ficha já
  configurada. Permissões e privacidade ficam no service; controller/repository sem
  nova regra. JSONB, sem migration; SCHEMA e contrato OpenAPI alinhados.
- Orquestração extraída para `NpcRolagemService`; UI encaminha ação, sem somar +2.
  Bandeja e registro/histórico reutilizados; resposta REST e socket deduplicados pelo ID.
- Formulário existente mantém responsabilidade de rascunho e confirmação por bloco;
  configuração de Categoria/Competências/ajustes é atômica. Novo seletor tem componente
  próprio. Acréscimo na página é somente ligação de serviços e componentes existentes.
- Diff revisado contra spec/convenções: sem regra duplicada, nova tabela SQL, leitura
  automática de habilidades, escolha silenciosa ou mudança das fontes autorais.

## Gates automatizados

| Comando | Resultado |
|---|---|
| `npm run build --workspace=shared` | Passou; executado antes de usar o backend real |
| `npm run build --workspace=backend` | Passou |
| `npm run build --workspace=frontend` | Passou; PDFs/worker publicados conferidos |
| `npm run test` | Shared: 1126; backend: 968 + 1 ignorado; frontend: 3019. **5113 passaram**, 333 arquivos |
| `npm run lint` | Zero erros nos três workspaces; avisos existentes de formatação/estilo permanecem |
| `npx tsc --noEmit -p <workspace>/tsconfig…json` | Shared, backend e frontend passaram; frontend usa `tsconfig.app.json` |
| `npm run openapi:gerar-contratos --workspace=backend` | Contratos regenerados a partir dos DTOs |
| Lint do recorte final e `git diff --check` | Passaram |

Testes de domínio incluem 28/32, sem Competência 24, cinco Categorias, críticos
descartados, máximo no D6 sem crítico, margem ampliada, repetições independentes,
zero/negativo, legado e mapas malformados. Backend cobre criação obrigatória,
remoção indevida de configuração, leitor negado, mestre autorizado e visibilidade
forçada. Frontend cobre composição/registro privados, rascunho inválido preservado,
Cancelar e ajuste salvo sem alterar atributo/snapshots.

Avisos separados: bundle inicial do frontend 557,18 kB acima do orçamento de aviso
450 kB; lint registra avisos de estilo (5887 shared, 4474 backend, 27078 frontend).
JSDOM informa ausência de canvas durante testes existentes; nenhuma falha causada.

## Aplicação real e comparação visual pessoal

Stack real: Postgres 16, API NestJS em 3100 e Angular em 4300. Processos existentes do
autor preservados. Chromium com barras de rolagem visíveis, sem substituir API por mocks.

Análogos inspecionados: ficha de Jogador `app-atributo-ficha`, edição atual do NPC e
botões de liberação Civil no assistente. Seleção usa `app-botao`, `tamanho="medio"`,
`estilo="contorno"`, variante/`aria-pressed`; leitura usa `app-chip`. Ajustes usam
`app-step-input` micro/discreto/digitável; dadinho/tooltip e bandeja/histórico canônicos.
Nenhum novo primitivo nem extensão unilateral da biblioteca.

| Viewport | Estados percorridos e aprovados |
|---|---|
| 1920×1080 | Cinco Categorias em criação/leitura; registro pelo assistente de Civil e Veterano; seleção inválida/válida; ajustes/Cancelar/Salvar; conflitos; legado; leitor; normal/crítico/zero/negativo; repetição e histórico |
| 360×800 | Mesma matriz de configuração/leitura/rolagem; criação até Habilidades nas cinco Categorias; foco e teclado, navegação inferior, bandeja e histórico após animações |
| 960×1080 | Mesma matriz; assistente e ficha com quebra de colunas; ajustes, conflitos, legado, leitor e resultados |
| 1366×768 | Mesma matriz; criação, edição, conflitos, leitor; configuração de legado persistida sem perder Vida; normal/crítico/desvantagem/histórico |

Comparação pessoal das imagens renderizadas: shell, densidade, hierarquia, controles,
ícones, contraste e estados pertencem à mesma família do produto. Sem overflow horizontal
ou conteúdo/controles cortados. Botões de seleção mantêm alvo de 44 px; dadinho herda
área de toque do primitivo. Foco por Tab/Shift+Tab no campo digitável possui outline.

Achado corrigido no gate: página de NPC registrava a rolagem, mas não instanciava a
bandeja. Incluído `app-bandeja-dados` existente; build e suíte completa repetidos.
Capturas finais aguardam as transições canônicas. Captura de página completa alterava
a largura disponível e interferia no clique móvel; coleta corrigida para viewport real,
sem mudança desnecessária de layout do produto. No histórico móvel, o shell canônico
tem largura de viewport; scrollbar ocupa 5 px, com conteúdo e controles inteiramente visíveis.

A ação NPC não abre nem preenche o montador com sua fórmula; assim, o critério
condicional de faixa/média no montador não se aplica a esta entrega. Calculadora de
fórmulas livres conserva seu contrato; não recebe contexto NPC automaticamente.
Fórmula e todas as contribuições efetivamente executadas aparecem na bandeja/histórico.

Evidências: [API/socket](m4-19-verificacao/api-socket.json),
[matriz inicial, 40 registros](m4-19-verificacao/visual.json),
[matriz integrada, 55 registros](m4-19-verificacao/integrado.json) e
[20 capturas estáveis de resultados](m4-19-verificacao/animacoes.json).
Imagens representativas foram preservadas; capturas redundantes removidas.

| Recorte | Captura pessoalmente inspecionada |
|---|---|
| 1920×1080, criação/Competência | [Veterano](m4-19-verificacao/1920x1080-criacao-VETERANO.png) |
| 360×800, criação/Civil e resultado | [Civil](m4-19-verificacao/360x800-criacao-CIVIL.png), [Lendário](m4-19-verificacao/360x800-criacao-LENDARIO.png), [crítico](m4-19-verificacao/360x800-rolagem-critica.png), [histórico](m4-19-verificacao/360x800-historico.png), [negativo](m4-19-verificacao/360x800-pool-negativo.png) |
| 960×1080, quebra de layout | [Elite](m4-19-verificacao/960x1080-criacao-ELITE.png), [crítico](m4-19-verificacao/960x1080-rolagem-critica.png) |
| 1366×768, conflitos/legado | [Operativo](m4-19-verificacao/1366x768-criacao-OPERATIVO.png), [conflito](m4-19-verificacao/1366x768-conflito-categoria-atributo.png), [legado](m4-19-verificacao/1366x768-legado-configuracao.png) |
| Leitor e edição | [somente leitura](m4-19-verificacao/1920x1080-leitor.png), [ajustes móveis](m4-19-verificacao/360x800-edicao-ajustes.png) |

## Privacidade, legado e limpeza

API real confirmou: leitor recebe Competências/mapas sem Anotações; terceiro recebe
403; leitor não registra nem consulta histórico. Pedido `PUBLICA` do mestre grava
`PRIVADA`; mestre recebe evento, leitor não recebe em salas de campanha/ficha nem feed.
Rolagem crítica real registrada e recuperada no histórico.

Legado foi preparado apenas em ficha sintética, removendo os três campos opcionais.
UI salvou Vida79 sem acrescentá-los; abertura do bloco exigiu três escolhas. Cancelar
preservou legado; configuração explícita persistiu sem perder Vida.

[Limpeza confirmada](m4-19-verificacao/limpeza.json): 22 fichas, três usuários, uma
campanha, rolagens e vínculos sintéticos removidos por **soft delete**, nenhum registro
ativo restante. Scripts, credenciais locais, logs e capturas redundantes eliminados.
Proposta M10 e trabalho de M4-20 preservados. Sem pendência da M4-19; equipamento/ataques
continuam na task M4-20 com autorização própria.
