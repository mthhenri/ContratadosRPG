# transcricoes-07-exportacao-e-fecho-v1.spec.md

> **Task 07/09** do guarda-chuva `transcricoes.spec.md`. Exportação e gate integrado da V1 local.

> **Estado: backlog; preparação documental. Implementação depende de aprovação expressa do autor.**
> Decisões pendentes, matriz de acesso e gates: [revisão](transcricoes/revisao.md). Anexos próprios: `transcricoes-07-exportacao-e-fecho-v1/` no mesmo estado; evidência bruta em `.artifacts/transcricoes-07-exportacao-e-fecho-v1/`.

## Objetivo

Entregar TXT, SRT, JSON e ZIP por participante ou em versão consolidada, usando correções vigentes; comprovar a jornada local completa e documentar limites antes de declarar a V1 pronta.

## Entregáveis

1. Exportador para TXT, SRT e JSON a partir do mesmo contrato canônico de segmentos, com participante, timestamps efetivos, texto corrigido vigente e referência à sessão; JSON preserva estrutura e rastreabilidade sem incluir segredos.
2. Exportação consolidada e individual, inclusive trechos simultâneos em ordem estável e timestamps SRT coerentes; ZIP com os artefatos escolhidos e nomes de arquivo seguros.
3. Fluxo Mestre do site: abrir sessão, visualizar estado das faixas, encaminhar para aplicativo local instalado, editar e exportar; mensagens de falta de app, fila pendente, sincronização pendente, mídia local ausente.
4. Corpus de teste sintético reproduzível com nomes de arquivos, pontuação, acentos, segmentos vazios/sobrepostos e deslocamentos positivos/negativos; testes de regressão dos exportadores e das interfaces relevantes.
5. Documentação de uso/instalação do aplicativo e relatório de verificação E2E com cenários normais/de erro, limitações técnicas observadas, evidência de verificação visual real e gates exigidos pelo projeto.

6. Fechar D-05/D-06 antes do exportador: origem temporal (sessão/faixa), SRT com tempo efetivo negativo, desempate, rotulagem de falante, exportação de várias faixas do mesmo participante e contrato/versionamento JSON. Recomendar manter sobreposição e não truncar/ajustar silêncio automaticamente; solução para negativos exige autor, não clamp silencioso.
7. Exportar apenas execução explicitamente selecionada de cada faixa e um snapshot consistente das correções/offsets; transferência de Mestre é revalidada no pedido de exportação. JSON não inclui paths locais, tokens ou credenciais. ZIP da V1 contém artefatos de texto, não WAVs.
8. Sanitizar nomes para Windows/ZIP (separadores, `..`, nomes reservados, colisões, Unicode); referência estável de faixa evita sobrescrita. Garantir UTF-8, SRT com milissegundos/cues enumerados e JSON parseável, sem eliminar falas sobrepostas ou correções vazias.

## Critérios de Aceite

- TXT/SRT/JSON/ZIP gerados podem ser reabertos, sem perda de caracteres ou timestamps; arquivo individual contém só o participante desejado; ZIP reúne o conjunto esperado sem duplicação.
- Correção no site aparece nas exportações, mas texto original persiste para referência interna.
- Jornada real Mestre: site → app Windows → WAVs Craig → GPU ou fallback CPU → offline → reconexão → editor individual/consolidado → downloads; validação cruzada de horários e identificação.
- Sessão extensa com múltiplas faixas testada em condições representativas; tempos medidos/reportados, sem meta arbitrária de desempenho.
- Gates: testes de workspaces alterados e suíte de integração, lint, `npm run repo:test`, `npm run repo:verificar` e `npm run repo:verificar -- --staged` quando aplicável; UI conforme `verify` desktop/mobile.

- Reabrir ZIP e verificar lista/conteúdo de todos os TXT/SRT/JSON; colisões de nome não sobrescrevem faixas. Casos com acentos, emoji, nomes reservados/separadores e múltiplas faixas por participante usam política aprovada.
- Exportação durante edição usa snapshot identificável: não mistura revisões antigas/novas. Arquivo individual não contém segmentos alheios; consolidado preserva ambos os simultâneos e execução selecionada; JSON reproduz identidades/offsets/unidades aprovados.
- Gate integrado usa matriz de permissão, conta/dispositivo revogados e Mestre transferido, captura de rede sem WAV enviado ao servidor, hardware Windows físico e os quatro viewports da task 06. Comparar export com fonte persistida e documentar limites de instalação/modelos/mídia; nenhum gate obrigatório é dispensado por mock.
- Aplicar os [gates comuns](transcricoes/revisao.md#gates-de-implementação) ao recorte desta task e registrar comandos, resultados e limites no anexo proprietário. Critérios são futuros: esta revisão documental não os executou.

## Fora de Escopo

- Nuvem, integrações Drive automáticas, criação de resumo por IA, edição avançada e compartilhamento com jogadores.

## Dependências

- `transcricoes-06-revisao-e-linha-do-tempo.spec.md`; tasks 01–05 concluídas; políticas de verificação em `docs/SYSTEM.SPEC.md` e `.agents/skills/task-flow/SKILL.md`.

## Riscos e Mitigação

- Exportação consolidada com fala sobreposta: preservar ambas e não inventar turno de fala.
- E2E insuficiente por hardware ausente: registrar explicitamente qual GPU/CPU foi realmente testada e manter task aberta se gate obrigatório não foi observado.

## Pendências herdadas da 03

A [03](../done/transcricoes-03-agente-windows-e-vinculo.spec.md) fechou com estes itens por verificar (ver o "Fecho" do anexo `verificacao.md`):

- B4: avisos de terceiros embutidos no Qt (ICU, FreeType, HarfBuzz…), termos do runtime C++ da Microsoft e revisão jurídica da oferta de código-fonte.
- Assinatura Authenticode e comportamento real do SmartScreen num download sem Mark-of-the-Web ambíguo.
- Prova de instalação sem administrador num Windows onde o usuário não é administrador (o Sandbox mostra "Administrator").
