# Revisão de usabilidade — ContratadosRPG

Período: 13–15/09/2026. Estado: **avaliação em andamento; resultados consolidados para revisão**.
As propostas abaixo ainda não são specs aprovadas. Nenhum arquivo de backlog foi criado e nenhuma correção de produto foi implementada nesta avaliação.

## Resultado executivo

O sistema tem identidade visual consistente e bons recursos para uma mesa: cálculos explicados, resumo da ficha, recuperação de rascunho e acompanhamento de combate. Foi possível criar um agente pelo guia, persistir sua ficha, registrar uma rolagem, salvar uma página de caderno e conduzir um encontro até o encerramento.

Os maiores obstáculos observados são a compressão dos cartões do mestre nas larguras intermediárias, links que perdem o nome acessível quando viram ícones e validações do guia que impedem avançar sem explicar a correção necessária. No mobile, a distribuição do espaço também dificulta chegar rapidamente ao esquadrão, ao catálogo e às páginas dos documentos.

**Não equivale a uma aprovação completa do sistema.** Há cobertura dos quatro viewports, mas ainda faltam jornadas e verificações listadas adiante. A avaliação é uma inspeção especializada com execução de tarefas, não pesquisa com participantes; não foram medidos SUS, taxa de sucesso populacional ou tempo médio de uso.

## Método e cobertura

Aplicação real local, frontend Angular, API e banco de desenvolvimento. Navegador integrado ao Codex, inspeção visual, árvore de acessibilidade, interação com controles e conferência de persistência. O repositório recebeu mudanças de outras tarefas durante o período; as imagens documentam o estado de cada observação, não uma versão congelada de todo o produto. Achados devem ser reconfirmados no início de cada futura implementação.

| Formato | Viewport CSS | Avaliação geral do recorte observado |
|---|---:|---|
| Desktop FullHD | 1920×1080 | Melhor aproveitamento da ficha e dos painéis; mantém densidade e hierarquia |
| Tela dividida | 960×1080 | Zona sensível: cartões comprimidos e painéis concorrendo com a ficha |
| Notebook | 1366×768 | Grade do mestre apertada; altura reduzida acentua truncamento e conteúdo abaixo da dobra |
| Mobile | 360×800 | Fluxos principais utilizáveis, mas descoberta por ícones e espaço ocupado por cabeçalhos/filtros prejudicam rapidez |

Tela dividida substitui o pedido inicial de desktop vertical, conforme correção do autor.

Legenda: **V** = inspeção visual de estado representativo; **I** = interação naquele viewport; **P** = cobertura parcial/limitação; **—** = não concluído. I não significa todas as ações da área testadas.

| Jornada | FullHD | Dividida | Notebook | Mobile | Evidência e alcance |
|---|---|---|---|---|---|
| Login | V | V | V | I | Login válido e retorno à rota solicitada; sessão inválida observada |
| Campanha, visão de mestre | V | V | V | I | Esquadrão, menus e modal de membros; sem alterar permissões |
| Ficha de agente | V | I | V | I | Seções, histórico, inventário, dano simulado e rolagens |
| Guia de criação | V | V | V | I | Criação completa; recuperação do rascunho; revisão e ficha criada |
| Iniciativa | V | V | V | I | Selecionar combatentes, rolar, iniciar, avançar e encerrar |
| Caderno | V | I | — | I | Página criada, salva e reencontrada após retomada |
| Simulação de agente | V | V | V | I | Alteração de atributo e atualização dos resultados |
| Outras calculadoras | — | — | — | P | DT, compra e venda exercitados; novo agente, patentes e descanso explorados |
| Documentos | P | P | P | I | Mobile: PDF renderizado, avanço e zoom; leitor incorporado desktop não validado |
| Campanha como jogador/espectador | — | — | — | — | Pendente |
| Acervo, perfil, criar/entrar em campanha | — | — | — | — | Pendente |
| Ficha e criação de criatura | — | — | — | — | Pendente; área recebeu alterações paralelas |

