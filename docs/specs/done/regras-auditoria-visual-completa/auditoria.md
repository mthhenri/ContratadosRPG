# Auditoria visual da página de Regras — 09/10/2026

Spec dona: [regras-auditoria-visual-completa](../regras-auditoria-visual-completa.spec.md).

**Bateria encerrada; correções abertas.** Foram confirmados dez grupos de inconsistências e criadas dez specs no backlog, somente depois da inspeção visual. Esta tarefa não alterou código, Markdown autoral, JSONs derivados ou configurações permanentes; não fez commit/push.

O defeito de maior risco é a associação incorreta entre chave e valor de quatro tabelas no celular. A apresentação combina dados de dois pares independentes e pode induzir uma leitura errada da regra, embora os dados completos permaneçam no DOM.

## Ambiente, referências e método

- Aplicação real em `http://localhost:4300/regras/sistema` e `/regras/guia`, navegador Chromium do Codex, sem autenticação. A leitura pública não precisou de backend/Postgres.
- Sistema v4.1.4 e Guia v4.2.0, fontes em [docs/core](../../../core/sistema-v4.1.4.md) e [Guia](../../../core/guia_de_mestre-v4.2.0.md). Constituição/convenções/contexto e [design](../../../design/DESIGN.md) consultados; execução pelas skills `verify` e `design-fidelity`.
- Análogos: corpo aprovado de Regras e seus cartões ricos de classe/subclasse, `app-cartao`, Abas/Aba, Chip, Stats, Botão/BotãoÍcone, gaveta/estado vazio/tooltip em `shared/ui/`. A leitura de Patchnotes serve de referência de prosa/links e Biblioteca de busca/shell. Foram comparados shell, densidade, hierarquia, espaçamento, controles, estados, ícones e adaptação de colunas.
- Varredura contínua dos dois livros em página desktop/mobile, seguida de conteúdo das abas alternativas, posições horizontais de tabelas e estados de interação. Capturas foram pessoalmente observadas; geometria/DOM e trechos da fonte corroboram achados, sem substituir a observação.
- A inspeção atravessou alterações/publicações de outra sessão. A tela de fecho mostrou app **1.7.2**, commit local `8b854814`. Os exemplos diretos escolhidos para os achados foram reconferidos no fecho; a varredura longa é evidência da sessão, não certificação de um único commit imutável. Alterações encontradas no início foram preservadas.

## Cobertura realizada

| Visão | Sistema | Guia | Alcance |
|---|---|---|---|
| Página 1920×1080, escura | Conteúdo contínuo + nove arquétipos | Conteúdo contínuo | Textos, grades, tabelas, notas, cartões, listas, rodapé |
| Página 360×800, escura | Conteúdo contínuo + nove arquétipos | Conteúdo contínuo | Uma coluna, tabelas com rolagem, barra/sumário, notas e rodapé |
| Página 1366×768 | Subclasse, shell e blocos ricos | Catálogo de NPCs e rodapé | Padrões representativos, não uma segunda leitura integral |
| Página 960×1080 | Capa/prosa e subclasse | Capa/prosa e catálogo de NPCs | Quebra das colunas e densidade do trilho |
| Painel normal, três larguras desktop | Subclasse, prosa, busca/gaveta | Prosa e ficha de exemplo | Header, ações, rolagem local, largura limitada |
| Painel maximizado, três larguras desktop | Subclasse e trilho | Catálogo/prosa/ficha de exemplo | Shell, dois trilhos, conteúdo e controles |
| Painel 360×800 | Prosa, link interno, subclasse e gaveta | Prosa, NA, tabela e gaveta | Ocupa a área disponível; não há botão de maximização separado |
| Base clara 1920×1080 / 360×800 | Subclasse/Stats/destaques | Prosa, tabela, catálogo e painel | Recortes representativos; preferência escura restaurada |

Foram observadas **43 tabelas tabulares**: 14 no Sistema e 29 no Guia, além de grades e blocos ricos. No mobile, 10 tabelas do Sistema e 22 do Guia excediam a largura local. Todas tiveram o fim da rolagem horizontal exercitado; tabelas de quatro ou mais colunas também tiveram posições intermediárias. Tabelas altas de Formação, Níveis, Patentes, exemplos de Criações Originais e Tenacidade receberam capturas verticais adicionais. Prestígio/Crédito/Modificações/Salário foram observados separadamente na tabela de Patentes.

