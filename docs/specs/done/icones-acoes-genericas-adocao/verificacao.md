# Adoção de ações — implementação e verificação

## Estado

**Concluída em 22/10/2026 no alcance da adoção visual.** O autor autorizou alcance e
execução em 21/10 e, posteriormente, o login `codex.dev` e um cenário temporário local
com ADMIN e ESPECTADOR. A rejeição automática inicial foi resolvida por essa autorização
expressa. A inspeção autenticada foi executada pelo principal; cenário temporário
removido ao final por soft delete, sem alterar a conta original ou os livros.

Spec: [escopo e aceite](../icones-acoes-genericas-adocao.spec.md).

## Implementação

- 14 nomes em `IconeNome` e casos em `app-icone`, com as geometrias exatas votadas na
  prancha de 20/10. SVG de contorno, `currentColor`, decorativo; sem asset externo,
  identificadores SVG ou alteração dos desenhos anteriores.
- Menus, alça da Oficina, janelas, movimentação de peças/passos, indicador de rolagem
  encadeada, fechamento, cancelamento e restauração ao padrão adotados nos consumidores
  dos mapas. Remoção real usa a lixeira existente, nunca fechar/cancelar.
- `rolar-inicio` aplicado no botão Voltar ao topo do leitor, retirando a antiga rotação
  do chevron. A revisão independente encontrou esse consumidor que a primeira busca
  por Unicode não capturou.
- `apagar-termo` e `rolar-fim` ficam disponíveis no catálogo: os controles citados no
  inventário histórico já não existem. As setas da busca navegam ocorrências e a
  calculadora apaga um caractere; não receberam desenhos de outra ação.
- Mantidos handlers, permissões, rótulos acessíveis, tooltips, atalhos e confirmações.
  Nenhuma alteração em regra, API, DTO, banco, dependência ou tema compartilhado.
- Componentes extensos receberam apenas conteúdo gráfico/import standalone. Não há
  responsabilidade nova que justifique extração nesta tarefa.

Mapas por consumidor: [shared e indiretos](impacto-shared.md), [ficha](impacto-ficha.md)
e [outros módulos](impacto-modules.md). Os relatos dos agentes são inspeção estática,
não substituem a inspeção pessoal do principal.

## Referência visual e método

Análogos: controles atuais de Modal, Gaveta, PainelFlutuante, menus e ficha, com a
iconografia da prancha aprovada. Comparação de shell, densidade, hierarquia, caixa,
espaçamento, estados, foco e responsividade com os controles vizinhos existentes.

Stack real: Postgres local existente, NestJS em 3100, Angular em 4300; Chromium do
Playwright, sem mocks de API. Banco preservado, sem seed/reset/publicação. O livro
local publicado observado é Sistema 4.1.4; não foi modificado para esta tarefa.

Capturas e medições em `.artifacts/icones-acoes-genericas-adocao/`, ignoradas pelo Git.
São evidências locais e não acompanham o clone. O principal inspecionou pessoalmente
capturas completas e montagens dos quatro viewports, além de medir os controles.

## Cobertura visual executada

Todas as linhas abaixo: **1920×1080, 1366×768, 960×1080 e 360×800**, bases clara e
escura, salvo maximização que só existe no desktop.

| Superfície | Estados e resultado |
|---|---|
| Simulação Agente/Civil | Restaurar padrão normal/focado, confirmação em dois cliques e retorno; novo glifo legível, mesma densidade e hierarquia |
| DT, Novo Agente, Patente, Descanso, Compras e Vendas | Botão Restaurar padrão focado e confirmação, ativada por Enter; quatro viewports e duas bases, em contexto anônimo descartável sem dados do autor |
| Tema | Modal aberto, duas bases, fechamento pelo botão com SVG; mesma caixa, sem corte ou overflow |
| Ajuda da Simulação | Modal e conteúdo, foco/fechamento; controle canônico e alvo móvel preservados |
| Regras flutuantes | Normal, maximizada/restaurada nos três desktops, minimizada/reaberta e fechada; conteúdo real carregado |
| Sumário das Regras | Gaveta aberta/fechada pelo teclado e botão; foco e 44×44 px no celular |
| Voltar ao topo no painel | Desenho aponta para cima; acionamento após rolar o conteúdo, sem rotação herdada |
| Compras | Item no carrinho, remover, cancelar por Enter e confirmar remoção; cenário público local removido ao final |

Comparação pessoal: as superfícies observadas pertencem à mesma família visual, preservam
densidade e hierarquia, usam os controles e estados canônicos e não apresentam aparência
de formulário genérico, overflow horizontal ou corte causado pelos novos ícones. Foco e
contraste dos ícones observados são legíveis nas duas bases.

### Correção encontrada na inspeção

