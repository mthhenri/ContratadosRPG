# ui-34-ficha-completa-redesenho.spec.md

> Traz pra tela de ficha completa (`FichaVisualizacao`, rota `visualizar.page.html`) os padrões já
> validados nas duas telas de campanha ajustadas (`detalhe-mestre`/`detalhe-jogador`, `ui-33` e
> rodadas anteriores): cabeçalho com índice "//" e `app-coluna-acoes` no lugar dos controles soltos
> de hoje, mais uma reorganização de layout (2 colunas 40/60, Identidade dividida em 2 sub-colunas,
> Resistências no mesmo formato visual das Reações). Validado num mockup solto (Artifact fora do
> repositório) ao longo de várias rodadas com o autor, mesmo processo do `poc-jogador.html` que
> gerou a `ui-33`; esta spec porta o resultado pro código real. Fecha também a pendência de
> `.utilitario-flutuante` → `app-coluna-acoes` para o consumidor "ficha", anotada em `DESIGN.md`
> (`ui-17`, "migram em specs futuras").
>
> **Depende de `ficha-separar-completa-e-campanha-card.spec.md` estar concluída antes de começar.**
> Até aquela spec fechar, `FichaVisualizacao` ainda é compartilhado com os 4 outros consumidores de
> campanha via `modo`; as mudanças abaixo assumem o componente já isolado, sem `@Input() modo` e
> sem nenhum consumidor além da rota de ficha completa.

## Objetivo

A tela de ficha completa não recebeu nenhum dos ajustes visuais que `detalhe-mestre`/
`detalhe-jogador` acumularam nas últimas tarefas: o cabeçalho é só um ícone de voltar solto (sem
índice, sem título, sem régua) e os controles da página (Histórico, Calculadora, Acesso de
visualização, Ocultar/Exibir, Remover da campanha, Excluir) vivem espalhados em botões flutuantes
+ um menu kebab "⋯", em vez do padrão de coluna de ações já adotado pelo mestre. Esta tarefa alinha
o *shell* da página ao padrão atual e aproveita a oportunidade para resolver um desequilíbrio de
layout encontrado na exploração: a coluna de Identidade (avatar 150px + vitalidade + reações +
resistências, tudo empilhado) ficava bem mais alta que Atributos e Status.

**Análogo aprovado**: `detalhe-mestre.page.html`/`.scss` (cabeçalho `voltar` → `//` → título →
régua, `detalhe-mestre__cabecalho-*`) e o uso de `<app-coluna-acoes>` nessa mesma página
(`detalhe-mestre.page.html:18-78`) para a estrutura de categorias/itens da coluna nova. O
empilhamento de Personalidade/Origem (`ficha-ident__meta` em coluna, não lado a lado) já é decisão
vigente de `ui-33` — não muda aqui. O mockup validado com o autor é a referência do layout novo
(2 colunas 40/60, divisão interna da Identidade, Resistências como `ficha-mini` colorido); não há
arquivo desse mockup no repositório — a spec abaixo é a fonte de verdade a partir de agora.

## Entregáveis

1. **Cabeçalho novo em `visualizar.page.html`.** Substitui `ficha-pagina__topo` (hoje só o ícone
   `voltar`) pelo padrão de `detalhe-mestre__cabecalho`: seta Voltar → índice `//` → título (nome
   da própria ficha, `fichaAtual.nome`) → chip de contexto (nome da campanha vinculada, quando
   `campanhaId()` existe; ficha avulsa sem chip) → régua → indicador de persistência
   (`fichaEdicao.estadoPersistencia()`, hoje um `<span>` solto no grupo de ações, passa a viver no
   fim da régua). Mantém as duas variantes de destino do link Voltar que já existem
   (`/campanhas/:id` vs. `/fichas`).

2. **`app-coluna-acoes` no lugar dos controles atuais.** Substitui o grupo `ficha-pagina__acoes`
   (gatilhos de `app-historico-rolagens-sidebar`/`app-calculadora-flutuante` + menu kebab "⋯") por
   `<app-coluna-acoes id="ficha-completa" rotulo="Ações da ficha">`, com 2 categorias:
   - **Ficha**: `Histórico` (abre `app-historico-rolagens-sidebar`, painel lateral de 500px — **sem
     mudança de comportamento**, só troca o gatilho visual); `Anotações` (novo, ver item 3);
     `Calculadora` (`app-calculadora-flutuante`, sem mudança); `Caderno` (**novo**, `CadernoFlutuante`
     de `modules/pagina-caderno/`, mesmo componente já usado por `detalhe-mestre`/`detalhe-jogador`
     — paridade de ferramentas entre campanha e ficha avulsa).
   - **Gestão**: `Acesso de visualização`, `Ocultar/Exibir ficha`, `Remover da campanha` (só quando
     `campanhaId() !== null`), `Excluir ficha` — mesmas 4 ações do menu kebab de hoje, cada uma
     abrindo o mesmo dialog/fluxo já existente (`dialogAcesso`, `solicitarAlteracaoVisibilidade`,
     `removerDaCampanha`, `dialogExclusao`); a única mudança é o gatilho.
   - Kebab "⋯"/`ficha-pagina__menu*` e os dois gatilhos flutuantes antigos saem do template.

