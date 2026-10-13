# Reauditoria — o que do livro não se edita na Oficina

> Anexo de [`oficina-edicao-blocos-restantes.spec.md`](../oficina-edicao-blocos-restantes.spec.md) (fatia 6). Substitui,
> para o estado atual, a [auditoria anterior](../../oficina-edicao-de-listas/auditoria-ineditaveis.md). Saídas brutas e
> capturas ficam em `.artifacts/oficina-edicao-blocos-restantes/` (ignoradas pelo Git).

## Método e limites

- Ao vivo, base de desenvolvimento, usuário ADMIN de teste (desativado ao fim), Oficina ligada, `1920×1080`; Sistema (1049
  peças) e Guia (367). Para **cada tipo de peça presente** em cada livro (primeira ocorrência), a peça foi selecionada e se
  contaram campos de texto editáveis, steppers, botões e faixas de propriedades dentro dela; seções pelo sumário.
- Limites: só a primeira peça de cada tipo; o desenho de cada peça nova foi conferido nas fatias, não de novo aqui;
  `ARQUETIPO` não tem invólucro próprio (seus campos se editam no container `CLASSE`); tema claro não exercitado.

## Resultado

Nenhum tipo ficou sem controle de edição. Sistema: `ABERTURA` (3 campos), `SECAO` (título + faixa nível/glifo),
`PARAGRAFO`, `TERMOS`/`TERMO`, `EXEMPLO`, `TABELA`, `HABILIDADE` (faixa glifo/inicial/melhorada), `LISTA` (faixa
marcadores/numerada), `NOTA`, `ORIGENS`/`ORIGEM`, `CLASSE`, `SUBCLASSE`, `FORMULA`, `FAIXAS`, `GRADE` (faixa
apresentação), `EQUIPAMENTOS`/`EQUIPAMENTO`, `MODIFICACOES`/`MODIFICACAO`, `NIVEIS_AMEACA` (8 campos + 8 steppers),
`MODULOS` (5 + 5), `AMPLIFICADORES`/`AMPLIFICADOR`. Guia: `ABERTURA`, `SECAO`, `PARAGRAFO`, `ROTEIRO`, `LISTA` (inclusive
sublista, com início), `TABELA`, `FORMULA`, `NOTA`, `EXEMPLO`, `FICHA_CRIATURA` (59 campos), `HABILIDADE_CRIATURA`,
`HABILIDADE`. `GENERICO` não existe em nenhum livro (testado só em componente).

## Verificação ao vivo das fatias 3 e 5 (rascunho restaurado ao fim; diferença para o snapshot: 0 peças)

- Habilidade: glifo ◈→◻ gravou; "Geral melhorada" gravou; "Habilidade inicial" moveu a marca (a nova ficou inicial, sem
  melhorada; a antiga perdeu a marca; **uma só** inicial no arquétipo). Os livros reais já tinham exatamente uma inicial por
  arquétipo e subclasse (a nova pendência estrutural não acusa nenhuma).
- Lista: Numerada gravou `ordenada`, "Começa em" +1 gravou `inicio`, "+ Sublista" criou a sublista e "Remover sublista" a tirou.
- Grade de saúde: Vida/Energia do item gravou `variante`. Seção (pelo sumário): nível 2→3 gravou.
- Níveis de ameaça: com os oito em uso "+ Nível" fica desabilitado; remover NA 7 e adicionar criou `{nivel: 7, descricao: [],
  referenciaImagem: ""}` e a barra mostrou "Pendência: Há um nível de ameaça sem descrição." (a pendência nova, ao vivo).
- Sem overflow horizontal em `1920×1080` e `360×800`; nenhum botão com menos de 24 px; opções da faixa com 44 px no celular.
- **Barra de seleção da peça** (pedido do autor): altura inteira da peça, a 12 px do texto (8 px no celular), medida no estilo
  computado e vista nas capturas.
