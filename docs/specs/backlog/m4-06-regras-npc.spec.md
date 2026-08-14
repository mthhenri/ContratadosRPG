# m4-06-regras-npc.spec.md

> Task 6/10 do milestone `m4-ficha-criatura-npc.spec.md`.

## Objetivo

`shared/regras/npc` — motor de regras puro do roteiro de criação de NPCs
(`docs/core/guia_de_mestre-v4.0.0.md`, "Guia de Criação de NPCs"), mesma estrutura de
`shared/regras/agente`/`shared/regras/criatura`. Fonte única para backend (validação) e
frontend (`m4-08`).

## Entregáveis

1. **Atributos**: `obterPontosELimitePorCategoria(categoria)` — pontos a distribuir e
   limite por atributo (Civil +2/cap 2 … Lendário +24/cap 6); `validarAtributosCategoria`
   (Civil trava Luta/Pontaria em 0 por padrão, com exceção justificada desbloqueável
   manualmente pelo Mestre — a função só valida o cap, o desbloqueio é decisão de UI/mestre,
   não regra bloqueante).
2. **Vida**: `calcularVidaMaxima(categoria, nivel, vigor)` = Base(categoria) + (Nível +
   VIG) × Multiplicador(categoria).
3. **Defesa**: `calcularDefesaBase(nivel)` = 10 + Nível; `calcularBloquear(defesaBase,
   vigor)` = Defesa Base + VIG; `calcularEsquivar(defesaBase, destreza)` = Defesa Base +
   DES.
4. **Energia**: `calcularEnergia(categoria, destreza)` — por Categoria: Civil `0`;
   Operativo `8 + DES×2` (Reserva Fixa); Veterano `12 + DES×3` (Reserva Fixa); Elite
   `{ pool: 18 + DES×3, recarga: DES }`; Lendário `{ pool: 25 + DES×4, recarga: DES×2 }`.
   Recarga nunca ultrapassa a Pool (regra de uso em jogo, não de criação — documentar como
   nota, sem função dedicada se não houver consumidor além da ficha).
5. **DT de atributo (sob demanda, não persistida)**: `calcularDtAtributo(nivel, valorAtributo)`
   = 10 + Nível + (Atributo × 2) — função pura chamada com o atributo relevante ao
   contexto, nunca armazenada num campo único (diferente do jogador).
6. **Volume de habilidades**: `obterVolumeHabilidadesPorCategoria(categoria)` — total/
   passivas mínimas/ativas máximas/limite por turno (tabela: Civil sem habilidades;
   Operativo 2-3/1/2/4 … Lendário 6-8/4/4/6); `validarVolumeHabilidades` (contagem de
   Ativas/Passivas dentro da faixa, sem exceder o limite por turno — validação de
   composição, não de uso em combate).
7. **Validação de coerência** (`validarFichaNpc(dados: FichaNpcDadosDto)`): atributos
   dentro do cap da Categoria (respeitando exceção Civil desbloqueada, se marcada),
   volume de habilidades dentro da faixa da Categoria, Cooperação em 0–10, Nível em
   0–20 — retorna lista de violações, mesmo padrão de `shared/regras/criatura`.
8. **Caso de teste — Biblioteca de Referência**: para cada Categoria (Operativo, Veterano,
   Elite, Lendário — Civil não tem exemplo mecânico no guia além dos caps), montar um NPC
   de exemplo plausível dentro da faixa de Nível sugerida e confirmar Vida/Defesa/Energia
   calculados batem com as fórmulas do documento.

## Critérios de Aceite

- Todas as funções puras, testadas contra as tabelas do "Guia de Criação de NPCs".
- Mestre monta um NPC por Categoria usando a Biblioteca de Referência do guia e o sistema
  reproduz Vida/Defesa/Energia calculados (critério de aceite do milestone).
- Nenhuma fórmula duplicada fora de `shared/regras/npc`.

## Fora de Escopo

- `FichaNpcDadosDto` (`m4-05`, pré-requisito).
- Uso do motor no backend (`m4-07`) ou frontend (`m4-08`).

## Dependências

- `m4-05` (contrato `FichaNpcDadosDto`).
- `docs/core/guia_de_mestre-v4.0.0.md` — "Guia de Criação de NPCs" (documento vence
  código, proibição #27).
