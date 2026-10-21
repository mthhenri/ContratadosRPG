# Glifos e conceitos sem ícone — inventário para decisão

18/10/2026 · **proposta aberta, sem alteração no produto e sem voto presumido**.
[Spec](../icones-recursos-glifos-e-pendencias.spec.md) · [prancha de domínio](prancha-propostas.html) · [prancha de ações](prancha-acoes.html) · [ocorrências](ocorrencias.md).

## Método, fonte e alcance

Leitura da spec, `AGENTS.md`, `SYSTEM.SPEC.md` §3.1/§8/§16, `CONVENTIONS.md`, `DESIGN.md`, tokens e skill `gerenciamento-de-impacto`. A skill foi exercitada neste recorte pelo levantamento de consumidores e classificação abaixo; nenhum item compartilhado foi modificado. Catálogo conferido em `frontend/src/app/shared/icone/icone.component.ts:70` e geometrias no template irmão. Fontes de regra: cópias publicadas `docs/core/sistema-v4.1.5.md` e `guia_de_mestre-v4.2.0.md`, somente leitura; não se propõe mudar regras.

Varredura de todos os templates e SCSS em `frontend/src/app`: **261 ocorrências de 37 caracteres em 68 arquivos**. Comentários foram descartados preservando linha, e SCSS foi limitado a `content:`. O apêndice versionado mantém caminho/linha, caractere e classificação; JSON com trecho e script reproduzível ficam em `.artifacts/icones-recursos-glifos-e-pendencias/`. A seleção cobre caracteres Unicode da categoria de símbolos (S) e os sinais editoriais `›`/`⌊`/`⌋`, incluindo matemática para torná-la explicitamente preservada. É inventário de fonte estática: strings ASCII, glifos emitidos por TS e textos do banco/Markdown podem exigir levantamento complementar; não é censo de toda a tipografia do site.

Análogos da prancha: `docs/specs/done/icones-recursos-sistema/prancha-icones.html` e `docs/specs/done/ui-41-cenas-icone-por-tipo/prancha-icones.html`. Mesma comparação por cartão e voto copiável, tokens congelados e desenho técnico de contorno (24×24, traço 1,75, pontas arredondadas); contexto real de uso de Maestria é `shared/ui/atributo-ficha`, de Crítico é `shared/resultado-rolagem`. A prancha é anexo offline, não uma nova UI do produto. Fontes IBM Plex usam fallback local; não há download.

## Prioridade 1 — conceitos que hoje já são ícones de texto

Todos os caminhos a seguir são relativos à raiz. `pedido` significa o recorte da proposta, não autorização de implementação.

| Item | Consumidores e semântica | Impacto / recomendação |
|---|---|---|
| **Maestria `★`** | `frontend/src/app/shared/ui/atributo-ficha/atributo-ficha.component.html:13,73,77`: alternar Maestria e duas marcas flanqueando a sigla. `frontend/src/app/modules/ficha/paginas/criar/criar.page.html:516`: escolha na criação. `frontend/src/app/modules/ficha/componentes/ficha-campanha-card/ficha-campanha-card.component.html:1071,1244,1252`: controle/marcas da versão de campanha. Fonte: `docs/core/sistema-v4.1.5.md:85`–93. | **pedido**, propor nome próprio `maestria`, duas opções na prancha. Preferência técnica **A, Ápice**; B, Atributo coroado, alternativa mais compacta. Não pegar `habilidade-geral` (estrela de categoria) nem `patente`/`habilidade-especialidade` (medalhas). A regra fala em ápice, não define a estrela como notação obrigatória. Preservar texto, dica, estado ativo/desabilitado e quantidade/posição das marcas salvo decisão separada. |
| **Crítico `◆`** | `frontend/src/app/shared/resultado-rolagem/resultado-rolagem.component.html:62`: quantidade de críticos do grupo. Fonte: `docs/core/sistema-v4.1.5.md:2395`–2399. O badge `crítico ×2` no mesmo arquivo:19 é texto, não alvo de substituição. | **pedido**, propor nome próprio `critico`. Preferência técnica **A, Dado excepcional**; B, Pico, evita a silhueta de dado mas é abstrata. Não reutilizar `fragmento`, gema de `habilidade-unica` ou `dano-explosao`: cada um tem sentido próprio. Ícone sempre junto à quantidade e nome acessível. Nenhuma inferência sobre dano/cura futuro ou alteração de fórmula. |
| **Gastar Energia `⚡`** | `frontend/src/app/modules/ficha/componentes/ficha-habilidades/ficha-habilidades.component.html:198`, botão `Utilizar`, desabilitado com custo zero; flash `−N E` é texto numérico. | **pedido**, propor usar o **existente `energia`** ao lado de “Utilizar”; não criar glifo. Uso expressa gasto do próprio recurso, não habilidade genérica. Implementação futura mede densidade do botão e estados gasto/zero/desabilitado; não amplia primitivo. |

