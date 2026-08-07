# Experimento com Peculiaridade — Origem no guia de criação e pós-criação — design

## Problema

A regra "Experimento com Peculiaridade zera a Origem" (`m3-41`,
`sistema-v4.1.0.md` — "⬡ Subclasse": a habilidade "Peculiaridade" das três subclasses de
Experimento "concede um bônus e uma penalidade desconhecida substituindo seus bônus originais de
Origem") já existe como motor de regras
(`experimentoComPeculiaridade(classe, habilidades)` em `shared/src/regras/identidade/experimento.ts`)
e já é aplicada em dois lugares:

- **Backend**, `FichaService.validarFormaIdentidade` (`backend/src/modules/ficha/ficha.service.ts:638`)
  — rejeita salvar quando `identidade.origem !== null` e `experimentoComPeculiaridade` é `true`.
- **Editor pós-criação**, `ficha-visualizacao.component.ts:1634` (`origemBloqueadaPorPeculiaridade`)
  — trava o mini-editor de Origem e mostra o chip "Substituída pela Peculiaridade".

Mas o **guia de criação** (`criar.page.ts`/`criar.page.html`, `m3-57`) nunca implementou o lado dele
dessa mesma regra, apesar do próprio spec (`docs/specs/done/m3-57-guia-criacao-ficha.spec.md:113-115`
e critério de aceite na linha 141-142) já prever isso. Dois bugs concretos resultam disso:

1. **Na criação.** O passo `// Identidade` sempre exige Origem completa (nome, descrição, 2
   Formações, Especialidade, Saber de Campo — `criar.page.ts:339-348`), sem checar `classe`. A
   habilidade "Peculiaridade" só pode ser escolhida depois, no passo `// Melhorias`, que só existe
   quando o Nível inicial calculado é maior que 0 (`temMelhorias`, `criar.page.ts:164`) — e mesmo
   nesse caso, nada impede escolher as duas coisas. Resultado: um Experimento com Peculiaridade
   preenche Origem sem necessidade, chega em `// Revisão`, clica "Criar ficha" e o **backend
   rejeita** — sem indicação no guia de qual passo voltar nem por quê.
2. **No Nível 0** (o caso mais comum: primeiro agente da campanha), o passo `// Melhorias` **não
   existe** — nenhuma classe ganha vaga de Habilidade de Subclasse no Nível 0
   (`calcularProgressaoAcumulada`, `progressao.ts:38`, conta só a partir do Nível 1). Não há nenhum
   jeito de escolher Peculiaridade na criação, apesar do texto da regra dizer "ao criar seu agente,
   escolha uma característica anômala".
3. **Pós-criação.** Um Experimento já criado, com Origem já definida, que ganha a habilidade
   Peculiaridade depois (subindo de nível) fica com a ficha **permanentemente impossível de salvar**:
   `validarDadosContraRegras` roda em todo `alterarFicha` (`ficha.service.ts:316`) e rejeita enquanto
   Origem e Peculiaridade coexistirem, mas não existe nenhuma ação de UI para limpar uma Origem já
   definida (`ficha-visualizacao.component.ts` só tem editor de **preencher** Origem, nunca de
   removê-la).

## Escopo

Cobre os três pontos acima, todos a mesma causa raiz. Fora de escopo: qualquer mudança na regra de
jogo em si (`sistema-v4.1.0.md`), no catálogo de habilidades, ou no motor `experimentoComPeculiaridade`
— os três já existem e continuam sendo a fonte única.

## 1. Guia de criação — passo `// Habilidades` muda de nome e de posição

`Melhorias` é renomeado para `Habilidades` e passa a vir **antes** de `Identidade` na trilha (hoje
vem depois). Trilha atual (`criar.page.ts:166-169`):

```ts
const base = ['Base', 'Classe', 'Novo agente', 'Atributos', 'Identidade'];
return temMelhorias() ? [...base, 'Melhorias', 'Recursos', ...] : [...base, 'Recursos', ...];
```

Nova ordem:

```ts
const base = ['Base', 'Classe', 'Novo agente', 'Atributos'];
const comHabilidades = temMelhorias() || ehExperimento(classe);
return comHabilidades ? [...base, 'Habilidades', 'Identidade', 'Recursos', ...] : [...base, 'Identidade', 'Recursos', ...];
```

Nenhum outro conteúdo do passo muda (vagas de habilidade + Fortificações de Personalidade continuam
juntos, só a posição/nome mudam). `passoValido('Habilidades')` e a navegação (`ir`/`avancar`/
`voltar`) são atualizados para o novo nome e nova posição — mesma lógica de trava dura já existente.

## 2. Vaga garantida de Habilidade de Subclasse para Experimento, na criação

Hoje `vagasMelhoria` (`criar.page.ts:173-181`) deriva `alvo` de cada vaga só de
`calcularProgressaoAcumulada`. Para as três subclasses de Experimento, o `alvo` da vaga `'classe'`
ganha **+1 fixo na criação**, somado a qualquer vaga que o Nível inicial calculado já desse — mesmo
catálogo/seletor que a vaga `classe` já usa hoje via `gruposParaVaga('classe')`
(`criar.page.ts:301-316`, lista "Habilidades de Subclasse": Adaptabilidade, Carapaça Excessiva, ...,
Peculiaridade). Não é uma vaga nova — é o `alvo` de uma vaga existente ganhando +1 condicional. Isso
espelha o padrão que já existe para a Habilidade Inicial (automática, fora da economia normal de
vagas por Nível).

Precisa de um jeito de checar "é subclasse de Experimento" reusando a mesma lista que
`experimentoComPeculiaridade` já usa — hoje `CLASSES_EXPERIMENTO` é um `const` interno não exportado
em `shared/src/regras/identidade/experimento.ts`. Exportar um novo helper `ehClasseExperimento(classe)`
a partir dessa mesma lista (fonte única, sem duplicar os 3 valores de enum no frontend).

## 3. Passo `// Identidade` reage à Peculiaridade

Com `Habilidades` agora antes de `Identidade`, o guia já sabe, ao chegar em Identidade, se
`experimentoComPeculiaridade(classe, habilidadesEscolhidas)` é `true` (mesma função de
`shared/regras/identidade`, aplicada às habilidades já montadas em `estado().melhorias`).

- **`true`:** o bloco de Origem (`criar.page.html:304-368`) some do template, substituído por uma
  nota curta ("Peculiaridade substitui a Origem — bônus e penalidade a critério do Mestre"; sem
  campo nenhum pra preencher, o bônus/penalidade não é escolha do jogador). `passoValido('Identidade')`
  (`criar.page.ts:339-348`) cai pra exigir só Personalidade — todos os requisitos de Origem somem da
  checagem. O resumo lateral (`criar.page.html:518,616`) mostra "Peculiaridade" no lugar do nome da
  Origem.
- **`false`:** comportamento atual, sem mudança nenhuma.

## 4. Pós-criação — limpar Origem ao adicionar Peculiaridade

No editor de ficha já criada (`ficha-visualizacao.component.ts`), quando o Mestre adiciona a
habilidade "Peculiaridade" a uma ficha de Experimento que já tem `identidade.origem` definida, a UI
oferece limpar a Origem **no mesmo salvamento** (mesmo payload que adiciona a habilidade) — uma
confirmação simples ("Isso vai substituir a Origem atual, que será apagada. Confirma?") antes de
enviar `identidade.origem: null` junto da nova habilidade.

Essa ação é **exclusiva do Mestre**: `validarImutabilidadeIdentidade`
(`ficha.service.ts:716-730`) já trava qualquer mudança em Origem definida quando quem edita é o dono
(`fichaEncontrada.usuarioId === usuarioAtivo.sub`, `ficha.service.ts:317`) — o dono nunca conseguiria
limpar a própria Origem, mesmo com essa ação nova. Mesmo padrão já usado pelo Contrato
(`validarContratoSomenteMestre`) e pela edição livre de Origem já definida
(`origemEditavel`, `ficha-visualizacao.component.ts:1637-1642`). Sem essa oferta explícita, a ficha
fica exatamente como está hoje: travada pra sempre depois que Peculiaridade é adicionada com Origem
ainda presente.

## Critério de verificação (obrigatório antes de fechar)

Verificação **ao vivo** (stack real, skill `verify`):

- Criar um Experimento (uma das três subclasses) do zero (Nível 0), pelo guia: a vaga garantida de
  Habilidade de Subclasse aparece no passo `// Habilidades`; escolhendo Peculiaridade, o passo
  `// Identidade` some com o bloco de Origem e a ficha salva sem erro do backend. Escolhendo
  qualquer outra habilidade de Subclasse (não-Peculiaridade), Origem continua exigida normalmente.
- Criar um Experimento com Nível inicial > 0 (campanha com fichas): mesma checagem, com o passo
  `// Habilidades` mostrando a vaga garantida somada às vagas normais do Nível.
- Criar uma classe não-Experimento: trilha e passo `// Habilidades`/`// Identidade` sem nenhuma
  mudança de comportamento visível.
- Numa ficha de Experimento já criada, com Origem definida: mestre adiciona a habilidade
  Peculiaridade, confirma a limpeza de Origem oferecida, salva com sucesso e o chip "Substituída pela
  Peculiaridade" aparece na Visão Geral. Repetir logado como dono: a oferta de limpar Origem não
  aparece (mesma trava de `origemEditavel`, exclusiva do mestre).
- Mobile (360–430px) e desktop: passo `// Habilidades` na nova posição sem quebra de layout.

## Testes

- `shared/src/regras/identidade/experimento.spec.ts`: novo `ehClasseExperimento` (casos das 3
  subclasses + classes não-Experimento).
- `criar.page.spec.ts`: trilha com `Habilidades` antes de `Identidade`; vaga `classe` com alvo +1 pra
  Experimento em Nível 0 e em Nível > 0; `passoValido('Identidade')` sem exigir Origem quando
  Peculiaridade já foi escolhida; ficha final montada (`construirFichaInicial`) sem `origem` quando
  Peculiaridade está presente.
- `ficha-visualizacao.component.spec.ts`: ação de limpar Origem ao adicionar Peculiaridade, visível
  só pro mestre; payload de salvamento inclui `origem: null` junto da nova habilidade.
- `ficha.service.spec.ts`: já cobre a rejeição de Origem+Peculiaridade (`m3-41`) — sem mudança de
  regra aqui, só confirma que o novo fluxo do frontend nunca chega a mandar esse payload inválido.

## Fora de Escopo

- Qualquer definição mecânica do bônus/penalidade da Peculiaridade em si — o texto da regra já diz
  que é "desconhecida", a critério do Mestre fora do guia.
- Fortificações de Personalidade — continuam exatamente como estão, só acompanham o passo
  `Habilidades` na mudança de nome/posição.
- Mudar a regra de quando vagas de Habilidade de Subclasse normais começam a contar (Nível 1) para
  qualquer classe além do bônus específico de Experimento na criação.

## Dependências

- `m3-41` (`experimentoComPeculiaridade`, `validarFormaIdentidade`), `m3-57` (guia de criação,
  passos `Identidade`/`Melhorias`), `m3-58` (passo `// Melhorias`/vagas), `m3-24`
  (`validarImutabilidadeIdentidade`).
