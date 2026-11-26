# Verificação — cena-trocar-tipo (2026-11-26)

## Gates automáticos

Números da rodada final, depois das correções da revisão (repetida antes do commit, mesmo resultado).

- `shared`: 78 arquivos, 1.356 testes verdes (inclui o contrato `CenaTipoAlterarDto`/`CenaTipoInternoAlterarDto`).
- `backend`: 83 arquivos (9 pulados, de banco), 1.381 testes verdes; `cena.service.spec` cobre Investigação →
  Combate, Combate → Investigação, Furtiva → Combate (ordem encerrar → alterar → criar, tudo na transação),
  Investigação → Resistência, troca em cena planejada, 403 de não-mestre, 400 de cena encerrada/mesmo tipo/tipo
  inválido e o descarte do encontro encerrado que sobra numa cena sem iniciativa. `cena.repository.spec` confere o
  `LEFT JOIN LATERAL` (encontro mais recente) e o `UPDATE` de tipo.
- `frontend`: 304 arquivos, 3.786 testes verdes com `NODE_OPTIONS=--no-experimental-webstorage` (contorno de
  `P-138`; sem ele falham 689 testes do Node 26, falha preexistente e alheia a esta task).
- `npm run lint`: 0 erros (avisos de estilo preexistentes). `npm run build --workspace=frontend`: ok (aviso de
  orçamento do bundle preexistente).
- Migration `0041`: `db:migrate` → `db:rollback` → `db:migrate` sem erro no banco de dev; índice final
  `ix_encontro_cena`.

## Verificação ao vivo

Stack do autor (3100/4300) com a migration aplicada. Cenário por REST + Playwright (roteiro e capturas em
`.artifacts/cena-trocar-tipo/`, fora do Git): mestre e jogador numa campanha nova, cena "Sessão 7" criada como
Investigação já ativa, com o documento "Relatório do Setor 7" anexado. Mestre e jogador abertos na mesma cena; o
mestre percorre Investigação → Combate → Investigação → Resistência → Investigação pelo item "Trocar tipo".
Rodado em `1920×1080` e `360×800`.

Resultado nos dois viewports, conferido pelo `GET` da cena depois de cada passo:

- Combate abre um encontro novo em `MONTAGEM`; ao sair dele o encontro fica `ENCERRADO` e a cena volta a
  `encontro: null`. No fim, a campanha tem dois encontros `ENCERRADO` na mesma cena (um por execução).
- O documento continua anexado em todos os passos.
- A tela do jogador trocou de painel sozinha (Iniciativa em montagem, Resistência, Investigação) com a sentinela
  `window.__sentinela` intacta: sem recarregar.
- Sem overflow horizontal no mestre em nenhum passo.

Comparação visual (inspecionada pelo agente principal): o dialog "Trocar tipo" usa o mesmo `app-modal` +
`app-campo` + `app-seletor` + `app-botao` do análogo `CenaCriarDialog` ("Nova cena"), com a mesma largura, texto
de ajuda e ações (Cancelar à esquerda); o tipo atual aparece como "(atual)" e indisponível. A confirmação é o
`ConfirmacaoService` canônico, empilhada sobre o dialog como na confirmação do "Abrir agora" do análogo. O item
"Trocar tipo" entra na coluna de ações com o ícone do tipo atual, na rail recolhida do desktop e na barra inferior
do mobile. Em 360px o dialog e a lista de tipos cabem sem corte; os botões do mobile mantêm o alvo de toque do
análogo.

## Revisão independente e correções

Um subagente revisor (só leitura, sem a conclusão do agente principal) apontou sete itens. Corrigidos sem
mudar comportamento pedido: trava `FOR UPDATE` + releitura da cena na transação de `alterarTipo`,
`encerrarCena` e no encerramento da ativa (duas trocas, ou troca + encerramento, concorrentes deixavam dois
encontros abertos ou um aberto em cena encerrada, já que o índice único saiu); `encontro:alterado` atrasado do
combate encerrado ignorado numa cena sem iniciativa e quando é mais antigo que o atual; "Trocar tipo" na
categoria "Cena" do painel de Iniciativa; comentário deslocado; teste da casca trocando de painel ao vivo.
Dois foram decisão do autor e viraram as decisões 4 e 5 da spec: descartar (soft delete) a montagem de cena
planejada, que vazava ao histórico dos jogadores quando a cena abria; e `?encontro=<id>` para o histórico abrir o
combate escolhido, já que uma cena passou a ter vários.

Segunda rodada ao vivo (`cenario-2.js`, mesmos viewports): numa cena planejada de Combate trocada para Furtiva e
depois aberta, a montagem 4 desaparece e mestre e jogador só listam a 5; depois de Combate → Investigação →
Combate, o menu "1 encerrado" abre `/cenas/4?encontro=5`, o painel mostra aquele combate "Encerrado — só leitura"
(sem a categoria "Cena"), e o link antigo `/iniciativa/5` cai no mesmo endereço. Sem overflow.

Terceira rodada ao vivo (`cenario-3.js`, pedido do autor antes do commit, mesmos viewports), cobrindo os dois
limites das rodadas anteriores: combate já `ATIVO` (dois avulsos com iniciativa, rodada 2) e o espectador real
(`/campanhas/:id/espectador/iniciativa`) aberto junto com mestre e jogador. Combate → Investigação (com a
confirmação) deixa o encontro `ENCERRADO` com rodada, turno e os dois combatentes intactos; a cena e a projeção do
espectador (`painel-espectador/cena-ativa`) passam a Investigação sem encontro; a tela do espectador troca para
"Investigação · Sessão 7" (Documentos apresentados) e, na volta a Combate, para o combate novo em montagem, sem
os guardas e sem recarregar (sentinela intacta no jogador e no espectador). Sem overflow.

## Limites

- Concorrência real (duas abas trocando ao mesmo tempo) foi coberta só por teste unitário da releitura sob
  `FOR UPDATE`, não ao vivo.
