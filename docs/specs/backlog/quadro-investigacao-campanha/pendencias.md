# Pendências da revisão — quadro de investigação

> Anexo de `quadro-investigacao-campanha.spec.md`. Revisão de 25/11/2026 feita por leitura da spec, do
> `design.md` e do código; o `prototipo.html` **não** foi aberto nem renderizado (só busca por fontes e links).
> **A spec foi mantida exatamente como recebida.** Por decisão do autor, estes pontos ficam anotados e serão
> discutidos depois; nenhum foi aplicado. Execução da spec **não** autorizada até essa conversa.

## Confere com o código

- `I-042` existe em `docs/context/IDEAS.md` com este escopo (continua em "Abertas" até a execução).
- `TipoDocumentoOrganizacaoEnum` (`MESTRE`/`JOGADOR`) existe em `shared/src/enums/`.
- `documento.revelado` existe (`shared/src/dtos/documento/`).
- O padrão "recurso do outro cargo responde 404" é o da Biblioteca (`DocumentoService`).

## Pontos a discutir

1. **Mestre sem ler o quadro dos jogadores.** A spec diz que basta tirá-lo "da sala do evento", mas
   `campanha:<id>` já contém o mestre. Seria preciso `.except(salaCampanhaMestre)`, como em
   `emitirDocumentoOrganizacaoAlterada` (`backend/src/core/gateway/campanha.gateway.ts`, ~l.737). Escrever isso
   no critério de aceite. Depende da decisão "A confirmar" da própria spec (o mestre lê ou não).
2. **"Ficha" colide com a ficha de personagem.** A spec chama os cartões de "ficha", mas a tabela é
   `quadro_nota`, e o sistema já usa "ficha" para personagem (inclusive regras de "ficha oculta"). Sugestão:
   "nota" em todo o texto, na UI e nos DTOs.
3. **Acoplamento com a Biblioteca.** Ocultar ou excluir documento passa a alterar o quadro, então
   `DocumentoService` e o módulo do quadro se conhecem (risco de dependência circular). Falta seção de Impacto
   (skill `gerenciamento-de-impacto`) dizendo onde fica o gancho (evento interno, cascata no repository ou chamada
   direta). Também não está dito se o mestre, ao ler o quadro dos jogadores, vê as notas cujo documento está oculto.
4. **Fonte nova.** O protótipo usa Special Elite; o tema só carrega IBM Plex (`frontend/src/index.html`, link do
   Google Fonts, e `--font-mono`/`--font-sans`). Registrar a fonte como exceção do objeto no `DESIGN.md` e dizer
   como é carregada (acrescentar a família ao mesmo link é o caminho mais curto).
5. **Rota do espectador.** O espectador já tem rotas próprias com resolver (`/campanhas/:id/espectador/...`).
   A spec manda todos os papéis para `/campanhas/:campanhaId/quadro`. Decidir se segue o padrão do espectador ou
   se muda.
6. **Importação.** "Importa dentro dele" não diz se **substitui ou mescla**, como remapeia ids, nem qual o limite
   de tamanho do JSON. O texto das notas é Markdown, então a validação do JSON importado precisa ser explícita
   (campos, limites, tipos permitidos por quadro, documentos da mesma campanha).
7. **Acessibilidade.** O arrasto é só por gesto. Faltam alternativa por teclado para mover e ligar notas, nomes
   acessíveis, foco visível e `prefers-reduced-motion`. Alvos de toque de 44px já estão previstos.
8. **Sobreposição com o painel de Investigação existente** (`m7-25`, `m7-27`, em `docs/specs/done/`, e a rota
   `/campanhas/:id/previa/:usuarioAlvoId/investigacao`): a spec não diz como o quadro se relaciona com ele.
9. **Migration.** A próxima é `0041`, e `calendario-campanha-mundo.spec.md` também propõe `0041`. Quem executar
   primeiro leva o número; a outra renumera.

## Observações menores

- O "análogo aprovado" é o `prototipo.html` dentro da spec, não um arquivo em `docs/design/examples/`.
  Confirmar se é aceito como análogo pelo gate de `design-fidelity`.
- Desempenho com o limite previsto (500 notas, 1.000 fios): decidir a técnica de desenho (DOM, SVG ou canvas)
  antes de implementar.
- A autoria da nota é gravada, mas ninguém lê: definir o que acontece com as notas de um jogador removido da
  campanha (a spec não diz).
