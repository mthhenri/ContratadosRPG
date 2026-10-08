# Auditoria de ficha oculta em todos os consumidores

## Execução em 2026-09-29 — aberta

[Relatório, matriz e roteiro de retomada](auditoria-ficha-oculta-todos-consumidores/ficha-oculta-todos-consumidores.md).
Três divergências confirmadas encaminhadas para specs de correção: identidade no encontro,
eventos amplos e concessão versus ocultação. Testes existentes: 5 arquivos / 280 testes passaram;
cenário sintético com M/A/B/S reproduziu REST e WebSocket. Nenhum código alterado.

Permanece `active`: API deixou de responder nos cenários adicionais. Pendentes revogação,
reconexão, prévias ao vivo, leitor/cache, avatar e observação autenticada em 1920×1080/360×800.
Rolagem pública, médias e precedência sobre concessão histórica requerem decisão explicitada
no relatório. Esta execução não autoriza implementar as specs geradas.

## Pedido e contrato

Autor, 2026-09-29: ficha oculta de um jogador não aparece para outros jogadores; o dono continua vendo a sua e o mestre mantém gestão. Ocultação deve esconder a existência do agente nos lugares que exibem fichas, e não apenas seus números.

Esta tarefa é exclusivamente investigativa: identificar, comprovar e documentar os consumidores e possíveis vazamentos, sem implementar correções. Não alterar código de aplicação, contratos, schema, estilos ou testes versionados. Não assumir que todos os fluxos estão quebrados.

Os entregáveis são um relatório em `docs/specs/done/auditoria-ficha-oculta-todos-consumidores/ficha-oculta-todos-consumidores.md` e, quando houver achados confirmados, uma ou mais specs de correção em `docs/specs/backlog/`. A execução dessas specs é uma tarefa posterior e não está autorizada pela execução desta auditoria.

## Evidências iniciais

- `FichaService.listarFichas` e prévia usam `listarVisiveisParaUsuario`; espectador filtra agentes não ocultos em `listarFichasParaEspectador`.
- `CampanhaRepository.listarMembros` tem filtro de ocultação por ficha: conferir se agrupamento e membro sem fichas acabam revelando um agente oculto. Não confundir existência da conta/membro com identidade da ficha.
- `encontro-revelacao.ts:ocultarNaoRevelados` mapeia combatentes em vez de removê-los. `ocultarCombatente` conserva nome, fichaId, cor, iniciativa, ordem e o registro do combatente mesmo sem identidade autorizada. A ocultação de números não satisfaz, por si só, o contrato novo de ausência da ficha oculta.
- As decisões antigas de carteirinha/revelação de combate podem permitir revelar um combatente sem revelar a ficha. Conferir essa distinção contra o pedido antes de corrigir; não alterar criaturas/NPCs indiscriminadamente.

## Escopo da auditoria

Produzir matriz auditável com: consumidor, REST/service/repository, payload/evento, papel/observador, regra aplicada, evidência, resultado e correção/teste necessário. Descobrir todos os consumidores pelo código; esta lista é piso, não inventário fechado:

- Campanha: esquadrão, membros/carteirinhas, seletores de ficha, prévias jogador/espectador e projeções.
- Cena: grade de agentes, futura equipe da Investigação, anexos/referências e carregamento por id.
- Encontro/Iniciativa: combatentes, trilha/ordem da rodada, turno atual, eventos/log e pedido de iniciativa; consultas legadas.
- Ficha completa/flutuante, links, avatar/preview, seletores e transferência de itens.
- Rolagens: feeds de campanha/cena/ficha, notificações e eventos; conferir referências que entreguem identidade/fichaId de agente oculto. Não presumir que ocultação de ficha e visibilidade de rolagem são o mesmo controle: evidenciar conflitos e discutir semântica com o autor antes de mudar publicação de rolagens.
- Cadernos/anotações/busca e qualquer resposta derivada que enumere ou referencie fichas; não tentar censurar texto livre escrito por usuários.
- WebSocket: criação, alteração, recortes, visibilidade, remoção, presença e reconexão. Verificar payload efetivo para cada sala/usuário, não só quem assina no frontend.
- Contagens, ordenação, espaços reservados, mensagens e estados vazios que revelem implicitamente a ficha excluída.

## Critérios de avaliação e requisitos para as futuras specs

Os critérios abaixo orientam a identificação de divergências e a redação das specs posteriores; não são instruções para corrigir código nesta tarefa.