**Decisão pedida:** votar Maestria A/B/manter ★; Crítico A/B/manter ◆; aprovar ou rejeitar adoção do `energia` existente em “Utilizar”. Mesmo após voto, cada implementação recebe task própria e mapa de consumidores.

## Prioridade 2 — ícones de interface com substituto no catálogo

O [apêndice](ocorrencias.md) lista **todos os caminhos/linhas encontrados**, inclusive montador experimental; não autoriza trocar os dois montadores como uma única tela. Cada superfície e estado deve entrar no aceite da task de adoção.

| Glifo / significado | Recorte rastreável representativo | Classificação e proposta |
|---|---|---|
| `✕`, `×`: fechar, remover, cancelar, limpar | `shared/historico-rolagens-sidebar/historico-rolagens-sidebar.component.html:68`; `modules/ficha/componentes/ficha-sanidade/ficha-sanidade.component.html:56,165,277`; `modules/ficha/componentes/ficha-inventario/ficha-inventario.component.html:1225,1236`; `modules/regras/regras-pesquisa.component.html:28` (prefixo comum `frontend/src/app/`) | **pedido** nos locais listados no apêndice. Propor `excluir` existente **somente para remover/excluir dados** (é lixeira). Fechar e Cancelar não têm equivalente nominal e recebem duas alternativas próprias cada na [prancha de ações](prancha-acoes.html). Não alterar multiplicação. |
| `✎`: editar | `frontend/src/app/modules/ficha/componentes/ficha-sanidade/ficha-sanidade.component.html:47,156,268` e variantes da ficha no apêndice | **pedido**: `editar` existente. Preservar confirmação e foco. |
| `✓`: confirmação, já adicionado ou seleção | `frontend/src/app/modules/ficha/componentes/ficha-combos/ficha-combos.component.html:112`; `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.html:756,831,1311`; `frontend/src/app/modules/simulacao/paginas/compras/compras.page.scss:458` | **pedido**: `check` existente, inclusive trocar conteúdo CSS por nó de apresentação só em task aprovada. Preservar “Adicionado”, não converter mensagem inteira em ícone. |
| `＋`: adicionar | `frontend/src/app/modules/ficha/componentes/npc-visualizacao/npc-habilidades-lista.component.html:27,41`; `frontend/src/app/modules/ficha/componentes/ficha-sanidade/ficha-sanidade.component.html:18,117,226` | **pedido**: `mais` existente. Operador `+` de fórmulas fica texto. |
| `▴`/`▾`: recolher/expandir | `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.html:1005`; `frontend/src/app/modules/ficha/componentes/npc-visualizacao/npc-equipamento.component.html:194`; `frontend/src/app/modules/simulacao/paginas/compras/compras.page.html:465` | **pedido**: `chevron` existente e rotação do consumidor conforme estado; preservar aria-expanded/foco. |

Sugestão: uma task de adoção dos ícones existentes, dividida por superfície se a matriz visual ficar grande. Não mudar o desenho compartilhado de nenhum ícone para acomodar um único consumidor.

## Interfaces genéricas — propostas para voto e alcance

