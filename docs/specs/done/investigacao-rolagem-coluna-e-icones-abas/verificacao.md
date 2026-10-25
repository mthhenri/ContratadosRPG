# Verificação — Investigação e ícones das abas

## Entrega e origem dos ícones

Somente na Investigação do mestre, RolagemMestre foi movida para o topo da coluna
de rolagens, acima do histórico. O seletor público/oculto acompanha o rolador.
Um subcontainer relativo reserva ao histórico sua área abaixo do formulário;
abrir o histórico em janela não remove o rolador. Resistência/encontro mantêm
seus usos anteriores. Nenhum componente compartilhado foi ampliado.

As abas da campanha passaram de `alerta`/`agente` para `criatura` (SCP)/`npc`
(peão), mantendo `membros`. Os desenhos são os do catálogo M10-03/M10-04.
Histórico Git conferido: a barra nasceu com os ícones antigos em `9eb92d94`
(05/10), sugeridos pela M4-15; não tinham sido trocados nas alterações anteriores
desta sessão. Não se afirma aprovação individual antiga dessa barra: a adoção
atual atende à solicitação do autor. Botões de criação e demais usos preservados.
Nomes acessíveis acrescentados nas três abas, mesmo com rótulos ocultos no mobile.

## Inspeção pessoal na aplicação real

Agente principal observou Angular/Nest/Postgres reais nos quatro viewports:
**1920×1080, 1366×768, 960×1080 e 360×800**. Cena planejada temporária na campanha
de desenvolvimento, sem trocar cena ativa nem modificar dados anteriores.

Comparação com o painel de Rolagens da campanha do mestre (análogo aprovado):
mesma RolagemRapida, guia, montador, entrada e botão; aparência e densidade do
sistema. No desktop, rolador limitado à coluna (450px em 1920; cerca de 320px
em 1366), sem faixa atravessando o palco. No tablet/mobile a coluna empilha
conforme a casca existente: altura local de 480px, com histórico rolável abaixo
do formulário. Sem sobreposição entre rolador e histórico nem overflow horizontal.

Conferidos seletor público/oculto, registro real de fórmula `4` como PRIVADA,
retorno no feed sem duplicação, histórico destacado por popup real e rolador ainda
disponível. As três abas foram selecionadas nos quatro tamanhos, com nomes acessíveis
encontrados por papel `tab`; glifos canônicos inspecionados pessoalmente no desktop
e mobile. Foco, alvos móveis e seleção continuam nos primitivos existentes.

Capturas/JSON/roteiro em `.artifacts/investigacao-rolagem-coluna-e-icones-abas/`
são evidência **local e ignorada**, ausente do clone. A cena planejada temporária
e rolagens próprias do teste foram excluídas logicamente pelos ids e recortes
confirmados; não há endpoint de exclusão de cena, por isso sua limpeza foi local.

## Gates e revisão

- Teste vermelho reproduziu rolador fora da coluna; composição final:
  **22/22** testes da página, incluindo conservação quando histórico é destacado.
- Suíte frontend: **290 arquivos, 3611 testes aprovados**, mais normalizadores
  executados pelo script do workspace. Nenhuma mudança em shared/backend nesta task.
- `npm run lint --workspace=frontend`: **zero erros**, avisos antigos de convenções;
  nova importação longa reformatada sem mudar comportamento.
- `npm run build --workspace=frontend`: produção aprovada; aviso conhecido de
  budget inicial (603,33kB/450kB). Usado `CI=true` e dois workers, como contorno
  documentado do cache local; fontes obtidas na execução autorizada.
- HTML/SCSS tocados formatados com Prettier; `git diff --check` aprovado.
- Revisão manual de todo o diff desta task contra spec/convenções/impacto:
  somente composição e identificação visual; sem fórmula, DTO, API, permissão,
  alteração de primitivo ou hardcode de cor/fonte/raio. Trabalho anterior preservado.
- `npm run repo:verificar`: organização e espelhos aprovados no fechamento.

Delegação: explorador Codex (modelo padrão) conferiu origem histórica/catálogo e
consumidores das abas, sem editar. O principal implementou e verificou pessoalmente.
Sem commit/deploy. Nenhuma pendência obrigatória deste recorte.
