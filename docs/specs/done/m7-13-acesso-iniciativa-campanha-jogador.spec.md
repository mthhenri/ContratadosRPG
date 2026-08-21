# m7-13-acesso-iniciativa-campanha-jogador.spec.md

> Ajuste pós-milestone do M7 — Encontro de Combate.

## Objetivo

Reposicionar, na tela de campanha do jogador, o acesso à Iniciativa para que ele seja encontrado no
momento de sessão sem competir com as ações principais da ficha e da campanha.

## Entregáveis

1. Mover o gatilho existente de Iniciativa para o agrupamento visual mais adequado da visão de
   jogador da campanha, mantendo rota, guarda e condições de exibição já existentes.
2. O acesso conserva rótulo, ícone, estado indisponível e tooltip canônicos; não criar caminho
   alternativo para a mesma rota.
3. Registrar como análogo a navegação/ações de sessão da própria `CampanhaDetalhe`, preservando a
   hierarquia de ações em desktop e mobile.

## Critérios de Aceite

- Jogador encontra e acessa a Iniciativa a partir da campanha, em desktop e mobile.
- O botão não se sobrepõe a controles da ficha, não gera overflow e mantém foco e alvo de toque.
- A rota continua protegida e a ausência de encontro ativo mantém o comportamento atual.
- Verificação pela skill `verify` em `1920×1080` e `360×800`; `npm run test -w frontend` verde e
  `npm run lint -w frontend` limpo.

## Fora de Escopo

- Mudar quando um encontro é criado, iniciado ou encerrado.

## Dependências

- `m7-06` (rota e acesso da visão do jogador).