A leitura contínua cobriu os estados padrão Lutador, Engenheiro e Paramédico; os seis estados alternativos Mercenário, Vanguarda, Assassino, Acadêmico, Diplomata e Comandante foram inspecionados em desktop e mobile. Capturas de abertura complementam os painéis longos, pois o recorte de página completa pode começar depois do cabeçalho.

| Interação/estado | Resultado observado |
|---|---|
| Troca Sistema/Guia e sumário | Livro, rótulos e destinos corretos; gaveta fecha ao escolher destino |
| Busca sem resultado | Estado vazio preservado e legível |
| Busca Mercenário | Revela a aba oculta e destaca o título; contador 1 de 1 |
| Busca Deslocamento | 41 resultados na sessão; Enter e Shift+Enter mudam destino; Esc limpa |
| Busca Energia no painel | Contador 1/76 → 2/76; próximo/anterior e limpar funcionam |
| Busca no outro livro | Guia sem Mercenário oferece um resultado no Sistema; ação abre o destino e revela a aba |
| Link interno Gerais no painel | Navega e destaca o título dentro do leitor |
| Abas por teclado | ArrowRight de Mercenário seleciona Vanguarda; foco e seleção aparecem |
| Minimizar/reabrir/restaurar painel | Ações exercitadas; conteúdo volta a aparecer |
| Abrir página pelo painel | Abre Guia na âncora exemplo-de-ficha-completa |
| Tooltip de Morrendo, mobile | Conteúdo visível, caixa contida na largura e foco no termo |
| Foco das tabelas | Contorno visível e teclado permite rolagem horizontal |
| Voltar ao topo e rodapé | Ação e marca observadas; capturas aguardaram a animação antes da conclusão |

## Achados e ordem sugerida

“Alta” significa leitura potencialmente enganosa ou conteúdo sobreposto/cortado; “média”, hierarquia/legibilidade/formatação; “baixa”, acabamento localizado. Os problemas permanecem abertos, mesmo quando existe contorno.

| ID / problema | Prioridade | Inconsistência | Spec |
|---|---|---|---|
| RV-01 / P-114 | alta | Preservar associações nas tabelas com dois pares | [regras-visual-01-pares-tabelas](../../backlog/regras-visual-01-pares-tabelas.spec.md) |
| RV-02 / P-115 | alta | Conter os bônus longos dos cartões | [regras-visual-02-bonus-longos](../../backlog/regras-visual-02-bonus-longos.spec.md) |
| RV-03 / P-116 | alta | Conter rótulos de ameaça nas tabelas mobile | [regras-visual-03-rotulos-ameaca-tabelas](../../backlog/regras-visual-03-rotulos-ameaca-tabelas.spec.md) |
| RV-04 / P-117 | alta | Preservar a hierarquia das grades de referência | [regras-visual-04-grades-semanticas](../../backlog/regras-visual-04-grades-semanticas.spec.md) |
| RV-05 / P-118 | média | Dar espaço aos nomes e ícones das abas mobile | [regras-visual-05-abas-arquetipos-mobile](../../backlog/regras-visual-05-abas-arquetipos-mobile.spec.md) |
| RV-06 / P-119 | média | Estruturar notas e bônus apresentados como texto contínuo | [regras-visual-06-notas-e-formacoes](../../backlog/regras-visual-06-notas-e-formacoes.spec.md) |
| RV-07 / P-120 | média | Renderizar o tachado do Markdown no leitor | [regras-visual-07-tachado-inline](../../backlog/regras-visual-07-tachado-inline.spec.md) |
| RV-08 / P-121 | média | Uniformizar a apresentação das habilidades passivas de NPCs | [regras-visual-08-habilidades-passivas-npcs](../../backlog/regras-visual-08-habilidades-passivas-npcs.spec.md) |
| RV-09 / P-122 | média | Dar contraste aos rótulos semânticos na base clara | [regras-visual-09-contraste-base-clara](../../backlog/regras-visual-09-contraste-base-clara.spec.md) |
| RV-10 / P-123 | baixa | Evitar texto incorreto e seta órfã na busca | [regras-visual-10-busca-microcopy-mobile](../../backlog/regras-visual-10-busca-microcopy-mobile.spec.md) |

### RV-01 — Pares independentes combinados pela coluna fixa

