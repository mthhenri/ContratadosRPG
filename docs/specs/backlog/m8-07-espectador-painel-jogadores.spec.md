# m8-07-espectador-painel-jogadores.spec.md

> Task 7/7 do módulo `m8-espectadores-campanha.spec.md` — entra depois do fechamento original
> (`m8-01`…`m8-06`), como revisão pontual de uma decisão de produto já fechada, pedida
> explicitamente pelo autor.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md`. Os análogos aprovados são
> `.detalhe__ficha-card` (grade "Esquadrão" da visão de mestre, em `detalhe.page.html`/`.scss`)
> para o cartão de ficha, e `HistoricoRolagensSidebar` para a coluna de histórico sempre aberta
> (mesma composição, sem o toggle/overlay da versão original — aqui ela fica fixa). Direção
> validada num POC fora do repositório antes desta spec: grade de 2 colunas de cartões à esquerda,
> histórico sempre aberto à direita, avatar quadrado **128×128**.

## Objetivo

Reformular a visão de espectador para, além do histórico de rolagens sempre aberto, mostrar uma
grade com o painel de jogadores da campanha: um cartão resumido por agente não oculto, com
foto/cor de identidade, dono, classe/arquétipo, Vida/Energia, defesas e a última rolagem feita.

Esta task reverte **parte** da decisão de produto #4 do módulo ("Nunca vê... fichas...") e o
entregável #3 de `m8-03-frontend-painel-visualizador.spec.md` ("Não há cards de ficha... no
painel do espectador"). As demais partes dessas decisões continuam de pé — ver "Continua valendo"
abaixo.

## Continua valendo (não reabrir)

- Espectador nunca vê rolagem `PRIVADA`, caderno, inventário, convites, gestão de membros, tela de
  criação/edição de campanha ou qualquer controle de rolagem/condução.
- Espectador nunca abre a ficha completa (identidade, personalidade, itens, amplificadores) — só o
  resumo read-only descrito abaixo, no mesmo recorte que `FichaResumoDto` já expõe em outras
  listagens.
- Ficha `oculta` nunca aparece para o espectador — diferente do mestre (vê tudo) e do jogador (vê a
  própria mesmo oculta), o espectador não tem vínculo de posse que justifique uma exceção.
- Mestre em modo prévia continua recebendo exatamente o mesmo payload que um espectador real.

## Contexto de design (já decidido, não reabrir)

- Cartão de ficha, de cima para baixo: quadrado de foto **128×128** com a cor de identidade
  (`--cor-ficha`) no mesmo padrão hachurado do Esquadrão → nome do player → nome do agente →
  classe - arquétipo → Vida - Energia (barra) → Defesa - Esquiva - Bloqueio - Contra-ataque →
  faixa "Última rolagem" com fundo neutro `var(--surface-2)` (não a cor da ficha) e um risco de
  identidade (`box-shadow: inset 2px 0 0 var(--cor-ficha, ...)`), mesma receita do item do
  histórico — o número/rótulo da rolagem fica colorido pela cor da ficha, não o fundo.
- Layout: duas colunas. Esquerda = grade de 2 colunas com os cartões de ficha. Direita =
  histórico, largura fixa do token `--largura-painel-lateral` já usado pelo sidebar.
- v2 explicitamente fora de escopo: nível/patente, condições/status de efeito, e qualquer dado
  além do listado acima.

## Entregáveis

### Backend

1. `CampanhaPainelEspectadorDto` ganha `fichas: readonly FichaResumoDto[]` e
   `membros: readonly CampanhaMembroResumoDto[]`, no mesmo padrão que `CampanhaPreviaJogadorDto`
   já usa para montar a coluna "Equipe" da prévia de jogador (`m8-04`) — reaproveitar a mesma
   consulta/composição do `CampanhaRepository`/`FichaService`, sem duplicar a query.
2. O recorte de fichas exclui toda ficha `oculta`, sem exceção (ver "Continua valendo").
3. `membros` existe só para resolver o nome do dono (`CampanhaMembroResumoDto.nome`) casando por
   `usuarioId` com cada ficha — não precisa (nem deve) virar uma tela de gestão de membros.
4. `CampanhaPainelEspectadorRecuperarDto` e a rota HTTP não mudam de forma; o novo campo entra no
   mesmo payload já paginado por rolagens.

### Frontend

5. Novo componente de cartão de ficha do espectador segue o cartão de referência acima; usa os
   primitivos existentes de `shared/ui` (`app-barra-recurso` para Vida/Energia etc.) — nunca HTML
   cru estilizado à mão.
6. `espectador.page.html`/`.ts`/`.scss` passam a compor duas colunas: a grade de fichas (novo
   componente) e o histórico atual, agora sempre visível, sem qualquer affordance de abrir/fechar.
7. "Última rolagem" de cada ficha é derivada no cliente a partir do mesmo feed paginado
   `rolagens` já carregado (primeira ocorrência daquele autor/ficha — o feed já vem
   mais-recente-primeiro), não uma nova consulta dedicada. Uma ficha cuja última rolagem pública
   estiver fora da página já carregada mostra "Nenhuma rolagem carregada ainda", nunca "nunca
   rolou".
8. Estados vazio/carregando cobrem também a grade de fichas (campanha sem nenhum agente visível
   ao espectador).
9. Testes de service/página cobrem: ficha oculta nunca aparece; nome do dono resolvido
   corretamente por `usuarioId`; ausência de "última rolagem" quando nenhuma rolagem daquela ficha
   está na página carregada; mestre em prévia recebe o mesmo recorte que o espectador real.

## Critérios de Aceite

- Espectador real e mestre em prévia veem exatamente o mesmo recorte de fichas (nunca uma ficha
  oculta), preservando a paridade de payload já garantida para o restante do painel.
- Em execução real, a tela é comparada a `.detalhe__ficha-card` e `HistoricoRolagensSidebar` em
  `1920×1080` e `360×800`: mesma densidade/hierarquia, sem overflow, sem nenhum controle de mestre
  vazando (edição, receber dano, gestão de membros etc. continuam ausentes).
- Testes, lint e build de `shared`, `backend` e `frontend` passam.

## Fora de Escopo

- Nível/Patente, condições/status de efeito ou qualquer dado de "v2" citado no contexto de design.
- Qualquer controle de rolagem, edição ou ação de mestre dentro do painel do espectador — a tela
  continua somente leitura.
- Abrir a ficha completa a partir do cartão (mesmo em prévia de mestre).
- Mudar a visão de Iniciativa/Encontro (`m8-05`) ou a prévia de jogador (`m8-04`).
- Nova consulta dedicada de "última rolagem por ficha" no backend — fica para iteração futura se a
  derivação client-side (entregável 7) se mostrar insuficiente em campanhas com histórico longo.

## Dependências

- `m8-03-frontend-painel-visualizador` (painel do espectador que esta task estende).
- `m8-04-preview-jogador-fidedigno` (padrão `fichas`/`membros` reaproveitado aqui).
- `docs/design/DESIGN.md`, `.detalhe__ficha-card` (`detalhe.page.html`/`.scss`),
  `HistoricoRolagensSidebar`.
- `shared/src/dtos/campanha/campanha.dtos.ts` (`CampanhaPainelEspectadorDto`,
  `CampanhaPreviaJogadorDto`, `CampanhaMembroResumoDto`) e
  `shared/src/dtos/ficha/ficha-operacao.dtos.ts` (`FichaResumoDto`).
- Skill `verify`.

## Riscos e mitigação

- **Reversão de decisão de produto documentada** (decisão #4 do módulo, entregável #3 de
  `m8-03`): registrada nesta spec e em `docs/context/HISTORY.md` ao concluir, para a decisão
  anterior não ser lida como ainda vigente sem contexto do porquê mudou.
- **Payload maior por incluir fichas:** aceitável porque reaproveita a mesma consulta já usada
  pela prévia de jogador (`m8-04`), sem nova tabela nem cálculo pesado.
- **"Última rolagem" incompleta em campanhas com muitas fichas silenciosas:** mitigado pelo texto
  explícito "Nenhuma rolagem carregada ainda" (entregável 7) em vez de uma afirmação categórica.
- **Confundir "vê resumo de ficha" com "vê ficha completa":** a seção "Continua valendo" existe
  para que a implementação não amplie sem querer o acesso do espectador além do cartão resumido.
