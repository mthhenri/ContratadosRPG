# quadro-investigacao-campanha.spec.md

> Spec avulsa (autor, 2026-11-25). Promove a `I-042` (`docs/context/IDEAS.md`), a "mesa
> investigativa/mapa mental" deixada fora de escopo na `m9-documentos-campanha`. O desenho
> visual e de interação vem de um protótipo aprovado pelo autor, anexado em
> `quadro-investigacao-campanha/prototipo.html` com dados fictícios. Os detalhes estão em
> `quadro-investigacao-campanha/design.md`.

## Objetivo

Dar a cada campanha **dois quadros de investigação**: um mural de cortiça onde se prendem fichas
com pino, se movem livremente e se ligam com fio vermelho para mostrar a relação entre pistas,
pessoas, lugares e eventos.

- **Quadro do mestre:** a preparação dele, com bastidor e o que falta decidir. Só ele vê.
- **Quadro dos jogadores:** a teia que a mesa monta, compartilhada entre os jogadores e lida
  pelos espectadores.

Uma ficha também pode prender um documento da Biblioteca.

## Decisões do autor (2026-11-25)

- **Dois quadros por campanha, um por cargo**, no molde das organizações da Biblioteca
  (`biblioteca-pastas`): o do **mestre** e o dos **jogadores**. O cargo de quem acessa escolhe o
  quadro, e nenhuma rota recebe o cargo do cliente.
- **O quadro dos jogadores é colaborativo:** qualquer jogador cria, edita, move e exclui; o
  espectador só lê.
- **Notas livres + documento fixado:** a ficha pode ser texto próprio ou um documento da Biblioteca.
- **Visual:** a cortiça, os papéis, os pinos e o fio do protótipo são o objeto. Barra de
  ferramentas, legenda, sumário e editor seguem o Terminal de Contenção.
- **A confirmar:** o mestre pode **ler** o quadro dos jogadores, só leitura, para acompanhar o que
  a mesa deduz? A spec assume que **sim**. Se o autor preferir como nas pastas (o mestre nunca vê
  a organização dos jogadores), basta tirar o mestre da leitura e da sala do evento do quadro dos
  jogadores.

## Regras do quadro

Valem para REST e WebSocket, arbitradas na service (como em `SYSTEM.SPEC.md` §14):

1. **Quem faz o quê:**

   | Ação | Mestre | Jogador | Espectador |
   |---|---|---|---|
   | Quadro do mestre: ver | ✅ | ❌ (404) | ❌ (404) |
   | Quadro do mestre: criar, editar, mover, excluir | ✅ | ❌ | ❌ |
   | Quadro dos jogadores: ver | ✅ (só leitura) | ✅ | ✅ |
   | Quadro dos jogadores: criar, editar, mover, excluir | ❌ (403) | ✅ | ❌ (403) |

   O quadro do outro cargo não existe para quem não pode vê-lo: responde 404, como um id
   inexistente. Excluir no quadro dos jogadores não pede papel especial, como nas pastas da
   Biblioteca.
2. **Tipos de ficha** (cor do papel): `PISTA` (amarelo, "A mesa sabe"), `AMEACA` (rosa),
   `ABERTO` (laranja, "Aberto: decidir"/hipótese) e `BASTIDOR` (roxo). `BASTIDOR` só existe no
   quadro do mestre.
3. **Faixas "Bastidor" e "Decidir"** (o rodapé roxo e laranja das fichas) só existem no quadro do
   mestre. O quadro dos jogadores recusa esses campos.
4. **Fio:** liga duas fichas do mesmo quadro. Excluir uma ficha exclui os fios dela.
5. **Documento fixado:** a ficha mostra título e começo do texto (ou miniatura da imagem) do
   documento e abre a Biblioteca nele ao toque. No quadro do mestre, vale qualquer documento da
   campanha. No dos jogadores, só documento revelado. Ocultar um documento esconde as fichas
   dele no quadro dos jogadores sem apagá-las; ao revelar de novo, voltam na mesma posição.
   Excluir o documento exclui as fichas e os fios delas nos dois quadros.
6. **Edição simultânea:** vence a última gravação, sem estado corrompido (igual às pastas da
   Biblioteca). Mover grava uma vez, ao soltar.

## Entregáveis

