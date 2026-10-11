# m11-08-oficina-blocos-ricos.spec.md

> Task 8/10 do milestone [`m11-oficina-regras.spec.md`](m11-oficina-regras.spec.md). Estende a
> edição no lugar da `m11-06` aos demais blocos. **Pode ser fatiada por bloco** (uma entrega e um
> gate por fatia, na ordem de uso do autor).

## Objetivo

Tornar editáveis no lugar todos os blocos ricos que o leitor renderiza e a `m11-06` não cobre,
mantendo a aparência do leitor.

## Entregáveis

Cada fatia entrega a edição no lugar do bloco, o esqueleto de inserção (`m11-07`) quando o bloco
for criável e as pendências específicas no validador:

1. **Equipamento** (custo, descrição, peso, porte, danos, especificações, duração) e
   **Modificação** / **Amplificador** (nome, empilhamento, efeito, bloqueia).
2. **Classe** (citação, Saúde, progressão, habilidades) e **Arquétipo** / **Subclasse**
   (citação, atributos bônus, custos, habilidade inicial).
3. **Origem** (formação, especialidade, saber de campo) e **Termos** (atributos, maestrias,
   penalidades, verbetes).
4. **Ficha de criatura** (identidade, atributos, ataques, habilidades de criatura) e **Roteiro**
   (etapas ordenadas).
5. **Tabela** e **Grade** (células, linhas e colunas; as 11 grades decididas na `m11-03`),
   **Faixas** do Deslocamento e **Níveis de ameaça**.
6. Atualizar `docs/context/MEMORY.md` com o mapa de onde cada bloco é editado.

## Critérios de Aceite

- Por fatia: testes dos componentes/serviços de edição, validador cobrindo as pendências novas e
  prova de ida e volta (editar, salvar, publicar rascunho de teste, ler e renderizar igual).
- **Gate visual por fatia** com `verify` em `1920×1080` e `360×800`: análogo (o próprio bloco no
  leitor + o padrão de edição da `m11-06`); estados de edição, vazio, pendência e salvo; comparação
  com o leitor (a edição não muda o desenho do bloco); sem overflow; foco e toque.
- Cada controle usa o primitivo de `shared/ui/` com a API completa; lacuna de primitivo → parar e
  perguntar ao autor.
- Fatia concluída = bloco editável sem precisar sair do livro; fatia sem gate visual fica aberta.
- Lint e testes dos três workspaces verdes ao fim de cada fatia.

## Fora de Escopo

Núcleo da edição (`m11-06`), inserção e estrutura (`m11-07`), comparador e publicação (`m11-09`);
catálogos do motor gerados do livro (`I-052`); mudar o desenho dos blocos no leitor.

## Dependências

`m11-06` em `done/`; `m11-07` para os esqueletos de inserção (a edição de blocos existentes não
depende dela). Diagnóstico das grades da `m11-03`.

## Riscos e Mitigação

- **Tabela/grade genérica vira editor de planilha.** Escopo mínimo: editar células e
  adicionar/remover linhas; sem redimensionar colunas nem mesclar.
- **Blocos "generico" importados.** Editar texto apenas; reclassificar para tipo próprio é
  decisão do autor, fora desta task.
