# m2-18-painel-campanhas-lista-dashboard.spec.md

> Extensão do milestone `m2-auth-campanhas.spec.md` (pós-m2-17) — task `m2-18`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Redesenhar a lista `/painel` (`CampanhaLista`) — hoje uma grade de cartões (m2-17) — para um
**painel de controle**: linhas densas por campanha com estatísticas agregadas no topo, alerta
visual de ficha crítica por linha, resumo da própria ficha (jogador) e convite copiável direto
na linha (mestre). Escolhido entre três direções comparadas em protótipo (A · Grade Enriquecida,
B · Resumo + Grupos, **C · Painel de Controle** — a aprovada).

## Entregáveis

1. **Backend** — enriquecer `CampanhaResumoDto`/`CampanhaRepository.listarPorUsuario` (só
   leitura, nenhum dado novo persistido) com, por campanha:
   - `totalMembros: number` — `COUNT` de `campanha_membro` ativo.
   - `totalFichas: number` — contagem de fichas **visíveis ao usuário atual** naquela campanha:
     mestre conta todas (mesmo `WHERE` de `listarPorCampanha`), jogador conta só as próprias +
     as concedidas via `usuario_ficha_acesso` (mesmo critério de
     `FichaRepository.listarVisiveisParaUsuario`) — replicar a condição, não reusar o método
     (aqui é agregação, não listagem).
   - `temFichaCritica: boolean` + `fichaCriticaNome: string | null` — existe alguma ficha
     visível com `(dados->'estado'->>'vidaAtual')::int <= 0`; nome da primeira encontrada
     (ordenado por nome, mesmo critério de empate de `listarPorCampanha`).
   - `minhaFichaResumo: { nome: string; vidaAtual: number; vidaMaxima: number | null } | null` —
     só quando `papel === JOGADOR` e ele tem ficha própria na campanha (primeira, se houver
     mais de uma); `null` no papel `MESTRE` (o mestre não tem "sua ficha" na campanha) e quando
     o jogador ainda não criou nenhuma.
   - `codigoConvite: string | null` — preenchido só quando `papel === MESTRE` (permite copiar
     direto da linha sem entrar no detalhe); `null` para `JOGADOR` (hoje só o mestre vê o
     convite — `ehMestre()` no detalhe).
   - `atualizadoEm: string` (ISO) — `GREATEST(campanha.updated_date, MAX(ficha.updated_date))`
     das fichas visíveis ao usuário (mesmo recorte de `totalFichas`); sem fichas, cai no
     `campanha.updated_date`. Um `LEFT JOIN` + `GROUP BY` a mais na query de `listarPorUsuario`.
2. **Frontend — `lista.page.html`/`.ts`**: cartões viram **linhas** (`linha-c`): coluna
   identidade (avatar+nome+`chip-papel`), coluna meio (descrição + contadores "N membros"/"N
   fichas" + alerta ou resumo da própria ficha), coluna ação (`atualizadoEm` relativo +
   botão copiar convite quando mestre + botão "Abrir"). Reaproveita `rotuloRelativo`/formatador
   de tempo já usado no `textoAtualizacao` de `CampanhaDetalhe` (extrair para um util
   compartilhado se ainda não existir um).
3. **Linha crítica**: quando `temFichaCritica`, a linha ganha o mesmo tratamento visual de
   `.detalhe__ficha-card--critico` (risco lateral + fundo tingido, tokens `--vida`/
   `--vida-border` — fixos, não `--accent`, mesmo racional da m3-38 item 7) e mostra
   `fichaCriticaNome` num badge de alerta.
4. **Tira de estatísticas agregadas** no topo do card (`Campanhas`, `Você mestra`, `Fichas em
   campo`, `Alertas`) — somadas no client a partir da lista já enriquecida pelo item 1 (sem
   endpoint próprio): total de itens, quantos com `papel === MESTRE`, soma de `totalFichas`,
   quantos com `temFichaCritica`.
5. **`max-width: 80vw`** no container principal (`lista.page.scss:6`, hoje `1160px` fixo) —
   mesmo padrão já adotado em `visualizar.page.scss:27` (ficha).
6. Fade topo/base (`appOverflowFade`) mantido na lista rolável (já presente, m2-17).
7. Mobile (m2-08/m2-17) preservado: linha colapsa para empilhado por token de breakpoint, sem
   scroll horizontal do body, alvos de toque ≥ 44px.

## Critérios de Aceite

- A tira de 4 estatísticas soma corretamente a partir das campanhas do usuário logado.
- Linha com ficha crítica visível ao usuário tem destaque visual e mostra o nome da ficha.
- Jogador vê nome + Vida atual/máxima da própria ficha na linha; mestre vê contadores de
  membros/fichas e pode copiar o convite direto ali, sem abrir o detalhe.
- `totalFichas`/`temFichaCritica`/`minhaFichaResumo` respeitam a mesma regra de visibilidade
  (§14) já usada em `listarVisiveisParaUsuario` — um jogador nunca vê contagem/alerta de ficha
  que não lhe foi compartilhada.
- `max-width: 80vw`; mobile ~360px sem scroll horizontal, sem regressão de m2-08.
- `lint`/`test`/`build` do frontend e testes de backend (query nova) verdes.

## Fora de Escopo

- `atualizadoEm` não agrega rolagens (só `campanha` + `ficha`) — evita um terceiro `JOIN`;
  pode entrar depois se fizer falta real.
- Paginação da lista (não existe hoje).
- Conteúdo decorativo sem dado real no schema (status ao vivo/agendada/pausada, briefing, log
  de atividade, indicador online) — mesma exclusão já registrada na m2-09/m2-15/m2-17.
- Mudança de regra de permissão — só leitura agregada, nada novo é persistido.

## Dependências

- `m2-17` (redesenho visual anterior, substituído por este).
- `m2-16`/`m3-52` (fichas do membro, base do dado agregado).
- `FichaRepository.listarVisiveisParaUsuario` (critério de visibilidade a replicar na agregação).
- `visualizar.page.scss` (`max-width: 80vw`, padrão já em produção a espelhar aqui).
