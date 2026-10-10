# Usabilidade 02 — Descoberta e comparação de arquétipos

> Task 2/6 da revisão pública de 09/10/2026; achado U-02 do [relatório](../backlog/usabilidade-classes-condicoes-2026-10-09/RELATORIO.md). Quebra em specs solicitada pelo autor. Prioridade alta.

## Objetivo

Permitir encontrar e comparar arquétipos ao consultar uma classe nas Regras, antes de percorrer
o catálogo completo de habilidades. Explicitar a diferença entre escolha inicial e consulta de habilidades.

## Entregáveis

1. Resumo/comparação dos arquétipos junto do resumo da classe, antes do catálogo longo:
   identidade, atributos bônus e habilidade inicial de cada um, conforme a fonte.
2. Catálogo completo preservado abaixo, com separação clara entre habilidades de classe e
   de arquétipo; abas/painéis mantêm uma indicação clara da seleção atual.
3. Navegação direta aos arquétipos, incluindo retorno por fragmento/deep link e descoberta
   pelo sumário. Destinos existentes de classe continuam válidos.
4. Proposta e evidências em `usabilidade-02-consulta-arquetipos/`; capturas locais em
   `.artifacts/usabilidade-02-consulta-arquetipos/`.

## Critérios de Aceite

Nas três classes base, a comparação dos arquétipos aparece antes da lista integral de
habilidades. Nome, bônus e habilidade inicial correspondem ao livro; nenhuma habilidade ou
condição de acesso é omitida, duplicada ou reinterpretada. Pesquisa continua encontrando o
conteúdo, com destino/highlight corretos após a reorganização; recarga de links abre o destino.

Análogo inicial: `RegrasClasse` e `RegrasArquetipos` atuais. Registrar shell, densidade, hierarquia,
controles e responsividade antes de alterar. Usar os primitivos existentes e consultar o autor
se faltar cobertura na biblioteca. Não editar o Markdown autoral para rearranjar a UI.

Usar `verify` em 1920×1080, 1366×768, 960×1080 e 360×800: cada classe/arquétipo, troca de
painel, sumário/gaveta, comparação, pesquisa, deep link/recarga e teclado. Conteúdo legível,
sem overflow da página e controles com foco visível. Registrar fidelidade visual, testes de
navegação/renderização proporcionais, build, lint e `repo:verificar`.

## Fora de Escopo

Alterar efeitos, custos ou progressão; reescrever o livro; refazer criação de ficha ou a escolha
na Simulação (task 01). Não encerrar a revisão geral do sistema por este recorte público.

## Dependências

Constituição/convenções, design e tema; Sistema vigente, Classes e Arquétipos; normalizador,
modelo/renderers e contratos atuais de sumário, pesquisa e âncoras das Regras.
