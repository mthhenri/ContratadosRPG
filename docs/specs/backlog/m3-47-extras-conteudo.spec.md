# m3-47-extras-conteudo.spec.md

> Task 44 do milestone `m3-ficha-jogador.spec.md`. Lote de refino da ficha (`m3-38`…`m3-54`).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Enriquecer o card **"Informações Extras"** que **já existe na aba Visão Geral** (nada de aba nova)
com a **visualização dos dados da Origem**, da **Personalidade** e da **afinidade de fragmentos**.

## Entregáveis

1. **Dados da Origem.** Exibir nome/descrição/Saber de Campo, Formações e Especialidade da Origem
   (`identidade.origem`, `FichaOrigemDto`) de forma legível dentro do card. Reusa os dados que a
   `m3-39` faz afetar os cálculos — aqui é **apresentação**, não motor.
2. **Dados da Personalidade.** Exibir a Personalidade (`identidade.personalidade` +
   habilidade `HabilidadeCategoriaEnum.PERSONALIDADE`) no mesmo card. *(comentário do autor)*
3. **Afinidade de fragmentos.** Exibir a afinidade calculada pela `m3-40` (função pura),
   agrupada/legendada conforme fizer sentido no tema.
4. **Onde.** Estender o card existente em
   `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.html`
   (aba `visao-geral`, bloco "Informações Extras"). **Não** mexer em `AbaFicha`/`ABAS_FICHA`.
   Manter o layout responsivo do card (grades que refluem, padrão da `m3-26`).

## Critérios de Aceite

- O card "Informações Extras" mostra Origem, Personalidade e afinidade de fragmentos.
- Nenhuma aba nova é criada; `ABAS_FICHA` permanece igual.
- Visualizador com acesso vê o card normalmente (a Personalidade não é privada; a privacidade de
  História/Anotações é tratada em `m3-48`/`m3-49`).

## Fora de Escopo

- Edição desses dados (só visualização aqui; edição de Origem/Personalidade é `m3-39`/`m3-38`).
- Mecânica de origem/afinidade (é `m3-39`/`m3-40`).

## Dependências

- `m3-39` (dados de Origem com efeito), `m3-40` (afinidade de fragmentos), `m3-25` (Identidade /
  Personalidade).
