# m3-78-guia-personalidade-fortificacao-custo.spec.md

> Ajuste pós-milestone do M3 — Guia de Criação de Ficha. Pedido original do autor: "revisar como
> funciona as fortificações da personalidade e também adicionar a descrição da habilidade de
> personalidade e seu custo dentro do guia de criação de agentes". Escopo ampliado em conversa
> subsequente: a Habilidade de Personalidade passa a ter 3 estágios (Base, 1ª e 2ª Fortificação),
> cada um com descrição/custo próprios preenchíveis desde o início, e a ficha ganha uma forma de
> marcar qual estágio está "ativo" (o que aparece na aba Habilidades).

## Regra do sistema

Fonte: `docs/core/sistema-v4.1.0.md:375-397` —

> "A personalidade é um traço forte de suas ações e pensamentos. [...] A **Habilidade de
> Personalidade** é a materialização em mecânica de seus traços de personalidade. A personalidade é
> uma única palavra que seja um adjetivo para seu personagem [...] Assim que escolher uma
> personalidade, ela será dada ao **Mestre** da mesa que irá definir suas especificações. Assim como
> toda habilidade, as personalidades seguem o mesmo princípio. Ela terá **custo em Energia** e sua
> descrição também será voltada para sua origem e/ou classe. Assim que receber a descrição e efeito
> de sua personalidade, ela **não poderá mais ser mudada**."
>
> "### Fortificação de Traços — A fortificação de traços é, mecanicamente, uma melhoria de sua
> habilidade de personalidade, obtida ao atingir os níveis **7 e 14**. [...] Uma fortificação não
> necessariamente irá aumentar o custo e seus efeitos. O que cada fortificação realiza é
> completamente decidido pelo **Mestre em conjunto com o Jogador**."

Não há menção a "Fortificação"/"Personalidade" em `docs/core/guia_de_mestre-v4.0.0.md` — a regra
vive só no documento de sistema. O custo em Energia de cada estágio **não é fixo pelo documento** (é
definido caso a caso pelo Mestre, junto com o efeito) — o exemplo do documento mostra valores
crescentes só como ilustração de uma personalidade específica, não como tabela universal. O fato de
"não necessariamente" aumentar custo/efeito também justifica que uma Fortificação possa ficar em
branco mesmo já desbloqueada pelo nível — a ferramenta não pode inventar um valor.

## Estado atual (lacuna confirmada)

- Passo "Identidade" do guia (`criar.page.html:369-378`) só pede a palavra de personalidade (com
  validação de "uma única palavra", `criar.page.ts:551-552`). **Não existe nenhum texto explicando
  ao jogador que a descrição e o custo em Energia da Habilidade de Personalidade serão definidos
  depois, em conjunto com o Mestre** — a regra citada acima não é comunicada em nenhum ponto da UI.
- `alvoFortificacoes` (`criar.page.ts:319`) já reflete corretamente a contagem de fortificações por
  nível (7/14), via `shared/regras/agente/progressao.ts` (`calcularProgressaoAcumulada(...).fortificacoes`)
  — essa parte está correta e é reaproveitada nesta spec, tanto no guia quanto na ficha (com o nível
  atual em vez do nível de criação).
- No passo "Habilidades", quando há fortificação disponível, o guia (`criar.page.html:529-544`) só
  pede **nome** e **efeito/descrição** de cada fortificação, só quando `alvoFortificacoes() > 0`.
  **Não existe campo de custo em Energia** — `habilidadesDoNivel` (`criar.page.ts:337-341`) grava
  `custoEnergia: 0` fixo para toda fortificação preenchida.
- A **Habilidade de Personalidade base** (a que o Mestre define logo após a escolha da palavra, antes
  de qualquer fortificação) nunca é criada pelo guia — hoje só existe na ficha se alguém a adicionar
  manualmente pelo editor completo.
- Na ficha já criada, `habilidadePersonalidade` (`ficha-visualizacao.component.ts:2455-2461`) usa
  `.find()` no array `dados.habilidades` e mostra **só a primeira** habilidade de categoria
  `PERSONALIDADE` na aba Extras — se existir mais de uma (ex.: base + fortificações salvas
  manualmente como itens separados), as demais ficam invisíveis nesse card, embora apareçam soltas
  (sem hierarquia nem vínculo entre si) na lista geral da aba Habilidades.
- `custoEnergia` de uma habilidade não é só exibição: `shared/regras/rolagem/rolagem.ts:786` soma o
  `custoEnergia` das habilidades **vinculadas a um teste** para calcular `energiaGasta` — ou seja, a
  Habilidade de Personalidade "em uso" precisa continuar existindo em `dados.habilidades` pra poder
  ser vinculada a uma rolagem (m3-77). Qualquer redesenho não pode remover isso.

## Modelo de dados (`shared/`)

Fonte única de verdade: **no máximo 1** item `categoria: PERSONALIDADE` em `dados.habilidades` a
qualquer momento — o "estágio ativo" materializado. Isso preserva sem nenhuma mudança todo consumidor
que já itera `dados.habilidades` (rolagem/vínculo de Energia, lista de Habilidades, resumo de Extras).
Os 3 rascunhos completos (Base, 1ª, 2ª Fortificação) vivem à parte, dentro de `FichaIdentidadeDto`.

