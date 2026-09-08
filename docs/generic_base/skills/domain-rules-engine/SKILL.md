---
name: domain-rules-engine
description: >
  Alterar ou investigar fórmula, cálculo ou regra de domínio complexa — qualquer lógica de negócio
  documentada fora do código que precise ser consumida por mais de uma camada (frontend calcula
  para feedback instantâneo, backend valida autoritativamente). Use antes de tocar em regra de
  domínio para achar o documento canônico, o motor puro compartilhado e todos os consumidores
  derivados. Só se aplica a projetos que têm a exceção sancionada de motor de regras no pacote
  compartilhado — ver `ARCHITECTURE.template.md` §6.6.
---

# Motor de Regras de Domínio — Documento, Motor e Consumidores

> A regra canônica vive no(s) documento(s) de domínio listado(s) em `ARCHITECTURE.md` §1.1. A
> arquitetura do motor vive em `ARCHITECTURE.md` §6.6 e a convenção curta em `CONVENTIONS.md`; o
> mapa de localização está em `MEMORY.md` §2. Em conflito, o documento vence — a skill executa o
> caminho, não reescreve regra nem fórmula.

## 1. Localizar a fonte e o motor

1. Classifique a regra: identifique qual documento de domínio (`ARCHITECTURE.md` §1.1) a cobre.
   Cite arquivo e seção no teste e no fecho.
2. Leia a seção canônica antes do código. Se divergir do código, altere o código e o teste; não
   adapte o documento sem decisão expressa do autor.
3. Localize a área do motor pelo mapa de `MEMORY.md` §2 e confira os arquivos reais, não só o nome
   da pasta. Regra nova ou composição reutilizável nasce ali como função pura compartilhada.
4. Liste quem consome o resultado antes de editar. Todas as camadas que precisam do cálculo usam
   o mesmo motor; não replique uma fórmula numa tela, service, mapper ou componente.

## 2. Limites do motor

- Só funções puras e dados tipados: sem I/O, estado, persistência, permissão ou dependência de
  framework.
- Dependência externa não entra no motor de regras. Exceção de aleatoriedade/tempo precisa ser
  explícita e isolada numa utilidade dedicada, nunca espalhada.
- Service orquestra e autoriza; interface só apresenta estado e encaminha interação. Nenhuma das
  duas camadas recalcula a regra por conta própria.
- Todo cálculo alterado ganha teste unitário contra o documento, com a seção usada citada no
  comentário/descrição do teste. Rode a suíte do pacote compartilhado antes dos demais gates.

## 3. Consumidores derivados — não fechar cedo

Antes de concluir uma mudança, procure pelo símbolo da função, pelos campos de entrada e pelo
campo persistido/derivado. Liste explicitamente cada tela, mapper e resumo público que consome o
resultado. Um cálculo aplicado "por cima" nasce no motor compartilhado e é consumido em todos
esses pontos; nunca só numa tela.

> Nota de adoção: se o projeto acumular armadilhas recorrentes (estado persistido que diverge do
> recalculado, campo esquecido num resumo público...), documente-as num arquivo de referência à
> parte (`references/armadilhas.md`) sem copiar a fórmula em si — só a descrição do recorte que já
> causou divergência.

## 4. Fecho

- [ ] Documento canônico e seção citados; divergência resolvida a favor do documento.
- [ ] Função/dado puro fica na área correta do motor de regras.
- [ ] Teste unitário cobre a regra contra o documento e a suíte do pacote compartilhado passou.
- [ ] Todos os consumidores derivados foram listados e atualizados quando aplicável.
- [ ] Não há fórmula duplicada fora do motor de regras compartilhado.
- [ ] Escopo do problema, pendências e evidência foram registrados conforme `task-flow`.
