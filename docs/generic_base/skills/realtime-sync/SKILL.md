---
name: realtime-sync
description: >
  Alterar ou investigar tempo real, WebSocket, socket, broadcast, gateway, evento, sala ou
  sincronizar; use quando um cliente não vê uma mudança feita por outro, algo não atualiza sozinho
  ou uma tela fica desatualizada. Mapeia quem emite, quem escuta, permissões e consumidores
  derivados antes de tocar em uma mutação. Só se aplica a projetos com canal de tempo real — ver
  `ARCHITECTURE.template.md` §9.
---

# Tempo Real — Propagação, Permissão e Consumidores

> A regra canônica está em `ARCHITECTURE.md` §9 (tempo real) e na seção de permissões do
> documento de arquitetura, e o resumo em `CONVENTIONS.md` ("Camadas — Regras Rápidas", Gateway).
> O mapa de localização persiste em `MEMORY.md` §2. Esta skill conduz a investigação; não
> reescreve o contrato nem autoriza escrita por canal de tempo real.

## 1. Regras invioláveis

- Escrita entra somente por REST (ou o canal síncrono equivalente): controller fino → service dona
  → repository. O canal de tempo real é **broadcast-only** e nunca recebe mutação.
- A service emite somente **depois** da mutação bem-sucedida; nenhum evento compensa falha de
  persistência.
- Handshake usa a mesma credencial do REST e entrada em sala/canal consulta a service dona do
  recurso. Não replique autorização em gateway, controller ou frontend.
- Preserve o recorte de cada evento: uma sala pode ter membros que não têm permissão sobre todo o
  conteúdo; broadcast não é licença para carregar dado privado.

## 2. Descobrir antes de mudar

1. Comece no gateway/adaptador de tempo real; procure o ponto central de emissão e o nome de cada
   sala/canal.
2. Procure cada chamada de emissão nas services. Confirme que fica depois do save.
3. Ache o equivalente no cliente (service/observable de tempo real) e os assinantes no frontend.
4. Se o projeto tiver motor de regras de domínio, e o campo alterado for um cálculo derivado,
   confira também a skill `domain-rules-engine` — ela decide a fonte e o cálculo; esta acompanha o
   caminho até cada consumidor.
5. Se o mapa divergir de `MEMORY.md` §2, trate o código como estado atual e registre a divergência
   no fecho/contexto; não ajuste o código "para coincidir" com a memória.

## 3. Mapa de propagação atual

> Nota de adoção: mantenha aqui a tabela real do projeto (emissor pós-mutação → evento e sala →
> consumidor), sempre conferida no código, nunca copiada de memória — este é o tipo de tabela que
> fica errada silenciosamente se só for atualizada de vez em quando.

| Emissor pós-mutação | Evento e sala | Consumidor |
|---|---|---|
| `<Service>.<metodo>` | `<entidade>:<acao>` → `<sala>` | `<tela/componente>` |

## 4. Checklist: quem mais precisa saber?

Para qualquer campo que mudar, confirme explicitamente:

- [ ] A própria tela que edita o recurso recebe o evento e refaz o estado correto.
- [ ] Todo resumo/mini-card que exibe uma versão derivada do mesmo dado é recalculado ou refeito.
- [ ] Qualquer painel agregado (lista, dashboard, feed) que dependa do campo é atualizado.
- [ ] Nenhum caminho paralelo de escrita foi criado — a mutação continua nascendo numa única
  service dona.

## 5. Reconexão e verificação

Evento perdido normalmente não tem replay. O cliente precisa reingressar em suas salas/canais a
cada reconexão e refazer o GET autorizado do que está aberto na tela — não confiar apenas no
próximo evento para corrigir o estado.

Para a execução real (subir o stack, conectar dois clientes, forçar desconexão), documente o
roteiro na skill de verificação do projeto, se houver uma — não duplique aqui.

## 6. Fecho

- [ ] Emissor, evento, sala e assinantes foram conferidos no código atual.
- [ ] A service dona continua única para permissão e mutação; emissão é pós-save.
- [ ] Checklist de consumidores derivados foi percorrido para cada campo alterado.
- [ ] Reconexão/refetch foi considerado; teste ao vivo com dois clientes foi feito se a mudança
  afetar tempo real.
