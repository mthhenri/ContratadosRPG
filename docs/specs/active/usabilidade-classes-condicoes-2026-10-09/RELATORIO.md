# Usabilidade: classes, compreensão de dados e condições

Inspeção de 09/10/2026, em `localhost:4300`, versão exibida 1.6.0. **Cobertura parcial; tarefa aberta.**
O pedido combina uma análise de uso com uma alteração concreta: explicar condições por tooltip.
As conclusões abaixo vêm da aplicação atual, não das capturas da auditoria de setembro.

## Diagnóstico

O sistema permite consultar e calcular, mas exige conhecer previamente os conceitos para escolher.
O principal atrito nas classes é a distância entre a decisão e a explicação: a Simulação mostra
nomes e resultados numéricos; as Regras explicam o domínio, porém colocam a comparação dos
arquétipos depois do catálogo de habilidades. No celular, essa distância cresce pela rolagem.

A identidade visual é consistente e a organização em blocos numerados ajuda. Não foi observado
overflow horizontal da página nos recortes públicos inspecionados. Isso não elimina problemas
de descoberta, compreensão ou acessibilidade. Esta é uma inspeção heurística; não houve teste
com jogadores, portanto impacto e prioridade são avaliações, não taxas medidas de abandono.

## Jornadas observadas

| Intenção | Percurso e estados realmente observados | Resultado |
|---|---|---|
| Escolher uma classe | Simulação → Agente / Civil → Combatente → Experimento Bestial → Especialista, atributos 1 e nível 0 | Recalcula imediatamente; falta orientação de escolha junto do seletor |
| Entender um registro civil | Mesmo seletor → Civil | Muda Nível para Treinamentos, limite para 3 e vários resultados para N/A; justificativa na Ajuda |
| Aprender a usar a calculadora | Abrir Ajuda → ler passos → fechar | Explica entradas, ajuste automático e diferença entre ganhos do nível e acumulados; não descreve papéis das classes |
| Entender Combatente e arquétipos | Regras → Sistema → Combatente → habilidades → Arquétipos → Mercenário | Informação existe; ordem exige atravessar lista longa antes de comparar especializações |
| Entender progressão | Regras → Níveis e Melhorias de Agente | Texto e tabela completos, mas exigem cruzar regras gerais com a classe escolhida |
| Entender “Novo Agente” | Simulação → Novo Agente | Calcula entrada/substituição a partir de motivo e médias do grupo; não cria ficha |
| Consultar uma condição | Regras → capítulo Condições → foco em Morrendo; foco em Inconsciente citado no texto | Tooltip oficial aparece; Escape fecha; descrição cabe no celular |

Não foram percorridas criação/edição de ficha, campanha, cena ou encontro autenticados.
O login de teste foi rejeitado pela revisão automática de aprovação e aguarda autorização
explícita do autor. Nenhum acesso alternativo por API foi usado.

## Achados priorizados

### U-01 — Falta contexto para decidir a classe · prioridade alta

**Evidência:** o seletor Classe / Registro reúne classes base, Experimentos e Civil. Há grupos
no controle, porém a tela fechada mostra apenas a escolha atual, sem papel, relação com a
classe de origem, restrições ou acesso direto à explicação correspondente.
Com as mesmas entradas, Combatente mostra Vida 34/Energia 17, Bestial 35/24 e Especialista
23/25. A pessoa vê os números mudarem, mas não recebe uma explicação comparativa no ponto da decisão.

**Consequência provável:** escolher pelo nome ou pelo maior número, sem compreender o estilo
de jogo e as concessões. A Ajuda ensina a operação e constitui um contorno parcial; não resolve
a comparação. Não há evidência de erro na fórmula nesta análise.

**Recomendação:** antes do seletor, oferecer uma orientação curta de escolha; junto da opção,
papel, recursos, restrições e link para as Regras. Mostrar explicitamente a relação entre
classe, arquétipo e subclasse conforme o livro, sem inventar combinações permitidas. Uma
comparação enxuta das opções deve preceder o catálogo completo. Redesenho depende de decisão.

### U-02 — Arquétipos aparecem tarde demais · prioridade alta

**Evidência:** em Combatente, o resumo da classe é seguido por uma lista extensa de habilidades;
só depois aparecem as abas Lutador, Mercenário e Vanguarda. No painel, bônus e habilidade inicial
têm boa hierarquia, mas apenas um arquétipo pode ser lido por vez. O sumário ajuda a chegar à
classe; não fornece um destino individual para cada arquétipo.

**Consequência provável:** um iniciante pode confundir habilidades de classe com as decisões
iniciais do personagem, ou não encontrar as especializações. O problema é a ordem de consulta,
não falta de conteúdo nem defeito na regra.

**Recomendação:** resumo e comparação dos arquétipos logo após o resumo da classe, com habilidade
inicial e atributos relevantes visíveis; catálogo completo abaixo. Acrescentar navegação direta
para arquétipos e conservar acesso integral à fonte. Não foi alterada essa ordem nesta tarefa.

### U-03 — Destinos móveis sem nome acessível · prioridade alta

**Evidência:** a barra inferior da Simulação esconde o texto das abas inativas com `display:none`.
Em 360×800, seis links aparecem sem nome na árvore de acessibilidade; não têm `aria-label` ou
`title`. Focar o destino Novo Agente não mostrou tooltip. A aba atual tem nome e rótulo visível.
Fonte conferida em `simulacao-shell.component.html` e `.scss`.

**Consequência:** os destinos inativos não são anunciados com seu propósito para quem depende
da leitura assistiva; os ícones também exigem memorização visual de quem usa o celular.