3. **Anotações vira item da coluna de ações.** O bloco `ficha-status__anotacoes-caixa` (aba
   Informações) sai do template e o mesmo campo (`dados().anotacoes`,
   `editarAnotacoes()`/`confirmarAnotacoes()`/`cancelarAnotacoes()`) passa a ser exibido dentro de
   um `<app-painel-flutuante>` novo, disparado pelo item "Anotações" da coluna de ações.

4. **Layout vira 2 colunas, 40%/60%.** Hoje são 3 colunas lado a lado (Identidade | Atributos |
   Status). Passam a ser 2: a coluna esquerda (40% da largura) empilha o card Identidade sobre o
   card Atributos; a coluna direita (60%) é só o card Status. Abaixo de `bp.tablet` (1080px),
   colapsa para 1 coluna (mesma regra que já existe para a grade de 3, adaptada).

5. **Card Identidade ganha 2 sub-colunas internas.** Coluna A: avatar (150px, sem mudança de
   tamanho — já é o valor vigente desde a revisão de `ui-33`) + nome + contrato + chips de
   classe/subclasse + Personalidade/Origem (mesmo bloco `ficha-ident__meta` de hoje, só realocado
   pra cá). Coluna B, nesta ordem vertical: **Reações** (Defesa/Esquiva/Bloqueio/Contra-ataque,
   `ficha-combate-rapido` de 4 itens, sem mudança de regra) → **Vitalidade** (barras de Vida/Energia,
   `app-barra-recurso`, sem mudança) → **Resistências** (ver item 6).

6. **Resistências no mesmo formato visual das Reações.** Os 5 tipos de dano (Físico/Balístico/
   Explosão/Químico/Geral) saem do formato de chip/pill (`chip-dano`) e passam a usar o mesmo
   componente/classe que as Reações já usam para exibição (mini-card com rótulo em cima e valor
   grande embaixo) — a cor de cada tipo de dano (`--dano-fisico`, `--dano-balistico` etc., já
   tokenizadas) aplica-se ao valor numérico e a um contorno sutil da caixa (`-border`, 40%
   opacidade), preservando a identificação rápida por cor sem voltar ao formato de pill.

7. **Nível/Prestígio/Patente e Dinheiro/Salário saem da Identidade e entram na aba Informações do
   Status.** Os dois pares de mini-cards que hoje vivem em `ficha-ident__stats-topo`/
   `ficha-ident__stats-linha` passam a abrir a aba Informações (antes do glance de Combate já
   existente), num único grupo de 5 mini-cards. Sem mudança de regra ou de onde o dado vem — só de
   onde é lido na tela.

8. **Card Atributos: DT, Proficiência e Maestria numa única linha.** Os 3 viram mini-cards lado a
   lado (mesmo padrão dos itens de Combate/Resistências), substituindo o `chip-formula` solto +
   linha de 2 caixas de hoje (`ficha-atributos__prof-maestria`) — reduz uma linha de altura no topo
   do card. A grade de atributos (`ficha-atributos__grade`) ganha mais colunas por grupo (Físicos e
   Mentais viram 1 linha de ~5, não 2 linhas de ~2-3), já que a coluna de 40% dá mais largura que a
   coluna estreita de hoje; os breakpoints intermediários (notebook, tablet) são ponto de partida a
   calibrar ao vivo no gate visual — não um valor final travado.

## Critérios de Aceite

1. Testes focados de `visualizar.page`/`ficha-visualizacao` cobrem: os 4 gatilhos novos da coluna
   de ações (Histórico/Anotações/Calculadora/Caderno) abrindo o painel certo; as 4 ações de Gestão
   preservando o fluxo/dialog atual; Anotações ausente da aba Informações (sempre, agora que é
   painel flutuante); Nível/Prestígio/Patente/Dinheiro/Salário fora da Identidade e dentro de
   Informações. Suíte completa do `frontend` passa.
