# pn-09-sumario-nesta-versao-patchnotes.spec.md

> Task 3/5 do guarda-chuva `pn-revisao-pagina-patchnotes.spec.md`. Usa os capítulos de `pn-07` e o
> trilho direito de `pn-08`.

## Objetivo

Mostrar o mapa da nota, "Nesta versão", e destacar o capítulo que está na tela durante a leitura.

## Entregáveis

1. **Decisão de primitivo antes de codar.** `shared/ui/` não tem sumário nem TOC. Ao abrir a task,
   **perguntar ao autor**, com o trade-off de cada opção:
   - (a) criar o primitivo `app-sumario` em `shared/ui/`, com lista de âncoras, item ativo e
     `aria-current`, reutilizável pela Biblioteca e por regras;
   - (b) componente local do módulo de patchnotes.

   Implementar só depois da resposta (regra da biblioteca de componentes).
2. **Conteúdo do sumário**:
   - os grupos aparecem como rótulo mono em caixa alta e os blocos como itens com o título
     completo, emoji incluído;
   - cada item navega pela âncora de `pn-07` (atualiza o fragmento, faz rolagem suave e respeita
     `prefers-reduced-motion`);
   - quando o resumo estiver em destaque (`pn-11`), ele entra como primeiro item, "Resumo".
3. **Posição**:
   - em três zonas, ocupa o trilho direito de `pn-08`, com o rótulo `Nesta versão`;
   - abaixo de ~1240px, vira uma **seção recolhível** "Nesta versão · N capítulos" no topo da
     nota, fechada por padrão;
   - no mobile, o `summary` e os itens têm alvo de 44px.
4. **Capítulo visível (*scroll-spy*)** via `IntersectionObserver`:
   - destaca o bloco cuja posição passou da linha de leitura, logo abaixo da topbar;
   - o grupo dele também fica realçado;
   - o item ativo recebe `aria-current="location"`;
   - em trilho com rolagem interna, o item ativo é mantido visível (`scrollIntoView` com
     `block: 'nearest'` **dentro do trilho**, sem rolar a página);
   - o observer é desconectado na troca de versão e na destruição.
5. **Troca de versão** refaz o sumário e zera o capítulo ativo.
6. **`docs/design/DESIGN.md`**: registrar o padrão de sumário. Se a decisão do entregável 1 for o
   primitivo, o registro vai no primitivo.

## Critérios de Aceite

1. Testes:
   - sumário gerado da nota;
   - clique navega e atualiza o fragmento;
   - troca de versão refaz a lista;
   - item ativo marcado com o observer simulado;
   - recolhível fechado por padrão.
2. Suítes e lint de `frontend` verdes.
3. Gate visual (`verify` + `design-fidelity`) em `1920×1080`, `1366×768`, `960×1080` e `360×800`:
   - rolagem real da `1.4.0` e da `1.0.0` (a mais longa em blocos), com o destaque trocando de
     capítulo;
   - clique em item no fim da lista;
   - recolhível aberto e fechado;
   - foco visível nos itens.

## Fora de Escopo

- Mover o resumo (`pn-11`). Aqui só se reserva o primeiro item quando ele existir.
- Busca na nota.
- Filtro por público.

## Dependências

`pn-07` e `pn-08` concluídas.

## Riscos e Mitigação

- **Destaque "pulando" entre capítulos curtos.** Usar uma linha de leitura única (`rootMargin`)
  e escolher o último título que a cruzou, não o "mais visível".
- **Trilho rolando a página inteira.** `scrollIntoView` padrão rola os ancestrais; restringir ao
  contêiner do trilho.
