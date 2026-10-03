# montador-exp-04-blocos.spec.md

> Task 4/4 do guarda-chuva `montador-rolagem-experimento.spec.md` (`IDEAS.md` `I-041`).

## Objetivo

Entregar a versão **Blocos** (E3.2) do montador sobre o mesmo modelo: formulário por blocos de dano, sem bandeja de
termos, com sinal por termo.

## Entregáveis

1. Modelo puro `montador-blocos.ts`: `lerBlocos`/`escreverBlocos` — bloco com tipo e segundo tipo, uma contagem com
   sinal por dado (negativa subtrai), atributos com sinal, bônus fixo e opções do bloco (dados livres); atalhos no
   **início** do texto; até 2 blocos no dano de arma e 3 nos dados livres. Só aceita a fórmula se o texto escrito
   pelos blocos valer o mesmo no motor (`formulasEquivalentes`); senão ela é "avançada".
2. `app-montador-editor-blocos`: blocos em `app-ficha-termo`, "+ Adicionar bloco de dano" (o bloco novo fica só na
   tela até ganhar conteúdo), seção fixa com Repetir e atalhos (`app-cartao-receita` como alternância); o teste de
   atributo reusa o editor de teste do Completo (tudo à vista, como na E3.2).

## Critérios de Aceite

- Corpus em teste de função pura: as dez fórmulas dos jogadores montam; nenhuma fórmula em blocos muda de faixa ou
  média ao ser reescrita; fórmulas com termo subtraindo passam a montar.
- Gate visual completo: análogo E3.2 + editor Completo; `1920×1080` e `360×800`; estados vazio, preenchido, dois
  blocos, atalho, dados livres com opções, teste, avançada, inválida e resultado.

## Fora de Escopo

Campo de expressão nos blocos (conta de bônus e conta na quantidade de dados ficam "avançada" no Blocos; o teste por
conta segue no editor de teste); mudanças no `MontadorRolagem`; backend.

## Dependências

`montador-exp-02-nucleo-seletor-gate.spec.md`.
