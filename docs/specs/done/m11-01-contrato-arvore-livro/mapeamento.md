# Mapeamento `RegrasBloco`/`RegrasSecao` → peça (proposta para revisão do autor)

> Anexo da [`m11-01`](../m11-01-contrato-arvore-livro.spec.md). **Proposta**: nenhum tipo foi
> escrito no `shared/` ainda. Regra de corte da umbrella: tem identidade (linkável, comparável,
> aparece na ficha) → **peça**; só conteúdo → fica no `dados` da peça-mãe.
> Contagens vêm de `frontend/public/regras/{sistema,guia}.json` em 10/10/2026
> (Sistema 4.1.4 / Guia 4.2.0). Nenhum bloco `generico` existe hoje em nenhum dos dois.

## Peça por tipo atual

| Tipo atual | Ocorrências (S / G) | Vira | `dados` da peça | Filhos (peças) |
|---|---|---|---|---|
| `secao` | 207 / 103 | `SECAO` | `titulo`, `nivel` (1–4), `glifo`, `origemTabela?` | seções e blocos |
| `paragrafo` | 257 / 185 | `PARAGRAFO` | `trechos` | — |
| `exemplo` | 9 / 3 | `EXEMPLO` | `trechos` | — |
| `formula` | 5 / 9 | `FORMULA` | `trechos` | — |
| `nota` | 9 / 2 | `NOTA` | `trechos` | — |
| `lista` | 18 / 17 | `LISTA` | `ordenada`, `inicio`, `itens` (blocos sem identidade, ver D6) | — |
| `tabela` | 13 / 29 | `TABELA` | `cabecalho`, `linhas` | — |
| `habilidade` | 172 / 12 | `HABILIDADE` | `nome`, `custo`, `reacao`, `glifo`, `trechos` | — |
| `classe` | 3 / 0 | `CLASSE` | `nome`, `citacao`, `saude`, `progressao` | `HABILIDADE`s da classe e `ARQUETIPO`s |
| `arquetipos` (+ `classe.arquetipos`) | 3 / 0 | `ARQUETIPO` (um por arquétipo) | `nome`, `citacao`, `atributosBonus` | `HABILIDADE`s e habilidades gerais melhoradas |
| `subclasse` | 3 / 0 | `SUBCLASSE` | `nome`, `classe`, `citacao`, `custos`, `saude`, `progressao`, `atributosBonus` | `HABILIDADE` inicial e demais |
| `origens` | 1 / 0 | container `ORIGENS` → `ORIGEM` (uma por origem) | `nome`, `citacao`, `formacao`, `especialidade`, `saberCampo` | — |
| `termos` | 4 / 0 | container `TERMOS` → `TERMO` | container: `variante`; termo: `nome`, `numero?`, `rotulo?`, `descricao` | — |
| `equipamentos` | 9 / 0 | container `EQUIPAMENTOS` → `EQUIPAMENTO` | container: `categoria`; item: custo, descrição, peso, porte, danos, especificações, duração | — |
| `modificacoes` | 7 / 0 | container `MODIFICACOES` → `MODIFICACAO` | container: `categoria`, `nota?`; item: `nome`, `empilhamento`, `efeito`, `bloqueia` | — |
| `amplificadores` | 1 / 0 | container `AMPLIFICADORES` → `AMPLIFICADOR` | item: `nome`, `empilhamento`, `efeito` | — |
| `modulos` | 1 / 0 | `MODULOS` | `modulos[]` (nível, energia máxima) | — (linhas sem identidade própria, ver D4) |
| `niveis-ameaca` | 1 / 0 | `NIVEIS_AMEACA` | `niveis[]` (nível, referência de imagem, descrição) | — (ver D4) |
| `ficha-criatura` | 0 / 1 | `FICHA_CRIATURA` | identidade, atributos, vida, defesa, resistências, fraquezas, regeneração, porte, deslocamento, cadência, ataques | `HABILIDADE_CRIATURA`s |
| `habilidade-criatura` | 0 / 6 | `HABILIDADE_CRIATURA` | `nome`, `categoria`, `rotulo`, `trechos` | — |
| `roteiro` | 0 / 2 | `ROTEIRO` | `etapas[]` (ordem, título, descrição) | seções e blocos de `introducao`/`conclusao`/`filhos` |
| `faixas` | 1 / 0 | `FAIXAS` | `itens[]` (rótulo, valor) | — (ver D3) |
| `grade` | 9 / 0 | `GRADE` | `colunas`, `cabecalho`, `linhas` | — (ver D3) |
| `abertura` | 1 / 1 | `ABERTURA` | `titulo`, `trechos` | — |
| `capa` | 1 / 1 | **não é peça**: metadados do livro no envelope (`titulo`, `subtitulo`, `numero`) | — | — |
| `generico` | 0 / 0 | `GENERICO` (reserva) | `motivo`, `trechos` | — |
| `identidade`, `atributos` | em `ficha-criatura` | **não são peças**: ficam no `dados` de `FICHA_CRIATURA` | — | — |

