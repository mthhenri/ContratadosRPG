# ficha-oculta-rolagem-publica-sem-identidade.spec.md

> D-01: decisão expressa do autor em 19/10/2026; comportamento ainda não implementado.

## Objetivo

Manter públicas as rolagens de ficha de jogador oculta sem revelar a identidade
estruturada dessa ficha para terceiros, incluindo rolagens anteriores à
ocultação e feeds que já estejam carregados.

## Entregáveis

1. Definir o recorte na service dona, usando a autorização vigente: dono/mestre
   preservam seu recorte, outro jogador e espectador não recebem nome, fichaId,
   cor/avatar ou vínculo de combatente que identifique a ficha oculta. Não basta
   esconder esses campos no template. Ajustar contratos em `shared/` se preciso,
   conforme `dto-conventions`, e documentar a política em `SYSTEM.SPEC.md`.
2. Aplicar o recorte a histórico/feed de campanha, projeção de espectador,
   prévias M→A/B/S, resultados retornados e eventos `rolagem:registrada` e
   `rolagem:excluida`, sem enviar um payload privado à sala ampla. Preservar
   resultado, fórmula/rótulo autorais, visibilidade PUBLICA e autoria de conta.
   Não censurar menções livres nem mudar automaticamente para PRIVADA.
3. Invalidar os feeds já carregados ao ocultar/exibir e após reconexão, sem
   expor a identidade no invalidator. Ler rolagens antigas no estado atual da
   ficha; não exigir apagar o histórico original nem criar cópias divergentes.
4. Mapear com `impacto` todos os consumidores, inclusive notificações, cartões,
   janela de histórico, combate, Investigação, autoria e abertura por ficha.
   Rótulo neutro deve usar os controles/padrões existentes e distinguir de
   rolagem avulsa do mestre; escolher análogo antes de editar UI.
5. Testes de recorte REST/WS, rolagem antiga/nova e feed já aberto; relatório
   ao vivo nos papéis e projeções afetados, conforme §3.1.

## Critérios de Aceite

- A rola pública enquanto visível, oculta e rola novamente. B/S e prévias
  equivalentes recebem os dois resultados, sem identidade estruturada de A,
  tanto em REST quanto nos sockets e no feed que estava aberto.
- M/A conservam o recorte permitido; exibir restaura o recorte de identidade
  autorizado. Rolagens privadas continuam privadas e NPC continua forçado a
  privado. IDs de evento/rolagem podem existir; não podem funcionar como DTO de
  ficha ou vínculo oculto na resposta.
- Sem reload, testar transição, exclusão, requisição atrasada e reconexão;
  `verify` em 1920×1080/360×800 e demais viewports aplicáveis; suites de recorte,
  build/lint proporcionais e `repo:verificar` aprovados.

## Fora de Escopo

Anonimizar conta do autor, censurar texto livre, ocultar o resultado público,
apagar registros antigos ou reabrir FO-01/02/03, H-02 e cálculo de médias.

## Dependências

- [Decisão/evidências D-01](../done/auditoria-ficha-oculta-retomada-cobertura/verificacao.md).
- `docs/SYSTEM.SPEC.md` §9/14, `docs/design/DESIGN.md`, skills `tempo-real`,
  `gerenciamento-de-impacto`, `dto-conventions`, `design-fidelity` e `verify`.