## Pontos fortes comprovados

1. **Identidade coerente:** tema de terminal, tipografia, cores de ficha e organização por seções dão unidade ao produto. A ficha FullHD reúne identidade, atributos e conteúdo sem parecer um formulário genérico. [Ficha desktop](ficha-desktop.png).
2. **Guia com continuidade:** etapas e resumo orientam a criação; o rascunho restaurou a etapa de revisão e os dados anteriores após retomada. A conclusão abriu a ficha criada. [Revisão](guia-revisao-mobile.png), [ficha criada](ficha-criada-mobile.png).
3. **Feedback de cálculo:** simulador responde à mudança de atributo; Vigor de 1 para 2 alterou Vida de 34 para 38 e Bloqueio de 11 para 12 no cenário utilizado. Fórmulas ajudam a entender os resultados. [Simulação mobile](simulacao-mobile.png).
4. **Prevenção no diálogo de dano:** com valores zero, ação desabilitada; dano físico bruto 5 mostrou previsão de total 5 antes de confirmar. O teste foi cancelado sem dano à ficha existente. [Diálogo](dano-mobile.png).
5. **Rolagens com ajuda contextual:** fórmula inválida exibiu orientação em português e referência ao guia; fórmula válida habilitou o envio. A ficha de teste registrou uma rolagem pública de 1d20+2.
6. **Combate com estado identificável:** participante ativo, rodada e turno visíveis; avanço de turno funcionou; encerramento solicitou confirmação e explicou a mudança para somente leitura. [Iniciativa mobile](iniciativa-mobile.png).
7. **Persistência observada:** página de caderno reapareceu com título e conteúdo; Vida da ficha de teste permaneceu em 48 após recarregar e foi restaurada para 49.
8. **Simulações reversíveis:** adicionar Mediana ($1.000, 2 slots) levou o saldo de $1.000 a $0 e o inventário de 0/5 a 2/5; foi possível remover o item. Em Vendas, Mediana com taxa Check-in de 75% mostrou $750; item removido depois. DT com nível 5 e atributo 3 mostrou 21. A ajuda de Vendas fechou com Escape e devolveu o foco ao botão de ajuda. [DT mobile](dt-mobile.png).

## Achados e revisões propostas

Prioridade **alta**: impede compreender/concluir uma ação relevante ou torna informação operacional ambígua. **Média**: aumenta esforço ou chance de erro, com contorno. **Baixa**: consistência/clareza com impacto limitado. Prioridades são propostas, não decisão de backlog.

### UX-01 — Cartões de jogadores comprimidos no painel do mestre · Alta

- **Observado:** em notebook, a combinação de grade e histórico lateral comprime nomes e recursos; rótulos e números de Vida/Energia se sobrepõem. Em tela dividida, o problema também aparece na grade de duas colunas. Mobile mantém conflitos nos recursos.
- **Reprodução:** abrir a campanha 2 como mestre; observar os cartões do esquadrão em 1366×768 e 960×1080, com o histórico presente; repetir em 360×800.
- **Impacto:** leitura ambígua de recursos durante a sessão e necessidade de abrir fichas para consultar informação que o painel deveria resolver.
- **Revisão proposta:** dimensionar a grade pela largura útil do cartão, reavaliar espaço do retrato e apresentação do recurso; preservar o análogo visual aprovado.
- **Aceite sugerido:** nomes legíveis ou truncados de forma previsível; rótulos e valores sem colisão nos quatro formatos, com nomes longos e valores de três dígitos; histórico aberto e fechado.
- **Evidências:** [notebook](mestre-notebook.png), [dividida](mestre-dividida.png), [mobile](mestre-mobile.png).
- **Limite:** cartões de criatura foram modificados por outra tarefa; este achado se refere aos cartões de jogadores observados.

### UX-02 — Navegação compacta perde nomes acessíveis · Alta

