# Task 02 — decisões aprovadas

Aprovadas pelo autor em 2026-10-15, como propostas no [plano](plano.md), com a ordem: abrir a 02 e começar pela 02.1.
O autor ainda **não** tem o `transcrever.py`; a task segue com fixtures sintéticas e **não afirma** compatibilidade com o Craig real.
Não autoriza nuvem, deploy, push ou PR remoto.

| ID | Decisão aprovada | Consequência |
|---|---|---|
| D-06a | Arquivo duplicado na sessão = mesmo nome de origem **e** mesmo tamanho **e** mesma duração; o app avisa e pede escolha, nunca une sozinho. O hash do conteúdo é calculado e fica **só no app** (detecta arquivo alterado/renomeado); não vai à API | o contrato da API não carrega hash de áudio |
| D-06b | Rótulo de participante guardado como digitado (NFC, aparado, espaços colapsados). A **comparação** para sugerir/detectar conflito ignora caixa e acento. "João" e "Joao" não são fundidos: criar o segundo exige confirmação explícita e mostra o parecido. Uma pessoa pode ter várias faixas; faixa e participante são distintos; participante sem conta é válido | duas chaves distintas no `shared/`: uma para termos (preserva acento) e uma para "parecido" |
| D-06c | Termo do glossário único por campanha por (NFC + aparado + espaços colapsados + caixa ignorada). Duplicata devolve 409 apontando o termo existente. **Acento diferente = termo diferente**, com dica não bloqueante. Limite técnico de 80 caracteres por termo; sem limite comercial de quantidade. O motor recebe a lista em ordem determinística; truncar pelo orçamento do prompt é da 04 | uma duplicata nunca é aceita em silêncio nem fundida |
| D-09 | **App**: importa WAVs, valida, sugere/confirma identidade e ajusta offset. **Site**: glossário da campanha (CRUD do Mestre) e visão somente-leitura de faixas/identidades. O app **lê** o glossário e **grava** faixas/identidades por rotas próprias de dispositivo, limitadas à sessão aberta pela intenção | glossário não é editável no app nesta task |
| D-10 | A 02 define o formato do snapshot (`glossarioEfetivo`: versão + termos) e a coluna `glossario_efetivo` (JSONB, nula) em `execucao_transcricao`; quem preenche é a ingestão da 05. Editar o glossário nunca muda execuções antigas | migration da 02 cria a coluna; sem produtor até a 05 |
| D-05+ | Offset em milissegundos inteiros, manual por faixa, nunca alterado por silêncio/VAD (já aprovado na 01). A 02 acrescenta `silencioInicialMs` apenas **informativo** (medido, não aplicado) | o motor nunca desloca timestamps por silêncio |

Como o app não conhece a convenção real de nomes do Craig, a sugestão **não presume formato**: compara o nome do arquivo (sem extensão e sem um
prefixo numérico de ordem) com os nomes de origem já associados pelo Mestre na campanha. Sem associação, a faixa fica "desconhecida" e
precisa de identidade informada; nunca há reconhecimento mágico.
