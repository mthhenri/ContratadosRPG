# m3-31-rolagem-aposenta-efeitos.spec.md

> **Reverte** a aplicação automática de efeitos de habilidade nas rolagens (`m3-20`). Por decisão do dono,
> a fusão de efeitos na fórmula agregava complexidade com pouco retorno. A **marcação de habilidades por
> passo** permanece — mas **só para contar Energia** — e passa a permitir a **mesma habilidade repetida**.

## Objetivo

- **Aposentar** a fusão de efeitos: a fórmula de um passo é usada **crua**; as habilidades vinculadas não
  a alteram mais.
- **Manter** a marcação de habilidades por passo pelo **gasto de Energia completo**.
- **Permitir aplicar a mesma habilidade mais de uma vez** num passo (energia soma por ocorrência).

## Entregáveis

### 1. Remoção da maquinaria de efeitos (shared)

- Deletados: `aplicarEfeitos` e `alvoPadrao` (`rolagem.ts`); `RolagemEfeitoDto` e `TermoDadoDto.bonusDados`
  (`rolagem.dtos.ts`); os enums `RolagemEfeitoTipoEnum`/`RolagemEfeitoAlvoEnum` (arquivos + barrel);
  `HabilidadeBaseDto.efeitos` e todos os `efeitos` do catálogo (`habilidades-catalogo.dados.ts`);
  `FichaHabilidadeDto.efeitos` (`ficha.dtos.ts`). Removidas também as extensões DANO_DADOS_ARMA e
  BONUS_TESTE `'ATRIBUTO'`.
- `resolverPreset` passa a usar `interpretarFormula(passo.formula)` **cru** e só soma a Energia das
  habilidades vinculadas.

### 2. Habilidade repetível (multiconjunto)

- `FichaRolagem(Passo)Dto.habilidades` é um **multiconjunto** de nomes (pode repetir). `resolverVinculo`
  resolve cada ocorrência → `energiaGasta` soma por ocorrência; `habilidadesVinculadas` mantém as
  repetições.

### 3. Frontend (`ficha-rolagens`)

- Seletor por passo vira **stepper `− N +`** por habilidade (`contarHabilidade`/`adicionarHabilidade`/
  `removerHabilidade`), no lugar do toggle. A energia do passo reflete as repetições.
- Chips de vínculo do preset salvo **agrupam** em `Nome ×N` (`vinculosAgrupados`).
- Copy dos rótulos ajustada ("só contam energia; repita para aplicar mais de uma vez").

## Fora de escopo / preservado

- **Crítico mecânico** (`m3-30`) permanece — dobra a **fórmula crua** (dados/fixos/atributos escritos),
  exceto PROF/NIV.
- **Tooltip** da descrição da habilidade (`m3-30`) permanece — fica mais útil, já que o efeito é aplicado
  manualmente pelo jogador.

## Verificação

- `shared` **281** testes (removidos os de fusão; +2 de energia por ocorrência em multiconjunto).
- `frontend` **319** testes (stepper add/remove/contagem + serialização repetida + energia agregada).
- Render real (Playwright): vínculo "Força Bruta ×2" com energia "− 8 E"; rolar o dano usa `2d8` cru
  (sem FOR×3 fundido); o stepper mostra a contagem por passo.
