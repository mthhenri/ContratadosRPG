# PROBLEMS.md — Problemas Conhecidos

> **O que entra aqui:** o que está **quebrado, degradado ou aceito como dívida agora**. Um item
> existe aqui enquanto o problema existe. Quando o problema é resolvido, o item **sai deste
> arquivo** — o relato da correção vive em [`HISTORY.md`](HISTORY.md), não aqui.
>
> **O que NÃO entra aqui:** feature que falta (isso é spec no `docs/specs/backlog/`), ideia
> (isso é [`IDEAS.md`](IDEAS.md)), e decisão consciente de design que está funcionando como
> desejado (isso é `CONTEXT.md` §5).
>
> **Estados:** `ABERTO` (dói e não tem contorno) · `CONTORNADO` (dói, mas existe um jeito de
> conviver — o contorno está descrito) · `ACEITO` (não vai ser corrigido; fica registrado para
> ninguém "descobrir" de novo).
>
> **Formato de entrada** — copie o bloco abaixo, numere sequencialmente e **não reaproveite
> número de item removido**:
>
> ```markdown
> ### P-0NN — <título curto> · `ABERTO|CONTORNADO|ACEITO` · <área>
>
> - **Sintoma:** o que se observa.
> - **Causa:** a raiz, se conhecida — ou "não investigada".
> - **Contorno:** como conviver, se houver.
> - **Correção:** o que resolveria de fato, se conhecido.
> - **Desde:** quando apareceu (task/commit/data).
> ```

---

## Ativos

### P-003 — Backend não valida a estrutura do corpo das requisições · `ACEITO` · backend

- **Sintoma:** nenhum `ValidationPipe` está registrado. Um corpo malformado (campo ausente, tipo
  errado) chega **cru** no service.
- **Causa:** decisão consciente — DTOs são `interface readonly`, e o projeto não instala
  `class-validator` (ver `CONTEXT.md` §5). Sem classe não há decorator para o pipe ler.
- **Contorno:** as services validam regra de negócio e o TypeScript cobre o caminho do frontend
  próprio. O risco real é um cliente de terceiros ou uma chamada manual à API.
- **Correção:** ligar o `ValidationPipe` exigiria converter DTOs em classes — **não fazer sem
  pedir ao autor**, é reversão de decisão registrada.
- **Desde:** `m3-01`, quando a validação estrutural foi explicitamente adiada.

### P-004 — Budget do bundle vem sendo elevado em vez do bundle reduzido · `CONTORNADO` · frontend

- **Sintoma:** o bundle inicial de produção anda colado no teto. O budget do `angular.json` já foi
  elevado pelo menos quatro vezes (575kB → 580kB → 610kB inicial; 34kB → 35kB
  `anyComponentStyle`), sempre para acomodar o que entrou.
- **Causa:** cada task nova soma alguns kB e a saída mais barata é subir o número.
- **Contorno:** subir o budget de novo — é o que vem sendo feito.
- **Correção:** um passe de redução de verdade (auditar o que está no chunk inicial e empurrar para
  lazy). Nunca foi feito.
- **Desde:** `m1-06`, agravando desde então.

### P-008 — Aba "Extras" e a Origem estão no lugar errado para um humano · `ACEITO` · UX

- **Sintoma:** na auditoria ao vivo da `m3-60`, a tarefa "o mestre perguntou da minha origem" leva
  a pessoa à aba **História** (ícone de documento) — e a Origem não está lá, está em **Extras**.
  Some-se que o ícone que nomeia "Extras" é o `mais` (`+`), o mesmo dos botões "Adicionar" do app
  inteiro.
- **Causa:** "Extras" nasceu como posição vazia reservada no redesenho da `m3-38` e foi preenchida
  pela `m3-49` sem revisitar o nome.
- **Contorno:** nenhum.
- **Correção:** renomear a aba e/ou mover a Origem para História.
- **Desde:** `m3-60` — **adiado por decisão explícita do dono**, registrado como dívida de
  nomenclatura.

### P-018 — Guia de criação não respeita as regras específicas do Civil · `ABERTO` · frontend

