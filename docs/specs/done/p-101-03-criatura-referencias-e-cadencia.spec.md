# p-101-03-criatura-referencias-e-cadencia.spec.md

> Task 3/3 da P-101. Execução conjunta autorizada e concluída em 2026-10-06.

## Objetivo

Alinhar referências e provas do Guia novo, distinguindo exemplos alterados de regras
que já estão corretas no produto, incluindo a sobra de turnos da Cadência.

## Entregáveis

1. Rever `a-estatua.spec.ts` e referências consumidas pelo produto: Explosão26,
   Esmagamento3D12+4 e resistência pela DT Força17. Não atualizar snapshots sem conferir
   cada mudança contra fonte, nem trocar ataques livres de fichas existentes.
2. Confirmar o comportamento já existente de `intercalarCadencia`: fila excedente
   drenada ao fim, coberta pelo caso “sem slots abaixo suficientes”. Atualizar referência
   canônica do comentário e conservar algoritmo; só alterar se reprodução concreta
   revelar divergência. Cadência não escala automaticamente com VD.
3. Registrar incoerências autorais: Fraco+6 em VD30 versus fórmula+5; Social base2→zero
   retira dois, embora narrativa diga três. Fórmula geral vence, conforme m4-02.
   Não modificar livro/exemplo autoral nesta task. Documento deve receber proposta
   concreta e revisão do autor antes de qualquer correção editorial desses números.
4. Verificar mudanças de redação em DT de habilidades da biblioteca de NPC: referências
   a Pontaria/Social substituem números livres. Se referências do produto estiverem
   copiadas, alinhar somente o conteúdo confirmado, sem criar parser/automação de texto.

## Critérios de Aceite

- Referências atualizadas batem com a fonte; a fórmula geral preserva Fraco5 em VD30.
- Frenética com um agente mantém `criatura → agente → criatura → criatura → criatura`;
  ninguém reimplementa Cadência que já corresponde ao Guia.
- Testes focados de referência/ordem e gate integrado de P-101; não enfraquecer asserções
  para ocultar divergências do exemplo. Listar pendências autorais no fecho.
- Se alterar conteúdo visível, gate real `verify`/`design-fidelity` nos quatro viewports
  e estados relevantes; se apenas testes/comentários, declarar explicitamente esse recorte.

## Fora de Escopo

- Alterar fontes autorais, fichas antigas ou criar novo algoritmo de
  iniciativa sem defeito confirmado. Dedução automática de efeitos narrativos.

## Dependências

- P-101-02 para a consulta de DT; Guia v4.2.0 > Cadência/A Estátua/Biblioteca de NPC.

## Fecho — 2026-10-06

Fixtures shared/assistente alinhadas com Explosão26, Esmagamento3D12+4 e DT Força17;
referência geral Padrão4D12+10 preservada. Cadência já intercala e drena a sobra ao fim,
com teste existente aprovado; só referências de comentário foram alteradas. Biblioteca
NPC do produto não copia as condições/DTs alteradas no livro, sem mudança funcional.
Propostas editoriais concretas registradas: Fraco+6→+5 nos três atributos e narrativa
de Social “três”→“dois pontos”. Fontes autorais intactas; revisão editorial do autor
permanece separada. [Matriz, gates e propostas](p-101-criaturas-guia-v4.2.0/p-101-verificacao.md).