Em Compras a receita antiga `min-height: 40px` reduzia a altura móvel dos botões de
remoção/cancelamento. O modificador local `compras-btn--remocao` e o removedor de efeito
passaram a respeitar `$alvo-toque`, sem mudar o primitivo compartilhado. Repetição do fluxo
de item/confirmar/cancelar mediu **44×44 px** em 360×800 nas duas bases (desktop 26×26).
O removedor de efeito foi depois percorrido em Compras e no modal de modificações da
ficha, nas duas bases e quatro viewports, adicionando/removendo apenas um efeito de
rascunho sem salvar a modificação.

### Inspeção autenticada — 22/10

Mesmos quatro viewports e duas bases da matriz pública. Principal dirigiu o navegador
e inspecionou pessoalmente as capturas e os recortes dos controles; scripts dos agentes
serviram somente de apoio. Matrizes consolidadas por superfície e estados do controle,
sem repetir a auditoria de negócio de cada formulário que projeta o mesmo primitivo.

| Superfície | Estados observados |
|---|---|
| Campanha/Mestre e Acervo | Menus de agente/criatura/acervo abertos e fechados; Membros, Convites, Editar e confirmação de exclusão abertos/cancelados; criar/entrar campanha sem submissão |
| Jogador e Espectador | Campanha com ficha real do cenário; menu responsivo da ficha completa; espectador conserva ausência das ações de gestão; o componente de card com menu foi exercitado na visão de Mestre |
| Caderno e Biblioteca | Painel normal, maximizado/restaurado nos desktops, minimizado/reaberto e fechado; modal Novo documento cancelado |
| Ficha flutuante | Normal, maximizada/restaurada, minimizada/reaberta e fechada; mesma moldura e controles canônicos |
| Calculadora | Normal, minimizar/reabrir pela coluna da campanha e fechar pelo ponteiro; limite de teclado e do consumidor da ficha registrados abaixo |
| Montador | Normal, maximizar/restaurar, minimizar/reabrir, fechar; resultado de 1d6 e termo removível na ficha completa; resultado fechado pelo teclado |
| Bandeja e Histórico | Resultado real de rolagem e botão Fechar; Histórico lateral aberto/fechado, vazio; rolagens criadas somente na fixture e excluídas ao final |
| Rolagens da ficha | Indicador encadeado e expansão; cancelar intenção de remover preset; editor com passo e remoção de passo somente no rascunho, cancelado |
| Inventários | Busca aberta/fechada; remover/cancelar item da ficha e do esquadrão; efeito custom adicionado/removido apenas no rascunho; confirmação móvel recapturada com alvo visível |
| Habilidades e Sanidade | Seletor e habilidade personalizada abertos/fechados; intenção de remoção cancelada; lixeiras e confirmações de sequela, trauma e lesão, sem remover dados |
| Extras e guia de criação | Remover/cancelar fragmento consumido; adicionar/remover item do kit no rascunho local e abrir/fechar resumo móvel; guia não submetido |
| Criatura/NPC/Cena | Menu da criatura; classificação em edição/cancelada; equipamento e modificação do NPC em rascunho; criar cena cancelado e painel de rolagem de avulso aberto/fechado |
| Oficina | Alças do sumário, peça selecionada e controles acima/abaixo; primeiro item e demais posições; sem arrastar, reordenar ou publicar o livro original |
| Gestão | Edição de tipo da conta temporária ESPECTADOR para TESTER, cancelada; não altera o papel persistido |
| Tema e Notificação | Salvar/remover uma cor apenas no navegador de verificação; notificação real de login já utilizado na conta temporária, fechada; a tentativa foi recusada e não alterou a conta |

Comparação com os análogos: mesma família visual, densidade, hierarquia e molduras;
ícones dentro das caixas existentes, sem aparência de formulário genérico. Alvos móveis
dos controles migrados observados medem 44×44 px. Capturas do kit inicialmente deixavam
o alvo sob o rodapé fixo por enquadramento; foram repetidas com rolagem ao centro, alvo
inteiro em y=534 px e acionamento real. A confirmação do inventário também foi recapturada.
Nenhum overflow horizontal nas medições autenticadas e nenhum `pageerror` durante essas
matrizes. Estados ocultos por breakpoint não foram artificialmente exibidos.

#### Alcances sem consumidor atual

- `apagar-termo` e `rolar-fim`: somente catálogo, conforme inventário revisto.
- `FichaCombos`: não existe uso de `app-ficha-combos` fora do próprio selector; templates
  e handlers seguem cobertos pela suíte, sem alegar observação de uma tela inexistente.
- Extras do `FichaCampanhaCard` não integra `ABAS_STATUS_COMPACTO`; a mesma ação viva
  foi observada na ficha completa. Não foi aberta uma aba que o produto não oferece.
