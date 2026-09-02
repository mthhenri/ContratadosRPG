# Painel lateral abaixo da topbar e contexto do histórico

> Task avulsa de refinamento da barra lateral concluída em `barra-lateral-reserva-conteudo.spec.md`.

## Objetivo

Manter o histórico de rolagens e o inventário de esquadrão inteiramente abaixo da topbar, para que apenas o conteúdo da rota seja reduzido pelo painel lateral. Tornar inequívoco se o histórico exibido pertence à campanha ou à ficha.

## Entregáveis

1. A topbar expõe uma altura semântica compartilhada; painéis laterais e seus backdrops começam abaixo dela em desktop, tela dividida e mobile, sem pintar ou interceptar a barra de navegação.
2. Os títulos, dicas e rótulos acessíveis do histórico usam o contexto recebido. Campanha e painel de iniciativa exibem “Histórico de Rolagens da Campanha”; ficha de jogador e de criatura exibem “Histórico de Rolagens da Ficha”.
3. O componente do histórico tem teste cobrindo o título contextual no painel e no gatilho; a documentação de contexto registra o ajuste.

## Critérios de Aceite

- Em `1920×1080`, `960×1080` e `360×800`, a topbar continua visível e acionável com cada painel aberto; o painel e o backdrop começam exatamente abaixo dela e o conteúdo continua com a largura reservada no desktop/tela dividida.
- As quatro entradas de histórico exibem o contexto correto no título visível, tooltip e nome acessível do painel/gatilho.
- Testes focados do histórico e do inventário, lint, build e suíte de frontend são executados; o gate visual observa os três viewports.

## Fora de Escopo

- Alterar a altura visual, o conteúdo ou a navegação da topbar.
- Alterar regras, permissões, paginação ou conteúdo de rolagens e inventário.
- Redesenhar os cartões internos dos painéis.

## Dependências

`docs/design/DESIGN.md`, `docs/design/tema/_tokens.scss`, `docs/specs/done/barra-lateral-reserva-conteudo.spec.md` e o componente vivo `shared/layout`.

## Riscos e Mitigação

Um painel com z-index superior ainda poderia deixar sua sombra ou fundo passar sobre a topbar. A topbar entra em contexto de empilhamento próprio acima dos painéis e a mesma variável de altura é consumida pelos dois componentes laterais.
