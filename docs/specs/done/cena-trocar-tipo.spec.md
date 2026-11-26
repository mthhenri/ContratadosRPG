# cena-trocar-tipo.spec.md

> Pedido do autor (2026-11-26): poder mudar o tipo de uma cena no meio dela. Exemplo: a cena
> "Sessão 7" nasce Investigação, vira Combate, volta para Investigação, depois vira Resistência e
> volta para Investigação, tudo sem criar outra cena. Continua o milestone `m7-cenas`
> (`docs/specs/done/m7-cenas.spec.md`), que fixava o tipo na criação.

## Objetivo

O mestre troca o tipo da cena planejada ou ativa a qualquer momento. A mesa (mestre, jogadores e
espectador) passa ao painel do novo tipo em tempo real, sem recarregar. Cada passagem por um tipo
com iniciativa é um **combate novo**; o anterior fica no histórico.

## Decisões do autor (2026-11-26)

1. **Sair de um tipo com iniciativa encerra o encontro.** Combate → Investigação encerra o encontro
   atual (`ENCERRADO`, fica no histórico, com as rolagens dele). Voltar para Combate abre um
   encontro **novo** em `MONTAGEM`, vazio. Não existe "retomar" um combate.
2. **A regra vale também entre tipos com iniciativa.** Furtiva → Combate (ou qualquer troca entre
   Combate, Furtiva e Perseguição) encerra o encontro atual e abre outro em `MONTAGEM`, como na
   decisão 1.
3. **Investigação não perde os documentos.** O vínculo `cena_documento` pertence à cena, não ao
   tipo. Sair da Investigação só esconde a coluna; voltar mostra os mesmos documentos, na mesma
   ordem e com o mesmo foco. Nenhuma linha é apagada nem alterada na troca.

Decisões tomadas depois da revisão independente (autor, 2026-11-26):

4. **Cena planejada descarta a montagem.** Numa cena `PLANEJADA` a mesa nunca viu o combate em
   `MONTAGEM`; a troca o exclui (soft delete) em vez de encerrá-lo, para ele não aparecer no histórico
   dos jogadores quando a cena abrir. Na cena `ATIVA` vale a decisão 1.
5. **O histórico abre o combate escolhido.** Como uma cena acumula combates encerrados, o painel da
   cena aceita `?encontro=<id>` e mostra aquele combate (só leitura, no painel de Iniciativa mesmo que
   o tipo atual não tenha iniciativa). O menu de combates encerrados e o redirect de
   `/iniciativa/:encontroId` passam a levar o parâmetro.

## Estado atual

- `CenaTipoEnum` + `cenaTemIniciativa(tipo)` (`shared/src/regras/cena/`) decidem quem tem
  encontro. `CenaService.criarCena` cria o encontro junto quando o tipo tem iniciativa.
- Não há rota nem DTO para alterar o tipo da cena.
- Banco: `uix_encontro_cena_ativo` (migration 0031) só permite **um** encontro vivo por cena,
  incluindo os encerrados. Com a decisão 1, uma cena passa a ter vários encontros ao longo da vida,
  e o índice precisa mudar.
- `CenaRepository.colunasCena()` lê o encontro por `LEFT JOIN encontro ON encontro.cena_id =
  cena.id`, o que pressupõe um só encontro.
- `PainelCenaShell` escolhe o painel pelo tipo; `cena:alterada` leva o `CenaResumoDto` (com o
  `tipo`).

## Entregáveis

### 1. Banco (skill `sql-migrations`)

Uma migration nova (próximo número após a 0040):

- remove `uix_encontro_cena_ativo` e cria no lugar um índice **não único** em
  `encontro (cena_id) WHERE is_deleted = false AND cena_id IS NOT NULL`;
- o `DOWN` só recria o índice único se nenhuma cena tiver mais de um encontro vivo e, senão, falha
  com mensagem clara (não apaga histórico).

A invariante "no máximo um encontro **não encerrado** por cena" passa a ser da `CenaService`
(dentro da transação), na mesma linha da decisão #4 do milestone sobre a cena ativa. Um índice
parcial pelo status exigiria fixar no SQL o `id` serial de `tipo_encontro_status`, o que é frágil.

### 2. Repositório

O encontro "da cena" passa a ser o **mais recente** dela (`LEFT JOIN LATERAL ... ORDER BY
encontro.id DESC LIMIT 1`). Como só o mais recente pode não estar encerrado, esse é o encontro
corrente da cena ativa e o último combate de uma cena encerrada. `temEncontro` e `encontroId`
continuam no mesmo contrato. Novo comando `alterarTipo({ id, tipo })` com `UPDATE` parametrizado
que traduz `codigo → id` de `tipo_cena`.

Todo outro consumidor que hoje lê encontro por `cena_id` (`EncontroRepository`, projeção do
espectador, `rolagem`) é auditado com a skill `gerenciamento-de-impacto`. Onde ele pressupõe um
encontro por cena, passa a ler o mais recente. A lista auditada vai para o fecho.

### 3. Contrato (`shared/src/dtos/cena/`, skill `dto-conventions`)