**Reprodução:** em 360×800, mover até a direita as tabelas Formação, Níveis e Melhorias de Agente, Corpo e Pontuação Corporal e Treinamentos.

A coluna 1 fica fixa enquanto a coluna 4 passa a ser o valor visível. A coluna 3, chave real desse valor, fica escondida. Exemplos reconferidos:

| Recorte | Par real à esquerda | Par real à direita | Associação aparente após rolar |
|---|---|---|---|
| Formação | Combate → bônus com arma | Equipamento → +1 dado com itens medicinais | Combate → bônus medicinal |
| Níveis | 00 → INICIAL | 11 → bônus de nível 11 | 00 → bônus de nível 11 |
| Corpo | Inferior a 0 → 0 de dano físico | 8 e 9 → 2D6 de dano físico | Inferior a 0 → 2D6 |
| Treinamentos | Nenhum → INICIAL | Profissional → +1 Habilidade Civil e +1 Atributo | Nenhum → bônus de Profissional |

O DOM mantém os quatro valores; a falha está na associação visual. O SCSS fixa indiscriminadamente `th:first-child/td:first-child` no mobile. A regra é adequada para uma chave comum à linha, como Patente, mas não para duas metades independentes.

**Contorno:** consultar os pares simultâneos em desktop ou retornar à esquerda; no celular isso exige atenção constante às colunas ocultas. **Correção requerida:** preservar cada chave com seu valor, sem alterar regras.

**Evidências locais:** `sistema-360-pares-{1,2,5,7}-associacao.jpg` e `sistema-pares-tabelas.json`.

### RV-02 — Bônus do Híbrido excedem a área reservada

Os dois chips de `+1 em ESCOLHA ( exceto LUT ou PON )` têm ≈295px. Em 360×800, a área dos bônus termina em x≈290, mas o chip chega a x≈360: excede a área em ≈70px e é cortado pela tela. Em desktop, excede a coluna de 270px em ≈25px e consome quase todo o gap antes das habilidades; não foi observado texto de habilidade encoberto nesse desktop.

**Impacto:** a restrição do bônus perde legibilidade e a separação entre colunas fica comprometida. Reconferir também Acadêmico, sem presumir que qualquer bônus longo já esteja quebrado em toda largura.

**Evidências:** `sistema-360-hibrido-bonus.jpg`, `sistema-1366-pagina-hibrido.jpg`, `sistema-1920-painel-max-hibrido.jpg` e `sistema-1920-hibrido-claro.jpg`.

### RV-03 — NA longo invade a coluna vizinha

Guia, Tabela de Referência de NA e VD Típico por NA: a primeira coluna fixa tem 120px, incluindo padding. Os rótulos Catastrófica/Apocalíptica excedem o espaço do conteúdo e ficam sobre dados da próxima coluna. O problema permanece ao deslocar a tabela até a direita e também aparece no meio da rolagem; não é apenas o corte esperado de uma coluna ainda fora do viewport.

**Evidências:** `guia-360-tabela-3-direita.jpg`, `guia-360-tabela-4-direita.jpg` e `guia-360-tabela-3-meio.jpg`.

### RV-04 — Grade genérica perde relações e hierarquia

Na Saúde do Civil, a tabela fonte tem duas colunas, cada rótulo sobre sua fórmula. A grade mobile achata cabeçalho e linha em sequência: VIDA → ENERGIA → fórmula Vida → fórmula Energia. Isso aproxima ENERGIA da fórmula de Vida.

Em Afinidade, “Nível de Criatura” ocupa uma célula da grade desktop como se fosse o primeiro item, deslocando as categorias; a última ameaça sobra na linha seguinte. No mobile, o título é uma linha comum e as faixas se misturam a etiquetas de ameaça. Deslocamento e Tipos de Alcances mantêm faixa/tipo e valor/descrição sem hierarquia própria.

O fallback de `regras-grade` concatena cabeçalho e linhas, removendo células vazias; é uma explicação corroborada no código, não uma auditoria completa de todos os reconhecedores.

**Evidências:** `sistema-360-civil-saude.jpg`, `sistema-360-deslocamento-grade.jpg`, `sistema-360-afinidade-grade.jpg`; contatos desktop `sistema-1920-contato-039.jpg` e trechos da varredura de Alcances.

### RV-05 — Abas mobile comprimem nome e ícone

