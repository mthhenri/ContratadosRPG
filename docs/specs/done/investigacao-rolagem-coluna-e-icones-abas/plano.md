# Plano e impacto

1. Teste vermelho de posição da RolagemMestre na Investigação, preservação ao
   destacar histórico e composição anterior da Resistência.
2. Reposicionar somente na Investigação; subcontainer relativo do histórico
   preserva seu painel absoluto e deixa o rolador compacto no topo da coluna.
3. Trocar apenas os dois nomes de ícone nas abas; manter seus rótulos acessíveis.
4. Testes/integracão, formato, lint/build, observação real e revisão do diff;
   relato/contexto/histórico e gate do repositório.

## Impacto e fonte da decisão

`npm run impacto` de `RolagemMestre`: Investigação/Resistência na casca sem
iniciativa e encontro com iniciativa. Não alterar o componente nem seus demais usos;
reposicionar apenas o ramo Investigação. Resistência e encontro preservados.
Casca sem iniciativa: somente `PainelCenaShell`; condicional pelo tipo evita
alterar a Resistência. Histórico mantém API e comportamento atuais.

`CampanhaFichasAbas`: importador `detalhe-mestre.page.ts`, duas instâncias
(esqueleto e conteúdo real). Mudança nas duas abas do conteúdo, sem alterar
botões de criação nem catálogo. Ícones antigos vêm da sugestão histórica M4-15
(05/10); identidades posteriores M10-03/04 são peão (`npc`) e SCP (`criatura`).
Não há registro de escolha individual da barra pelo autor; a adoção atual decorre
da solicitação de conferir/alinhá-la ao sistema, não de uma suposta aprovação antiga.

Análogo visual da coluna: Rolagens da campanha do mestre, já com rolador
compacto e alternância público/oculto. Catálogo canônico para as abas.