| Uso | Consumidores | Proposta / limite |
|---|---|---|
| `❐` / `□`, restaurar/maximizar janela | `frontend/src/app/shared/montador-rolagem/montador-rolagem.component.html:42`; `shared/montador-rolagem-experimental/montador-rolagem-experimental.component.html:43`; `modules/pagina-caderno/caderno-flutuante.component.html:54`; `modules/regras/regras-flutuante.component.html:38`; `modules/documento/componentes/biblioteca-flutuante/biblioteca-flutuante.component.html:41` (mesmo prefixo) | **pedido**, Maximizar e Restaurar têm duas alternativas próprias cada na [prancha de ações](prancha-acoes.html). `tamanho-real`/`ajustar-largura` pertencem ao leitor de imagem; emprestá-los criaria acoplamento semântico. As alternativas de janela têm nomes próprios; nenhuma aprovação é presumida pelo desenho. |
| `−`, minimizar | `frontend/src/app/shared/ui/painel-flutuante/painel-flutuante.component.html:43` | **pedido**, duas alternativas de Minimizar na prancha de ações; não confundir com diminuir quantidade/operador. Adoção depende de voto e alcance explícitos. |
| `↑`/`↓`, mover peça ou rolar ao início/fim | `frontend/src/app/modules/regras/oficina/oficina-peca.component.html:43,54`; `modules/regras/regras-leitor.component.html:74,84`; `modules/ficha/componentes/ficha-combos/ficha-combos.component.html:221,233` (mesmo prefixo) | **pedido**, duas alternativas para cada uma das quatro ações na prancha de ações: mover acima/abaixo e rolar ao início/fim. Ordenar e rolar são ações diferentes. Não reutilizar `voltar` com outro significado só pela seta. |
| `●`, estado/marcador | `frontend/src/app/modules/encontro/componentes/cartao-combatente/cartao-combatente.component.html:78`; `frontend/src/app/modules/ficha/componentes/ficha-habilidade-seletor/ficha-habilidade-seletor.component.scss:136` | **destoa** da troca de ícones nominados: seletor de cor do combatente e marcador de ficha própria, manter. Conferir texto acessível em eventual task de acessibilidade. |
| `→`, `←`, `›` e `+`/`−` editoriais | Links “Ver ficha”, “Pegar”, sequência de combo, escala “mais fraco/mais forte”, ajuda e listas de patchnotes; caminhos/linhas no apêndice | **destoa**: direção textual, hierarquia ou sinal de adição/remoção editorial; manter. Avaliar localmente apenas se o autor pedir uniformização de navegação. |

## Conceitos do sistema sem glifo próprio: não equivalem a lacuna de UI

Conferência do catálogo `IconeNome` contra o livro e rótulos existentes. Estes itens não ganham propostas de desenho nesta rodada: **recomendação é conservar texto**, porque os consumidores atuais comunicam conceito e valor. Não se inventa uma exigência de ícone para cada substantivo do sistema.

| Conceito | Fonte de jogo e tela atual | Tratamento proposto |
|---|---|---|
| Proficiência | `docs/core/sistema-v4.1.5.md:1065`; `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.html:1137` | Rótulo/valor; manter. Não usar `dado-mais` (Competência). |
| Deslocamento / Área de Percepção | livro:1142/1147; `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.ts:1829` e composição de Status no template:1297 | Manter rótulo, metros e valores. `olho` é ação de ver, `cena-perseguicao` identifica tipo de cena; não emprestar. No guia de mestre:543 há deslocamento por modo; não resumir todos em corrida. |
| Prestígio / Salário / limite de crédito | livro:1082–1090; `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.html:431,792,1720,1726` | Manter texto/valor/moeda. `patente` é a patente, não seu índice numérico ou pagamento. |
| Afinidade de Fragmentos | livro:3211–3223; template anterior:1999,2002 | Manter valor e consequências por extenso. Não usar o diamante de Fragmento como indicador de Afinidade. |
| Sequelas / Traumas / Lesões | livro:174/198/3010/3049; `frontend/src/app/modules/ficha/componentes/ficha-sanidade/ficha-sanidade.component.html` | São listas com texto e ações. `sanidade` já identifica a seção e `infinito` a lesão permanente; não inventar glifos por gravidade. |
| Limite de Energia / Habilidades por turno | livro:139/1276; Status da ficha acima | Conservar números e rótulos. `energia` representa recurso, não capacidade de ações. |
| Peso/carga de Inventário | livro:1123–1128; `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.html:6` | Conceito já está expresso por peso usado/máximo; `inventario` e `alerta` já cobrem seção/sobrecarga. Sem novo desenho. |

