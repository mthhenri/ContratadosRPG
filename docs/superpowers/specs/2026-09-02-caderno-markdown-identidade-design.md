# Caderno — formatação Markdown e identidade colaborativa

## Objetivo

Tornar o editor Markdown do Caderno confiável e legível: toda formatação oferecida pela barra
deve ser aplicada, persistida e reconhecível na própria superfície editável. Ao mesmo tempo,
refinar a barra de formatação para que seja mais direta em desktop e mobile e ligar a presença do
Caderno do Esquadrão à cor da ficha mais recentemente atualizada de cada colaborador.

## Evidência e causa raiz

O editor usa Milkdown com os presets `commonmark` e `gfm`. A execução direta dos comandos reais
confirmou que lista, lista numerada e citação serializam respectivamente para `* item`,
`1. item` e `> item`: o motor não perdeu esses formatos.

O defeito percebido é duplo:

1. `editor-markdown.component.scss` só define a identidade visual de títulos, código e tabelas;
   listas e citações ficam sem marcadores, recuo, borda ou contraste próprio e parecem texto
   comum.
2. Os testes atuais substituem toda a fábrica Milkdown por um mock. Eles demonstram que um botão
   pede um comando, mas não provam que o editor real aplica e serializa o formato.

O Caderno do Esquadrão também usa uma paleta fixa indexada pelo ID do usuário para cursor,
seleção e selo de presença. A página já recebe `membros`, cada qual com as fichas visíveis e sua
cor, mas o resumo não carrega a data necessária para definir inequivocamente a ficha mais recente.

## Decisões confirmadas

- O Markdown puro permanece a forma persistida, pesquisada e sincronizada. Não haverá modo
  alternativo de fonte/prévia, conversão de conteúdo existente nem dependência nova.
- A barra cobre: texto normal, H1, H2, negrito, itálico, código, lista, lista numerada, citação e
  tabela. Linhas e colunas são ações contextuais da tabela, não controles permanentes desabilitados.
- O Caderno do Esquadrão usa uma única cor por colaborador: a cor da ficha mais recentemente
  atualizada. A mesma cor aparece na inicial de presença, no cursor e na seleção remota. Sem uma
  ficha com cor, mantém-se uma cor de reserva estável derivada do usuário.
- Não há degradê: o produto pressupõe uma ficha principal por jogador e uma única cor torna cursor
  e seleção reconhecíveis e acessíveis.
- A data de atualização da ficha será exposta no resumo de fichas do membro. Assim, a escolha não
  depende de uma ordenação incidental da API.
- Não haverá mudança no protocolo de WebSocket, em permissões, salas ou persistência colaborativa:
  cada cliente anuncia a cor local ao preencher o `Awareness` Yjs; os demais apenas a exibem.
- A task não altera `ui-24-ordem-dos-controles-do-painel-flutuante` nem os arquivos modificados
  por ela.

## Interface

O análogo aprovado é o próprio `CadernoFlutuante`: mesma casca, densidade, superfícies e
responsividade. Os controles seguem os primitivos `app-botao-icone` e `appTooltip`; tabelas
mantêm o padrão de `calc-tabela` / `calc-tabela-wrap` da calculadora.

### Editor

- Listas ordenadas e não ordenadas recebem recuo, marcador, espaçamento entre itens e suporte a
  níveis aninhados, usando somente tokens do tema.
- Citações se tornam um bloco de referência: régua de destaque, fundo suave, recuo e tipografia
  de leitura. Devem ser distinguíveis de um parágrafo, sem competir com o conteúdo.
- Código em linha, bloco de código, links, separadores, títulos e tabelas recebem estados de foco
  e contraste coerentes. Tabelas continuam com rolagem horizontal contida.
- Todos os estilos se aplicam igualmente à edição privada, leitura do mestre e edição
  colaborativa; somente leitura muda interatividade, não a leitura do conteúdo.

### Barra de formatação

- Estrutura: texto normal, H1 e H2.
- Texto: negrito, itálico e código.
- Blocos: lista, lista numerada e citação.
- Tabela: inserir tabela; depois que o cursor entra em uma tabela, as ações de linha e coluna
  aparecem no grupo contextual e são ocultadas fora dela.
- Cada controle preserva seleção do editor, tem rótulo acessível e tooltip. O estado ativo mostra
  quais formatos estão aplicados à seleção/cursor.
- Em 360 px, os alvos permanecem com no mínimo 44 px e a barra usa grupos compactos sem esconder
  ações necessárias atrás de controles ambíguos.

### Presença do Esquadrão

Ao abrir ou criar uma página do Esquadrão, o componente entrega ao serviço colaborativo a lista
atual de membros. O serviço encontra o usuário da sessão, escolhe a ficha com maior
`updatedDate` e usa sua `cor`, quando disponível, no campo `user.color` do `Awareness`.

O `yCursorPlugin` já consome esse campo para cursor e seleção. A lista de participantes continua
projetando a mesma cor no selo com a inicial. Uma alteração de ficha que refresque a lista de
membros atualiza a presença local sem recriar o documento Yjs. Sem ficha, cor nula ou data
inválida, aplica-se a cor de reserva existente, estável para aquele usuário.

## Contratos e responsabilidades

| Área | Responsabilidade |
| --- | --- |
| `shared` | Acrescentar `updatedDate` ao resumo de ficha de membro. |
| Backend de campanha | Selecionar e devolver a data de atualização do resumo, sem ampliar campos de jogo. |
| `CadernoFlutuante` | Entregar a composição atual de membros ao serviço de colaboração. |
| `CadernoEsquadraoColaborativoService` | Resolver a cor local por ficha recente e publicar somente no `Awareness`. |
| `EditorMarkdown` | Consultar os formatos ativos, aplicar os comandos e manter a barra contextual. |
| SCSS do editor | Tornar a semântica Markdown visualmente explícita com tokens e sem overflow. |

## Testes e verificação

1. Testes de integração do Milkdown real para cada formato: aplicação por comando, Markdown
   serializado e round-trip ao reabrir. Casos cobrem seleção de texto para marcas, parágrafo para
   blocos e tabela com operações contextuais.
2. Testes de componente para estado ativo, presença/ausência das ações contextuais de tabela,
   acessibilidade e barra mobile.
3. Testes de serviço para a cor da ficha mais recente, empate determinístico e fallback sem ficha
   ou sem cor; testes de contrato/backend para `updatedDate`.
4. Aplicação real em 1920×1080 e 360×800: todos os formatos, lista aninhada, citação, tabela
   larga, foco e barra. No Esquadrão, dois usuários com cores de ficha distintas editam a mesma
   página e confirmam inicial, cursor e seleção da cor correta, além de reconexão.

## Fora de escopo

- Novos formatos Markdown (imagem, anexo, vídeo, exportação, comentários ou histórico de versões).
- Mudança de propriedade/permissão de cadernos e fichas.
- Gradiente de presença, paleta por papel ou cor escolhida manualmente no Caderno.
- Alterações no painel flutuante compartilhado em andamento em outra task.
