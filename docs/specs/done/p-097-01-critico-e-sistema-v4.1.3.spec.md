# p-097-01-critico-e-sistema-v4.1.3.spec.md

> Implementação da revisão P-097; autorizada pelo pedido de consumir e corrigir
> segundo o Sistema publicado em 2026-10-06.

## Objetivo

Aplicar o crítico de teste do novo Sistema no motor compartilhado e entregar o
PDF atualizado no leitor do produto, preservando a rolagem crítica de dano/cura.

## Entregáveis

1. Centralizar o reconhecimento da notação existente de teste (um pool positivo
   d20 `kh1`/`kl1`, sem explosão/implosão ou parcelas de dano tipado) no motor.
   Usar margem 1 quando não houver margem explícita; somar +2 uma única vez
   quando o mantido atingir a margem. Registrar a contribuição `CRÍTICO` no
   detalhamento existente. Nenhum bônus para críticos descartados.
2. O comando de crítico em teste concede +2 sem dobrar pool, PROF, bônus ou
   atributos. Em resultado genérico, continua dobrando dados/fixos/atributos,
   preservando a exceção PROF/NIV existente. `cm` em pools genéricos permanece
   informativo. Repetições calculam o bônus independentemente por resultado.
3. Atualizar o leitor, assets e ponteiros canônicos para `sistema-v4.1.3.md/pdf`;
   o PDF servido deve ser idêntico ao publicado em `docs/core/`. Documentos
   históricos em `done/` e `HISTORY.md` conservam suas referências datadas.
4. Testes determinísticos cobrindo margem natural/ampliada, descarte,
   desvantagem, ataque/preset, repetições, dano tipado/genérico e cura crítica.
   Atualizar ajuda de fórmula somente para explicar a nova regra no padrão atual.

## Critérios de Aceite

- `[20,20,9] + PROF 9` → 31; `[19,9,8]` com cm2 +9 → 30;
  mínimo de `[20,3]` +9 → 12; nenhum dano genérico ganha +2 por possuir `cm`.
- Bandagem crítica `2d4` → `4d4`, sem bônus de teste; PROF/NIV não dobram.
- Testes focados, suítes dos três workspaces, builds e lint executados; falhas
  preexistentes são discriminadas e não corrigidas fora desta spec.
- Skill `verify`: observar o detalhamento do crítico e o leitor atualizado no
  app real em 1920×1080 e 360×800. Análogos: componentes atuais
  `shared/resultado-rolagem` e `shared/leitor-documentos`; manter seus controles,
  shell, densidade, ícones e estados, sem criar controles ou estilos novos.
- Relatório de revisão e contexto registram a regra nova, evidências e pendências.

## Fora de Escopo

- Implementar m4-19, alterar fórmulas de NPC ou reescrever o Guia de Mestre.
- Corrigir P-095/P-096, migrar resultados históricos ou editar a regra publicada.
- Automatizar efeitos de habilidades ainda tratadas como texto livre pelo produto.
- Publicar versão, mudar versão do app ou desenvolver layout/controles novos.

## Dependências

- `docs/core/sistema-v4.1.3.md`, `docs/core/guia_de_mestre-v4.0.0.md`.
- `docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/design/DESIGN.md` e tema.
- [Revisão P-097](p-097-revisao-critico-testes/p-097-sistema-v4.1.3.md).

## Riscos e Mitigação

Não usar `cm` sozinho como prova de teste: margem também existe em pools de
resultado. Reconhecer exclusivamente a notação de teste e testar o isolamento.
Não substituir resultado histórico ou derivar regra exclusiva de NPC antes do Guia.