- **Sintoma:** o dono reportou que o guia de criação de personagem não respeita a mecânica de Civil.
  Um caso concreto encontrado: o passo // Novo agente (nível inicial "arredonda a média da campanha
  − 1", teto de 20, mais o Prestígio) roda **igual pra Civil** — o rótulo, o range do campo manual
  (`min=0 max=20` em "Nível inicial exato") e o resumo mostram "Nível"/"Prestígio" pro Civil também,
  mas `docs/core/sistema-v4.1.0.md` só define Treinamento 0–5 pra Civil (sem noção de Prestígio;
  `dadosCivil` — `shared/src/regras/dados/progressao-civil.dados.ts` — só tem entradas de 0 a 5). Um
  Civil que herda uma média de campanha acima de 5 vira um "Nível" fora da tabela, e
  `calcularProgressaoAcumulada`/`calcularBeneficiosNivel` devolvem lista vazia pra qualquer
  Treinamento > 5, sem avisar o jogador.
- **Causa:** não investigada por completo — o pipeline de "Novo agente"/progressão do guia
  (`criar.page.ts`: `novoAgente`, `nivelInicial`, `prestigioInicial`) não tem nenhum branch pra
  Civil; trata todas as classes com a mesma fórmula/teto/rótulo. Pode haver mais pontos do guia com
  o mesmo problema (o dono não detalhou todos) — escopo completo a confirmar com ele.
