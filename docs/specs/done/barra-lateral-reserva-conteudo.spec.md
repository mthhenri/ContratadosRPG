# Barra lateral com reserva de conteúdo

> Task avulsa solicitada pelo autor: manter o histórico de rolagens e o inventário de esquadrão abertos sem encobrir a área de trabalho.

## Objetivo

Fazer com que as barras laterais de histórico de rolagens e de inventário de esquadrão reservem espaço à direita em telas não móveis, em vez de sobrepor a página. A alteração deve funcionar nas visões de campanha e fichas, preservando a experiência full-bleed existente no mobile.

## Entregáveis

1. As duas barras laterais expõem seu estado aberto aos seus consumidores e usam, acima do breakpoint mobile, uma largura responsiva de até 500px; a página consumidora desloca o conteúdo na mesma medida, sem fundo escurecido, sem modalidade e sem bloquear as ações restantes.
2. Campanha, ficha de jogador, ficha de criatura e painel de encontro adotam a reserva de espaço para o histórico; a campanha do mestre também a adota para o inventário de esquadrão. Abrir uma barra fecha a outra quando ambas forem possíveis na mesma tela.
3. No mobile (`360×800`), as barras continuam full-bleed, com fundo, foco e `Escape`, pois não há área útil suficiente para uma divisão lateral.
4. A validação visual passa a incluir o viewport intermediário de tela dividida `960×1080`, além de `1920×1080` e `360×800`; a documentação operacional de verificação registra o novo cenário.
5. Testes dos dois componentes laterais cobrem a emissão do estado aberto/fechado; documentação de contexto registra a decisão e a evidência de validação.

## Critérios de Aceite

- Em `1920×1080` e `960×1080`, abrir histórico ou inventário não deixa conteúdo interativo sob a barra, não exibe backdrop e permite interagir com a página reduzida; a área reservada é coerente com a largura real do painel.
- Em `360×800`, as barras preservam o painel full-bleed, foco inicial, fechamento por `Escape` e pelo fundo, sem overflow horizontal.
- Em campanha como mestre, abrir inventário fecha o histórico aberto e vice-versa; em campanha como jogador só o histórico fica disponível.
- Testes focados e as suítes/lint/build de frontend passam; a inspeção manual observa os três viewports e os estados fechado, histórico aberto e inventário aberto quando aplicável.

## Fora de Escopo

- Alterar o conteúdo, a paginação, as permissões ou o tempo real de rolagens e inventário.
- Alterar a largura do breakpoint mobile global ou redesenhar os cartões internos dos painéis.
- Transformar outros utilitários flutuantes (calculadora, caderno ou leitor) em barras que reservam espaço.

## Dependências

`docs/design/DESIGN.md`, `docs/design/tema/_breakpoints.scss`, `docs/specs/done/ui-17-painel-flutuante.spec.md` e os componentes vivos de campanha/ficha.

## Riscos e Mitigação

O painel ainda deve atuar como diálogo modal no mobile, mas não no desktop intermediário. A separação explícita por `bp.mobile` evita que a nova reserva estreite uma tela de 360px ou remova seu mecanismo de fechamento acessível.
