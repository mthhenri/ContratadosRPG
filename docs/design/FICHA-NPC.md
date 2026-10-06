# Ficha de NPC — contrato visual da M4

> Contrato refinado e implementado em 2026-09-30 (`m4-08`/`m4-08b`).
> Evidências: `docs/reviews/m4-08b-verificacao.md`. Listagem integrada segue na `m4-09`.
> Este documento define apresentação e composição; regras e forma dos dados continuam em
> `docs/core/guia_de_mestre-v4.2.0.md` (Guia de Criação de NPCs) e `docs/SCHEMA.md`
> (`FichaNpcDadosDto`). Tokens e primitivos seguem `docs/design/DESIGN.md`.

> **Extensão M4-19 (2026-10-06):** Competências na criação e no bloco Atributos, com
> contagem e dados de Categoria separados dos ajustes manuais. Seletor por botões
> canônicos médios/contorno e leitura por chips; atributo usa dadinho e ajustes do
> `app-atributo-ficha`. Indicador fixo “Rolagens ocultas” no cabeçalho; bandeja e
> histórico privados só para gestão. Competências não alteram o atributo nem a DT.
> P-100 já adequou zero/redistribuição na criação. [Gates M4-19](../reviews/m4-19-verificacao.md).
> Ataques/Equipamentos seguem na spec própria M4-20 preparada, sem implementação aqui.

## Intenção

O mestre precisa criar um personagem humano com agilidade e consultar sua ficha durante a
mesa. O NPC deve parecer parte da mesma família das fichas de jogador e criatura, com os
dados próprios do NPC em destaque: Categoria, Nível e Cooperação. A complexidade da criatura
e a progressão completa do agente não são modelos de conteúdo para copiar.

## Análogos aprovados e limites do reuso

| Recorte | Referência no código atual | O que reutilizar |
|---|---|---|
| Criação | `frontend/src/app/modules/ficha/paginas/criar/criar.page.*` e `paginas/criar-criatura/criar-criatura.page.*` | Cabeçalho com índice `//`, título e régua; trilha à esquerda, etapa no centro, resumo à direita; progressão compacta no celular |
| Ficha pronta | `frontend/src/app/modules/ficha/componentes/criatura-visualizacao/criatura-visualizacao.component.*` | Duas colunas: Identidade + Atributos agrupados à esquerda e detalhe com abas à direita; composição de perfil e combate dentro de Identidade |
| Recursos e edição | `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.*` | Vida/Energia, leitura numérica, edição no lugar, foco e hierarquia; sem transportar campos exclusivos de agente |
| Ações da página | `frontend/src/app/modules/ficha/paginas/visualizar-criatura/visualizar-criatura.page.*` | `app-coluna-acoes`, cabeçalho da campanha, conteúdo que se adapta ao painel lateral aberto, ações inferiores no celular |
| Lista | `frontend/src/app/modules/ficha/componentes/cartao-ficha-acervo/` e painel `CampanhaDetalhe` | Cartão por tipo e blocos separados já existentes; NPC mostra Categoria/Nível |

Consultar o código vigente antes de implementar. O mockup `examples/ficha-de-criatura.html`
tem divergências registradas em `examples/README.md`: não usar seu antigo dashboard de três
colunas nem seu cabeçalho como alvo novo. O análogo define linguagem e composição, não autoriza
copiar controles locais que já tenham primitivo em `shared/ui/`.

## Criação — cinco etapas

Agrupar o roteiro do guia sem omitir conteúdo. Saúde, Defesa e Energia calculadas não precisam
de três telas só para confirmar números. Nenhuma etapa exige campos que o contrato não prevê.

