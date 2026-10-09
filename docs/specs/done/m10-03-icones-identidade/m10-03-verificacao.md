# M10-03 — Ícones de identidade: verificação

Data: 2026-10-08. [Spec](../m10-03-icones-identidade.spec.md).

## Recorte entregue

17 nomes em `IconeNome` e seus desenhos no template de `app-icone`: Combatente,
Especialista, Suporte; nove arquétipos; Bestial, Artificial e Híbrido; Civil e NPC.
Fonte conferida: `docs/specs/done/m10-regras/m10-regras-exemplao.html`, `ICO[nome].op[dec]`,
sem consultar escolhas locais em `localStorage`. A lista da spec tem 18 identidades,
mas exclui expressamente `criatura` até o SVG SCP da M10-04: nenhuma forma provisória
foi acrescentada. Recursos Vida/Energia/Defesa e refino I-050 permanecem fora do recorte.

Mantidos `viewBox` 24, contorno sem preenchimento, `currentColor`, traço 1.75, pontas
e junções arredondadas, escala 1.15em e `aria-hidden`. Exceção de desenho da própria
fonte: o ponto central da mira conserva `fill="currentColor"`. Adaga conserva seu
grupo `rotate(45 12 12)`. Nenhum glifo antigo ou consumidor foi substituído; SCSS e
API de inputs permanecem iguais. Família e uso previsto documentados em `DESIGN.md`.

## Testes e build

| Comando | Resultado |
|---|---|
| `npx ng test --watch=false --include=src/app/shared/icone/icone.component.spec.ts` (frontend) | 27/27; 18 testes novos |
| `npm run test --workspaces --if-present` | Shared: 69 arquivos, 1.157 testes aprovados. Backend: 53 arquivos, 994 aprovados + 1 skipped. Frontend interrompido nos testes dos livros: 34 aprovados, 6 falhas preexistentes ao recorte, detalhadas abaixo |
| `npx ng test --watch=false` (frontend, versão final) | 215 arquivos, 3.071 testes aprovados; inclui os 27 do componente |
| `npm run lint` | Zero erros; 27.102 avisos na primeira rodada. Único aviso introduzido era uma aspa simples no teste e foi corrigido; ESLint focado final aprovado, sem avisos nas linhas novas |
| `npx prettier --write frontend/src/app/shared/icone/icone.component.html` | Template formatado; sem alterações nos casos existentes |
| `npm run build --workspace=frontend` | Interrompido no prebuild pelo PDF v4.1.3 ausente (P-105) |
| `npx ng build` (frontend, produção) | Aprovado com `CI=true`, `NG_BUILD_MAX_WORKERS=2` (contorno P-104); bundle inicial 560,55 kB, aviso do budget de 450 kB, abaixo do máximo de 1 MB |
| `git diff --check` | Aprovado |

O ciclo de teste confirmou primeiro 18 falhas novas e os nove testes antigos verdes,
por ausência dos desenhos. Após implementar, 27 passaram. Os novos testes comparam
a árvore SVG inteira com os desenhos aprovados, incluindo atributos das formas,
transformação e preenchimento, e distinguem os 17 glifos entre si e de seis vizinhos
do catálogo atual. A assinatura antiga passou a incluir formas dentro de grupos
para cobrir a adaga; os testes anteriores continuam aprovados.

O sandbox reproduziu EPERM de rename/realpath do Vite, inclusive em `test-setup.ts`.
Gates Angular reexecutados fora do sandbox. A suíte ampla conserva mensagens de
jsdom sobre canvas sem implementação; não houve falhas Angular. Não se alteraram
configurações, dependências, cache de outro processo nem budgets.

## Comparação visual na aplicação real

Skill `verify` aplicada com Angular real em `127.0.0.1:4300`; o recorte é público,
sem dependência de banco/API. Para observar nomes que ainda não têm consumidor, foi
montada uma composição Angular temporária com os próprios `Icone`, `Cartao` e
`TemaService`, sobre estilos globais reais. Cada linha mostrou o novo ícone e um
vizinho existente em três pares: **14px, 16px, 24px**, medidos pelo retângulo SVG.
Não se usou HTML estático como substituto do componente. A entrada original foi
restaurada byte a byte e a composição removida antes dos gates finais; não há rota,
galeria, controle ou consumidor novo na entrega.

