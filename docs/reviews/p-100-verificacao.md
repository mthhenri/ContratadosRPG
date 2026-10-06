# P-100 — atributo zero na criação de NPC

Verificação em 2026-10-06. **Concluída**, sem pendências desta task.
Fonte: Guia v4.2.0 > NPC > Atributos (`docs/core/guia_de_mestre-v4.2.0.md:958`).

## Implementação e revisão

- `shared/regras/npc/criacao`: removida a rejeição de zero; saldo continua calculado pela
  base de cada atributo. Validador compartilhado mantém inteiro, mínimo zero e teto.
- Assistente: `StepInput` aceita zero e explica a redistribuição. Categoria não Civil
  preserva zeros escolhidos. Ao sair de Civil, somente combate anteriormente bloqueado
  retorna à base 1; zero escolhido após liberação narrativa permanece zero.
- Civil: combate bloqueado tem base zero, sem devolução fictícia; exceções independentes.
- Snapshot, revisão, API e ficha pronta preservam zero. Nenhuma fórmula de recursos,
  DTO, permissão, banco, edição da ficha pronta ou regra de Competência foi alterada.
- Achado visual: campo numérico do StepInput não tinha indicador de foco. Autor autorizou
  expressamente a correção no primitivo durante esta task. `:focus-visible` usa `--accent`
  e `--radius-control`; outline interno evita recorte pela cápsula. Sem API/variante nova.
- Diff completo da task lido contra spec, arquitetura e convenções; buscas de nomes,
  DTOs/enums, formulário legado, estilo local e hardcodes sem violações. Alteração de
  estado permanece no serviço do formulário; regra de distribuição permanece em shared.
  Acréscimo no serviço é seguro: trata a transição já existente, sem responsabilidade nova.
- HTML/SCSS tocados formatados; `git diff --check` passou.

## Gates executados

| Comando | Resultado |
|---|---|
| `npm run test --workspace=shared -- src/regras/npc/criacao.spec.ts` | Antes: 3 falhas reproduzindo a trava / 8 passaram; depois: 11/11 |
| `npm run test --workspace=frontend -- --watch=false --include=src/app/modules/ficha/paginas/criar-npc/npc-criacao-formulario.service.spec.ts --include=src/app/modules/ficha/paginas/criar-npc/criar-npc.page.spec.ts` | 29/29 |
| `npm run test --workspace=shared` | 65 arquivos; 1.096 passaram |
| `npm run test --workspace=backend` | 52 arquivos; 959 passaram, 1 skip preexistente |
| `npm run test --workspace=frontend -- --watch=false` | 213 arquivos; 3.006 passaram |
| `npm run build --workspace=shared` | Passou |
| `npm run build --workspace=backend` | Passou |
| `npm run build --workspace=frontend` | Passou; PDFs e worker publicados conferidos pelo script |
| `npm run lint` | Zero erros nos três workspaces; warnings: shared 5.887, backend 4.440, frontend 26.990 |
| Teste focado `src/app/shared/ui/stepper/step-input.component.spec.ts` após foco | 11/11 |
| Build e lint frontend após foco | Passaram; zero erros |

Suítes completas: **5.061 passaram + 1 skip**. Avisos já existentes: orçamento do bundle
inicial (557,18 kB / 450 kB), warnings de lint e diagnóstico Canvas no ambiente de testes
do leitor PDF. Não houve falha funcional nos gates. Rodadas amplas não repetidas após
mudança exclusivamente de SCSS; StepInput, build, lint e observação real cobrem esse recorte.

## Aplicação real e comparação pessoal

Skills `verify` e `design-fidelity`; Chromium com barras visíveis, frontend 4300/API 3100,
Postgres real, sessão sintética. Análogo aprovado: assistente de NPC m4-13 e seu StepInput,
inspecionados antes no código e no app. Foco: padrão canônico do tema `_base.scss`.

| Viewport | Operativo criado | Civil criado | Estados percorridos |
|---|---|---|---|
| 1920×1080 | 188 | 189 | Zero/redistribuição, saldo/teto, categorias, Civil, revisão, registro, leitura, edição/cancelamento, foco |
| 360×800 | 190 | 191 | Mesmo percurso; botões do stepper 44×44 px |
| 960×1080 | 192 | 193 | Mesmo percurso; resumo abaixo do formulário |
| 1366×768 | 194 | 195 | Mesmo percurso; rolagem vertical alcança revisão e ações |

Em cada viewport: Social 1→0 devolveu exatamente 1, novo clique não ficou negativo;
saldo 7 bloqueou avanço; Operativo Luta3/Pontaria3/Força3/Destreza2/Social0/demais1
ficou com saldo0. Aumentar Luta bloqueado no teto3. Exceder orçamento e manter Vigor6
ao trocar Lendário→Operativo exibiram violações e impediram avanço. Trocas entre
categorias preservaram Social/Luta/Pontaria zero escolhidos.

Civil Nível0 começou com Luta/Pontaria0 bloqueados e saldo2. Liberação individual,
redução a zero e retirada da exceção confirmaram saldos 3/4/3, sem liberar o outro atributo.
Ao sair de Civil com somente Pontaria liberada e zerada, Luta voltou a1 e Pontaria ficou0.
Civil válido redistribuiu Social0 em Força2/Vigor2/Intelecto2, sem Energia, sem habilidades.

Registro real pela UI retornou 201; GET conferiu atributos e recursos compartilhados.
Operativo: Vida55, Defesa13, Bloquear14, Esquivar15, Energia12; Civil: Vida16, Energia0.
Revisão e ficha mostraram Social0; recarga da página preservou zero. Editar e cancelar
Social na ficha pronta manteve zero e o snapshot, conforme o fluxo anterior.

Comparação pessoal das capturas antes/depois, erros, Civil, revisão, ficha e foco nos
quatro viewports: mesma voz visual, shell, densidade, hierarquia, espaçamento, ícones,
controles e comportamento responsivo. Primitivos com suas APIs de tamanho/variante/estilo
preservadas. Sem HTML genérico, overflow horizontal ou conteúdo inacessível; contraste
e alvos de toque mantidos. Foco de Nível (cápsula) e Social (discreto) visível, outline2px
na cor do token; corrigido e reinspecionado pessoalmente. Rodapé fixo sobre capturas de
página inteira é posição de captura; a rolagem real permitiu alcançar todos os campos.

Capturas em [p-100](p-100/atributos-validos-1920.png), séries `antes-atributos`,
`atributos-validos`, `saldo-invalido`, `teto-invalido`, `civil-liberado`, `revisao`,
`ficha-pronta` e `foco-teclado`, uma por largura. Medições sem credenciais em
[resultados.json](p-100/resultados.json).

## Limpeza e fecho

Soft delete pela API de todos os NPCs sintéticos 187–195 (inclui tentativa preliminar187),
campanha34 e conta56. GET de cada NPC/campanha confirmou404 após exclusão.
[limpeza.json](p-100/limpeza.json) registra somente ids e resultado, sem credenciais.
Helpers, logs e sessão temporários removidos; evidências preservadas. Servidores existentes
e arquivos de outras tarefas preservados. Spec para `done`, P-100 retirada de PROBLEMS,
CONTEXT/fila/dependência da m4-19 alinhados. M4-19 continua aberta, sem execução nesta task.