- `CenaTipoAlterarDto { readonly id: number; readonly tipo: CenaTipoEnum }`, com o `id` vindo da
  rota.
- Interno: `CenaTipoInternoAlterarDto { readonly id: number; readonly tipo: CenaTipoEnum }`.
- A saída reaproveita `CenaRecuperadaDto`. Nenhum evento novo: o broadcast é o `cena:alterada`.

### 4. Backend: `POST cena/:id/tipo`

`CenaService.alterarTipo` (a cena é travada com `SELECT ... FOR UPDATE` e relida dentro da
transação, e o mesmo vale para `encerrarCena` e para o encerramento da ativa ao abrir/criar outra —
serializa trocas e encerramentos concorrentes da mesma cena, já que o índice único saiu):

- só o mestre da campanha; cena `PLANEJADA` ou `ATIVA` (`ENCERRADA` → `BusinessException`); tipo
  válido do enum; tipo igual ao atual → `BusinessException` (nada a trocar);
- na mesma transação (`TransacaoService`):
  1. se a cena tem encontro não encerrado, ele vai a `ENCERRADO` por
     `EncontroService.encerrarEncontroDaCena` (decisões 1 e 2) — ou, em cena `PLANEJADA`, é excluído
     (`EncontroRepository.excluirEncontro`, decisão 4);
  2. altera o tipo;
  3. se `cenaTemIniciativa(novoTipo)`, cria um encontro em `MONTAGEM` com o nome da cena, pelo
     mesmo caminho de `criarCena` (extrair um método privado comum, sem duplicar);
- depois do commit: `cena:alterada` da cena e `encontro:alterado` do encontro encerrado e do novo.
  A trava de cena `PLANEJADA` (só a sala do mestre) vale igual: a emissão reaproveita
  `emitirAlteracoes`.
- `cena_documento` não é tocado (decisão 3).

Controller fino: `alterarTipo({ ...dto, id })`. Registro no OpenAPI (`openapi.document.ts`,
`contratos-gerados.ts`), como as outras rotas de cena.

### 5. Frontend

- `CenaService.alterarTipo(id, tipo)`.
- Coluna de ações do mestre, categoria "Cena", nos dois painéis (`PainelEncontroMestre` e
  `PainelCenaSemIniciativaMestre`): item **"Trocar tipo"**, com a cena planejada ou ativa. Ele abre
  a escolha entre os cinco tipos (rótulos de `rotulos-cena.ts`), com o atual marcado e
  indisponível. O controle usa os primitivos de `shared/ui/`; se nenhum cobrir a escolha (menu ou
  diálogo de opção única), **parar e perguntar ao autor** antes de criar algo local.
- **Confirmação** quando a cena tem encontro não encerrado: "O combate atual será encerrado e vai
  para o histórico." Trocar entre dois tipos sem iniciativa não pede confirmação.
- `PainelCenaShell` reage ao `tipo` novo vindo do `cena:alterada` (ou à resposta do `POST`) e troca
  o painel no lugar, para o mestre, o jogador e a prévia/espectador. A reconexão refaz o `GET` da
  cena, como hoje.
- `?encontro=<id>` no painel (decisão 5): `EncontroPainelDadosService` carrega aquele encontro se for
  desta cena, só ele recebe `encontro:alterado`, e `PainelCenaShell` usa o painel de Iniciativa
  enquanto ele estiver na tela. `abrirDoHistorico` e `redirecionarEncontroParaCena` levam o parâmetro.
- O hub já mostra o chip do tipo e refaz a lista a cada `cena:alterada`. Nada novo além de
  conferir.

## Fora de escopo

- Retomar um combate encerrado (decisão 1). Abrir para leitura, sim (decisão 5).
- Linha do tempo das trocas de tipo no hub ou no histórico. Se fizer falta, vai para `IDEAS.md`.
- Trocar o tipo de cena encerrada.

## Critérios de aceite

- A sequência do exemplo (Investigação → Combate → Investigação → Resistência → Investigação) roda
  numa cena só e deixa um encontro `ENCERRADO` no histórico. Os documentos anexados no começo
  continuam lá no fim.
- Combate → Furtiva encerra o encontro e abre outro em `MONTAGEM`.
- Um jogador com a cena aberta vê o painel trocar sozinho, sem recarregar. Com a cena `PLANEJADA`,
  nada chega aos jogadores.
- Não-mestre recebe 403; cena encerrada ou tipo igual recebem 400.
- Testes: `shared` (DTO), `backend` (`cena.service.spec` cobrindo as cinco transições relevantes,
  as recusas e a ordem "encerrar → alterar → criar" na transação; repository lendo o encontro mais
  recente), frontend (service e shell reagindo ao tipo novo).
- Gate visual (`verify` + `design-fidelity`) em `1920×1080` e `360×800`: menu/diálogo de troca,
  confirmação, painel trocado para o mestre e o jogador (dois usuários, tempo real). Análogo:
  item "Encerrar cena" da coluna de ações e o diálogo de confirmação já usado nela.
- `npm run repo:verificar` limpo; `docs/context/` atualizado no fecho.