| Etapa | Conteúdo | Resumo progressivo |
|---|---|---|
| 1. Identidade | Nome, função narrativa, Categoria, Nível e Cooperação; ajuda contextual de Categoria e Cooperação | Nome/função, Categoria/Nível e número + faixa textual de Cooperação |
| 2. Atributos e recursos | Dez atributos em grupos Físicos/Mentais; orçamento e limite visíveis; exceção de combate do Civil explícita; prévia de Vida, Defesa/Bloquear/Esquivar e Energia | Recursos iniciais e modelo de Energia; valores derivados pelo motor |
| 3. Habilidades | Lista de Passivas/Ativas e editor; nome neutro, narrativo opcional, custo quando Ativa, descrição e restrição; orientação de assinatura, custo e impacto tático do guia | Contagens por tipo e orientação de volume/limite por turno |
| 4. Conduta e sanidade | Gatilhos de fuga, prioridades de alvo, reação a ferimento severo; Sequelas/Traumas e Anotações opcionais conforme o contrato | Conduta resumida; indicar campos opcionais vazios sem erro |
| 5. Revisão | Prévia organizada como a ficha pronta, pendências com destino à etapa correspondente e ação Registrar NPC | Tudo que será salvo; nenhuma segunda entrada para o mesmo campo |

As orientações de Categoria e Cooperação não ganham tabelas longas abertas em todas as telas:
usar texto curto e ajuda contextual existente. Cooperação é independente da Categoria; nunca
deduzir a atitude pela potência do NPC. As faixas sugeridas de Nível não são bloqueios.

Manter o preenchimento ao voltar de etapa. Falha ao registrar preserva o formulário e permite
tentar novamente; envio mostra estado ocupado e impede duplicidade. Saída com alterações usa
o mecanismo canônico de confirmação. Retomada persistente de rascunho só entra se especificada
separadamente; não prometer que foi salvo copiando a mensagem do guia de criatura.

## Ficha pronta — consulta e edição

**Identidade e recursos.** Nome e função têm prioridade sobre códigos de registro. Categoria e
Nível são metadados compactos; Cooperação mostra valor e faixa por texto, sem depender de cor.
Usar a composição perfil/combate da criatura, adaptada ao conteúdo humano: Vida e, quando
aplicável, Energia; Defesa/Bloquear/Esquivar em linha de stats. Não criar NA, VD, Tenacidade,
Modificadores de criatura, Patente, Maestria ou inventário de agente no NPC.

**Atributos.** Abaixo de Identidade, os mesmos dez atributos e agrupamentos do jogador. O valor
do atributo é o dado principal; a DT contextual é secundária, calculada pelo motor sob demanda,
sem campo único de DT salvo. Nenhum modificador Forte/Médio/Fraco/Frágil da criatura.

**Detalhes.** Coluna direita com `app-abas`: Habilidades · Conduta · Sanidade. Habilidades abre
por padrão; Passivas e Ativas ficam identificadas em seus cartões, com custo só em Ativas.
Conduta apresenta os três campos de combate e a função narrativa sem repetir um formulário
inteiro. Sanidade usa as listas de Sequelas/Traumas previstas no contrato. Anotações permanecem
no utilitário próprio, com a privacidade existente; não entram em uma aba pública.

**Edição.** Campo a campo no lugar para o mestre; listas usam Adicionar e Editar/Concluir como
na criatura. Grupos que precisam ser validados juntos usam rascunho com Salvar/Cancelar, sem
enviar estados intermediários inválidos. Editar Categoria/Nível/Atributos não deve recalcular
silenciosamente os snapshots salvos. Jogador com concessão recebe leitura, sem controles de
gestão ou edição; espectador não recebe acesso à ficha completa.

**Energia por modelo.** Civil apresenta a nota discreta “Sem Energia”, sem barra vazia nem
controles de consumo/recarga. Reserva Fixa usa a barra de Energia, sem recarga por turno.
Pool + Recarga acrescenta o valor de recarga como metadado secundário. Não inventar automação
de turno para a ficha. Modelos e faixas vêm de `shared/regras/npc`, sem tabelas duplicadas na UI.

**Acesso.** O estado de concessão e a privacidade de rolagens são informações distintas.
Revelação seletiva usa a gestão de acesso existente; não usar um toggle global de visibilidade
como substituto de conceder/revogar acesso a jogadores. Não oferecer edição a quem só lê.

Imagem, cor e enquadramento, se atendidos pelos metadados e endpoints genéricos de ficha,
reutilizam a solução existente. Não criar um novo contrato de retrato dentro de `dados`.
Lacuna de cobertura dos primitivos exige decisão do autor antes da implementação local.