Tipos de peça resultantes (para `TipoRegraPecaEnum`): `SECAO`, `PARAGRAFO`, `EXEMPLO`, `FORMULA`,
`NOTA`, `LISTA`, `TABELA`, `HABILIDADE`, `CLASSE`, `ARQUETIPO`, `SUBCLASSE`, `ORIGENS`, `ORIGEM`,
`TERMOS`, `TERMO`, `EQUIPAMENTOS`, `EQUIPAMENTO`, `MODIFICACOES`, `MODIFICACAO`, `AMPLIFICADORES`,
`AMPLIFICADOR`, `MODULOS`, `NIVEIS_AMEACA`, `FICHA_CRIATURA`, `HABILIDADE_CRIATURA`, `ROTEIRO`,
`FAIXAS`, `GRADE`, `ABERTURA`, `GENERICO`. (A umbrella cita `CONDICAO`: hoje as condições vivem em
`TERMOS`/seções do Sistema; ver D5.)

## Decisões para o autor

**D1 — Campos de auditoria da fonte (`RegrasFonteTabela`).** Hoje quase todo bloco rico carrega
`cabecalho`/`linhas` "na ordem da fonte, inclusive vazias, para auditoria sem reconstruir Markdown".
Com o banco como fonte da verdade, isso duplicaria o conteúdo e daria dois lugares para editar.
*Proposta:* **não migrar** esses campos; só os campos estruturados entram no `dados`. A paridade com
o `.md` é provada na `m11-03` (ida e volta), não carregada no dado. *Alternativa:* manter como
campo opcional somente leitura (custo: peso morto e risco de divergir após a primeira edição).

**D2 — Arquétipos aparecem em dois lugares.** `RegrasClasse.arquetipos` (nome + habilidade
inicial) e `RegrasClasse.filhos: RegrasArquetipos[]` (lista rica por classe) descrevem as mesmas
entidades. *Proposta:* uma só representação — peça `ARQUETIPO` filha de `CLASSE`; a "habilidade
inicial" é a primeira `HABILIDADE` filha (marca `inicial: true` no `dados`), o que alinha com o
esqueleto da `m11-07`. A projeção resumida usada pelo leitor passa a ser derivada, não armazenada.

**D3 — Blocos de apresentação (`grade`, `faixas`, `abertura`, `capa`, `generico`).**
*Proposta:* `GRADE` e `FAIXAS` viram peças próprias com as células/itens no `dados` (editáveis na
`m11-08`). **Revisto após reler as Regras em 10/10 (ver D8):** a projeção `referencia` das três
grades reconhecidas (Saúde do Civil, Tipos de Alcance, Afinidade) **é armazenada** como a estrutura
da peça, não derivada. `ABERTURA`
é peça (texto oficial editável). `capa` sai da árvore e vai para o envelope porque repete título e
versão do livro. `GENERICO` fica como peça de reserva (nenhuma hoje), para o importador nunca perder
conteúdo, sem `origemMarkdown`.

**D4 — Linhas sem identidade.** `modulos` e `niveis-ameaca` são tabelas de poucas linhas fixas.
*Proposta:* uma peça por tabela, linhas no `dados` (sem `identificador` por linha). Se algum dia uma
linha precisar ser linkada ou aparecer na ficha, vira peça filha. Equipamento, modificação,
amplificador, termo e origem **são** peças (linkáveis e comparáveis item a item) — é o que dá o
"o que mudou" por equipamento.