**Análogo registrado antes de editar:** `app-icone` atual, em especial `agente`,
`dt`, `corpo-a-corpo`, `protecoes`, `patente` e `documentos`; desenhos decididos do
exemplão são o oráculo das novas formas. Casca de comparação: `app-cartao`, IBM Plex,
superfície/borda/raio e espaços canônicos. A densidade dos ícones continua sendo
definida pelo consumidor via fonte; não se introduziu shell ou espaçamento próprio
no primitivo.

| Viewport | Escuro | Claro |
|---|---|---|
| 1920×1080 | [Captura](../../../../.artifacts/m10-03/escuro-1920x1080.png) | [Captura](../../../../.artifacts/m10-03/claro-1920x1080.png) |
| 360×800 | [Captura](../../../../.artifacts/m10-03/escuro-360x800.png) | [Captura](../../../../.artifacts/m10-03/claro-360x800.png) |
| 960×1080 | [Captura](../../../../.artifacts/m10-03/escuro-960x1080.png) | [Captura](../../../../.artifacts/m10-03/claro-960x1080.png) |
| 1366×768 | [Captura](../../../../.artifacts/m10-03/escuro-1366x768.png) | [Captura](../../../../.artifacts/m10-03/claro-1366x768.png) |

[Detalhe escuro](../../../../.artifacts/m10-03/escuro-detalhe.png), [detalhe claro](../../../../.artifacts/m10-03/claro-detalhe.png),
[medidas dos oito cenários](../../../../.artifacts/m10-03/medidas.json).

O agente principal inspecionou pessoalmente os oito cenários. Resultado: mesma
família, traço e peso visual dos vizinhos; mesma densidade, hierarquia e contraste
nas bases clara/escura; sem aparência de controle genérico, corte ou overflow.
Em cada cenário: 17 linhas, 102 SVGs, dimensões confirmadas com tolerância de 0,1px,
traço 1.75, cor herdada igual nos pares, zero erros de página. Estados aplicáveis
são as três dimensões e duas bases; esses ícones são decorativos, sem interação,
foco ou alvo de toque próprio. Não há estado de carga/erro/desabilitado novo.

Não houve divergência visual que exigisse corrigir a geometria aprovada. A possível
semelhança entre Suporte e Paramédico, as espadas pequenas e a silhueta Civil ficam
sob I-050, conforme o fora de escopo explícito da spec.

## Revisão e limites

Diff lido integralmente com `convencoes-check`: catálogo, template, testes e docs.
Os casos antigos e a regra de tamanho/cor não foram alterados. Valores numéricos
nos SVGs são geometria da referência, não hardcodes de tema. Não há regra de domínio,
DTO, service, SQL, dependência ou permissão nova. O componente já é extenso, mas os
casos apenas ampliam sua responsabilidade existente de selecionar um glifo;
extração/refatoração não se justifica neste recorte e aumentaria o risco de regressão.

**Pendência externa, P-105:** a troca de livro já estava no workspace no começo da
sessão e foi versionada separadamente em `e3da359d`. O prebuild e vários testes
continuam lendo `sistema-v4.1.3.md/pdf`; cinco falhas são ausência do Markdown/carga
do módulo de teste, e a sexta exige a versão/linha antiga no aviso de publicação.
Não se corrigiram esses scripts na task de ícones, nem se restauraram os livros.

O build Angular e as suítes da aplicação verificam o código desta task. O preparo
e a publicação dos livros em checkout limpo **permanecem abertos**, assim como os
testes do normalizador na cadeia npm, registrados em `PROBLEMS.md`; não se afirma
que `npm run build` ou a cadeia completa `npm run test` passaram.


> Organização em 2026-10-08: capturas e saídas brutas citadas neste registro
> são evidências locais em `.artifacts/`, não distribuídas no clone. A migração
> preserva os resultados e limites originais e não executa novamente os gates.
