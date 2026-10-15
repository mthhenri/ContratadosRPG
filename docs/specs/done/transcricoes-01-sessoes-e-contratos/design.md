# Task 01 — desenho aprovado

Base local: `d339e525f70328c69a0f5b42f8af00662bac255d`.
Em resposta ao pedido de começar a implementar, a V1 local 01–07 está autorizada.
Autor aprovou expressamente este desenho em 2026-10-14 (“aprovo”).
Fecha D-01 e a parte estrutural de D-05 antes do código, conforme entregável 6.
Não autoriza nuvem, deploy, push ou PR remoto.

## Recorte e abordagem

Recomendação: módulo `transcricao` próprio no backend e contratos em
`shared/src/dtos/transcricao/`, sem usar `cena` ou `documento` como persistência.
A gravação pode atravessar várias Cenas e não ganha mecanismo de revelação.
Reusar Cena imporia seu ciclo PLANEJADA/ATIVA/ENCERRADA; reusar Documento traria
permissões da Biblioteca. Ambas as alternativas prejudicam o escopo privado.

A task entrega contratos, persistência e API mínima, com testes; nenhuma tela,
instalador ou inferência. Importação/glossário são 02; credencial de dispositivo
é 03; ingestão idempotente e outbox são 05; editor é 06.

## Modelo proposto — D-01

Todos os registros têm BaseEntity e id numérico do servidor. Identidades externas
estáveis são UUID, sem converter todo o projeto para UUID como chave primária.

| Entidade | Relação e conteúdo |
|---|---|
| `sessao_transcricao` | Pertence a uma campanha; título, identificador UUID e flag de arquivamento |
| `faixa_transcricao` | Pertence a uma sessão; nome da origem, nome do participante sem conta obrigatória, identificador UUID e offset assinado |
| `execucao_transcricao` | Pertence a uma faixa; identificador UUID, estado, motor/versão/configuração efetiva e idioma; várias execuções são resultados alternativos |
| `segmento_transcricao` | Pertence a uma execução; identificador estável, início/fim brutos, original imutável, correção nullable e revisão editorial |

Uma faixa seleciona explicitamente uma de suas execuções concluídas; não pode
selecionar execução de outra faixa. A ingestão futura não seleciona automaticamente
nova execução nem substitui original/correção. O mapeamento reutilizável por campanha
e glossário serão modelados na 02; a identidade da pessoa nesta task é o rótulo
confirmado da faixa, sem criar requisito de conta ou cadastro de participante.

**Escolha proposta para arquivamento:** arquivar apenas remove a sessão da listagem
padrão; Mestre pode listar arquivadas e desarquivar. Não remove texto nem WAV local.
Excluir usa soft delete e torna sessão/descendentes inacessíveis; não criar restore
ou histórico recuperável. Alternativa mais simples: só exclusão por soft delete,
sem estado separado de arquivamento. Aprovado o arquivamento separado da exclusão nesta sessão.

Estados persistidos de execução usam tabela de referência `tipo_*`, como demais
enums de coluna. Original e tempos brutos ficam imutáveis depois da conclusão;
correção e seleção pertencem ao servidor. Não criar credenciais ou tabelas cloud.

## Contrato temporal/editorial proposto — D-05

- Unidade: milissegundos inteiros. Motor converte segundos uma vez para o contrato;
  documentar arredondamento ao milissegundo mais próximo, sem acumular deltas.
- Início bruto não negativo; fim maior ou igual ao início; offset pode ser negativo.
- Horário na sessão = horário bruto da faixa + offset. Preservar negativos na
  representação da sessão e nunca alterar original por mudança de offset.
- Ordenação: início efetivo, identidade estável da faixa, início bruto e identidade
  estável do segmento. Sobreposição preserva ambos os segmentos.
- Correção `null` significa não editado; string vazia significa correção vazia
  intencional. Campo editorial tem revisão inteira e alteração concorrente falha
  com 409, preservando rascunho; não implementar colaboração/histórico completo.
- Seleção explícita é por faixa; cada execução conserva as próprias correções.

A política de SRT para horários negativos continua pendente antes da 07; o contrato
não os trunca nem obriga escolher agora um deslocamento global de exportação.

## API e segurança

API inicial sob `/transcricao/sessao`: criar, listar por campanha, recuperar,
alterar título, arquivar/desarquivar e excluir; metadados de faixa são criados e
consultados no contexto da sessão, sem WAV. Nomear DTOs conforme skill canônica.
Endpoints de resultado/editor/vínculo ficam com suas tasks proprietárias.

Controller fina, service com validação explícita, repository dono com SQL normativo.
Reusar `CampanhaService.validarMembro`/`ehMestre`; checar conta/tokenVersao pelos
guards globais. Id de filho não altera campanha/pai resolvidos pelo servidor.
Recursos restritos/inexistentes têm resposta uniforme; ausência de auth válida
é 401. ADMIN/TESTER sem MESTRE não recebem acesso especial.

Nenhum evento privado vai à sala cheia da campanha. Como esta task não tem UI
consumidora, não acrescentar eventos de conteúdo por antecipação. Registrar
controllers no gerador OpenAPI e rever schemas/erros efetivamente produzidos.

## Provas e limites

Testes de service/controller/repository e Postgres descartável: matriz de acesso,
ids cruzados, arquivamento/exclusão, validação de input, constraints de vínculo,
original/correção e precisão temporal. UP/DOWN somente no banco de testes autorizado;
sem acesso à produção. Atualizar SCHEMA quando as migrations forem implementadas.

Sem UI nesta task, gate visual não se aplica; não dispensá-lo nas tasks posteriores.
Sem ambiente Postgres disponível, registrar o gate aberto em vez de afirmar conclusão.
