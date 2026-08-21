# m7-10-historico-rolagens-iniciativa.spec.md

> Ajuste pós-milestone do M7 — Encontro de Combate.

## Objetivo

Exibir na tela **Iniciativa** um histórico de rolagens relevante para a sessão, para que mestre e
jogadores acompanhem resultados sem abandonar o encontro.

## Entregáveis

1. Integrar à tela um feed de rolagens da campanha, reutilizando o contrato, o recorte de permissão
   e o padrão de atualização em tempo real já existentes no módulo de rolagem. Rolagens privadas
   jamais aparecem para quem não teria acesso fora do encontro.
2. O feed mostra personagem, rótulo, fórmula, resultado e momento relativo; rolagens novas entram
   sem recarregar a página.
3. Reusar `HistoricoRolagensSidebar` ou extrair somente uma apresentação burra comum caso o
   componente atual não caiba no shell do encontro. Não duplicar consultas, signals ou regras de
   visibilidade de `FichaRolagemRegistroService`/`RolagemService`.
4. No desktop, registrar como análogo a sidebar/feed de rolagens da campanha; no mobile, o feed é
   acessível por gatilho próprio e não disputa a barra de ação primária nem causa rolagem horizontal.

## Critérios de Aceite

- Uma rolagem pública feita durante o encontro aparece ao vivo para mestre e jogador elegível.
- Uma rolagem privada não vaza para outro membro em REST nem WebSocket.
- O histórico continua alcançável em `360×800` e não comprime a lista de combatentes em
  `1920×1080`.
- Verificação pela skill `verify` nos dois viewports e com dois usuários simultâneos; `npm run test
  -w frontend` verde e `npm run lint -w frontend` limpo.

## Fora de Escopo

- Criar novo formato de rolagem, alterar persistência ou alterar o log de eventos do encontro.

## Dependências

- `m7-07` (shell de feed lateral) e o histórico de rolagens já entregue em M3.
