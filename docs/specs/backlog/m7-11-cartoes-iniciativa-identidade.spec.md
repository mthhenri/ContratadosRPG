# m7-11-cartoes-iniciativa-identidade.spec.md

> Ajuste pós-milestone do M7 — Encontro de Combate.

## Objetivo

Refinar a identidade visual dos cartões de combatente: mostrar a foto disponível e eliminar o card
redundante **"Sua Iniciativa"** da visão do jogador.

## Entregáveis

1. `CartaoCombatente` exibe a imagem da ficha quando ela existir, respeitando o enquadramento e o
   fallback visual já adotados pelos cards de ficha/campanha. Combatente avulso ou sem imagem não
   recebe imagem quebrada nem espaço vazio sem propósito.
2. A imagem respeita a política de revelação: a visão do jogador usa apenas a imagem que já pode ser
   exposta pelo `EncontroRecuperadoDto` recortado; não consulta ficha adicional para preenchê-la.
3. Remover o card exclusivamente informativo **"Sua Iniciativa"** da visão de jogador. O valor da
   própria iniciativa permanece compreensível no cartão correspondente, sem duplicar a informação.
4. Usar como análogos os cards de ficha/campanha que já exibem imagem e o cartão atual de
   combatente quanto a densidade, estados e hierarquia.

## Critérios de Aceite

- Ficha com imagem, ficha sem imagem e avulso têm apresentação íntegra em ambos os papéis.
- Jogador não vê o card "Sua Iniciativa" e ainda identifica seu valor no próprio combatente.
- Nenhuma imagem de ficha não revelada é exposta ao jogador.
- Verificação pela skill `verify` em `1920×1080` e `360×800`, incluindo montagem e combate ativo;
  `npm run test -w frontend` verde e `npm run lint -w frontend` limpo.

## Fora de Escopo

- Upload, edição, recorte ou migração de imagens de ficha.

## Dependências

- `m7-06` (recorte de revelação na visão do jogador).
