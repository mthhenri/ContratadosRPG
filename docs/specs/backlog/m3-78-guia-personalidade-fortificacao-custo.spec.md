# m3-78-guia-personalidade-fortificacao-custo.spec.md

> Ajuste pós-milestone do M3 — Guia de Criação de Ficha. Pedido direto do autor: "revisar como
> funciona as fortificações da personalidade e também adicionar a descrição da habilidade de
> personalidade e seu custo dentro do guia de criação de agentes".

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
vive só no documento de sistema. O custo em Energia de cada fortificação **não é fixo pelo
documento** (é definido caso a caso pelo Mestre, junto com o efeito) — o exemplo do documento mostra
valores crescentes só como ilustração de uma personalidade específica, não como tabela universal.

## Estado atual (lacuna confirmada)

- Passo "Identidade" do guia (`criar.page.html:369-378`) só pede a palavra de personalidade (com
  validação de "uma única palavra", `criar.page.ts:551-552`). **Não existe nenhum texto explicando
  ao jogador que a descrição e o custo em Energia da Habilidade de Personalidade serão definidos
  depois, em conjunto com o Mestre** — a regra citada acima não é comunicada em nenhum ponto da UI.
- `alvoFortificacoes` (`criar.page.ts:319`) já reflete corretamente a contagem de fortificações por
  nível (7/14), via `shared/regras/agente/progressao.ts` — essa parte está correta.
- No passo "Habilidades", quando há fortificação disponível, o guia
  (`criar.page.html:529-544`) só pede **nome** e **efeito/descrição** de cada fortificação. **Não
  existe campo de custo em Energia** — `habilidadesDoNivel` (`criar.page.ts:337-341`) grava
  `custoEnergia: 0` fixo para toda fortificação, independentemente do que o documento prevê (custo
  definido junto com o Mestre, tipicamente maior que zero).
- A **Habilidade de Personalidade base** (a que o Mestre define logo após a escolha da palavra, antes
  de qualquer fortificação) nunca é criada pelo guia — hoje só existe na ficha se alguém a adicionar
  manualmente pelo editor completo (`ficha-visualizacao.component.ts`, busca por
  `HabilidadeCategoriaEnum.PERSONALIDADE`).

## Entregáveis

1. No passo "Identidade", ao lado do campo de personalidade, adicionar um texto explicativo (não
   bloqueante, informativo) deixando claro que a descrição e o custo em Energia da Habilidade de
   Personalidade serão combinados com o Mestre depois da criação — coerente com a regra citada, sem
   inventar mecânica nova.
2. No passo "Habilidades", cada fortificação (quando `alvoFortificacoes() > 0`) ganha um campo
   numérico de **custo em Energia**, ao lado de nome e efeito — substituindo o `custoEnergia: 0`
   fixo por um valor informado pelo jogador (combinado com o Mestre fora da ferramenta, já que o
   guia não tem canal de aprovação do Mestre em tempo real). Validar como número não-negativo; sem
   valor mínimo/máximo imposto pela ferramenta, já que a regra não fixa um teto.
3. Texto de ajuda do campo de custo deixando claro que o valor é definido em conjunto com o Mestre,
   coerente com a citação acima ("completamente decidido pelo Mestre em conjunto com o Jogador").
4. Revisão do texto de ajuda já existente ("Uma melhoria da Habilidade de Personalidade — o Mestre
   define o efeito final em conjunto com você", `criar.page.html:531`) para não conflitar com o novo
   campo de custo.
5. Não criar automaticamente a Habilidade de Personalidade base no guia — isso está fora do fluxo
   atual (a personalidade em si, sem fortificação, não é uma "habilidade" com custo definido pela
   ferramenta; ver "Fora de Escopo").

## Critérios de Aceite

- No passo Identidade, o texto explicando o papel do Mestre na definição da Habilidade de
  Personalidade está visível perto do campo de personalidade.
- No passo Habilidades, ao preencher uma fortificação (nível 7 e/ou 14, conforme o nível de criação),
  é possível informar nome, descrição e **custo em Energia**; a ficha criada grava esse custo
  informado, não mais `0` fixo.
- Deixar o custo em branco continua bloqueando o avanço do passo, na mesma régua de completude que
  já existe para nome/descrição (`melhoriasCompletas`).
- `npm run test -w frontend` verde, com teste de regressão cobrindo o novo campo de custo
  (`criar.page.spec.ts`, atualizando o teste existente que hoje só checa nome/categoria).
- Verificação pela skill `verify` em `1920×1080` e `360×800`: criar um agente em nível 7+ com pelo
  menos uma fortificação preenchida, incluindo custo, e conferir a ficha final.

## Fora de Escopo

- Criar automaticamente a Habilidade de Personalidade "base" (sem fortificação) durante o guia — o
  documento deixa essa definição inteiramente a cargo de uma conversa com o Mestre depois da
  criação; nada garante que ela exista no momento da criação da ficha. Se o autor quiser abrir esse
  fluxo, é uma spec separada.
- Qualquer fluxo de aprovação do Mestre dentro da ferramenta (chat, revisão, confirmação) — o campo
  de custo é só um registro do que foi combinado fora da ferramenta.
- Alterar a contagem/gatilho de fortificações por nível (já correta, vem de `progressao.ts`).

## Dependências

`m3-57` (guia base), `m3-58` (melhorias de nível, onde a UI de fortificação já existe).
