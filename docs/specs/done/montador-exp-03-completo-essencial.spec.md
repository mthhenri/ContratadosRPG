# montador-exp-03-completo-essencial.spec.md

> Task 3/4 do guarda-chuva `montador-rolagem-experimento.spec.md` (`IDEAS.md` `I-041`).

## Objetivo

Entregar as versões **Completo** (E3.1) e **Essencial** (E3.3) do montador sobre a casca e o modelo da task 02: um
componente, duas densidades, o mesmo estado e a mesma janela.

## Entregáveis

1. `app-montador-editor-pecas` (`[densidade]` `COMPLETO`/`ESSENCIAL`): editor de **termos** (dano de arma e dados
   livres — ficha por termo com quantidade, tipo, sinal, segundo tipo e opções do dado; atributo, número, campo de
   expressão, repetir ×N e atalhos) e editor de **teste de atributo** (1–2 atributos em soma ou média, dados a
   mais/menos, manter maior/menor, margem de crítico, Proficiência, Nível, bônus e repetição).
2. Completo deixa tudo à vista; Essencial recolhe sinal, segundo tipo e opções em "⋯ Mais" e o resto em painéis de
   "+ Adicionar", um aberto por vez.
3. Campo de expressão (decisões 5 e 10) para quantidade de dados e bônus fixo, com leitura ao vivo do motor.
4. Linha de leitura sob o visor: faixa e média (do motor) e a frase em português.
5. Primitivo novo `app-ficha-termo` (ficha removível, autorizada pelo autor); o que os controles não montam fica
   "avançada" (`podeMontarPecasOuTeste`).

## Critérios de Aceite

- Corpus inteiro em teste de função pura: nenhuma fórmula diverge ao ser remontada pelos controles; as dez dos
  jogadores montam (as duas densidades usam o mesmo modelo).
- Gate visual completo (`design-fidelity`, `verify`): análogo `MontadorRolagem` + E3.1/E3.3; `1920×1080` e `360×800`;
  estados vazio, preenchido, avançada, inválida, resultado e cada painel de "+ Adicionar".

## Fora de Escopo

Versão Blocos (task 04); mudanças no `MontadorRolagem`; backend.

## Dependências

`montador-exp-02-nucleo-seletor-gate.spec.md`.
