# p-102-referencias-documentos-vigentes.spec.md

> Task documental de PROBLEMS P-102. **Spec preparada; sem correção/commit nesta rodada.**

## Objetivo

Alinhar os ponteiros operacionais aos livros atuais, mantendo citações históricas das
versões anteriores e sem alterar as regras autorais como efeito de uma troca de nome.

## Entregáveis

1. Conferir cada referência antiga em README, SCHEMA, docs/design, specs ativas/backlog
   e comentários de código corrente. Trocar ponteiro que afirma “fonte atual” por
   Sistema v4.1.3/Guia v4.2.0, após confirmar correspondência da seção.
   Exemplos já localizados: README25–26; SCHEMA320/487/497; FICHA-NPC6;
   milestone m4 ativo e montador experimental ativo. Não fazer substituição global.
2. Preservar HISTORY, reviews datados e specs em done como registro de sua versão.
   Comentário com fórmula superada deve ser corrigido pela task mecânica correspondente,
   não receber apenas um nome de arquivo novo para parecer validado.
3. Conferir links operacionais e pipeline atual dos PDFs sem mudar novamente os arquivos
   publicados já alinhados. Se encontrar defeito real de publicação, registrar separadamente.
4. Separar correções editoriais autorais (versão interna, exemplos e P-093) dos ponteiros
   do repositório. Preservar estado ACEITO de P-093 e submeter texto/diff ao autor antes
   de alterar docs/core; mudança de ponteiro não é autorização de alterar o livro.

## Critérios de Aceite

- Fontes operacionais apontam arquivos existentes e seções pertinentes.
- Referências históricas preservadas; nenhum arquivo em done reescrito.
- SCHEMA/documento visual não declara conformidade com Competências/DT novas antes
  das tasks que alteram contrato/cálculo/UI; registrar dependência quando necessário.
- Diff e links conferidos, AGENTS/CLAUDE e skills espelhadas idênticos se tocados.
  Sem build/gate visual por troca exclusiva de comentários/links.

## Fora de Escopo

- Executar agora; fontes autorais, regras/código funcional, publicação de versão,
  P-098 de ficha oculta (task própria) e reescrita de todo o histórico.

## Dependências

- Sistema v4.1.3 e Guia v4.2.0 recebidos; tasks mecânicas para trechos com regra alterada.