**Exclusões conscientes:** os 21 itens já votados em `done/icones-recursos-sistema/votacao-prancha.md`, Vida/Energia/Defesa, identidades de classe/arquétipo/Civil/NPC, marcas oficiais e cinco tipos de cena/UI-41. VD/Tenacidade pertencem à task própria. Também não se redesenha Descanso ou categorias de equipamentos já cobertas pelo catálogo.

## Texto autoral e notação preservados

`⬡`, `⬥`, `⬦`, `◈` no livro são hierarquia/categorias autorais; `■`/`▢` são convenções de empilhamento/alternativas. Exemplos rastreáveis: `docs/core/sistema-v4.1.5.md:56,85,130,369,951,3131`. São conteúdo publicado, não ícones de interface substituíveis nesta tarefa. `×`, `÷`, `−`, `⌊`/`⌋`, `×N`, `$` e abreviações de atributo/unidade são matemática ou dados; ficam texto. `resultado-rolagem...html:19` mantém “crítico ×2”; `ficha-inventario...html:914` mantém “×quantidade”. `●` em CSS e separadores `·` não exigem ícone catalogado. Não editar `docs/core/` nem o conteúdo do livro para limpar símbolos.

## Divergência de tooltip — decisão explícita pendente

Contrato original: **“3 de Energia” / “12 de Vida”**. Implementação atual: **“Energia” / “Vida” / “Defesa”**, ao lado do nome/valor visíveis. A divergência permanece aberta; esta análise não constitui aceite.

| Área | Local exato e propagação |
|---|---|
| Primitivo Stat | `frontend/src/app/shared/ui/stat/stat.component.html:10`, `[appTooltip]="rotulo()"`. Atinge todas as instâncias com ícone, incluindo Defesa passada explicitamente e Vida/Energia derivadas da variante. Valores podem ser projetados (`appStatValor`), strings ou ausentes; concatenar `valor()` no primitivo sem avaliar cada instância é incorreto. |
| Primitivo BarraRecurso | `frontend/src/app/shared/ui/barra-recurso/barra-recurso.component.html:4`; existe ainda tooltip de explicação no rótulo:8. Barra tem atual/máximo e edição independente; por extenso deve especificar “14 de 60 de Vida”, não escolher um número arbitrário. |
| Lista/acervo | `frontend/src/app/modules/campanha/paginas/lista/lista.page.html:102`; `frontend/src/app/modules/ficha/componentes/cartao-ficha-acervo/cartao-ficha-acervo.component.html:35,42,53,58,69,73` |
| Equipe/esquadrão | `frontend/src/app/modules/campanha/paginas/detalhe-jogador/detalhe-jogador.page.html:773,782`; `frontend/src/app/modules/cena/componentes/esquadrao-cena-jogador/esquadrao-cena-jogador.component.html:38,44` |
| Criatura/reação | `frontend/src/app/modules/ficha/componentes/criatura-visualizacao/criatura-visualizacao.component.html:253,335`; `frontend/src/app/modules/ficha/componentes/ficha-reacoes/ficha-reacoes.component.html:15` |
| Custos Energia | `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.html:644,668`; `frontend/src/app/modules/ficha/componentes/npc-visualizacao/npc-habilidades-lista.component.html:153,253` |
| Consumidores posteriores à rodada original | `frontend/src/app/modules/campanha/componentes/espectador-ficha-card/espectador-ficha-card.component.html:68`; `frontend/src/app/modules/campanha/componentes/criatura-esquadrao-card/criatura-esquadrao-card.component.html:46` |
| Leitor de regras, ícones sem tooltip próprio | `frontend/src/app/modules/regras/blocos/regras-ficha-criatura.component.html:81,95`; `regras-habilidade.component.html:30`; `regras-modulos.component.html:55`; `regras-saude.component.html:8,40` (mesmo diretório). Não incluí-los silenciosamente numa troca do contrato de recursos: são leitura de conteúdo. |

**Recomendação para o autor: opção T1, manter nome** quando há nome/valor vizinhos. Preserva todos os rótulos e evita tooltip que muda durante edição. Se aprovada, documentar a revisão do contrato e verificar os consumidores acima em task própria. **T2, por extenso:** cumprir o original, definindo antes atual/máximo, valor projetado/ausente e “Defesa 12” versus “12 de Defesa”; tarefa alcança os dois primitivos e todos os locais listados. **T3, recorte misto:** nome em cabeçalhos/barras e por extenso em custo solto; exige listar os consumidores aprovados, não uma heurística automática. Nenhuma opção foi aplicada.

