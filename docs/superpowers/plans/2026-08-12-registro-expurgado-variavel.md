# Registro Expurgado Variável Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o registro censurado em texto variável com ritmo natural e ampliar para 32 mensagens institucionais mais longas.

**Architecture:** A página mantém catálogos imutáveis e usa uma função pura para converter letras de moldes Lorem Ipsum em `█`, preservando separadores. Template e SCSS apenas apresentam o resultado escolhido uma vez por instância.

**Tech Stack:** Angular 21 standalone, TypeScript, SCSS e Vitest.

## Global Constraints

- Preservar os ajustes visuais existentes do autor.
- Não expor palavras do Lorem Ipsum no DOM renderizado.
- Renovar mensagem e registro após F5, mantendo ambos estáveis durante a mesma instância.
- Não produzir overflow em 1920×1080 ou 360×800.

---

### Task 1: Catálogos e conversor puro

**Files:**
- Modify: `frontend/src/app/modules/acesso-negado/acesso-negado.page.ts`
- Test: `frontend/src/app/modules/acesso-negado/acesso-negado.page.spec.ts`

**Interfaces:**
- Produces: `MENSAGENS_ACESSO_NEGADO` com 32 itens.
- Produces: `MOLDES_REGISTRO_EXPURGADO` imutável.
- Produces: `expurgarTexto(texto: string): string`, que troca letras por `█` e preserva os demais caracteres.
- Produces: `registroExpurgadoSelecionado`, estável por instância.

- [ ] Acrescentar testes que exijam 32 mensagens, conteúdo médio ampliado e conversão integral das letras com preservação de espaços e pontuação.
- [ ] Rodar o spec focado e confirmar que os novos testes falham.
- [ ] Ampliar o catálogo, criar os moldes, implementar `expurgarTexto` e selecionar o registro no componente.
- [ ] Rodar o spec focado até passar.

### Task 2: Apresentação responsiva do registro

**Files:**
- Modify: `frontend/src/app/modules/acesso-negado/acesso-negado.page.html`
- Modify: `frontend/src/app/modules/acesso-negado/acesso-negado.page.scss`
- Test: `frontend/src/app/modules/acesso-negado/acesso-negado.page.spec.ts`

**Interfaces:**
- Consumes: `registroExpurgadoSelecionado: string`.

- [ ] Substituir a barra contínua pelo valor convertido e testar que o DOM contém apenas censura, espaços e pontuação.
- [ ] Permitir quebra de linha natural no registro sem alterar classificação, avisos, rodapé ou estilos do botão criados pelo autor.
- [ ] Rodar os testes focados de acesso negado e layout.

### Task 3: Gates e verificação real

**Files:**
- Modify: `docs/context/HISTORY.md`

- [ ] Rodar lint, suíte completa e build do frontend.
- [ ] Inspecionar a aplicação real em 1920×1080 e 360×800, incluindo múltiplas recargas.
- [ ] Confirmar ausência de overflow, variação independente e preservação dos ajustes do autor.
- [ ] Registrar os resultados no histórico e revisar `git diff --check`.
