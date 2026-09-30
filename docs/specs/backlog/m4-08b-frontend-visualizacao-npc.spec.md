# m4-08b-frontend-visualizacao-npc.spec.md

> Task adicional do M4, após `m4-08` e antes de `m4-09`. Fecha a lacuna de consulta/edição
> que a listagem anterior adiava para uma pendência. Planejada, ainda não implementada.
> Contrato visual: `docs/design/FICHA-NPC.md`; constituição visual: `docs/design/DESIGN.md`.

## Objetivo

Entregar a ficha de NPC para consulta e edição no lugar, alinhada às fichas atuais de criatura
e jogador. O mestre gerencia a ficha; jogador com concessão apenas lê. A criação e os cartões
devem levar à tela do tipo certo, sem interpretar `FichaNpcDadosDto` como dados de agente.

## Entregáveis

1. **Página e componente dedicados**, standalone/lazy: rotas `/campanhas/:campanhaId/npc/:id`
   e `/fichas/npc/:id`, com as rotas literais antes de `:id`. Criação restrita ao mestre;
   leitura validada pela API conforme concessão, sem aplicar uma guarda de mestre que barre
   o jogador autorizado. Conectar a saída de `m4-08`, o cartão por tipo do acervo e o painel.
2. **Composição da ficha** conforme `docs/design/FICHA-NPC.md`: duas colunas no desktop,
   Identidade/recursos + Atributos à esquerda, Habilidades/Conduta/Sanidade à direita; shell
   atual de `CriaturaVisualizacao`, recursos e edição de `FichaVisualizacao`. Nome/função,
   Categoria/Nível e Cooperação com faixa textual são o recorte de identidade do NPC.
3. **Recursos conforme modelo**, sem controles de Energia para Civil; Reserva Fixa sem
   recarga e Pool + Recarga com metadado próprio. Defesa/Bloquear/Esquivar usam snapshots;
   DT vem do motor por atributo/contexto. Não recalcular os snapshots sobre edições.
4. **Edição no próprio lugar** para o mestre, por serviço dedicado de orquestração de edição,
   espelhando o papel de `FichaEdicaoCriaturaService`. Listas com Adicionar/Editar/Concluir;
   grupos de validação conjunta com rascunho + Salvar/Cancelar. Erro preserva rascunho e
   comunica estado de gravação. Leitura não apresenta entradas nem ações de gestão.
5. **Ações compartilhadas**: coluna canônica e utilitários existentes compatíveis com NPC,
   Anotações privadas e gestão de acesso por jogador. Eventos e recuperação seguem o
   mecanismo de ficha existente, inclusive revogação de leitura; nenhum gateway novo.
   Não oferecer um utilitário cuja API ainda não suporte o contrato de NPC.
6. **Primitivos e responsividade**: inventário de controles, inputs de densidade completos,
   estados vazio/carregando/erro, texto longo e abas; composição pela largura útil, também
   com histórico aberto. Reusar metadados genéricos de imagem/cor/enquadramento se suportados
   pela API de NPC, sem duplicar estrutura no JSONB. Necessidade de ampliar primitivo deve
   ser apresentada ao autor antes de implementar alternativa local.

## Critérios de Aceite

- Criar, abrir, editar e reabrir NPC mantém seu tipo e documento; nenhuma rota de entrada
  monta a ficha de jogador. Testar entradas por campanha, acervo e retorno da criação.
- Mestre altera Vida/Energia, Cooperação, atributos e listas; alterações persistem, sem
  recomputação silenciosa de máximos. Leitor autorizado vê a mudança sem F5 e não edita.
- Jogador sem concessão e espectador não leem, inclusive por rota direta. Revogação tira
  acesso sem deixar dados privados visíveis. Anotações não entram na projeção do leitor.
- Testes relevantes, build e lint passam. Verificação pessoal na aplicação real com `verify`
  em `1920×1080`, `1366×768`, `960×1080` e `360×800`, comparando os dois análogos atuais.
  Cobrir as cinco Categorias, Cooperação, Civil sem Energia, listas vazias/longas, edição,
  leitura, erro de carga/gravação e histórico aberto. Registrar densidade, hierarquia,
  controles, foco, contraste, alvos de toque e ausência de overflow; corrigir divergências.

## Fora de Escopo

- Criar fórmula, representação de condição ou regra de combate nova; consumir o domínio/contrato
  entregue nas tasks `m4-05`/`m4-06`/`m4-07` antes de oferecer controles para elas.
- Maestria, inventário/progressão de agente e NA/VD/Modificadores de criatura.
- Automação de turno, geração de conteúdo, publicação de versão e rework das fichas existentes.
- Listagem/revelação integrada (`m4-09`) e polimento mobile complementar (`m4-10`).

## Dependências

- `m4-05`, `m4-06`, `m4-07`, `m4-08`; API de recuperação/alteração e metadados de NPC tipada
  e funcional, sem depender apenas de um endpoint de criação.
- `m4-11` (acervo por tipo), `m4-04b` (precedente de tela dedicada).
- `docs/design/FICHA-NPC.md`, `docs/design/DESIGN.md`, `docs/SCHEMA.md` e guia de mestre.

## Riscos e Mitigação

Não transportar a guarda exclusiva de mestre da criação para a leitura concedida. Não copiar
o dashboard antigo do mockup de criatura nem transformar `FichaVisualizacao` em união de três
domínios. Não replicar seus controles locais quando já existe primitivo. Os pontos de volume
de habilidades e exceção Civil foram fechados na `m4-06`; Morrendo foi definido na `m4-07`
em `dados.condicoes.morrendo`, com ajuste pontual pela API própria. A tela consome essas fontes.
