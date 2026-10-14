# montador-rolagem-cobertura-telas.spec.md

> Spec avulsa. Pedido do autor em 2026-10-14: o montador de rolagem "deveria funcionar em todos os
> lugares" — visão do jogador, visão do mestre, fichas parciais etc.

## Objetivo

Todo lugar onde se digita uma fórmula de rolagem livre oferece o montador, e ele funciona (abre,
monta, rola, registra no histórico) igual em todas as telas — respeitando o gate do experimento.

## Situação atual (levantada em 2026-10-14)

- O montador vive no `RolagemRapida` (`modules/ficha/componentes/rolagem-rapida/`), que escolhe entre
  `MontadorRolagem` (Atual) e `MontadorRolagemExperimental` (Essencial/Completo/Blocos) e aplica o gate
  único `podeUsarMontador` (TESTER/ADMIN) — experimento guarda-chuva em
  `docs/specs/active/montador-rolagem-experimento.spec.md`, à espera da avaliação do autor.
- Consumidores do `RolagemRapida`: `ficha-rolagens` (usado em `ficha-visualizacao`, `ficha-campanha-card`,
  `ficha-rolagens-painel`, `detalhe-jogador`), `criatura-visualizacao` e `detalhe-mestre` (rolagem do
  mestre na campanha).
- Superfícies **sem** montador encontradas: `rolagem-avulso` do encontro (painel do mestre — campo de
  expressão próprio com `app-guia-formula`); a ficha de NPC não tem Rolagem rápida.
- O defeito exato "não funciona" em cada tela não foi reproduzido nesta triagem (sem rodar o app);
  `ficha-campanha-card` tem modos compactos (`mostrarRolagensCompacto`, `mostrarTopo`) que podem esconder ou
  quebrar o gatilho/painel — suspeita principal para as "fichas parciais".

## Entregáveis

1. **Auditoria ao vivo** (anexo `auditoria.md`): para cada tela — ficha completa (jogador, criatura, NPC),
   card da ficha no Esquadrão (jogador e mestre), ficha flutuante, Investigação do jogador
   (`painel-sem-iniciativa-jogador`), Iniciativa do jogador e do mestre, rolagem do mestre na campanha,
   rolagem avulsa do encontro, janela externa — registrar se há campo de fórmula, se o montador aparece,
   e se abrir/montar/rolar/registrar funciona nas quatro versões, como TESTER e como jogador comum.
2. Corrigir as falhas de **funcionamento** encontradas onde o `RolagemRapida` já está (posicionamento do
   painel flutuante, gatilho escondido em modo compacto, rolar sem ficha/combatente etc.), com causa raiz
   registrada.
3. Levar ao autor, com a auditoria em mãos, antes de implementar: (a) se `rolagem-avulso` do encontro passa
   a usar o `RolagemRapida`/montador; (b) se a ficha de NPC ganha Rolagem rápida; (c) se o gate de tester
   continua — liberar para todos é o fechamento do experimento, que tem spec própria do autor.
4. Testes de componente para cada correção e para o gate continuar centralizado (nenhum consumidor novo
   reintroduz restrição local).

## Critérios de Aceite

- Auditoria com todas as telas acima e o resultado de cada uma; nenhuma tela com montador quebrado ao fim.
- Testes do frontend dos arquivos tocados verdes; `npm run test --workspace=shared` sem regressão (o motor
  de rolagem não muda); lint e build.
- Gate visual (`design-fidelity` + `verify`) em `1920×1080` e `360×800` em cada tela corrigida, análogo: a
  Rolagem rápida da ficha completa; rolagem aparece na bandeja e no histórico do outro usuário.
  `npm run repo:verificar`.

## Fora de Escopo

Escolher o montador final, mudar a gramática de fórmulas, mudar o comportamento interno das versões.

## Dependências

`montador-rolagem-experimento.spec.md` (`active/`); `ui-35`/`ui-36` (`done/`).