- Aplicar recorte autorizado no backend antes de serializar/enviar, com árbitro de permissão único; ocultar por CSS ou filtrar somente na UI não atende.
- Dono vê própria ficha oculta; mestre vê todas; outro jogador não recebe a ficha oculta nem marcador que denuncie sua existência. Testar também concessão anterior e revogação: se a política antiga de acesso explícito conflitar com a ocultação solicitada, registrar e resolver com o autor antes de adotar exceção.
- Prévia usa permissões do alvo; espectador mantém seu recorte próprio sem acesso a ocultas.
- Ocultação ao vivo elimina item, seleção, leitor/prévia e cache autorizado anterior. Desocultar restaura somente o recorte permitido; reconexão corrige eventos perdidos.
- Ordem, turno e contagem de encontro devem permanecer coerentes após o recorte; não expor identificadores órfãos de combatente invisível. Separar ocultação de agente de revelação de criatura/NPC e preservar regras não afetadas.
- Identidade de usuário/membro é conceito distinto. Não remover a conta da campanha, mudar papel ou esconder membros arbitrariamente como efeito da ficha oculta. Discutir qualquer indício residual que conflite com a ausência do agente.

## Cenário e aceite

Mestre, jogador A (dono de oculta), jogador B (observador) e espectador; fichas visível sem concessão, visível com concessão e oculta, além de criatura não revelada e revelada. Repetir com mestre em prévia de A/B/espectador.

Em cada consumidor, registrar resultado de carga inicial, acesso direto, alteração visível→oculta→visível, concessão/revogação e reconexão. A vê a sua oculta; B não vê existência da ficha de A nas listagens/projeções; mestre mantém gestão. Não ampliar ficha visível de carteirinha para acesso completo.

Usar testes existentes e verificações exploratórias para obter evidência, sem escrever ou alterar testes versionados. Quando o ambiente permitir, usar a skill verify com contas separadas e inspeção de payloads autorizados, em 1920×1080 e 360×800 para superfícies relevantes. Não alterar dados reais do usuário; usar cenário local de teste. Registrar comandos, cenários e resultados, distinguindo comportamento observado, evidência estática e hipótese. Se faltar ambiente para confirmar um achado, registrar a limitação e a reprodução pendente, sem apresentá-lo como confirmado.

## Specs de correção geradas pela auditoria

Para cada achado confirmado, criar ou complementar uma spec de backlog pertinente, evitando duplicar trabalho já especificado. Agrupar achados somente quando compartilham a mesma responsabilidade e podem ser corrigidos e validados juntos. Cada spec deve conter:

- Identificador do achado e link para a evidência no relatório.
- Arquivos, classes, métodos, consultas, endpoints, eventos e consumidores exatos envolvidos, com referências de linha da revisão analisada.
- Cenário de reprodução, papel do observador, comportamento atual e comportamento esperado.
- Causa identificada e limites da correção: em qual camada aplicar o recorte, quais consumidores derivados precisam acompanhar e quais regras devem ser preservadas.
- Critérios de aceite e testes necessários, incluindo acesso direto, tempo real, reconexão e prévias quando aplicável; gate visual somente se a correção afetar UI.
- Dependências, conflitos de regra e decisões ainda necessárias do autor. Não transformar hipótese ou decisão pendente em solução já aprovada.

Os indícios iniciais desta spec precisam ser investigados antes de gerar uma correção definitiva. Se não houver achado confirmado, registrar esse resultado; não criar spec de correção artificial. Hipóteses não resolvidas permanecem pendências de investigação.

## Fecho

A auditoria pode ser concluída com defeitos ainda existentes: sua definição de pronto é o inventário completo, relatório com evidências e limitações explícitas, e todo achado confirmado encaminhado para uma spec de correção concreta. Concluir a investigação não significa declarar a ocultação corrigida. Uma hipótese cuja confirmação obrigatória ainda esteja pendente mantém aberto o recorte correspondente da investigação.

No fecho, listar os consumidores conferidos, achados confirmados, hipóteses pendentes e specs geradas, e confirmar que nenhum código foi alterado. Registrar o resultado investigativo no contexto conforme as regras do repositório, sem descrever correções como realizadas nem alterar regras normativas de comportamento nesta tarefa. Preservar specs históricas. Referências: SYSTEM.SPEC §14, CONVENTIONS, m3-65/m7-16, regras de revelação do encontro e skill tempo-real.