2. Verificação ao vivo (Postgres + backend + frontend reais) nos 4 viewports padrão do projeto —
   `1920×1080`, `960×1080`, `1366×768`, `360×800` — cobrindo: as 2 colunas (40/60) e o colapso pra 1
   coluna abaixo de `bp.tablet`; a coluna de ações expandida/retraída e, no mobile, a barra inferior;
   os 4 itens de Ficha abrindo (Histórico como painel lateral, os outros 3 como painel flutuante,
   sem colidir entre si); a divisão interna da Identidade (2 sub-colunas, com fallback empilhado
   nos viewports estreitos); a grade de Atributos sem overflow em nenhum dos 4 viewports.
3. Comparação visual explícita contra o análogo (`detalhe-mestre`) confirma: mesmo padrão de
   cabeçalho (índice, tipografia, régua), mesma identidade da coluna de ações (56px/200px,
   categorias, tooltip customizado — nunca `title` nativo, conforme convenção do projeto).
4. Nenhum dos 4 viewports tem rolagem horizontal; alvos de toque no mobile mantêm `bp.$alvo-toque`
   (44px), inclusive os novos itens da coluna de ações na barra inferior.

## Fora de Escopo

- `FichaCampanhaCard` (o componente que nasce da separação prévia) — este redesenho é exclusivo da
  ficha completa; qualquer ganho visual que fizer sentido levar pra lá é tarefa própria, a decidir
  depois.
- Reconstruir o conteúdo de Inventário, Habilidades, Rolagens, Extras ou História — continuam
  exatamente como estão hoje dentro da aba correspondente.
- Mudar regra, cálculo ou origem de qualquer dado (Vida/Energia, Resistências, Nível, Prestígio,
  Dinheiro, Salário, DT, Proficiência, Maestria) — só reposicionamento e reformatação visual.
- Ficha de criatura (`CriaturaVisualizacao`) — fora desta frente por completo.
- Persistir estado de aberto/fechado dos novos painéis flutuantes (Anotações/Caderno) entre sessões
  — segue o mesmo padrão que `CalculadoraFlutuante`/`HistoricoRolagensSidebar` já usam hoje nesta
  página, sem inventar contrato novo.

## Dependências

- **`ficha-separar-completa-e-campanha-card.spec.md`** concluída — `FichaVisualizacao` precisa
  estar isolado (sem `modo`, sem os 4 outros consumidores) antes desta spec começar.
- `docs/design/DESIGN.md` (seção "Painel flutuante, modal e painel lateral", `ui-17`) e
  `docs/design/tema/_componentes.scss` (`.abas`, `.cartao`) para tokens e convenções de shell.
- `frontend/src/app/shared/ui/coluna-acoes/` (`app-coluna-acoes`, `app-coluna-acoes-item`) e
  `frontend/src/app/shared/ui/painel-flutuante/` (`app-painel-flutuante`) — primitivos já em uso,
  sem mudança de contrato.
- `frontend/src/app/modules/pagina-caderno/caderno-flutuante.component.ts` — componente já
  existente, só ganha um novo consumidor.
- `detalhe-mestre.page.html:18-104` como base de estrutura a replicar (cabeçalho + coluna de
  ações), não a reescrever do zero.
- `ficha-visualizacao.component.html`/`.scss` já isolado (pós-separação) como base a reorganizar —
  os blocos de Identidade/Atributos/Status mudam de arquivo/linha depois daquela spec; conferir a
  estrutura atual antes de editar, não os números de linha citados na versão pré-separação.

## Riscos e Mitigação

- A proporção 40/60 e a grade de Atributos em mais colunas foram heurísticas no mockup, nunca
  verificadas contra o app real rodando com Postgres — tratar como ponto de partida e recalibrar
  ao vivo nos 4 viewports, especialmente `1366×768` (a coluna de 40% fica bem mais estreita que nos
  outros dois desktops) e `960×1080` (tela dividida, um dos casos de uso reais do produto).
- Mover Histórico/Calculadora/Caderno/Anotações pra dentro de `app-coluna-acoes` muda o ponto de
  entrada de cada um; confirmar que nenhum outro lugar do app (ex.: um link direto ou atalho de
  teclado) dependia do gatilho antigo antes de removê-lo do template.
- `Caderno` é consumidor novo de `CadernoFlutuante` nesta página — nascer com
  `[mostrarGatilho]="false"` (mesmo padrão de `detalhe-mestre`/`detalhe-jogador`) e conferir que o
  z-index/posição inicial não colide com Calculadora/Anotações quando mais de um está aberto ao
  mesmo tempo.
- Começar esta spec antes da separação estar de fato concluída reintroduz o risco que a separação
  existe pra eliminar (vazar ajuste pro que os outros 4 consumidores usam) — confirmar o fechamento
  da spec de separação antes de abrir esta.
