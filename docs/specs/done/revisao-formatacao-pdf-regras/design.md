# Desenho — gerador próprio do PDF das Regras

> Anexo de [`revisao-formatacao-pdf-regras.spec.md`](../revisao-formatacao-pdf-regras.spec.md).
> Escrito e **aprovado pelo autor em 25/11/2026**, com os downloads da seção final autorizados.

## Intenção

O PDF atual parece uma impressão de tela: capa estourada, sumário longo e sem número de página, páginas quase vazias,
títulos repetidos ou órfãos e tabelas cortadas. O autor quer um **livro de sistema**: conciso, organizado, com
aparência profissional, e **o máximo de controle sobre a geração**. Referências indicadas por ele:

| Referência | O que aproveitar |
|---|---|
| Sistema v4.1.4 exportado do Google Docs (77 páginas) | Densidade: classe com habilidades em colunas, três arquétipos lado a lado numa página, equipamentos e modificações em tabelas compactas, sumário em 2 páginas com número |
| Livro em PDF do Ars Arcana (`Ars-Arcana`, `site-static/src/app/core/pdf/`) | Método e acabamento: desenho por código medindo antes de posicionar, sumário clicável com pontilhado, capítulo no topo, rodapé, marcadores no leitor de PDF, download direto |
| PDF atual (126 páginas no Sistema, 46 no Guia) | O que não repetir |

## Objetivos

1. Gerar os dois livros (Sistema e Guia) como arquivo `.pdf` baixado direto, sem a janela de imprimir.
2. Mesma paginação em qualquer navegador.
3. Aproveitar a página: página com muita sobra só antes de uma quebra forçada (capítulo, classe, arquétipos,
   subclasse).
4. Corrigir os seis problemas apontados: capa, sumário, arquétipos, títulos repetidos/órfãos, tabelas e quadros
   cortados, texto miúdo e claro demais.
5. Reativar a exportação do Sistema depois da aprovação visual do autor.

Meta de tamanho (orientativa, não é critério de aceite): Sistema perto de 85 páginas, Guia perto de 35.

**Não é objetivo:** mudar texto ou regra, mudar o leitor do site, copiar o visual do Docs ou do Ars (a identidade é a
do ContratadosRPG).

**Fracassa se:** tecnicamente gerar, mas ainda parecer print; ou se algum conteúdo do livro sumir sem ninguém perceber.

## Abordagens consideradas

| # | Abordagem | Ganha | Custa |
|---|---|---|---|
| A | Manter a impressão do navegador e refazer só o CSS | Barato; resolve boa parte do desperdício | Sem número de página no sumário; paginação depende do navegador |
| B | Paged.js paginando o HTML antes de imprimir | Reaproveita os componentes; sumário numerado | Dependência com risco em livro grande; ainda passa pela janela de imprimir |
| C | Desenhar o PDF por código, como o Ars Arcana | Controle total; download direto; igual em todo navegador | Um segundo renderizador para cada tipo de bloco, mantido junto com o leitor |

**Escolhida pelo autor: C** ("quanto mais controle, melhor"). A recomendação inicial do agente era B; o custo de C foi
informado antes da escolha.

## Restrições

- Fonte do conteúdo: a **publicação atual** (`GET /livros/<código>/publicada`) projetada por
  `projetarPecasEmRegras`, como a exportação em Markdown. Nunca o rascunho da Oficina nem o `.md` de `docs/core/`.
- Bibliotecas de PDF e fontes carregadas só ao clicar, fora do bundle inicial.
- Cores vêm de uma paleta única do gerador, derivada dos tokens `--papel-*`, `--vida`, energia e níveis de ameaça.
  Nada de hex espalhado pelo código.
- Controle de interface continua o primitivo atual (`app-botao-icone`).

## Decisões de desenho (propostas do agente — corrija o que quiser)

### Página

- A4, margens de cerca de 14 mm. ~~Papel branco, um tema só~~: desde 25/11/2026 segue o tema de quem exporta
  (ver "Ajustes de 25/11/2026" no fim).
- IBM Plex Sans no corpo (cerca de 9,5 pt, texto quase preto), IBM Plex Mono em títulos, rótulos e números, vermelho
  da identidade como acento.
- Topo: nome do capítulo. Rodapé: "Contratados RPG · <livro> · v<versão>" e número da página.