Novo enum `PersonalidadeEstagioEnum` (`BASE`, `FORTIFICACAO_1`, `FORTIFICACAO_2`) em
`shared/src/enums/`.

Novos DTOs de valor em `shared/src/dtos/ficha/ficha.dtos.ts` (campos próprios, sem herança entre DTOs
de negócio — nomes finais a conferir contra a skill `dto-conventions` na implementação):

```ts
/** Texto/custo da Base — sem nome livre: o nome é sempre `identidade.personalidade`. */
interface FichaPersonalidadeEstagioDto {
  readonly descricao: string;
  readonly custoEnergia: number | null;
}

/** Texto/custo/nome de uma Fortificação (1ª ou 2ª) — nome livre, definido com o Mestre. */
interface FichaFortificacaoPersonalidadeDto {
  readonly nome: string;
  readonly descricao: string;
  readonly custoEnergia: number | null;
}

interface FichaPersonalidadeHabilidadeDto {
  readonly ativa: PersonalidadeEstagioEnum;
  readonly base: FichaPersonalidadeEstagioDto | null;
  readonly fortificacao1: FichaFortificacaoPersonalidadeDto | null;
  readonly fortificacao2: FichaFortificacaoPersonalidadeDto | null;
}
```

`FichaIdentidadeDto` ganha `readonly habilidade?: FichaPersonalidadeHabilidadeDto;` — opcional, para
não quebrar fichas anteriores a esta task (mesmo padrão retrocompatível que `identidade` já usa).

Nova função pura em `shared/regras` (ex.: `materializarHabilidadePersonalidade`), recebendo
`FichaIdentidadeDto` e devolvendo `FichaHabilidadeDto | null`: resolve nome (a palavra de
personalidade para Base, ou o `nome` do estágio para Fortificação), `categoria: PERSONALIDADE`,
`descricao` e `custoEnergia` do estágio marcado como `ativa`; `null` se o estágio ativo não tiver
sido preenchido. É a fonte única usada tanto pelo guia de criação quanto pela ficha para sincronizar
o item materializado em `dados.habilidades` — nenhum dos dois duplica essa regra.

## Entregáveis

### Guia de criação (`criar.page.ts` / `.html`)

1. Passo "Identidade": ao lado do campo de personalidade, texto explicativo (não bloqueante,
   informativo) deixando claro que a descrição e o custo em Energia da Habilidade de Personalidade
   serão combinados com o Mestre depois da criação — coerente com a regra citada, sem inventar
   mecânica nova.
2. Passo "Habilidades": a subseção de fortificação vira "Habilidade de Personalidade", **sempre
   visível** (sem gate por `alvoFortificacoes()`), com 3 blocos:
   - **Base**: campos de descrição e custo em Energia (sem campo de nome — o bloco mostra a palavra
     de personalidade escolhida em Identidade como identificação).
   - **1ª Fortificação**: nome, descrição e custo em Energia.
   - **2ª Fortificação**: nome, descrição e custo em Energia.
   Cada bloco tem texto de ajuda deixando claro que o conteúdo é combinado com o Mestre (substitui e
   generaliza o texto de ajuda existente em `criar.page.html:531`, hoje só sobre "melhoria").
3. `melhoriasCompletas`: Base sempre exigida (descrição + custo preenchidos) para avançar o passo; 1ª
   Fortificação só vira obrigatória se `alvoFortificacoes() >= 1`; 2ª só se `>= 2`. Preencher um
   estágio ainda não desbloqueado pelo nível de criação é permitido (o campo aparece, pois a ideia é
   deixar preenchido com antecedência) mas nunca é exigido para avançar.
4. Validar custo como número não-negativo em todos os estágios; sem teto imposto pela ferramenta
   (a regra não fixa um valor máximo).
5. Ao montar a ficha final: os 3 estágios (preenchidos ou não) vão para `identidade.habilidade`. O
   campo `ativa` é calculado automaticamente como o estágio mais alto desbloqueado pelo nível de
   criação — mesma regra de `alvoFortificacoes()` (nível < 7 → Base; 7–13 → 1ª Fortificação; 14+ →
   2ª Fortificação). `habilidadesDoNivel` materializa **só esse um estágio** em `dados.habilidades`
   via `materializarHabilidadePersonalidade`, substituindo o mapeamento atual que gerava um item por
   fortificação preenchida com `custoEnergia: 0` fixo.

### Ficha — aba Extras (`ficha-visualizacao.component.ts` / `.html`)

6. Substituir o card único atual (que hoje mostra só a primeira habilidade `PERSONALIDADE` via
   `.find()`) por uma seção "Habilidade de Personalidade" com:
   - **Seletor de estágio ativo** (Base / 1ª Fortificação / 2ª Fortificação), restrito ao que o
     **nível atual da ficha** já desbloqueia — reusa `calcularProgressaoAcumulada({ classe, nivel:
     dados().nivel }).fortificacoes` (mesma função de `shared/regras/agente/progressao.ts`, sem
     lógica nova).
   - **Os 3 blocos sempre editáveis lado a lado** (Base: descrição + custo; 1ª/2ª: nome + descrição +
     custo), no mesmo padrão de edição inline que a ficha já usa em outros campos (sem página
     separada — ver preferência "Edição no próprio lugar").
