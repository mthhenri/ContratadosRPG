# criatura-ataques-habilidades-leitura.spec.md

> Task avulsa, recorte da Fase 1 de `ficha-criatura-npc-revamp-visual.spec.md` (backlog). Origem: pedido do
> autor (2026-11-26): "ataques e habilidades tá inusável — habilidades têm descrições grandes, habilidades com
> fases, difícil". O autor escolheu mexer em Habilidades **e** Ataques juntos, com foco em usabilidade.
> Só visual: nenhum DTO, regra, persistência ou backend muda.

## Diagnóstico na tela (2026-11-26)

Observado em `1920×1080` e `360×800` com uma criatura de estresse (5 ataques, 6 habilidades, uma com três
fases e uma com restrição). Capturas em `.artifacts/ficha-criatura-npc-revamp-visual/`.

1. Descrição de habilidade cortada em 5 linhas; o resto só num tooltip de olho (no toque, inacessível de fato).
   A habilidade com fases para no meio da Fase 1.
2. Fórmulas de Teste/Dano/Crítico dos ataques só em tooltip.
3. Destaque invertido: "Crítico" é o botão mais forte; "Teste", o primeiro a rolar, o mais apagado.
4. Ordem alfabética: tipos de habilidade e custos de ataque misturados.
5. Restrição (condição de uso) no rodapé, pequena, depois da descrição.
6. Três colunas estreitas: texto longo vira tripa.

## Entregáveis

1. **Habilidades** agrupadas por tipo, na ordem Ativas · Gatilhos · Passivas (alfabética dentro do grupo),
   com título de grupo e contagem. Cartão: nome + selo de tipo (o atual); descrição com "Ver mais / Ver menos"
   no próprio cartão quando passa do teto (nada de tooltip como único caminho); a restrição sai do itálico miúdo
   para um bloco **"Restrição"** em destaque logo após a descrição. Grade de no máximo duas colunas largas.
   *Ajuste na verificação com as criaturas reais do autor:* o primeiro corte rotulava a restrição como
   "Quando" e a punha acima da descrição; nas fichas reais ela é um limite ("suprimida por chumbo"), às vezes
   um parágrafo inteiro, então voltou o rótulo "Restrição", depois da descrição.
2. **Ataques** ordenados por custo de ação (Livre → Movimento → Padrão → Completa → Turno) e nome. Cartão: três
   botões com rótulo **e fórmula visível**; efeito abaixo. Mesma grade de até duas colunas. Selos de custo
   e as cores dos botões ficam como estão (escala `--selo-*` pedida pelo autor em 2026-09-18; hierarquia
   Teste/Dano/Crítico igual à da ficha de Agente).
3. `app-habilidade-descricao` ganha o modo `expansivel` (opcional, padrão desligado): a ficha de Agente, outro
   consumidor, não muda.
4. Testes migrados/novos: agrupamento, ordem, bloco "Restrição", fórmulas no DOM, expandir/recolher.

## Análogo

- Shell, densidade e cartão: as próprias listas atuais da criatura (mesmo cabeçalho `//`, edição, formulário)
  e `ficha-habilidades` da ficha de Agente.
- "Ver mais / Ver menos": `ficha-habilidade-seletor` (botão de texto que remove o clamp no próprio cartão).
- Selos de custo/tipo: os atuais da criatura (escala `--selo-*`); botão "Ver mais": `app-botao` com variante/estilo/tamanho.

## Critérios de Aceite

- Sem abrir tooltip: ler a fórmula de teste e dano de qualquer ataque, a condição de uso e a descrição inteira
  de qualquer habilidade (em até um toque), nos dois viewports.
- Grupos e ordem como acima; edição, adição, remoção e rolagens continuam funcionando.
- Ficha de Agente sem mudança visual.
- Gate visual (`verify` + `design-fidelity`) em `1920×1080` e `360×800`, sem overflow; testes do frontend,
  lint e `repo:verificar`.

## Fora de Escopo

- Campos estruturados de habilidade (custo, alcance, fases): Fase 2 da spec de redesenho. Fases continuam
  sendo Markdown na descrição.
- Aba Geral, coluna de Identidade/Atributos, NPC, recálculo de Defesa/Vida por VD
  (`criatura-npc-vd-habilidades-ataques`).

## Fecho

[Verificação](criatura-ataques-habilidades-leitura/verificacao.md).