### Estrutura do livro

```
p.1  CAPA (registro oficial em carimbo, logo grande, nome, livro e versão no pé) — uma página
p.2  SUMÁRIO em 2 colunas, com número, pontilhado e link; alvo de até 2 páginas
p.n  CAPÍTULO (nível 1) começa página nova; o resto flui
fim  Crédito de licença do logo (obrigatório, CC BY-SA 3.0)
```

O crédito hoje está fixo em `regras-impressao.component.html` (ver `frontend/public/marcas/LICENCA.md`), fora do
conteúdo do livro. O gerador o repete no fim do arquivo, com teste próprio.

- Marcadores (índice lateral do leitor de PDF) por capítulo e seção.
- Links internos do texto clicáveis.

**Ajuste do autor ao ver a amostra (25/11/2026):** sem "Nova Era" na capa (o subtítulo continua no livro e no site);
registro oficial alinhado à esquerda como no PDF do Docs, uma frase por linha, linhas equilibradas.

**Capa final (25/11/2026), escolhida pelo autor num configurador com um amigo** (substitui o parágrafo acima quanto
ao registro): linha vermelha no topo; registro em carimbo (borda dupla vermelha, inclinado 2°, centrado, Plex itálico
9 pt); logo de 110 mm; "CONTRATADOS" em 45 pt na fonte **Backrooms End Credits**; barra com livro e versão entre duas
linhas no pé (13 pt). Vale para os dois livros. A fonte foi enviada pelo autor, não traz licença e só cobre A–Z e
pontuação básica (fora disso o nome sai no mono): confirmar o direito de uso antes de publicar.
Código escolhido: `livro=guia;ordem=rln;topo=sim;papel=branco;faixaPos=pe;faixaEstilo=linhas;faixaFonte=mono;faixaPt=13;logo=110;nomeFonte=backrooms;nomePt=45;regPos=centro;regAlinha=center;regEstilo=carimbo;regFonte=sans;regPt=9`.
Configurador: <https://claude.ai/artifact/89HvZrX1cBQthZLen8FwzW>.

### Densidade por tipo de conteúdo

| Conteúdo | No PDF |
|---|---|
| Texto corrido, listas, notas, exemplos, fórmulas | Uma coluna; caixas compactas |
| Habilidades (de classe, gerais, de subclasse) | 2 colunas |
| Classe | Começa página nova: citação, saúde e progressão no topo; habilidades em colunas abaixo, seguindo na próxima página se preciso |
| Arquétipos | Começam página nova, os três lado a lado em 3 colunas; se não couber, as colunas continuam na seguinte (sem reduzir a letra) |
| Subclasses (Experimentos) | Cada uma começa página nova, habilidades em colunas |
| Equipamentos, modificações, amplificadores | Tabelas com faixa de cabeçalho e linhas zebradas |
| Origens, atributos, maestrias, penalidades | Grades de 2 ou 3 colunas |
| Ficha de criatura | Bloco próprio, estilo ficha |

### Regras de quebra

- Título nunca fica sozinho no pé da página.
- Cabeçalho de tabela repete na página seguinte; linha, habilidade e quadro curto não se partem.
- Título que o conteúdo repete (nome do arquétipo) aparece uma vez só.

### Aplicação

- O mesmo botão "Exportar PDF" gera e baixa `Contratados RPG - <livro> - v<versão>.pdf`, com estado de "gerando" e
  aviso de erro.
- Sem geração no servidor nem arquivo pré-pronto: é feito no navegador de quem clica.
- Quando os dois livros forem aprovados, a impressão antiga (`regras-impressao.*`) é removida.

### Arquitetura

```
modules/regras/pdf/            (TypeScript puro, sem Angular; carregado sob demanda)
  compositor      NormalizadoDocumento -> jsPDF
  fluxo           colunas, medida antes de desenhar, quebras
  texto rico      negrito, itálico, tarja, recurso colorido, selo de NA, links
  tabela          desenho próprio
  blocos/         um desenhista por tipo de bloco
  paleta, fontes
modules/regras/regras-exportacao-pdf.service.ts   busca a publicação, carrega o compositor e baixa
```

- **Dependência:** `jspdf` (versão atual, 4.x). **Sem** `jspdf-autotable`, diferente do Ars: as células das nossas
  tabelas têm negrito, tarja, cor e link, que ele não desenha.