- **Contorno:** nenhum.
- **Correção:** escopo mapeado e specado em `docs/specs/backlog/civil-guia-criacao.spec.md`
  (2026-08-24) — cobre // Novo agente (Nível/Prestígio → Treinamento), // Atributos (base e
  orçamento de criação do Civil) e // Equipamento inicial (orçamento fixo, categorias vetadas).
  A spec depende de 4 decisões do dono antes de virar código; ver o arquivo. Outras divergências
  de Civil levantadas na mesma investigação (passo // Recursos, progressão pós-criação) ficaram
  fora do escopo escolhido pelo dono, registradas em "Fora de Escopo" da spec.
- **Desde:** reportado pelo dono em 2026-08-11.

### P-059 — Botão "Remover" sem classe no guia de criação de agente · `ABERTO` · frontend/design system

- **Sintoma:** `criar.page.html` (vaga de habilidade escolhida, dentro de `.guia__vaga-lista`) tem
  um `<button aria-label="Remover ..." (click)="removerMelhoria(...)">✕</button>` sem nenhuma classe
  CSS — nem `app-botao`/`app-botao-icone`, nem geometria própria — estilizado só pelo `<button>`
  nativo do navegador.
- **Causa:** o levantamento completo do `P-048` audita por classe CSS; um botão sem classe não
  aparece na lista de ocorrências e não foi enumerado no entregável de nenhuma spec da série
  `ui-28`…`ui-32`.
- **Contorno:** funciona, mas destoa visualmente dos demais botões do guia.
- **Correção:** dar ao botão a classe `guia__vaga-remover` (ou similar) e o atributo
  `app-botao-icone`, com geometria própria no SCSS de `criar.page.scss`.
- **Desde:** achado durante a implementação de `ui-31` (2026-09-04) — fora do escopo do entregável 6
  daquela spec (que só lista `.guia__sair`, `.guia__formacao-remover`, `.guia__resumo-*`).

### P-060 — Botão de mostrar/ocultar senha sem `app-botao-icone` em `gestao.page` · `ABERTO` · frontend/design system

- **Sintoma:** `gestao.page.html` (formulário "Redefinir senha" de um usuário, dentro de
  `.gestao__senha`) tem `<button type="button" (click)="alternarSenha()" [attr.aria-label]="...">`
  sem `app-botao-icone`, com identidade própria em `.gestao__senha button` (`gestao.page.scss`:
  posição absoluta, 44×44px, `border: 0`, fundo transparente, cor `--text-mute`) — o mesmo padrão
  de olho de senha que `perfil.page.html` já resolve com `app-botao-icone tamanho="padrao"` e
  classe `perfil__olho`.
- **Causa:** o entregável 3 da `ui-32` (`docs/specs/done/ui-32-adocao-botao-icone-simulacao-
  usuario.spec.md`) lista só `.gestao__limpar-filtros`, `.gestao__tipo-confirmar`,
  `.gestao__tipo-cancelar` e `.gestao__tipo` — o botão de senha não estava no levantamento nem no
  texto da spec.
- **Contorno:** funciona; visualmente já é discreto (ícone solto, sem borda), então o desvio é
  menor que o do `P-059`, mas ainda reimplementa hover/foco/tamanho na mão em vez de reusar o
  primitivo.
- **Correção:** trocar para `app-botao-icone` (mesmo padrão de `perfil__olho`), com `aria-label` já
  existente e `[appTooltip]` a acrescentar (o primitivo exige os dois); ajustar
  `.gestao__senha button` para manter só posição/tamanho.
- **Desde:** achado durante a implementação de `ui-32` (2026-09-05) — fora do escopo do entregável 3
  daquela spec.

### P-061 — Esqueleto de título sem estilo em `previa-jogador`/`espectador` · `ABERTO` · frontend

- **Sintoma:** `previa-jogador.page.html` e `espectador.page.html` têm `<span class="esqueleto-bloco
  esqueleto-bloco--titulo">` no cabeçalho de carregamento, mas nenhum dos dois `.scss` define
  `.esqueleto-bloco` (nem localmente, nem importam um `.scss` que o faça) — com o encapsulamento de
  estilo do Angular, esse `<span>` não recebe geometria, cor, raio nem pulso nenhum; renderiza como
  um elemento vazio, sem altura. O resto de cada tela (`app-esqueleto` com classes próprias, ex.
  `previa-jogador__esqueleto-linha`) já está correto.
- **Causa:** provável resto de uma versão anterior ao `app-esqueleto`/BEM local (`ui-14`), não
  migrada quando o resto da tela adotou o primitivo — não fazia parte do levantamento da `P-051`
  (que audita `.esqueleto-bloco` **definido** localmente; aqui a classe só é referenciada).
- **Contorno:** nenhum — a área do título de carregamento fica sem silhueta visível (invisível, não
  quebrado), até o conteúdo real chegar.
- **Correção:** trocar por `<app-esqueleto class="previa-jogador__esqueleto-titulo" />` (e
  equivalente em `espectador.page`), com geometria própria no SCSS de cada arquivo.
- **Desde:** achado durante a implementação de `P-051` (2026-09-05) — fora do escopo daquela task
  (que cobre só os quatro arquivos que duplicavam a identidade completa).

### P-063 — `contratos-gerados.ts` tem descrições de campo desatualizadas em relação ao JSDoc fonte · `ACEITO` · backend/tooling

- **Sintoma:** ao rodar `openapi:gerar-contratos` de verdade (verificação do `P-062`), duas
  descrições de campo saem do arquivo comitado — `CampanhaRecuperadaDto.codigoConvite` e
  `.codigoConviteEspectador` perdem a `description` que o JSON gerado hoje carrega.
- **Causa:** a fonte (`shared/src/dtos/campanha/campanha.dtos.ts`) não tem mais JSDoc por campo
  para essas duas propriedades — só um comentário no nível da interface (`CampanhaRecuperadaDto`,
  linhas ~91-95) que descreve as duas juntas. O arquivo gerado comitado ficou com a descrição de
  uma versão anterior do DTO, de antes desse comentário ser consolidado, e nunca foi regenerado.
- **Contorno:** nenhum — é só o JSON gerado ficando um pouco atrás da fonte; não afeta o contrato
  de tipo/schema, só o texto de documentação.
- **Correção:** regenerar `contratos-gerados.ts` de verdade e revisar o diff inteiro (agora que o
  `P-062` corrigiu a poluição de CRLF, o diff deve mostrar só drift de `description` real, DTO por
  DTO) — trabalho maior que qualquer task isolada deve assumir sozinha; pode haver mais casos além
  desses dois.
- **Desde:** achado durante a verificação do `P-062` (2026-09-05).

### P-064 — "Total de Venda" (Compras/Vendas) continua com `.calc-stat` local · `ACEITO` · frontend/design system

- **Sintoma:** `compras.page` migrou todos os demais stats para `app-stat` (`P-054`), mas o card
  "Total de Venda" (aba Vendas) continua com `.calc-stat.compras-venda-total` local.
- **Causa:** esse stat tem fundo **preenchido** (`background: var(--accent-dim)`, "credencial de
  valor") — nenhuma variante do `app-stat` pinta fundo, só borda/cor de texto (`vida`/`energia`/
  `positivo`/`alerta`). Ampliar o primitivo para um único consumidor não foi decisão unilateral
  cabível; ficou de fora da ampliação de `hero`/`[statInfo]`/`[pulso]` que a mesma task aprovou.
- **Contorno:** nenhum necessário — o stat local funciona e é visualmente idêntico ao de antes.
- **Correção:** se aparecer um segundo consumidor real que precise de fundo preenchido, ampliar
  `app-stat` com uma variante própria (ex.: `destaque`) nessa hora, não antes.
- **Desde:** achado durante a implementação do `P-054` (2026-09-06).
