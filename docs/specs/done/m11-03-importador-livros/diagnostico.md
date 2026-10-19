# Diagnóstico da importação (m11-03) — para revisão do autor

> Anexo da [`m11-03`](../m11-03-importador-livros.spec.md). Gerado em 10/10/2026 a partir de
> `docs/core/sistema-v4.1.5.md` e `docs/core/guia_de_mestre-v4.2.0.md`, lidos pelo normalizador atual.
> **Nenhuma decisão foi tomada pelo agente**: cada item trazia a recomendação e as respostas do
> autor (10/10/2026) estão registradas nas colunas *Decisão do autor* e nas perguntas 1 a 4.

## 1. Grades e tabelas de layout

A umbrella citava "11 grades". Os JSONs de hoje têm **9 blocos `grade`** (todos no Sistema; o Guia
tem 0) e **4 tabelas em pares**. A contagem de 11 não se reproduz com o normalizador atual, que já
absorveu algumas em reconhecedores explícitos; o diagnóstico vale pelos 9 + 4 abaixo.

| # | Onde (Sistema) | Colunas | Hoje | Peça na importação | Recomendação | Decisão do autor |
|---|---|---|---|---|---|---|
| 1 | Jogando como um Civil > Saúde | 2 | reconhecida (`saude`) | `GRADE` `saude` | manter | — |
| 2 | Cenas > Combate > Tipos de Alcance | 3 | reconhecida (`cartoes`) | `GRADE` `cartoes` | manter | — |
| 3 | Fragmentos > Afinidade > Limite mínimo de Energia | 6 | reconhecida (`cartoes`) | `GRADE` `cartoes` | manter | — |
| 4 | Testes > Dificuldade de Teste (DT) | 3 | genérica (aviso L1221) | `GRADE` `generica` | manter genérica editável; ou virar `cartoes` | **Manter genérica** |
| 5 | Aposentadoria > Se Tornar um Funcionário (1ª) | 2 | genérica (aviso L1838) | `GRADE` `generica` | manter genérica editável | **Manter genérica** |
| 6 | Aposentadoria > Se Tornar um Funcionário (2ª) | 2 | genérica (aviso L1845) | `GRADE` `generica` | manter genérica editável | **Manter genérica** |
| 7 | Aposentadoria > Sair da Fundação SCP | 2 | genérica (aviso L1860) | `GRADE` `generica` | manter genérica editável | **Manter genérica** |
| 8 | Fragmentos > Função > Potencializador | 5 | genérica (aviso L1942) | `GRADE` `generica` | manter genérica editável | **Manter genérica** |
| 9 | Fragmentos > Função > Construtor | 5 | genérica (aviso L1954) | `GRADE` `generica` | manter genérica editável | **Manter genérica** |

Tabelas em pares (viram `TABELA` com `emPares`, as metades são derivadas das colunas):
Formação (Grupo/Bônus), Níveis e Melhorias de Agente (Nível/Bônus), Corpo e Pontuação Corporal
(Pontuação/Dano), Treinamentos (Treinamento/Bônus). Nenhuma decisão pendente.

**Pergunta 1 — grades genéricas (#4 a #9).** Todas ficam como `GRADE` `generica` (células na ordem da
fonte, editáveis na m11-08, visual idêntico ao de hoje). Alternativa: ajustar o `.md` para o
normalizador reconhecê-las — só vale se alguma deve ganhar um visual novo (hoje elas já saem como
caixas). **Decisão do autor (10/10/2026): manter genéricas.**

## 2. Avisos restantes do normalizador

| Aviso | Quantidade | O que acontece na importação | Recomendação | Decisão do autor |
|---|---|---|---|---|
| Âncora repetida (`saude` → `saude-2` etc.) | 7 no Sistema, 9 no Guia | A âncora com sufixo é gravada como está; as URLs publicadas continuam valendo (spec, item 3). | manter; na Oficina o autor pode renomear (a antiga continua resolvendo) | Preservado como está por exigência da spec (item 3); sem alteração de comportamento |
| Tabela de layout sem assinatura explícita | 6 (as grades #4 a #9) | tratadas na pergunta 1 | ver pergunta 1 | **Manter genérica** |
| Link interno sem destino | 0 | — | — | — |
| Bloco genérico | 0 | `GENERICO` fica reservado; o conversor nunca perde conteúdo (lança erro) | — | — |

## 3. O que a importação não leva (diferenças aceitas na ida e volta)

A prova (`importador.spec.ts`) compara a fotografia, projetada de volta no formato do leitor, com o
JSON gerado hoje, campo a campo. Só estas diferenças existem — todas por decisão já tomada na m11-01
(D1, D3, D8) ou consequência direta dela:

1. **Campos de auditoria `cabecalho`/`linhas`** dos blocos que já têm campos estruturados
   (arquétipos, subclasse, termos, equipamentos, modificações, amplificadores, módulos, níveis de
   ameaça, faixas, identidade/atributos da ficha) e das 3 grades de referência: não são guardados.
   Tabelas, classes, origens e grades genéricas **mantêm** suas células.
2. **Ficha de criatura:** `identidade`/`atributos` e as 3 habilidades aparecem no JSON de hoje também
   dentro das seções da ficha; na fotografia ficam uma só vez (no `dados` da ficha e como filhas).
3. **Link interno** ganha o `identificador` da peça de destino (a `ancora` continua igual).
4. **Capa:** sai da árvore e vai para o envelope (`titulo`, `subtitulo`, `numero`); o selo de versão
   viaja na `ABERTURA` (pergunta 2) e o título "Contratados" é fixo no leitor (pergunta 3).

Pontos que dependiam do autor (respondidos):

**Pergunta 2 — selo "VERSÃO x.y.z" da capa.** Hoje só o Sistema tem o selo (`VERSÃO 4.1.4`); o Guia não
tem. O envelope guarda só o número da versão, então o leitor não saberia em qual livro mostrar.
Opções: (a) o leitor mostra o selo nos dois livros, derivado de `numero` (o Guia ganharia um selo que
não tem hoje); (b) o selo continua só no Sistema, como regra do leitor por código do livro; (c) a
peça `ABERTURA` ganha um campo opcional de selo (editável na Oficina, preserva exatamente o de hoje).
**Decisão do autor (10/10/2026): (c).** Implementado: `LivroAberturaDadosDto.selo?` (shared); o
conversor leva `capa.versao` do Sistema ("VERSÃO 4.1.4") para a `ABERTURA`, o Guia não ganha selo e a
projeção devolve a capa idêntica à de hoje.

**Pergunta 3 — título da capa "Contratados".** É o mesmo texto fixo nos dois livros (a marca). A
projeção o fixa no leitor em vez de guardá-lo. **Decisão do autor (10/10/2026): fixo no leitor** (é a
marca, não conteúdo de livro).

## 4. Versões anteriores

Fora do escopo implementar, mas a spec pede registrar a decisão. **Pergunta 4 — alguma versão
anterior à 4.1.4 (Sistema) / 4.2.0 (Guia) deve entrar como fotografia só de leitura?** Hoje não há
`.md` anterior no repositório além do histórico do Git. **Decisão do autor (10/10/2026): nenhuma**; a primeira
fotografia é a vigente e o comparador (m11-05) passa a valer a partir dela.