Em Combatente, cada aba tem ≈83×44px e fonte de 10px. Mercenário e o ícone da próxima opção quase se encontram na fronteira; os grupos Especialista e Suporte repetem a compressão. Engenheiro/Paramédico são especialmente longos para a caixa disponível.

A altura e a navegação por teclado funcionam. O defeito documentado é a densidade horizontal/legibilidade, não uma alegação de que o alvo de toque está abaixo de 44px.

**Evidências:** `sistema-360-abas-combatente.jpg`, `sistema-360-abas-teclado.jpg` e `arquetipo-360-*-abertura.jpg`. A spec de descoberta/comparação de arquétipos já existente tem outro escopo e continua aberta.

### RV-06 — Notas e formações sem segmentação suficiente

Bombeiro mostra “+3 de resistência a dano Químico +1 dado em testes de Vigor” como uma única frase; Alpinista apresenta a mesma junção entre dois bônus. Na condição Amaldiçoado pelo Passado, o título faz parte de uma citação longa e os três efeitos sinalizados por ▢ aparecem dentro do parágrafo. A nota de Armazenamento junta duas afirmações distintas, incluindo custo, no mesmo destaque.

Essas estruturas já estão comprimidas no Markdown canônico: não há evidência de que o renderer tenha simplesmente perdido quebras existentes. A correção deve reconhecer os limites demonstráveis da fonte e evitar inventar separações de regras ambíguas.

**Evidências:** `sistema-360-origem-bombeiro.jpg`, `sistema-360-amaldicoado-nota.jpg` e `sistema-360-contato-026.jpg`. Conferência da fonte: Sistema, exemplos de Origem, tabela de nota de Armazenamento e Amaldiçoado pelo Passado.

### RV-07 — Tachado exibido como sintaxe literal

Na Introdução do Guia, os delimitadores `~~` de “torturar psicologicamente” aparecem no texto. O trecho não recebe a formatação tachada esperada pela fonte. O normalizador conserva literalmente a sintaxe dos tokens ainda não modelados; o renderer inline não tem caso de tachado.

**Evidências:** `guia-360-tachado-literal.jpg`, `guia-1920-contato-000.jpg`. A correção deve preservar a frase e a política de não executar HTML da fonte.

### RV-08 — Passivas de NPCs parecem prosa comum

Na Biblioteca de Referência, Operativo/Veterano/Elite/Lendário, passivas ficam em parágrafos cinza sem o título mono/separador usado pelas ativas do mesmo catálogo. Nome, exemplo narrativo, tipo e efeito ficam menos reconhecíveis. A Estátua já demonstra tratamento rico para habilidades sem necessidade de inventar um custo.

**Evidências:** `guia-960-biblioteca.jpg`, `guia-1366-painel-max.jpg`, `guia-1920-biblioteca-claro.jpg` e contatos integrais finais do Guia.

### RV-09 — Rótulos pequenos com baixo contraste na base clara

No Híbrido, foram lidas as cores calculadas do texto e o fundo do componente:

| Rótulo, 11px | Texto observado | Fundo composto aproximado | Razão calculada |
|---|---|---|---|
| Habilidade inicial | rgb(217,164,65) | rgb(236,234,229), cor a 8% sobre rgb(238,240,243) | 1,87:1 |
| Custo do experimento | rgb(155,120,208) | rgb(247,244,251), cor a 8% sobre branco | 3,22:1 |
| Energia inicial | rgb(76,141,208) | rgb(238,240,243) | 3,05:1 |

As razões foram calculadas com luminância relativa sRGB e composição alfa dos fundos observados; são aproximadas, não medição de um pixel antialiasado. Os três rótulos ficam visivelmente pálidos. A spec estabelece 4,5:1 para esse texto pequeno e exige examinar consumidores dos tokens antes de uma mudança compartilhada. Não é uma certificação de acessibilidade de todo o tema.

**Evidências:** `sistema-1920-hibrido-claro.jpg`, `sistema-360-painel-hibrido-claro.jpg` e leitura dos estilos calculados na sessão.

### RV-10 — Singular incorreto e seta órfã na busca

Pesquisar Mercenário no Guia, em 360×800: o estado vazio oferece “1 RESULTADOS NO OUTRO DOCUMENTO”, com a seta sozinha na linha seguinte. No resultado do próprio livro aparece “1 resultados”. A ação funciona; o defeito é acabamento do texto e associação visual da seta à legenda.