## Cobertura e o que continua aberto

A rodada anterior não comprova tema claro em todos os pontos novos nem toque em aparelho físico. A prancha permite comparar as duas bases e ícones a 16px, mas **não** comprova o comportamento do produto, tooltip real ou aparelho de toque. O fecho de 09/10 cobre as três correções antigas de Esquadrão/Fragmentos; não se repetiu a adoção já entregue.

Para o aprovado: task própria deve percorrer as superfícies acima nos estados normal/ativo/desabilitado/confirmando e quantidade de crítico zero/um/vários quando pertinentes, bases clara/escura, 1920×1080, 1366×768, 960×1080 e 360×800. Incluir hover, foco/teclado, toque emulado e declarar separadamente se houve aparelho físico. Sem essa evidência, o ponto continua aberto. Não há alteração de produto que justifique build/teste/lint de aplicação nesta etapa documental; gate do repositório é consolidado pelo orquestrador.

Decisões que faltam: M-A/M-B/manter; C-A/C-B/manter; adoção do `energia` existente; escopo de ações genéricas; T1/T2/T3 com formato de barras/Defesa; priorização de janelas/ordenar/rolar. A prancha não fecha a spec nem inicia implementação automaticamente.

## Complemento — impacto indireto conferido

`npm run impacto -- frontend/src/app/shared/ui/atributo-ficha/atributo-ficha.component.ts`: 2 consumidores e 1 teste. A ficha de jogador usa Maestria (**pedido**); `frontend/src/app/modules/ficha/componentes/npc-visualizacao/npc-atributos.component.html:73` passa `[mostrarMaestria]="false"` (**destoa**, preservar invisibilidade, sem adotar desenho em Competência).

`npm run impacto -- frontend/src/app/shared/resultado-rolagem/resultado-rolagem.component.ts`: 3 consumidores e 1 teste. `frontend/src/app/shared/bandeja-dados/bandeja-dados.component.html:66`, `frontend/src/app/shared/cartao-rolagem/cartao-rolagem.component.html:14` e `frontend/src/app/shared/montador-rolagem-experimental/montador-rolagem-experimental.component.html:226` são **acompanha**, mas a inclusão na futura implementação exige alcance aprovado: bandeja, histórico/cartões e preview experimental precisam ser verificados separadamente. Nenhum deve mudar só porque o autor aprovou o desenho na ficha.

`npm run impacto -- --icone energia`: 34 candidatos e 10 testes, incluindo falsos positivos de variante/string. **Nenhum dos consumidores existentes muda** na proposta de substituir o relâmpago de “Utilizar”: não há redesenho/renomeação de `energia`. Somente o botão `ficha-habilidades...html:198` seria um consumidor novo do mesmo recurso. O alcance de **tooltip** é separado e maior, conforme a tabela acima; o relatório da ferramenta não prova que todos os 34 candidatos sejam ícones.

## Complemento — busca ampliada de símbolos Unicode

A conferência por categoria Unicode encontrou outros controles de texto além da seleção inicial. Eles estão incluídos nas 261 ocorrências do apêndice; não se perdeu a cobertura ao priorizar duas propostas de domínio.

