---
name: design-fidelity
description: >
  Executa o gate visual obrigatório: escolher e registrar o componente análogo aprovado,
  construir sobre os padrões que já existem, e comparar a tela renderizada com o análogo antes
  de apresentar o trabalho. Use ao criar ou ajustar qualquer UI, tela, layout, componente
  visual, estilo, tema, comportamento responsivo ou mobile — inclusive "criar página" e
  "ajustar tela", que não citam nenhuma dessas palavras. `verify` ensina como rodar e dirigir o
  app; esta skill ensina contra o que comparar.
---

# Fidelidade Visual — o gate contra o que comparar

> **Só adote se o projeto tiver UI e uma identidade visual documentada** (tokens, tema,
> biblioteca de componentes). O pacote `generic_base` não prescreve a identidade — decida-a antes
> (ver README, etapa "UI"). A regra vive em `CLAUDE.md`/`AGENTS.md` ("Processo obrigatório para
> qualquer UI ou estilo"); esta skill executa os passos. Para subir o app e capturar, use `verify`.

## 1. Antes de editar — escolher e registrar o análogo

Ler o guia de design do projeto (`docs/design/DESIGN.md`) primeiro. Escolher o componente
análogo aprovado e **registrar por escrito** (na resposta ao autor ou no fecho da task): shell,
densidade, hierarquia, espaçamento, controles, estados, iconografia e comportamento responsivo.
"Vou usar os tokens" não é escolher análogo. Sem análogo ainda (primeira tela do projeto):
parar e definir com o autor o corte visual de referência **antes** de construir.

## 2. Construir

- Consumir tokens (`var(--...)`); nunca cor, fonte ou raio hardcoded.
- Onde existe primitivo na biblioteca de componentes, consumir o primitivo **com a API
  completa** (variante, tamanho, estilo...); copiar o bloco de estilo dele ou usar a diretiva sem
  os inputs de densidade é defeito.
- Se a biblioteca não cobre o que a tela precisa: **parar e perguntar ao autor** antes de
  contornar com HTML/CSS local.
- Primeiro um corte visual representativo — não um formulário genérico coberto de tokens.

## 3. Verificar

Skill `verify`: viewports mínimos do projeto **e** todo viewport/estado que a spec exigir.

## 4. Comparar e decidir

Cada item responde sim/não olhando a tela. Reprovar qualquer um volta ao passo 2:

1. Parece parte do mesmo produto que o análogo?
2. Mesma densidade e hierarquia?
3. Usa controles, ícones e estados canônicos — nenhum inventado na hora?
4. Não parece HTML genérico com tokens por cima?
5. Sem overflow horizontal nem corte de conteúdo nos viewports?
6. Foco visível, contraste e alvo de toque corretos no mobile?

## 5. Corrigir antes de apresentar

Toda divergência se corrige **na mesma task**, antes de mostrar ao autor. Build, lint e teste
verdes não substituem esta comparação.

## Delegação não fecha o gate

Relato ou screenshot de subagente não encerra o gate: o agente principal inspeciona a UI
renderizada pessoalmente. Sem app executável nesta sessão, a tarefa visual fica **aberta**.