- **Observado:** links do cabeçalho e da navegação das calculadoras aparecem sem nome na árvore de acessibilidade quando o texto é ocultado. Na simulação mobile, links inativos medidos tinham aproximadamente 37,25 px de largura e 65,69 px de altura; sem aria-label/title, com texto oculto. Ícones exigem memorização também de quem usa toque.
- **Reprodução:** abrir Simulação em 360×800 e inspecionar os destinos não selecionados na navegação inferior; repetir a navegação principal compacta.
- **Impacto:** destino indistinguível por tecnologia assistiva e dificuldade de descoberta no primeiro uso.
- **Revisão proposta:** nome acessível persistente e estratégia de rótulos que funcione por toque; revisar foco e ordem de navegação.
- **Aceite sugerido:** todos os destinos anunciados com nome e estado atual, operáveis por teclado; controles compactos com área de toque definida pelo design; validação nos quatro formatos e com leitor de tela.
- **Evidência visual:** [simulação mobile](simulacao-mobile.png). A ausência do nome foi observada na árvore, não é demonstrável apenas pelo PNG.
- **Limite:** não foi executada auditoria completa de acessibilidade nem certificação WCAG.

### UX-03 — Guia bloqueia avanço sem explicar a regra pendente · Alta

- **Observado:** na criação de Combatente/Lutador, nível 1, a distribuição Força 5, Vigor 3, Luta 2 e demais atributos 1 chegou a saldo zero, mas o avanço permaneceu desabilitado. A instrução exibida informava máximo 6 com bônus incluso. Distribuição Força 3, Luta 3, Vigor 2, Destreza 2, Sentidos 2 e demais 1 permitiu avançar. Não se conclui daí que a fórmula esteja incorreta: a falha comprovada é a orientação insuficiente.
- **Também observado:** na identidade, preencher os campos marcados obrigatórios não bastou; preencher Efeito da personalidade base e energia 0 liberou o avanço, sem uma indicação equivalente de obrigatoriedade que orientasse a tentativa anterior.
- **Impacto:** usuário precisa experimentar valores para descobrir o que falta, mesmo acreditando ter atendido às instruções.
- **Revisão proposta:** explicar restrições de criação com base no motor de regras, distinguir limite de criação de limite geral e apresentar pendências junto ao avanço/campo.
- **Aceite sugerido:** cada bloqueio tem motivo textual acionável; obrigatoriedade visual corresponde à validação; reproduzir as duas distribuições e verificar mensagem específica, sem duplicar regra de domínio no frontend.
- **Evidências de contexto:** [guia mobile](guia-mobile.png), [notebook](guia-notebook.png). As sequências de bloqueio foram observadas interativamente; estes PNGs não registram cada tentativa.

### UX-04 — Consulta de documento longo sem salto/busca no mobile · Média

- **Observado:** PDF do sistema com 77 páginas; controles disponíveis de anterior/próxima e zoom. Não foi encontrado salto direto nem busca, embora a ajuda diga que busca, páginas e zoom ficam na barra.
- **Impacto:** chegar a uma regra distante exige muitas ações; a instrução promete uma função que não está disponível no recorte observado.
- **Revisão proposta:** navegação direta por página e estratégia de busca/índice; ajustar texto à capacidade real.
- **Aceite sugerido:** chegar à página 60 diretamente, informar página inválida e manter controles utilizáveis em 360×800; ajuda coerente por formato.
- **Evidências:** [documento](documentos-mobile.png), [leitura](documentos-mobile-leitura.png).
- **Limite:** área cinza do leitor incorporado nos outros viewports pode ser limitação do navegador integrado; não foi classificada como defeito do produto.

### UX-05 — Entrada do combate esconde a primeira ação necessária · Média

