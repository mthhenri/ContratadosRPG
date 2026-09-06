# p-058-ficha-flutuante-painel-flutuante.spec.md

> Spec avulsa. Corrige `PROBLEMS.md` `P-058` (`ABERTO` · frontend/design system) — decisão do
> autor tomada em 2026-09-06: migrar, aceitando que a posição da janela passe a persistir entre
> reloads (`localStorage`), igual aos demais três consumidores de `app-painel-flutuante`.

## Objetivo

Migrar `modules/encontro/componentes/ficha-flutuante` para hospedar seu conteúdo dentro de
`shared/ui/painel-flutuante` (`app-painel-flutuante`, `ui-17`), removendo a reimplementação manual
de arraste, posição, empilhamento de z-index, minimizar e fechar — seguindo a mesma receita já
usada por `leitor-documentos` e `caderno-flutuante`.

## Entregáveis

1. `ficha-flutuante.component.html`: trocar `<section #janela>` por
   `<app-painel-flutuante #painel="appPainelFlutuante" id="ficha-flutuante" titulo="Ficha do combatente" [aberto]="aberto()" [mobile]="ehMobile()" [maximizada]="maximizada()" [largura]="ehMobile() ? null : geometria().largura" [altura]="ehMobile() ? null : geometria().altura" (fechar)="fechar()" (minimizadoChange)="...">`,
   no molde exato de `leitor-documentos.component.html`. Botão de maximizar vai para o slot
   `[painelAcoesExtras]`; a alça de redimensionar vai para `[painelRedimensionar]`; o corpo
   (`<app-ficha-flutuante-conteudo>`) vira conteúdo projetado padrão. O gatilho de reabertura
   (`ficha-flutuante__gatilho`) continua fora do painel, chamando `painelRef()?.restaurar()` —
   mesmo padrão dos outros três consumidores.
2. `ficha-flutuante.component.ts`: remover `arrastando`/`origemArraste`/`iniciarArraste` e o `x`/`y`
   de `geometria` como estado de posição (isso passa a ser do primitivo); manter só
   `largura`/`altura` de `geometria` para o redimensionamento por arraste, que continua do
   consumidor (mesmo padrão de `LeitorDocumentos.iniciarRedimensionamento`/`aoMoverPonteiro`).
   Remover os listeners de `window:pointermove`/`pointerup`/`pointercancel` relacionados só a
   arraste de posição (os de redimensionamento continuam). Remover `aoTecladoJanela`/`Escape`
   manual (o primitivo já fecha com `Escape` e prende o foco — ganho, não regressão).
3. Posição inicial diferenciada para o mestre (`GEOMETRIA_INICIAL_FICHA_FLUTUANTE_MESTRE`, hoje
   aplicada toda vez que `abrir()` é chamado a partir de fechado): como `app-painel-flutuante` só
   consome `[posicaoInicial]` uma vez (primeira carga, antes de existir estado persistido), replicar
   o comportamento "mestre abre mais largo" chamando `painelRef()?.moverPara({x, y}, {persistir: false})`
   dentro de `abrir()` quando as mesmas condições de hoje (`!aberto() && ehMestre() && !ehMobile()`)
   se aplicarem — mesmo padrão que `LeitorDocumentos.alternarMaximizacao()` já usa para reposicionar
   via comando externo. `largura`/`altura` continuam sendo setados no `geometria` local como hoje.
4. `ficha-flutuante.component.scss`: remover as regras de moldura que passam a ser do primitivo
   (`&__janela` de superfície/borda/sombra/posição fixa, `&__cabecalho` de fundo/borda, `h2`,
   `&__marca`, `&__regua`, `&__acoes-janela`) — manter só o que é específico do conteúdo
   (`&__corpo`, `&__redimensionar`, `&__gatilho`), no molde de `leitor-documentos.component.scss`.
5. Persistência de posição: aceitar que `id="ficha-flutuante"` faça a posição (e o estado
   minimizado) sobreviver a reload, como decidido pelo autor — nenhum código extra necessário além
   de passar o `[id]` fixo.
6. Atualizar o comentário de classe de `FichaFlutuante` (linha ~24-31, hoje descreve arraste manual
   "mesma mecânica do leitor-documentos" sem citar o primitivo) para apontar para
   `app-painel-flutuante` como a implementação real, e remover o comentário-débito de
   `ficha-flutuante.component.scss` linhas 113-115 (que já cita este `P-058`).

## Critérios de Aceite

- `npm run test --workspace=frontend -- --include=**/ficha-flutuante/**` verde.
- `npm run test --workspace=frontend`, `npm run lint --workspace=frontend` e
  `npm run build --workspace=frontend` continuam verdes.
- **Gate visual obrigatório** (skill `verify`, dois usuários — mestre e jogador —, `1920×1080` e
  `360×800`, tela de Encontro): abrir a ficha de um combatente, arrastar, redimensionar, minimizar,
  restaurar, maximizar, restaurar tamanho, fechar; abrir como mestre e confirmar que nasce mais
  larga (`GEOMETRIA_INICIAL_FICHA_FLUTUANTE_MESTRE`); confirmar `Tab`/`Shift+Tab` presos dentro da
  janela e `Escape` fechando; recarregar a página com a janela aberta em uma posição não-padrão e
  confirmar que ela reabre na mesma posição (comportamento novo, aceito pelo autor); abrir junto
  com o Caderno/Leitor de Documentos e confirmar empilhamento de z-index correto ao focar cada um.
- Comparar a moldura (cabeçalho, botões, sombra, raio) com `leitor-documentos`/`caderno-flutuante`
  renderizados ao lado — devem ser visualmente idênticos (mesmo primitivo).
- `PROBLEMS.md` `P-058` sai da lista de Ativos; `HISTORY.md` ganha o bloco desta task no topo.

## Fora de Escopo

- Mudar `app-painel-flutuante` (`shared/ui/painel-flutuante`) — a migração não exige estender o
  primitivo (investigação prévia confirmou: nenhum bloqueio técnico).
- Redimensionar por arraste e maximizar continuam de responsabilidade do consumidor — isso já é a
  arquitetura de `app-painel-flutuante` (fora de escopo dele por decisão da `ui-17`), não uma
  lacuna desta task.
- Qualquer mudança em `FichaFlutuanteConteudo` (o que a ficha mostra por dentro) — só a moldura
  externa muda.

## Dependências

Nenhuma. `app-painel-flutuante` já existe e está em produção com 3 consumidores.
