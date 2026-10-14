# transcricoes-02-importacao-e-glossario.spec.md

> **Task 02/09** do guarda-chuva `transcricoes.spec.md`. Preparação das faixas e vocabulário por campanha.

> **Estado: backlog; preparação documental. Implementação depende de aprovação expressa do autor.**
> Decisões pendentes, matriz de acesso e gates: [revisão](transcricoes/revisao.md). Anexos próprios: `transcricoes-02-importacao-e-glossario/` no mesmo estado; evidência bruta em `.artifacts/transcricoes-02-importacao-e-glossario/`.

## Objetivo

Permitir que o Mestre organize a importação multifaixa do Craig, confirme identidades e offsets e mantenha um glossário por campanha para orientar os motores.

## Entregáveis

1. Glossário Mestre-scoped por campanha: adicionar, editar, excluir e listar termos, com validação e API persistente. Termos são dicas de reconhecimento, jamais substituições cegas; validar montagem do contexto; efeito no reconhecimento é aceite da task 04.
2. Importação no aplicativo de múltiplos WAVs; associar arquivos a uma sessão do site sem enviar os próprios WAVs à nuvem. Importação por lote deve preservar nomes/metadata de origem e alertar sobre faixa faltante ou duplicada.
3. Proposta automática de identidade por nomes de arquivo e associações da campanha, com confirmação/correção manual antes de transcrever e persistência da associação reutilizável. Permitir participantes que não possuam conta no site.
4. Verificação de formatos e referência de alinhamento temporal do Craig, preservação de silêncios e offsets por faixa (valor manual ajustável), com reporte de inconsistências; o algoritmo de validação deve ser documentado após testar casos representativos.
5. Contrato que entregue ao motor a seleção de arquivos, mapeamentos, idioma, glossário e offsets, sem confundir termos de uma campanha com outra.

6. Importação é responsabilidade da UI do aplicativo criado na task 03; site recebe apenas metadados selecionados, mapeamentos, glossário e offsets. Paths absolutos locais e conteúdo WAV não trafegam para a API. O glossário desta task não depende de `regras-glossario.spec.md`, que trata de definições no leitor público.
7. Registrar fixtures de cabeçalho WAV válido/corrompido, canais/taxa/duração, silêncio inicial, atraso conhecido, nomes Unicode e arquivos repetidos. Amostra Craig real requer autorização e origem conhecida; diferença de duração não demonstra desalinhamento sozinha. Não deslocar timestamps por remoção de silêncio/VAD.
8. Duplicidade de arquivo, identidade e termo tem política documentada antes da implementação (D-06). Sugestão não equivale a confirmação; participante sem conta continua válido. Preservar a configuração/glossário efetivamente usados em cada execução, sem mudar resultados anteriores ao editar o glossário.

## Critérios de Aceite

- Com WAVs de nomes Craig conhecidos e desconhecidos, associações são sugeridas corretamente quando registradas e podem ser confirmadas/rejeitadas; mudança de identidade não altera arquivo original.
- Dois arquivos com durações diferentes e atraso conhecido produzem timeline corrigível por offset sem deslocamento indevido dos trechos de outra faixa; preservar sobreposição.
- Glossário da campanha A não é consultável/mutável por Mestre de B nem por jogadores; testes de validação para termos vazios, duplicados e nomes com diacríticos.
- Arquivo WAV não é enviado à API na jornada local; teste de rede/verificação da requisição confirma transmissão apenas de metadados autorizados.
- Gates do backend/frontend/app afetados; gate visual quando a associação/glossário tiver interface, nos viewports obrigatórios.

- Testar WAV truncado/cabeçalho incompatível, extensão falsa, faixa sem fala e arquivo renomeado/alterado. Erro isolado informa a faixa e não inicia reconhecimento sem associação confirmada.
- Identidades/termos com acentos e caixa diferente não se fundem silenciosamente; regras de duplicidade são as aprovadas em D-06. Conferir não vazamento de glossário/metadados para campanhas alheias.
- Usar fixtures sintéticas para provar cálculo temporal, sem afirmar semântica Craig real quando não houver amostra autorizada. Cobrir UI de sugestão, confirmação, erro, offset e glossário nos quatro viewports web quando aplicável; app em Windows real.
- Aplicar os [gates comuns](transcricoes/revisao.md#gates-de-implementação) ao recorte desta task e registrar comandos, resultados e limites no anexo proprietário. Critérios são futuros: esta revisão documental não os executou.

## Fora de Escopo

- Glossários global/por sessão, transcrição de faixa única com diarização, reconhecimento mágico de identidades desconhecidas, conversão automática de todos os formatos de mídia.
- Regravar ou normalizar arquivos originais sem ação explícita.

## Dependências

- `../active/transcricoes-01-sessoes-e-contratos.spec.md` e `../active/transcricoes-03-agente-windows-e-vinculo.spec.md` em `done/`; design de campanha; arquivo de referência `transcrever.py` do autor.

## Riscos e Mitigação

- Nomes de arquivos do Craig diferem de nomes no site: associação confirmada prevalece sobre heurística.
- Craig pode exportar faixas com metadados/durações diferentes; não presumir sincronismo a partir apenas de extensões `.wav`.
