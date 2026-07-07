# m2-09-revisao-estilizacao-geral.spec.md

> Task 9/9 do milestone `m2-auth-campanhas.spec.md`.

## Objetivo

Revisar a estilização das telas de autenticação e campanhas do M2 (`shared/layout` topbar,
`login`/`registro`, `campanhas` listar/detalhe) contra os novos protótipos entregues em
`docs/design/examples/` (`login.html`, `cadastro.html`, `campanhas.html`,
`lobby-de-campanha.html`, `topbar.html`) — mesmos tokens de sempre, linguagem visual mais
elaborada (painel split marca+formulário, seletor de campanha ativa, mais ícones de linha em
vez de texto solto). Sem tocar em regra de jogo nem em regra de negócio — só apresentação.

## Decisões (resolvidas com o autor do design)

- **Topbar — direção 1a "Barra de Comando"**: uma linha, marca à esquerda, nav central
  (Painel/Calculadora), seletor de campanha ativa e conta à direita. É a direção que os próprios
  protótipos de `campanhas`/`lobby-de-campanha` já assumem.
- **Mais ícones de linha** (`app-icone`, já existente em `shared/icone/`) onde hoje só há texto e
  os itens tendem a se misturar: itens de nav, itens do dropdown de perfil, botões de ação,
  chips de papel (mestre/jogador), link de voltar. Reusar ícones já existentes (`agente` para
  perfil, `protecoes` para jogador) antes de desenhar um novo glifo.
- **Conteúdo decorativo sem dado real no modelo atual não entra**: os protótipos mostram chips
  de status de sessão (ao vivo/agendada/pausada), briefing (ameaça/fase/recompensa), registro de
  atividade da mesa e indicador online por membro — nenhum desses campos existe no schema de
  `campanha`/`campanha_membro`. Aplicar só a linguagem visual (cards, cabeçalhos, espaçamento,
  ícones) onde já há dado real (nome/descrição/papel/membros/código de convite); esses elementos
  ficam de fora até virarem domínio em specs futuras.
- **Arquitetura de informação atual se mantém**: `/painel/criar` e `/painel/entrar` continuam
  páginas dedicadas (o protótipo embute "entrar por código" na lateral da lista, mas mudar isso
  é decisão de IA, não de estilo — fora de escopo aqui).

## Entregáveis

1. **`shared/icone`**: novos nomes de ícone (`campanhas`, `calculadora`, `sair`, `entrar`,
   `chevron`, `copiar`, `mais`, `convite`, `coroa`, `atualizar`, `voltar`), mesmo estilo de traço
   (`stroke-width` 1.75, viewBox 24, `currentColor`) já estabelecido. Reusar `agente`/`protecoes`
   onde já servem.
2. **Topbar (`shared/layout`)**: nav central Painel/Calculadora (ícone + `routerLinkActive`,
   mesmo padrão do `CalculadoraShell`); seletor de campanha ativa (chip com nome + código),
   visível só dentro de uma campanha (`/painel/:id`) — alimentado por um novo
   `CampanhaContextoService` (`providedIn: 'root'`, signal só de apresentação, sem regra de
   negócio) que a página de detalhe preenche ao montar e limpa ao desmontar; dropdown de perfil
   (ícones em "Campanhas"/"Encerrar sessão"); deslogado mantém Entrar/Registrar, agora com ícone.
3. **`login`/`registro`**: layout split (painel de marca à esquerda com detalhes de canto,
   formulário à direita), mesmos campos/validators de hoje — sem o bloco decorativo de "entrar
   com código" pré-autenticação do protótipo (não existe fluxo de acesso sem conta no domínio).
   Botão de submit com ícone.
4. **`campanhas` lista**: ícones nos botões "Criar campanha"/"Entrar por código"; `chip-papel`
   com ícone (coroa para `MESTRE`, `protecoes` para `JOGADOR`); estado vazio com ícone.
5. **`campanha` detalhe**: botão de copiar o código de convite (clipboard, puramente
   apresentação); ícone de atualizar no botão "Regenerar"; `chip-papel` dos membros com ícone;
   link "Voltar às campanhas" com seta.
6. Nenhuma mudança de regra de negócio, permissão ou de jogo — o `CampanhaContextoService` é
   estado de apresentação (nome/código para exibir), a autoridade de permissão continua 100% no
   backend (§14).

## Critérios de Aceite

- Topbar, login/registro e as telas de campanha (listar/detalhe) alinhadas aos protótipos em
  `docs/design/examples/`, com ícones substituindo texto solto nos pontos listados acima.
- Nenhum hex/fonte/raio hardcoded fora dos tokens (proibição #29); ícones via `app-icone`
  (`stroke: currentColor`), nunca emoji.
- `lint`/`test`/`build` do frontend verdes; identidade "Terminal de Contenção" preservada.

## Fora de Escopo

- Chips de status de sessão, briefing, log de atividade, indicador online — sem dado real hoje.
- Mudança de arquitetura de rotas (`/painel/criar`/`/painel/entrar` continuam páginas dedicadas).
- Alteração de regra de jogo (`shared/regras` intocado) ou de permissão (§14 continua só backend).
- Refino de responsividade mobile (já coberto por `m2-08`).

## Dependências

- `m2-08` (recomendado concluir o refino mobile antes, para não haver retrabalho de estilo).
