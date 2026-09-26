# m7-24-frontend-painel-cena-sem-iniciativa.spec.md

> Quarta task do milestone `m7-cenas.spec.md` — frontend. Troca o placeholder que a `m7-23` deixou
> no `PainelCenaShell` por um painel de verdade para as cenas **sem iniciativa**
> (`cenaTemIniciativa(tipo) === false`: Resistência e Investigação), nas visões do mestre e do
> jogador. É a base que a `m7-25` amplia com a coluna de Documentos da Investigação.

## Objetivo

Uma cena de Resistência ou de Investigação aberta mostra ao mestre o cabeçalho da cena, a grade de
cards dos agentes da campanha, as Rolagens e as ações de abrir/encerrar a cena. Ao jogador ela
mostra a mesma casca com a própria ficha no palco. Nada disso tem trilha de turnos: sem iniciativa,
a cena não tem ordem de ação.

## Estado atual (depois da `m7-23`)

- `PainelCenaShell` (`frontend/src/app/modules/cena/paginas/painel/painel-cena-shell.page.*`)
  bifurca por `cenaTemIniciativa`. Com `false`, mostra `.painel-cena__pendente`, um
  `app-estado-vazio` que diz "ainda não está disponível" e oferece o voltar ao hub. **É isso que
  esta task substitui.**
- `EncontroPainelDadosService` (`modules/encontro/paginas/painel/`, provido pela casca) já carrega
  tudo o que este painel consome e já assina o socket da campanha:
  - a cena da rota: `cena()`, com `encontro()` = `null` para esses tipos;
  - `cenaPlanejada()`;
  - `fichasCampanha()`, `membros()`/`ehMestre()`/`visaoDoMestre()`;
  - `rolagensFeed()`/`carregandoRolagens()`, `campanhaNome()`;
  - o socket `cena:alterada` e o `topbar`.
- Os cards do Esquadrão da visão do mestre, `app-espectador-ficha-card`
  (`modules/campanha/componentes/espectador-ficha-card/`), são alimentados por funções puras de
  `modules/campanha/campanha-equipe.util.ts` (`ordenarMembros`, `agruparFichasPorMembro`) a partir
  de `FichaResumoDto[]` + membros — o mesmo dado que o serviço acima já tem.
- A ficha ao vivo no Esquadrão vem das salas `ficha:<id>` + `ficha:alterada`
  (`CampanhaDetalheDadosService.sincronizarSalasFicha`). O `EncontroPainelDadosService` não faz
  isso hoje: ele carrega as fichas uma vez.
- Casca visual: parcial `modules/encontro/paginas/_casca-iniciativa.scss` (mixin `casca`). Análogos
  aprovados: `PainelEncontroMestre` (`ui-37`) e `PainelEncontroJogador` (`ui-39`),
  `docs/design/DESIGN.md` ("Iniciativa — visão do mestre"/"visão do jogador"). Quem inclui o mixin
  herda os elementos dele (`__linha`, `__trilha`, `__palco`…) — não reutilizar esses nomes para
  outra coisa (armadilha registrada na `m7-23`).
- Endpoints prontos (`m7-22`): `POST cena/:id/abrir`, `POST cena/:id/encerrar`
  (`CenaService` do frontend). `GET cena/:id` devolve `encontro: null` para esses tipos. **Nenhum
  backend novo é necessário.**

## Entregáveis