1. **Contrato em `shared/`**: DTOs `QuadroNota*Dto`, `QuadroFio*Dto`, `QuadroZona*Dto` e
   `QuadroDto` (o quadro inteiro do cargo), enum do tipo de ficha e validadores com os limites:
   título da ficha 1–120, texto até 10 000, cada faixa até 10 000, rótulo do fio até 60, nome da
   zona 1–60, largura ∈ {260, 320, 380, 460}, rotação de −3 a 3 graus, e por quadro até 500
   fichas, 1 000 fios e 50 zonas.
2. **Schema** (skill `sql-migrations`), com BaseEntity e soft delete. Em todas as tabelas, o cargo
   do quadro (`MESTRE` | `JOGADOR`) é uma coluna de enum por tabela de referência, seguindo a
   convenção; avaliar reaproveitar `tipo_documento_organizacao`.
   - tabela de referência do tipo de ficha (`PISTA`, `AMEACA`, `ABERTO`, `BASTIDOR`);
   - `quadro_nota`: `campanha_id`, cargo do quadro, autor, tipo, `titulo`,
     `conteudo_markdown`, `bastidor_markdown` e `decidir_markdown` (só no quadro do mestre),
     `documento_id` opcional (título e texto vazios quando preenchido), `posicao_x`,
     `posicao_y`, `largura`, `rotacao`;
   - `quadro_fio`: `campanha_id`, cargo, nota de origem, nota de destino (diferentes, do mesmo
     quadro) e `rotulo` opcional;
   - `quadro_zona`: `campanha_id`, cargo, `nome`, `posicao_x`, `posicao_y`;
   - `docs/SCHEMA.md` atualizado.
3. **Backend** (`backend/src/modules/quadro/`, controller → service → repository): `GET` do
   quadro do cargo; criar, editar, mover e excluir ficha, fio e zona. Ficha de documento validada
   contra a `DocumentoService` (mesma campanha, documento revelado no quadro dos jogadores). A
   service é o único árbitro. Para o mestre, a leitura do quadro dos jogadores é uma rota ou um
   parâmetro explícito de leitura, nunca um cargo escolhido pelo cliente.
4. **Tempo real** (broadcast-only, `SYSTEM.SPEC.md` §9): eventos por item (`quadro:nota-alterada`,
   `quadro:fio-alterado`, `quadro:zona-alterada`, `quadro:item-removido`) com o cargo do quadro no
   payload.
   - O quadro do **mestre** emite só para `campanha:<id>:mestre`.
   - O dos **jogadores** emite para `campanha:<id>` e `campanha:<id>:espectador`.
   - Ocultar um documento emite a remoção das fichas dele no quadro dos jogadores, só com o id,
     sem título.
   - O cliente refaz o `GET` ao reconectar.
5. **Frontend**: rota `/campanhas/:campanhaId/quadro` em tela cheia, com entrada nas abas da
   campanha. O jogador cai no quadro dos jogadores; o espectador também, em só leitura; o mestre
   cai no dele, com um seletor "Meu quadro / Quadro dos jogadores" (o segundo em só leitura).
   - **Mural:** fundo de cortiça sem grade; arrastar o fundo move a vista; roda e pinça dão zoom;
     "Ver tudo" enquadra. A vista é lembrada por quadro neste navegador.
   - **Fichas:** papel na cor do tipo, pino vermelho no topo, leve rotação, faixas do mestre no
     rodapé (no quadro dele) e "editar" visível. Arrastar livre. Toque duplo ou "editar" abre o
     editor.
   - **Fios:** curva com caída entre os pinos, sombra, etiqueta opcional no meio. "Ligar" e depois
     duas fichas criam o fio; tocar o fio edita a etiqueta ou o exclui.
   - **Zonas:** etiqueta de papel com fita, arrastável, para agrupar regiões.
   - **Legenda flutuante** fixa na tela, recolhível. No celular abre recolhida, só com as cores.
     No quadro dos jogadores, mostra só os tipos dele.
   - **Sumário:** painel com todas as fichas agrupadas por zona, busca, ir até a ficha e renomear
     ali mesmo. No celular vira gaveta de baixo.
   - **Editor:** nome, tipo, largura e texto (Markdown do site); no quadro do mestre, também as
     duas faixas. Tela cheia no celular, com ações fixas embaixo. Ficha de documento escolhe o
     documento pela busca da Biblioteca.
   - **Só leitura** (espectador, e o mestre no quadro dos jogadores): sem barra de edição e sem
     arrastar fichas. Navegar, sumário e legenda continuam.
   - Componentes de `shared/ui` para barra, painéis, modal, campo, segmentado e confirmação.