**Recomendação:** garantir nome acessível em cada link e rever a descoberta visual dos destinos
usando o padrão de navegação existente. Defeito registrado como P-112; fora do diff de tooltips.

### U-04 — Os números têm hierarquia, mas a explicação é separada · prioridade média

**Evidência:** Vida e Energia destacadas; demais estatísticas compactas e fórmulas com VIG,
DES, FOR etc. Civil mostra N/A em diversos campos enquanto algumas fórmulas permanecem como
legenda. A Ajuda explica que esses campos não se aplicam. Benefícios deste Nível e Progressão
Acumulada são separados, uma distinção útil que convém conservar.

**Consequência provável:** N/A pode parecer dado ausente; abreviações e cálculos exigem
familiaridade. Não se mediu contraste nem compreensão com jogadores.

**Recomendação:** explicar “não se aplica a Civil” no próprio resultado; apresentar decomposição
dos valores sob demanda e nomes completos dos atributos. Para progressão, oferecer a leitura
“o que ganho / o que preciso escolher neste nível”, ligada à classe. Validar o fluxo na ficha
antes de propor automação ou afirmar que o usuário precisa preencher tudo manualmente.

### U-05 — “Novo Agente” permite interpretar criação de ficha · prioridade média

**Evidência:** o destino abre uma calculadora com motivo de entrada, médias do grupo e resultados
de nível/prestígio/dinheiro. Inclui Morte / Entrada do zero, aposentadoria e sucessores Experimento.
A decomposição do cálculo nos resultados é um bom exemplo de explicação contextual.

**Consequência provável:** expectativa de criar personagem ao entrar nessa aba. Essa expectativa
é hipótese heurística, não comportamento observado de um usuário real.

**Recomendação:** explicitar no título/subtítulo que calcula a entrada de um agente no grupo;
usar a decomposição desse resultado como referência de clareza para os demais cálculos.

### U-06 — Condições dependiam de consulta fora do ponto de uso · prioridade alta

**Evidência de código:** os botões de Morrendo/Inconsciente/Machucado usavam o próprio nome
como tooltip, e o alerta de inventário dizia apenas Sobrecarregado!.
**Alteração observada nas Regras:** nomes reconhecidos no texto e títulos do capítulo agora
abrem descrição oficial. Morrendo explica teste por turno, DT crescente, deslocamento/Defesa,
teste ao atacar, morte e remoção por Medicina. Não há resumo que omita penalidades.

**Cobertura implementada:** ficha e card da campanha (selos e controles), condições dos colegas,
esquadrão na cena, NPC Morrendo, cartão de combatente (etiqueta, ícones, chips e texto narrativo),
alerta de sobrecarga e leitura pública das Regras. Condições livres desconhecidas orientam a
consultar os efeitos com o Mestre, sem receber mecânica inventada.

**Limites:** os consumidores autenticados ainda precisam de inspeção visual. Descrições de
habilidades/anotações que usam o primitivo compartilhado EditorMarkdown permanecem pendentes:
o AGENTS.md exige decisão do autor antes de ampliar um primitivo, e essa autorização foi solicitada.
Portanto ainda não se pode afirmar cobertura de toda menção de condição no sistema.

## Ordem sugerida de trabalho

1. Concluir os gates dos tooltips e a cobertura do texto Markdown após as autorizações pendentes.
2. Corrigir os nomes acessíveis da navegação móvel (P-112).
3. Aprovar uma proposta integrada para escolha de classe e consulta de arquétipos (U-01/U-02).
4. Revisar explicações dos dados e progressão com a jornada autenticada observada (U-04).
5. Ajustar orientação da calculadora de entrada do agente (U-05).

Não foram criadas specs de redesign nem implementadas essas recomendações por suposição.
A auditoria legada de setembro continua com seus próprios limites e pendências.

## Evidências e limites

Capturas locais em `.artifacts/usabilidade-classes-condicoes-2026-10-09/`, ignoradas pelo Git.
Este texto descreve os achados independentemente da disponibilidade das imagens.

| Viewport | Estados observados e evidências |
|---|---|
| 1920×1080 | Simulação Combatente/Bestial/Especialista; Combatente e Mercenário nas Regras; condição citada em texto com tooltip (`01`–`04`, `11`, `15`) |
| 1366×768 | Progressão e Morrendo com descrição completa (`08`, `09`) |
| 960×1080 | Arquétipo em layout médio, ajuda da Simulação, Morrendo com tooltip (`07`, `12`) |
| 360×800 | Classe nas Regras, gaveta/sumário, Simulação Bestial/Civil e entrada de agente; Morrendo com tooltip (`06`, `10`, `13`, `14`) |

A captura `05` é inválida (miniatura em área preta) e foi descartada como evidência; a `06`
usa outra captura da mesma aplicação real. Capturas foram inspecionadas pelo agente principal.
Não houve delegação. Hover e toque reais ainda não foram executados: a ferramenta de navegador
disponibiliza foco/clique, mas não hover ou emulação de toque; os testes do tooltip cobrem eventos
sintéticos. Foco/Escape foram exercitados na aplicação. Isso não equivale a testar mouse/toque reais.

Para tooltips, o análogo é a diretiva canônica já usada nos atributos/termos: mesmo balão,
tokens, largura, atraso, posicionamento e gestos. Nenhum estilo local foi criado. Os balões
observados mantêm densidade e identidade; Morrendo cabe em 360×800 sem corte. O foco é visível.
Os termos no corpo do texto têm área menor que 44px; a ergonomia de toque ainda precisa ser
avaliada, sem ampliar o primitivo unilateralmente. Não foi medida conformidade WCAG integral.

Resultados de testes, build e organização: [verificação e pendências](verificacao.md).