**Evidências:** `guia-360-busca-outro-livro.jpg` e `sistema-360-busca-mercenario.jpg`.

## Hipóteses descartadas e comportamentos esperados

- **Espaços junto a itálicos:** a aparência apertada de “Fundação SCP também”/“Contratados - RPG significa” motivou conferência. Fonte e DOM preservam o espaço; o Range do espaço em “RPG significa” ocupou ≈3,55px. Não foi comprovada eliminação de whitespace, portanto não foi criada spec para essa hipótese.
- Rolagem horizontal local e primeira coluna fixa são recursos esperados para tabelas com chave comum. Não há falha só porque uma coluna precisa de rolagem; RV-01/RV-03 têm associação/sobreposição concretas.
- Fundo claro de NA Extrema/Catastrófica é tratamento canônico, não defeito por divergir da superfície escura.
- “GUIA DE CRIAÇÃO DE MISSÕES / EM BREVE…” é conteúdo autoral ainda não publicado, não bloco perdido.
- PDF do Sistema permanece suspenso por [P-108/spec própria](../../backlog/revisao-formatacao-pdf-regras.spec.md); a auditoria de PDF está fora deste recorte.
- Botão fixo Voltar ao topo, tarjas de censura e conteúdo desabilitado de exportação não foram tratados como defeitos novos.
- Transições de gaveta e scroll suave produziram capturas transitórias cortadas. Foram reconferidas depois da transição; não originaram specs.

## Evidências locais e limites

As saídas brutas ficam em `.artifacts/regras-auditoria-visual-completa/`, ignorada pelo Git. O veredito e a reprodução acima não dependem de esses arquivos acompanharem o repositório.

| Família | Capturas contínuas | Contatos pessoalmente inspecionados |
|---|---:|---:|
| sistema-1920 | 11 faixas | 41 contatos |
| guia-1920 | 5 faixas | 18 contatos |
| sistema-360 | 22 faixas | 47 contatos |
| guia-360 | 8 faixas | 18 contatos |

Arquivos `arquetipo-*` cobrem os estados alternativos; `*-tabela-*-direita.jpg` e `*-meio*.jpg` cobrem posições horizontais. Famílias `*-direita-vertical-*`, `sistema-360-patentes-coluna-*`, `sistema-360-pares-*-associacao.jpg` e seus contatos complementam a leitura das tabelas.

Capturas `fullPage` de páginas muito longas podem alterar a geometria por retirada temporária do scrollbar, repetir controles fixos e atravessar o bloco seguinte. Arquivos exploratórios `*-fim.jpg`/`*-viewport.jpg` de tentativas iniciais não sustentam os achados de colunas finais. As evidências diretas de viewport listadas em cada achado têm preferência. Preto depois do rodapé e controles fixos repetidos em montagens não foram classificados como defeitos do produto.

**Limites explícitos:** Chromium em viewport emulado, sem validação em Firefox/Safari ou hardware de toque; bases claras e painéis receberam recortes representativos, não outra leitura integral de todos os blocos em cada combinação. A inspeção contínua integral foi das páginas nos dois viewports extremos. Loading/erro de rede/retry não foram forçados; observou-se apenas a aplicação disponível e suas transições normais. Não houve auditoria de fórmulas, validação de PDFs, leitor de tela ou certificação geral de contraste/acessibilidade.

## Fecho documental

- Dez specs futuras em backlog; `P-114`…`P-123` registrados como abertos, com narrativa em HISTORY e estado do leitor em CONTEXT.
- Código, regras autorais e derivados preservados. Tema escuro e viewport original restaurados.
- `npm run repo:verificar`: organização e espelhos aprovados na árvore local.
- `npm run repo:test`: **7/7 passam**. Primeira execução no sandbox passou 6/7, com o último teste impedido por permissão ao criar `.git/config` em um repositório temporário; a repetição autorizada fora do sandbox passou integralmente. Nenhum arquivo de código foi corrigido para obter esse resultado.
- `git diff --check`: sem erro de whitespace. Diff de contexto revisado; novas specs/relatório conferidos contra os achados e a cobertura, com destinos e links locais validados.
- Build/lint/suítes funcionais não se aplicam a esta mudança exclusivamente documental; deverão ser executados pelas tasks de correção conforme seus riscos.
