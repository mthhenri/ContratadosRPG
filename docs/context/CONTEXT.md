# CONTEXT.md — Painel do Projeto

> **Última revisão:** 2026-08-24 · **Última decisão registrada:** `P-027` — os efeitos permanentes
> e incondicionais das habilidades de custo 0 E agora pertencem às fórmulas compartilhadas:
> **Tanque** soma +1 de Vida por progressão e +3 à resistência de toda Proteção equipada;
> **Segundo Fôlego** soma `⌊Vigor ÷ 2⌋` dados-base à Energia recuperada em qualquer descanso; e
> **Metabolismo Acelerado** soma Medicina D4 de Vida e Vontade D4 de Energia em descansos Médio e
> Longo. Criação, edição, fallbacks de ficha e mapper de Encontro propagam `habilidades`; a edição
> de Tanque altera a Vida máxima persistida somente pelo delta mecânico, preservando ajuste manual.
> A calculadora pública de Descanso expõe os dois efeitos, atributos, faixas, fórmulas e rolagens.
> Testado: shared 729/729, backend 456/456, frontend 1329/1329; builds verdes e lint sem erros nos
> três workspaces. Verificado ao vivo em `1920×1080` e `360×800`, sem overflow ou erro de console;
> o cenário combinado confirmou Vida 8–32 e Energia 8–40. Ver `HISTORY.md` para o relato completo.
>
> **Uma decisão atrás:** ajuste avulso pós-M7/M3 (bug
> reportado direto pelo autor) — a média de Nível/Prestígio do esquadrão não chegava ao **primeiro
> agente de um jogador comum** numa campanha que já tinha agentes de outros jogadores. Causa: o
> passo // Novo agente (`criar.page.ts`) decidia "primeiro agente da campanha" checando
> `fichas().length`, alimentado por `FichaService.listarFichas` — que para um jogador comum (§14)
> só devolve as próprias fichas e as concedidas por `usuario_ficha_acesso`, nunca as dos demais
> membros. Um jogador sem ficha própria e sem concessão recebia `fichas = []` mesmo a campanha
> tendo agentes de verdade, silenciando a regra "Iniciando um Novo Agente"
> (`docs/core/sistema-v4.1.0.md`), que cobre explicitamente "a chegada de um jogador em uma
> campanha em andamento". Fix: a média é um **agregado** (nunca expõe ficha individual), então não
> deve seguir a mesma matriz de visibilidade por ficha — novo recorte calculado
> `FichaMediasEsquadraoDto { mediaNivel, mediaPrestigio, quantidade }`
> (`shared/dtos/ficha`, reaproveita `FichaListarDto` como entrada) + `FichaRepository.
> calcularMediasEsquadrao` (SQL `AVG`/`COUNT` sobre fichas `JOGADOR` ativas da campanha) +
> `FichaService.calcularMediasEsquadrao` (só exige que o autor seja membro, **sem** ramificar por
> papel — mestre e jogador comum recebem a mesma média) + `GET /ficha/medias-esquadrao?campanhaId=`.
> `criar.page.ts` trocou o signal `fichas` (`FichaResumoDto[]`) por `mediasEsquadrao`
> (`FichaMediasEsquadraoDto | null`); os quatro pontos do template que checavam `fichas().length`
> passaram a checar `mediasEsquadrao()?.quantidade`. **Achado só na verificação ao vivo:**
> `AVG(...)::numeric` do Postgres chega pelo driver `pg` como **string**, não `number` — o teste
> unitário do repositório até mockava esse formato sem questionar; corrigido com `::float8` externo
> ao `COALESCE`. Testado: shared 723/723 (sem mudança), backend 456/456 (+4), frontend 1326/1326
> (+2); lint limpo nos três. Verificado ao vivo (Postgres+backend+frontend reais, REST + Playwright,
> dois usuários): jogador comum sem `usuario_ficha_acesso` sobre a ficha do mestre confirma por REST
> que `GET /ficha?campanhaId=` devolve `[]` (ficha alheia continua protegida individualmente) mas
> `GET /ficha/medias-esquadrao` devolve a média correta; no guia desse jogador, o passo // Novo
> agente não mostra mais "Primeiro agente da campanha" e calcula Nível/Prestígio iniciais corretos,
> confirmado em `1920×1080` e `360×800`. Controle de regressão: campanha genuinamente vazia
> continua mostrando "Primeiro agente da campanha" para o mestre. Ver `HISTORY.md` para o relato
> completo.
>
> **Duas decisões atrás:** `m7-19` (ajuste avulso pós-M7, o
> mestre pode sobrescrever, por combatente e por encontro, a expressão de dados usada para rolar a
> Iniciativa) — cobre casos que a fórmula padrão do sistema não prevê (efeito temporário de cena,
> condição homebrew, ajuste pontual) sem precisar de sequela ou Formação permanente na ficha. Novo
> campo persistido `encontro_combatente.iniciativa_formula_custom` (migration `0025`, nulo por
> padrão — nulo usa o cálculo padrão), espelhado em `EncontroCombatenteResumoDto.
> iniciativaFormulaCustom` e no DTO interno `EncontroCombatenteLinhaDto`. Novo DTO
> `EncontroCombatenteIniciativaFormulaAlterarDto { id, formula: string | null }` e endpoint
> `PUT encontro/combatente/:id/iniciativa/formula` (`EncontroService.alterarFormulaIniciativa`),
> mestre-only (`validarMestre`, mesmo padrão dos demais endpoints de edição pontual do combatente),
> validado contra `validarFormula` (`shared/regras/rolagem`, a mesma gramática dos presets de
> rolagem — não duplicada) antes de persistir; `formula` vazio/só espaço é tratado como remoção
> (`null`). `encontro-revelacao.ts` zera o campo junto dos demais números de quem não tem
> revelação — mesmo cuidado de §14 que os outros campos calculados do combatente já seguem.
> Quando presente, a expressão tem prioridade **total** sobre o cálculo padrão (Destreza em D6 +
> `dadoExtraIniciativa`, m7-18, + `iniciativaBonus`) nos dois pontos que hoje produzem um resultado
> de dado: `rolarTudo()` (mestre, "Rolar iniciativas") e `rolarMinhaIniciativa()` (jogador rolando o
> próprio combatente) — os dois extraídos para o mesmo helper `concluirRolagemDeIniciativa` depois
> de calcular o resultado, sem duplicar a lógica de bandeja/registro/atribuição. Entrada de edição no
> painel do mestre: campo de texto "Fórmula de Iniciativa" (`.combatente__formula-campo`,
> `CartaoCombatente`) dentro do mesmo modo "Editar combatentes" (mestre-only) que já edita cor/
> imagem do avulso, mas — ao contrário daquele bloco — visível para **qualquer** tipo de combatente
> (agente, criatura, avulso), não só avulso. Testado: shared 723/723 (sem mudança), backend 453/453
> (+7), frontend 1323/1323 (+8); lint limpo nos três (os 2 erros de `npm run lint -w backend` são o
> `P-022` preexistente). Verificado ao vivo (Postgres+backend+frontend reais, dois usuários, REST +
> Playwright): mestre define uma fórmula constante (`50`, fora do alcance de qualquer fórmula padrão
> possível para o avulso testado) num combatente avulso, "Rolar iniciativas" produz exatamente
> **50** — prova end-to-end de que a sobrescrita venceu —, remover a fórmula (campo em branco) volta
> o cálculo ao padrão; confirmado em `1920×1080` e `360×800`. O jogador não tem o botão "Editar
> combatentes" nem o campo em lugar nenhum da UI, nos dois viewports; uma chamada direta ao endpoint
> por um jogador é recusada com 403, e uma expressão sintaticamente inválida (`3D`) é recusada com
> 400 sem persistir.
>
> **Três decisões atrás:** `m7-18` (ajuste avulso pós-M7,
> "Rolar tudo" do mestre passa a somar o dado extra de Iniciativa de Formação da Origem) — certas
> Formações da Origem concedem dado extra de Iniciativa (`PERICIA_DADO_INICIATIVA`,
> `obterDadoExtraIniciativaFormacao`, `shared/regras/identidade/formacoes.ts`), já aplicado
> corretamente quando o próprio jogador rola a própria iniciativa, mas ignorado pelo atalho **Rolar
> tudo** do mestre — um agente com essa Formação, rolado pelo mestre, saía sistematicamente com
> menos dados do que a própria ficha produziria. Corrigido no mesmo padrão de campo calculado que
> `m7-17` já usa para resistência a dano: `EncontroCombatenteResumoDto` ganhou
> `dadoExtraIniciativa: number` (default `0` para criatura/NPC/avulso, que não têm Formação de
> Origem); o mapper do Encontro (`encontro-combatente.mapper.ts`) ganhou
> `resolverDadoExtraIniciativa`, reaproveitando a função pura do shared sem duplicar a soma no
> backend; `encontro-revelacao.ts` zera o campo junto de `destreza`/`iniciativaBonus` para quem não
> tem os números liberados. `rolarTudo()` (`painel-encontro.page.ts`) passou a montar
> `dados = Math.max(1, destreza) + dadoExtraIniciativa`; o caminho do jogador (`rolar-iniciativa.ts`)
> não foi tocado — já estava correto. Testado: shared 723/723 (sem mudança), backend 446/446 (+1),
> frontend 1321/1321 (+1); lint limpo nos três (os 2 erros de `npm run lint -w backend` são o
> `P-022` preexistente, fora do diff desta task). Verificado ao vivo (Postgres+backend+frontend
> reais, `1920×1080`): ficha REST-seed com Destreza 1 e 2 entradas de `PERICIA_DADO_INICIATIVA`
> confirmou `dadoExtraIniciativa: 2` via `GET /encontro/:id`; "Rolar iniciativas" pelo mestre no
> painel real produziu iniciativa **8** — impossível sob `1D6` (teto 6), consistente com `3D6`
> (Destreza 1 + dado extra 2), provando a correção end-to-end. **Correção, mesmo dia:** o
> amplificador `Atento` (`ajusteDadoIniciativaAmplificadores`), inicialmente deixado fora de escopo
> por depender supostamente do "documento inteiro da ficha" (registrado como `PROBLEMS.md` `P-026`),
> na prática é função pura sobre `inventario.amplificadores` — mesmo padrão de `obterDadoExtra
> IniciativaFormacao`. `resolverDadoExtraIniciativa` passou a somar os dois; `P-026` fechado. Testado
> de novo (mesmos números, backend 446/446 com o caso combinado). Verificado ao vivo: ficha com **só**
> Atento (3 empilhamentos, sem Formação) confirmou `dadoExtraIniciativa: 3` via REST; "Rolar
> iniciativas" real produziu **12**, consistente com `4D6` (Destreza 1 + Atento 3).
>
> **Quatro decisões atrás:** `m3-78` (ajuste avulso pós-M3, a
> Habilidade de Personalidade ganha 3 estágios com custo em Energia) — deixou de ser um único texto
> definido a qualquer momento pelo editor completo e passou a ter 3 estágios nomeados (Base, 1ª e 2ª
> Fortificação — níveis 7/14), cada um com descrição e custo em Energia próprios (nunca um nome
> próprio: o nome de qualquer estágio é sempre a palavra de Personalidade, sufixada pelo rótulo do
> estágio numa Fortificação — "Atento — 1ª Fortificação" —, nunca texto livre; corrigido no mesmo dia,
> ver abaixo), preenchíveis desde
> o guia de criação (`criar.page.ts`, passo **Identidade** — logo abaixo do campo "Traço de
> personalidade"; implementada primeiro no passo Habilidades e movida para Identidade por pedido do
> autor logo depois, ver abaixo — sempre visível, sem gate por nível; só a Base é exigida para
> avançar do passo Identidade, cada Fortificação só quando o Nível de criação já a desbloqueou, sem
> bypass de `modoLivre`; o passo Habilidades manteve seu próprio gate só do catálogo,
> `vagasCatalogoCompletas`, com bypass de `modoLivre` como antes).
> `identidade.habilidade` (`FichaPersonalidadeHabilidadeDto`, `shared/dtos/ficha`) guarda os 3
> rascunhos + qual está `ativa`; só o ativo é materializado como o item `categoria: PERSONALIDADE`
> de `dados.habilidades` (`materializarHabilidadePersonalidade`, `shared/regras/identidade`) — fonte
> única usada pelo guia e pela ficha, preservando sem mudança nenhum consumidor existente de
> `dados.habilidades` (rolagem/Energia vinculada, `m3-77`; lista da aba Habilidades). Na ficha, a
> aba Extras ganhou um seletor do estágio ativo (restrito ao que o Nível **atual** já desbloqueia,
> mesma `calcularProgressaoAcumulada` do guia) e um editor (`p-dialog`, mesmo mini-editor da Origem)
> com os 3 blocos sempre preenchíveis, mesmo os ainda não desbloqueados. Retrocompatibilidade
> tolerante: uma ficha sem `identidade.habilidade` mas com um item `PERSONALIDADE` legado solto em
> `dados.habilidades` o lê como o estágio correspondente ao Nível atual, sem migração de banco.
> **Achado só na verificação ao vivo:** o editor da Habilidade de Personalidade (novo `p-dialog`,
> sem `[appendTo]="'body'"` — mesmo padrão do editor de Origem) não abria de verdade no mobile
> (360px): `.p-dialog` ficava com `position: static` e altura zero, "visível" no DOM mas sem
> bounding box — o editor de Origem tem o mesmo defeito latente (fora de escopo desta task, não
> corrigido). Fix local só no diálogo novo: `[appendTo]="'body'"`. Também achado: reusar
> `.guia__subsecao-ajuda` (margem superior negativa, pensada para colar num `.guia__subsecao`) fora
> desse contexto sobrepunha o texto de ajuda já existente do campo de Personalidade no passo
> Identidade — trocado por um segundo `<small class="campo__ajuda">` dentro do mesmo `<label>`.
> Testado: shared 722/722 (+13), frontend 1315/1315 (+15), backend 445/445 (sem mudança); lint
> limpo nos três. Verificado ao vivo (Playwright, `1920×1080`/`360×800`, agente Nível 14 real via
> guia completo até Habilidades/Identidade + ficha REST-seed em Nível 14): os 3 blocos sempre
> visíveis no guia, texto do papel do Mestre na Identidade, seletor da aba Extras restrito às
> Fortificações desbloqueadas, troca de estágio espelhando a aba Habilidades, editor funcionando nos
> dois viewports depois do fix. **Correção pós-implementação, mesmo dia:** o autor pediu que a
> seção saísse do passo Habilidades e fosse para o passo Identidade do guia — movida para o fim do
> bloco visual da Personalidade, antes da Origem, no mesmo passo do campo "Traço de personalidade".
> Verificado ao vivo de novo nos dois viewports: 0 ocorrências no passo Habilidades, blocos presentes
> e sem sobreposição no passo Identidade, gate de Avançar reagindo à Base preenchida. Frontend
> 734/734 (módulo `ficha`), lint e build limpos. **2ª correção, mesmo dia:** removido o campo de nome
> livre da Fortificação (`FichaFortificacaoPersonalidadeDto` eliminado — a Fortificação reusa
> `FichaPersonalidadeEstagioDto`, mesma forma `{descricao, custoEnergia}` da Base); o nome agora é
> sempre derivado em `materializarHabilidadePersonalidade` (`personalidade` + rótulo do estágio via
> `ROTULOS_PERSONALIDADE_ESTAGIO`), inclusive retornando `null` sem a palavra de Personalidade
> definida. Os inputs "Nome"/"Nome da melhoria" saíram do guia e do editor da aba Extras; o cabeçalho
> estático de cada bloco (já usado só pela Base) passou a valer também para as Fortificações. Testado:
> shared 723/723, frontend 735/735 (módulo `ficha`), lint e build limpos; verificado ao vivo nos dois
> viewports, no guia e no editor de uma ficha real.
>
> **Cinco decisões atrás:** `m7-20` (regressão do botão
> "abrir ficha" na grade compacta do jogador, corrigida) — no desktop, com a ficha lateral do
> jogador aberta, o botão "abrir ficha" de cada cartão da Iniciativa tinha voltado a aparecer:
> `m7-12` escondia esse botão em `:host-context(.grade--compacta) .combatente { &__abrir-ficha:
> display: none; }`, e o commit `139d221` ("feat(encontro): adiciona rolagens aos avulsos",
> 2026-08-22) removeu essa regra sem intenção ao dar suporte a `&__rolar-avulso`. A correção **não**
> reintroduz a regra dentro de `.grade--compacta` (essa classe também cobre a grade do mestre
> compactada por quantidade — `colunasGrade() > 3` —, cenário em que o mestre não tem substituto
> lateral e o botão precisa continuar); em vez disso usa
> `:host-context(.iniciativa-tela--dividida) .combatente__abrir-ficha { display: none; }`, já que
> `.iniciativa-tela--dividida` só existe quando `mostrarFichaLateral()` é verdadeiro (nunca pro
> mestre). Puramente CSS, sem teste unitário (JSDOM não avalia media query), lint limpo. Verificado
> ao vivo (`1920×1080`, dois usuários reais via REST, encontro com 9 combatentes pra também acionar
> a grade compacta do mestre por quantidade): jogador com ficha lateral não vê nenhum botão "abrir
> ficha" na grade; mestre, na mesma grade compacta mas por quantidade, continua vendo o botão no
> cartão que tem ficha. Sanidade em `360×800` confirmou que o mobile (fora do escopo da regra, que
> vive só no breakpoint desktop) não mudou.
>
> **Seis decisões atrás:** `m3-77` (ficha aberta reage por
> socket a rolagem feita em outro caminho — histórico + `BandejaDados`) — quem está com
> `visualizar.page.ts`/`visualizar-criatura.page.ts` aberta passa a ver, sem F5, uma rolagem
> `PUBLICA` feita por outra aba do dono, pelo mestre ou pelo Encontro. Backend:
> `CampanhaGateway.emitirRolagemRegistrada` ganhou duas salas **mutuamente exclusivas** — com
> campanha, só `campanha:<id>` (como sempre); ficha solta (m3-28, sem campanha), só `ficha:<id>`, a
> única sala que ela tem (antes era no-op). Emitir nas duas ao mesmo tempo duplicaria o evento pra
> quem está nas duas salas simultaneamente (`campanha/detalhe`, que já ingressa o mesmo socket nas
> duas por ficha visível). Frontend: as duas páginas entram também em `campanha:<id>` quando a ficha
> pertence a uma (reaproveita `entrarSalaCampanha`) e assinam `rolagemRegistrada$` filtrado por
> `fichaId`. **Bug pego só ao clicar de verdade contra o stack real, não pelos testes nem por um POST
> isolado via REST**: a bandeja abria **duas vezes** pra quem acabou de rolar — o eco do broadcast
> podia chegar **antes** da resposta HTTP do próprio POST, quando o histórico local ainda não tinha o
> `id` real pra deduplicar. Fix: `FichaRolagemRegistroService` ganhou `enviando$`/`finalizada$`
> (antes/depois do REST); as páginas contam rolagens "em voo" por ficha e o handler remoto pula a
> bandeja enquanto o contador > 0 (não dá pra usar `usuarioId` pra isso — quebraria o caso "mesmo
> dono, outra aba", onde a aba que só observa **deve** abrir a bandeja mesmo sendo o mesmo usuário).
> Testado: backend 445/445 (+3), frontend 1306/1306 (era 1297, +9); lint limpo nos dois. Verificado
> ao vivo (`1920×1080`/`360×800`, dois usuários reais + REST, `dados` de ficha/criatura clonados de
> fichas reais do banco de dev pra passar a validação de domínio): 6 cenários — campanha (mestre rola
> por fora), clique real na própria tela sem duplicar, criatura, ficha solta no mobile, `PRIVADA` não
> vaza a terceiro sem acesso, e duas abas reais do mesmo dono (uma só observa, outra rola de
> verdade). Ver `[[m3-31-sem-fusao-automatica-de-efeitos-na-rolagem]]` (irmã de tema, não de causa) na
> memória do agente.
>
> **Sete decisões atrás:** `m3-76` (mod custom ganha peso próprio, exceção ao padrão de +0,2 do
> sistema) — `pesoCustom?: number` em `ModificacaoAplicadaDto`/`ModificacaoItemDto`
> (`shared/regras/compras`), devolvido por `obterPesoModificacao` só quando a mod não tem
> correspondência no catálogo; form de mod custom (`ficha-inventario`) ganhou o campo opcional.
> **Bug pego só na verificação ao vivo**: `montarItemInventario` tinha uma terceira chamada a
> `obterPesoModificacao` (badge do card) que nunca recebia `pesoCustom`, caindo sempre no padrão —
> nenhum teste unitário cobria essa função específica (motor e total do carrinho já estavam certos).
> Corrigido + teste de regressão no `.ficha-inv__peso` do DOM. Também ajustado ao testar ao vivo:
> layout do form de mod custom junta nome/limite/peso numa linha no desktop, empilha no mobile.
> Testado: shared 163/163, frontend 1297/1297 (+4); lint limpo. Ver
> `[[verificacao-visual-pega-bug-silencioso-de-exibicao]]` na memória do agente.
>
> **Oito decisões atrás:** `m3-75` (spec pós-milestone, pedido
> direto do autor: "na criação de ficha de agente, fazer trim em todos os campos de texto") — todo
> campo de texto livre do passo "Identidade" (`personalidade`, `origem.nome/.descricao/
> .saberDeCampo`, cada `formacao[].texto/.parametro`, `especialidade.gatilho/.efeito`) só usava
> `.trim()` para **validar** `passoValido()`, nunca para persistir; um valor como `" Firme "` chegava
> intacto na ficha final (só `nome` e `fortificacao[].nome/.descricao` já eram trimados antes desta
> task). Fix: `criar.page.ts` ganhou `origemTrimada()` (mapeia `FichaOrigemDto` trimando cada campo,
> item a item no array de `formacao`), chamado só no ponto único de montagem em `criar()` —
> nenhum `.trim()` foi movido pros setters de digitação, preservando espaço temporário enquanto o
> usuário ainda escreve. Sem utilitário compartilhado novo (a spec pediu explicitamente para não
> antecipar essa extração). `passoValido()` não mudou — seu próprio trim de validação (incluindo o
> veto a espaço interno de `personalidade`) já rodava sobre uma cópia separada. Testado: 1 novo caso
> em `criar.page.spec.ts` (string simples + item de array, confere que o estado em edição continua
> cru e que o payload de `criarFicha()` chega trimado); suíte completa do frontend 1293/1293 (era
> 1292, +1); lint limpo. Sem impacto visual — mudança pura de montagem de payload, nenhum
> template/estilo tocado.
>
> **Nove decisões atrás:** ajuste avulso no catálogo do passo
> "Equipamento inicial" do guia (`GuiaEquipamentoLoja`, pedido direto do autor, mesmo dia de
> `m3-73`/`m3-74`) — as abas de categoria (Corpo a Corpo/Explosivos/Armas de Fogo/…) usavam os
> emojis crus de `CATALOGO_CATEGORIAS` (`shared/regras/compras`), o único ponto do catálogo de
> compras que ainda fazia isso: `ComprasPage`, `FichaInventario` e `InventarioEsquadrao` já usam
> `app-icone` com um `ICONES_CATEGORIA` local (mesmo padrão "definido localmente pra manter o módulo
> desacoplado" da `ficha-inventario`) — proibição #29 (emoji cru é proibido pelo tema "Terminal de
> Contenção"). Fix: `GuiaEquipamentoLoja` ganhou o mesmo `ICONES_CATEGORIA` local + `app-icone`.
> Aproveitado o pedido pra alinhar mais dois pontos ao mesmo análogo (`FichaInventario`): a busca de
> item subiu pra **antes** das abas de categoria (não mais depois), e passou a cruzar **todas** as
> categorias quando tem termo digitado — antes só filtrava dentro da aba ativa; agora, igual ao
> catálogo do Inventário, a busca independe de categoria selecionada e as abas ficam desabilitadas
> enquanto ela está preenchida (`cartoesCatalogo` virou `{item, categoria}[]` — `adicionar()` passou
> a receber a categoria do próprio resultado, não mais `categoriaAtiva()`, que ficaria errada num
> resultado de outra aba). Novo spec (`guia-equipamento-loja.component.spec.ts`, 4 casos). Verificado
> ao vivo (Playwright) em `1920×1080`/`360×800`: ícones corretos em todas as abas, busca por
> "Pistola" (Armas de Fogo) enquanto a aba ativa era Corpo a Corpo encontrou o item e adicionou com a
> categoria certa.
>
> **Dez decisões atrás (mesmo dia):** `m3-73`/`m3-74` (dois ajustes
> avulsos do guia de criação, mesmo dia) — `m3-73` corrigiu o seletor de habilidades do passo
> "Habilidades": a aba ativa (Gerais/Classe/Subclasse/Arquétipo) voltava sozinha pro primeiro grupo
> a cada "+" clicado, porque `abaAtiva`/`subgrupoAtivo` eram `linkedSignal`s na forma básica,
> sensíveis à *referência* de `grupos` (recriada a cada `adicionarMelhoria`), não só ao conteúdo.
> Fix: forma avançada `linkedSignal({source, computation})` com `source` = chave estável dos
> ids/chaves de grupo, preservando a aba/subgrupo corrente enquanto ainda existir no `grupos()`
> atual — reset só quando o conjunto muda de fato (troca de vaga/classe/arquétipo). `m3-74` deu ao
> passo "Recursos" um botão **"Não rolar dinheiro inicial"** ao lado de "Rolar dados"
> (`ignorarRecursos()`, `criar.page.ts`) — grava `{dados:[],inicial:0,rolado:true}`, mesma trava de
> escolha única da rolagem normal, ficha final com $0 (mais `bonusMonetario()` de Prestígio, se
> houver). O kit de "Equipamento inicial" já era opcional (`m3-59`); só faltava esse caminho pro
> dinheiro. Verificado ao vivo (Playwright): guia completo Base→Revisão→Criar ficha ignorando o
> dinheiro em `1920×1080`/`360×800`, e a aba do seletor permanecendo em Arquétipo por duas adições
> seguidas. Ver `HISTORY.md` para o detalhe de causa raiz dos dois.
>
> **Onze decisões atrás:** `m4-11` (task adicional do M4, fora da fila `m4-05`…`m4-10`) — o acervo
> (`/fichas`) deixou de listar agentes e criaturas
> misturados. A tela agora separa por tipo em blocos (`AGENTES`/`CRIATURAS`, NPC estruturalmente
> pronto e desligado até `m4-07`/`m4-08`), com um `<select>` de visão (Todos/Agentes/Criaturas) —
> em "Todos" cada bloco trava em ~2 linhas de card com scroll interno e fade (`appOverflowFade`);
> num tipo filtrado, o bloco usa a altura toda. O card virou um componente único extraído
> (`CartaoFichaAcervo`, `frontend/.../ficha/componentes/cartao-ficha-acervo/`) com recorte por
> tipo — agente mostra classe/arquétipo/nível/**Patente** (que faltava antes); criatura mostra
> Ameaça/NA/VD/Vida/Defesa. Destrava também **criar criatura fora de campanha**
> (`FichaCriaturaCriarDto.campanhaId: number | null`, botão "Criar criatura" visível só a quem é
> mestre de alguma campanha — backend exige o mesmo via
> `CampanhaRepository.contarCampanhasComoMestre`); as rotas `/fichas/criatura/nova`/`:id` reusam
> `CriaturaCriar`/`CriaturaVisualizar` com `campanhaId` opcional, mesmo padrão de
> `FichaCriar`/`FichaVisualizar` (m3-28). Dois defeitos vivos alcançáveis pelos mesmos controles do
> acervo foram corrigidos junto: `duplicarFicha` tipava sempre `JOGADOR` (uma criatura duplicada
> nascia agente com `dados` de criatura); e `atribuirCampanha` emitia `ficha:criada` (forma de
> jogador) pra criatura/NPC também, vazando nome/vida pela sala `campanha:<id>` antes de qualquer
> revelação — agora atribuir criatura/NPC exige que o dono seja **mestre** da campanha-alvo (não só
> membro) e nunca emite esse evento. Verificado ao vivo (Postgres+backend+frontend reais, dois
> usuários): a sala não vaza a criatura atribuída (com sanity check confirmando que o listener
> funciona — atribuir um agente emite normalmente); e o fluxo completo funciona ponta a ponta
> (criar solta pela UI → aparece com chip "Sem campanha" → abre em `/fichas/criatura/:id`).
>
> **Doze decisões atrás:** correção pós-`m7-17` — a ficha
> flutuante do Encontro (`FichaFlutuanteConteudo`) ajusta Vida/Energia/Condições da ficha pela
> `FichaEdicaoService` genérica (`FichaService.alterarVitalidade`/`alterarFicha`), que só emite
> `ficha:alterada` na sala `ficha:<id>` — sala que o painel de Iniciativa nunca ouve (só escuta
> `encontro:alterado` em `campanha:<id>`). Resultado reportado pelo autor: mudar Vida/Energia/
> Condição pela ficha flutuante durante um combate não atualizava os cartões da Iniciativa em
> **nenhum** cliente conectado (mestre ou jogador) até a próxima ação que passasse pelo
> `EncontroService` (avançar turno, ajuste pelo próprio cartão). Corrigido sem tocar a fonte única
> (Vida/Energia/Condições continuam vivendo na ficha, escritas pela `FichaService`):
> `CampanhaGateway.emitirFichaAlterada` agora, depois do broadcast de sempre, chama
> `EncontroService.sincronizarFichaAlterada(fichaId, campanhaId)` — novo método que localiza o
> encontro aberto (`MONTAGEM`/`ATIVO`) da campanha, confirma que a ficha é combatente dele e, só
> então, remonta e retransmite `encontro:alterado` (reaproveita `montarEstado`/
> `montarEstadoParaUsuario`, sem duplicar a regra de revelação §14). O gateway não decide nada
> sozinho (proibição #25) — só encaminha ao service dono da regra. Novo `forwardRef` mútuo
> `GatewayModule` ↔ `EncontroModule` (mesmo padrão já usado com `FichaModule`/`CampanhaModule`);
> `FichaModule` continua sem saber que `encontro` existe. Ver "Tempo real" (seção 4).
>
> **Treze decisões atrás:** `m7-17` (retoque no mesmo dia) — o dialog "Receber dano" ganhou uma grade
> com cabeçalho único (Dano/Ficha/Custom) em vez de rótulo por campo em cada uma das cinco linhas,
> e o mobile deixou de empilhar cada célula (o que alongava o dialog e quebrava a leitura
> coluna↔coluna) — continua tabela, só mais estreita. O cartão da Iniciativa passou a mostrar a
> mesma faixa compacta de resistência a dano que a ficha mostra
> (`EncontroCombatenteResumoDto.resistencias`, calculado no mapper do encontro a partir da ficha já
> carregada — `montarResistencias` pro agente, soma de `resistencias` pra criatura — e ocultado pela
> mesma regra de revelação das outras defesas), e o dialog aberto por esse cartão agora recebe essa
> resistência automaticamente (antes só o campo custom existia ali). Achado em verificação ao vivo:
> a linha "Geral" do dialog mostrava sempre `—` na coluna Ficha mesmo com resistência Geral
> definida — o número era aplicado no cálculo (silenciosamente correto) mas nunca exibido; corrigido
> e coberto por teste de regressão.
>
> **Quatorze decisões atrás:** `m7-16` — na tela de Iniciativa, um agente (`JOGADOR`) de ficha **não
> oculta** (m3-65) mostra avatar/dono/classe-arquétipo pra qualquer membro, mesmo sem
> `usuario_ficha_acesso` (só os números continuam atrás da concessão; nível fica de fora — a
> carteirinha identifica, não avalia a força — e sem ela não desenha "Vida —"); mais 4 ajustes de UI
> no mobile (nome dos cards, bug do minimizar, minimizar=fechar, cabeçalho reorganizado em dois
> grupos) — ver seção 1.
>
> Este arquivo diz **o que é verdade agora**. Ele é **reescrito**, nunca acrescido — teto de
> ~400 linhas. O relato de *como se chegou aqui* está em [`HISTORY.md`](HISTORY.md).
>
> Vizinhos: [`PROBLEMS.md`](PROBLEMS.md) (o que está quebrado) ·
> [`MEMORY.md`](MEMORY.md) (onde fica o quê) · [`IDEAS.md`](IDEAS.md) (o que ainda não é sistema) ·
> [`HISTORY.md`](HISTORY.md) (o que aconteceu e por quê).

---

## 1. Próxima Task

**Ajuste avulso (pedido direto do autor, 2026-08-25, sem número de milestone) concluído** — item
custom ganha a categoria de sistema `SEM_CATEGORIA`, pra registrar item sem categoria mecânica real
(modificação solta, papel/documento, objeto narrativo) sem mentir escolhendo uma categoria real que
não descreve o item. Ver "Ficha de jogador" (seção 4) e `HISTORY.md` para o relato completo.

**Ajuste avulso (bug reportado direto pelo autor, 2026-08-24, sem número de milestone) concluído**
— a média de Nível/Prestígio do esquadrão não chegava ao primeiro agente de um jogador comum numa
campanha que já tinha agentes de outros jogadores. Ver o bloco no topo do arquivo e
`HISTORY.md` para o relato completo.

**`m7-19` (ajuste avulso pós-M7, o mestre pode sobrescrever a expressão de dados de Iniciativa por
combatente/encontro) concluída** — ver o bloco no topo do arquivo. Fecha a fila de ajustes avulsos
do M7 (`m7-18`…`m7-19`, todos concluídos). Não há próxima task numerada aberta no M7; a única frente
de código ainda aberta é o **M4** (`m4-05`…`m4-10`), ao lado de `m3-53` (M3) — nenhuma delas tem
spec ativa no momento.

**`m7-18` (ajuste avulso pós-M7, "Rolar tudo" do mestre passa a somar o dado extra de Iniciativa de
Formação da Origem) concluída** — ver "Três decisões atrás" no bloco do topo do arquivo.

**`m3-78` (ajuste avulso pós-M3, Habilidade de Personalidade ganha 3 estágios com custo em Energia)
concluída** — ver "Guia de criação de ficha" (seção 4). Fecha a fila de
ajustes avulsos do M3 (`m3-73`…`m3-78`, todos concluídos); resta só `m3-53` na fila normal do M3.

**`m7-20` (ajuste avulso pós-M7, regressão do botão "abrir ficha" na grade compacta do jogador)
concluída.**

**`m4-11` (task adicional do M4, fora da fila `m4-05`…`m4-10`) concluída** — acervo separado por
tipo, "Criar criatura" solta e os dois defeitos de `duplicarFicha`/`atribuirCampanha` corrigidos;
ver o bloco no topo do arquivo e a seção 4 ("Ficha de jogador"/"Ficha de criatura"). Não avança a
fila `m4-05`…`m4-10` — a próxima task numerada do M4 continua sendo `m4-05` (NPC).

O **M7 — Encontro de Combate** está **concluído**, incluindo os oito ajustes de pós-milestone: as 8
tasks originais (`m7-01` contrato, `m7-02` motor puro, `m7-03` backend de montagem, `m7-04` backend
de condução + tempo real, `m7-05` painel do mestre, `m7-06` visão do jogador, `m7-07` log da
rodada, `m7-08` refinamento mobile) mais `m7-09` (turno atual do jogador), `m7-10` (histórico de
rolagens), `m7-11` (identidade dos cartões), `m7-12` (layout desktop), `m7-13` (acesso pela
campanha), `m7-14` (dialog de ficha), `m7-15` (ações mobile do jogador), `m7-16` (identidade "de
carteirinha") e `m7-17` ("Receber dano") — todas entregues. O
**M6 — Gestão de Usuários** também está **concluído**: `m6-08` (impersonação administrativa) fechou
a última extensão do milestone. A única frente aberta agora é o **M4** (Ficha de Criatura/NPC —
restam `m4-05`…`m4-10`), ao lado de `m3-53` (M3).

**Identidade do avulso (ajuste pós-M7, 2026-08-22).** Criar um avulso na Iniciativa exige uma cor
e aceita imagem opcional; ambas persistem no próprio `encontro_combatente`
(`cor_avulso`/`imagem_url_avulso`, migration 0023), porque o avulso não tem ficha. O modo "Editar
combatentes" troca a cor, substitui a imagem e remove a imagem. Formatos/limite seguem os avatares
de ficha (JPEG/PNG/WEBP, 2MB), inclusive limpeza do blob anterior. `EncontroCombatenteResumoDto`
continua expondo a forma unificada `corFicha`/`imagemUrl`: o mapper escolhe ficha ou avulso pela
origem, e o cartão não duplica apresentação. Em `360×800`, os três controles de identidade têm
alvo de 44×44px. No cartão editável, eles ficam sob o retrato: troca/remoção de imagem na primeira
linha e troca de cor centralizada na segunda, sem sobrepor a foto.

Fora da edição, o mestre também vê um atalho de dados ao lado do nome do avulso. Ele abre um painel
compacto de expressão livre, sempre iniciado como **Rolagem oculta**; revelar as próximas rolagens
pede a mesma confirmação usada por criaturas, e voltar a ocultar é imediato. O resultado usa o
motor compartilhado, a bandeja e o feed da campanha, identificado pelo nome/cor do avulso. Como não
há ficha, atributos, `PROF` e `NIV` são rejeitados. Desde a migration 0024, `rolagem` referencia
exatamente uma origem: `ficha_id` ou `encontro_combatente_id`; somente o mestre da campanha pode
registrar a segunda forma. A própria Iniciativa renderiza a bandeja central mesmo com o histórico
recolhido; o botão confirma cada execução com **Rolado** e um pulso curto. No mobile, o painel de
expressão sobe enquanto a carta de resultado está presente, evitando sobreposição entre os dois.
O painel pode ser arrastado pelo cabeçalho e permanece limitado à viewport; **Rolar** tem borda,
hover e cursor de botão. Toda carta da bandeja identifica a execução como **Privada** ou **Pública**
a partir do mesmo estado usado no registro. A confirmação pública do avulso segue o diálogo
canônico da criatura. Na visão do mestre, todo combatente com `fichaId` oferece **Abrir ficha**
mesmo quando está oculto, o encontro não permite ajustes ou a grade usa o recorte compacto de quatro
ou mais colunas; somente avulsos, que não possuem ficha, omitem a ação.

`m7-10` e `m7-11` já tinham sido implementadas de fato no commit `4ea026d` (`feat: refina tela de
iniciativa`, que também fechou `m7-09`), mas o registro em `HISTORY.md`/`CONTEXT.md` e o gate visual
obrigatório ficaram pendentes até esta sessão. `m7-10` reusa `HistoricoRolagensSidebar` no
cabeçalho de `PainelEncontro` (`rolagensFeed()`, carga inicial via `RolagemService.listarPorCampanha`
+ atualização ao vivo por `FichaRolagemRegistroService.registrada$`/`TempoRealService.
rolagemRegistrada$`), sem duplicar consulta ou regra de visibilidade — uma rolagem `PRIVADA` nunca
chega a quem não tem acesso, nem por REST nem por socket, confirmado ao vivo (mestre, jogador dono
da rolagem e um terceiro membro sem acesso). `m7-11` fez `CartaoCombatente` exibir `imagemUrl`/
`imagemFoco` da ficha (com `FocoImagem`, mesmo padrão de enquadramento de `m3-62`) quando existem,
sem espaço quebrado em combatente avulso ou sem imagem; o backend (`encontro-combatente.mapper.ts`,
`encontro-revelacao.ts`) já propagava e ocultava a imagem junto com os demais números protegidos
pela revelação (§14) — confirmado que uma criatura não revelada nunca vaza a própria imagem a um
jogador sem acesso, mesmo quando o nome permanece visível (identidade mínima da ordem de turno,
regra pré-existente de `m7-06`). O card "Sua Iniciativa" citado na spec nunca chegou a existir no
código — o indicador de turno próprio já tinha sido resolvido por `m7-09` (faixa "Sua vez").

**`m7-16` (feedback ao vivo do autor, mesmo dia) refinou essa regra especificamente pra agente.**
A frase acima ("criatura não revelada nunca vaza a própria imagem") continua valendo à risca pra
criatura/NPC e pra um agente cuja própria ficha está `oculta` (m3-65) — mas um agente de ficha
**não oculta** deixou de ser tratado como segredo: a mesma identidade "de carteirinha" (avatar,
dono, classe-arquétipo — nível fica de fora, a carteirinha identifica quem é o agente, não avalia
sua força) que `CampanhaRepository.listarMembros` já mostra fora do encontro pra qualquer ficha
não oculta agora também chega na Iniciativa, mesmo sem `usuario_ficha_acesso` (que é sobre abrir a
ficha **inteira**, não sobre saber quem está na mesa). Só os **números** (vida, defesas, condições,
Destreza) continuam atrás da concessão de sempre — e sem eles o cartão não desenha mais nem um
placeholder "Vida —" (a linha de recursos inteira só entra no DOM quando há número pra mostrar).
Mecanicamente: o repositório do encontro ganhou `ficha.oculta`/`usuario.nome` (`LEFT JOIN
usuario`); `EncontroService` calcula um segundo conjunto, `fichaIdsIdentidadeVisivel` (ficha não
oculta), ao lado do de sempre (`fichaIdsVisiveis`, de `FichaService.listarFichas` — a fonte da
regra dos números, intocada, proibição #28); `encontro-revelacao.ts` usa os dois pra decidir o que
cada combatente preserva. `CartaoCombatente.identidadeVisivel` (computed) e a linha de origem
(`donoNome` + `rotuloClasseCompleto(classe, arquetipo)` em duas linhas, `\n` + `white-space:
pre-line`, mesmo rótulo "Combatente - Lutador" do mini-card do Esquadrão) seguem esse recorte no
front — a etiqueta do topo usa o estado de turno normalmente nesse caso (a ordem sempre foi
pública). Junto, três ajustes de UI mobile: nome do
cartão parou de quebrar entre os botões (linha própria, `flex-basis: 100%`), minimizar a ficha
flutuante parou de deixar um selo `position: fixed` preso sobre um cartão (no mobile
`recolher()` chama `fechar()` — sem janela pra recolher a um canto lá, as duas ações viram uma só),
e o cabeçalho da Iniciativa (`.iniciativa__acoes`) virou dois grupos — status/navegação do
encontro e utilitários da sessão — que no mobile empilham em ordem fixa, sem saltar de posição.

**`m7-17` — "Receber dano" (tomador de dano facilitado, pedido direto do autor).** Regra pura
`calcularDanoRecebido` (`shared/regras/encontro/receber-dano.ts`): os quatro tipos bloqueáveis
reduzem por `resistenciaFicha + resistenciaCustom` (piso 0), a resistência **Geral** reduz a soma
dos residuais **uma única vez** (não por linha), e o dano **Geral** é irredutível. `ReceberDanoDialog`
(`frontend/shared/receber-dano/`) é reaproveitado em três entradas: cartão do combatente
(`CartaoCombatente`, mestre-only, mesma `podeAjustar` dos steppers; sem `resistenciasFicha` — o
resumo do encontro não carrega a ficha completa), e o rótulo "Vida" da ficha de agente
(`resistenciasFicha` de `montarResistencias`) e de criatura (soma de `dados().resistencias` por
tipo). Confirmar só emite o total efetivo; quem hospeda abate a Vida — cartão via `vidaAjustada`
(grava o log `DANO` já existente, sem detalhamento por tipo), fichas via `ajustar()`/`ajustarVida()`
locais (sem log). **Achado na verificação ao vivo:** dano maior que a Vida atual gerava delta que o
backend rejeita (`ajustarVida`/`alterarVitalidade` recusam Vida negativa) — corrigido clampando o
delta no cartão do combatente (`Math.min(total, vidaAtual)`; as fichas já estavam protegidas por
`clamparVitalidade`/`Math.max(0, …)`). Verificado em `1920×1080`/`360×800`.

`m6-08` também já estava implementada (ver a entrega completa na seção 4, "Autenticação e conta");
só faltava a captura em `1920×1080` (o `360×800` já tinha sido confirmado em 2026-08-12) — feita
nesta sessão, incluindo o fluxo completo (login → "Logar como" → confirmação → sessão trocada →
`/painel` → rota exclusiva de `ADMIN` recusada para a sessão impersonada).

Na `m7-09`, `PainelEncontro` passou a derivar `ehMinhaVez` somente do estado de encontro já
recebido e da ficha do usuário ativo. A `m7-12` usa esse estado para exibir a única ação de condução
do jogador: **Avançar turno**, apenas na própria vez. O backend confirma que o combatente do slot
atual pertence à ficha do usuário; chamadas fora da própria vez são recusadas. O mestre preserva
todos os controles existentes.

Ainda na `m7-12`, o shell desktop permanece estritamente em `85vw`. Só a grade da visão dividida do
jogador usa cartões compactos em duas colunas; três linhas ficam inteiras antes da rolagem interna.
O bloco de controles não é renderizado quando não há ação disponível, eliminando a barra vazia. O
botão de abrir ficha também some desses cartões no desktop, pois a ficha já está aberta ao lado. O
breakpoint mobile restaura explicitamente a grade canônica de uma coluna e mantém esse acesso.

Na `m7-13`, o link **Iniciativa** da visão do jogador saiu do menu `⋯` de ações da ficha e passou
ao cabeçalho do card **Sessão**, junto do contexto em que é usado. O link mantém ícone, tooltip e
rota; o mestre conserva seu menu e o tile Combate, e nenhuma regra de encontro foi alterada.

Na `m7-14`, a ficha aberta pela Iniciativa ganhou o respiro lateral de `--pad-card`; em mobile,
`.ficha-flutuante__corpo` é a única superfície com rolagem vertical e reserva espaço para a navegação
fixa da ficha. A ficha de jogador recebe `rolagemExterna` apenas nesse hospedeiro, removendo o teto
do painel interno que de outro modo criaria uma segunda barra vertical. Cabeçalho, fechamento,
foco e navegação interna permanecem no mesmo componente.

Na `m7-15`, o jogador com combatente próprio ganhou o atalho mobile **Minha ficha**, fixo acima de
avisos e resultados transitórios e ausente no desktop. Ele reaproveita a abertura da ficha do cartão.
Dentro de `FichaFlutuante`, o destino mobile **Rolagens** mantém o painel interno quando esse
hospedeiro o disponibiliza; a execução e o registro seguem em `FichaRolagensPainel` e nos serviços
existentes. A ficha aberta por usuário apenas visualizador recebe `podeRolar = false`, portanto não
exibe rolagem rápida nem presets; não foram adicionados controles de condução.
Quando o mestre abre uma ficha a partir da Iniciativa no desktop, a mesma janela inicia limitada à
viewport em `1100×600`; jogador conserva a geometria compacta e o mobile continua em tela cheia.

O módulo de frontend é `frontend/src/app/modules/encontro`. A tela "Iniciativa" é **uma só**
(`PainelEncontro`, rota `/painel/:campanhaId/iniciativa`, com `:encontroId` opcional para o
histórico) e bifurca por `ehMestre()`; o jogador é espectador, escreve a própria iniciativa e pode
encerrar somente o turno da própria ficha.
Quem desenha o log é `componentes/log-encontro` — componente **burro**, alimentado pelo
`eventos` que já vem dentro do `EncontroRecuperadoDto`. Ele respeita a **revelação** por não fazer
nada: o log chega recortado do backend (`encontro-revelacao.ts` descarta evento preso a combatente
que o usuário não pode ver), e o painel **não** filtra de novo.

Atenção ao emitir eventos novos do encontro: `CampanhaGateway.emitirEncontroAlterado` é
**por socket**, não um `emit` de sala, porque o payload carrega o que o mestre ainda não revelou.
Qualquer evento novo que carregue estado de combatente precisa do mesmo cuidado.

**Como o recorte mobile do Encontro é feito (`m7-08`) — vale como padrão para telas novas.** Nenhum
componente consulta `matchMedia`: o que existe é um **sinal de intenção** (`ajustando` no cartão,
`aberto` no log, `acoesAbertas` na página) que **só o CSS do breakpoint mobile consome**. No
desktop as mesmas regras deixam tudo visível e o sinal fica inerte. Onde o texto muda com a
largura (`Energia`/`En`, `Defesa`/`Def`), **os dois rótulos ficam no DOM** e o `display: none`
escolhe — o escondido também sai da árvore de acessibilidade, então nada é lido duas vezes. Em
360px: cabeçalho condensado `R3 · T3/6`, cartão enxuto com os steppers atrás de `Ajustar`, ações
secundárias atrás de `Mais ações`, log recolhido atrás do próprio gatilho, e `Avançar turno`
(ou `Iniciar combate`) numa barra `position: fixed` no rodapé — mesma receita do rodapé do guia de
criação de ficha, inclusive o `z-index: 20`.

O gate visual obrigatório (skill `verify`, 1920×1080 e 360×800, **dois usuários simultâneos**) foi
cumprido em `m7-05`, `m7-06`, `m7-07` e `m7-08`, e vale para cada tela nova.

**Ambiente sem Docker.** O `npm run db:up` depende do daemon do Docker; onde ele não existe, dá para
subir o Postgres 16 local direto (`initdb`/`pg_ctl` como usuário `postgres`) e seguir com
`db:migrate` normalmente. Já o `npm run db:seed:dev` está **quebrado** desde a coluna
`usuario.tipo_usuario_id` do M6 (`P-023`) — para montar cenário de
verificação, use a API REST em vez do seed.

O M4 (Ficha de Criatura/NPC) foi **aberto** em sessão anterior: `m4-ficha-criatura-npc.spec.md`
(`docs/specs/backlog/`) foi dividido em **10 tasks numeradas** (`m4-01`…`m4-10`,
`docs/specs/backlog/`), seguindo o design já fechado em `SCHEMA.md` a partir do capítulo
"Guia de Criação de Ameaças"/"Guia de Criação de NPCs" (`docs/core/guia_de_mestre-v4.0.0.md`).
A frente de **criatura** vem primeiro (`m4-01`…`m4-04`), depois **NPC** (`m4-05`…`m4-08`), e as
duas últimas (`m4-09` listagem/revelação no painel do mestre, `m4-10` refinamento mobile) cobrem
os dois tipos juntos. `m4-01` (contrato `FichaCriaturaDadosDto`,
`shared/src/dtos/ficha/ficha-criatura.dtos.ts` + 11 enums novos de conteúdo de jogo), `m4-02`
(`shared/regras/criatura` — motor de regras puro do roteiro de criação de Ameaças, 10 módulos
de fórmula + `validarFichaCriatura` + caso de teste completo "A Estátua"), `m4-03`
(`backend/ficha` estendido para `CRIATURA`: criação restrita ao mestre, dono sempre o mestre,
sempre dentro de campanha, validação via `validarFichaCriatura`, mesmos mecanismos de
permissão/visibilidade/tempo real do M3) e `m4-04` (assistente de criação de criatura no
frontend, `/painel/:campanhaId/criatura/nova`) **concluídas**. Ao montar "A Estátua" como caso
de teste (`m4-02`), duas divergências internas do próprio documento entre a fórmula geral e os
números literais do exemplo foram identificadas (modificador Fraco em VD 30; mínimo de
Fraqueza) — resolvidas com a fórmula geral vencendo, documentadas em
`shared/src/regras/criatura/modificadores.ts` e `a-estatua.spec.ts` (ver seção 6). A `m4-03`
decidiu DTOs de operação **próprios** para criatura (`FichaCriaturaCriarDto`/`*CriadaDto`/
`*RecuperadaDto`/`*AlteradaDto`, `shared/src/dtos/ficha/ficha-criatura-operacao.dtos.ts`) em
vez de unir com os contratos de jogador — mesma lógica de "dois contratos, não um" já fechada
em `m4-01` para o documento de jogo (ver seção 6). A `m4-04` verificou ao vivo que abrir a
ficha recém-criada em `/painel/:campanhaId/ficha/:id` (`FichaVisualizacao`, telas de jogador)
quebrava com `TypeError` — resolvido com uma tela dedicada, `CriaturaVisualizacao` (ver seção 7).
Entre a `m4-04` e a `m4-05`, várias sessões de **polimento de UI** fora da fila de specs (pedido
direto do autor, não tasks numeradas): `m4-04b` revisou o assistente de criação de criatura
(upload de imagem, espaçamento entre campos) e o painel do mestre (botões "Nova Criatura"/"Novo
Agente", tira de estatísticas reduzida a "Convite", coluna Esquadrão dividida com a subseção
"Criaturas" — exigiu expor `tipo`/`na` em `FichaResumoDto` e ajustar
`FichaRepository.colunasResumo` para os dois formatos de `dados`), construiu a tela dedicada
`CriaturaVisualizacao` citada acima e, em 2026-08-15, realinhou o layout dela a um mockup
reconstruído pelo autor (`docs/design/examples/ficha-de-criatura.html`) — de coluna única
numerada pra dashboard de 3 colunas com abas, mesmo shell de `FichaVisualizacao` (ver seção 4);
`m4-04c` trocou o bloco único "Base do VD" do passo // Atributos por 3 cards (Base/Limite/Pontos
de Ajuste), deu ao card de Pontos de Ajuste um contador real que trava o avanço em saldo 0 (mesmo
padrão do guia de jogador) e corrigiu o corte do botão "+" do stepper no mobile (ver seção 4).
Próxima da fila M4: **`m4-05`** (contrato `FichaNpcDadosDto`, início da frente de NPC).

O M6 **concluiu** com `m6-08` (ver seção 4, "Autenticação e conta"). O trio do guia de criação
(`m3-57` base, `m3-58` melhorias de nível, `m3-59`
equipamento inicial), o complemento `m3-64`, a `m3-61` (cor de ficha) e a `m3-62` (avatar de ficha)
**concluíram** — as specs estão em `docs/specs/done/`; o que o guia faz hoje de ponta a ponta está
descrito na seção 4, em "Guia de criação de ficha". A `m3-64` resolveu o antigo `P-012`: o pacote
inicial agora é uma regra pura em `shared/regras/agente` e tem consumidor obrigatório no guia.

A `m3-72` também concluiu: Sistema e Guia do Mestre agora abrem pelo mesmo acesso global
**Documentos**, em janela flutuante no desktop e tela cheia no mobile.

`m2-18`/`m2-19`/`m2-20`/`m2-21` fecharam a frente de redesenho do painel de campanhas —
`/painel/:id` tem layout dedicado para mestre e para jogador. Fica **em aberto, por decisão do
autor**: um recorte de UI pensado especificamente para o **mobile** da visão do jogador (a `m2-21`
só adaptou o visual de desktop).

### Fila do backlog (`docs/specs/backlog/`)

| Spec | Frente | O que é |
|---|---|---|
| `m3-53` | ficha | exportar ficha em PDF fiel ao tema |
| `m4-05`…`m4-10` | criatura/NPC | 6 tasks restantes do M4 — ver seção 1 e `docs/specs/backlog/` |
| `preservar-modificacoes-inventario-esquadrao` | campanha/inventário | preservar `modificacoes` do item ao transferir ficha ↔ base (`IDEAS.md` `I-020`) |
| `descricao-modificacoes-item-inventario` | ficha/inventário | resumo textual das modificações ativas, acima da contagem de munição/cenas (`IDEAS.md` `I-021`) |
| `renomear-painel-para-campanhas` | layout/navegação/rotas | rota `/painel`→`/campanhas` (nav, redirects, guards, todo `routerLink`/`navigate`), ícone próprio de Fichas, limpar menu de perfil (`IDEAS.md` `I-019`; escopo ampliado em 2026-08-25) |
| `edicao-item-custom-inventario` | ficha/campanha/inventário | editar descrição/peso/custo de um item custom já existente (ficha e esquadrão), pedido direto do autor |

`m3-53` é a única frente de M3 ainda sem spec `done/` vinda da fila original; `m3-73`…`m3-78` eram
ajustes avulsos (pedido direto do autor, 2026-08-22) — todos **concluídos** (specs em
`docs/specs/done/`, `m3-78` fechou a fila no bloco do topo do arquivo). `m7-18`…`m7-20` eram o mesmo
tipo de ajuste avulso, pós-M7 (milestone já concluído) — todos **concluídos** (specs em
`docs/specs/done/`, `m7-19` fechou a fila; ver bloco no topo do arquivo e "Próxima Task"). As três
specs avulsas acima (2026-08-24) nasceram de `IDEAS.md` `I-019`/`I-020`/`I-021` — sem número de
milestone, a critério do autor na revisão de backlog. Milestone ainda não aberto: `m5-guia-missao`.

---

## 2. Estado Geral

Monorepo npm workspaces (`shared/`, `backend/`, `frontend/`) rodando de ponta a ponta: Angular 21
SPA → NestJS 11 REST + Socket.IO → PostgreSQL 16. **M0, M1 e M2 concluídos; M3 (ficha de jogador)
em fase de refino avançado** — a ficha lê, edita, rola dados, persiste e sincroniza em tempo real.

Deploy em produção por **integração nativa das plataformas**, sem GitHub Actions no deploy: push em
`master` → Render (backend) e Cloudflare Pages (frontend) puxam do Git sozinhos; banco no Supabase.
O GitHub Actions só roda **CI** (lint + testes nos 3 workspaces em todo PR).

**Suítes (checadas na `m6-05`):** shared 601/601 · backend 275/275 · frontend
921/921 — os 3 workspaces fecham a suíte completa hoje (`npm run test`, sem `--watch`);
`P-001`/`P-010`/`P-011` descrevem falhas que só reproduzem isoladas (arquivo único), não na suíte
completa — ver [`PROBLEMS.md`](PROBLEMS.md). Na `m6-05`, lint e builds dos três workspaces
fecharam limpos. Ver `PROBLEMS.md` `P-009` para o histórico de
falhas isoladas/preexistentes.

---

## 3. Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Fundação (workspaces, docs, Docker, `core/`, CI, deploy) | **concluído** |
| M1 | Calculadora com paridade | **concluído no código** (`m1-01`…`m1-20`). Restam 2 passos **operacionais** de plataforma — ver `PROBLEMS.md` `P-006` |
| M2 | Auth + Campanhas | **concluído**, incluindo o redesenho do painel (`m2-01`…`m2-09` + extensões `m2-10`…`m2-17`; `m2-18` lista, `m2-19` detalhe/mestre, `m2-20` detalhe/jogador, `m2-21` abas + Rolagens na lateral + menu de ficha do jogador) |
| M3 | Ficha de Jogador | **em andamento** — CRUD, editores, tempo real e rolagens prontos; guia de criação completo (`m3-57`/`m3-58`/`m3-59` — base, melhorias de nível, equipamento inicial); cor (`m3-61`) e avatar (`m3-62`) de identidade por ficha prontos; falta só `m3-53` |
| M4 | Ficha de Criatura/NPC | **iniciado** — dividido em `m4-01`…`m4-10` (`docs/specs/backlog/`); `m4-01` (contrato), `m4-02` (`shared/regras/criatura`), `m4-03` (`backend/ficha` para `CRIATURA`) e `m4-04` (assistente de criação no frontend) concluídas; `m4-04b`/`m4-04c` (polimento de UI fora da fila) também concluídas. Próxima: `m4-05` (NPC) |
| M5 | Guia de Missão | não iniciado |
| M6 | Gestão de Usuários e Papéis | **concluído** — `m6-01`…`m6-08` (`m6-08`: impersonação administrativa auditável) |
| M7 | Encontro de Combate | **concluído** — 8 tasks originais (`m7-01` contrato, `m7-02` motor puro, `m7-03` backend de montagem, `m7-04` backend de condução/tempo real, `m7-05` painel do mestre, `m7-06` visão do jogador, `m7-07` log da rodada, `m7-08` refinamento mobile) + 7 ajustes de pós-milestone (`m7-09`…`m7-15`, ver seção 1). Numeração M7 é sugestão, não decisão de roadmap |

---

## 4. O Que o Sistema Faz Hoje

> Catálogo por capacidade. O detalhe task a task (o **porquê** de cada decisão) está no
> `HISTORY.md` — busque pelo código da task.

### Motor de regras — `shared/regras/` (funções puras, zero dependências)

Dez domínios implementados e testados: `agente/` (15 fórmulas — vida, energia,
defesa/esquiva/bloqueio, proficiência, deslocamento, dano de corpo/furtivo, inventário),
`compras/` (catálogo, limites por patente, modificações, amplificadores, fragmentos, venda),
`dados/`, `descanso/`, `dt/`, `identidade/`, `novo-agente/`, `patente/`, `rolagem/` — todos
contra `docs/core/sistema-v4.1.0.md` — e `criatura/` (`m4-02`, 10 módulos de fórmula do "Guia
de Criação de Ameaças" — atributos, modificadores, saúde, defesa, resistências/fraquezas,
regeneração, deslocamento, cadência/iniciativa (Frenética declara `turnosPorRodada` >= 4, inclusive
para combatentes avulsos; após o cálculo, a Iniciativa desenha um cartão por slot intercalado de
`ordemRodada`, com iniciativa travada nas ocorrências adicionais), ataques, `validarFichaCriatura` — contra
`docs/core/guia_de_mestre-v4.0.0.md`, caso de teste completo "A Estátua").

**Fonte única:** frontend e backend consomem o mesmo motor. Nenhuma regra de jogo é reimplementada
em nenhum dos dois lados.

### Autenticação e conta — `backend/autenticacao`, `backend/usuario`, `frontend/autenticacao`, `frontend/usuario`

Registro e login com JWT (bcrypt, guard global, `@Public()` para abrir rota, `@ActiveUser()` para o
payload). Telas `/login` e `/registro` (split-panel). Perfil self-service em `/perfil`: alterar
nome/login, trocar senha e excluir a própria conta. Desde a `m6-01`, toda conta tem tipo global
(`NORMAL`, `ADMIN` ou `TESTER`) e `token_versao`; a conta `senhor.contratados` foi promovida a
`ADMIN`, contas anteriores receberam `NORMAL` e o registro público sempre persiste `NORMAL`.
Desde a `m6-02`, todo request não público relê tipo, versão e exclusão da conta no banco: sessão
ausente, excluída ou com versão divergente recebe 401; `@TiposPermitidos(...)` usa o tipo fresco e
responde 403 quando ele não está autorizado. Para testar um módulo restrito, anote a controller com
`@TiposPermitidos(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.TESTER)`; remova o decorator para permitir
qualquer usuário autenticado.
Desde a `m6-03`, administradores podem listar contas ativas ou excluídas com busca, filtro de tipo,
ordenação e paginação; criar contas; alterar nome/login; fazer soft delete; e reativar uma
conta preservando seus dados públicos. A `m6-04` acrescentou troca de tipo e reset administrativo
de senha, ambos com incremento de `token_versao`; bloqueia auto-exclusão/auto-rebaixamento pela
gestão, preserva ao menos um `ADMIN` ativo inclusive no self-service e impede excluir mestre de
campanha ativa antes de transferir o papel ou excluir a campanha. As rotas ficam sob
`usuario/admin` e permanecem restritas a `ADMIN`.
Desde a `m6-05`, `/admin/usuarios` expõe essas operações em uma tela inline protegida por
`adminGuard`: busca única por nome/login com debounce, filtros reativos de tipo e situação,
criação com escolha de tipo, edição, reset de senha, troca de tipo com confirmação, exclusão e
reativação. O perfil identifica o tipo atual sem permitir editá-lo, e a topbar sinaliza contas
`ADMIN`/`TESTER`.
Desde a `m6-06`, módulos futuros podem restringir suas rotas com
`tipoGuard([TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.TESTER])`. Sem sessão, o guard preserva o
retorno no redirecionamento ao login; uma sessão sem tipo permitido segue para a página pública
`/acesso-negado`. Ao abrir o módulo para todo usuário autenticado, substitua-o por
`autenticacaoGuard`; nenhuma rota funcional existente foi restringida pela entrega.
Desde a `m6-08`, a gestão administrativa ganhou **impersonação auditável**: o botão "Logar como",
em cada conta ativa diferente do admin da sessão, abre uma confirmação inline (nome + login do
alvo, aviso de que a sessão administrativa será encerrada); confirmar chama
`POST /usuario/admin/impersonar` (`@TiposPermitidos(ADMIN)`, recusa conta excluída/inexistente e
autoimpersonação) e o `SessaoTokenService` — o mesmo emissor do login — devolve um JWT com id,
login, tipo e `tokenVersao` atuais do alvo, nunca senha/hash. O frontend **substitui** a sessão
inteira (`SessaoService`, sem sessão dupla nem "voltar ao admin") e navega a `/painel`; recuperar o
admin exige logar de novo. A migration `0016` grava `usuario_impersonacao` (origem, alvo, data) só
após a validação bem-sucedida.

### Campanhas — `backend/campanha`, `frontend/campanha`

CRUD de campanha com papéis (mestre/jogador), entrada por `codigo_convite` com regeneração pelo
mestre, listagem de membros, remoção de jogador e transferência de mestre. UI sob `/painel`
(guardada): lista de campanhas (`/painel`) é um **painel de controle** (m2-18) — linhas densas por
campanha com tira de 4 estatísticas agregadas no topo (Campanhas/Você mestra/Fichas em
campo/Alertas), alerta visual + nome da ficha crítica por linha, resumo da própria ficha
(Vida atual/máxima, jogador) e convite copiável direto na linha (mestre), sem abrir o detalhe. O
detalhe (`/painel/:id`) tem banner de alerta condicional no topo (ficha crítica, com link direto
pra ela), tira de estatísticas — só o tile **Convite** (só mestre; ajuste pós-m4-04b: Membros/
Fichas/Alertas saíram da tira — a contagem de cada um já aparece no cabeçalho da própria coluna, e
o alerta crítico já tem o banner acima) — e tira horizontal rolável de rolagens da última hora (sem limite fixo de itens — a lista completa/sem limite de
tempo só na sidebar de histórico, aberta pelo seu próprio gatilho D20; cada pill tem rótulo +
dadinho d20 lado a lado na mesma linha flex — hover/foco no d20 mostra o resultado completo na
bandeja de dados flutuante, `BandejaDados`, a mesma que exibe rolagens ao vivo, mas sem timer/
barra de auto-sumir — `semAutoSumir`, a prévia só fecha no `mouseleave`/`blur`) — compartilhados
pelos dois papéis. Abaixo disso, o corpo diverge por papel (`@if (ehMestre())`/`@else`):

- **Mestre** (m2-19) — duas colunas: **Membros** (450px no desktop; nome/papel/gestão, sem
  fichas; mestre sempre primeiro, depois jogadores em ordem alfabética) e **Esquadrão** (grid fixo
  de 2 colunas — 1 no mobile, e antes de Membros quando a grade empilha; segue a mesma ordem
  mestre→alfabética da coluna Membros — com as fichas de **jogador** (`tipo === JOGADOR`) da
  campanha achatadas, nome do dono em cada mini-card, Vida/Energia com ajuste rápido ± sem abrir a
  ficha (operação dedicada que só altera `dados.estado.vidaAtual`/`energiaAtual`, sem regravar
  identidade, cor, avatar ou visibilidade), reações
  (Defesa/Esquiva/Bloqueio/Contra-ataque, cada uma só aparece se a ficha tiver o valor — Contra-
  ataque recalculado ao vivo no backend quando o snapshot não foi persistido) e o kebab de ações da
  ficha — duplicar/remover-da-campanha/excluir). Cabeçalho da coluna tem dois botões — **Nova
  Criatura** (`/painel/:campanhaId/criatura/nova`) e **Novo Agente** (assistente de jogador,
  ex-"Nova ficha", m4-04b). Abaixo do grid, a mesma coluna se divide com a subseção **Criaturas**
  (m4-04b) — todas as fichas `tipo === CRIATURA` da campanha, cards enxutos (nome/imagem/cor/NA/
  Vida/Defesa, sem classe/energia/condições, que uma criatura não tem) e **sem link de navegação**:
  `FichaVisualizacao` ainda não sabe renderizar dados de criatura (pendência da `m4-04`, ver seção
  7) — abrir a ficha completa quebraria a tela. `FichaResumoDto` ganhou `tipo`/`na` (opcionais, para
  não quebrar fixtures de teste pré-m4-04) e a query de resumo (`FichaRepository.colunasResumo`)
  passou a resolver `vidaAtual`/`vidaMaxima`/`defesa` também no formato raiz que a criatura usa
  (`COALESCE` entre os dois formatos de `dados`), além de um `JOIN tipo_ficha` novo.
- **Jogador** (m2-20 + m2-21) — a ficha exibida na coluna principal (a própria, por padrão, ou a de
  um colega via "Ver ficha") como card embutido (`<app-ficha-visualizacao modo="compacto">`, o
  componente real da tela de ficha, não uma réplica): 2 colunas que **repartem a linha** —
  Identidade/Vitalidade/Reações/Resistências à esquerda, card de Status à direita com uma barra de
  **3 abas** (Informações · Inventário · Habilidades). **Informações** = Atributos (o mesmo bloco
  que o `modo="padrao"` põe na coluna própria, via `ng-template`) + glance de Combate só leitura
  (com os dadinhos de rolar dano) + Anotações editáveis inline; Sanidade, Extras, História e
  Prestígio ficam de fora, alcançáveis por "Abrir ficha completa" (link no cabeçalho do card +
  botão no rodapé) → `/painel/:campanhaId/ficha/:id` (`modo="padrao"`, sem corte). Inventário e
  Habilidades rolam por dentro com teto de 420px (subiu de 230/250px pós-m2-21, a pedido do autor —
  o teto antigo datava de quando Atributos ainda morava na coluna ao lado). Ao lado, uma coluna
  lateral de 450px com **três** cards: **Equipe** (roster compacto — Vida/Energia resumidas + um
  botão "Ver ficha" por ficha visível de cada colega, trocando a ficha exibida sem navegar),
  **Rolagens** (`<app-ficha-rolagens-painel>` — presets/rolagem avulsa + o toggle "Rolagem oculta";
  saiu do card na m2-21 pra ficar ao lado do histórico; **só rola** os presets existentes —
  `editavel` fixo em `false` aqui, criar/duplicar/editar/remover preset continua exclusivo da
  ficha completa) e **Sessão** (as mesmas rolagens da última hora, empilhadas em vez da tira
  horizontal, com teto de 3 pills — 179px — antes de rolar). O cabeçalho dá ao jogador um menu "⋯" próprio (mesmo
  lugar do kebab do mestre) com **Criar nova ficha** e **Vincular ficha existente** (`PUT
  /ficha/:id/campanha` da m3-28, só fichas com `campanhaId === null`); as duas ações também
  aparecem no estado vazio, e nenhuma delas tira o jogador da página. No mobile a barra inferior
  (`.ficha-nav`, m3-60) lista 5 destinos (Agente/Status/Inventário/Habilidades/Rolagens) — e
  `Rolagens` é o **único que não é uma aba**: rola a página até o card da lateral. Os handlers de
  edição (`ajustar*`) vêm de `FichaEdicaoService` e a flag/registro de rolagem de
  `FichaRolagemRegistroService`, os dois composables reusados com `VisualizarPage` — a ficha de um
  colega aparece só leitura (`ajustavel=false`) quando o usuário não é dono nem mestre. O cabeçalho
  também traz `<app-calculadora-flutuante>` ao lado do gatilho de histórico de rolagens, pros dois
  papéis.

O cabeçalho tem nome da campanha em linha própria (mais destaque no mobile) e, abaixo/ao lado,
indicador de tempo real, botão "Voltar às campanhas", gatilho de histórico de rolagens e (mestre)
o menu kebab de ações da campanha (editar nome/descrição, excluir). Também mostra o estado
operacional `Na Base`/`Em Missão`: o mestre pode alterná-lo e abrir o inventário compartilhado numa
sidebar; o jogador abre o inventário na coluna lateral somente quando está na base. O inventário de
esquadrão aceita itens do catálogo, ajustes de quantidade e transferência nos dois sentidos com
fichas próprias (`Pegar`/`Mandar pra base`). Durante uma missão, jogadores ainda podem consultar os
itens, mas não podem adicionar, ajustar quantidade, remover ou transferir; essas operações continuam
restritas à base. O atalho do jogador se chama
`Inventário do esquadrão`; `Na Base` usa a cor neutra adaptada à base clara/escura e `Em Missão`
usa o vermelho fixo de Vida. O catálogo repete busca, categorias com quebra de linha e densidade do
inventário da ficha, sem rolagem horizontal; adicionar preserva o catálogo aberto e sinaliza o card
acionado. A ação `Item custom` replica o formulário da ficha, com categoria iconográfica, quantidade,
descrição e campos mecânicos condicionais (`dano`, `informação`, `resistência` e `bônus`) limitados ao
contrato que o inventário coletivo já preserva. Usável em ~360px.
Operacionais e Medicinais com todos os campos descritivos idênticos compartilham um stack ao serem
adicionados; as demais categorias e qualquer variação descritiva permanecem em registros separados.
Remover um registro exige confirmação inline no próprio card. O suporte estruturado a itens
modificados no inventário de esquadrão ainda não faz parte do sistema e está registrado como
**I-020** em `IDEAS.md`.
No desktop, as sidebars compartilhadas de inventário de esquadrão e histórico de rolagens têm 500px;
o histórico usa a mesma largura na campanha e na ficha. A pilha de atalhos flutuantes (inventário,
histórico e calculadora, conforme a tela) fica a 24px do canto inferior esquerdo tanto na campanha
quanto na ficha. Em viewports mobile, esses controles continuam inline no cabeçalho com alvos de 44px
e as sidebars ocupam toda a largura disponível.

O **Caderno** também integra os utilitários da campanha. Cada membro possui um caderno privado por
campanha, formado por páginas com título e Markdown, sem imagens ou anexos. A página usa Milkdown
para edição visual direta: o conteúdo formatado é a própria superfície editável, com barra compacta
para títulos, ênfase, listas, citação e código, sem alternância entre fonte e prévia. O Markdown puro
continua sendo o formato persistido. O autor administra suas
páginas com salvamento automático e controle de versão; em conflito, o texto local permanece visível
até o usuário recarregar a versão persistida. O mestre alterna entre o próprio caderno editável e os
cadernos dos jogadores em modo estritamente somente leitura; jogadores não veem cadernos alheios.
Sincronizações internas do Milkdown — como a troca da página ativa — não são tratadas como digitação
e, portanto, não disparam autosave nem avançam indevidamente o controle otimista de versão. As datas
usadas como versão são devolvidas pelo backend com os seis dígitos de microssegundos do PostgreSQL,
evitando perda de precisão entre um salvamento e o seguinte. Os controles `Salvar agora` e `Excluir`
têm hover contextual, resposta de pressão ao clique e respeitam `prefers-reduced-motion`.
No desktop, a janela pode ser arrastada, redimensionada e minimizada e preserva sua geometria no
navegador. A lista de páginas pode ser recolhida e se recolhe ao criar uma página; em janelas de
640px ou menos ela se sobrepõe ao editor para não estreitá-lo, e a largura mínima da janela é 440px.
No mobile, o gatilho fica inline
ao lado de histórico e calculadora, ocupa a área útil ao abrir e alterna entre lista e editor.

A mesma janela oferece busca textual unificada com fontes combináveis conforme o papel: caderno do
mestre, cadernos dos jogadores e anotações das fichas. A autorização é aplicada no backend antes da
consulta; um resultado de página abre o caderno correspondente e um resultado de ficha navega para
a visualização completa em `#anotacoes`. A implementação usa full-text search português do
PostgreSQL (`websearch_to_tsquery`, `tsvector` e índices GIN); o banco continua autoritativo.

### Ficha de jogador — `backend/ficha`, `frontend/ficha`

CRUD completo com a matriz de permissões §14 arbitrada **só no service**, validação do documento
contra `shared/regras` antes de persistir, e concessão/revogação de acesso de visualização
(`usuario_ficha_acesso`).

As habilidades permanentes de custo 0 E entram nas fórmulas compartilhadas, sem regra duplicada
na UI ou no backend: `Tanque` altera Vida e resistência das Proteções equipadas; adicionar/remover a
habilidade aplica apenas o delta à Vida máxima persistida, preservando ajustes manuais. Criação,
edição, visualização e Encontro usam o mesmo motor e propagam `habilidades` aos fallbacks.

A tela de visualização (`FichaVisualizacao`, componente reusável) é um **layout de três colunas**
(Identidade · Atributos · Status com abas internas), com **toda edição no próprio lugar** — nada
de página de formulário separada. Editores prontos: atributos e maestria (com modificador de teste
e ajuste manual de dados/`dadosTeste` por atributo, este último só afetando a contagem de dados
rolada, nunca o valor exibido nem os derivados; em edição, os atributos viram uma lista vertical —
nome completo + steppers — em vez da grade compacta do modo leitura), vitais, sanidade e
lesões, habilidades (com filtro e contador), inventário completo (itens, modificações,
amplificadores, fragmentos Potencializador — "Aplicar em..." num item (`m3-35`; cardápio "em um
item" com 4 destinos exclusivos — dano [`N× maior dado do alvo`, dano de verdade], teste, **efeito**
[`m3-68`: tipo `EFEITO` próprio, descritivo — reforça o efeito do item, ex.: "Em Chamas" de uma
granada, nunca soma no dano] e resistência; "uma única função" por item, checado por
`existeFragmentoNaMesmaFuncao`) ou "Consumir" pro bônus permanente do agente (teste/Defesa/dano do
Corpo, cardápio fechado por módulo, `m3-64`;
consumir sempre deixa um registro incondicional na aba Extras, acima da Afinidade — não depende da
sequela "Rejeição Biológica", que é evitável — e é **removível**: desfaz o bônus, a Energia Máxima e
devolve o item ao inventário, mas não mexe na sequela já gerada) — e fragmentos Construtor (nascem
com o bônus fixo do módulo já aplicado como modificação automática — Arma ganha dano/teste, Proteção
ganha resistência/Esquiva/Bloqueio/Defesa, `m3-65`; Munição não modifica item, tem a ação própria
"Recarregar" que debita Energia e concede dano por 1 cena, reset manual; modificações comuns
adicionadas a um Construtor custam o dobro e não pesam; `m3-69`: o form de item custom ganhou um
seletor "Base" — escolher uma arma/proteção real de `CATALOGO_ITENS[categoriaEmprestada]` trava
dano/informação/resistência com os valores daquele item e pré-preenche o peso, "Outra" continua livre
pra homebrew; `calcularStatItem` funde a Resistência de um Construtor Proteção com o bônus do módulo
desde essa task — antes só Proteções/Armazenamento eram elegíveis a esse bloco) —, sub-inventários,
custom), Limite mínimo
de Energia/Anomalia Biológica (`m3-67`: `(Vigor + Destreza) × 2` — abaixo dele, aviso não-bloqueante
na aquisição de fragmento e, na aba Extras, os efeitos calculados como texto informativo (−15
testes, −10 Defesa, teto de 10% da Vida Máxima) + atalho pra pré-preencher o trauma "Limiar da
Humanidade" na aba Sanidade, sem nunca disparar sozinho), identidade (origem,
personalidade, afinidade de fragmentos), história privada, anotações e dinheiro. Extras possui a
subnavegação persistente **Identidade / Fragmentos** (`m3-71`), com ícones canônicos e painel interno
rolável limitado à altura de Agente/Atributos no desktop e ao viewport em telas empilhadas.
Persistência **otimista + em lote**, com
merge de edição concorrente — a lógica (~18 handlers `ajustar*` + progressão) mora em
`FichaEdicaoService` (`@Injectable()` sem `providedIn: 'root'`, uma instância por página via
`providers: []`), reusado por `VisualizarPage` (`/painel/:campanhaId/ficha/:id` e `/fichas/:id`) e
por `CampanhaDetalhe` (m2-20, ficha embutida na visão do jogador). O mesmo padrão vale para
`FichaRolagemRegistroService` (m2-21): a flag "Rolagem oculta" e o registro do histórico (m3-27)
moram na página porque no painel do jogador o toggle está **fora** do card (coluna lateral)
enquanto o teste de atributo e o dano continuam sendo rolados de dentro dele.
O controle relacional de visibilidade da ficha completa pede confirmação antes de persistir: fica
compacto junto ao avatar no desktop e migra para o menu de ações no mobile. Mudanças reais de
`oculta` em ficha vinculada emitem `ficha:visibilidade-alterada` na sala da campanha; o detalhe
refaz o recorte REST autorizado, fazendo a ficha sumir ou reaparecer para jogadores sem F5.
Na visualização completa, o menu de dono/mestre oferece **Remover da campanha** somente para ficha
vinculada; a desatribuição é direta e retorna ao acervo após o backend confirmar.

Item custom ganhou a categoria de sistema `SEM_CATEGORIA` (`ItemCategoriaEnum`, sem capítulo
correspondente em `sistema-v4.1.0.md` — bucket organizacional puro, nunca ganha item de catálogo):
disponível só no seletor de categoria do form de item custom (ficha, esquadrão, calculadora
"Compras"), nunca como aba do catálogo navegável. Item dessa categoria é sempre empilhável (cai na
grade dupla, junto de Medicinal/Operacional) e nunca modificável (sem Dano/Resistência/"encaixa em"
no form, sem painel "Modificar").

Input `modo: 'padrao' | 'compacto'` no componente: `'compacto'` reduz as 3 colunas pra 2
(Identidade/Vitalidade/Reações/Resistências ao lado do card de Status) e corta a barra de abas ao
trio Informações/Inventário/Habilidades, some com Prestígio, Sanidade, Extras e História, e leva
Atributos + Combate pra aba Informações (uso de `CampanhaDetalhe`, coluna estreita numa tela larga
— ver seção "Painel de campanhas" acima). No mobile a tela vira **HUD fixo no topo + barra de
navegação no rodapé** (não empilhamento de colunas) — por breakpoint real de viewport, não pelo
`modo`; em `'compacto'` a barra some com os destinos que não existem nesse modo.

Rolagem de dados: gramática v4, presets, teste de atributo, dano de item, iniciativa automática,
calculadora flutuante e **histórico persistido** com visibilidade `PUBLICA`/`PRIVADA`. Cada ficha
tem uma **cor de identidade** própria (`m3-61`, coluna `ficha.cor`, swatch no cabeçalho —
`ajustavelAmplo()`), independente do `--accent` de tema por usuário: colore o total/crítico de toda
rolagem daquela ficha (bandeja de dados, histórico, feed "Rolagens Recentes" do painel de
campanha), via REST e WebSocket; sem cor definida, cai no `--accent` de quem visualiza. Cada ficha
também tem um **avatar** opcional (`m3-62`, coluna `ficha.imagem_url`): `<img>` real no lugar do
placeholder decorativo no cabeçalho (com selos de trocar/remover, `ajustavelAmplo()`) e no card do
acervo — upload/remoção via `POST`/`DELETE /ficha/:id/imagem` (multipart, endpoint dedicado fora do
`PUT` genérico), persistidos **imediatamente** (sem o debounce dos demais campos), com o arquivo
guardado em disco local (dev) ou Cloudflare R2 (produção) atrás de `ArmazenamentoProvedor`
(`backend/src/core/armazenamento/`), escolhido por `ARMAZENAMENTO_PROVEDOR`. O card do acervo usa a
mesma receita visual do card de ficha do Esquadrão (`CampanhaDetalhe`, `m3-52`): borda + listras
diagonais do avatar seguem `--cor-ficha` (`color-mix` sobre `--border-strong` sem cor definida) e o
hover sustentado sobre o avatar abre um preview 200×200 sem recorte
(`agendarPreviewAvatar`/`cancelarPreviewAvatar`).

**Acervo (`/fichas`, `FichaAcervo`) separado por tipo (`m4-11`).** A tela lista agentes e criaturas
em blocos próprios (`AGENTES`/`CRIATURAS`; NPC estruturalmente pronto na mesma lista dirigida por
`TipoFichaEnum`, mas desligado do filtro/botão até `m4-07`/`m4-08` existirem), cada um com
cabeçalho (título + régua + contagem, padrão de `CampanhaDetalhe.__secao`) e um `<select>` de visão
(Todos/Agentes/Criaturas) alinhado à direita da barra de ações. Em "Todos", cada bloco trava em
~2 linhas de card e rola por dentro (`.acervo__lista--limitada`, `appOverflowFade`) — um bloco sem
ficha nenhuma é omitido; com um tipo filtrado, o bloco solta a trava e usa a altura toda, com
estado vazio próprio ("Nenhuma criatura ainda."). O card virou um componente único extraído
(`CartaoFichaAcervo`, `frontend/.../ficha/componentes/cartao-ficha-acervo/`) com recorte por tipo —
comum a todos (moldura, avatar, chip de campanha, kebab); agente mostra
`rotuloClasseCompleto(classe, arquetipo)` · Nível · **Patente** (`rotuloPatente`, que faltava no
card antes desta task) · Vida/Energia; criatura mostra Ameaça · NA · VD · Vida/Defesa. O menu (⋯) e
o preview do avatar continuam na raiz da página (`position: fixed`, cortados pelo `appOverflowFade`
do `<ul>` se vivessem dentro do card). Link do card por tipo: agente → `/fichas/:id`; criatura →
`/fichas/criatura/:id`.

**Criar criatura fora de campanha (`m4-11`).** `FichaCriaturaCriarDto.campanhaId` passou a aceitar
`null` — botão "Criar criatura" no acervo, visível só a quem é mestre de **alguma** campanha
(`CampanhaRepository.contarCampanhasComoMestre`, já existente, reusado sem SQL novo); o backend
aplica a mesma trava (`FichaService.criarFichaCriatura`), recusando com 403 quem não é mestre de
campanha nenhuma. As rotas `/fichas/criatura/nova`/`:id` (sem `mestreCampanhaGuard` — não há
`:campanhaId` de campanha nenhuma pra guardar) reusam `CriaturaCriar`/`CriaturaVisualizar` com
`campanhaId` opcional, mesmo padrão de `FichaCriar`/`FichaVisualizar` (m3-28): resolvido da rota
quando presente, ou do próprio payload da ficha carregada quando não. Atribuir uma criatura/NPC
solta a uma campanha agora exige que o dono seja **mestre** daquela campanha (não só membro) —
coerente com quem pode criá-la — e **nunca** emite `ficha:criada` na sala (o evento monta o resumo
na forma de jogador e vazaria nome/vida a todo membro antes de qualquer revelação deliberada,
mesma razão já valendo para a criação). Dois defeitos vivos, alcançáveis pelos mesmos controles do
acervo desde que criaturas passaram a listar lá, foram corrigidos junto: `duplicarFicha` fixava
sempre `tipo: JOGADOR` (duplicar uma criatura pelo menu criava um agente com `dados` de criatura) —
agora ramifica pelo `tipo` da ficha original (`FichaRepository.recuperarPorId` passou a devolver
`tipo` via o mesmo `JOIN tipo_ficha` de `colunasResumo()`).

### Ficha de criatura — `backend/ficha` (`m4-03`) + assistente de criação (`m4-04`)

`POST /ficha/criatura` cria uma ameaça: dentro de uma campanha, só o **mestre** daquela campanha
pode (`UnauthorizedAccessException` para qualquer outro papel); solta (`campanhaId: null`, `m4-11`
— ver o bloco no topo do arquivo), exige ser mestre de **alguma** campanha. Dono é sempre o próprio
mestre (sem delegação como em jogador). `GET`/`PUT /ficha/criatura/:id` reusam as mesmas checagens de
permissão de `recuperarFicha`/`alterarFicha` (dono/mestre/concessão, §14); exclusão
(`DELETE /ficha/:id`) e concessão/revogação/listagem de acesso (`/ficha/:id/acesso*`) são 100%
agnósticos de tipo e reusam as rotas de jogador sem endpoint próprio. Validação de domínio é só
`validarFichaCriatura` (`shared/regras/criatura`, `m4-02`) — nenhuma regra de criação duplicada
no backend. Invisível a jogadores por padrão — **não** é o campo `oculta` (que aqui só nasce
`false` e serve pra outra coisa, revelação manual futura de `m4-09`) quem garante isso, é a
própria condição de acesso: `listarVisiveisParaUsuario`/`recuperarFicha` só liberam o dono
(sempre o mestre) ou quem tem `usuario_ficha_acesso` — confirmado ao vivo na `m4-04` (jogador
sem concessão recebe lista vazia e 403 direto na criatura). A criação **não** transmite
`ficha:criada` na sala `campanha:<id>` (diferente de jogador) — esse evento vazaria nome/vida da
criatura a todo membro antes de qualquer revelação deliberada, contradizendo a regra de
invisibilidade; a edição segue transmitindo `ficha:alterada`, seguro porque a sala `ficha:<id>`
já exige a mesma permissão de visualização para entrar. DTOs de operação próprios
(`shared/src/dtos/ficha/ficha-criatura-operacao.dtos.ts`) — ver seção 6. Listagem de criaturas
por campanha (mini-cards, sem abrir a ficha completa) ganhou a subseção "Criaturas" do painel do
mestre no `m4-04b` — ver o parágrafo do `CampanhaDetalhe` acima; revelação/visibilidade seletiva
continua em aberto para `m4-09`.

**Assistente de criação** (`frontend/src/app/modules/ficha/paginas/criar-criatura/`,
`CriaturaCriar`) — rota `/painel/:campanhaId/criatura/nova`, guardada por
`mestreCampanhaGuard` (`frontend/core/guards/`, novo: consulta `CampanhaService.listarMembros`
e redireciona a `/acesso-negado` quem não é mestre daquela campanha — mesmo espírito de UX do
`adminGuard`, mas escopado à campanha em vez do tipo global). Trilha vertical + resumo
operacional progressivo, mesma filosofia visual do guia de jogador (`FichaCriar`), mas
componente e roteiro totalmente separados — 12 passos fixos (Identidade → Ameaça → Atributos →
Modificadores → Saúde → Defesa → Resistências → Regeneração → Porte e Deslocamento → Ataques →
Habilidades → Revisão), sem passos condicionais (o roteiro do "Guia de Criação de Ameaças" não
varia por escolha, diferente do de agente). Todo cálculo vem de `shared/regras/criatura`
(`m4-02`) via `computed`; nenhuma fórmula reimplementada. O passo // Revisão chama
`validarFichaCriatura` (a mesma função que o backend chama antes de persistir) para decidir se
o botão "Registrar criatura" habilita — em vez de replicar cada regra de coerência como trava de
passo separada. Sem rascunho persistido (decisão de abertura: a task não pede retomada, e
diferente da ficha de jogador o risco de perda é baixo — o mestre não perde a própria ficha).
`nome` da ficha (nível DTO) é sempre a `designacao` da Ficha de Identidade — sem campo
duplicado. Verificado ao vivo (Postgres+backend+frontend reais, dois usuários — mestre e
jogador): reproduz "A Estátua" ponta a ponta com os mesmos valores do documento (Vida Máxima
1.050, Defesa 30, custo de resistências 52/60, Atributo Efetivo de cada linha), persiste
corretamente e o jogador sem concessão não a vê (§14). Pendência registrada — ver seção 7.

**Visualização/edição** (`frontend/src/app/modules/ficha/componentes/criatura-visualizacao/`,
`CriaturaVisualizacao` + página `paginas/visualizar-criatura/`) — rota
`/painel/:campanhaId/criatura/:id`, mesma guarda de mestre da rota `nova`; resolve a pendência da
`m4-04` com tela dedicada (não um `modo` novo em `FichaVisualizacao`). Barra superior própria do
componente (`criatura__topo`, rótulo + régua + `chip-classificacao` `FICHA-CRT-{id zero-padded}`,
igual estrutura de `ficha-visao__topo` do jogador — não fica na página) seguida de dashboard de 3
colunas — Identidade (avatar com cor de identidade via `<input type="color">`, upload de imagem e
seletor de enquadramento — ver adiante —, designação, chips de classificação Origem/Porte/
Comportamento, NA em destaque, VD/Tenacidade/Defesa, Vida, Resistências em grade compacta,
Fraquezas em grade de **2 colunas**, divergência deliberada do mockup — que mostra 1) · Atributos
(grade Físicos/Mentais de cards "sigla + valor + Atributo Efetivo + rolar"; o seletor de Modificador
de 4 barras não fica no card — só dentro do modo de edição) · Status com **4 abas** (`AbaCriatura =
'geral' | 'descricao' | 'ataques' | 'habilidades'`, também divergência deliberada do mockup — que
mostra 2): Geral (Cadência + Bônus de Iniciativa + Deslocamento na mesma linha — deslocamento é um
terceiro item de `.criatura__stats--info`, não card próprio — e Regeneração opcional abaixo),
Descrição (Conceito/Gancho/Motivação, Natureza Física/Tema de Horror, Anotações), Ataques e
Habilidades (cada uma sua própria aba, grades de cards, Ataque com botões Teste e Dano) — mesmo
shell/padrões de `FichaVisualizacao` (jogador) e dos blocos canônicos de
`docs/design/tema/_componentes.scss`, alvo de fidelidade
`docs/design/examples/ficha-de-criatura.html`. Abas sempre ocupam 100% da barra (`flex: 1 1 0` em
cada `.criatura__aba` — divergência deliberada do `.abas` canônico, que é do tamanho do conteúdo).
Edição no próprio lugar campo a campo, igual liberdade da ficha de jogador; `FichaEdicaoCriaturaService`
faz o mesmo papel de `FichaEdicaoService` (debounce + `PUT` em lote). Nas listas de item
(`criatura-ataque-lista`/`criatura-habilidade-lista`/`criatura-resistencia-lista`, esta última
reusada por Resistências e Fraquezas) editar/remover por item só aparecem depois de um clique no
botão "Editar"/"Concluir" do cabeçalho da lista (`modoEdicao`, local a cada lista) — "Adicionar"
continua sempre visível, só as ações destrutivas/por-item exigem entrar no modo. Dois blocos fogem
do "edita direto no valor" e usam lápis de seção, como o lápis de Atributos da ficha de jogador:
**Classificação** (os quatro chips viram selects rotulados de uma vez, porque trocar um chip por um
select fazia a linha saltar) e **Atributos**, este com **rascunho + Salvar/Cancelar** — a
distribuição de Modificadores é cota fixa (2 Forte / 3 Médio / 3 Fraco / 2 Frágil,
`shared/regras/criatura`), então emitir a cada clique deixava a ficha inválida e o backend recusava
a gravação; o Salvar só libera quando `validarFichaCriatura` não acusa mais violação de modificador.
Dois cuidados que valem pra qualquer tela: `<select>` de edição usa `[selected]` na `<option>` (com
`[value]` no `<select>` as opções do `@for` ainda não existem e o controle abre na 1ª), e `.botao`
precisa ser copiado pro SCSS de cada componente (a definição da página não atravessa o
encapsulamento). Só desktop por ora — refinamento mobile é `m4-10`, ainda no backlog.

**Enquadramento do avatar (pan/zoom) — jogador e criatura.** Retomada do que `m3-62` tinha deixado
fora de escopo ("crop/editor de imagem no client"), sem processamento de imagem no servidor: só um
metadado (`FichaImagemFocoDto { x, y, escala }`, percentual + zoom, coluna `imagem_foco` JSONB) se
soma a `imagemUrl`, aplicado no avatar via `object-position` + `transform: scale()`. Componente
reusável `AjusteEnquadramentoImagem` (`frontend/.../componentes/ajuste-enquadramento-imagem/`) —
arraste nativo (`pointerdown/move/up`, sem lib) + slider de zoom — renderiza como painel sobreposto
abaixo do avatar nos dois componentes (`FichaVisualizacao`/`CriaturaVisualizacao`). Selecionar um
arquivo novo abre o seletor automaticamente antes do upload; um selo dedicado (canto livre do
avatar) reabre o seletor pra reajustar uma imagem já salva, sem reenviar arquivo. `imagemFoco`
viaja pelo `PUT /ficha/:id` genérico (como `cor`), não pelo endpoint multipart de imagem — são só
números. Remover a imagem zera o enquadramento junto (sem metadado órfão). Ícone de rolagem
**d20** (não d6) em todo gatilho da ficha de jogador — o sistema só tem testes `Nd20kh1±mod`, então
a troca de `nome="dado"` → `nome="d20"` (`app-icone`) foi total, sem glifo de d6 sobrando em lugar
nenhum.

**Polimento de UI — `m4-04b`:** passo // Identidade ganhou upload de imagem de registro (mesmo
padrão de avatar do guia de jogador, `FichaService.alterarImagem`, segundo request em sequência
após criar a ficha — layout `.guia__campos--base`, caixa à esquerda + Designação/Origem à
direita); revisão de espaçamento entre campos consecutivos fora de um `.guia__campos` (regra
`.campo + .campo` que faltava — campos ficavam colados sem gap) e entre um grid de cards
(Resistências/Fraquezas/Ataques/Habilidades) e o botão "+ Adicionar" logo abaixo.

**Polimento de UI — `m4-04c`:** passo // Atributos trocou o bloco único "Base do VD" (texto
corrido, cortava o stepper no mobile por `.atributo` não ajustar `grid-template-columns` nesse
breakpoint) por 3 cards `.stat` — Base e Limite estáticos, Pontos de Ajuste com um contador real
`gasto/total` (`pontosAjuste()`, mesma fórmula soma-acima-da-Base de
`validarDistribuicaoAtributos` do guia de agente) que trava `passoValido()` em saldo 0, mesmo
padrão do "Saldo de distribuição" do guia de jogador. Dois ajustes decorrentes: os dez atributos
agora nascem na Base ao definir o VD (`mudarVd()`, só na primeira visita ao passo — não apaga uma
distribuição já feita ao voltar e reajustar o VD) em vez de ficarem fixos em `1`; e o piso da
Realocação por atributo passou de `0` para `max(0, Base − 3)`, respeitando o teto de "até 3 pontos"
do documento (sem efeito para VD ≤ 40, onde `Base − 3` já é negativo).

### Guia de criação de ficha — `frontend/src/app/modules/ficha/paginas/criar/`

Rota `/painel/:campanhaId/ficha/nova` (`m3-57`/`m3-58`/`m3-59`) — mesmo componente `FichaCriar`
montado de novo, sem `campanhaId`, em `/fichas/nova` (acervo, m3-28: ficha avulsa, sem campanha).
`FichaCriarDialog` (o formulário único antigo) **não existe mais no código**: era a última
consumidora quem faltava migrar. Tela única por passos — trilha vertical + resumo operacional
progressivo que nunca antecipa classe/Nível/dinheiro antes da escolha real —, rodando sobre
`shared/regras` sem nenhuma chamada ao backend até o "Criar ficha" final. Sem `campanhaId`
(`null`), o guia pula `listarMembros`/`listarFichas` (sem esquadrão, sem seletor de dono no passo
01) e o passo 03 solicita Nível e Prestígio exatos; em campanha, as médias calculadas continuam
como padrão e podem ser sobrescritas manualmente. Ao final, `POST /ficha` sai sem a chave
`campanhaId` quando a ficha é avulsa e
o guia termina em `/fichas/:id`, não em `/painel/.../ficha/:id`. Passos: **01 Base** (dono, só
mestre — não aparece sem campanha —, + codinome + cor de identidade, `m3-61`, + avatar opcional,
`m3-62`: o `File` fica só num signal local até "Criar ficha" — nunca no rascunho salvo em
`localStorage` — e sobe num segundo request, em sequência, logo após o `POST /ficha`) · **02 Classe** (classe/arquétipo, bônus fixo de
atributos, Habilidade Inicial, Saúde base sem Nível/atributos ainda) · **03 Novo agente** (motivo
de entrada + médias de Nível/Prestígio pré-calculadas da campanha, `calcularNovoAgente`, memorial
de cálculo e sobrescrita exata; sem campanha, valores exatos informados diretamente)
· **04 Atributos** (orçamento de 4 pontos de criação,
`calcularOrcamentoAtributos`/`validarDistribuicaoAtributos`) · **05 Habilidades** (só existe com
classe escolhida; vem **antes** de Identidade na trilha — só depois de escolher habilidades o guia
sabe se um Experimento vai ter Peculiaridade, e portanto não vai ter Origem; sempre presente: pacote
inicial obrigatório de 4 Gerais, 2 Gerais + 1 de Classe/Arquétipo ou 2 de Classe/Arquétipo; Civil
escolhe 3 Civis; compõe ainda as vagas de `calcularProgressaoAcumulada`, sem duplicatas —
Experimento não ganha vaga extra, escolhe Peculiaridade pelo mesmo pacote de qualquer outra classe)
· **06 Identidade** (Personalidade + Origem com catálogo de Formações e `Outra`, imutáveis para o
dono após a criação; desde `m3-75`, `criar()` trima as pontas de todo campo de texto livre —
`personalidade`, `origem.nome/.descricao/.saberDeCampo`, cada `formacao[].texto/.parametro` e
`especialidade.gatilho/.efeito` — só na montagem persistida, nunca durante a digitação; desde
`m3-78`, a Habilidade de Personalidade também vive aqui, logo abaixo do campo "Traço de
personalidade" — 3 blocos sempre visíveis, Base/1ª/2ª Fortificação (níveis 7/14), cada um com
descrição e custo em Energia próprios; a Base é sempre exigida para avançar deste passo, cada
Fortificação só quando o Nível de criação já a desbloqueou, sem bypass de "modo livre" — mesmo
padrão sem-bypass da palavra de Personalidade e da Origem; implementada primeiro no passo
Habilidades, movida para cá no mesmo dia por pedido do autor; `identidade.habilidade` guarda os 3,
só o estágio mais alto desbloqueado é materializado em `dados.habilidades`) · **07 Recursos** (rolagem única e definitiva de `1000 + 4D4×250` +
Bônus Monetário — ou, desde `m3-74`, ignorar a rolagem por um botão dedicado ao lado de "Rolar
dados": ficha final com `$0` de dinheiro base, mesma trava de escolha única, sem gerar entrada de
rolagem) · **08 Equipamento inicial** (kit da loja, orçamento **à parte** do dinheiro —
nunca descontado —, teto $2500/peso 5 do documento — mesma regra para toda classe, inclusive Civil
—, sem modificação; componente próprio `GuiaEquipamentoLoja`, catálogo + carrinho sobre
`CATALOGO_ITENS`/`calcularTotaisCarrinho` de `shared/regras/compras`; pulável, kit vazio é válido;
abas de categoria com `app-icone`/`ICONES_CATEGORIA` local — mesmo padrão de `FichaInventario` —,
busca acima das abas e cruzando todas as categorias, não só a ativa) ·
**09 Revisão** (resumo completo + `POST /ficha`, erro do backend não perde o estado do guia). Os
passos 04/05/08 têm **trava dura** por padrão (não avança com saldo/vaga/orçamento em aberto) com
um "modo livre" que ignora as travas (sempre disponível ao mestre) — regra só do guia, client-side;
o passo 06 (Identidade) também tem trava dura própria (personalidade, Habilidade de Personalidade,
Origem), mas sem bypass de "modo livre" — mesmo padrão de todo campo de identidade obrigatório;
o backend segue com a liberdade de edição da `m3-10`. Rascunho (`GuiaCriacaoRascunhoService`)
serializa o estado em `localStorage` por campanha, oferece "retomar"/"começar do zero" ao reabrir e
some ao concluir; sair do guia usa um `<dialog>` nativo (não `confirm()` nem `beforeunload`, que não
permite UI customizada), com aviso de que o progresso está salvo. Mobile: trilha vira barra de
progresso no topo, resumo operacional vira bottom sheet aberto por um botão dedicado no cabeçalho.

### Tempo real — `backend/core/gateway`

Gateway Socket.IO **broadcast-only**: toda mutação passa por REST, o gateway nunca recebe escrita.
Handshake autenticado pelo mesmo `JwtService` do Passport. Salas `ficha:<id>` e `campanha:<id>`,
reusando a permissão §14 das services. Eventos: `ficha:criada`, `ficha:alterada`, `membro:entrou`,
`rolagem:registrada`, `campanha:estado-alterado`, `campanha:inventario-alterado` e
`encontro:alterado` (por usuário — ver "Encontro de Combate" abaixo). Os eventos de
inventário/estado sinalizam o frontend para reler a fonte de verdade por REST.

`CampanhaGateway.emitirFichaAlterada` também aciona `EncontroService.sincronizarFichaAlterada` após
todo `ficha:alterada` (correção pós-`m7-17`, ver topo do arquivo): se a ficha alterada for
combatente de um encontro aberto da mesma campanha, o encontro é remontado e `encontro:alterado` é
retransmitido — sem isso, qualquer edição de Vida/Energia/Condição feita **fora** do
`EncontroService` (ficha flutuante do próprio Encontro, ou a ficha "solta" de um combatente ativo)
persistia corretamente mas nunca atualizava os cartões da Iniciativa em tempo real. `GatewayModule`
importa `EncontroModule` (`forwardRef`, mesmo padrão de `FichaModule`/`CampanhaModule`); a direção
inversa (`Ficha` → `Encontro`) continua proibida.

`emitirRolagemRegistrada` (m3-27/`m3-77`) usa **duas salas mutuamente exclusivas**, nunca as duas:
com campanha, só `campanha:<id>` (como sempre); ficha solta (`campanhaId === null`, m3-28), só
`ficha:<id>` — a única sala que ela tem. Emitir nas duas ao mesmo tempo duplicaria o evento pra quem
está nas duas salas simultaneamente (`campanha/detalhe`, que ingressa o mesmo socket em
`campanha:<id>` e em `ficha:<id>` de cada ficha visível). `visualizar.page.ts`/
`visualizar-criatura.page.ts` (a ficha numa tela só) assinam `rolagemRegistrada$` desde a `m3-77`:
entram também em `campanha:<id>` quando a ficha pertence a uma, prependam o histórico local e chamam
`BandejaDadosService.mostrar()` — uma rolagem feita por outro caminho (outra aba do dono, o mestre
rolando pela ficha, o Encontro) aparece sem F5. Dedupe contra o eco do broadcast pra quem acabou de
rolar tem duas camadas: histórico por `id` (topo do array, qualquer ordem de chegada) e bandeja por
"rolagem local em voo" (`FichaRolagemRegistroService.enviando$`/`finalizada$`, um contador na página)
— **não** dá pra deduplicar a bandeja só por `id` porque o eco do socket pode chegar **antes** da
resposta HTTP do próprio POST (confirmado ao vivo com clique real), quando o `id` real ainda não
existe no histórico local.

### Calculadoras públicas — `frontend/calculadora`

Seis abas públicas e 100% client-side (consomem `shared/regras` direto, sem backend): `agente`,
`dt`, `novo-agente`, `patente`, `descanso`, `compras` (com modo Vender). Paridade com a calculadora
antiga confirmada. A aba `descanso` também recebe Medicina, Vontade e as opções Segundo Fôlego e
Metabolismo Acelerado; faixa, fórmula e rolagem vêm integralmente de `shared/regras/descanso`.

### Documentos de regras — `frontend/shared/leitor-documentos`

Sistema e Guia do Mestre são públicos e acessíveis globalmente pelo mesmo leitor. O shell do sistema
controla documento, abertura, recolhimento e geometria; o PDF fica em um `iframe` e usa o viewer
nativo do navegador para nitidez, busca, seleção, páginas e zoom. O leitor próprio baseado em PDF.js
foi removido após a validação visual revelar baixa nitidez e texto duplicado. Os PDFs canônicos vivem
somente em `docs/core/` e o build os publica em `/documentos/`.

### Tema — `frontend/tema`

"Terminal de Contenção" dark-first com **troca em runtime** (`TemaService`: presets + color picker
com trava de contraste). Tokens CSS + preset PrimeNG + Tailwind apontando para os tokens.
`--cor-ficha` (`m3-61`) é um token **separado**, por personagem, não por usuário — nunca ganha
valor fixo em `_tokens.scss`, sempre `[style.--cor-ficha]` inline por instância; ver "Ficha de
jogador" acima e `docs/design/DESIGN.md`.

### Infraestrutura

14 migrations (`0001`…`0014`), Knex + Docker Compose local, CI de lint+testes em PR, deploy nativo.
O ambiente local é descartável e reproduzível por `npm run db:reset:dev`: o comando trava o alvo em
`development`/localhost/`contratados_rpg`/`postgres`/armazenamento local, remove o volume sem backup,
reaplica migrations e semeia 4 usuários, 2 campanhas, 8 vínculos e 8 fichas coloridas. Cada
usuário possui uma ficha diferente em cada campanha. O seed
transacional isolado é `npm run db:seed:dev`; cenário e credenciais estão em `docs/DEVELOPMENT.md`.

---

## 5. Decisões Vigentes

Decisões que **continuam governando código novo**. Não as re-litigue sem falar com o autor.

- **DTOs são `interface readonly`, não classes** — o projeto não instala `class-validator` e o
  backend **não liga o `ValidationPipe`**. A validação estrutural fica documentada campo a campo na
  spec; a validação real é de regra de negócio, no service. Não converter DTOs em classes nem
  instalar `class-validator` sem pedir.
- **Deploy nativo, não Actions** — o autor prefere Render/Cloudflare puxando do Git a pipelines de
  deploy no GitHub Actions. O Actions fica só com o CI.
- **Busca de anotações e documentos começa no PostgreSQL** — usar full-text search nativo
  (`tsvector`/`websearch_to_tsquery`) com índice GIN, respeitando sempre o recorte de permissões no
  backend. Elasticsearch não entra na infraestrutura atual; fica como evolução opcional, com
  PostgreSQL preservado como fonte de verdade e o índice externo reconstruível.
- **Cadernos de campanha são privados por autor** — cada membro tem conceitualmente um caderno por
  campanha, composto por páginas Markdown. O autor administra as próprias páginas; o mestre apenas
  lê e pesquisa páginas dos jogadores; jogadores nunca acessam cadernos entre si. A busca unifica
  cadernos e anotações de ficha com fontes combináveis conforme o papel. O Caderno é um utilitário
  flutuante junto de Calculadora e Documentos; contrato e decisões em
  `docs/superpowers/specs/2026-08-12-cadernos-campanha-busca-design.md`.
- **Edição no próprio lugar** — toggle inline na mesma tela, nunca uma página de formulário
  separada. Vale para ficha, campanha e perfil.
- **Enum de coluna relacional é tabela `tipo_*`** (SYSTEM.SPEC §10.2.12, proibição #24). A exceção
  "enum só em `shared/`" vale **apenas** para conteúdo dentro do JSONB `ficha.dados` (classes,
  patentes, categorias de item). Enum que vira coluna ganha tabela de referência — foi assim com
  `tipo_rolagem_visibilidade` na `m3-27`.
- **Rolagem `PRIVADA` nunca trafega por WebSocket** — o gateway só emite `rolagem:registrada` para
  rolagens públicas. A privada só chega por REST, a quem tem permissão.
- **PrimeNG 21 sem `@angular/animations`** — o pacote não está instalado e o PrimeNG 21 usa
  animações CSS próprias. Não wirar `provideAnimationsAsync()`; o build quebra.
- **A ficha aposentou o sistema de abas de página inteira da `m3-11`** (substituído pelas 3 colunas
  da `m3-38`). `AbaFicha`/`ABAS_FICHA`/`ehAbaFicha` ainda existem no código mas estão **fora do
  template** — não estenda esse sistema, mesmo que uma spec antiga peça.
- **`docs/specs/active/m3-38-*.spec.md` é uma spec deliberadamente permanente** — ela documenta
  retroativamente o redesenho da tela de ficha e novos ajustes dessa mesma frente entram nela em vez
  de virar spec solta. É a **exceção** consciente ao "active/ = task da sessão atual".
- **A ficha permite estado incoerente de propósito** — a validação do backend só checa **teto**
  (Vida ≤ máximo, Nível no intervalo da classe). Condições (Morrendo/Machucado/Inconsciente) são
  alternadas à mão e nunca validadas; exceder o Inventário máximo é **aviso**, não trava.
- **Gate de qualidade é definição de pronto** — toda tarefa exige evidência contra a spec e as
  convenções, revisão do diff e verificação proporcional. UI exige verificação ao vivo conforme
  `verify`; item sem uma verificação obrigatória permanece aberto. **Qualidade acima de velocidade**
  é decisão expressa do autor: nenhuma pressa, delegação ou limite de execução autoriza atalhos. UI
  exige análogo aprovado e inspeção pessoal do agente principal em 1920×1080 e 360×800; build,
  testes, tokens e relato de subagente não substituem a comparação visual. O checklist canônico está
  em `AGENTS.md` e `CLAUDE.md` “Gate obrigatório de qualidade e conclusão”; os
  dois arquivos devem permanecer cópias integrais.

---

## 6. Sempre Lembrar

Armadilhas que já custaram retrabalho neste repositório. Cada uma tem um episódio no `HISTORY.md`.

**CSS / layout**

- **`overflow-x: clip` + `overflow-y: visible`** é a combinação usada em `html` (`styles.scss`) e
  `.conteudo` (`layout.component.scss`). Trocar qualquer um desses `clip` por `hidden`/`auto`
  **mata todo `position: sticky` da tela em silêncio** — é a tentação natural de quem está caçando
  overflow horizontal. Está comentado no SCSS; leia antes de mexer.
- **`@extend` + media query:** o seletor é injetado no media query, mas uma declaração **posterior**
  no arquivo com a **mesma especificidade** vence lá dentro. Foi assim que um `width: 18px` anulou
  um alvo de toque de 44px que "parecia" corrigido.
- **Especificidade anula media query:** `.bloco--modificador` (0,2,0) vence uma regra de media query
  em `.bloco` (0,1,0), e a regra simplesmente nunca roda. A correção é repetir o media query
  **dentro** do bloco do modificador, empatando a especificidade.
- **Nunca hardcodar hex/fonte/raio** (proibição #29) — sempre `var(--token)`. O tema troca em
  runtime; um hex solto não acompanha.
- **Base fixa + `min-width` num flex row transborda em silêncio.** `flex: 0 0 500px` numa coluna e
  `min-width: 260px` na irmã pedem 776px; numa linha de 644px o flexbox **não** encolhe nenhuma das
  duas — a segunda simplesmente sai por baixo do que estiver à direita, sem barra de rolagem e sem
  erro. Achado na `m2-21` (o card de Status do painel do jogador ficava por baixo da coluna lateral
  desde a m2-20). Em duas colunas que dividem uma linha de largura desconhecida, use `flex: 1 1
  <base>` + `min-width: 0` nas duas e trave o teto com `max-width`, nunca o piso.

**Angular**

- **Ler `input.required()` no corpo do construtor causa `NG0950` em runtime** e os testes **não
  pegam** (o TestBed injeta o input antes do primeiro change detection). Envolva em `effect()`.

**Backend / SQL**

- Todo SELECT precisa de `WHERE [tabela].is_deleted = false`; parâmetros nomeados (`:nome`), nunca
  posicionais nem interpolação; INSERT via `INSERT ... SELECT ... RETURNING`, nunca `VALUES`;
  nenhuma coluna com `DEFAULT`; soft delete sempre, `DELETE` físico nunca.
- **`COUNT(*)` do Postgres é `bigint`, e o driver `pg` devolve `bigint` como `string`** (evita
  perda de precisão) — um `COUNT(*)` sem `::int` explícito quebra silenciosamente qualquer DTO
  tipado `number` (TypeScript não pega; só aparece numa soma/comparação estranha em runtime).
  Sempre `COUNT(*)::int` quando o resultado alimenta um campo `number`. Achado na `m2-18`.
- **Controller é burro** — sem lógica, sem `try/catch`, sem `if`. A única micro-inteligência aceita
  é fundir id de `@Param`/`@Query` no DTO.

**Regras de jogo**

- **Amplificadores e Modificações escalam por COMPRA, não por stack bruto** — a 1ª compra em ■■
  (Flexível/Resistente/Potente/Conservador/Veloz) **não** dobra o bônus; a penalidade continua no
  bruto.
- Se código e `docs/core/sistema-v4.1.0.md` divergirem, **o documento vence** (proibição #27).
- **`docs/core/guia_de_mestre-v4.0.0.md` — "Guia de Criação de Ameaças" tem duas divergências
  internas entre a fórmula geral e o exemplo "A Estátua"**: o modificador Fraco em VD 30 (fórmula
  dá +5, o exemplo mostra "+6") e o mínimo de Fraqueza (fórmula exige 26 — metade da soma de
  resistências 52 —, o exemplo declara 20). Quando o próprio documento se contradiz entre regra
  geral e exemplo pontual, a **fórmula geral vence** (decisão de abertura da `m4-02`) — o exemplo é
  mais sujeito a erro de transcrição. Ver `shared/src/regras/criatura/modificadores.ts` e
  `a-estatua.spec.ts`. Relevante para `m4-06` (`shared/regras/npc`) se a Biblioteca de Referência
  tiver o mesmo tipo de inconsistência.
- **Criatura tem DTOs de operação próprios, não união com jogador (decisão de abertura da
  `m4-03`)** — `FichaCriaturaCriarDto`/`*CriadaDto`/`*RecuperadaDto`/`*AlteradaDto`
  (`shared/src/dtos/ficha/ficha-criatura-operacao.dtos.ts`), espelhando a decisão de "dois
  contratos, não um" já fechada em `m4-01` para o documento de jogo. `FichaRepository`
  continua único e sem duplicação (`criarFicha`/`recuperarPorId`/`alterarFicha` são SQL
  agnóstico da forma do JSONB); a ponte de tipos entre os dois contratos acontece só dentro de
  `FichaService`, num cast documentado (`paraCriaturaCriada`/`*Recuperada`/`*Alterada`). Mesma
  decisão vale de referência para `m4-07` (NPC).

**Processo**

- **Antes de qualquer UI**, ler `docs/design/DESIGN.md` e consumir `docs/design/tema/`. Isso já foi
  esquecido uma vez (`m0-05`) e a tela nasceu com preset Aura base + hex hardcoded.
- **Sessões concorrentes na mesma branch acontecem** — reconferir `git status`/`HEAD` antes de
  commitar ou revisar um diff.

---

## 7. Decisões Pendentes

Nenhuma decisão de rumo em aberto no momento.

A única que existia — **identidade visual do site** — está **resolvida**: tema "Terminal de
Contenção", handoff completo em `docs/design/`, com troca em runtime entregue na `m1-13`.

**Resolvida na `m4-04b`:** a pendência registrada na `m4-04` (`FichaVisualizacao`, a tela de ficha
de jogador, não sabia ler `ficha.dados` no formato de criatura — abrir uma criatura recém-criada
por `/painel/:campanhaId/ficha/:id` lançava `TypeError`) foi fechada com a opção prevista pela
própria spec: **tela dedicada** (`CriaturaVisualizacao`, `/painel/:campanhaId/criatura/:id`), não
um `modo`/tipo novo em `FichaVisualizacao` — ver seção 4, parágrafo "Visualização/edição".
`FichaVisualizacao` continua sem entender o formato de criatura, mas não precisa mais: a navegação
pós-criação e o card de criatura no painel do mestre (`m4-04b`) já levam à tela certa.

Questões que precisam de resposta do autor mas não são decisões de rumo estão marcadas com **⚠** na
seção 1 e em [`PROBLEMS.md`](PROBLEMS.md).