- `InventarioEsquadraoSidebar` não tem importador produtivo atual; sua substituição é
  estática/testada. O inventário vivo foi observado na campanha, inclusive no celular.

### Preservação e limpeza

Fixture restrita à campanha 140, fichas 485–487, cena 87/encontro 46, contas 246/247
e rolagens 291–303. Foram criadas por REST; somente a promoção da conta temporária a
ADMIN usou SQL local. Livros nunca foram escritos: a árvore antes/depois da Oficina é
idêntica e o observador de requests registrou zero mutações de livro.

Rolagens, item de esquadrão, fichas, vínculos e contas removidos pelos endpoints; cena
encerrada por REST. Como não há exclusão de cena/encontro na API, soft delete por SQL
limitado aos IDs acima completou a limpeza, incluindo combatente e vínculo do criador.
Consulta final confirmou **zero registros ativos** desse cenário em usuários, campanha,
membros, fichas, cena, encontro, combatentes, eventos e rolagens. A ficha original 6
conserva exatamente o documento lido antes da sessão. Sem seed/reset, exclusão física
ou modificação da conta `codex.dev`. Contextos das contas temporárias fechados.

Evidências locais: `visual-autenticado.json`, capturas `auth-*`, recortes `detalhes-*`,
`oficina-integridade.json`, `limpeza-api.json`, `limpeza-banco.log` e
`preservacao-original.json` em `.artifacts/icones-acoes-genericas-adocao/`.

## Gates técnicos

| Gate | Evidência |
|---|---|
| Catálogo | Teste independente da geometria votada, assinatura distinta dos 14 entre si/vizinhos, contorno/cor herdada e ausência de IDs |
| Shared | 77 arquivos, **1.340 testes aprovados** |
| Backend | 74 arquivos aprovados; **1.275 testes aprovados**, 99 ignorados em 8 arquivos já desabilitados |
| Frontend, primeira integração | 284 arquivos aprovados; 3.566 testes passaram e 2 expectativas falharam: atributo de encapsulamento Angular na assinatura SVG e contagem que misturava severidade/fechamento |
| Correções focadas | **76 testes aprovados** em Ícone e Notificação; ignorar somente `_ngcontent-*` na comparação, limitar a seleção de severidade ao seu contêiner |
| Leitor após Voltar ao topo | **14 testes aprovados** |
| Frontend, integração final | **286 arquivos e 3.568 testes aprovados**, mais 89 testes do normalizador; sem falhas |
| Build de produção | Aprovado; inicial 603,33 kB, aviso de orçamento 450 kB, sem elevar limite |
| Lint dos três workspaces e frontend final | Zero erros; avisos de estilo preexistentes e do recorte. Sem correção ampla de estilo |
| Organização | `repo:verificar` aprovado; espelhos preservados |
| Testes da organização | `repo:test` aprovado fora do sandbox |

Tentativas no sandbox falharam por permissão em temporários do Vitest e DNS das fontes
no build. `repo:test` também encontrou bloqueio ao gravar a configuração de seus repositórios
temporários e foi repetido fora do sandbox. As execuções técnicas acima foram feitas fora do sandbox. A API iniciada no
sandbox não era alcançável pelo navegador externo; só a árvore criada nesta sessão foi
encerrada e a API reiniciada com acesso local. Não se alterou configuração permanente.

Prettier aplicado apenas aos HTML/SCSS tocados. Algumas receitas preexistentes tiveram
reindentação pelo formatador (especialmente Inventário de Esquadrão), sem mudança de lógica.

## Limites e achados fora do escopo

- A Oficina foi observada sem modificar o rascunho original. Esta adoção preserva os
  handlers existentes; não certifica novamente o fluxo de publicação ou a persistência
  de reordenação real do livro. Testes integrados cobrem os handlers.
- Calculadora: Enter focado em Fechar é interceptado pelo handler de cálculo;
  ponteiro/Escape funcionam (P-133). Na ficha completa, o consumidor alterna o booleano
  e não restaura a janela minimizada; a coluna da campanha restaura (P-134).
  Esses trechos não mudaram nesta task.
- Na campanha de jogador em 1366×768, após rolagem, houve interceptação de ponteiro
  por conteúdo da ficha sobre o montador. Causa não investigada (P-135). O resultado
  do montador foi depois observado na ficha completa em toda a matriz. Não se afirma
  correção desse comportamento de sobreposição pela mudança dos glifos.
- Verificação em Chromium local, sem publicação ou prova em produção. A suíte e a
  inspeção confirmam a adoção dos desenhos, não uma auditoria de todos os fluxos de
  negócio dos formulários que reutilizam os primitivos.

Spec e anexos encerrados em `done/`. Commit autorizado pelo autor após o fecho; publicação fora do escopo.
