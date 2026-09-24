# i-027-rolagens-janela-contextos.spec.md

> Ampliação da I-027 concluída em `docs/specs/done/rolagens-janela-externa.spec.md`: o pedido do autor passa a cobrir todos os históricos de rolagem, inclusive os recortes de campanha e espectador.

## Estado para retomada · 2026-09-23

- **Implementado no commit `169ed1e2`:** janela isolada de histórico para ficha de jogador e criatura, campanha de mestre/jogador/espectador e iniciativa dos três papéis; botão só de ícone com tooltip e oculto no mobile; recolhimento da área local ao abrir, preservando rolagem rápida na campanha. O retorno ao fechar e a abertura bloqueada têm testes automatizados.
- **Correção posterior ao commit:** o Inventário do mestre aparecia abaixo das rolagens porque `display: flex` prevalecia sobre `[hidden]`. O painel agora usa `display: none` quando oculto. A alternância Rolagens ⇄ Inventário foi verificada na aplicação real em 1920×1080 e 360×800; as demais superfícies alteradas foram revisadas quanto à mesma combinação de `[hidden]` com `display`, sem outro caso encontrado.
- **Ainda aberto nesta spec:** conferir ao vivo o fechamento da janela real e a restauração do painel nas oito visões. O teste de componente confirma a troca do atributo `hidden`, mas o ambiente de teste não reproduz a cascata de estilos do navegador; por isso a verificação visual continua obrigatória.
- **Próximas fatias, não implementadas por esta spec:** abrir as anotações da ficha em janela e, depois, o Caderno da campanha em janela, cada um com spec própria antes de tocar código. Reaproveitar o padrão de rota isolada/cabeçalho e definir para cada painel como recolher o conteúdo local e restaurá-lo ao fechar, respeitando permissões e sincronização. O mapa de acoplamento de ambos está em `docs/context/IDEAS.md` (I-027); não confundir com a janela de ficha completa, que é outra superfície.

## Objetivo

Permitir que qualquer histórico de rolagens seja aberto em uma janela externa no desktop, sem alterar o recorte de dados ou as permissões já aplicadas a cada visão.

## Entregáveis

1. O gatilho "Abrir em janela" vira um `app-botao-icone` com o ícone `abrir-externo`, `aria-label` e tooltip "Abrir em janela"; ele não é renderizado visualmente no breakpoint mobile.
2. O histórico de ficha continua abrindo sua rota isolada por ficha (jogador ou criatura), e o componente compartilhado passa a receber também o destino de campanha.
3. Uma rota isolada de histórico da campanha busca o feed por `RolagemService`, entra na sala da campanha e atualiza com os eventos de tempo real, exibindo o mesmo recorte que a identidade autenticada pode ver.
4. As visões de campanha mestre, jogador, espectador e as três visões de iniciativa fornecem o destino da campanha a seu histórico. A janela do espectador conserva somente rolagens públicas por usar a consulta existente, sem endpoint ou regra paralela.
5. Testes cobrem os dois destinos, os consumidores da UI e o comportamento de atualização; a aplicação real é verificada em 1920×1080 e 360×800.
6. Nos painéis de rolagem de jogador e mestre, o controle de visibilidade usa o mesmo `app-botao` secundário preenchido; o hover conserva o texto legível sobre o fundo escuro.
7. Ao abrir o histórico em janela externa, a área local correspondente deixa de ocupar espaço: na iniciativa sai a coluna, na campanha de mestre/jogador permanece a rolagem rápida mas sai o histórico, no espectador sai o cartão de histórico, e nas fichas o painel sobreposto desaparece. Ao fechar a janela, a área volta ao estado anterior.

## Critérios de Aceite

1. Em desktop, cada histórico citado possui um único botão de ícone com tooltip correto que abre a rota isolada correspondente.
2. Em 360×800, o controle de abertura não aparece em nenhum histórico.
3. Mestre vê o feed de campanha completo permitido; jogador vê públicas e suas privadas; espectador vê apenas públicas.
4. Uma rolagem pública registrada na campanha atualiza a janela sem recarregar a página.
5. Testes focados, suíte frontend, lint e build passam sem erro novo; o gate visual registra o análogo e os dois viewports.
6. Os botões de visibilidade de jogador e mestre têm a mesma forma, densidade e hover; em ambos os estados o texto mantém contraste no hover.
7. Abertura bloqueada ou falha não oculta o histórico. Fechar a janela externa restaura o histórico local; abrir novamente não cria janelas duplicadas para o mesmo contexto.
8. O retorno funciona nas oito visões do histórico (fichas de jogador e criatura; campanha mestre, jogador e espectador; iniciativa mestre, jogador e espectador), sem deixar coluna vazia.

## Fora de Escopo

- Alterar regras de visibilidade, paginação atual do feed ou a composição dos cartões de rolagem.
- Criar janela externa para o editor de presets ou outros dados da campanha.
- Exibir ou adaptar o controle para mobile.
- Aplicar o mesmo comportamento a anotações, fichas abertas em janela e cadernos; essas serão tarefas futuras.

## Dependências

- `docs/specs/done/rolagens-janela-externa.spec.md`
- `docs/design/DESIGN.md` e `docs/design/tema/`

## Riscos e Mitigação

- A rota externa do espectador não pode consultar recursos que ele já não lê: usar exclusivamente `RolagemService.listarPorCampanha`, cuja service/repository já resolve o papel do membro e filtra o feed.
- Evitar seis implementações de janela: o componente de histórico recebe um destino explícito e a nova página isolada concentra a conexão da campanha.
