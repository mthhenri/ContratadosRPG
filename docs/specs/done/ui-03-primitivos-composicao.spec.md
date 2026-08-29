# ui-03-primitivos-composicao.spec.md

> Task 3/5 do guarda-chuva `ui-biblioteca-componentes.spec.md`. Origem: `PROBLEMS.md` `P-034`.
> Independente da `ui-02` — as duas só dependem da `ui-01`.

## Objetivo

Fechar o conjunto de primitivos com os cinco blocos de composição visual que hoje são copiados
entre componentes: `Cartao`, `Stat`, `Stepper`, `Chip` e `Abas`.

## Entregáveis

1. **`shared/ui/cartao/`** — `app-cartao`, a partir do bloco `.card` de
   `docs/design/tema/_componentes.scss` (cabeçalho, índice, título, régua) e das **5** declarações
   locais espalhadas. Conteúdo por `<ng-content>`; cabeçalho opcional.
2. **`shared/ui/stat/`** — `app-stat`, a partir do bloco `.stat` (rótulo, valor) e das **5**
   declarações locais que atendem **13** telas. As modificadoras `--vida` e `--energia` já existem
   no catálogo e apontam para `var(--accent)` / `var(--energy)`; auditar as cópias antes de fixar
   a lista final de variantes, como na `ui-01`.
3. **`shared/ui/stepper/`** — **promover** o `StepInput` que já existe em
   `modules/simulacao/componentes/step-input/` (é um `ControlValueAccessor` correto, sem `ngModel`,
   usado pelas 6 páginas da simulação) para `shared/ui/`, e absorver as **4** declarações locais de
   `.stepper` de outros módulos. Manter o contrato atual (`[min]`, `[max]`, `[passo]`,
   `ariaRotulo`, digitação direta, clamp) e a integração com a diretiva `hold-repeat`. Renomear o
   seletor só se a busca provar que nenhum consumidor fica para trás.
4. **`shared/ui/chip/`** — `app-chip`, a partir de `.chip-classificacao` (3 declarações, 3 telas).
   O nome do primitivo é `chip`; a classificação (`CLASSE-E // CONFIDENCIAL`) é **uso**, não
   identidade do componente.
5. **`shared/ui/abas/`** — `app-abas`, a partir do bloco `.abas` e de `.selecionavel--ativo`. O
   catálogo diz que o padrão foi destilado de `ficha-visualizacao.component.scss` e é o mesmo da
   simulação; auditar as duas origens e o colapso mobile para só-ícone antes de implementar.
   Conteúdo de cada aba fica com o consumidor — o primitivo entrega a barra, o estado ativo, a
   navegação por teclado (setas, `Home`/`End`) e os papéis `tablist`/`tab`/`tabpanel`.
6. **Specs** dos cinco, no padrão da suíte (asserções por classe BEM): variantes renderizam a
   classe canônica, `Abas` navega por teclado e marca `aria-selected`, `Stepper` mantém os casos
   já cobertos pelo spec do `StepInput` — que deve ser movido junto, não reescrito.
7. **Adoção-piloto**: cada primitivo adotado em **um** consumidor real, escolhido entre os que já
   têm cópia local, com a cópia apagada. Não é a migração geral (`ui-04`) — é a prova de que o
   primitivo cabe na tela de verdade.

## Critérios de Aceite

- Suíte do frontend e `npm run lint` (raiz) sem erro novo; `P-033` relatado à parte.
- O spec do `StepInput` continua passando após a mudança de pasta, sem alteração de asserção.
- Nenhum consumidor do `app-step-input` fica órfão (`grep` por seletor e por classe antes e depois).
- **Gate visual (proibição #31)** nos pilotos adotados, `1920×1080` e `360×800`, com captura antes
  e depois e pixel diff zero. Para `Abas`, percorrer os estados: aba ativa, troca de aba, barra no
  mobile em modo só-ícone, e o caso do `P-005` (a barra de abas da ficha que corta o "A" de
  "HISTÓRIA" no desktop) — **observar e registrar**, sem corrigir aqui.
- Fecho auditável: variantes auditadas vs. implementadas, cópias apagadas, números.

## Fora de Escopo

- **Corrigir `P-005`.** Ele vive na barra de abas e vai aparecer durante esta task; o `Abas` novo
  reproduz o comportamento atual. A correção é task própria — e fica mais barata depois desta,
  porque passa a ter um único lugar.
- Migração geral dos módulos (`ui-04`), `Modal`/`Notificacao` (`ui-02`), PrimeNG (`ui-05`).
- Um primitivo `Topbar`. O bloco `.topbar` está no catálogo, mas tem **uma** instância
  (`shared/layout/`) — primitivo com um consumidor é indireção, não biblioteca. Fica onde está.
- Criar primitivo para bloco sem duplicação medida.

## Dependências

- `ui-01` em `done/` — `Cartao` e `Abas` compõem com `Botao`, e a regra de consumo ("consome o
  primitivo, não copia o bloco") é estabelecida lá.

## Riscos e Mitigação

- **`Abas` é o mais arriscado dos cinco**: tem duas origens (ficha e simulação), comportamento
  responsivo próprio e um defeito conhecido em cima (`P-005`). Auditar as duas origens **antes**
  de escrever, e tratar divergência entre elas como decisão a registrar, não a resolver no
  improviso.
- **Mover o `StepInput` de pasta e "aproveitar para melhorar".** O contrato dele está correto e é
  consumido por 6 páginas; esta task muda o endereço e absorve as cópias alheias — nada mais.