6. **Importar e exportar:** quem edita um quadro exporta esse quadro em JSON e importa um JSON no
   mesmo formato para dentro dele. O formato do protótipo também é aceito (`notes`, `links`,
   `zones`, descrito no anexo `design.md`). No quadro dos jogadores, `BASTIDOR` e as faixas do
   JSON são descartados na importação.
7. **Documentação**: `docs/SYSTEM.SPEC.md` §9 e §14 com as regras e salas dos quadros,
   `docs/design/DESIGN.md` com a seção do quadro (o objeto cortiça é a exceção sancionada aos
   tokens), `I-042` movida para "Promovidas" com o link desta spec, e `HISTORY.md`.

## Critérios de Aceite

1. O jogador e o espectador recebem 404 no quadro do mestre, em REST e evento. Nenhum evento do
   quadro do mestre chega a `campanha:<id>` nem a `campanha:<id>:espectador`. Há testes de
   service e de gateway.
2. A ficha que um jogador cria aparece na hora para os outros jogadores, o espectador e o mestre
   (no seletor "Quadro dos jogadores"). O espectador e o mestre recebem 403 ao tentar escrever
   nele.
3. O quadro dos jogadores recusa o tipo `BASTIDOR` e as faixas, inclusive na importação.
4. Ficha de documento: ocultar o documento a tira do quadro dos jogadores sem recarregar e sem o
   título no evento; revelar de novo a traz na mesma posição; excluir o documento exclui a ficha e
   seus fios nos dois quadros.
5. Dois jogadores movendo a mesma ficha terminam no mesmo lugar (a última gravação), sem erro.
6. Exportar e importar recriam fichas, fios e zonas iguais, e o JSON do protótipo importa sem
   ajuste manual.
7. `npm run repo:test`, lint e builds passam. A aplicação real é verificada em `1920×1080` e
   `360×800` contra o análogo `quadro-investigacao-campanha/prototipo.html`, com capturas em
   `.artifacts/quadro-investigacao-campanha/`: arrastar, pinça, fio, sumário, legenda recolhida,
   editor em tela cheia e as visões de mestre (os dois quadros), jogador e espectador.

## Fora de Escopo

- Mais de dois quadros por campanha, quadro por cena ou por missão.
- Mandar uma ficha do quadro do mestre para o dos jogadores (copiar ou revelar). O mestre
  revela material pela Biblioteca, como hoje, e os jogadores fixam o documento revelado.
- Cursores ou presença ao vivo de quem está mexendo no quadro.
- Desenho livre, imagens soltas, anexos e comentários nas fichas.
- Histórico de versões e desfazer entre sessões.
- Mudar a Biblioteca, as pastas ou o Caderno, além de ler o documento fixado.
- Tabletop tático, mapas e tokens (`I-016`/M11).
- Janela externa do quadro (pode virar ideia própria depois, no molde da `I-027`).

## Dependências

`docs/SYSTEM.SPEC.md` (§9 tempo real, §14 permissões), `docs/CONVENTIONS.md`, `docs/SCHEMA.md`,
`docs/design/DESIGN.md`, `docs/specs/done/m9-documentos-campanha.spec.md`,
`docs/specs/done/biblioteca-pastas.spec.md` (organização por cargo, 404 para a do outro cargo,
eventos por sala), `docs/specs/done/caderno-esquadrao-colaborativo.spec.md` (colaboração) e os
anexos `quadro-investigacao-campanha/design.md` e `prototipo.html`.

## Riscos e Mitigação

- **Vazar o quadro do mestre.** É o risco central. O cargo vem do papel na campanha, nunca do
  cliente. Os eventos do quadro do mestre têm como alvo só a sala do mestre, por construção. Os
  testes do critério 1 entram antes da tela.
- **Documento fixado revelando o que não devia.** No quadro dos jogadores, a ficha de documento
  passa pelo mesmo recorte da Biblioteca (`revelado = true`) na listagem, na leitura direta e no
  evento.
- **Desempenho do arrasto.** Durante o arrasto, só a ficha e os fios dela se redesenham. A
  gravação acontece ao soltar e não a cada movimento.
- **Gesto no celular.** Um toque não pode virar arrasto: há limiar de movimento maior no toque,
  pinça com dois dedos e alvos de 44px nas ações. Isso é verificado em `360×800`.
- **Cortiça fora dos tokens.** Registrar no `DESIGN.md` como exceção do objeto (o mural e os
  papéis), mantendo barra, painéis e textos de interface nos tokens do tema.
