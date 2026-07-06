# m1-17-singleton-estado-abas-calculadora.spec.md

> Task 17/14+ do milestone `m1-calculadora-paridade.spec.md` — **refinamento** pós-fechamento
> do M1 (mesmo padrão de `m1-15`/`m1-16`: milestone já concluído no código, task adicional a
> pedido do autor). Não mexe em `shared/regras` nem na identidade visual.

## Objetivo

Hoje, ao trocar de aba na calculadora (`agente`/`dt`/`novo-agente`/`patente`/`descanso`), o
formulário de cada página é **perdido** — a rota lazy destrói o componente ao sair da aba e o
recria do zero (valores padrão) ao voltar. Só a aba `compras` sobrevive à troca de aba, porque
persiste em `localStorage` (m1-11).

Esta task cria um **singleton em memória** (service Angular `providedIn: 'root'`) que guarda o
estado de cada aba **enquanto a SPA está viva**, para que trocar de aba e voltar preserve os
valores digitados — **sem** persistir em `localStorage`/`sessionStorage**: um F5 (reload) **deve
continuar perdendo** o estado dessas abas, exatamente como hoje. A única aba com sobrevida a F5
continua sendo `compras` (não mexer no mecanismo dela).

## Contexto (estado atual)

- As 6 abas são rotas lazy independentes (`calculadora.routes.ts`) sob o `CalculadoraShell`; cada
  página (`AgentePage`, `DtPage`, `NovoAgentePage`, `PatentePage`, `DescansoPage`, `ComprasPage`)
  é standalone e monta seu próprio `FormGroup` no construtor/inicialização de campo, sempre com o
  mesmo preset inicial hardcoded (ex.: `AgentePage` sempre nasce em Combatente/Nível 3/atributos
  2-2-2-1-1 — ver `agente.page.ts:112`).
- Nenhuma das 5 abas fora `compras` guarda estado em serviço externo — o `FormGroup` vive só no
  componente e morre com ele quando o `router-outlet` desmonta a rota.
- `compras.page.ts` é a única exceção: um `effect()` grava `carrinho`/`amplificadores`/`recursos`
  em `localStorage` (`contratados-rpg:calculadora-compras`) a cada mudança, e o construtor tenta
  recarregar esse estado — **essa peculiaridade deve continuar existindo só para `compras`**; as
  outras abas não ganham `localStorage` nesta task.
- Não existe hoje nenhum service compartilhado entre as páginas da calculadora além dos
  puramente visuais (`AjudaCalculadora`, `StepInput`, tokens de tema).

## Entregáveis

1. **Singleton de estado das abas** (ex.: `EstadoAbasCalculadoraService`, em
   `frontend/src/app/modules/calculadora/`, `providedIn: 'root'`) — guarda em memória (Signals ou
   campos simples, sem I/O) o valor bruto do formulário de cada uma das abas
   **`agente`/`dt`/`novo-agente`/`patente`/`descanso`** (a `compras` fica fora — mantém seu
   mecanismo próprio de `localStorage`, sem duplicar estado no singleton).
2. **Cada página lê/escreve no singleton em vez de só no próprio `FormGroup` local**: ao montar,
   a página restaura o valor salvo no singleton se existir (senão usa o preset inicial atual); a
   cada mudança do formulário, grava o valor bruto de volta no singleton — puramente em memória
   (nenhuma chamada a `localStorage`/`sessionStorage`/cookie nesta task).
3. **Escopo de vida = sessão do app**: como o singleton é `providedIn: 'root'`, ele sobrevive à
   navegação entre rotas (SPA), mas é recriado do zero a cada carregamento de página (F5/nova
   aba) — não há nenhum mecanismo de persistência entre reloads para as 5 abas cobertas.

## Critérios de Aceite

- Preencher a aba `agente` (ex.: mudar classe/nível/atributos), navegar para `dt` e voltar para
  `agente`: os valores digitados continuam lá (não voltam ao preset inicial).
- O mesmo vale, isoladamente, para `dt`, `novo-agente`, `patente` e `descanso` — trocar de aba e
  voltar preserva o que foi digitado em cada uma.
- Dar F5 (reload da página) em qualquer uma dessas 5 abas **volta ao preset inicial** — nenhuma
  dessas abas ganha sobrevida a reload nesta task.
- `compras` continua se comportando exatamente como hoje: sobrevive tanto à troca de aba quanto
  a F5 (via seu `localStorage` já existente) — mecanismo dela **intocado**.
- **Zero alteração de regra de jogo** — `shared/regras` intocado.
- Suítes `shared` e `frontend` verdes (specs das 5 páginas cobertas ganham teste de
  ida-e-volta: preencher → trocar de aba → voltar → valor preservado); build dentro do budget.
- Sem duplicação de estado: o singleton é a única fonte do estado entre-abas dessas 5 páginas
  (nenhuma delas volta a depender só do `FormGroup` efêmero para sobreviver à navegação).

## Notas de implementação (não normativas)

- Como as 5 páginas têm formulários de formato diferente (campos/tipos distintos), o singleton
  pode guardar um registro por aba com o valor bruto tipado da própria página (ex.: um método
  `obterAgente()`/`definirAgente(valor)` por aba, ou um mapa genérico chaveado por nome de aba) —
  a task não prescreve a forma exata da API, só que seja **um único service** cobrindo as 5 abas
  em memória.
- `Signals` no singleton (em vez de `BehaviorSubject`) mantêm o padrão do resto do projeto
  (SYSTEM.SPEC §8 prefere Signals a `Subject`/`BehaviorSubject`).
- Cuidado com o `subscribe`/`effect` de reclamp existente na `AgentePage` (reclampa atributos ao
  trocar de classe) — a leitura/escrita no singleton não deve reintroduzir um loop com esse
  reclamp.

## Fora de Escopo

- Persistir as 5 abas em `localStorage`/`sessionStorage` (sobreviver a F5) — só `compras` tem essa
  peculiaridade, por decisão explícita desta task.
- Mexer no mecanismo de persistência já existente de `compras` (m1-11).
- Qualquer mudança em fórmula/regra (`shared/regras`) ou no layout/conteúdo visual das abas.
- Sincronizar o estado entre abas do navegador (múltiplas abas/janelas) ou com o backend.

## Dependências

- `m1-06-frontend-calculadora-base.spec.md` (shell + rotas lazy das 6 abas).
- `m1-07-pagina-agente.spec.md` / `m1-08-pagina-dt-novo-agente-patente.spec.md` /
  `m1-09-pagina-descanso.spec.md` (as páginas cujo `FormGroup` passa a ler/escrever no singleton).
- `m1-11-compras-persistencia-carrinho.spec.md` (mecanismo de `compras` que **não** é alterado).