1. **`PainelCenaSemIniciativaMestre`** (`modules/cena/paginas/painel-sem-iniciativa-mestre/`),
   usando a casca `casca` com bloco BEM próprio. O composto em 1920px é
   **coluna de ações | Rolagens | palco**; não há coluna de trilha.
   - **Coluna de ações** (`app-coluna-acoes`, mesmos padrões da `ui-37`):
     - categoria "Cena": "Abrir cena" só com a cena `PLANEJADA`; "Encerrar cena" só com a cena `ATIVA`;
     - categoria "Ferramentas": Calculadora e Caderno, com os mesmos componentes e o mesmo `alternar()` do `PainelEncontroMestre`.
   - **Cabeçalho**, na receita da casca:
     - voltar ao hub (`/campanhas/:id/cenas`), `//`, título "`{Tipo} · {nome}`" (rótulos de `rotulos-cena.ts`) e o nome da campanha;
     - o `app-chip` do status da cena (`rotuloStatusCena`);
     - o selo "Cena planejada" (`app-chip severidade="aviso"`) quando `PLANEJADA`, como no painel de Iniciativa.
   - **Rolagens**: `app-historico-rolagens-sidebar [fixo]`, igual à coluna fixa da `ui-37`, inclusive a regra de sumir quando a janela externa de histórico está aberta.
   - **Palco**: seção "Agentes" com a grade de `app-espectador-ficha-card` das fichas de jogador da campanha, na ordem dos membros e com a "última rolagem" derivada do feed, como o Esquadrão do `detalhe-mestre`.
     - Clicar num card abre a `app-ficha-flutuante`, como no painel de Iniciativa.
     - Criaturas/NPCs não entram na grade.
     - Sem fichas: `app-estado-vazio` compacto.
   - **Abrir/Encerrar**: `ConfirmacaoService` e depois `CenaService.abrirCena`/`encerrarCena`, trocando o estado pelo `definirCena` do serviço de dados, no mesmo padrão do "Abrir cena"/"Encerrar combate" do `PainelEncontroMestre`.
   - Cena `ENCERRADA` é só leitura: some a categoria "Cena" e os controles de escrita.
2. **`PainelCenaSemIniciativaJogador`** (`modules/cena/paginas/painel-sem-iniciativa-jogador/`),
   com a composição da `ui-39` sem trilha:
   - coluna de ações só com as ferramentas que o `PainelEncontroJogador` oferece;
   - Rolagens;
   - palco com a **própria ficha**, pelo mesmo `app-ficha-campanha-card` do `PainelEncontroJogador`, com os mesmos inputs e comportamento;
   - cabeçalho com voltar ao hub, título e status.
   - O jogador sem ficha na campanha vê um `app-estado-vazio` no palco.
3. **`PainelCenaShell`**: o ramo sem iniciativa deixa de mostrar o placeholder e passa a bifurcar
   por papel, como já faz o ramo com iniciativa (`visaoDoMestre` → mestre; senão → jogador). O
   placeholder e o SCSS dele saem.
4. **Fichas ao vivo na grade.** O painel acompanha `ficha:alterada` das fichas que mostra, pelo
   mesmo mecanismo do Esquadrão (entrar/sair das salas `ficha:<id>` do conjunto exibido e aplicar o
   resumo alterado). Se isso entrar no `EncontroPainelDadosService`, fica **só no ramo sem
   iniciativa**: o painel de Iniciativa segue sem assinar salas de ficha a mais, sem mudança de
   comportamento. Se for extraído um helper compartilhado com `CampanhaDetalheDadosService`, ele
   vive em `modules/campanha/` e a extração é registrada no fecho.
