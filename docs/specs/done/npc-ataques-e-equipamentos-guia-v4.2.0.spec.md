# npc-ataques-e-equipamentos-guia-v4.2.0.spec.md

> Spec investigativa decorrente da nova seção Ataques e Equipamentos do Guia v4.2.0.
> **Proposta para revisão; sem implementação ou commit agora.** Não integra m4-19.
> **2026-10-06: investigação concluída.** [Matriz e proposta completas](npc-ataques-e-equipamentos-guia-v4.2.0/npc-ataques-equipamentos-investigacao.md),
> incluindo a ambiguidade da Patente Equivalente (cada Categoria mapeia pra uma faixa de
> 2–3 patentes, não uma só) e as decisões que faltam do autor antes de gerar tasks executáveis.

## Objetivo

Delimitar como NPC utiliza as regras de ataques/equipamentos dos agentes no produto,
sem transformar a ficha de NPC numa ficha de Jogador ou inventar progressão de classe.

## Entregáveis

1. Matriz da seção `:1033–1037` e código: contrato NPC atual não possui inventário/ataques.
   Mapear partes reutilizáveis dos contratos/motor comuns (equipamento, dano, munição,
   proteções, escudos e modificações), e quais hoje dependem de classe/origem/patente
   do agente. Não copiar restrições de Civil jogador para a Categoria Civil NPC sem fonte.
2. Delimitar acesso por Patente Equivalente da Categoria, sem equipar automaticamente
   no máximo. Luta/Pontaria padrão; Competência participa quando escolhida nesse
   atributo. Dano Furtivo não é automático: só habilidade específica pode concedê-lo.
3. Propor fluxo de duas operações: teste e, após confirmação do mestre, dano; idem
   teste de Medicina e cura quando aplicável. Não inferir a segunda pela fórmula.
   Contexto deve vir da ação escolhida ou indicação explícita do mestre.
4. Apresentar contrato JSONB e reutilização de UI por análogo aprovado, compatibilidade
   de NPC antigo, permissões/privacidade e tarefas numeradas futuras. Dependências de
   shared, backend e UI explícitas. Se faltar primitivo, apresentar opções ao autor.

## Critérios de Aceite

- Matriz separa comportamento já disponível, lacuna e proposta de produto.
- Decisões de formato dos ataques/equipamento e crítico submetidas à revisão; nenhuma
  interface nova, DTO ou migração implementada por esta spec investigativa.
- Reutilização não traz automaticamente classe/Maestria/Formação/lesão do agente ao NPC.
- Teste e dano/cura posteriores separados, sem parser de texto de habilidade ou
  disparo automático por resultado crítico. Privacidade decidida pelo autor preservada.
- Entrega é documental: links, fonte, escopo e futuras tarefas; gates de código/UI
  serão definidos nas specs executáveis depois da revisão.

## Fora de Escopo

- Implementar agora, expandir m4-19, criar classe/progressão de NPC, equipamento automático,
  inferir dano/cura ou alterar fontes do jogo.

## Dependências

- Guia v4.2.0 > NPC > Ataques/Equipamentos; m4-19 para Competências/teste de atributo;
  SCHEMA, convenções e docs/design.