- **Fontes:** TTF do IBM Plex (licença OFL) versionados em `frontend/public/fonts/pdf/`. O site hoje usa Google Fonts,
  que não serve para embutir no PDF. Os glifos que a fonte não tiver (⬢ ⬡ ⬥ ⬦ ◈ ◻ ■ □ ▢) são desenhados como figura.
- **Nada some em silêncio:** o compositor consome os tipos de `shared/src/livro/regras-formato.ts`
  (`NormalizadoDocumento`), e não o espelho manual `regras.model.ts`; o despacho por `tipo` é exaustivo (tipo novo
  sem desenhista quebra o build) e um teste compara o texto do documento com o texto desenhado.
- **Logo:** o jsPDF não desenha SVG sozinho; usar a versão em PNG ou desenhar os caminhos.

## Entrega em fatias

1. **Corte de aprovação:** base do gerador + capa, sumário, Introdução, uma classe com os arquétipos e uma categoria
   de equipamento com modificações. O autor aprova o visual antes de seguir.
2. Demais blocos do Sistema.
3. Guia de Mestre.
4. Botão troca para o gerador novo, Sistema reativado, impressão antiga removida, `P-108` encerrado.

Sumário, rodapé e número de página já entram na fatia 1.

## Verificação

- Testes de fluxo (quebra, colunas, repetição de cabeçalho) e de cobertura de texto.
- PDFs dos dois livros renderizados e **todas** as páginas olhadas antes de pedir aprovação.
- Botão conferido na aplicação em `1920×1080` e `360×800`; geração conferida no Chrome, Edge e Firefox.
- Aprovação visual do autor é o critério final.

## Fica a cargo de quem implementar

Medidas finas (corpo, entrelinha, margens, largura de colunas), nomes internos, como desenhar os ícones de classe e
arquétipo a partir do conjunto que o site já usa, e a divisão dos arquivos.

## Efeito na spec

Se aprovado, a spec passa a `active/` com: Entregável 2 trocado de "ajustar a impressão nativa" para este desenho, e
"substituir a impressão nativa" retirado do Fora de Escopo. `I-056` (Paged.js) continua só como ideia.

## Pendências que só o autor decide

1. **Aprovar este desenho.**
2. **Downloads:** `jspdf@4.2.1` (npm, MIT, cerca de 30 MB descompactado, três dependências: `@babel/runtime`,
   `fflate`, `fast-png`) e as fontes de `@ibm/plex-sans@2.0.0` (cerca de 4,2 MB) e `@ibm/plex-mono@2.5.0` (OFL);
   dos pacotes de fonte só entram os TTF usados. Se não trouxerem TTF, perguntar antes de buscar em outra fonte.
3. **Dados locais:** o banco local publica o Sistema **4.1.4**; `docs/core/` já está na **4.1.5**. Convém atualizar a
   base local antes do corte de aprovação (muda o banco de desenvolvimento). Sem isso, o corte é feito sobre a 4.1.4,
   e a conferência final fica para a 4.1.5.

## Ajustes de 25/11/2026 (pedidos pelo autor sobre os livros completos)

- **Tema:** `temaDoPdf(base, destaque)` em `paleta.ts`. O gerador pede papéis de cor (`texto`, `destaque`…) e o
  pincel resolve. A base escura repete os tokens do site; Vida, Energia e níveis de ameaça não mudam com o destaque.
  Logo preto no claro, branco no escuro (`LOGO_DO_PDF`).
- **Ícones:** vetoriais, lidos do `<svg>` do componente `Icone` (`icones.ts`), sem copiar a geometria. Quem gera
  entrega o desenho pronto; sem ele ficam os símbolos.
- **Texto:** justificado o texto corrido (não a última linha, nem a quebra do próprio texto, nem linha que abriria vão
  maior que 2,4 mm; dados como a linha de ataque ficam soltos). O trecho entre quebras não se parte entre colunas.
- **Arquétipos:** um trio por página; quando não cabe, aperta entrelinha e depois letra, até 0,88 (7,4 pt). Se nem
  assim couber, volta ao tamanho normal e continua na página seguinte.

**Para o entregável 4:** o serviço de exportação renderiza `ICONES_DO_PDF` pelo componente `Icone` e passa a
`temaDoPdf` os valores `base()` e `accentAplicado()` do `TemaService`.