- **Observado:** encontro vazio mostra ações de pedir/rolar/iniciar indisponíveis; seleção de combatentes é acessada por Mais ações → Selecionar combatentes.
- **Impacto:** o usuário precisa explorar um menu secundário antes de conseguir executar o fluxo principal.
- **Revisão proposta:** ação explícita de selecionar/adicionar combatentes no estado vazio e indicação dos pré-requisitos das ações seguintes.
- **Aceite sugerido:** novo encontro permite descobrir a seleção sem abrir menus; depois de adicionar participantes, a próxima ação fica evidente nos quatro formatos.
- **Evidência de contexto:** [iniciativa mobile](iniciativa-mobile.png) mostra o estado posterior; o estado vazio foi observado durante a execução.

### UX-06 — Conteúdo secundário ocupa a primeira tela mobile · Média

- **Observado:** texto da missão e cabeçalho empurram o primeiro cartão do esquadrão para aproximadamente y=486; no catálogo de itens, 11 categorias ocupam grande parte da altura do diálogo antes dos resultados. No caderno, filtros e ferramentas exigem navegação horizontal.
- **Impacto:** consultas frequentes durante a mesa exigem rolagem antes de alcançar dados ou resultados.
- **Revisão proposta:** hierarquia compacta e expansão deliberada de informações secundárias; filtros resumidos sem perder acesso às categorias.
- **Aceite sugerido:** comparar o cenário de missão longa, catálogo filtrado/vazio e caderno com texto longo; resultados e ação principal facilmente alcançáveis sem competir com barras fixas.
- **Evidências:** [mestre mobile](mestre-mobile.png), [caderno mobile](caderno-mobile.png). Catálogo inspecionado interativamente, sem PNG específico.

### UX-07 — Retorno de sessão inválida exibe mensagens técnicas duplicadas · Média

- **Observado:** redirecionamento ao login com dois avisos “Erro Unauthorized” e indicador de tempo real offline; repetido na retomada de 15/09.
- **Impacto:** confunde falha de acesso, sessão e conectividade, sem orientar claramente o usuário.
- **Revisão proposta:** centralizar tratamento de sessão inválida, uma mensagem em português e preservação do destino solicitado.
- **Aceite sugerido:** sessão inválida produz uma orientação única; login válido retorna ao destino; falha do banco/conectividade não é descrita como credencial incorreta.
- **Evidência:** [sessão inválida](sessao-invalida-mobile.png).
- **Limite:** a causa da invalidação entre sessões de teste não foi investigada. Não se afirma expiração prematura do token.

### UX-08 — Truncamentos e transições pouco explícitos · Baixa

- **Observado:** reações da ficha abreviadas visualmente em notebook; histórico aberto na tela dividida reduz espaço útil e aumenta a rolagem. “Abrir ficha completa” abriu outra aba sem comunicar isso no rótulo.
- **Revisão proposta:** revisar largura mínima dos blocos, texto alternativo para truncamento e indicação da abertura em nova aba.
- **Aceite sugerido:** nome completo alcançável por toque/teclado, conteúdo principal utilizável com histórico aberto; comportamento de nova aba anunciado.
- **Evidências:** [ficha notebook](ficha-notebook.png), [ficha dividida](ficha-dividida-historico.png).

## Propostas para specs — aguardam aprovação

Estes são recortes sugeridos para decisão, não arquivos de especificação nem autorização de implementação. Antes de criar cada spec, conferir backlog existente e reconfirmar o achado na versão atual.

| Ordem | Recorte proposto | Achados | Resultado esperado |
|---:|---|---|---|
| 1 | Legibilidade do esquadrão nos quatro viewports | UX-01 | Recursos e nomes legíveis com histórico aberto/fechado |
| 2 | Navegação compacta acessível | UX-02 | Destinos compreensíveis por toque, teclado e leitor de tela |
| 3 | Validações explicativas do guia | UX-03 | Usuário entende exatamente por que não pode avançar |
| 4 | Consulta eficiente dos documentos mobile | UX-04 | Navegar diretamente até uma página e ajuda coerente |
| 5 | Primeiro uso do painel de iniciativa | UX-05 | Adição de combatentes e sequência do fluxo evidentes |
| 6 | Densidade mobile de campanha, catálogo e caderno | UX-06 | Menor esforço para alcançar conteúdo operacional; considerar separar por área |
| 7 | Comunicação de sessão inválida | UX-07 | Uma orientação clara e retorno ao destino preservado |
| 8 | Refinamentos da ficha e transições | UX-08 | Menos truncamento e comportamento previsível |

