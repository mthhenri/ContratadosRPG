# m3-22-rolagem-frontend.spec.md

> Task 22 do milestone `m3-ficha-jogador.spec.md`. Última do pacote **Rolagem v2** — a **UI** sobre
> o motor pronto (m3-16/18/19/20/21). Consome `shared/regras/rolagem` direto (front resolve `shared`
> por `src` via tsconfig paths).

> **Antes de qualquer UI:** `docs/design/DESIGN.md` + tokens de `docs/design/tema/` (proibição #29).
> Copiar o BEM de `_componentes.scss`; scrollbar/foco são globais (`_base.scss`).

## Decisões de UX (do autor)

- **Resultado na Visão Geral:** uma **bandeja de dados flutuante** na base central da tela exibindo o
  valor rolado (preparada para "dados físicos" 3D como feature futura).
- **Preset encadeado:** **todos os passos visíveis** (cada passo com seu próprio botão de rolar).
- **Habilidades:** **só anexar** — o catálogo já traz efeito (Força Bruta funciona sozinha); o editor
  de efeito custom numa habilidade fica para depois.

## Entregáveis e fatias

### Fatia A — bandeja + rolar teste na Visão Geral + ícone `dado` ✅

- Ícone `dado` (`icone.component`: `'dado'` no union + `@case` d6 face-5, distinto de `rolagens`).
- **`BandejaDadosService`** (`shared/bandeja-dados/`, `providedIn: root`): pilha de rolagens recentes
  (teto 5) via signal; `mostrar`/`fechar`/`limpar`. **`BandejaDados`** componente fixo na base central
  (só tokens): total em accent, pool com o maior destacado (teste) ou chips por tipo (dano).
- `ficha-visualizacao`: `proficiencia` (computed, `calcularProficiencia`), `rolarTesteAtributo(campo)`
  (fórmula `<atributo>d20`, modo TESTE, **atributos efetivos** pós-lesão) → bandeja; **dadinho** no
  canto do box `.ficha-atributo` (leitura); `<app-bandeja-dados>` no template. Build/lint/testes verdes (306).

### Fatia B — editor de preset + guia (a fazer)

- `ficha-rolagens`: escolher **modo** (TESTE/SOMA) e **tipo** (SIMPLES/ENCADEADO); editar **passos
  seguintes**; **seletor de habilidades** da ficha (anexar); rolar cada passo → bandeja; débito de
  energia via `ajusteVitalidade` (somatório de `resolverPreset`; custo `[X E]` pergunta quanto).
- **Guia de fórmula:** botão de info ao lado do campo `formula` → modal no padrão `.ajuda-modal`
  (`ajuda-calculadora`), data-driven, ensinando dados/atributo-como-dado/`× ÷`/tipos/Composto/teste.

## Verificação

`npm run build --workspace=frontend` (AOT checa templates), `lint`, `test` (Vitest). Ao vivo (skill
`verify`): dadinho na Visão Geral abre a bandeja com maior+prof; preset encadeado rola passo a passo
na bandeja; anexar Força Bruta soma FOR×3 ao dano e debita energia.

## Fora de escopo (features futuras)

Dados físicos 3D na bandeja; editor de efeito estruturado custom por habilidade; crítico automático.