7. Qualquer edição em um bloco grava em `identidade.habilidade.<estágio>`. Trocar o seletor atualiza
   só `ativa`. Em ambos os casos, recalcular o item único em `dados.habilidades` via
   `materializarHabilidadePersonalidade` e sincronizar (substituir o item `PERSONALIDADE` existente,
   ou remover do array se o estágio ativo estiver vazio).

### Ficha — aba Habilidades (lista geral)

8. Nenhuma mudança de código nesta aba — ela já renderiza qualquer item de `dados.habilidades`; com o
   novo modelo sempre existirá no máximo 1 item `PERSONALIDADE` ali (o estágio ativo materializado),
   que é "a fortificação atual".

### Retrocompatibilidade

9. Fichas anteriores a esta task não têm `identidade.habilidade`, mas podem ter um item solto
   `PERSONALIDADE` em `dados.habilidades` (criado manualmente pelo editor completo antes desta
   mudança). Ao abrir a aba Extras dessa ficha pela primeira vez, sem `identidade.habilidade`
   definido: se houver um item `PERSONALIDADE` legado em `dados.habilidades`, tratá-lo como o
   conteúdo do estágio correspondente ao nível atual da ficha (herda nome/descrição/custo para Base
   ou para a Fortificação apropriada, conforme a mesma regra de nível), com os demais estágios em
   branco. Sem migração de banco — leitura tolerante no frontend, no espírito do `?.` que
   `identidade` já usa.

## Critérios de Aceite

- No passo Identidade, o texto explicando o papel do Mestre na definição da Habilidade de
  Personalidade está visível perto do campo de personalidade.
- No passo Habilidades, os 3 blocos (Base, 1ª e 2ª Fortificação) estão sempre visíveis,
  independentemente do nível de criação; cada um aceita seu custo em Energia próprio.
- O avanço do passo Habilidades trava por Base sempre, e por 1ª/2ª Fortificação só quando
  `alvoFortificacoes()` já as exige no nível de criação — preencher um estágio ainda não exigido
  nunca é obrigatório.
- A ficha criada grava os 3 estágios em `identidade.habilidade`, com `ativa` apontando para o estágio
  mais alto desbloqueado no nível de criação, e `dados.habilidades` contém exatamente 0 ou 1 item
  `PERSONALIDADE` (o materializado desse estágio).
- Na aba Extras da ficha, o seletor de estágio ativo só oferece as opções desbloqueadas pelo nível
  atual da ficha; trocar o seletor atualiza imediatamente o que aparece na aba Habilidades.
- Editar nome/descrição/custo de qualquer um dos 3 blocos na aba Extras persiste no estágio
  correspondente e, se for o estágio ativo, atualiza o item espelhado em `dados.habilidades`.
- Uma habilidade de Personalidade vinculada a uma rolagem (m3-77) continua consumindo Energia
  normalmente — nenhuma regressão no fluxo de `rolagem.ts`.
- `npm run test -w shared` verde, cobrindo `materializarHabilidadePersonalidade` (Base ativa,
  Fortificação ativa, estágio ativo vazio → `null`).
- `npm run test -w frontend` verde, com testes atualizados/novos em `criar.page.spec.ts` (3 blocos,
  gate por nível, custo gravado) e `ficha-visualizacao.component.spec.ts` (seletor, edição inline,
  sincronização com `dados.habilidades`, retrocompatibilidade com ficha legada).
- Verificação pela skill `verify` em `1920×1080` e `360×800`: criar um agente em nível 14 (desbloqueia
  os 2 estágios de fortificação), preencher os 3 estágios com custo, e na ficha final trocar o
  seletor ativo na aba Extras conferindo que a aba Habilidades espelha a troca.

## Fora de Escopo

- Qualquer fluxo de aprovação do Mestre dentro da ferramenta (chat, revisão, confirmação) — os campos
  de descrição/custo são só um registro do que foi combinado fora da ferramenta.
- Alterar a contagem/gatilho de fortificações por nível (já correta, vem de `progressao.ts`) — esta
  spec só reusa essa contagem para o nível atual da ficha, além do nível de criação.
- Migração de banco/script de backfill para fichas antigas — a retrocompatibilidade é só leitura
  tolerante no frontend (entregável 9).
- Rebatizar `dto-conventions` ou renomear DTOs existentes fora do escopo desta mudança — os nomes
  novos propostos aqui serão conferidos contra a skill na implementação, mas isso não inclui revisar
  nomes de DTOs não relacionados a Personalidade.

## Dependências

`m3-57` (guia base), `m3-58` (melhorias de nível, onde a UI de fortificação já existia),
`m3-77` (tempo real / vínculo de habilidade a rolagem — motivo pelo qual o item materializado precisa
continuar existindo em `dados.habilidades`).
