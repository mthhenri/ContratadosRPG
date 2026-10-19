# Verificação — médias por observador

Implementação e verificação local concluídas em 19/10/2026. API isolada 3101,
SPA 4301 e Postgres real. Publicação de produção não foi executada.

## Fonte e publicação controlada

Sistema 4.1.5, “Iniciando um Novo Agente”, explicita o conjunto por observador,
incluindo própria ficha oculta, visão de mestre, concessão suspensa, exclusão
de criatura/NPC e conjunto visível vazio. Reduções e arredondamentos não mudaram.

A Oficina original continha duas diferenças de formatação anteriores à tarefa.
Para preservá-las, foi criado o banco local `contratados_auditoria_medias`, cópia
do ambiente de verificação. Somente nessa cópia a árvore foi reconciliada com
a fotografia publicada; acrescentou-se a política aprovada na introdução da
seção pela API administrativa da Oficina. Publicação 4.1.5, id local 39, zero
pendências. `npm run regras:exportar` gerou a cópia, sem edição manual; o diff
do corpo contém somente o parágrafo aprovado. O cabeçalho derivado de condições
também acompanha a versão. `regras:exportar -- --conferir` aprovou os dois livros.

Ponteiros para o arquivo 4.1.5 foram corrigidos mecanicamente, inclusive documentos
históricos; seus requisitos/decisões permanecem intactos. AGENTS/CLAUDE e as duas
cópias da skill de regras continuam idênticos. A skill foi exercitada neste
alinhamento real de regra, motor e consumidores.

### Aplicação no ambiente final

Esta verificação não publica o livro no banco original nem em produção. Na
publicação final, o ADMIN deve preservar/revisar os rascunhos existentes,
aplicar o mesmo parágrafo da seção do arquivo gerado pela Oficina, publicar
4.1.5 e conferir a exportação contra este commit. Não importar ou substituir
uma árvore inteira sobre edições que ainda não foram revisadas. Esse é o gate
operacional da publicação; o alvo desta execução foi implementação e commit,
sem deploy ou migração de dados de produção.

## Arquitetura e impacto

`FichaService.calcularMediasEsquadrao` reutiliza `listarFichas`, que já resolve
papel, dono, concessão e sua suspensão. O service filtra jogador; o motor
`shared/regras/novo-agente/medias-esquadrao.ts` calcula as médias, sem IDs ou
permissões. SQL global antigo removido; SQL da listagem autorizada preservado.
Nulos continuam fora do divisor, zero entra, quantidade conta os agentes.
Conjunto vazio produz três zeros. Contrato de saída da API preservado.

Impacto: cinco consumidores e quatro testes no levantamento inicial. Controller,
service, repository, cliente HTTP e guia conferidos; prévias não consultam esse
agregado atualmente. Nenhuma fórmula foi replicada no frontend/backend. DTOs
novos ficam em shared/dtos, sem herança; OpenAPI regenerado. Sem novo controle,
estilo, migration ou autorização fora do dono da regra.

## Testes e revisão

- Regressão backend reproduziu B recebendo média 6/quantidade 2 em vez de 2/1.
- Regressão do aviso vazio falhou antes de trocar “Primeiro agente da campanha”
  por “Nenhum agente visível”.
- Revisão independente encontrou retomada restaurando médias antigas. Dois testes
  com rascunho completo reproduziram 6 em vez de 2/0. Retomar agora conserva os
  campos preenchidos e os valores manuais de progressão, reconciliando as médias
  derivadas com a API. A carga assíncrona também aplica o conjunto vazio.
- Shared: 77 arquivos, 1340 testes aprovados; Novo Agente 21/21.
- Backend: 1244 aprovados, 99 skipped; foco 233/233.
- Frontend: 285 arquivos, 3583 testes aprovados, incluindo retomada corrigida.
- Builds shared/backend/frontend e tipos backend aprovados.
- Lint dos três workspaces sem erros; avisos de estilo do padrão atual registrados.
  Build frontend mantém aviso de orçamento inicial: 599,36 kB para 450 kB.
- Organização e espelhos conferidos na árvore e no índice antes do commit.

Os 99 testes condicionados à configuração específica de banco ficaram skipped;
a matriz abaixo executa HTTP e persistência reais. Alterações de ícones e arquivo
de lançamento preexistentes do autor ficaram fora deste commit.

## Aplicação real e comparação visual

Cenário: A nível 10 oculta, B nível 2 visível, concessão A→B suspensa, concessão
B→A ativa, criatura e NPC presentes. Retorno da API e guia conferidos:

| Observador | Quantidade | Média de nível | Nível inicial automático |
|---|---:|---:|---:|
| B | 1 | 2 | 1 |
| Dono A | 2 | 6 | 5 |
| Mestre | 2 | 6 | 5 |
| Jogador sem agente visível | 0 | 0 | 0 |

Espectador e não membro receberam 403. Criatura/NPC não alteraram o agregado.
Exibir A recompôs B para quantidade 2/média 6; ocultar restaurou quantidade 1/média 2.
Rascunhos reais com média 6/Prestígio 28 foram salvos no navegador e retomados:
B usou 2/0, conjunto vazio usou 0/0, sem perder o codinome/perfil preenchido.

Análogo: etapa Novo agente do próprio guia, com o mesmo shell, aviso, densidade,
controles e memorial. Estados de média positiva e conjunto vazio observados em
1920×1080, 360×800, 960×1080 e 1366×768. Orquestrador inspecionou pessoalmente
desktop/mobile e tamanho intermediário. Textos cabem, hierarquia e contraste
mantidos, nenhum overflow horizontal; controles e navegação existentes preservados.

Evidências locais ignoradas: `.artifacts/ficha-medias-esquadrao-recorte-do-observador/`
(matriz JSON, capturas, logs, roteiro de publicação e scripts). O banco original,
seus rascunhos e a aplicação do autor na porta 4300 foram preservados.

Delegação: Codex, modelo herdado — implementação backend/shared e revisão
independente; integração, correção da retomada e inspeção visual pelo orquestrador.