**D5 — `CONDICAO`.** A umbrella lista condição como peça. No contrato atual não há bloco de
condição; elas são seções/verbetes. *Proposta:* não criar o tipo agora; condição é `SECAO` nível
verbete ou `TERMO` conforme já está no livro, e um tipo `CONDICAO` só entra se o autor quiser
distinguir (custo: o importador precisa reconhecê-las). Confirmar onde estão no Sistema.

**D6 — Conteúdo dentro de lista.** `lista.itens` é `RegrasBloco[][]` (blocos dentro de itens).
*Proposta:* a lista é uma peça só e os itens ficam no `dados`, restritos a `PARAGRAFO`, `LISTA`,
`NOTA`, `EXEMPLO` e `FORMULA` sem identidade própria. Link interno não aponta para dentro de item.

**D7 — Divergência de contagem.** A umbrella fala em "as 11 grades" do diagnóstico; os JSONs de
hoje têm **9** blocos `grade` (e 0 no Guia), das quais 3 com `referencia`, mais 4 tabelas com
`pares`. Provavelmente as outras são tabelas ainda tratadas
como `tabela` ou foram reclassificadas depois do diagnóstico. Será conferido contra o
`normalizar-regras.mjs` no início da `m11-03`; sem impacto no contrato desta task.

**D8 — Projeções que o normalizador deduz do texto (achado da releitura, commits RV-01…RV-04).**
Depois das últimas revisões visuais, parte da estrutura que o leitor usa **não está no `.md`**: o
normalizador a deduz por assinatura de texto — `regras-grades.mjs` (regex sobre três grades:
`referencia` `saude`/`cartoes`), `tabela.pares` (4 tabelas em duas metades), `faixas` do
Deslocamento, `variante` de `termos`, `origemTabela` de seção, categoria de equipamentos. Com o
banco como fonte e o normalizador aposentado (`m11-10`), reconhecer por regex no momento da
leitura não serve: o que o autor edita precisa ser o dado, senão uma edição de texto quebra o
reconhecimento. *Proposta:* **o importador (`m11-03`) roda os reconhecedores uma única vez e grava
o resultado como estrutura explícita no `dados`**; depois disso, a apresentação é um campo da peça
(`GRADE.apresentacao`: `saude` | `cartoes` | `generica`; `TABELA.pares: boolean`; `FAIXAS.itens`), e o
leitor só lê. O `cabecalho`/`linhas` brutos das três grades de referência deixam de ser guardados
(consequência de D1). Sem isso o contrato perderia justamente o que foi refinado nas últimas
revisões visuais. Os reconhecedores continuam existindo só como etapa do importador e como
fixtures de teste da ida e volta.

## Regras de aninhamento (implementadas em `shared/src/livro/aninhamento.ts`)

- Raiz do livro aceita `ABERTURA`, `SECAO` e os blocos de conteúdo.
- `SECAO` aceita `SECAO` e os blocos de conteúdo; `CLASSE` só `HABILIDADE` e `ARQUETIPO`;
  `ARQUETIPO` e `SUBCLASSE` só `HABILIDADE`; containers (`ORIGENS`, `TERMOS`, `EQUIPAMENTOS`,
  `MODIFICACOES`, `AMPLIFICADORES`) só o item correspondente.
- `FICHA_CRIATURA` aceita `HABILIDADE_CRIATURA`, `SECAO` e texto simples (`PARAGRAFO`, `NOTA`,
  `EXEMPLO`, `LISTA`) — os dados reais do Guia têm esses filhos além das habilidades.
- `ROTEIRO` aceita `SECAO` e texto simples; as primeiras `introducaoQuantidade` filhas aparecem
  antes das etapas e as últimas `conclusaoQuantidade` depois (`dados` do roteiro).
- Os demais blocos não têm filhos.
- `ancora` é opcional (`null`): nem toda peça é linkável; quando existe, é única por livro.
- `TABELA.emPares` é a apresentação das 4 tabelas em duas metades (as metades são derivadas das
  colunas, não guardadas).
- Pendências: `ESTRUTURAL` (identificador/âncora duplicados, filho não permitido, `dados` fora da
  forma, link sem identificador) impede qualquer publicação; `CONTEUDO` (campo vazio, link para peça
  removida) impede só a versão.
