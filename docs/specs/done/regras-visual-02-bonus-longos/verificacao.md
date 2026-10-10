# RV-02 — bônus longos contidos

Spec dona: [bônus longos](../regras-visual-02-bonus-longos.spec.md).
Decisão e análogo registrados antes de editar: [proposta do Chip](proposta-chip.md).

## Implementação e revisão

O autor autorizou a quebra opcional do Chip nesta conversa em 10/10/2026.
`[quebravel]` é booleano, padrão `false`; limita host e conteúdo à largura
disponível, com quebra natural, alinhamento à esquerda e fallback para palavra
longa. Preserva variante, severidade, tom e slot de ícone. Só os bônus de
subclasses/arquétipos ativam a opção (`variante="sutil" [quebravel]="true"`).
Nenhum texto, projeção de conteúdo, fórmula ou normalizador alterado nesta task;
não foi necessário teste de transformação de texto. Os dois bônus do Híbrido e
a restrição LUT/PON são integrais. Acadêmico conserva o texto autoral
`+1 em ESCOLHA ( - LUT ou PON)`, sem convertê-lo em outra regra. Um selo por bônus.

Análogos inspecionados no código e na aplicação: bônus curtos de Lutador e
painéis Bestial/Artificial. Mesmo cartão, identidade, saúde, destaque de
habilidade inicial, tipografia, borda, padding, gap e catálogo. Nenhum CSS local
reinventa o Chip. A API pequena pertence ao primitivo existente; não foi
acrescentada responsabilidade de domínio aos componentes de Regras.

Revisão do diff: comportamento optativo, tokens preservados, zero truncamento
ou restrição ocultada. Nenhum controle novo. Selos de custo/reação e demais
consumidores continuam sem quebra; na instância do painel, 487 chips fora das
áreas de bônus permaneceram sem a classe e com `white-space: nowrap`.

## Inspeção pessoal com `verify`

App real em `http://localhost:4300/regras/sistema`, navegador do Codex.
Página pública: sem necessidade de login ou cenários de banco para este recorte.

| Viewport | Página | Painel normal | Painel maximizado |
|---|---|---|---|
| 1920×1080 | aprovado | aprovado | aprovado |
| 1366×768 | aprovado | aprovado | aprovado |
| 960×1080 | aprovado | aprovado | aprovado |
| 360×800 | aprovado | aprovado, área disponível | não existe estado separado |

Os nove arquétipos foram selecionados em cada uma dessas 11 configurações:
Lutador, Mercenário, Vanguarda, Engenheiro, Assassino, Acadêmico, Paramédico,
Diplomata e Comandante (99 estados registrados). Bestial, Artificial e Híbrido
também estão incluídos nas medições de cada configuração. Limites do host/Chip
comparados à área de bônus, e `scrollWidth` interno à largura visível: nenhum
overflow encontrado. Todos os textos foram lidos no DOM dos selos visíveis.

Inspeção pessoal renderizada do Híbrido e Acadêmico em todos os viewports/estados;
Lutador mobile, Bestial desktop e Artificial mobile complementam a comparação
dos bônus curtos. Antes: Híbrido 295,20px em 225px no mobile/270px desktop.
Depois: 225px × 43px no mobile, dois selos com o texto completo; desktop com
duas colunas limita cada selo a 270px, preservando o intervalo das habilidades.
Em uma coluna larga, o selo volta naturalmente a uma linha.

Comparação visual: parte do mesmo produto, mesma densidade e hierarquia; selos
curtos preservados, os longos ganham só a altura necessária. Sem corte ou invasão
do catálogo. Identidade, habilidade inicial e listas continuam separados pelos
espaçamentos canônicos. Cores/contraste não mudaram; chips são informativos,
sem novo alvo de toque. Navegação por teclado entre abas confirmada no celular
(Acadêmico → Assassino com seta esquerda, foco no destino). Ícones, controles e
estados existentes preservados. Não houve divergência adicional deste recorte.

Evidências locais, ignoradas pelo Git, em `.artifacts/regras-visual-02-bonus-longos/`:
`antes-hibrido-360.png`, `depois-hibrido-360.png`, `pagina-<largura>-<recorte>.png`,
`painel-<largura>-<estado>-<recorte>.png`, `painel-360-{academico,hibrido}.png`,
`analogo-bestial-1920.png`, `artificial-360.png` e `matriz-bonus.json`.
As medições cobrem todos os bônus; capturas e inspeção pessoal cobrem os recortes
de texto longo e os análogos explicitados, não cada habilidade do catálogo.

## Gates e limites

- Teste antes da implementação: falhou por input `quebravel` inexistente.
- `npm run ng --workspace=frontend -- test --watch=false --include=src/app/shared/ui/chip/chip.component.spec.ts`:
  7 testes aprovados; padrão sem quebra, ativação/desativação, texto, variante,
  severidade/tom e ícone preservados. Repetido após ajuste de convenções: 7/7.
- `npm run test --workspace=frontend -- --watch=false`: 86 testes de scripts e
  3216 Angular aprovados (243 arquivos). Sem snapshots que copiam CSS.
- `npm run build --workspace=frontend`: aprovado; dois JSONs fiéis ao Markdown.
  Aviso de orçamento inicial: 594,01kB para 450kB.
- `npm run lint`: zero erros nos três workspaces; avisos existentes. Aspas das
  linhas novas e comprimento do template de teste ajustados depois; lint focado
  final sem erros, com os avisos antigos dos arquivos de Chip.
- Prettier dos dois templates e SCSS: aprovado, sem alteração adicional.
- `git diff --check`: aprovado.
- `npm run repo:verificar`: organização e espelhos aprovados no fecho.

Suítes de shared/backend já aprovadas no corte anterior (1157 e 995, com um
ignorado); sem mudança nesses workspaces ou nos contratos/regras, não repetidas.
Logs dos comandos ficam junto das evidências brutas. RV-03…10 permanecem fora
do escopo; este fecho não certifica a auditoria inteira nem o PDF.