**Dívidas existentes:** a separação Extras/História/origem se relaciona a P-008; a limitação do guia Civil já está registrada em P-018. Não abrir novas specs duplicadas apenas por aparecerem nesta revisão. P-018 não foi revalidado como fluxo completo nesta sessão.

## Dados de teste e efeitos realizados

Ambiente local, conta de desenvolvimento Codex, campanha 2:

- Página pessoal “Auditoria de usabilidade — teste local”, conteúdo “Registro descartável da avaliação de usabilidade.”; salva e mantida.
- Encontro “Auditoria de usabilidade”, com Quimera Codex e criatura; iniciativas roladas, turno avançado e encontro encerrado. Histórico mantido.
- Agente “Auditoria UX”, ficha 44, criado pelo guia e mantido. Vida 49 → 48, recarregada e restaurada para 49.
- Rolagem pública 1d20+2 na ficha de teste: resultado 20 (18+2), mantida no histórico.
- Diálogo de dano na ficha existente cancelado; nenhum dano aplicado nesse teste. Permissões não alteradas.

## Pendências para encerrar a avaliação completa

- Jornadas como jogador/espectador, acervo e perfil; criar/entrar em campanha, incluindo erros recuperáveis.
- Ficha de criatura e seus fluxos representativos nos quatro formatos, considerando as alterações paralelas.
- Ampliar compras/vendas para modificações, limites, importação/exportação e conferir resultados das demais calculadoras; o cenário simples de adicionar/remover e taxa de venda já foi concluído.
- Caderno no notebook; revisão atualizada do painel do mestre após mudanças concorrentes.
- Teclado: percurso completo, foco visível e demais diálogos; Escape e retorno de foco foram confirmados apenas na ajuda de Vendas. Leitor de tela e dispositivo touch real não testados.
- Tempo real com duas contas simultâneas, reconexão e conflitos; publicação da rolagem não comprova recepção por outro usuário.
- Leitor PDF em navegador com suporte à incorporação; verificar a fidelidade das capturas FullHD, pois algumas aparentaram recorte do navegador apesar do viewport CSS configurado.

Não foram executados testes automatizados de regressão, lint ou build de produção para este relatório documental. A compilação de desenvolvimento foi usada para levantar a aplicação; seu sucesso não é conclusão de usabilidade. Na retomada de 15/09, frontend e banco estavam desligados: a primeira compilação esbarrou em restrição de leitura, sendo iniciada com sucesso após execução autorizada. O script oficial de inicialização do banco tentou abrir o Docker Desktop, mas o daemon não ficou disponível: `docker info` informou ausência do pipe `dockerDesktopLinuxEngine`, e `docker desktop status` não conseguiu obter o estado. Login respondeu com erro interno. **Bloqueio atual: restabelecer Docker/Postgres local para continuar as jornadas autenticadas.** Isso não foi classificado como defeito de usabilidade do produto.

## Evidências

As imagens PNG desta pasta são capturas originais. Nome do formato identifica o viewport solicitado, não garante que o arquivo tenha todas as suas dimensões físicas. Evidência visual deve ser lida junto ao cenário e às limitações, especialmente documentos desktop e capturas FullHD. As observações interativas sem captura específica estão identificadas como tal nos achados.

Conferência dos arquivos: `ficha-desktop.png` tem 1920×1080; diversas capturas desktop posteriores têm 1683×1080; diversas mobile têm 350×778, enquanto documentos mobile e login mobile têm 360×800. Há também diferenças nos arquivos de notebook/dividida. Não usar a dimensão física desses arquivos como prova isolada do viewport CSS. O conteúdo foi salvo diretamente da ferramenta, que em alguns casos entregou JPEG com extensão `.png`; não houve edição das imagens.
