# m3-64 — Guia: habilidades iniciais, progressão avulsa e resumo de identidade

> Implementa o design aprovado em
> `docs/superpowers/specs/2026-08-07-guia-habilidades-progressao-e-resumo-identidade-design.md`.

## Objetivo

Fechar quatro lacunas do guia e da ficha: pacote inicial obrigatório de habilidades, Nível e Prestígio
exatos fora de campanha, apresentação conjunta de classe-base e subclasse e estado legível de Origem
substituída por Peculiaridade.

## Entregáveis

1. O resumo da ficha mostra somente **Substituída pela Peculiaridade** quando aplicável, sem concorrer
   com “Não definida” e sem quebrar a grade.
2. Subclasses são apresentadas com a classe-base. Exemplo obrigatório: **Especialista** +
   **Experimento Artificial**.
3. Agentes convencionais escolhem, na criação, exatamente um pacote: **4 Gerais**; **2 Gerais + 1 de
   Classe/Arquétipo**; ou **2 de Classe/Arquétipo**.
4. Civil escolhe **3 habilidades civis** na criação e não recebe os pacotes convencionais.
5. Experimento recebe o pacote inicial, a vaga adicional de Classe/Arquétipo e as vagas de progressão.
6. Ficha avulsa aceita **Nível inicial exato** e **Prestígio inicial exato**. Em campanha, as médias
   continuam sendo o padrão, com sobrescrita manual dos valores finais.
7. A regra dos pacotes nasce pura em `shared/regras/agente`; `calcularProgressaoAcumulada` não incorpora
   silenciosamente o pacote de criação.

## Critérios de aceite

- O passo Habilidades existe no Nível 0 e bloqueia avanço até o pacote inicial estar completo.
- A mesma habilidade não pode ocupar duas vagas entre criação, Experimento e progressão.
- Trocar classe, pacote, Nível ou modo não deixa escolhas incompatíveis invisíveis no payload.
- Peculiaridade continua substituindo Origem e a ficha criada envia `origem: null`.
- Nível/Prestígio avulsos alimentam derivados, vagas, resumo, Revisão e payload final.
- O fluxo é inspecionado na aplicação real em `1920×1080` e `360×800`, incluindo os estados descritos
  no design aprovado.

## Fora de escopo

- Alterar fórmulas de progressão ou os três pacotes do documento do sistema.
- Alterar a mecânica de Peculiaridade.
- Recalcular fichas existentes ou conceder habilidades retroativamente.
- Redesenhar áreas sem relação com Classe/Subclasse, Origem ou o guia de criação.