| Caractere / uso | Arquivo:linha (prefixo `frontend/src/app/`) | Decisão proposta |
|---|---|---|
| `⌕`, buscar | `modules/ficha/componentes/ficha-habilidade-seletor/ficha-habilidade-seletor.component.html:60`; `modules/ficha/componentes/ficha-habilidades/ficha-habilidades.component.html:115`; `modules/ficha/componentes/guia-equipamento-loja/guia-equipamento-loja.component.html:4` | **pedido**, adotar `busca` existente em task própria. |
| `ⓘ`, informação/ajuda | `modules/simulacao/paginas/patente/patente.page.html:37`; `modules/ficha/componentes/ficha-campanha-card/ficha-campanha-card.component.html:792` | **pedido**, adotar `info` existente; manter dica/foco. |
| `↺`, limpar/restaurar padrão | `modules/ficha/componentes/ficha-habilidades/ficha-habilidades.component.html:107`; `modules/simulacao/componentes/ajuda-simulacao/ajuda-simulacao.component.html:15` | Limpar filtro pode usar `vassoura` existente (tabela antes/depois da prancha). Restaurar a aba ao padrão tem duas alternativas próprias na prancha de ações e deve conservar a confirmação. Não usar `refazer` (histórico) como sinônimo de reset. Decidir as duas adoções separadamente. |
| `⋯`, menu de ações | `modules/campanha/paginas/detalhe-jogador/detalhe-jogador.page.html:268`; `modules/campanha/componentes/espectador-ficha-card/espectador-ficha-card.component.html:118`; `modules/campanha/componentes/criatura-esquadrao-card/criatura-esquadrao-card.component.html:64`; `modules/ficha/paginas/visualizar/visualizar.page.html:191`; `modules/ficha/componentes/cartao-ficha-acervo/cartao-ficha-acervo.component.html:104` | **pedido**, genérico ausente no catálogo: duas alternativas de Menu de ações na prancha de ações. Não substituir por `mais` (adicionar). |
| `⋮⋮`, alça de arrastar | `modules/regras/oficina/oficina-sumario.component.html:3,27` | **pedido**, controle genérico ausente: duas alternativas de Alça de arrastar na prancha de ações. Não confundir menu com grip; tem alternativa de teclado por Alt+setas. |
| `⌫`, apagar último termo | `shared/montador-rolagem/montador-rolagem.component.html:442` | **pedido**, ação específica sem glifo no catálogo: duas alternativas de Apagar último termo na prancha de ações. Não usar lixeira nem mudar para apagar a fórmula inteira. |
| `⛓`, rolagem encadeada | `modules/ficha/componentes/ficha-rolagens/ficha-rolagens.component.html:54` | **pedido**, conceito de UI já existente (vários passos), sem glifo próprio: duas alternativas de Rolagem encadeada na prancha de ações. Não emprestar o `link` de Fragmento ou `vincular` ficha. Desenho proposto; voto e implementação permanecem abertos. |
| `⬦`/`▢`/`◻`, marcas editoriais do leitor | `modules/regras/blocos/regras-ficha-criatura.component.html:40,53,66,136,164`; `regras-nota.component.html:14`; `regras-origens.component.html:5` (mesmo diretório) | **destoa**, hierarquia/seção/lista: preservar. O quadrado de Origem não impõe um novo ícone de identidade. |
| `█`, `±`, `≤`, `≈`, `∅` | Expurgos em `shared/documento-contencao/documento-contencao.component.html:31`, acesso negado/patchnotes; sinais e rótulo “Módulo ∅” nas linhas do apêndice | **destoa**, identidade autoral, matemática ou notação do jogo; preservar texto. |

Verificação técnica do anexo: script executado em DOM controlado, sintaxe válida, quatro alternativas em dois grupos, 20 SVGs (Maestria flanqueia o atributo), seleção exclusiva/desmarcar/manter, `aria-pressed`, resumo e fallback de cópia aprovados. Sem URL externa, importação ou chamada de rede. A primeira asserção contava 16 SVGs e foi corrigida para 20 ao contar as duas marcas de Maestria; nenhuma falha funcional observada. `git diff --check` aprovado. Clipboard nativo e renderização visual ainda dependem da inspeção pessoal do orquestrador; não foram certificados pelo teste de DOM.

## Prancha de ações — cobertura ampliada para decisão

[prancha-acoes.html](prancha-acoes.html) completa os conceitos ausentes encontrados: **14 conceitos, duas alternativas originais por conceito (28 desenhos, 112 instâncias SVG)**. Não adia desenho por decisão do agente. Todos continuam **aguardando priorização, voto e alcance do autor**; produzir o anexo não aprova nem implementa o conceito. Cada grupo também permite manter a representação atual.