## Controles e acabamento

| Papel | Componente canônico |
|---|---|
| Ação principal, voltar, salvar/cancelar | `app-botao` com variante/estilo/tamanho explícitos; `app-botao-icone` com tamanho e nome acessível |
| Campo de formulário | `app-campo` com Reactive Forms; `app-step-input` para número ajustável |
| Cartão, metadado e dado calculado | `app-cartao`, `app-chip`, `app-stat` |
| Vida/Energia e edição no lugar | `app-barra-recurso`, `app-valor-editavel` |
| Detalhe e gestão | `app-abas`/`app-aba`, `app-coluna-acoes`/`app-coluna-acoes-item` |
| Confirmação, erro, vazio e carregamento | `ConfirmacaoService`/`app-modal`, `NotificacaoService`, `app-estado-vazio`, `app-esqueleto` |
| Ajuda e texto livre | `appTooltip`, `app-editor-markdown` nos campos compatíveis com o formato contratado |

Usar IBM Plex, bordas finas, raios e espaçamentos do tema. Cor de Vida e Energia continua
semântica; Categoria e Cooperação não ganham paletas ou glifos novos por conta própria.
Registrar a API efetivamente usada por cada controle; presença de diretiva sem dimensão não
fecha o gate. Se o primitivo não cobrir uma necessidade, apresentar opções ao autor antes de
ampliá-lo ou contornar com HTML/CSS local.

## Responsividade e estados verificáveis

- Desktop `1920×1080`: comparar shell, densidade, títulos, controles e recursos com os dois
  análogos; ficha em duas colunas e assistente com resumo lateral.
- Notebook `1366×768` e tela dividida `960×1080`: testar altura curta, textos extensos, listas
  longas e histórico lateral aberto; empilhar pela largura útil, sem colunas cortadas nem
  espaços vazios inflados pela altura da lista de habilidades.
- Mobile `360×800`: trilha de criação compacta com etapa atual e progresso; resumo acessível
  pelo controle do análogo, usando primitivo compatível. Na ficha, Identidade/recursos e
  Atributos vêm antes dos detalhes, com abas próprias do cartão. Não replicar os destinos de
  Inventário/Equipamento do agente. Ações inferiores não cobrem conteúdo ou rodapé de envio.
- Complementar em `390×844` e `430×932` na `m4-10`. Alvos de toque ≥ 44px, foco visível,
  contraste nas bases clara/escura e ausência de overflow em todos os cortes.
- Cobrir cinco Categorias, extremos e faixas de Cooperação, Civil com exceção, habilidades e
  sanidade vazias/cheias, nome e função longos, erro de carga/gravação, envio ocupado, edição e
  leitura por jogador com acesso; revogação deve retirar leitura sem recarregar.

A implementação é verificada na aplicação real pela skill `verify`, com inspeção pessoal do
agente principal. Este planejamento não comprova fidelidade de uma tela ainda inexistente.

## Decisões de domínio e pendência antes da UI

- `m4-06` implementa a tabela de volume como validação de composição no motor compartilhado.
  Criação e backend consomem as mesmas violações; não criam limites locais. Passivas não contam
  para o limite por turno, que se refere a usos de Ativas, inclusive repetições permitidas.
- `m4-05` mantém o contrato sem marcador de autorização Civil, conforme o escopo da `m4-06`:
  motor valida o cap sem bloquear Luta/Pontaria. A criação inicia ambos em 0 e permite ao mestre
  desbloquear explicitamente a exceção narrativa; não inventar estado de permissão persistido.
- Morrendo foi definido na `m4-07`: `dados.condicoes.morrendo`, conforme `SCHEMA.md` e
  `shared/regras/npc.resolverMorrendo`. Vida ≤ 0 ativa; cura mantém; remoção explícita após
  socorro exige Vida positiva. Não transportar Machucado, Inconsciente ou lesões do jogador.
  A ficha usa a API tipada de NPC, incluindo o ajuste pontual de vitalidade.
