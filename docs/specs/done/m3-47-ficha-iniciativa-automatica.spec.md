# m3-47-ficha-iniciativa-automatica.spec.md

> Task 44 do milestone `m3-ficha-jogador.spec.md`. Lote de refino da ficha (`m3-40`…`m3-56`).

> **Regras de jogo:** `docs/core/sistema-v4.1.0.md` (Iniciativa). **O documento vence**
> (proibição #27).

## Objetivo

Ao **criar** a ficha, gerar **automaticamente** um preset de rolagem de **Iniciativa** = `DESd6`,
já com a descrição fixada explicando a relação com a Destreza.

## Entregáveis

1. **Preset automático na criação.** Ao criar a ficha, incluir em `dados.rolagens`
   (`FichaRolagemDto`, `shared/src/dtos/ficha/ficha.dtos.ts`) um preset:
   - rótulo: **"Iniciativa"**
   - fórmula: **`DESd6`** (Destreza dados de d6 — usa a gramática de atributo-como-fonte já
     existente, `m3-29`)
   - descrição fixa: *"Quantidade de dados rolados para a iniciativa. Essa quantidade é relativa
     ao seu atributo de DESTREZA, sendo cada ponto neste atributo 1 dado de 6 faces (D6) a ser
     rolado na Iniciativa, somando todos para obter o valor total."*
2. **Onde criar.** No backend (`FichaService.criarFicha`, junto de `aplicarSnapshotDeMaximos`,
   `backend/src/modules/ficha/ficha.service.ts`) para valer em toda criação, e/ou no wizard
   `ficha-criar-dialog`. Decidir a fonte única para não duplicar o preset. Fichas **já existentes**
   não são migradas (só criação nova) — a menos que o autor peça uma migração leve.
3. Garantir que o preset é editável/removível como qualquer outro (não é imutável), e que a
   fórmula `DESd6` valida em `validarFormula`.

## Critérios de Aceite

- Criar uma ficha nova produz um preset "Iniciativa" = `DESd6` com a descrição acima.
- Rolar o preset usa a Destreza atual como quantidade de d6.
- O preset pode ser editado/removido pelo dono/mestre normalmente.

## Fora de Escopo

- Stat derivada de iniciativa no bloco de derivados (é **preset de rolagem**, não derivado — não
  existe função de iniciativa no motor e não se cria uma aqui).
- Migrar presets de iniciativa em fichas antigas (só criação nova).

## Dependências

- `m3-15`/`m3-21` (presets de rolagem), `m3-29` (atributo como fonte de dados — `DESd6`),
  `m3-03` (criação de ficha no backend).