5. **Investigação usa este painel até a `m7-25`.** O painel vale para os dois tipos sem iniciativa
   (decisão #9 do milestone: Resistência é o painel de Investigação sem a coluna de Documentos). A
   `m7-25` acrescenta a coluna de Documentos só para `INVESTIGACAO`, sem trocar de componente.
6. **Testes** (Vitest, molde dos specs do painel de Iniciativa):
   - mestre: composição sem trilha, grade de agentes, abrir/encerrar com confirmação e com cancelamento, estado encerrado só leitura, selo de planejada;
   - jogador: a própria ficha no palco, sem controles de cena;
   - casca: Resistência e Investigação montam o painel certo por papel, e Combate/Furtiva/Perseguição continuam montando o de Iniciativa;
   - fichas ao vivo: `ficha:alterada` de uma ficha exibida atualiza o card, e a de uma ficha fora da grade é ignorada.

## Critérios de Aceite

- Uma cena de Resistência ativa mostra ao mestre cabeçalho, grade de agentes e Rolagens, sem trilha
  de turnos nem coluna de documentos (critério do milestone).
- O mestre encerra a cena pelo painel e a jogadora, em outra aba, vê o status mudar ao vivo. A cena
  aparece nas encerradas do hub.
- Numa cena planejada, "Abrir cena" confirma, abre e a jogadora passa a vê-la no hub. Antes disso
  ela não consegue abri-la: o 403 da `m7-22` a devolve ao hub.
- A vida de um agente alterada na ficha (outra aba) aparece no card do painel sem recarregar.
- Combate, Furtiva e Perseguição continuam no painel de Iniciativa sem nenhuma diferença.
- `npm run test --workspace=frontend` verde, lint sem erros.
- Verificação pela skill `verify` em `1920×1080` e `360×800`, pelo menos:
  - mestre e jogadora numa Resistência ativa;
  - uma Investigação planejada, aberta e encerrada;
  - um card atualizando ao vivo;
  - regressão visual do painel de Combate.

## Fora de Escopo

- **Mecânica da cena de Resistência** (`docs/core/sistema-v4.1.0.md`, "⬥ Resistência"): Atributo
  Principal, DT inicial móvel, Limiar de sucessos/fracassos, "três falhas removem um sucesso", "um
  crítico remove um fracasso". A task só dá a casca. Registrar como ideia em
  `docs/context/IDEAS.md` ao fechar, no mesmo tratamento que a decisão #10 do milestone deu a
  Furtiva e Perseguição.
- **Coluna de Documentos, "apresentar documento"** e tudo o que depende da M9 — `m7-25`.
- **Espectador numa cena sem iniciativa.** A Iniciativa do espectador
  (`campanhas/:id/espectador/iniciativa`) só conhece o encontro da cena ativa. O que o espectador
  vê numa cena sem iniciativa é um ponto em aberto do milestone ("Visão do Espectador"), a decidir
  antes da `m7-25`.
- **Criaturas/NPCs na grade** e qualquer lista de participantes própria da cena. O milestone fixa
  "os mesmos cards do Esquadrão, sem lista de participantes própria da cena".
- **Renomear `EncontroPainelDadosService`**, que agora serve as cenas dos dois ramos. Se o nome
  incomodar, registrar como ideia; renomear não é desta task.
- **Passe responsivo fino** — `m7-26`. A tela precisa funcionar em 360px (sem overflow, alvos ≥
  44px), mas o polimento é de lá.
- Qualquer mudança em `PainelEncontroMestre`/`PainelEncontroJogador` e no backend.

## Dependências

- `m7-23` (`docs/specs/done/m7-23-frontend-hub-cenas.spec.md`): hub, `PainelCenaShell`,
  `CenaService` do frontend, `rotulos-cena.ts`.
- `m7-22` (endpoints de abrir/encerrar, `cena:alterada`, trava anti-vazamento).
- `docs/design/DESIGN.md` ("Iniciativa — visão do mestre"/"visão do jogador") e os componentes
  análogos citados em "Estado atual".

## Riscos e Mitigação

- **Assinar salas de ficha no painel de Iniciativa por engano**, e com isso mudar o tráfego ou o
  comportamento de um painel já aprovado. Mitigação: condicionar ao ramo sem iniciativa (entregável
  4) e ter um teste que prova que o painel de Iniciativa não entra em salas `ficha:<id>`.
- **Duplicar a receita do Esquadrão.** Mitigação: reusar `app-espectador-ficha-card` e as funções
  de `campanha-equipe.util.ts`; nada de card novo.
- **Colisão de nomes com o mixin `casca`** (achado da `m7-23`). Mitigação: bloco BEM próprio e
  nenhum elemento com nome já usado pelo mixin.
