# ui-43-mestre-defeitos-navegacao.spec.md

> Spec avulsa (autor, 2026-11-28). Sai da análise ao vivo das telas do mestre (página privada
> "Telas do Mestre", capturas em `.artifacts/avaliacao-tela-campanha/`). O autor escolheu
> corrigir primeiro os defeitos claros e deixar o redesenho da visão da campanha para depois. As
> escolhas de ícone e da barra nova são do autor (28/11).

## Objetivo

Corrigir cinco defeitos de navegação e layout que confundem o mestre: duas setas idênticas com
sentidos opostos, a lixeira usada para "Encerrar cena", "Trocar tipo" com cara de selo, a barra
lateral ausente no hub de Cenas e na Biblioteca, e os cartões de agente que quebram quando a coluna
fica estreita.

## Entregáveis

1. **Recolher/expandir a coluna de ações** (`shared/ui/coluna-acoes/`): o botão deixa de usar a
   seta `voltar` e o `chevron-direita`. Ganha um par de ícones novos de painel lateral da Tabler
   Icons (MIT), `barra-lateral-recolher` ("layout-sidebar-left-collapse") e
   `barra-lateral-expandir` ("layout-sidebar-left-expand"). A seta `voltar` fica só para Voltar.
   Vale para todos os consumidores da `app-coluna-acoes`.
2. **"Encerrar cena"** (`painel-sem-iniciativa-mestre`): troca a lixeira (`excluir`) por um ícone
   novo, `parar` ("player-stop" da Tabler, o quadrado). A lixeira continua só nas ações que apagam.
3. **"Trocar tipo"** (`painel-sem-iniciativa-mestre` e onde mais o item existir): troca o ícone do
   tipo atual por um ícone novo, `trocar` ("arrows-exchange" da Tabler). O tipo atual continua no
   cabeçalho da cena.
4. **Barra lateral no hub de Cenas** (`cena/paginas/hub/`), **só para o mestre**: a
   `app-coluna-acoes` com o grupo "Cena" (**Nova cena**, que sai do cabeçalho como na Iniciativa sem
   combate, `ui-38`) e o grupo "Ferramentas" (Calculadora, Caderno, Biblioteca, `[pressionado]`),
   com os mesmos painéis flutuantes da cena (Caderno abre ficha na `app-ficha-flutuante`). O
   jogador continua sem a barra.
5. **Barra lateral na página da Biblioteca do mestre** (`documento/paginas/biblioteca-mestre/`): a
   `app-coluna-acoes` só com "Ferramentas" (Calculadora e Caderno; a própria Biblioteca é a página).
   "Novo documento" continua no cabeçalho.
6. **Cartão de agente estreito** (`campanha-fichas-abas` e `espectador-ficha-card`): a grade passa a
   escolher o número de colunas pela **largura disponível**, não pela largura da janela, e o cartão
   empilha Vida e Energia quando fica estreito (o arranjo que o mobile já usa). Nenhum nome quebra
   letra por letra e nenhum rótulo encosta no número em `1920×1080` e `1366×768`, com a coluna
   aberta e fechada, nem em `960×1080` e `360×800`.
7. **Uma barra só para o site inteiro** (pedido do autor na revisão, 28/11: "se a minha barra lateral
   está aberta, ela tem que ficar aberta em todos"): o estado expandido/retraído da
   `app-coluna-acoes` deixa de ser salvo por `[id]` e passa a ser uma preferência única
   (`contratados-rpg:coluna-acoes`), compartilhada por todas as telas e por duas colunas vivas ao
   mesmo tempo. Sem a preferência nova, a primeira leitura migra a antiga da tela.
8. **Ícones novos** em `shared/icone/`, com a nota no comentário do componente (origem Tabler, MIT,
   e o uso de cada um), e `docs/design/DESIGN.md` atualizado: a coluna de ações agora existe no hub
   de Cenas (mestre) e na Biblioteca do mestre, e a nota "o hub não usa a coluna de ações" sai.

## Critérios de Aceite

1. `npm run test --workspace=frontend` e `npm run lint --workspace=frontend` passam; o build do
   frontend passa. Testes existentes que fixam o ícone antigo da coluna, de "Encerrar cena" e de
   "Trocar tipo" são ajustados para o novo, e o hub ganha teste de que a coluna só aparece para o
   mestre.
2. Medição ao vivo (Playwright): em `1920×1080`, `1366×768` e `960×1080`, com a coluna aberta e
   fechada, `.barra-recurso__topo` não transborda (`scrollWidth ≤ clientWidth`) e o nome do agente
   ocupa no máximo duas linhas.
3. Gate visual (`verify`, skill `design-fidelity`) em `1920×1080` e `360×800`: tela de campanha
   (coluna aberta e fechada), cena de Investigação, hub de Cenas e Biblioteca do mestre, comparados
   com o análogo aprovado — a cena de Investigação (`painel-sem-iniciativa-mestre`, `m7-24`/`m7-25`)
   para a coluna, e a própria tela de campanha atual para os cartões. Capturas em
   `.artifacts/ui-43-mestre-defeitos-navegacao/`.
4. `npm run impacto` rodado para `app-coluna-acoes`, `espectador-ficha-card` e a grade, e todos
   os consumidores conferidos (inclusive a visão do jogador e do espectador, que usam o mesmo cartão).

## Fora de Escopo

- O redesenho da tela de campanha (mostrar a cena aberta, planejadas, Biblioteca e Caderno de
  relance), que é a próxima conversa.
- Reorganizar os grupos da barra da campanha (Membros/Convites junto com Cenas/Biblioteca;
  "Excluir" com o mesmo peso dos demais) e o "4" sem rótulo ao lado de "Novo agente".
- Barra lateral no hub e na Biblioteca do jogador e do espectador.
- O título "Iniciativa" nas cenas Furtiva/Perseguição/Resistência e o palco da Investigação sem o
  título do documento em foco (registrados para o redesenho das cenas).

## Dependências

`docs/design/DESIGN.md` (coluna de ações, `ui-37`/`ui-38`, cena sem iniciativa `m7-24`),
`docs/specs/done/m7-24-*`, `m7-25-painel-investigacao.spec.md`, `m9-11-biblioteca-painel-flutuante.spec.md`.

## Riscos e Mitigação

- **Ícone compartilhado.** A `app-coluna-acoes` é usada em nove telas (campanha, cenas, Iniciativa,
  fichas). O ícone muda em todas, o que é o pedido; o impacto é medido com `npm run impacto`.
- **Cartão compartilhado.** O `espectador-ficha-card` serve ao mestre, ao jogador e ao espectador.
  A regra nova é por largura do próprio cartão, então vale igual nos três; os três são conferidos.
- **Caderno sem ficha.** No hub e na Biblioteca, o Caderno emite "abrir ficha"; sem a
  `app-ficha-flutuante` o link não faria nada. Por isso as duas telas ganham a janela de ficha, como
  a cena.
