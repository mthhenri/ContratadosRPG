# m3-39-ficha-contra-ataque-calculado.spec.md

> Segue o `m3-38` (redesenho de comparação visual), que introduziu a linha "Contra-ataque" nas
> Reações como **override manual puro** (sem fórmula em `shared/regras`) — esta task adiciona a
> fórmula que faltava, mantendo o mecanismo de override manual já existente (m3-10) como fallback.

## Objetivo

O stat "Contra-ataque" nunca é calculado: mesmo o jogador tendo a habilidade "Contra-Ataque" no
catálogo, o campo fica em "N/A" até alguém digitar um valor na mão. A habilidade tem fórmula
definida no documento (`sistema-v4.1.0.md`), com três variantes conforme a origem:

| Variante | `categoria` + `origem` da habilidade na ficha | Fórmula |
|---|---|---|
| Geral (qualquer classe) | `GERAL`, sem `origem` | Luta ÷ 2 |
| Lutador (Melhorada) | `GERAL_MELHORADA`, `origem: ArquetipoEnum.LUTADOR` | Luta (cheio) |
| Vanguarda (Melhorada) | `GERAL_MELHORADA`, `origem: ArquetipoEnum.VANGUARDA` | Luta ÷ 2 **ou** Vigor ÷ 2 |

Esta task calcula o valor automaticamente a partir do atributo `luta` (já existe em
`FichaAtributosDto`, nunca usado em fórmula alguma até hoje) e da habilidade já salva em
`dados.habilidades`, sem remover a edição manual existente (continua vencendo quando presente —
mesmo mecanismo "stored > calculado" de Defesa/Esquiva/Bloqueio).

## Entregáveis

1. **`shared/src/regras/agente/agente.dtos.ts`**: novo `ContraAtaqueCalcularDto { luta, vigor,
   habilidades: readonly FichaHabilidadeDto[] }` (import `type` de `FichaHabilidadeDto`, mesmo
   padrão zero-dep em runtime já usado em `derivados.ts`).
2. **`shared/src/regras/agente/defesa.ts`**: nova função `calcularContraAtaque(dto): number | null`.
   Acha a habilidade de nome `'Contra-Ataque'` em `dto.habilidades`; sem ela, retorna `null`. Com
   ela, resolve a variante por `categoria`/`origem` (tabela acima) e aplica a fórmula. Empate
   Vanguarda ("Luta ÷ 2 ou Vigor ÷ 2"): usa `Math.max` dos dois — não há escolha explícita do
   jogador no modelo de dados, e matematicamente é sempre a opção que um jogador racional tomaria;
   segue editável manualmente se alguém quiser um valor diferente. Arredondamento: `Math.floor` nas
   divisões por 2 (doc — "Arredondamentos": frações sempre para baixo; mesmo padrão de `saude.ts`).
3. **`frontend/src/app/modules/ficha/status-derivado.ts`**:
   - `EntradaAgente`/`normalizarEntrada` passam a carregar também `luta` (clampada aos bounds da
     classe via `obterLimitesClasse`, sem alterar a assinatura do `aplicarLimitesPorClasse`
     compartilhado — várias outras fórmulas o consomem e não precisam de `luta`).
   - `montarInformacoesExtras` ganha um novo parâmetro `habilidades: readonly FichaHabilidadeDto[]`
     e troca o `calculado` hardcoded `null` da linha `contraAtaque` por
     `calcularContraAtaque({ luta: entrada.luta, vigor: entrada.vigor, habilidades })`.
4. **`ficha-visualizacao.component.ts`**: atualiza a chamada de `montarInformacoesExtras` passando
   `this.dados().habilidades`. `temHabilidadeContraAtaque()` e o HTML da caixa "Reações" não
   mudam — o gate de "com/sem habilidade" já existe e continua controlando o placeholder "—" vs.
   caixa editável; a única mudança é o **valor default** dentro da caixa editável deixar de ser
   sempre N/A.
5. **`shared/src/regras/agente/derivados.ts`**: `calcularDerivados` ganha um parâmetro
   `habilidades` e passa a incluir `contraAtaque` no snapshot retornado, pela mesma fórmula —
   consistência de fonte única (mesmo raciocínio de Defesa/Esquiva/Bloqueio já presentes ali). Na
   prática é um no-op hoje (nenhum fluxo de criação de ficha atribui a habilidade antes de montar
   o documento), mas evita a fórmula divergir se um futuro fluxo de criação vier a receber
   habilidades pré-selecionadas. Os dois call sites (`ficha-padrao.ts` no frontend,
   `ficha.service.ts` no backend) passam `dados.habilidades`/`habilidades` já disponíveis no
   escopo.

## Critérios de Aceite

- Jogador com a habilidade geral "Contra-Ataque" (Luta = 4): caixa mostra `2` sem precisar digitar
  nada.
- Jogador Lutador com a "Contra-Ataque" (Melhorada) (Luta = 4): caixa mostra `4`.
- Jogador Vanguarda com a "Contra-Ataque" (Melhorada) (Luta = 2, Vigor = 5): caixa mostra `2`
  (o maior dos dois, `floor(5/2)`).
- Editar manualmente o valor continua funcionando e passa a vencer o calculado dali em diante
  (mesmo comportamento de Defesa/Esquiva/Bloqueio — sem regressão).
- Ficha sem a habilidade "Contra-Ataque" continua mostrando o placeholder "—" tracejado, não
  editável (comportamento do `m3-38`, inalterado).
- Suíte de testes do `shared` e do `frontend` verde.

## Fora de Escopo

- Campo de escolha explícita Luta/Vigor para a variante Vanguarda (resolvido automaticamente por
  `Math.max`, ver Entregável 2).
- Qualquer cálculo automático de outras habilidades narrativas do catálogo (ex.: "Vai e Volta") —
  só a habilidade nomeada exatamente "Contra-Ataque" entra nesta fórmula.

## Dependências

- `m3-10` (edição no próprio lugar — mecanismo stored > calculado, reaproveitado sem mudança),
  `m3-13` (catálogo de habilidades — `categoria`/`origem` já resolvidos por
  `shared/regras/agente/habilidades-catalogo`), `m3-38` (introduziu o campo como override manual).
