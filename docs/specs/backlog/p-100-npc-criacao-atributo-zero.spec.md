# p-100-npc-criacao-atributo-zero.spec.md

> Task avulsa de PROBLEMS P-100. **2026-10-06: somente spec, sem execução.**

## Objetivo

Permitir ao mestre retirar o ponto inicial de um atributo do NPC para deixá-lo em zero
e redistribuí-lo na criação, conforme o Guia v4.2.0, preservando tetos e orçamento.

## Entregáveis

1. Adequar `shared/src/regras/npc/criacao.ts`: hoje `consultarAtributosCriacao` rejeita
   valor abaixo de 1 fora dos atributos bloqueados do Civil. Aceitar zero, contabilizando
   a devolução do ponto inicial no saldo; não permitir negativos nem ultrapassar o teto.
   Civil mantém Luta/Pontaria iniciados em zero; não conceder um ponto devolvido por
   um atributo cuja base já é zero. Exceção de treinamento continua decisão do mestre.
2. Adequar formulário e controles do assistente (`paginas/criar-npc/`), incluindo
   mínimo do stepper, saldo, mudança de Categoria, resumo e confirmação. Consumir
   exclusivamente a regra compartilhada; preservar a edição de ficha pronta.
3. Registrar testes e evidências antes de remover P-100 e mover a spec para `done/`.

## Critérios de Aceite

- Operativo: Luta 3, Pontaria 3, Força 3, Destreza 2, Social 0, demais 1:
  distribuição **6**, restantes **0**, sem violação. Hoje a regra acusa “social: inicia em 1”.
- Zero libera exatamente o ponto retirado; negativos, excesso e teto continuam inválidos.
  Civil bloqueado não gera saldo fictício; liberação independente dos dois atributos preservada.
- Criação persiste e reabre o NPC com zero; regra única e recursos derivados consistentes.
- Testes focados de distribuição/assistente; builds, suítes e lint dos workspaces afetados
  no fecho. Análogo aprovado: assistente atual de NPC (`m4-13`) e seus steppers `shared/ui`.
- Skills `verify`/`design-fidelity` no app real nos quatro viewports `1920×1080`, `360×800`,
  `960×1080`, `1366×768`: reduzir a zero, redistribuir, teto/saldo inválido, Civil com e
  sem liberação, confirmação e ficha pronta; comparação pessoal com análogo e soft delete.

## Fora de Escopo

- Executar agora; criar Competências/dadinho (m4-19), mudar tabelas/tetos/recursos,
  interpretar texto de habilidade ou reescrever fichas existentes.

## Dependências

- Guia v4.2.0 > NPC > Atributos (`:958`); `docs/design/` e convenções do projeto.
- Integração com m4-19 deve impedir atributo zero como Competência; sem duplicar a validação.