| Conceito proposto | Alternativas | Recomendação técnica, sem voto presumido |
|---|---|---|
| Menu de ações | A Três pontos · B Três módulos | A conserva a leitura de reticências sem confundir com adicionar. |
| Alça de arrastar | A Seis apoios · B Trilhos | A distingue grip de menu. |
| Apagar último termo | A Tecla de recuo · B Termo retirado | A comunica backspace; preservar escopo do termo. |
| Rolagem encadeada | A Passos ligados · B Fluxo | B explica sequência sem emprestar o elo de Fragmento/ficha. |
| Minimizar janela | A Traço inferior · B Janela recolhida | B comunica redução à faixa sem subtração isolada. |
| Maximizar janela | A Quadro inteiro · B Quatro cantos | A identifica janela, distinta de enquadrar imagem. |
| Restaurar janela | A Quadros sobrepostos · B Janela e retorno | A conserva a leitura do glifo atual sem texto de fonte variável. |
| Mover acima | A Seta e lista · B Troca de posição | A usa lista para distinguir ordem de rolagem. |
| Mover abaixo | A Seta e lista · B Troca de posição | A faz par com mover acima. |
| Rolar ao início | A Seta até o limite · B Duas etapas | A mostra o limite da página. |
| Rolar ao fim | A Seta até o limite · B Duas etapas | A faz par com rolar ao início. |
| Fechar painel | A Cruz aberta · B Cruz no aro | A usa menor densidade; não sugere exclusão. |
| Cancelar edição | A Retorno ao campo · B Interromper | A explicita retorno; B pode ser confundido com indisponível. |
| Restaurar valores padrão | A Padrão de origem · B Ciclo e referência | B comunica reset com referência, mantendo confirmação. |

**Catálogo conferido para equivalência nominal e semântica**, não só por semelhança: `tamanho-real`/`ajustar-largura` são controles do leitor de imagem (template do ícone:1101/1113); `voltar` é voltar na navegação (:482); `chevron` é expandir/recolher (:455); `excluir` é lixeira (:493); `vincular` anexa ficha (:918); `refazer`/`desfazer` são histórico. Não são equivalentes das novas ações acima. O `chevron` existente cobre os triângulos de expansão; não se cria desenho novo para isso. Para edição, exclusão, confirmação, adicionar, busca, informação, Energia e limpar filtro, a prancha traz **somente tabela antes/depois** com os ícones existentes.

A versão inicial sugeria `excluir` para todo X e deixava ações genéricas sem desenho. A conferência de geometria/semântica corrigiu a recomendação **nesta proposta**, sem alteração do produto: exclusão usa lixeira; fechar/cancelar têm propostas próprias. Não há decisão do autor registrada ainda.

Mesmos análogos, tokens congelados, família de contorno e bases clara/escura da prancha de domínio. Cada ação aparece ampliada e em contexto de 16px; nomes/aria/tooltip são mantidos no produto futuro. A tarefa de implementação terá de mapear fechar versus cancelar em cada ocorrência do apêndice, inclusive primitivos Modal/Gaveta/Notificação/PainelFlutuante, sem converter toda cruz em uma mesma ação automaticamente.

Validação técnica da prancha de ações: **14 grupos, 28 alternativas, 112 SVGs**; sintaxe JavaScript válida, voto exclusivo/desmarcar/manter e `aria-pressed` conferidos em cada grupo, resumo independente e fallback de cópia aprovados em DOM controlado. Sem URLs externas ou chamadas de rede. A prancha de domínio foi revalidada após receber o link cruzado e continua aprovada nos mesmos checks. `git diff --check` sem erros. Capturas, renderização nos dois viewports e clipboard nativo não são comprovados por esses checks e ficam sob inspeção pessoal do orquestrador; produto não foi alterado.


Refino antes de oferecer a prancha de ações para voto: a inspeção pessoal do orquestrador encontrou colisão perceptiva entre Maximizar B e Restaurar janela B em 16px. Somente Restaurar B mudou: saiu o quadro central com quatro cantos e entrou uma janela menor no canto inferior esquerdo com seta diagonal entrando. Nome/descrição acompanham o novo desenho; demais alternativas e votos não foram alterados. O teste compara o par e exige seta diagonal/quadro contínuo na restauração, mantendo os quatro cantos da maximização; a comparação visual final permanece com o orquestrador. HTML da prancha de ações formatado com Prettier para revisão linha a linha.

## Atualização de decisões — 2026-10-18

Os trechos anteriores documentam a proposta antes dos votos. O autor escolheu
Maestria B, Crítico A com estrelinhas em lugar dos riscos, Energia existente em
Utilizar e T3 misto. O recorte de tooltips e os votos das ações permanecem abertos.
[Registro vigente](decisoes.md). Três tasks próprias foram criadas no backlog;
o autor explicitou que esta rodada não autoriza implementação no produto.
