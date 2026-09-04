/* Este arquivo é gerado por backend/tools/gerar-openapi-contratos.ts. */
/* Não edite manualmente: os DTOs públicos em shared/src/dtos são a fonte de verdade. */

export const schemasContratosPublicos = {
    "CampanhaCriarDto": {
        "type": "object",
        "properties": {
            "nome": {
                "type": "string"
            },
            "descricao": {
                "type": "string"
            }
        },
        "required": [
            "nome"
        ],
        "additionalProperties": false,
        "description": "Entrada de criação de campanha — o criador vira `MESTRE` (SYSTEM.SPEC §14)."
    },
    "CampanhaCriadaDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "descricao": {
                "type": "string"
            },
            "codigoConvite": {
                "type": "string"
            },
            "codigoConviteEspectador": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "nome",
            "descricao",
            "codigoConvite",
            "codigoConviteEspectador"
        ],
        "additionalProperties": false,
        "description": "Saída de criação — a campanha criada, já com os dois convites gerados (`codigoConvite` para\n`JOGADOR`, `codigoConviteEspectador` para `ESPECTADOR` — m8-01)."
    },
    "CampanhaListarDto": {
        "type": "object",
        "properties": {
            "usuarioId": {
                "type": "number"
            }
        },
        "required": [
            "usuarioId"
        ],
        "additionalProperties": false,
        "description": "Entrada da listagem \"minhas campanhas\" — o `usuarioId` vem do JWT (`@ActiveUser().sub`),\ninjetado no DTO pela controller (nunca primitivo solto). A saída é sempre resumida\n(`CampanhaResumoDto`)."
    },
    "CampanhaResumoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "descricao": {
                "type": "string"
            },
            "papel": {
                "type": "string",
                "enum": [
                    "MESTRE",
                    "JOGADOR",
                    "ESPECTADOR"
                ]
            },
            "totalMembros": {
                "type": "number",
                "description": "Quantidade de `campanha_membro` ativos na campanha."
            },
            "totalFichas": {
                "type": "number",
                "description": "Quantidade de fichas visíveis ao usuário atual nesta campanha (§14)."
            },
            "temFichaCritica": {
                "type": "boolean",
                "description": "`true` quando alguma ficha visível está com Vida atual ≤ 0."
            },
            "fichaCriticaNome": {
                "type": "string",
                "description": "Nome da primeira ficha crítica visível (ordenada por nome) — `null` se nenhuma."
            },
            "minhaFichaResumo": {
                "type": "object",
                "additionalProperties": true,
                "description": "Resumo da própria ficha do jogador nesta campanha (primeira, se houver mais de uma) — só\npreenchido quando `papel === JOGADOR` e ele já tem ficha própria aqui. `null` para `MESTRE`\n(não tem \"sua ficha\" na campanha) e para o jogador que ainda não criou nenhuma."
            },
            "codigoConvite": {
                "type": "string",
                "description": "Código de convite de jogador — só preenchido quando `papel === MESTRE`; `null` senão."
            },
            "codigoConviteEspectador": {
                "type": "string",
                "description": "Código de convite de espectador (m8-01) — mesmo recorte de `codigoConvite`: só preenchido\nquando `papel === MESTRE`; `null` para `JOGADOR`/`ESPECTADOR`."
            },
            "alteradoEm": {
                "type": "string",
                "description": "`GREATEST` entre `campanha.updated_date` e a última ficha visível alterada (ISO)."
            }
        },
        "required": [
            "id",
            "nome",
            "descricao",
            "papel",
            "totalMembros",
            "totalFichas",
            "temFichaCritica",
            "fichaCriticaNome",
            "minhaFichaResumo",
            "codigoConvite",
            "codigoConviteEspectador",
            "alteradoEm"
        ],
        "additionalProperties": false,
        "description": "Item de listagem — a campanha de que o usuário é membro, com o `papel` dele nela\n(`MESTRE`/`JOGADOR`), enriquecido para o painel de controle (m2-18): estatísticas agregadas\ne o recorte de ficha crítica/própria respeitam a mesma regra de visibilidade §14 usada em\n`FichaRepository.listarVisiveisParaUsuario` (mestre vê todas as fichas da campanha; jogador só\nas próprias + as concedidas via `usuario_ficha_acesso`)."
    },
    "CampanhaRecuperarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada de recuperação individual — o `id` vem do `@Param`, injetado no DTO pela\ncontroller (recuperação individual sempre `{ id }`, nunca primitivo)."
    },
    "CampanhaRecuperadaDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "descricao": {
                "type": "string"
            },
            "codigoConvite": {
                "type": "string"
            },
            "codigoConviteEspectador": {
                "type": "string"
            },
            "naBase": {
                "type": "boolean",
                "description": "Estado \"Na Base da Fundação\" (`true`) ou \"Em Missão\" (`false`) — gate do inventário de\nesquadrão (§ inventário). Só o Mestre altera (`alterarEstado`). Campanha existente nasce\n`na_base = null` no banco, tratado como `true` na leitura (`COALESCE`)."
            }
        },
        "required": [
            "id",
            "nome",
            "descricao",
            "codigoConvite",
            "codigoConviteEspectador",
            "naBase"
        ],
        "additionalProperties": false,
        "description": "Saída da recuperação individual — a campanha completa, incluindo os dois convites. Segue o\nmesmo recorte de exposição que `codigoConvite` já tinha antes do m8-01 (não gateado por papel\nnesta consulta — diferente de `CampanhaResumoDto`, que só mostra o convite ao mestre); mudar\nesse recorte é fluxo de REST/permissão, fora do escopo desta task."
    },
    "CampanhaAlterarDto": {
        "type": "object",
        "properties": {
            "nome": {
                "type": "string"
            },
            "descricao": {
                "type": "string"
            }
        },
        "required": [
            "nome"
        ],
        "additionalProperties": false,
        "description": "Entrada pública da alteração de campanha (nome/descrição) — só o mestre pode alterar."
    },
    "CampanhaAlteradaDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "descricao": {
                "type": "string"
            },
            "codigoConvite": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "nome",
            "descricao",
            "codigoConvite"
        ],
        "additionalProperties": false,
        "description": "Saída da alteração — a campanha alterada."
    },
    "CampanhaExcluirDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada da exclusão (soft delete) — só o mestre pode excluir."
    },
    "CampanhaEntrarDto": {
        "type": "object",
        "properties": {
            "codigoConvite": {
                "type": "string"
            }
        },
        "required": [
            "codigoConvite"
        ],
        "additionalProperties": false,
        "description": "Entrada de \"entrar na campanha\" — o usuário autenticado ingressa informando um `codigoConvite`.\nO `usuarioId` do ingressante vem do JWT (`@ActiveUser().sub`), nunca do corpo. **m8-02**: o\nmesmo campo aceita tanto o convite de `JOGADOR` quanto o de `ESPECTADOR` — o servidor resolve\nqual dos dois bateu e decide o papel a partir disso (SYSTEM.SPEC §14); o cliente nunca escolhe\no papel por corpo, query ou rota."
    },
    "CampanhaEntradaDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "descricao": {
                "type": "string"
            },
            "papel": {
                "type": "string",
                "enum": [
                    "MESTRE",
                    "JOGADOR",
                    "ESPECTADOR"
                ]
            }
        },
        "required": [
            "id",
            "nome",
            "descricao",
            "papel"
        ],
        "additionalProperties": false,
        "description": "Saída de \"entrar na campanha\" — a campanha em que o usuário ingressou e o `papel` obtido\n(`JOGADOR` ou `ESPECTADOR`, conforme o código informado — m8-02). Recorte enxuto, sem o\n`codigoConvite` (visível só na recuperação de membro)."
    },
    "CampanhaConviteRegenerarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada da regeneração do convite (complemento `Convite` inteiro antes do verbo) — o `id`\nvem do `@Param`, injetado no DTO pela controller. Só o mestre pode regenerar (§14)."
    },
    "CampanhaConviteRegeneradoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "codigoConvite": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "codigoConvite"
        ],
        "additionalProperties": false,
        "description": "Saída da regeneração — o novo `codigoConvite`, que invalida o anterior."
    },
    "CampanhaConviteEspectadorRegenerarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada da regeneração do convite de espectador (complemento `ConviteEspectador` inteiro\nantes do verbo, distinto de `CampanhaConviteRegenerarDto` que regenera o de `JOGADOR`) — o\n`id` vem do `@Param`, injetado no DTO pela controller. Só o mestre pode regenerar (§14)."
    },
    "CampanhaConviteEspectadorRegeneradoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "codigoConviteEspectador": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "codigoConviteEspectador"
        ],
        "additionalProperties": false,
        "description": "Saída da regeneração — o novo `codigoConviteEspectador`, que invalida o anterior."
    },
    "CampanhaMembroPapelAlterarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "usuarioId": {
                "type": "number"
            },
            "papel": {
                "type": "string",
                "enum": [
                    "JOGADOR",
                    "ESPECTADOR"
                ]
            }
        },
        "required": [
            "id",
            "usuarioId",
            "papel"
        ],
        "additionalProperties": false,
        "description": "Entrada da troca de papel de um membro entre `JOGADOR` e `ESPECTADOR` pelo mestre\n(complemento `MembroPapel` antes do verbo) — o `id` é o da campanha (`@Param`) e `usuarioId`\no membro alvo (`@Param`), ambos injetados pela controller; `papel` vem do corpo, restrito à\nunião `JOGADOR | ESPECTADOR` no próprio tipo — o cliente nunca pode promover a `MESTRE` por\neste contrato (isso é `CampanhaMestreTransferirDto`)."
    },
    "CampanhaMembroPapelAlteradoDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            },
            "usuarioId": {
                "type": "number"
            },
            "papel": {
                "type": "string",
                "enum": [
                    "JOGADOR",
                    "ESPECTADOR"
                ]
            }
        },
        "required": [
            "campanhaId",
            "usuarioId",
            "papel"
        ],
        "additionalProperties": false,
        "description": "Saída da troca de papel — confirmação do novo `papel` do membro na campanha."
    },
    "CampanhaMembrosListarDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            }
        },
        "required": [
            "campanhaId"
        ],
        "additionalProperties": false,
        "description": "Entrada da listagem de membros de uma campanha (complemento coleção `Membros` no plural) —\no `campanhaId` vem do `@Param`, injetado no DTO pela controller. Visível aos membros da\ncampanha (permissão no service). A saída é sempre resumida (`CampanhaMembroResumoDto`)."
    },
    "CampanhaMembroFichaResumoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "classe": {
                "type": "string",
                "enum": [
                    "COMBATENTE",
                    "ESPECIALISTA",
                    "SUPORTE",
                    "EXPERIMENTO_BESTIAL",
                    "EXPERIMENTO_ARTIFICIAL",
                    "EXPERIMENTO_HIBRIDO",
                    "CIVIL"
                ]
            },
            "arquetipo": {
                "type": "string",
                "enum": [
                    "LUTADOR",
                    "MERCENARIO",
                    "VANGUARDA",
                    "ENGENHEIRO",
                    "ASSASSINO",
                    "ACADEMICO",
                    "PARAMEDICO",
                    "DIPLOMATA",
                    "COMANDANTE"
                ]
            },
            "imagemUrl": {
                "type": "string"
            },
            "cor": {
                "type": "string",
                "description": "Cor de identidade visual (m3-61) — tinge o avatar da carteirinha, igual ao Esquadrão do mestre."
            },
            "acessoCompleto": {
                "type": "boolean",
                "description": "`true` quando o requisitante enxerga a ficha completa (dono, mestre, ou concessão ativa)."
            }
        },
        "required": [
            "id",
            "nome",
            "classe",
            "arquetipo",
            "imagemUrl",
            "cor",
            "acessoCompleto"
        ],
        "additionalProperties": false,
        "description": "Ficha de um membro, no recorte mínimo pra Equipe (m3-65): quando `acessoCompleto` é `false`,\né só a \"carteirinha\" — nome/classe/foto, sem vida/energia/etc. (esses continuam vindo, pra quem\ntem acesso completo, de `GET /ficha?campanhaId=`, que não muda). Fichas marcadas `oculta` por um\njogador que não seja o dono/mestre requisitante nem entram nesta lista — não tem carteirinha."
    },
    "CampanhaMembroResumoDto": {
        "type": "object",
        "properties": {
            "usuarioId": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "papel": {
                "type": "string",
                "enum": [
                    "MESTRE",
                    "JOGADOR",
                    "ESPECTADOR"
                ]
            },
            "fichas": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/CampanhaMembroFichaResumoDto"
                }
            }
        },
        "required": [
            "usuarioId",
            "nome",
            "papel",
            "fichas"
        ],
        "additionalProperties": false,
        "description": "Item de listagem de membros — o usuário membro da campanha com o `papel` dele nela\n(`MESTRE`/`JOGADOR`, `codigo` traduzido de `tipo_campanha_membro_papel` no SQL) e as fichas\ndele visíveis ao requisitante (m3-65 — sempre todos os membros, ficha ou não)."
    },
    "CampanhaConviteRecuperarDto": {
        "type": "object",
        "properties": {
            "codigoConvite": {
                "type": "string"
            }
        },
        "required": [
            "codigoConvite"
        ],
        "additionalProperties": false,
        "description": "Entrada interna da consulta de campanha por código de convite — base do `entrarCampanha`.\n**m8-02**: o mesmo `codigoConvite` é comparado contra os dois códigos ativos da campanha\n(`codigo_convite` de `JOGADOR`, `codigo_convite_espectador` de `ESPECTADOR`) — o repositório\nresolve qual bateu e devolve o papel correspondente (`CampanhaConviteInternoRecuperadoDto`).\nSó service ↔ repository (o `codigoConvite` chega no `CampanhaEntrarDto` público)."
    },
    "CampanhaMembroRemoverDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "usuarioId": {
                "type": "number"
            }
        },
        "required": [
            "id",
            "usuarioId"
        ],
        "additionalProperties": false,
        "description": "Entrada da remoção de um membro pelo mestre (complemento `Membro` antes do verbo) — o `id`\né o da campanha (`@Param(':id')`) e o `usuarioId` é o membro a remover\n(`@Param(':usuarioId')`), ambos injetados no DTO pela controller. Só o mestre remove (§14);\no mestre não pode remover a si mesmo."
    },
    "CampanhaMembroRemovidoDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            },
            "usuarioId": {
                "type": "number"
            }
        },
        "required": [
            "campanhaId",
            "usuarioId"
        ],
        "additionalProperties": false,
        "description": "Saída da remoção — confirmação do membro removido da campanha."
    },
    "CampanhaMestreTransferirDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "novoMestreUsuarioId": {
                "type": "number"
            }
        },
        "required": [
            "id",
            "novoMestreUsuarioId"
        ],
        "additionalProperties": false,
        "description": "Entrada da transferência do papel de mestre (complemento `Mestre` antes do verbo) — o `id`\né o da campanha (`@Param`) e o `novoMestreUsuarioId` (corpo) é o jogador a ser promovido a\n`MESTRE`. O mestre atual é o usuário autenticado; a transferência é **atômica** (promove o\nalvo e rebaixa o atual a `JOGADOR`, mantendo exatamente um mestre — §14)."
    },
    "CampanhaMestreTransferidoDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            },
            "mestreAnteriorUsuarioId": {
                "type": "number"
            },
            "novoMestreUsuarioId": {
                "type": "number"
            }
        },
        "required": [
            "campanhaId",
            "mestreAnteriorUsuarioId",
            "novoMestreUsuarioId"
        ],
        "additionalProperties": false,
        "description": "Saída da transferência — confirmação de quem deixou e quem assumiu o papel de mestre."
    },
    "CampanhaMembroEntradaDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            },
            "usuarioId": {
                "type": "number"
            }
        },
        "required": [
            "campanhaId",
            "usuarioId"
        ],
        "additionalProperties": false,
        "description": "Payload do evento de tempo real `membro:entrou`, emitido na sala `campanha:<id>` pela\n`CampanhaService.entrarCampanha` após a mutação (SYSTEM.SPEC §9 — broadcast-only). Avisa os\nmembros já conectados de que um novo `usuarioId` ingressou na campanha. É a notificação para a\nsala (recorte `campanhaId` + `usuarioId`); o verbo vai no particípio (CONVENTIONS — saída), na\nmesma forma de `CampanhaEntradaDto` (a resposta REST devolvida ao próprio ingressante), da qual\neste DTO é distinto (o complemento `Membro` marca a notificação da sala)."
    },
    "CampanhaEstadoAlterarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "naBase": {
                "type": "boolean"
            }
        },
        "required": [
            "id",
            "naBase"
        ],
        "additionalProperties": false,
        "description": "Entrada da alteração de estado — o `id` vem do `@Param`, injetado no DTO pela controller. Só\no Mestre altera (gate `validarMestre`, único árbitro — proibição #28)."
    },
    "CampanhaEstadoAlteradaDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "naBase": {
                "type": "boolean"
            }
        },
        "required": [
            "id",
            "naBase"
        ],
        "additionalProperties": false,
        "description": "Saída da alteração de estado — também o payload do evento de tempo real `campanha:estado-alterado`."
    },
    "CampanhaInventarioItemDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "string"
            },
            "nome": {
                "type": "string"
            },
            "categoria": {
                "type": "string",
                "enum": [
                    "CORPO_A_CORPO",
                    "EXPLOSIVOS",
                    "ARMAS_DE_FOGO",
                    "MUNICOES",
                    "PROTECOES",
                    "EXOTICOS",
                    "ARMAZENAMENTO",
                    "OPERACIONAL",
                    "MEDICINAL",
                    "AMPLIFICADOR",
                    "FRAGMENTO_CONSTRUTOR",
                    "FRAGMENTO_POTENCIALIZADOR",
                    "SEM_CATEGORIA"
                ]
            },
            "custo": {
                "type": "number"
            },
            "peso": {
                "type": "number"
            },
            "quantidade": {
                "type": "number"
            },
            "descricao": {
                "type": "string"
            },
            "dano": {
                "type": "string"
            },
            "informacao": {
                "type": "string"
            },
            "resistencia": {
                "type": "string"
            },
            "bonus": {
                "type": "string"
            },
            "modificacoes": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": true
                },
                "description": "Opcional para compatibilidade com itens persistidos antes do suporte a modificações."
            }
        },
        "required": [
            "id",
            "nome",
            "categoria",
            "custo",
            "peso",
            "quantidade"
        ],
        "additionalProperties": false,
        "description": "Item do inventário de esquadrão — só os campos **descritivos** do catálogo de compras\n(`ItemCatalogo`, `shared/regras/compras`), sem `equipado`/`containerId`: este inventário só\nguarda, não equipa nada. Modificações são preservadas para que um item transferido conserve\nseus efeitos ao retornar à ficha. `id` é um uuid gerado no `POST` — identificador estável para\nremover/ajustar/transferir o item."
    },
    "CampanhaInventarioDto": {
        "type": "object",
        "properties": {
            "itens": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/CampanhaInventarioItemDto"
                }
            }
        },
        "required": [
            "itens"
        ],
        "additionalProperties": false,
        "description": "Saída da listagem/mutação do inventário de esquadrão — a lista inteira e atual de itens."
    },
    "CampanhaInventarioRecuperarDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            }
        },
        "required": [
            "campanhaId"
        ],
        "additionalProperties": false,
        "description": "Entrada da listagem — o `campanhaId` vem do `@Param`, injetado no DTO pela controller."
    },
    "CampanhaInventarioItemAdicionarDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "categoria": {
                "type": "string",
                "enum": [
                    "CORPO_A_CORPO",
                    "EXPLOSIVOS",
                    "ARMAS_DE_FOGO",
                    "MUNICOES",
                    "PROTECOES",
                    "EXOTICOS",
                    "ARMAZENAMENTO",
                    "OPERACIONAL",
                    "MEDICINAL",
                    "AMPLIFICADOR",
                    "FRAGMENTO_CONSTRUTOR",
                    "FRAGMENTO_POTENCIALIZADOR",
                    "SEM_CATEGORIA"
                ]
            },
            "custo": {
                "type": "number"
            },
            "peso": {
                "type": "number"
            },
            "quantidade": {
                "type": "number"
            },
            "descricao": {
                "type": "string"
            },
            "dano": {
                "type": "string"
            },
            "informacao": {
                "type": "string"
            },
            "resistencia": {
                "type": "string"
            },
            "bonus": {
                "type": "string"
            },
            "modificacoes": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": true
                }
            }
        },
        "required": [
            "campanhaId",
            "nome",
            "categoria",
            "custo",
            "peso",
            "quantidade"
        ],
        "additionalProperties": false,
        "description": "Entrada de adicionar item — o `campanhaId` vem do `@Param`; os demais campos vêm do corpo.\nQualquer membro pode adicionar (respeitando o gate Na Base/Em Missão do jogador)."
    },
    "CampanhaInventarioItemAlterarDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            },
            "itemId": {
                "type": "string"
            },
            "nome": {
                "type": "string"
            },
            "custo": {
                "type": "number"
            },
            "peso": {
                "type": "number"
            },
            "descricao": {
                "type": "string"
            }
        },
        "required": [
            "campanhaId",
            "itemId",
            "nome",
            "custo",
            "peso"
        ],
        "additionalProperties": false,
        "description": "Entrada de alterar informações descritivas de um item existente — `campanhaId`/`itemId` vêm do\n`@Param`, os demais campos do corpo. Mesmo recorte do editor análogo na ficha\n(`FichaInventario.confirmarEdicaoItem`): só nome/custo/peso/descrição mudam; categoria, dano,\ninformação, resistência, bônus, quantidade e modificações permanecem intocados."
    },
    "CampanhaInventarioItemRemoverDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            },
            "itemId": {
                "type": "string"
            }
        },
        "required": [
            "campanhaId",
            "itemId"
        ],
        "additionalProperties": false,
        "description": "Entrada de remover item inteiro — `campanhaId`/`itemId` vêm do `@Param`."
    },
    "CampanhaInventarioItemQuantidadeAjustarDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            },
            "itemId": {
                "type": "string"
            },
            "delta": {
                "type": "number"
            }
        },
        "required": [
            "campanhaId",
            "itemId",
            "delta"
        ],
        "additionalProperties": false,
        "description": "Entrada de ajustar quantidade por delta (stepper +/-1, mesmo padrão de Vida/Energia da ficha)\n— `campanhaId`/`itemId` vêm do `@Param`, `delta` do corpo. Quantidade que chega a `<= 0` remove\no item."
    },
    "CampanhaInventarioAlteradoDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            }
        },
        "required": [
            "campanhaId"
        ],
        "additionalProperties": false,
        "description": "Payload do evento de tempo real `campanha:inventario-alterado` — o cliente refaz o GET."
    },
    "CampanhaIdentidadeSeguraDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "descricao": {
                "type": "string"
            },
            "naBase": {
                "type": "boolean"
            }
        },
        "required": [
            "id",
            "nome",
            "descricao",
            "naBase"
        ],
        "additionalProperties": false,
        "description": "Identidade segura de campanha (m8-02) — recorte sem código de convite nem membros, usado pelas\nduas projeções de leitura abaixo. `naBase` viaja porque é estado de jogo, não de gestão (o\nmesmo campo já é público em `CampanhaRecuperadaDto`)."
    },
    "CampanhaPainelEspectadorRecuperarDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            },
            "pagina": {
                "type": "number"
            },
            "itensPorPagina": {
                "type": "number"
            }
        },
        "required": [
            "campanhaId",
            "pagina",
            "itensPorPagina"
        ],
        "additionalProperties": false,
        "description": "Entrada da projeção do painel de espectador (complemento `PainelEspectador` antes do verbo) —\no `campanhaId` vem do `@Param`; `pagina`/`itensPorPagina` da `@Query` (mesmo padrão paginado de\n`RolagemInternoListarDto`)."
    },
    "CampanhaPainelEspectadorDto": {
        "type": "object",
        "properties": {
            "campanha": {
                "$ref": "#/components/schemas/CampanhaIdentidadeSeguraDto"
            },
            "rolagens": {
                "type": "object",
                "additionalProperties": true
            },
            "encontroAtivo": {
                "$ref": "#/components/schemas/EncontroRecuperadoDto",
                "description": "Encontro não-encerrado da campanha, redigido para quem não vê nenhuma ficha (m8-05) — `null`\nsem combate em andamento. Gatilha \"Ver Iniciativa\" no Painel do espectador; o mesmo payload\npara `ESPECTADOR` real e `MESTRE` em prévia (`EncontroService.recuperarEncontroAtivoParaEspectador`)."
            }
        },
        "required": [
            "campanha",
            "rolagens",
            "encontroAtivo"
        ],
        "additionalProperties": false,
        "description": "Saída da projeção do painel de espectador (decisão de produto #5) — identidade segura + feed\npaginado de rolagens exclusivamente `PUBLICA`. Legível por `ESPECTADOR` e por `MESTRE` em modo\nde prévia (o payload é idêntico nos dois casos — privilégio de mestre nunca vaza aqui)."
    },
    "CampanhaPreviaJogadorRecuperarDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            },
            "usuarioAlvoId": {
                "type": "number"
            }
        },
        "required": [
            "campanhaId",
            "usuarioAlvoId"
        ],
        "additionalProperties": false,
        "description": "Entrada da prévia de jogador (complemento `PreviaJogador` antes do verbo) — `campanhaId` e\n`usuarioAlvoId` vêm do `@Param`. Só o mestre da campanha pode requisitar; o alvo precisa ser\n`JOGADOR` ativo (a service valida, nunca o cliente). Sem paginação: o feed reusa o mesmo teto\nde 50 linhas do feed normal de campanha (`RolagemCampanhaListarDto`) — a mesma janela que o\nalvo veria na própria sessão."
    },
    "CampanhaPreviaJogadorDto": {
        "type": "object",
        "properties": {
            "campanha": {
                "$ref": "#/components/schemas/CampanhaIdentidadeSeguraDto"
            },
            "fichas": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/FichaResumoDto"
                }
            },
            "membros": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/CampanhaMembroResumoDto"
                }
            },
            "rolagens": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/RolagemResumoDto"
                }
            },
            "podeAcessarInventarioEsquadrao": {
                "type": "boolean"
            },
            "encontroAtivo": {
                "$ref": "#/components/schemas/EncontroRecuperadoDto",
                "description": "Encontro não-encerrado da campanha, redigido com a identidade do **alvo** (m8-05) — `null` sem\ncombate em andamento. Gatilha \"Ver Iniciativa\" na prévia; nunca o recorte do mestre que\nrequisita (`EncontroService.recuperarEncontroAtivoParaAlvo`)."
            }
        },
        "required": [
            "campanha",
            "fichas",
            "membros",
            "rolagens",
            "podeAcessarInventarioEsquadrao",
            "encontroAtivo"
        ],
        "additionalProperties": false,
        "description": "Saída da prévia de jogador (decisão de produto #6) — fichas visíveis, feed e capacidade de\nacessar o inventário de esquadrão calculados com a identidade do **alvo** (`usuarioAlvoId`),\nnunca do mestre que requisita. Somente leitura: não existe DTO de mutação para esta projeção.\n\n`membros` (m8-04) é a mesma forma de `CampanhaMembroResumoDto` que a visão normal de jogador\nconsome para montar a coluna \"Equipe\" — mas com `acessoCompleto`/visibilidade de ficha oculta\ncalculados como o **alvo** veria (reusa `CampanhaRepository.listarMembros` passando a\nidentidade do alvo, nunca a do mestre que requisita — mesmo racional de `fichas`). O grid\n\"Esquadrão\"/coluna \"Membros\" (visão de mestre) não faz parte desta projeção — só o que a visão\nde **jogador** usa."
    },
    "CampanhaPreviaJogadorFichaRecuperarDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            },
            "usuarioAlvoId": {
                "type": "number"
            },
            "fichaId": {
                "type": "number"
            }
        },
        "required": [
            "campanhaId",
            "usuarioAlvoId",
            "fichaId"
        ],
        "additionalProperties": false,
        "description": "Entrada da ficha completa dentro da prévia de jogador (m8-04, complemento `PreviaJogadorFicha`\nantes do verbo) — `campanhaId`/`usuarioAlvoId`/`fichaId` vêm todos do `@Param`. `campanhaId` é\nchecado contra a campanha real da ficha (defesa em profundidade — a autorização de fato é toda\nde `FichaService.recuperarFichaParaAlvo`, que nunca recebe `campanhaId`: deriva a campanha da\nprópria ficha)."
    },
    "EncontroLinhaDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "campanhaId": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "status": {
                "type": "string",
                "enum": [
                    "MONTAGEM",
                    "ATIVO",
                    "ENCERRADO"
                ]
            },
            "rodadaAtual": {
                "type": "number"
            },
            "turnoIndice": {
                "type": "number"
            }
        },
        "required": [
            "id",
            "campanhaId",
            "nome",
            "status",
            "rodadaAtual",
            "turnoIndice"
        ],
        "additionalProperties": false,
        "description": "Linha crua de `encontro`, como o repositório a devolve."
    },
    "EncontroCombatenteLinhaDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "encontroId": {
                "type": "number"
            },
            "fichaId": {
                "type": "number"
            },
            "nomeAvulso": {
                "type": "string"
            },
            "iniciativa": {
                "type": "number"
            },
            "cadencia": {
                "type": "string",
                "enum": [
                    "SINGULAR",
                    "DUPLA",
                    "TRIPLICE",
                    "FRENETICA"
                ]
            },
            "turnosPorRodada": {
                "type": "number"
            },
            "ordem": {
                "type": "number"
            },
            "vidaMaximaAvulso": {
                "type": "number"
            },
            "vidaAtualAvulso": {
                "type": "number"
            },
            "condicoes": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/CondicaoCombatenteDto"
                }
            },
            "iniciativaFormulaCustom": {
                "type": "string",
                "description": "Expressão de dados que sobrescreve o cálculo padrão de Iniciativa deste combatente (m7-19)."
            },
            "fichaNome": {
                "type": "string"
            },
            "fichaCor": {
                "type": "string"
            },
            "fichaImagemUrl": {
                "type": "string"
            },
            "fichaImagemFoco": {
                "$ref": "#/components/schemas/FichaImagemFocoDto"
            },
            "tipoFicha": {
                "type": "string",
                "enum": [
                    "JOGADOR",
                    "CRIATURA",
                    "NPC"
                ]
            },
            "fichaDados": {
                "oneOf": [
                    {
                        "$ref": "#/components/schemas/FichaJogadorDadosDto"
                    },
                    {
                        "$ref": "#/components/schemas/FichaCriaturaDadosDto"
                    }
                ]
            },
            "fichaOculta": {
                "type": "boolean",
                "description": "Dado bruto pro recorte de identidade \"de carteirinha\" (m7-16) — se a ficha esconde a própria\nidentidade de quem não tem concessão (`ficha.oculta`, m3-65) e o nome de quem a possui. Nunca\nserializado ao cliente: `EncontroService` os usa para decidir o conjunto de fichas com\nidentidade visível antes de descartar as duas colunas."
            },
            "fichaDonoNome": {
                "type": "string"
            },
            "corAvulso": {
                "type": "string"
            },
            "imagemUrlAvulso": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "encontroId",
            "fichaId",
            "nomeAvulso",
            "iniciativa",
            "cadencia",
            "ordem",
            "vidaMaximaAvulso",
            "vidaAtualAvulso",
            "condicoes",
            "iniciativaFormulaCustom",
            "fichaNome",
            "fichaCor",
            "fichaImagemUrl",
            "fichaImagemFoco",
            "tipoFicha",
            "fichaDados",
            "fichaOculta",
            "fichaDonoNome",
            "corAvulso",
            "imagemUrlAvulso"
        ],
        "additionalProperties": false,
        "description": "Linha crua de `encontro_combatente` **já com a ficha resolvida** pelo `JOIN`. `fichaDados` é o\nJSONB da ficha — quem interpreta a forma (jogador × criatura) é a service, que conhece os dois\ncontratos. NPC ainda não tem contrato tipado (`m4-05`): cai no ramo genérico e usa só o que é\ncomum."
    },
    "OrdemTurnoDto": {
        "type": "object",
        "properties": {
            "combatenteId": {
                "type": "number"
            },
            "ocorrencia": {
                "type": "number"
            }
        },
        "required": [
            "combatenteId",
            "ocorrencia"
        ],
        "additionalProperties": false,
        "description": "Um slot da sequência de turnos de uma rodada. `ocorrencia` distingue os turnos múltiplos de um\nmesmo combatente com Cadência > Singular (1 = primeiro turno, 2 = segundo, …), já\n**intercalados** pela regra do guia — o turno extra cai no próximo slot abaixo, nunca em\nsequência (`docs/core/guia_de_mestre-v4.0.0.md` — \"Intercalação na Iniciativa\")."
    },
    "CondicaoCombatenteDto": {
        "type": "object",
        "properties": {
            "nome": {
                "type": "string"
            },
            "rodadasRestantes": {
                "type": "number"
            },
            "perdeTurno": {
                "type": "boolean"
            }
        },
        "required": [
            "nome",
            "rodadasRestantes",
            "perdeTurno"
        ],
        "additionalProperties": false,
        "description": "Marcador de condição sobre um combatente, com duração em rodadas (mockup: `Sangramento ·\n2 rodadas`). `rodadasRestantes: null` = permanente até remoção manual; `perdeTurno` marca a\ncondição que **consome** o próximo turno do combatente (ex.: `Inconsciente`, `Insolação` —\n`sistema-v4.1.0.md`, \"Condições\").\n\nDistinto das três condições da ficha (`morrendo`/`machucado`/`inconsciente`, em\n`FichaEstadoDto`), que são **flags alternadas manualmente** por quem joga — o motor nunca as\nrecalcula a partir de `vidaAtual` (m3-10). O encontro as **lê** da ficha; não as grava aqui."
    },
    "EncontroEventoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "tipo": {
                "type": "string",
                "enum": [
                    "RODADA_INICIADA",
                    "DANO",
                    "CURA",
                    "ENERGIA",
                    "CONDICAO_APLICADA",
                    "CONDICAO_EXPIRADA",
                    "ESTADO_ALTERADO",
                    "COMBATENTE_ADICIONADO",
                    "COMBATENTE_REMOVIDO"
                ]
            },
            "rodada": {
                "type": "number"
            },
            "turno": {
                "type": "number"
            },
            "texto": {
                "type": "string"
            },
            "combatenteId": {
                "type": "number"
            },
            "createdDate": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "tipo",
            "rodada",
            "turno",
            "texto",
            "combatenteId",
            "createdDate"
        ],
        "additionalProperties": false,
        "description": "Uma entrada do log do encontro — a trilha legível exibida no painel \"Log da rodada\". `texto` já\nchega pronto para leitura (\"sofreu 11 de dano de V. Corvalho\"); `rodada`/`turno` posicionam a\nentrada (`R3`, `T3 · 2`). `combatenteId` é nulo para eventos da rodada inteira."
    },
    "EncontroCombatenteResumoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "encontroId": {
                "type": "number"
            },
            "origem": {
                "type": "string",
                "enum": [
                    "FICHA",
                    "AVULSO"
                ]
            },
            "fichaId": {
                "type": "number"
            },
            "tipoFicha": {
                "type": "string",
                "enum": [
                    "JOGADOR",
                    "CRIATURA",
                    "NPC"
                ]
            },
            "nome": {
                "type": "string"
            },
            "iniciativa": {
                "type": "number"
            },
            "cadencia": {
                "type": "string",
                "enum": [
                    "SINGULAR",
                    "DUPLA",
                    "TRIPLICE",
                    "FRENETICA"
                ]
            },
            "turnosPorRodada": {
                "type": "number",
                "description": "Quantidade efetiva; em Cadência Frenética pode ser qualquer inteiro a partir de 4."
            },
            "ordem": {
                "type": "number"
            },
            "vidaAtual": {
                "type": "number"
            },
            "vidaMaxima": {
                "type": "number"
            },
            "energiaAtual": {
                "type": "number"
            },
            "energiaMaxima": {
                "type": "number"
            },
            "defesa": {
                "type": "number"
            },
            "esquiva": {
                "type": "number"
            },
            "bloqueio": {
                "type": "number"
            },
            "contraAtaque": {
                "type": "number"
            },
            "condicoes": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/CondicaoCombatenteDto"
                }
            },
            "morrendo": {
                "type": "boolean",
                "description": "As três condições da própria ficha (`FichaEstadoDto`), **lidas** e nunca gravadas pelo\nencontro: são alternadas à mão por quem joga (m3-10), não deduzidas de `vidaAtual`. Nulas\npara o combatente avulso, que não tem ficha."
            },
            "machucado": {
                "type": "boolean"
            },
            "inconsciente": {
                "type": "boolean"
            },
            "destreza": {
                "type": "number",
                "description": "Destreza efetiva — desempate da ordenação de iniciativa (`shared/regras/encontro`)."
            },
            "iniciativaBonus": {
                "type": "number",
                "description": "Bônus fixo de Iniciativa do combatente — hoje só a criatura o possui\n(`FichaCriaturaDadosDto.iniciativaBonus`, ≈ 10% do VD); agente e avulso saem `0`. Serve ao\natalho **Rolar tudo** do mestre, que o soma à rolagem de Destreza. O bônus de Iniciativa do\nagente **não** é um número fixo: são **dados extras** (amplificador `Atento` + Formação da\nOrigem) que só o documento completo da ficha resolve — por isso o jogador rola a própria\niniciativa pelo fluxo normal (decisão do milestone) e o `Rolar tudo` é fallback."
            },
            "dadoExtraIniciativa": {
                "type": "number",
                "description": "Dado extra de Iniciativa: amplificador `Atento` (`ajusteDadoIniciativaAmplificadores`) +\nFormação da Origem (`PERICIA_DADO_INICIATIVA`, `obterDadoExtraIniciativaFormacao`) — soma à\nquantidade de D6 do atalho **Rolar tudo** do mestre, ao lado da Destreza; mesma soma que\n`dadoExtraIniciativaDaFicha` já faz para o caminho do jogador. Só o agente pode ter\namplificador/Formação; criatura, NPC e avulso saem sempre `0`."
            },
            "iniciativaFormulaCustom": {
                "type": "string",
                "description": "Expressão de dados que **sobrescreve** o cálculo padrão de Iniciativa deste combatente **neste\nencontro** (m7-19) — cobre efeito temporário de cena, condição homebrew ou ajuste pontual sem\nprecisar de sequela/Formação permanente na ficha. `null` usa o cálculo padrão (Destreza em D6 +\n`dadoExtraIniciativa` + `iniciativaBonus`). Quando presente, tem prioridade **total** sobre esse\ncálculo — o mestre sobrescreve a fórmula inteira, não soma a ela. Mestre-only para editar;\nsujeita à mesma regra de `revelado` acima (zerada junto dos demais números)."
            },
            "corFicha": {
                "type": "string",
                "description": "Cor de identidade da ficha (m3-61); `null` cai no `--accent` de quem visualiza."
            },
            "imagemUrl": {
                "type": "string",
                "description": "Avatar e enquadramento da ficha. Para um agente (`tipoFicha: JOGADOR`) cuja ficha não está\n`oculta` (m3-65), sobrevive mesmo sem `revelado` — mesmo recorte de identidade que\n`CampanhaRepository.listarMembros` já usa fora do encontro (m7-16); `null` quando a ficha\nestá oculta ou é de uma criatura/NPC não revelado."
            },
            "imagemFoco": {
                "$ref": "#/components/schemas/FichaImagemFocoDto"
            },
            "donoNome": {
                "type": "string",
                "description": "Dono da ficha (`usuario.nome`) e classe/arquétipo — só presentes num agente (`JOGADOR`) e\nsujeitos à mesma regra de `imagemUrl` acima: sobrevivem sem `revelado` quando a ficha não está\noculta. `null` para criatura/NPC/avulso ou agente oculto/não revelado (m7-16). Nível fica de\nfora de propósito — a carteirinha identifica quem é o agente, não avalia sua força."
            },
            "classe": {
                "type": "string",
                "enum": [
                    "COMBATENTE",
                    "ESPECIALISTA",
                    "SUPORTE",
                    "EXPERIMENTO_BESTIAL",
                    "EXPERIMENTO_ARTIFICIAL",
                    "EXPERIMENTO_HIBRIDO",
                    "CIVIL"
                ]
            },
            "arquetipo": {
                "type": "string",
                "enum": [
                    "LUTADOR",
                    "MERCENARIO",
                    "VANGUARDA",
                    "ENGENHEIRO",
                    "ASSASSINO",
                    "ACADEMICO",
                    "PARAMEDICO",
                    "DIPLOMATA",
                    "COMANDANTE"
                ]
            },
            "resistencias": {
                "type": "object",
                "additionalProperties": true,
                "description": "Resistência a dano por tipo (m7-17), mesmo total que a ficha mostra na aba Combate — soma de\nbase manual + equipamento + Formação para o agente (`montarResistencias`), soma das linhas de\n`resistencias` para a criatura (`somarResistenciasCriaturaPorTipo`). Tipo ausente do mapa vale\n`0`. `null` para NPC (contrato ainda não tipado, m4-05) e avulso, que não têm ficha nenhuma —\né um número como os outros, sujeito à mesma regra de `revelado` acima."
            },
            "revelado": {
                "type": "boolean",
                "description": "`false` quando quem consulta **não** tem direito de ver os **números** deste combatente fora\ndo encontro (m7-06): a criatura que o mestre ainda não revelou (`usuario_ficha_acesso`), a\nficha de outro jogador sem concessão e o avulso, que não tem ficha para revelar. Nesse caso o\nbackend **já zera** vida, energia, defesas, condições e Destreza antes de responder — o resumo\nconserva a identidade mínima da ordem de turno (nome, iniciativa, Cadência) e, para um agente\nde ficha não oculta, também a identidade \"de carteirinha\" acima (avatar, dono, classe, nível)\n— só os números ficam atrás da concessão. O mestre recebe sempre `true`."
            }
        },
        "required": [
            "id",
            "encontroId",
            "origem",
            "fichaId",
            "tipoFicha",
            "nome",
            "iniciativa",
            "cadencia",
            "ordem",
            "vidaAtual",
            "vidaMaxima",
            "energiaAtual",
            "energiaMaxima",
            "defesa",
            "esquiva",
            "bloqueio",
            "contraAtaque",
            "condicoes",
            "morrendo",
            "machucado",
            "inconsciente",
            "destreza",
            "iniciativaBonus",
            "dadoExtraIniciativa",
            "iniciativaFormulaCustom",
            "corFicha",
            "imagemUrl",
            "imagemFoco",
            "donoNome",
            "classe",
            "arquetipo",
            "resistencias",
            "revelado"
        ],
        "additionalProperties": false,
        "description": "Item da lista de combatentes do encontro. Um combatente é **ou** uma ficha (`origem: FICHA`,\n`fichaId` preenchido) **ou** um avulso (`origem: AVULSO`, `fichaId: null`).\n\nVida/Energia: para `FICHA`, `vidaAtual`/`vidaMaxima`/`energiaAtual`/`energiaMaxima` são **lidos\nda ficha** (fonte única, nunca duplicados em `encontro_combatente`); para `AVULSO`, vêm das\ncolunas próprias e a Energia é nula. `iniciativa` é nula enquanto não for rolada/atribuída.\n\nDefesas: `esquiva`/`bloqueio`/`contraAtaque` só existem para agente e NPC. **Criatura não reage\na ataques** — `FichaCriaturaDadosDto` tem apenas `defesa`, então os três vêm nulos para\n`tipoFicha: CRIATURA` (a regra vence o mockup, §16 #27)."
    },
    "EncontroCombatenteAdicionarDto": {
        "type": "object",
        "properties": {
            "fichaId": {
                "type": "number"
            },
            "nomeAvulso": {
                "type": "string"
            },
            "vidaMaximaAvulso": {
                "type": "number"
            },
            "cadencia": {
                "type": "string",
                "enum": [
                    "SINGULAR",
                    "DUPLA",
                    "TRIPLICE",
                    "FRENETICA"
                ]
            },
            "turnosPorRodada": {
                "type": "number",
                "description": "Obrigatório e ≥ 4 quando o avulso usa Cadência Frenética; ignorado nas cadências fixas."
            },
            "corAvulso": {
                "type": "string",
                "description": "Obrigatória para avulso; nula/ignorada quando a origem é uma ficha."
            }
        },
        "required": [
            "fichaId",
            "nomeAvulso",
            "vidaMaximaAvulso",
            "cadencia"
        ],
        "additionalProperties": false,
        "description": "Entrada da adição de um combatente — o `encontroId` vem da rota (`@Param`, injetado no DTO pela\ncontroller). Para `FICHA`, basta `fichaId` (nome, vida, defesas e cadência são resolvidos da\nficha). Para `AVULSO`, o mestre informa `nomeAvulso`, `vidaMaximaAvulso` e a `cadencia`."
    },
    "EncontroCombatenteIdentidadeAlterarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "cor": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "cor"
        ],
        "additionalProperties": false,
        "description": "Entrada da troca da cor de identidade de um combatente avulso."
    },
    "EncontroCombatenteImagemAlterarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "arquivo": {
                "$ref": "#/components/schemas/FichaImagemArquivoDto"
            }
        },
        "required": [
            "id",
            "arquivo"
        ],
        "additionalProperties": false,
        "description": "Entrada multipart da troca de imagem de um combatente avulso."
    },
    "EncontroCombatenteImagemExcluirDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada da remoção da imagem de um combatente avulso."
    },
    "EncontroCombatenteAdicionadoDto": {
        "type": "object",
        "properties": {
            "combatente": {
                "$ref": "#/components/schemas/EncontroCombatenteResumoDto"
            }
        },
        "required": [
            "combatente"
        ],
        "additionalProperties": false,
        "description": "Saída da adição — o combatente já resolvido, pronto para entrar na lista."
    },
    "EncontroCombatenteRemoverDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada da remoção de um combatente do encontro (soft delete)."
    },
    "EncontroCombatenteIniciativaAtribuirDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "iniciativa": {
                "type": "number"
            }
        },
        "required": [
            "id",
            "iniciativa"
        ],
        "additionalProperties": false,
        "description": "Entrada da atribuição de iniciativa a um combatente — vale tanto para o **resultado da rolagem\ndo jogador** quanto para o **override manual do mestre**. O valor final já vem somado (rolagem +\nbônus): o cálculo é do motor de rolagem/ficha, não deste módulo."
    },
    "EncontroCombatenteIniciativaAtribuidaDto": {
        "type": "object",
        "properties": {
            "combatente": {
                "$ref": "#/components/schemas/EncontroCombatenteResumoDto"
            }
        },
        "required": [
            "combatente"
        ],
        "additionalProperties": false,
        "description": "Saída da atribuição de iniciativa."
    },
    "EncontroCombatenteIniciativaFormulaAlterarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "formula": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "formula"
        ],
        "additionalProperties": false,
        "description": "Entrada da sobrescrita da expressão de dados de Iniciativa de um combatente (m7-19) —\nmestre-only. `formula: null` remove a customização e volta ao cálculo padrão do sistema."
    },
    "EncontroCombatenteCondicaoAtribuirDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "rodadasRestantes": {
                "type": "number"
            },
            "perdeTurno": {
                "type": "boolean"
            }
        },
        "required": [
            "id",
            "nome",
            "rodadasRestantes",
            "perdeTurno"
        ],
        "additionalProperties": false,
        "description": "Entrada da aplicação de uma condição a um combatente. `rodadasRestantes: null` = permanente."
    },
    "EncontroCombatenteCondicaoRemoverDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "nome"
        ],
        "additionalProperties": false,
        "description": "Entrada da remoção manual de uma condição (antes de expirar sozinha)."
    },
    "EncontroCriarDto": {
        "type": "object",
        "properties": {
            "nome": {
                "type": "string"
            }
        },
        "required": [
            "nome"
        ],
        "additionalProperties": false,
        "description": "Entrada da criação do encontro — o `campanhaId` vem da rota. Nasce em `MONTAGEM`, sem\ncombatentes. Só o **mestre** da campanha cria, e a campanha aceita no máximo **um** encontro\nnão-encerrado por vez."
    },
    "EncontroCriadoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "campanhaId": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "status": {
                "type": "string",
                "enum": [
                    "MONTAGEM",
                    "ATIVO",
                    "ENCERRADO"
                ]
            }
        },
        "required": [
            "id",
            "campanhaId",
            "nome",
            "status"
        ],
        "additionalProperties": false,
        "description": "Saída da criação — o encontro recém-criado, ainda vazio."
    },
    "EncontroRecuperarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada da recuperação individual do encontro (recuperação individual sempre `{ id }`)."
    },
    "EncontroRecuperadoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "campanhaId": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "status": {
                "type": "string",
                "enum": [
                    "MONTAGEM",
                    "ATIVO",
                    "ENCERRADO"
                ]
            },
            "rodadaAtual": {
                "type": "number"
            },
            "turnoIndice": {
                "type": "number"
            },
            "combatentes": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/EncontroCombatenteResumoDto"
                }
            },
            "ordemRodada": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/OrdemTurnoDto"
                }
            },
            "eventos": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/EncontroEventoDto"
                }
            }
        },
        "required": [
            "id",
            "campanhaId",
            "nome",
            "status",
            "rodadaAtual",
            "turnoIndice",
            "combatentes",
            "ordemRodada",
            "eventos"
        ],
        "additionalProperties": false,
        "description": "Estado completo do encontro — o que a tela \"Iniciativa\" precisa para desenhar tudo: cabeçalho\n(`rodadaAtual`, `turnoIndice`), lista de combatentes, a `ordemRodada` já intercalada por\n`shared/regras/encontro` e o log. `turnoIndice` aponta para uma posição de `ordemRodada`."
    },
    "EncontroAlteradoDto": {
        "type": "object",
        "properties": {
            "encontro": {
                "$ref": "#/components/schemas/EncontroRecuperadoDto"
            }
        },
        "required": [
            "encontro"
        ],
        "additionalProperties": false,
        "description": "Payload de broadcast (`encontro:alterado`) — o estado completo após uma mutação já persistida.\nEmitido pela service **depois** de salvar, na sala `campanha:<id>` (§9, broadcast-only): nenhuma\nescrita entra pelo gateway."
    },
    "EncontroResumoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "campanhaId": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "status": {
                "type": "string",
                "enum": [
                    "MONTAGEM",
                    "ATIVO",
                    "ENCERRADO"
                ]
            },
            "rodadaAtual": {
                "type": "number"
            },
            "quantidadeCombatentes": {
                "type": "number"
            },
            "createdDate": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "campanhaId",
            "nome",
            "status",
            "rodadaAtual",
            "quantidadeCombatentes",
            "createdDate"
        ],
        "additionalProperties": false,
        "description": "Item de listagem dos encontros de uma campanha (corrente + histórico)."
    },
    "EncontroIniciarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada do início do combate (`MONTAGEM` → `ATIVO`) — exige todos os combatentes com iniciativa\ndefinida. Calcula a ordem da rodada 1 e posiciona o turno no primeiro slot."
    },
    "EncontroEncerrarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada do encerramento (`ATIVO` → `ENCERRADO`) — depois disso o encontro é imutável."
    },
    "EncontroTurnoAvancarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada do avanço de turno. Ao passar do último slot da rodada, a rodada **incrementa**, as\ncondições expiram e a ordem é recalculada a partir do estado atual."
    },
    "EncontroTurnoVoltarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada do retorno ao turno anterior — simétrico ao avanço; nunca antes do 1º turno da rodada 1."
    },
    "EncontroIniciativaPedidoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada do pedido de iniciativa do mestre — dispara o broadcast\n(`encontro:iniciativa-pedido`) chamando os jogadores a rolar a própria iniciativa pelo fluxo de\nrolagem já existente."
    },
    "EncontroCombatenteVidaAjustarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "delta": {
                "type": "number"
            },
            "origemTexto": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "delta",
            "origemTexto"
        ],
        "additionalProperties": false,
        "description": "Entrada do ajuste de Vida de um combatente (m7-04) — os steppers `−`/`+` do cartão. `delta` é\nrelativo (negativo = dano, positivo = cura), porque é assim que a mesa opera: \"levou 11\".\n\nPara combatente **com ficha** o ajuste é aplicado na própria ficha pelo módulo dono\n(`FichaService`); só o avulso muda no encontro. `origemTexto` é o complemento opcional que o log\nexibe (\"de V. Corvalho\")."
    },
    "EncontroCombatenteEnergiaAjustarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "delta": {
                "type": "number"
            },
            "origemTexto": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "delta",
            "origemTexto"
        ],
        "additionalProperties": false,
        "description": "Entrada do ajuste de Energia de um combatente (m7-04). Só faz sentido para quem tem Energia —\nagente e NPC; criatura e avulso não têm, e o ajuste é recusado."
    },
    "EncontroIniciativaRolarDto": {
        "type": "object",
        "properties": {
            "encontroId": {
                "type": "number"
            },
            "iniciativaPorCombatente": {
                "type": "object",
                "additionalProperties": true
            }
        },
        "required": [
            "encontroId",
            "iniciativaPorCombatente"
        ],
        "additionalProperties": false,
        "description": "Entrada do atalho **Rolar tudo** do mestre — preenche de uma vez a iniciativa de todos os\ncombatentes que ainda não têm uma. O mapa é `combatenteId → iniciativa já somada`; quem já tem\niniciativa (o jogador que rolou a sua) é ignorado pelo backend, nunca sobrescrito."
    },
    "FichaComboPassoDto": {
        "type": "object",
        "properties": {
            "nome": {
                "type": "string"
            },
            "rolagemNome": {
                "type": "string",
                "description": "Nome do `FichaRolagemDto` referenciado (`dados.rolagens`)."
            },
            "descricao": {
                "type": "string"
            }
        },
        "required": [
            "nome",
            "rolagemNome"
        ],
        "additionalProperties": false,
        "description": "Um passo do combo — referencia um preset de rolagem pelo nome."
    },
    "FichaComboDto": {
        "type": "object",
        "properties": {
            "nome": {
                "type": "string"
            },
            "passos": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/FichaComboPassoDto"
                }
            }
        },
        "required": [
            "nome",
            "passos"
        ],
        "additionalProperties": false,
        "description": "Um combo nomeado — sequência ordenada de passos."
    },
    "FichaCriaturaCriarDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "cor": {
                "type": "string",
                "description": "Cor de identidade visual (m3-61) — mesmo campo/formato de `FichaCriarDto.cor`."
            },
            "dados": {
                "$ref": "#/components/schemas/FichaCriaturaDadosDto"
            }
        },
        "required": [
            "campanhaId",
            "nome",
            "dados"
        ],
        "additionalProperties": false,
        "description": "Entrada de criação — dentro de uma campanha, ou **solta** no acervo do mestre (m4-11:\n`campanhaId: null`). Sem `usuarioId`: o dono é **sempre** o mestre autenticado (§14 — \"criar\ncriatura/NPC\": mestre irrestrito, demais nunca; diferente de jogador, aqui não existe\ndelegação de dono). Solta, a criação exige que o autenticado seja mestre de **alguma**\ncampanha (`CampanhaRepository.contarCampanhasComoMestre`) — sem essa trava, qualquer usuário\ncomum poderia criar uma Ameaça sem nunca ter uma campanha para atribuí-la. Dentro de uma\ncampanha, a regra de sempre é mestre-daquela-campanha, intocada. `dados` é validado contra\n`shared/regras/criatura` (`validarFichaCriatura`) antes de persistir."
    },
    "FichaCriaturaCriadaDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "campanhaId": {
                "type": "number"
            },
            "usuarioId": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "cor": {
                "type": "string"
            },
            "imagemUrl": {
                "type": "string",
                "description": "Sempre `null` na criação — mesmo fluxo de upload em dois passos de `FichaCriadaDto.imagemUrl`."
            },
            "dados": {
                "$ref": "#/components/schemas/FichaCriaturaDadosDto"
            }
        },
        "required": [
            "id",
            "campanhaId",
            "usuarioId",
            "nome",
            "cor",
            "imagemUrl",
            "dados"
        ],
        "additionalProperties": false,
        "description": "Saída de criação — a ficha de criatura criada (identidade/posse + documento de jogo).\n`campanhaId` `null` quando a criatura nasceu solta (m4-11), mesmo contrato de `FichaCriadaDto`."
    },
    "FichaCriaturaRecuperarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada de recuperação individual — `id` vem do `@Param`, injetado pela controller (recuperação\nindividual sempre `{ id }`, nunca primitivo)."
    },
    "FichaCriaturaRecuperadaDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "campanhaId": {
                "type": "number"
            },
            "usuarioId": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "cor": {
                "type": "string"
            },
            "imagemUrl": {
                "type": "string"
            },
            "imagemFoco": {
                "$ref": "#/components/schemas/FichaImagemFocoDto",
                "description": "Enquadramento do avatar — mesmo campo de `FichaRecuperadaDto.imagemFoco`."
            },
            "oculta": {
                "type": "boolean",
                "description": "Ficha oculta (m3-65) — mesmo campo de `FichaRecuperadaDto.oculta`."
            },
            "dados": {
                "$ref": "#/components/schemas/FichaCriaturaDadosDto"
            }
        },
        "required": [
            "id",
            "campanhaId",
            "usuarioId",
            "nome",
            "cor",
            "imagemUrl",
            "imagemFoco",
            "oculta",
            "dados"
        ],
        "additionalProperties": false,
        "description": "Saída da recuperação individual — a ficha de criatura completa. `campanhaId` `null` para uma\ncriatura solta (m4-11) — mesmo contrato de `FichaRecuperadaDto`."
    },
    "FichaCriaturaAlterarDto": {
        "type": "object",
        "properties": {
            "nome": {
                "type": "string"
            },
            "cor": {
                "type": "string"
            },
            "imagemFoco": {
                "$ref": "#/components/schemas/FichaImagemFocoDto",
                "description": "Enquadramento do avatar — mesmo campo de `FichaAlterarDto.imagemFoco`."
            },
            "oculta": {
                "type": "boolean"
            },
            "dados": {
                "$ref": "#/components/schemas/FichaCriaturaDadosDto"
            }
        },
        "required": [
            "nome",
            "dados"
        ],
        "additionalProperties": false,
        "description": "Entrada pública da alteração completa — `nome` + documento de jogo `dados`. Só o dono (o\nmestre) pode alterar (§14, `validarPermissaoEdicao` — reusada sem mudança)."
    },
    "FichaCriaturaAlteradaDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "campanhaId": {
                "type": "number"
            },
            "usuarioId": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "cor": {
                "type": "string"
            },
            "imagemUrl": {
                "type": "string"
            },
            "imagemFoco": {
                "$ref": "#/components/schemas/FichaImagemFocoDto",
                "description": "Enquadramento do avatar — mesmo campo de `FichaAlteradaDto.imagemFoco`."
            },
            "oculta": {
                "type": "boolean"
            },
            "dados": {
                "$ref": "#/components/schemas/FichaCriaturaDadosDto"
            }
        },
        "required": [
            "id",
            "campanhaId",
            "usuarioId",
            "nome",
            "cor",
            "imagemUrl",
            "imagemFoco",
            "oculta",
            "dados"
        ],
        "additionalProperties": false,
        "description": "Saída da alteração — a ficha de criatura alterada. `campanhaId` `null` para uma criatura solta\n(m4-11)."
    },
    "FichaCriaturaVitalidadeAlterarDto": {
        "type": "object",
        "properties": {
            "vidaAtual": {
                "type": "number"
            }
        },
        "required": [
            "vidaAtual"
        ],
        "additionalProperties": false,
        "description": "Entrada da alteração pontual da Vida de uma criatura (m7-04) — o equivalente de\n`FichaVitalidadeAlterarDto` para o documento de criatura, onde `vidaAtual` mora no **topo** do\ndocumento e não em `dados.estado` (criatura não tem Energia). Existe para que o Encontro de\nCombate aplique dano/cura **na ficha**, fonte única do estado, sem regravar o documento inteiro\nnem reimplementar a regra fora do módulo dono."
    },
    "FichaCriaturaDadosDto": {
        "type": "object",
        "properties": {
            "identidade": {
                "$ref": "#/components/schemas/FichaCriaturaIdentidadeDto"
            },
            "na": {
                "type": "string",
                "enum": [
                    "NULA",
                    "BAIXA",
                    "MEDIA",
                    "ALTA",
                    "EXTREMA",
                    "CATASTROFICA",
                    "APOCALIPTICA"
                ],
                "description": "Nível de Ameaça — impacto real da criatura livre por 24h, não dificuldade de combate."
            },
            "vd": {
                "type": "number",
                "description": "Valor de Desafio — meta de design definida como alvo antes de qualquer outro cálculo."
            },
            "atributos": {
                "$ref": "#/components/schemas/FichaAtributosDto",
                "description": "Valor **final** de cada atributo (Base do VD + Pontos de Ajuste + Realocação) — reusa\n`FichaAtributosDto` (mesmos 10 campos do jogador), sem redefinir (proibição #21)."
            },
            "modificadores": {
                "type": "object",
                "additionalProperties": true,
                "description": "Um modificador por atributo, distribuição fixa 2 Forte / 3 Médio / 3 Fraco / 2 Frágil\n(validada por `shared/regras/criatura`, não pelo tipo). Afeta só os testes de atributo\n(Atributo Efetivo) — nunca o valor salvo em `atributos`."
            },
            "tenacidade": {
                "type": "string",
                "enum": [
                    "DESCARTAVEL",
                    "FRAGIL",
                    "PADRAO",
                    "ROBUSTA",
                    "RESISTENTE",
                    "IMPLACAVEL",
                    "ABSOLUTA"
                ]
            },
            "vidaMaxima": {
                "type": "number",
                "description": "Snapshot: VD × multiplicador de Tenacidade (`m4-02`) — editável depois."
            },
            "vidaAtual": {
                "type": "number",
                "description": "Pode exceder `vidaMaxima` (mesma liberdade de edição de m3-10)."
            },
            "defesa": {
                "type": "number",
                "description": "Snapshot: 15 + VD ÷ 2 (`m4-02`) — editável depois. Criatura nunca reage a ataques\n(sem Esquivar/Bloquear); Contra-Ataque só existe quando `modificadores.luta` é `FORTE`\n(derivado, não persistido)."
            },
            "resistencias": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/FichaCriaturaResistenciaDto"
                },
                "description": "Soma dos `valor` ≤ Limite de Resistências (`2×VD`, +25% por Fraqueza extra além da 1ª)."
            },
            "fraquezas": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/FichaCriaturaResistenciaDto"
                },
                "description": "Ao menos 1 obrigatória; mínimo de cada `valor` é 5 ou metade da soma de resistências\n(o que for maior). Mesma forma de `FichaCriaturaResistenciaDto` — o campo (`resistencias`\n× `fraquezas`) já carrega a semântica; um segundo tipo estruturalmente idêntico seria\nduplicação sem ganho."
            },
            "regeneracao": {
                "$ref": "#/components/schemas/FichaCriaturaRegeneracaoDto",
                "description": "Ausente = sem Regeneração Natural (propriedade opcional, não existe por padrão)."
            },
            "porte": {
                "type": "string",
                "enum": [
                    "MINUSCULO",
                    "MEDIO",
                    "GRANDE",
                    "ENORME",
                    "GIGANTE",
                    "TITANICO",
                    "COLOSSAL"
                ]
            },
            "deslocamento": {
                "$ref": "#/components/schemas/FichaCriaturaDeslocamentoDto",
                "description": "Ao menos um modo preenchido; trocar de modo em combate é gratuito (regra de uso, não de forma)."
            },
            "cadencia": {
                "type": "string",
                "enum": [
                    "SINGULAR",
                    "DUPLA",
                    "TRIPLICE",
                    "FRENETICA"
                ]
            },
            "turnosPorRodada": {
                "type": "number",
                "description": "Quantidade efetiva de turnos; para Frenética é declarada pelo Mestre e deve ser ≥ 4."
            },
            "iniciativaBonus": {
                "type": "number",
                "description": "Bônus fixo somado à Iniciativa após a rolagem normal de XD6 de Destreza — Habilidade\nEspecial Passiva opcional (sugestão do guia: ~10% da VD). Ausente/`0` = sem bônus."
            },
            "ataques": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/FichaCriaturaAtaqueDto"
                }
            },
            "habilidades": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/FichaCriaturaHabilidadeDto"
                }
            },
            "anotacoes": {
                "type": "string",
                "description": "Texto livre — mesmo tratamento privado (só dono/mestre) da ficha de jogador."
            }
        },
        "required": [
            "identidade",
            "na",
            "vd",
            "atributos",
            "modificadores",
            "tenacidade",
            "vidaMaxima",
            "vidaAtual",
            "defesa",
            "resistencias",
            "fraquezas",
            "porte",
            "deslocamento",
            "cadencia",
            "ataques",
            "habilidades"
        ],
        "additionalProperties": false,
        "description": "Contrato tipado do documento JSONB `ficha.dados` para a **ficha de criatura** (Ameaça,\n`m4-01`). Forma final derivada de `docs/core/guia_de_mestre-v4.0.0.md` — \"Guia de Criação\nde Ameaças\" — o documento vence o código (proibição #27). Design fechado em `SCHEMA.md`\n(\"FichaCriaturaDadosDto\") antes desta task; aqui só se codifica.\n\n── Dois contratos, não um (decisão de abertura do M4) ───────────────────────\nCriatura e NPC **não compartilham forma** — a mecânica dos dois capítulos do guia\ndivergiu o suficiente para não valer a pena uma variação de um único DTO. Ver\n`FichaNpcDadosDto` (`m4-05`) para o contrato de NPC.\n\n── Sem Maestria ──────────────────────────────────────────────────────────────\nMaestria é mecânica exclusiva de jogador (decisão de abertura do M4) — não existe campo\nequivalente aqui.\n\n── Snapshot na criação + editável depois (mesma filosofia de m3-10) ─────────\n`vidaMaxima`/`vidaAtual` e `defesa` são calculados uma vez na criação\n(`shared/regras/criatura`, `m4-02`) e persistidos; o motor **não os recalcula** sobre\nedições posteriores — o Mestre pode ajustá-los livremente depois. A atual pode exceder a\nmáxima, mesma liberdade de edição da ficha de jogador.\n\n── Validação estrutural (SYSTEM.SPEC §11) ───────────────────────────────────\n`interface readonly` pura, como todos os DTOs do shared — sem class-validator (o backend\nnão liga `ValidationPipe`, decisão vigente do projeto). A validação de coerência de\ndomínio (soma de resistências ≤ limite, modificadores na distribuição fixa 2/3/3/2, ao\nmenos 1 fraqueza, ao menos 1 modo de deslocamento) é responsabilidade de\n`shared/regras/criatura` (`m4-02`), chamada pelo service (`m4-03`) antes de persistir."
    },
    "FichaCriaturaIdentidadeDto": {
        "type": "object",
        "properties": {
            "designacao": {
                "type": "string",
                "description": "Nome da criação — algo lembrável, não um código técnico."
            },
            "origem": {
                "type": "string",
                "enum": [
                    "SCP_ADAPTADO",
                    "ORIGINAL"
                ]
            },
            "conceito": {
                "type": "string",
                "description": "\"Linha de Conceito\" — uma única frase, o gancho de criação que guia tudo depois."
            },
            "naturezaFisica": {
                "type": "string"
            },
            "comportamento": {
                "type": "string",
                "enum": [
                    "CACADORA",
                    "TERRITORIAL",
                    "OPORTUNISTA",
                    "INDIFERENTE",
                    "INTELIGENTE",
                    "CAOTICA"
                ]
            },
            "motivacao": {
                "type": "string"
            },
            "ganchoUnico": {
                "type": "string",
                "description": "O detalhe que nenhum monstro convencional tem — o que os jogadores vão contar depois."
            },
            "temaHorror": {
                "type": "string",
                "description": "Opcional — o que a criatura representa (perda de controle, corpo, identidade…)."
            }
        },
        "required": [
            "designacao",
            "origem",
            "conceito",
            "naturezaFisica",
            "comportamento",
            "motivacao",
            "ganchoUnico"
        ],
        "additionalProperties": false,
        "description": "Ficha de Identidade da criatura (`docs/core/guia_de_mestre-v4.0.0.md` — \"Guia de Criação\nde Ameaças\" > \"Identidade e Classificação\"). Preenchida **antes** de qualquer número —\na criatura precisa existir como conceito coerente primeiro."
    },
    "FichaCriaturaResistenciaDto": {
        "type": "object",
        "properties": {
            "tipo": {
                "type": "string",
                "enum": [
                    "Físico",
                    "Balístico",
                    "Explosão",
                    "Químico",
                    "Geral"
                ]
            },
            "subtipo": {
                "type": "string"
            },
            "valor": {
                "type": "number"
            }
        },
        "required": [
            "tipo",
            "subtipo",
            "valor"
        ],
        "additionalProperties": false,
        "description": "Uma resistência (ou fraqueza — mesma forma, usada nos dois campos) da criatura. `tipo`\nreusa `TipoDanoEnum` (não redefine — proibição #21); `subtipo` é texto livre para uma\nabertura mais específica dentro do tipo (ex.: \"Cortante\" dentro de Físico) — a cada 2\npontos de um subtipo só 1 ponto do Limite de Resistências é gasto (metade do custo de um\ntipo amplo). Resistência a `TipoDanoEnum.GERAL` conta em **dobro** no Limite. Numa\nfraqueza, `valor` é o dano adicional recebido (não dano filtrado) — crítico na fraqueza\nmultiplica em 3× (tipo amplo) ou 4× (subtipo), cálculo derivado, não persistido. Uma\ncriatura nunca tem resistência e fraqueza ao mesmo tipo/subtipo (validado por\n`shared/regras/criatura`)."
    },
    "FichaCriaturaRegeneracaoDto": {
        "type": "object",
        "properties": {
            "modo": {
                "type": "string",
                "enum": [
                    "PASSIVA",
                    "CONDICIONAL"
                ]
            },
            "intensidade": {
                "type": "string",
                "enum": [
                    "RESIDUAL",
                    "MODERADA",
                    "ALTA",
                    "SEVERA",
                    "IMPARAVEL"
                ]
            },
            "valor": {
                "type": "number"
            },
            "condicao": {
                "type": "string"
            }
        },
        "required": [
            "modo",
            "intensidade",
            "valor",
            "condicao"
        ],
        "additionalProperties": false,
        "description": "Regeneração Natural (opcional — campo `regeneracao` ausente na ficha = sem regeneração).\n`condicao` é obrigatória em texto quando `modo` é `CONDICIONAL` e `null` quando `PASSIVA`\n(validado por `shared/regras/criatura`, não pelo tipo). `valor` é absoluto — o % da Vida\nMáxima calculado **uma vez** na criação e registrado como número fixo."
    },
    "FichaCriaturaDeslocamentoDto": {
        "type": "object",
        "properties": {
            "terrestre": {
                "type": "number"
            },
            "voador": {
                "type": "number"
            },
            "aquatico": {
                "type": "number"
            },
            "sobrenatural": {
                "type": "number",
                "description": "Ignora terreno/obstáculos e reações; ver guia para as regras especiais de uso em jogo."
            }
        },
        "additionalProperties": false,
        "description": "Deslocamento da criatura — ao menos um modo preenchido (validado por\n`shared/regras/criatura`). Cada modo é independente e trocar entre os declarados não\nconsome ação. `terrestre` tem uma tabela de sugestão por Destreza no guia, mas o valor é\nsempre declarado pelo Mestre, nunca calculado automaticamente a partir do atributo."
    },
    "FichaCriaturaAtaqueDto": {
        "type": "object",
        "properties": {
            "nome": {
                "type": "string"
            },
            "teste": {
                "type": "string",
                "description": "Fórmula de teste (ex. `\"lutad20kh1+3\"`) — livre, não fica preso a um único atributo."
            },
            "custoAcao": {
                "type": "string",
                "enum": [
                    "MOVIMENTO",
                    "PADRAO",
                    "COMPLETA"
                ]
            },
            "dano": {
                "type": "string",
                "description": "Fórmula de dano (ex. `\"4D12+10[Físico]\"`) — o tipo de dano vai na própria fórmula, não é\nmais um campo à parte (`rolarFormula` já extrai a tag de tipo direto da expressão)."
            },
            "danoCritico": {
                "type": "string",
                "description": "Fórmula de dano crítico — independente de `dano`, o Mestre escreve o efeito exato."
            },
            "area": {
                "type": "boolean"
            },
            "efeito": {
                "type": "string",
                "description": "Condição/teste/efeito adicional além do dano — opcional."
            }
        },
        "required": [
            "nome",
            "teste",
            "custoAcao",
            "dano",
            "danoCritico",
            "area"
        ],
        "additionalProperties": false,
        "description": "Um ataque da criatura. `teste`, `dano` e `danoCritico` são texto livre na notação de dados\ndo sistema (ex. `\"4D12+10\"`) — a tabela de dano de referência por VD/custo de ação\n(`shared/regras/criatura`) é só **sugestão**, o Mestre pode divergir. `area: true` exige\nAção Completa por padrão e testa Destreza/Vigor do alvo contra a DT do teste de ataque da\ncriatura, em vez da Defesa individual (regra de uso, não de forma).\n\n`teste`/`danoCritico` viraram expressão livre (não mais `atributo: keyof FichaAtributosDto`\n+ dobra automática) porque um ataque de criatura pode testar/rolar mais dados do que o\nconvencional de um único atributo — o Mestre escreve a fórmula exata que quer, inclusive\nquando o \"crítico\" não é simplesmente o dobro do dano normal (ex.: muda o tipo de dano)."
    },
    "FichaCriaturaHabilidadeDto": {
        "type": "object",
        "properties": {
            "nome": {
                "type": "string"
            },
            "tipo": {
                "type": "string",
                "enum": [
                    "PASSIVA",
                    "ATIVA",
                    "GATILHO"
                ]
            },
            "descricao": {
                "type": "string"
            },
            "restricao": {
                "type": "string"
            }
        },
        "required": [
            "nome",
            "tipo",
            "descricao"
        ],
        "additionalProperties": false,
        "description": "Uma habilidade especial da criatura — propriedade da própria criatura, não selecionada de\num catálogo (diferente das habilidades de jogador). `restricao` é a frequência/condição\nde uso quando aplicável (ex.: \"uma vez por cena\", \"recarga de 3 turnos\")."
    },
    "FichaCriarDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            },
            "usuarioId": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "cor": {
                "type": "string",
                "description": "Cor de identidade visual da ficha (m3-61) — hex de 6 dígitos (`#rrggbb`) ou `null`/ausente\n(cai no `--accent` de quem visualiza). Coluna relacional, ao lado de `nome` — nunca dentro do\nJSONB `dados`. **Não confundir com `--accent`**: aquele é a cor de tema por **usuário**\n(`TemaService`); esta é a identidade visual da **ficha**, igual para todo mundo que a vê."
            },
            "dados": {
                "$ref": "#/components/schemas/FichaJogadorDadosDto"
            }
        },
        "required": [
            "nome",
            "dados"
        ],
        "additionalProperties": false,
        "description": "Entrada de criação de ficha de jogador — com `campanhaId`, a ficha entra na campanha\ninformada; **omitido/`null`** (m3-28), a ficha nasce **solta** no acervo do dono (sem\n`validarMembro`, sem afordance de escolher outro dono — `usuarioId` só se aplica dentro de\numa campanha). `usuarioId` é o dono; **omitido, é o usuário autenticado** (a própria ficha).\nUm `usuarioId` diferente do autenticado só é aceito se o autenticado for o **mestre** da\ncampanha (§14 — \"criar ficha de jogador\": dono só a própria, mestre sem restrição) — do\ncontrário a service recusa com `UnauthorizedAccessException`. O `dados` é o documento de\njogo completo (validado contra `shared/regras` na service antes de persistir)."
    },
    "FichaCriadaDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "campanhaId": {
                "type": "number"
            },
            "usuarioId": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "cor": {
                "type": "string",
                "description": "Cor de identidade visual (m3-61) — ver {@link FichaCriarDto.cor}."
            },
            "imagemUrl": {
                "type": "string",
                "description": "URL do avatar da ficha (m3-62) — sempre `null` na criação: a ficha nasce sem `id` para o\nendpoint dedicado (`POST /ficha/:id/imagem`), então o upload é um segundo request, em\nsequência, feito pelo cliente logo após este retornar."
            },
            "dados": {
                "$ref": "#/components/schemas/FichaJogadorDadosDto"
            }
        },
        "required": [
            "id",
            "campanhaId",
            "usuarioId",
            "nome",
            "cor",
            "imagemUrl",
            "dados"
        ],
        "additionalProperties": false,
        "description": "Saída de criação — a ficha criada (identidade/posse + documento de jogo). `campanhaId`\n`null` quando a ficha nasceu solta no acervo (m3-28)."
    },
    "FichaListarDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            }
        },
        "required": [
            "campanhaId"
        ],
        "additionalProperties": false,
        "description": "Entrada da listagem de fichas de uma campanha — o `campanhaId` vem do `@Query`, injetado no\nDTO pela controller. O recorte visível depende do papel do autor (§14): o mestre vê todas as\nfichas da campanha; um membro vê as próprias e as concedidas (`usuario_ficha_acesso`). A saída\né sempre resumida (`FichaResumoDto`)."
    },
    "FichaMediasEsquadraoDto": {
        "type": "object",
        "properties": {
            "mediaNivel": {
                "type": "number"
            },
            "mediaPrestigio": {
                "type": "number"
            },
            "quantidade": {
                "type": "number"
            }
        },
        "required": [
            "mediaNivel",
            "mediaPrestigio",
            "quantidade"
        ],
        "additionalProperties": false,
        "description": "Saída da média de Nível/Prestígio dos agentes (`JOGADOR`) ativos de uma campanha — recorte\ncalculado (`Entidade + Recorte + Dto`, sem verbo), consumido pelo guia de criação ao aplicar\n\"Iniciando um Novo Agente\" (`docs/core/sistema-v4.1.0.md`). É um **agregado**: nunca expõe\nfichas individuais, então **não** passa pela matriz de visibilidade por ficha (§14) que\n`listarFichas` aplica — qualquer membro da campanha pode consultar, mestre ou jogador comum,\nmesmo sem `usuario_ficha_acesso` sobre as fichas alheias somadas na média. Reusa `FichaListarDto`\ncomo entrada (mesmo `campanhaId`). `quantidade` é o total de agentes considerados — `0` quando a\ncampanha ainda não tem nenhum, caso em que `mediaNivel`/`mediaPrestigio` saem `0`."
    },
    "FichaResumoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "campanhaId": {
                "type": "number"
            },
            "campanhaNome": {
                "type": "string"
            },
            "usuarioId": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "cor": {
                "type": "string",
                "description": "Cor de identidade visual (m3-61) — ver {@link FichaCriarDto.cor}. Alimenta o avatar do mini-card."
            },
            "tipo": {
                "type": "string",
                "enum": [
                    "JOGADOR",
                    "CRIATURA",
                    "NPC"
                ],
                "description": "Tipo da ficha (`m4-04`) — `JOGADOR`/`CRIATURA`/`NPC`. Alimenta a divisão da coluna\n\"Esquadrão\" (jogador) × \"Criaturas\" no painel da campanha; os campos abaixo (`classe`/\n`arquetipo`/`nivel`) só fazem sentido para `JOGADOR` — numa `CRIATURA` saem `null`/`0` e o\nmini-card usa `na` no lugar. Opcional (não `undefined` em produção — a query sempre resolve\nvia `JOIN tipo_ficha`) só para não obrigar todo fixture de teste pré-m4-04 a declarar o campo;\no front trata ausência como \"não é criatura\" (mesmo efeito de `JOGADOR`)."
            },
            "na": {
                "type": "string",
                "enum": [
                    "NULA",
                    "BAIXA",
                    "MEDIA",
                    "ALTA",
                    "EXTREMA",
                    "CATASTROFICA",
                    "APOCALIPTICA"
                ],
                "description": "Nível de Ameaça (`FichaCriaturaDadosDto.na`) — só presente numa ficha `CRIATURA`."
            },
            "vd": {
                "type": "number",
                "description": "Valor de Desafio (`FichaCriaturaDadosDto.vd`) — só presente numa ficha `CRIATURA`. Alimenta o\nseletor de combatentes do Encontro, que mostra NA + VD no lugar de classe/nível."
            },
            "classe": {
                "type": "string",
                "enum": [
                    "COMBATENTE",
                    "ESPECIALISTA",
                    "SUPORTE",
                    "EXPERIMENTO_BESTIAL",
                    "EXPERIMENTO_ARTIFICIAL",
                    "EXPERIMENTO_HIBRIDO",
                    "CIVIL"
                ]
            },
            "arquetipo": {
                "type": "string",
                "enum": [
                    "LUTADOR",
                    "MERCENARIO",
                    "VANGUARDA",
                    "ENGENHEIRO",
                    "ASSASSINO",
                    "ACADEMICO",
                    "PARAMEDICO",
                    "DIPLOMATA",
                    "COMANDANTE"
                ]
            },
            "nivel": {
                "type": "number"
            },
            "vidaAtual": {
                "type": "number"
            },
            "vidaMaxima": {
                "type": "number"
            },
            "energiaAtual": {
                "type": "number"
            },
            "energiaMaxima": {
                "type": "number"
            },
            "morrendo": {
                "type": "boolean"
            },
            "machucado": {
                "type": "boolean"
            },
            "inconsciente": {
                "type": "boolean"
            },
            "prestigio": {
                "type": "number",
                "description": "Prestígio — alimenta a Patente exibida no mini-card (`rotuloPatente`, calculada no cliente)."
            },
            "defesa": {
                "type": "number",
                "description": "Defesa/Esquiva/Bloqueio — derivados persistidos (`FichaDerivadosDto`, m3-10), lidos direto do\nJSONB sem fallback calculado (o resumo não tem atributos/habilidades para recalcular ao vivo).\n`undefined` numa ficha sem `derivados` salvo (retrocompat) ou cuja classe não os possui (Civil)."
            },
            "esquiva": {
                "type": "number"
            },
            "bloqueio": {
                "type": "number"
            },
            "contraAtaque": {
                "type": "number",
                "description": "Contra-Ataque — snapshot `derivados` **ou**, se `undefined` (a habilidade \"Contra-Ataque\" entrou\nna ficha depois da criação, sem cascata de `ajustarHabilidades` — m3-13), o `FichaService`\nrecalcula ao vivo (`calcularDerivados`, `shared/regras/agente/derivados`) a partir de\n`FichaResumoInternoDto.atributos`/`habilidades` — mesmo fallback \"stored > calculado\" da tela da\nprópria ficha (m3-10). `undefined` só quando nenhuma habilidade concede contra-ataque."
            },
            "personalidade": {
                "type": "string",
                "description": "Personalidade e nome da Origem (`FichaIdentidadeDto`, m3-23) — `null`/ausente sem Identidade definida."
            },
            "origemNome": {
                "type": "string"
            },
            "imagemUrl": {
                "type": "string",
                "description": "URL do avatar da ficha (m3-62) — `null` sem imagem definida (cai no placeholder decorativo)."
            },
            "sobrecarregado": {
                "type": "boolean",
                "description": "`true` quando o peso do inventário excede o Inventário Máximo (aviso, não trava —\n`sistema-v4.1.0.md`). Calculado com exatidão pelo `FichaService` via `calcularResumoCompras`\n(`shared/regras/compras`) — o mesmo motor que a aba Inventário usa —, não uma aproximação: o\n`FichaResumoInternoDto` que a repository devolve carrega os campos brutos (itens/amplificadores/\ndinheiro/vontade/inventário base) que a fórmula precisa, e o service os reduz a este único\nbooleano antes de expor o resumo público. `undefined` numa ficha sem `derivados.inventarioMaximo`\nsalvo (retrocompat) — sem o máximo não há o que comparar."
            }
        },
        "required": [
            "id",
            "campanhaId",
            "campanhaNome",
            "usuarioId",
            "nome",
            "classe",
            "arquetipo",
            "nivel",
            "vidaAtual",
            "energiaAtual",
            "morrendo",
            "machucado",
            "inconsciente",
            "imagemUrl"
        ],
        "additionalProperties": false,
        "description": "Item de listagem — recorte enxuto da ficha, com os campos de jogo lidos do JSONB\n(`dados->>'classe'`, `dados->>'nivel'` — §10.4). `usuarioId` é o dono, para o front distinguir\n\"minha ficha\" das demais.\n\nVida/Energia + as três condições rastreadas (`morrendo`/`machucado`/`inconsciente` —\n`sistema-v4.1.0.md`, \"Condições\") entraram para alimentar o mini-card de ficha embutido no\ndetalhe da campanha (m2-16) sem precisar do documento completo — continua um recorte, não o\n`dados` inteiro (§14/§10.4: a listagem nunca expõe inventário/habilidades/sequelas de terceiros).\n`vidaMaxima`/`energiaMaxima` seguem opcionais (retrocompat de `FichaEstadoDto`, m3-10 — fichas\nsem snapshot); as três condições vêm sempre resolvidas (`false` quando ausentes no documento).\n`arquetipo` acompanha `classe` para o mini-card mostrar \"Classe - Arquétipo\" — `null` quando a\nclasse é uma subclasse Experimento ou `CIVIL` (mesma regra de `FichaJogadorDadosDto.arquetipo`).\n\n`campanhaId`/`campanhaNome` (m3-28) alimentam o **chip de campanha** do acervo (`/fichas`,\n`FichaAcervo`) — `null`/`null` para uma ficha solta (\"Sem campanha\"). O mesmo recorte também\natende a listagem campanha-scoped (`listarPorCampanha`/`listarVisiveisParaUsuario`), onde os\ndois campos são redundantes (a campanha já é conhecida pela rota) mas inofensivos."
    },
    "FichaAcervoListarDto": {
        "type": "object",
        "properties": {
            "usuarioId": {
                "type": "number"
            }
        },
        "required": [
            "usuarioId"
        ],
        "additionalProperties": false,
        "description": "Entrada da listagem do **acervo** (m3-28) — todas as fichas do dono, com e sem campanha\n(`FichaRepository.listarPorUsuario`). `usuarioId` é sempre o autenticado (`@ActiveUser().sub`),\nmontado pela controller — mesmo padrão de `CampanhaListarDto`. A saída é a `FichaResumoDto`\n(com `campanhaId`/`campanhaNome` resolvidos) — sem DTO de item dedicado."
    },
    "FichaRecuperarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada de recuperação individual — o `id` vem do `@Param`, injetado no DTO pela controller\n(recuperação individual sempre `{ id }`, nunca primitivo)."
    },
    "FichaRecuperadaDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "campanhaId": {
                "type": "number"
            },
            "usuarioId": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "cor": {
                "type": "string",
                "description": "Cor de identidade visual (m3-61) — ver {@link FichaCriarDto.cor}."
            },
            "imagemUrl": {
                "type": "string",
                "description": "URL do avatar da ficha (m3-62) — ver {@link FichaCriadaDto.imagemUrl}."
            },
            "imagemFoco": {
                "$ref": "#/components/schemas/FichaImagemFocoDto",
                "description": "Enquadramento do avatar — ver {@link FichaImagemFocoDto}. `null` sem ajuste definido."
            },
            "oculta": {
                "type": "boolean",
                "description": "Ficha oculta (m3-65) — `true` some completamente de qualquer jogador que não seja o dono ou o mestre."
            },
            "tipo": {
                "type": "string",
                "enum": [
                    "JOGADOR",
                    "CRIATURA",
                    "NPC"
                ],
                "description": "Tipo da ficha (m4-11) — `JOGADOR`/`CRIATURA`/`NPC`, resolvido via `JOIN tipo_ficha` só em\n`FichaRepository.recuperarPorId` (mesma tradução `codigo ↔ id` de `colunasResumo()`,\n§10.2.12). Habilita `FichaService.atribuirCampanha`/`duplicarFicha` a ramificar por tipo sem\nreconsultar o banco. Opcional pelo mesmo motivo de `FichaResumoDto.tipo`: as demais queries\nque devolvem este formato (`alterarFicha`, `alterarVitalidade`…) não têm o `JOIN` e não\nprecisam dele — ausência equivale a `JOGADOR`, nunca lido fora do par\n`atribuirCampanha`/`duplicarFicha`."
            },
            "dados": {
                "$ref": "#/components/schemas/FichaJogadorDadosDto"
            }
        },
        "required": [
            "id",
            "campanhaId",
            "usuarioId",
            "nome",
            "cor",
            "imagemUrl",
            "imagemFoco",
            "oculta",
            "dados"
        ],
        "additionalProperties": false,
        "description": "Saída da recuperação individual — a ficha completa (identidade/posse + documento de jogo).\n`campanhaId` `null` para uma ficha solta no acervo (m3-28)."
    },
    "FichaPreviaJogadorRecuperarDto": {
        "type": "object",
        "properties": {
            "fichaId": {
                "type": "number"
            },
            "usuarioAlvoId": {
                "type": "number"
            }
        },
        "required": [
            "fichaId",
            "usuarioAlvoId"
        ],
        "additionalProperties": false,
        "description": "Entrada da recuperação de ficha completa para a **prévia de jogador** (`m8-espectadores-\ncampanha`, m8-04) — complemento `PreviaJogador` antes do verbo, campos explícitos (composta,\nnão `{ id }`, mesmo padrão de `CampanhaMembroInternoRecuperarDto`). Só o mestre da campanha\npode requisitar; a visibilidade/redação de `dados` (`omitirCamposPrivados`) é calculada com a\nidentidade do **alvo** (`usuarioAlvoId`), nunca do mestre — a service nunca reimplementa a\nregra de `validarPermissaoVisualizacao`, só a avalia para outro usuário."
    },
    "FichaAlterarDto": {
        "type": "object",
        "properties": {
            "nome": {
                "type": "string"
            },
            "cor": {
                "type": "string",
                "description": "Cor de identidade visual (m3-61) — ver {@link FichaCriarDto.cor}. Sem trava de imutabilidade."
            },
            "imagemFoco": {
                "$ref": "#/components/schemas/FichaImagemFocoDto",
                "description": "Enquadramento do avatar — ver {@link FichaImagemFocoDto}. Ausente/`null` limpa o ajuste."
            },
            "oculta": {
                "type": "boolean",
                "description": "Ficha oculta (m3-65) — ver {@link FichaRecuperadaDto.oculta}. Ausente equivale a `false`."
            },
            "dados": {
                "$ref": "#/components/schemas/FichaJogadorDadosDto"
            }
        },
        "required": [
            "nome",
            "dados"
        ],
        "additionalProperties": false,
        "description": "Entrada pública da alteração completa da ficha — `nome` + documento de jogo `dados`. Só o dono\nou o mestre podem alterar (§14); a permissão e a validação via `shared/regras` são arbitradas\nna service. O `id` vem no DTO interno (nunca `alterar(id, dados)`)."
    },
    "FichaAlteradaDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "campanhaId": {
                "type": "number"
            },
            "usuarioId": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            },
            "cor": {
                "type": "string",
                "description": "Cor de identidade visual (m3-61) — ver {@link FichaCriarDto.cor}."
            },
            "imagemUrl": {
                "type": "string",
                "description": "URL do avatar da ficha (m3-62) — ver {@link FichaCriadaDto.imagemUrl}. Preservado — `alterarFicha` nunca o toca."
            },
            "imagemFoco": {
                "$ref": "#/components/schemas/FichaImagemFocoDto",
                "description": "Enquadramento do avatar — ver {@link FichaImagemFocoDto}."
            },
            "oculta": {
                "type": "boolean",
                "description": "Ficha oculta (m3-65) — ver {@link FichaRecuperadaDto.oculta}."
            },
            "dados": {
                "$ref": "#/components/schemas/FichaJogadorDadosDto"
            }
        },
        "required": [
            "id",
            "campanhaId",
            "usuarioId",
            "nome",
            "cor",
            "imagemUrl",
            "imagemFoco",
            "oculta",
            "dados"
        ],
        "additionalProperties": false,
        "description": "Saída da alteração — a ficha alterada. `campanhaId` `null` para uma ficha solta (m3-28)."
    },
    "FichaExcluirDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada da exclusão (soft delete) — o `id` vem do `@Param`. Só o dono ou o mestre podem."
    },
    "FichaImagemFocoDto": {
        "type": "object",
        "properties": {
            "x": {
                "type": "number"
            },
            "y": {
                "type": "number"
            },
            "escala": {
                "type": "number"
            }
        },
        "required": [
            "x",
            "y",
            "escala"
        ],
        "additionalProperties": false,
        "description": "Enquadramento do avatar (crop-pan, ajuste pós-mockup) — metadado puro, sem processamento de\nimagem no servidor (`m3-62` deixou \"crop/editor de imagem no client\" fora de escopo; isto é a\nretomada, sem `sharp`). `x`/`y` são percentuais (0–100) do ponto da imagem ampliada que fica\ncentralizado na caixa, e `escala` é o multiplicador de zoom (1–3). No client os três viram um\núnico `transform: translate()+scale()` (ver `estiloTransformEnquadramento`,\n`frontend/src/app/shared/enquadramento-imagem.util.ts`) — sem margem de arrasto até dar zoom.\n`null`/ausente equivale a `escala: 1` (sem zoom, avatar centralizado) — fichas existentes sem\najuste não mudam de aparência. Persistido junto de `imagemUrl` (coluna `imagem_foco`, JSONB)\nmas **não** pelo endpoint de upload (`POST /ficha/:id/imagem`, multipart): viaja pelo\n`PUT /ficha/:id` genérico, como `cor`, porque é só números — dá para reajustar sem reenviar o\narquivo."
    },
    "FichaImagemArquivoDto": {
        "type": "object",
        "properties": {
            "conteudo": {
                "type": "object",
                "additionalProperties": true
            },
            "mimetype": {
                "type": "string"
            },
            "tamanho": {
                "type": "number"
            }
        },
        "required": [
            "conteudo",
            "mimetype",
            "tamanho"
        ],
        "additionalProperties": false,
        "description": "Conteúdo bruto de um arquivo enviado por upload — value-object sem entidade nem verbo\n(`dto-conventions`). `conteudo` é `Uint8Array` (não `Buffer`, tipo Node-only) — o mesmo dado\ndo buffer do Multer, que é uma `Buffer` (subtipo estrutural de `Uint8Array`)."
    },
    "FichaImagemAlterarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "arquivo": {
                "$ref": "#/components/schemas/FichaImagemArquivoDto"
            }
        },
        "required": [
            "id",
            "arquivo"
        ],
        "additionalProperties": false,
        "description": "Entrada da troca de avatar — o `id` vem do `@Param`; `arquivo` é montado pela controller a\npartir do `Express.Multer.File` (`FileInterceptor('arquivo')`). MIME (`image/jpeg`/`png`/\n`webp`) e tamanho máximo são validados na service (`BusinessException` se falhar)."
    },
    "FichaImagemExcluirDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada da remoção do avatar — o `id` vem do `@Param`. Só o dono ou o mestre podem."
    },
    "FichaImagemAlteradaDto": {
        "type": "object",
        "properties": {
            "imagemUrl": {
                "type": "string"
            }
        },
        "required": [
            "imagemUrl"
        ],
        "additionalProperties": false,
        "description": "Saída da troca/remoção do avatar — a nova `imagemUrl` (`null` após remover)."
    },
    "FichaCampanhaAtribuirDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            }
        },
        "required": [
            "campanhaId"
        ],
        "additionalProperties": false,
        "description": "Entrada da atribuição — o `id` da ficha vem do `@Param`, injetado no DTO pela controller."
    },
    "FichaCampanhaAtribuidaDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "campanhaId": {
                "type": "number"
            }
        },
        "required": [
            "id",
            "campanhaId"
        ],
        "additionalProperties": false,
        "description": "Saída da atribuição — a ficha e sua campanha atual (ou `null`, se desatribuída)."
    },
    "FichaDuplicarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada da duplicação (m3-52, item 26) — o `id` da ficha **original** vem do `@Param`, injetado\nno DTO pela controller. Só o dono ou o mestre da ficha original podem duplicar (§14, mesma regra\nde `validarPermissaoEdicao`); o clone pertence sempre a quem duplicou, nunca ao dono original. A\nsaída reaproveita `FichaCriadaDto` — a duplicação **é** uma criação (`duplicarFicha` reusa\n`criarFicha` por inteiro), sem um DTO de saída dedicado para o mesmo formato."
    },
    "FichaAcessoConcederDto": {
        "type": "object",
        "properties": {
            "fichaId": {
                "type": "number"
            },
            "usuarioId": {
                "type": "number"
            }
        },
        "required": [
            "fichaId",
            "usuarioId"
        ],
        "additionalProperties": false,
        "description": "Entrada da concessão de acesso de visualização — o `fichaId` vem do `@Param`, injetado no DTO\npela controller; o `usuarioId` (membro alvo da concessão) vem do corpo. Só o dono ou o mestre\nconcedem (§14); a permissão é arbitrada na service."
    },
    "FichaAcessoConcedidoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "fichaId": {
                "type": "number"
            },
            "usuarioId": {
                "type": "number"
            }
        },
        "required": [
            "id",
            "fichaId",
            "usuarioId"
        ],
        "additionalProperties": false,
        "description": "Saída da concessão — a linha de `usuario_ficha_acesso` criada (ou a já existente, idempotente)."
    },
    "FichaAcessoRevogarDto": {
        "type": "object",
        "properties": {
            "fichaId": {
                "type": "number"
            },
            "usuarioId": {
                "type": "number"
            }
        },
        "required": [
            "fichaId",
            "usuarioId"
        ],
        "additionalProperties": false,
        "description": "Entrada da revogação de acesso — `fichaId` e `usuarioId` vêm do `@Param`, injetados no DTO pela\ncontroller. Revogação é soft delete (proibição #14); só o dono ou o mestre revogam (§14)."
    },
    "FichaAcessoRevogadoDto": {
        "type": "object",
        "properties": {
            "fichaId": {
                "type": "number"
            },
            "usuarioId": {
                "type": "number"
            }
        },
        "required": [
            "fichaId",
            "usuarioId"
        ],
        "additionalProperties": false,
        "description": "Saída da revogação — confirmação do par (ficha, usuário) cuja concessão foi revogada."
    },
    "FichaVisibilidadeAlteradaDto": {
        "type": "object",
        "properties": {
            "fichaId": {
                "type": "number"
            },
            "campanhaId": {
                "type": "number"
            }
        },
        "required": [
            "fichaId",
            "campanhaId"
        ],
        "additionalProperties": false,
        "description": "Evento de tempo real que invalida a listagem autorizada de fichas de uma campanha. O payload é\ndeliberadamente mínimo: não revela nem o novo estado de visibilidade nem dados da ficha a quem\nestá na sala ampla `campanha:<id>`."
    },
    "FichaAcessosListarDto": {
        "type": "object",
        "properties": {
            "fichaId": {
                "type": "number"
            }
        },
        "required": [
            "fichaId"
        ],
        "additionalProperties": false,
        "description": "Entrada da listagem das concessões ativas de uma ficha — o `fichaId` vem do `@Param`, injetado\nno DTO pela controller. Só o dono ou o mestre listam (§14). A saída é sempre resumida\n(`FichaAcessoResumoDto`)."
    },
    "FichaAcessoResumoDto": {
        "type": "object",
        "properties": {
            "usuarioId": {
                "type": "number"
            },
            "nome": {
                "type": "string"
            }
        },
        "required": [
            "usuarioId",
            "nome"
        ],
        "additionalProperties": false,
        "description": "Item de listagem das concessões — o membro que recebeu acesso de visualização (`usuarioId` +\n`nome`, lido de `usuario`). Recorte enxuto, para a UI de gestão de acessos (m3-07)."
    },
    "FichaInventarioItemPegarDto": {
        "type": "object",
        "properties": {
            "fichaId": {
                "type": "number"
            },
            "campanhaItemId": {
                "type": "string"
            },
            "quantidade": {
                "type": "number"
            }
        },
        "required": [
            "fichaId",
            "campanhaItemId"
        ],
        "additionalProperties": false,
        "description": "Entrada de \"pegar\" um item do inventário de esquadrão pra própria ficha — o `fichaId` vem do\n`@Param`. `campanhaItemId` é o `id` estável do item no inventário de esquadrão (sempre presente\n— gerado no `POST /campanha/:id/inventario/item`). Sem `quantidade`, transfere o item inteiro."
    },
    "FichaInventarioItemMandarParaBaseDto": {
        "type": "object",
        "properties": {
            "fichaId": {
                "type": "number"
            },
            "indice": {
                "type": "number"
            },
            "quantidade": {
                "type": "number"
            }
        },
        "required": [
            "fichaId",
            "indice"
        ],
        "additionalProperties": false,
        "description": "Entrada de \"mandar pra base\" um item do inventário da ficha — o `fichaId` vem do `@Param`.\n`indice` é a posição do item em `ficha.dados.inventario.itens` **no momento da leitura desta\nrequisição** (mesmo endereçamento por posição que `ficha-inventario.component.ts` já usa no\nfrontend — `CarrinhoItemDto.id` só existe em containers de sub-inventário, m3-44, não em\nitens comuns). Sem `quantidade`, transfere o item inteiro. Bloqueado se o item estiver\n`equipado: true`."
    },
    "FichaVitalidadeAlterarDto": {
        "type": "object",
        "properties": {
            "vidaAtual": {
                "type": "number"
            },
            "energiaAtual": {
                "type": "number"
            }
        },
        "additionalProperties": false,
        "description": "Entrada da alteração pontual de Vida/Energia pelos cards da campanha."
    },
    "FichaAtributosDto": {
        "type": "object",
        "properties": {
            "destreza": {
                "type": "number"
            },
            "forca": {
                "type": "number"
            },
            "luta": {
                "type": "number"
            },
            "pontaria": {
                "type": "number"
            },
            "vigor": {
                "type": "number"
            },
            "intelecto": {
                "type": "number"
            },
            "medicina": {
                "type": "number"
            },
            "sentidos": {
                "type": "number"
            },
            "social": {
                "type": "number"
            },
            "vontade": {
                "type": "number"
            }
        },
        "required": [
            "destreza",
            "forca",
            "luta",
            "pontaria",
            "vigor",
            "intelecto",
            "medicina",
            "sentidos",
            "social",
            "vontade"
        ],
        "additionalProperties": false,
        "description": "Os dez atributos de um agente (`docs/core/sistema-v4.1.0.md` — \"Atributos\").\nO documento agrupa cinco como Físicos (Destreza, Força, Luta, Pontaria, Vigor)\ne cinco como Mentais (Intelecto, Medicina, Sentidos, Social, Vontade), mas isso\né só um agrupamento de leitura — todos moram no mesmo bloco.\n\n\"Sentidos\" é um atributo (não um campo à parte): a Área de Percepção é derivada\ndele (`5 + Sentidos × 5`) e não é guardada. Cada atributo inicia com 1 ponto\nbase; na criação distribuem-se 4 pontos (máx. 3 num único atributo, 2 nos\ndemais), teto por atributo que sobe para 6 após finalizar a ficha; a Maestria\n(única na ficha) leva um atributo além disso. Lesões podem reduzir atributos."
    },
    "FichaSequelaDto": {
        "type": "object",
        "properties": {
            "nome": {
                "type": "string"
            },
            "descricao": {
                "type": "string"
            }
        },
        "required": [
            "nome"
        ],
        "additionalProperties": false,
        "description": "Uma sequela: instabilidade mental **temporária** (`sistema-v4.1.0.md` —\n\"Saúde\" > Sanidade). Ganha ao falhar num teste de Vontade; removida ao voltar à\nbase ou num descanso longo e confortável. O limite (Vontade) e os efeitos\nmecânicos são domínio de `shared/regras`; aqui guarda-se só a entrada nomeada."
    },
    "FichaTraumaDto": {
        "type": "object",
        "properties": {
            "nome": {
                "type": "string"
            },
            "descricao": {
                "type": "string"
            },
            "tratado": {
                "type": "boolean",
                "description": "`true` se já recebeu tratamento (penalidade reduzida). O trauma permanece na ficha."
            }
        },
        "required": [
            "nome",
            "tratado"
        ],
        "additionalProperties": false,
        "description": "Um trauma: versão **permanente** de uma sequela (`sistema-v4.1.0.md` — Sanidade).\nNão é removível, apenas **tratável** (o tratamento reduz a penalidade, não some\ncom o trauma) — daí `tratado`. O limite de traumas não-tratados (Vontade + 1;\nExperimentos Vontade − 1) é validado por `shared/regras`."
    },
    "FichaFragmentoConsumidoDto": {
        "type": "object",
        "properties": {
            "modulo": {
                "type": "string",
                "enum": [
                    "I",
                    "II",
                    "III",
                    "IV",
                    "V"
                ]
            },
            "bonusEscolhido": {
                "type": "string",
                "description": "Bônus \"Consumido\" escolhido, já formatado (ex.: \"+3 em Defesa\"). Só exibição — não é regra."
            },
            "opcao": {
                "type": "object",
                "additionalProperties": true,
                "description": "Opção estruturada escolhida — entrada de `reverterBonusConsumoFragmento` ao remover o registro."
            },
            "atributoEscolhido": {
                "type": "string",
                "enum": [
                    "destreza",
                    "forca",
                    "luta",
                    "pontaria",
                    "vigor",
                    "intelecto",
                    "medicina",
                    "sentidos",
                    "social",
                    "vontade"
                ],
                "description": "Atributo-alvo quando `opcao.tipo === 'TESTE'`; `null` nos demais tipos."
            },
            "deltaEnergiaMaxima": {
                "type": "number",
                "description": "Delta de Energia Máxima que o consumo aplicou (pode ser negativo) — subtraído ao reverter."
            },
            "item": {
                "type": "object",
                "additionalProperties": true,
                "description": "Snapshot do item de fragmento removido do inventário ao consumir — devolvido ao reverter."
            }
        },
        "required": [
            "modulo",
            "bonusEscolhido",
            "opcao",
            "atributoEscolhido",
            "deltaEnergiaMaxima",
            "item"
        ],
        "additionalProperties": false,
        "description": "Registro de um Fragmento Potencializador **consumido** (`sistema-v4.1.0.md` — \"⬦ Consumo de\nFragmentos\"; m3-64). A sequela \"Rejeição Biológica\" carrega o mesmo texto na `descricao`, mas só é\ngerada quando o jogador **não** evita o Preço de Sanidade com o teste de Vontade. Este registro é\nincondicional: existe sempre que um fragmento é consumido, independente da sequela.\n\nGuarda também o suficiente para **reverter** o consumo (m3-64, correção — \"remover um fragmento\nconsumido\"): o bônus estruturado (`opcao`/`atributoEscolhido`, entrada de\n`reverterBonusConsumoFragmento`), o delta de Energia Máxima que o consumo aplicou\n(`custoAquisicao - energiaMaximaExtra` do Preço de Sanidade) e o próprio item removido do\ninventário, para devolvê-lo. Sem isso o registro seria só um texto de exibição, incapaz de desfazer\no que descreve."
    },
    "FichaLesaoDto": {
        "type": "object",
        "properties": {
            "atributo": {
                "type": "string",
                "enum": [
                    "destreza",
                    "forca",
                    "luta",
                    "pontaria",
                    "vigor",
                    "intelecto",
                    "medicina",
                    "sentidos",
                    "social",
                    "vontade"
                ],
                "description": "Atributo afetado — uma das chaves de `FichaAtributosDto`."
            },
            "pontos": {
                "type": "number",
                "description": "Pontos de atributo removidos por esta lesão (LEVE 1 / GRAVE 3 / MORTAL 5 na origem; reduzível por tratamento)."
            },
            "severidade": {
                "type": "string",
                "enum": [
                    "LEVE",
                    "GRAVE",
                    "MORTAL"
                ]
            },
            "permanente": {
                "type": "boolean",
                "description": "`true` quando a lesão se tornou irreversível (afeta todo cálculo que usa o atributo)."
            },
            "descricao": {
                "type": "string",
                "description": "Descrição livre da lesão (o quê/como) — opcional, só exibição."
            }
        },
        "required": [
            "atributo",
            "pontos",
            "severidade",
            "permanente"
        ],
        "additionalProperties": false,
        "description": "Uma lesão física (`sistema-v4.1.0.md` — \"Lesões\"): remove pontos de um atributo\nconforme a severidade. Guarda-se qual atributo foi afetado, quantos pontos\nrestam removidos (pode ser reduzido por tratamento/reabilitação) e se já se\ntornou permanente (após entrar em \"Morrendo\" o suficiente enquanto lesionado)."
    },
    "FichaHabilidadeDto": {
        "type": "object",
        "properties": {
            "nome": {
                "type": "string"
            },
            "categoria": {
                "type": "string",
                "enum": [
                    "GERAL",
                    "GERAL_MELHORADA",
                    "CLASSE",
                    "ARQUETIPO",
                    "SUBCLASSE",
                    "OUTRA_CLASSE",
                    "PERSONALIDADE",
                    "ESPECIALIDADE",
                    "CIVIL"
                ]
            },
            "custoEnergia": {
                "type": "number",
                "description": "Custo em Energia (a notação `[N E]` do documento). `0` para habilidades\ngratuitas (`[0 E]`); `null` para custo variável (`[X E]`)."
            },
            "descricao": {
                "type": "string"
            },
            "origem": {
                "type": "string",
                "enum": [
                    "COMBATENTE",
                    "ESPECIALISTA",
                    "SUPORTE",
                    "EXPERIMENTO_BESTIAL",
                    "EXPERIMENTO_ARTIFICIAL",
                    "EXPERIMENTO_HIBRIDO",
                    "CIVIL",
                    "LUTADOR",
                    "MERCENARIO",
                    "VANGUARDA",
                    "ENGENHEIRO",
                    "ASSASSINO",
                    "ACADEMICO",
                    "PARAMEDICO",
                    "DIPLOMATA",
                    "COMANDANTE"
                ],
                "description": "Classe/arquétipo/subclasse **de origem** quando a habilidade veio do catálogo do\nsistema (para o chip nomear a fonte — \"Classe - Especialista\" quando é de outra classe).\nIndefinida em habilidades personalizadas e nas Gerais. Retrocompatível: fichas antigas\nsem o campo exibem só o rótulo da categoria."
            }
        },
        "required": [
            "nome",
            "categoria",
            "custoEnergia",
            "descricao"
        ],
        "additionalProperties": false,
        "description": "Uma habilidade da ficha (`sistema-v4.1.0.md` — \"Habilidades\"). Sem catálogo\ntipado de habilidades no `shared/regras` (diferente de compras), a ficha guarda\na habilidade de forma desnormalizada: nome, custo de Energia, categoria de\norigem e o texto do efeito."
    },
    "FichaInventarioDto": {
        "type": "object",
        "properties": {
            "itens": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": true
                }
            },
            "amplificadores": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": true
                }
            }
        },
        "required": [
            "itens",
            "amplificadores"
        ],
        "additionalProperties": false,
        "description": "Inventário do agente — **reusa o formato do carrinho da calculadora M1**\n(entregável #2): itens (com suas modificações) + amplificadores acoplados, os\nmesmos contratos tipados de `shared/regras/compras` (`CarrinhoItemDto` já\ncarrega as `modificacoes`). Nenhum tipo duplicado; `regras/` continua zero-dep.\nO limite de inventário (`Força × 5`) e a validação de custo/peso/limites de\nmodificação por patente são domínio de `shared/regras`, não deste documento."
    },
    "FichaEstadoDto": {
        "type": "object",
        "properties": {
            "vidaAtual": {
                "type": "number",
                "description": "Vida corrente. **Pode exceder a máxima** (m3-10 — o mestre reflete eventos de campanha);\nzerá-la dispara \"Morrendo\"."
            },
            "energiaAtual": {
                "type": "number",
                "description": "Energia corrente. Pode **negativar** (o documento permite gastar além de 0) e **pode exceder a\nmáxima** (m3-10)."
            },
            "vidaMaxima": {
                "type": "number",
                "description": "Vida **máxima** — snapshot calculado por `shared/regras` **na criação** e depois **editável**\n(m3-10): o motor não a recalcula automaticamente. **Opcional** por retrocompatibilidade — quando\nausente (fichas anteriores a m3-10), cai no derivado `calcularVida(classe, nível, vigor)`. Subir\nde nível **soma** o delta de progressão a este valor stored (não recalcula do zero)."
            },
            "energiaMaxima": {
                "type": "number",
                "description": "Energia **máxima** — mesmo modelo de `vidaMaxima` (snapshot na criação, depois editável; m3-10)."
            },
            "sequelas": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/FichaSequelaDto"
                }
            },
            "traumas": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/FichaTraumaDto"
                }
            },
            "lesoes": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/FichaLesaoDto"
                }
            },
            "morrendo": {
                "type": "boolean",
                "description": "Condição **Morrendo** (`sistema-v4.1.0.md` — \"Condições\": teste de Vigor a cada turno, DT\ncrescente; falhar mata). Alternada **manualmente** pelo dono/mestre — não é recalculada\nautomaticamente a partir de `vidaAtual` (mesma filosofia de m3-10: o estado narrativo é\nrefletido por quem joga, não travado pelo motor). Opcional por retrocompatibilidade —\nausente equivale a `false`."
            },
            "machucado": {
                "type": "boolean",
                "description": "Condição **Machucado** (`sistema-v4.1.0.md` — \"Condições\": resultado de um golpe que\nremoveu metade da vida; só sai ao recuperar 100%). Alternada manualmente, mesmo modelo de\n`morrendo`."
            },
            "inconsciente": {
                "type": "boolean",
                "description": "Condição **Inconsciente** (`sistema-v4.1.0.md` — \"Condições\": impossibilitado de agir ou\nreagir, também Vulnerável). Alternada manualmente, mesmo modelo de `morrendo`."
            }
        },
        "required": [
            "vidaAtual",
            "energiaAtual",
            "sequelas",
            "traumas",
            "lesoes"
        ],
        "additionalProperties": false,
        "description": "Estado mutável de saúde do agente durante o jogo (`sistema-v4.1.0.md` —\n\"Saúde\"). Vida e Energia atuais são valores correntes (os máximos são\nderivados). A Sanidade não é uma barra: materializa-se nas listas de sequelas\n(temporárias) e traumas (permanentes). As lesões físicas removem atributos."
    },
    "FichaDerivadosDto": {
        "type": "object",
        "properties": {
            "defesa": {
                "type": "number"
            },
            "esquiva": {
                "type": "number"
            },
            "bloqueio": {
                "type": "number"
            },
            "contraAtaque": {
                "type": "number",
                "description": "Contra-Ataque — calculado por `calcularContraAtaque` (`shared/regras/agente/defesa`) a\npartir da variante da habilidade \"Contra-Ataque\" em `dados.habilidades`; ausente quando a\nficha não tem a habilidade. Editável no próprio lugar como override manual (m3-10, mesmo\nmecanismo de Defesa/Esquiva/Bloqueio) — o valor digitado vence o calculado."
            },
            "deslocamento": {
                "type": "number"
            },
            "proficiencia": {
                "type": "number"
            },
            "danoCorpoACorpo": {
                "type": "string",
                "description": "Dano de Corpo a Corpo em notação de dados (ex.: `\"1d6+3\"`) — `calcularDanoCorpo`."
            },
            "danoFurtivo": {
                "type": "string",
                "description": "Dano Furtivo em notação de dados; `undefined` na classe que não o possui."
            },
            "percepcao": {
                "type": "number"
            },
            "inventarioMaximo": {
                "type": "number"
            },
            "habilidadesPorTurno": {
                "type": "number"
            },
            "resistencias": {
                "type": "object",
                "additionalProperties": true,
                "description": "Base **manual** de resistência por tipo de dano (ajuste pós-m3-36) — complementada pela soma do\nequipamento (itens equipados + Fragmento aplicado + amplificadores `Resistente`/`Defesa`,\n`shared/regras/agente/resistencia` `montarResistencias`). Ausente/tipo ausente = 0 manual;\na aba Combate sempre mostra os cinco tipos, mesmo em 0."
            }
        },
        "additionalProperties": false,
        "description": "Bloco de **derivados persistidos** (m3-10 — \"nada é exclusivamente calculado\"). São calculados\n**uma vez na criação** por `shared/regras` (`calcularDerivados`) e a partir daí **stored e\neditáveis**; o motor não os recalcula sobre as edições. Todos **opcionais**: ausentes (fichas\nanteriores a m3-10) caem no cálculo ao vivo como fallback. `undefined` numa stat que a classe não\npossui (ex.: Civil sem `defesa`/`proficiencia`/`danoFurtivo`). Vida/Energia máximas moram em\n`FichaEstadoDto` (mais perto de vida/energia atuais), não aqui."
    },
    "FichaRolagemPassoDto": {
        "type": "object",
        "properties": {
            "nome": {
                "type": "string"
            },
            "formula": {
                "type": "string",
                "description": "Fórmula do passo — expressão de dados completa (m3-29; ex.: `LUTd20kh1 + PROF`, `2d8 [Físico]`)."
            },
            "descricao": {
                "type": "string"
            },
            "habilidades": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Nomes das **habilidades** da ficha usadas **neste passo** (m3-22; efeitos aposentados em m3-31): ao\nrolá-lo, debita a **Energia** de cada ocorrência. A lista é um **multiconjunto** — o mesmo nome pode\nrepetir para aplicar a habilidade mais de uma vez (energia soma por ocorrência). As habilidades\n**não** alteram mais a fórmula: quem lê a descrição aplica o efeito na mão. Ausente = passo sem habilidade."
            },
            "critico": {
                "type": "boolean",
                "description": "`true` marca o passo como **critável** (m3-30): a UI oferece um botão \"Rolar crítico\" além do\n\"Rolar\", e o crítico **dobra** o dano (dados, fixos e atributos da fórmula), exceto valores de\nPatente/Nível (`PROF`/`NIV`), conforme `sistema-v4.1.0` (1217/1303). Ausente = não."
            }
        },
        "required": [
            "nome",
            "formula"
        ],
        "additionalProperties": false,
        "description": "Um passo **seguinte** de um preset encadeado (m3-21): uma rolagem disparada após a primária\n(ex.: o dano depois do teste da arma, ou o dano crítico)."
    },
    "FichaRolagemDto": {
        "type": "object",
        "properties": {
            "nome": {
                "type": "string"
            },
            "formula": {
                "type": "string"
            },
            "descricao": {
                "type": "string"
            },
            "tipo": {
                "type": "string",
                "enum": [
                    "SIMPLES",
                    "ENCADEADO"
                ],
                "description": "`SIMPLES` (uma rolagem) ou `ENCADEADO` (primária + `seguintes`). Ausente = `SIMPLES`."
            },
            "seguintes": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/FichaRolagemPassoDto"
                },
                "description": "Passos disparados após a primária, na ordem (m3-21)."
            },
            "habilidades": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Nomes das **habilidades** da ficha usadas no **passo primário** (m3-21; por-passo em m3-22): ao\nrolá-lo, debita a Energia de cada ocorrência (multiconjunto — repetir o nome aplica a habilidade\nmais de uma vez). **Não** altera a fórmula (efeitos aposentados em m3-31). Cada passo seguinte tem o\nseu próprio `habilidades` (`FichaRolagemPassoDto`)."
            },
            "critico": {
                "type": "boolean",
                "description": "`true` marca o **passo primário** como critável (m3-30) — ver `FichaRolagemPassoDto.critico`. Ausente = não."
            }
        },
        "required": [
            "nome",
            "formula"
        ],
        "additionalProperties": false,
        "description": "Preset de rolagem de dados salvo na ficha (m3-15; estendido em m3-21). Atalho nomeado para uma\nfórmula (ex.: `1d20+LUT`); o motor de avaliação vive em `shared/regras/rolagem` (m3-15 —\n`regras/dados` já é a pasta de dados/tabelas de jogo, por isso o motor mora em `regras/rolagem`).\n\nA fórmula é uma expressão de dados completa (m3-29) — não há mais \"modo\"; um teste é `LUTd20kh1 + PROF`.\nPresets legados (`modo:'TESTE'`) migram na carga via `normalizarPresetLegado` (`shared/regras/rolagem`)."
    },
    "FichaFormacaoDto": {
        "type": "object",
        "properties": {
            "bonus": {
                "type": "string",
                "enum": [
                    "COMBATE_DADO_CATEGORIA_ARMA",
                    "COMBATE_ESQUIVA_OU_BLOQUEIO",
                    "COMBATE_DANO_CORPO",
                    "COMBATE_RESISTENCIA_TIPO_DANO",
                    "COMBATE_DANO_FURTIVO_DADO",
                    "MOVIMENTO_DESLOCAMENTO",
                    "MOVIMENTO_DADO_CORRIDA",
                    "PERICIA_DADO_ATRIBUTO",
                    "PERICIA_BONUS_ATRIBUTO",
                    "PERICIA_DADO_ATRIBUTO_CONDICAO",
                    "PERICIA_DADO_INICIATIVA",
                    "EQUIPAMENTO_DADO_ITENS_MEDICINAIS",
                    "EQUIPAMENTO_BONUS_ITENS_MEDICINAIS",
                    "EQUIPAMENTO_DADO_EFEITO_ITENS_MEDICINAIS",
                    "EQUIPAMENTO_DADO_ITENS_OPERACIONAIS",
                    "EQUIPAMENTO_BONUS_ITENS_OPERACIONAIS",
                    "EQUIPAMENTO_DADO_EFEITO_ITENS_OPERACIONAIS",
                    "EQUIPAMENTO_TURNO_EXTRA_STATUS",
                    "LOGISTICA_INVENTARIO_MAXIMO",
                    "LOGISTICA_SOBRECARGA",
                    "LOGISTICA_DT_REPARO"
                ]
            },
            "parametro": {
                "type": "string"
            },
            "texto": {
                "type": "string"
            }
        },
        "required": [
            "bonus",
            "parametro",
            "texto"
        ],
        "additionalProperties": false,
        "description": "Uma linha de bônus de **Formação** já aplicada a um personagem (`docs/core/sistema-v4.1.0.md` —\n\"⬦ Formação\"). `bonus: null` **não é lacuna, é o escape do documento**: *\"A lista apresentada não é\ndefinitiva. Bônus adicionais podem ser autorizados pelo Mestre.\"* — nesse caso só o `texto` livre\nexiste. Quando `bonus` aponta para uma linha de `FormacaoBonusEnum`, `parametro` guarda a escolha\nlivre que a linha exige (ex.: \"Vigor\", \"Armas de Fogo\", \"Químico\", \"Esquiva\") — `null` quando a\nlinha não exige parâmetro. `texto` é sempre a fonte de exibição, independente do tipo do bônus."
    },
    "FichaEspecialidadeDto": {
        "type": "object",
        "properties": {
            "gatilho": {
                "type": "string"
            },
            "efeito": {
                "type": "string"
            }
        },
        "required": [
            "gatilho",
            "efeito"
        ],
        "additionalProperties": false,
        "description": "A **Especialidade** de um agente (`docs/core/sistema-v4.1.0.md` — \"⬦ Especialidade\"): um único\nbônus com gatilho circunstancial, sem custo de Energia. `efeito` não acumula com outras opções\n(regra do documento). Texto livre — descreve o bônus específico (ex.: \"+1 dado em testes de\nFurtividade\"), não um catálogo fechado; o Mestre é o árbitro do teto de poder (mesmo espírito do\nescape \"autorizado pelo Mestre\" que `FichaFormacaoDto.bonus: null` já usa)."
    },
    "FichaOrigemDto": {
        "type": "object",
        "properties": {
            "nome": {
                "type": "string"
            },
            "descricao": {
                "type": "string"
            },
            "formacao": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/FichaFormacaoDto"
                }
            },
            "especialidade": {
                "$ref": "#/components/schemas/FichaEspecialidadeDto"
            },
            "saberDeCampo": {
                "type": "string"
            }
        },
        "required": [
            "nome",
            "descricao",
            "formacao",
            "especialidade",
            "saberDeCampo"
        ],
        "additionalProperties": false,
        "description": "A **Origem** de um agente (`docs/core/sistema-v4.1.0.md` — \"⬦ Origem\"): passado profissional antes\nda Fundação SCP, composto por Formação (exatamente 2 bônus), Especialidade e Saber de Campo.\n**Imutável após definida** (regra do documento) — a trava de imutabilidade é validada no backend\n(m3-24), não aqui."
    },
    "FichaPersonalidadeEstagioDto": {
        "type": "object",
        "properties": {
            "descricao": {
                "type": "string"
            },
            "custoEnergia": {
                "type": "number"
            }
        },
        "required": [
            "descricao",
            "custoEnergia"
        ],
        "additionalProperties": false,
        "description": "Texto/custo de um estágio da Habilidade de Personalidade — Base ou uma Fortificação (1ª/2ª,\nobtidas nos níveis 7 e 14; `docs/core/sistema-v4.1.0.md` — \"Identidade\" e \"Fortificação de\nTraços\"; m3-78). Sem campo de nome: o nome de qualquer estágio é sempre a palavra de\npersonalidade (`FichaIdentidadeDto.personalidade`), sufixada pelo rótulo do estágio nas\nFortificações (`materializarHabilidadePersonalidade`, `shared/regras/identidade`) — nunca um\ntexto livre à parte."
    },
    "FichaPersonalidadeHabilidadeDto": {
        "type": "object",
        "properties": {
            "ativa": {
                "type": "string",
                "enum": [
                    "BASE",
                    "FORTIFICACAO_1",
                    "FORTIFICACAO_2"
                ]
            },
            "base": {
                "$ref": "#/components/schemas/FichaPersonalidadeEstagioDto"
            },
            "fortificacao1": {
                "$ref": "#/components/schemas/FichaPersonalidadeEstagioDto"
            },
            "fortificacao2": {
                "$ref": "#/components/schemas/FichaPersonalidadeEstagioDto"
            }
        },
        "required": [
            "ativa",
            "base",
            "fortificacao1",
            "fortificacao2"
        ],
        "additionalProperties": false,
        "description": "Os 3 estágios da Habilidade de Personalidade (Base, 1ª e 2ª Fortificação; m3-78) e qual deles\nestá **ativo** — o único materializado em `dados.habilidades` (`materializarHabilidadePersonalidade`,\n`shared/regras/identidade`). Um estágio `null` significa que ele nunca foi preenchido, nem pelo\nguia de criação nem pela ficha."
    },
    "FichaIdentidadeDto": {
        "type": "object",
        "properties": {
            "personalidade": {
                "type": "string"
            },
            "origem": {
                "$ref": "#/components/schemas/FichaOrigemDto"
            },
            "habilidade": {
                "$ref": "#/components/schemas/FichaPersonalidadeHabilidadeDto",
                "description": "Os 3 estágios da Habilidade de Personalidade e qual está ativo (m3-78) — ver\n`FichaPersonalidadeHabilidadeDto`. Opcional: ausente em fichas anteriores a esta task; nesse\ncaso a ficha trata como sem nenhum estágio preenchido (retrocompatibilidade tolerante no\nfrontend a partir de um item legado solto em `habilidades[]`, se existir)."
            }
        },
        "required": [
            "personalidade",
            "origem"
        ],
        "additionalProperties": false,
        "description": "A **Identidade** de um agente (`docs/core/sistema-v4.1.0.md` — \"⬡ Identidade\"): Personalidade\n(uma única palavra, um adjetivo — a habilidade correspondente vive em `habilidades[]` com\n`categoria: HabilidadeCategoriaEnum.PERSONALIDADE`) e Origem. **Imutável após definida** (regra do\ndocumento) — validado no backend (m3-24). Opcional — fichas anteriores a esta task (m3-23) não têm."
    },
    "FichaJogadorDadosDto": {
        "type": "object",
        "properties": {
            "classe": {
                "type": "string",
                "enum": [
                    "COMBATENTE",
                    "ESPECIALISTA",
                    "SUPORTE",
                    "EXPERIMENTO_BESTIAL",
                    "EXPERIMENTO_ARTIFICIAL",
                    "EXPERIMENTO_HIBRIDO",
                    "CIVIL"
                ],
                "description": "Classe do agente. `ClasseEnum` já codifica o eixo inteiro: as três classes\nbase (`COMBATENTE`/`ESPECIALISTA`/`SUPORTE`), as três subclasses Experimento\n(`EXPERIMENTO_BESTIAL`/`_ARTIFICIAL`/`_HIBRIDO`) e o registro `CIVIL`. Por\nisso **não há campo `subclasse` à parte** — reusa o enum existente (proibição\n#21). Um Civil não tem classe base jogável, mas o valor `CIVIL` o representa."
            },
            "arquetipo": {
                "type": "string",
                "enum": [
                    "LUTADOR",
                    "MERCENARIO",
                    "VANGUARDA",
                    "ENGENHEIRO",
                    "ASSASSINO",
                    "ACADEMICO",
                    "PARAMEDICO",
                    "DIPLOMATA",
                    "COMANDANTE"
                ],
                "description": "Arquétipo escolhido — presente **só** quando `classe` é uma das três classes\nbase. `null` quando o agente tomou uma subclasse (Experimento) ou é `CIVIL`,\npois nesses casos não há arquétipo (a subclasse ocupa o lugar do arquétipo)."
            },
            "nivel": {
                "type": "number",
                "description": "Nível do agente. Faixa 0–20 inteiro (o documento veda ultrapassar 20; todos iniciam em 0)."
            },
            "prestigio": {
                "type": "number",
                "description": "Prestígio do agente — determina a Patente (derivada, não guardada). Inteiro;\n**pode ser negativo** (Experimentos iniciam com −1 no nível 0). Sem teto fixo."
            },
            "atributos": {
                "$ref": "#/components/schemas/FichaAtributosDto"
            },
            "maestria": {
                "type": "string",
                "enum": [
                    "destreza",
                    "forca",
                    "luta",
                    "pontaria",
                    "vigor",
                    "intelecto",
                    "medicina",
                    "sentidos",
                    "social",
                    "vontade"
                ],
                "description": "Atributo que carrega a **Maestria** (o ápice único da ficha), ou `null` (m3-10). Segue\n`sistema-v4.1.0.md` (\"⬥ Maestrias\"): **única na ficha** (por isso um só campo, não um por\natributo) e só marcável em atributo com **6+ pontos** (`shared/regras/agente`\n`maestriaAtingivel`). A ficha guarda apenas **qual** atributo tem a Maestria; o bônus permanente\n(distinto por atributo, tabela do documento) é exibição derivada, não persistido."
            },
            "identidade": {
                "$ref": "#/components/schemas/FichaIdentidadeDto",
                "description": "Personalidade e Origem (m3-23). **Opcional** — ausente em fichas anteriores a esta task\n(fallback: sem Identidade definida). Ver `FichaIdentidadeDto`."
            },
            "estado": {
                "$ref": "#/components/schemas/FichaEstadoDto"
            },
            "derivados": {
                "$ref": "#/components/schemas/FichaDerivadosDto",
                "description": "Derivados persistidos (m3-10). **Opcional** por retrocompatibilidade — ausente em fichas\nanteriores; uma ficha salva por m3-10 grava o snapshot. Ver `FichaDerivadosDto`."
            },
            "habilidades": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/FichaHabilidadeDto"
                }
            },
            "inventario": {
                "$ref": "#/components/schemas/FichaInventarioDto"
            },
            "rolagens": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/FichaRolagemDto"
                },
                "description": "Presets de rolagem de dados salvos na ficha (m3-15). Opcional; ausente = sem presets."
            },
            "combos": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/FichaComboDto"
                },
                "description": "Combos (m3-37) — sequências de rolagens que o jogador monta e executa passo a passo, cada passo\nreferenciando um preset de `rolagens`. Opcional; ausente = sem combos."
            },
            "fragmentosConsumidos": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/FichaFragmentoConsumidoDto"
                },
                "description": "Histórico de Fragmentos Potencializador **consumidos** (m3-64) — registro permanente, na aba\nExtras, que não depende da sequela \"Rejeição Biológica\" (evitável com Vontade). Mais recente\nprimeiro. Opcional; ausente = nenhum fragmento consumido ainda."
            },
            "anotacoes": {
                "type": "string",
                "description": "Anotações livres do jogador/mestre sobre a ficha — visíveis e editáveis só por **dono** e\n**mestre** (m3-51, mesmo tratamento de `historia`/m3-50); um visualizador só-acesso nunca as\nrecebe (o backend as omite em `FichaService.recuperarFicha` e no broadcast `ficha:alterada` —\n`omitirCamposPrivados`, `backend/src/modules/ficha/ficha-campos-privados.util.ts`). **Opcional**:\nausente para quem não pode vê-las (sempre presentes, mesmo vazias, para dono/mestre — a criação\ngrava `''` por padrão)."
            },
            "dinheiro": {
                "type": "number",
                "description": "Dinheiro atual do agente (m3-34). Nasce do dinheiro inicial (`1000 + 4D4 × 250`,\n`shared/regras/novo-agente` `rolarDinheiroInicial`) e é editável dali em diante (mesma\nliberdade de edição de m3-10 — sem piso/teto). **Opcional** por retrocompatibilidade —\nfichas anteriores a m3-34 não têm o campo; consumidores tratam a ausência como `0`. Salário\n**não** é persistido aqui — é derivado da Patente (`obterPatente(prestigio).salario`)."
            },
            "modificadoresTeste": {
                "type": "object",
                "additionalProperties": true,
                "description": "Modificadores temporários de teste por atributo (redesenho de comparação visual): somam direto\nna fórmula rolada (ex.: Amplificador aplicado), sem alterar o atributo base nem a Maestria.\n**Opcional** por retrocompatibilidade e parcial — atributo ausente cai em 0."
            },
            "dadosTeste": {
                "type": "object",
                "additionalProperties": true,
                "description": "Ajuste manual de quantos **dados** o atributo rola em testes/rolagens (distinto de\n`modificadoresTeste`, que soma no **resultado**) — some ao atributo efetivo (lesão) só na\ncontagem de dados do pool, sem alterar o atributo base nem Energia/Deslocamento/Vida/Maestria.\nManual apenas — Lesões/Sequelas/Condições não o alimentam automaticamente. Sem piso: pode\nzerar/negativar, disparando a desvantagem intrínseca já existente no motor de rolagem\n(atributo ≤ 0 → rola `2+|attr|` dados e mantém o menor). **Opcional** por retrocompatibilidade\ne parcial — atributo ausente cai em 0."
            },
            "contrato": {
                "type": "string",
                "description": "Número do Contrato do agente (m3-40) — texto livre, exibido como \"CONTRATO — 0000\" ao lado do\nnome no cabeçalho da Identidade. Editável **só pelo mestre** da campanha (`ehMestre()` no\n`FichaVisualizacao`; o backend trava o dono em `alterarFicha`). **Opcional** — ausente em\nfichas anteriores a esta task e enquanto o mestre não o define. Sem geração/validação\nautomática — o mestre digita o número livremente (fora de escopo desta task)."
            },
            "historia": {
                "type": "string",
                "description": "Texto livre de história do agente (m3-50) — visível e editável só por **dono** e **mestre**;\num visualizador só-acesso nunca a recebe (o backend a omite em `FichaService.recuperarFicha` e\nno broadcast `ficha:alterada` — `omitirCamposPrivados`, `backend/src/modules/ficha/\nficha-campos-privados.util.ts`). **Opcional**: ausente para quem não pode vê-la e em fichas sem\ntexto definido."
            }
        },
        "required": [
            "classe",
            "arquetipo",
            "nivel",
            "prestigio",
            "atributos",
            "maestria",
            "estado",
            "habilidades",
            "inventario"
        ],
        "additionalProperties": false,
        "description": "Documento completo `ficha.dados` de uma ficha de jogador — a forma final do\nJSONB (m3-01, estendido em m3-10). Consumível por backend e frontend sem redefinição."
    },
    "PaginaCadernoEsquadraoCriarDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            },
            "titulo": {
                "type": "string"
            }
        },
        "required": [
            "campanhaId",
            "titulo"
        ],
        "additionalProperties": false,
        "description": "Entrada da criação de uma página colaborativa do Esquadrão."
    },
    "PaginaCadernoEsquadraoAlterarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "atualizacao": {
                "type": "string"
            },
            "titulo": {
                "type": "string"
            },
            "conteudoMarkdown": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "atualizacao",
            "titulo",
            "conteudoMarkdown"
        ],
        "additionalProperties": false,
        "description": "Entrada de uma atualização CRDT serializada em base64."
    },
    "PaginaCadernoEsquadraoEstadoDto": {
        "type": "object",
        "properties": {
            "pagina": {
                "$ref": "#/components/schemas/PaginaCadernoDto"
            },
            "estado": {
                "type": "string"
            }
        },
        "required": [
            "pagina",
            "estado"
        ],
        "additionalProperties": false,
        "description": "Estado inicial de uma página colaborativa, com snapshot serializado em base64."
    },
    "PaginaCadernoEsquadraoAlteradaDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            },
            "paginaId": {
                "type": "number"
            },
            "atualizacao": {
                "type": "string"
            },
            "pagina": {
                "$ref": "#/components/schemas/PaginaCadernoResumoDto"
            }
        },
        "required": [
            "campanhaId",
            "paginaId",
            "atualizacao",
            "pagina"
        ],
        "additionalProperties": false,
        "description": "Evento emitido depois de uma atualização colaborativa persistida."
    },
    "PaginaCadernoEsquadraoPresencaDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            },
            "paginaId": {
                "type": "number"
            },
            "atualizacao": {
                "type": "string"
            }
        },
        "required": [
            "campanhaId",
            "paginaId",
            "atualizacao"
        ],
        "additionalProperties": false,
        "description": "Presença efêmera (y-protocols/awareness: cursor, seleção e identidade de quem está editando).\nValue-object retransmitido bruto pelo gateway — nunca persistido nem indexado (P-039); mesmo\nformato de ida (cliente → servidor) e volta (servidor → demais clientes da sala)."
    },
    "PaginaCadernoCriarDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            },
            "titulo": {
                "type": "string"
            },
            "conteudoMarkdown": {
                "type": "string"
            }
        },
        "required": [
            "campanhaId",
            "titulo",
            "conteudoMarkdown"
        ],
        "additionalProperties": false,
        "description": "Entrada da criação de uma página no caderno do usuário autenticado."
    },
    "PaginaCadernoAlterarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "titulo": {
                "type": "string"
            },
            "conteudoMarkdown": {
                "type": "string"
            },
            "updatedDate": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "titulo",
            "conteudoMarkdown",
            "updatedDate"
        ],
        "additionalProperties": false,
        "description": "Entrada da alteração com a versão otimista que o cliente editou."
    },
    "PaginaCadernoRecuperarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada da recuperação individual de uma página."
    },
    "PaginaCadernoExcluirDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada da exclusão lógica de uma página."
    },
    "PaginaCadernoListarDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            }
        },
        "required": [
            "campanhaId"
        ],
        "additionalProperties": false,
        "description": "Entrada da listagem do caderno do usuário autenticado."
    },
    "PaginaCadernoMembroListarDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            },
            "usuarioId": {
                "type": "number"
            }
        },
        "required": [
            "campanhaId",
            "usuarioId"
        ],
        "additionalProperties": false,
        "description": "Entrada da listagem de um caderno de jogador pelo mestre."
    },
    "PaginaCadernoResumoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "campanhaId": {
                "type": "number"
            },
            "usuarioAutorId": {
                "type": "number"
            },
            "autorNome": {
                "type": "string"
            },
            "tipo": {
                "type": "string",
                "enum": [
                    "PRIVADA",
                    "ESQUADRAO"
                ]
            },
            "titulo": {
                "type": "string"
            },
            "updatedDate": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "campanhaId",
            "usuarioAutorId",
            "autorNome",
            "tipo",
            "titulo",
            "updatedDate"
        ],
        "additionalProperties": false,
        "description": "Item enxuto da lista de páginas de um caderno."
    },
    "PaginaCadernoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "campanhaId": {
                "type": "number"
            },
            "usuarioAutorId": {
                "type": "number"
            },
            "autorNome": {
                "type": "string"
            },
            "tipo": {
                "type": "string",
                "enum": [
                    "PRIVADA",
                    "ESQUADRAO"
                ]
            },
            "titulo": {
                "type": "string"
            },
            "conteudoMarkdown": {
                "type": "string"
            },
            "somenteLeitura": {
                "type": "boolean"
            },
            "createdDate": {
                "type": "string"
            },
            "updatedDate": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "campanhaId",
            "usuarioAutorId",
            "autorNome",
            "tipo",
            "titulo",
            "conteudoMarkdown",
            "somenteLeitura",
            "createdDate",
            "updatedDate"
        ],
        "additionalProperties": false,
        "description": "Página completa já recortada pela permissão do solicitante."
    },
    "BuscaCampanhaDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            },
            "termo": {
                "type": "string"
            },
            "fontes": {
                "type": "array",
                "items": {
                    "type": "string",
                    "enum": [
                        "MEU_CADERNO",
                        "CADERNOS_JOGADORES",
                        "CADERNO_ESQUADRAO",
                        "MINHAS_FICHAS",
                        "FICHAS_CAMPANHA"
                    ]
                }
            },
            "pagina": {
                "type": "number"
            },
            "limite": {
                "type": "number"
            }
        },
        "required": [
            "campanhaId",
            "termo"
        ],
        "additionalProperties": false,
        "description": "Consulta calculada da busca textual da campanha."
    },
    "BuscaCampanhaResultadoDto": {
        "type": "object",
        "properties": {
            "tipo": {
                "type": "string",
                "enum": [
                    "PAGINA_CADERNO",
                    "ANOTACAO_FICHA"
                ]
            },
            "id": {
                "type": "number"
            },
            "titulo": {
                "type": "string"
            },
            "trecho": {
                "type": "string"
            },
            "autorNome": {
                "type": "string"
            },
            "fichaNome": {
                "type": "string"
            },
            "updatedDate": {
                "type": "string"
            },
            "relevancia": {
                "type": "number"
            }
        },
        "required": [
            "tipo",
            "id",
            "titulo",
            "trecho",
            "autorNome",
            "updatedDate",
            "relevancia"
        ],
        "additionalProperties": false,
        "description": "Item normalizado que pode representar uma página ou anotações de ficha."
    },
    "RolagemRegistrarDto": {
        "type": "object",
        "properties": {
            "rotulo": {
                "type": "string"
            },
            "formula": {
                "type": "string",
                "description": "Expressão de dados usada na rolagem (ex.: `2d6+3[Físico]`), exibida como legenda discreta no\nhistórico/feed. `null` quando quem registra não a informa — o teste de Atributo direto (o\nrótulo já é o nome do atributo) nunca a envia."
            },
            "visibilidade": {
                "type": "string",
                "enum": [
                    "PUBLICA",
                    "PRIVADA"
                ]
            },
            "resultado": {
                "type": "object",
                "additionalProperties": true
            }
        },
        "required": [
            "rotulo",
            "formula",
            "visibilidade",
            "resultado"
        ],
        "additionalProperties": false,
        "description": "Entrada do registro de uma rolagem — o `fichaId` vem da rota (`@Param`, injetado no DTO pela\ncontroller). `visibilidade` decide quem além do autor enxerga a rolagem (`PUBLICA` = todos os\nmembros da campanha; `PRIVADA` = autor + mestre)."
    },
    "RolagemAvulsoRegistrarDto": {
        "type": "object",
        "properties": {
            "encontroId": {
                "type": "number"
            },
            "combatenteId": {
                "type": "number"
            },
            "rotulo": {
                "type": "string"
            },
            "formula": {
                "type": "string",
                "description": "Expressão de dados usada na rolagem (ex.: `2d6+3[Físico]`), exibida como legenda discreta no\nhistórico/feed. `null` quando quem registra não a informa — o teste de Atributo direto (o\nrótulo já é o nome do atributo) nunca a envia."
            },
            "visibilidade": {
                "type": "string",
                "enum": [
                    "PUBLICA",
                    "PRIVADA"
                ]
            },
            "resultado": {
                "type": "object",
                "additionalProperties": true
            }
        },
        "required": [
            "encontroId",
            "combatenteId",
            "rotulo",
            "formula",
            "visibilidade",
            "resultado"
        ],
        "additionalProperties": false,
        "description": "Entrada de uma rolagem livre atribuída a um combatente avulso do encontro."
    },
    "RolagemResumoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "fichaId": {
                "type": "number"
            },
            "encontroCombatenteId": {
                "type": "number"
            },
            "campanhaId": {
                "type": "number"
            },
            "usuarioId": {
                "type": "number"
            },
            "nomeAutor": {
                "type": "string"
            },
            "nomeFicha": {
                "type": "string"
            },
            "rotulo": {
                "type": "string"
            },
            "formula": {
                "type": "string"
            },
            "visibilidade": {
                "type": "string",
                "enum": [
                    "PUBLICA",
                    "PRIVADA"
                ]
            },
            "resultado": {
                "type": "object",
                "additionalProperties": true
            },
            "createdDate": {
                "type": "string"
            },
            "corFicha": {
                "type": "string",
                "description": "Cor de identidade visual da ficha autora (m3-61) — \"pega carona\" no mesmo `JOIN ficha` que já\nresolve `nomeFicha` (`RolagemRepository`). `null` sem cor definida: quem exibe cai no\n`--accent` de quem visualiza (`var(--cor-ficha, var(--accent))`)."
            }
        },
        "required": [
            "id",
            "fichaId",
            "encontroCombatenteId",
            "campanhaId",
            "usuarioId",
            "nomeAutor",
            "nomeFicha",
            "rotulo",
            "formula",
            "visibilidade",
            "resultado",
            "createdDate",
            "corFicha"
        ],
        "additionalProperties": false,
        "description": "Item de listagem/feed — usado tanto pelo histórico da ficha (`GET /ficha/:id/rolagem`) quanto\npelo feed da campanha (`GET /campanha/:id/rolagem`) e como saída do próprio registro. `nomeAutor`/\n`nomeFicha` vêm de `JOIN` (nunca duplicados como coluna) — a listagem sempre resolve os dois.\n`createdDate` chega como string ISO (serialização padrão do `StandardResponse` sobre `Date`)."
    },
    "RolagemListarDto": {
        "type": "object",
        "properties": {
            "fichaId": {
                "type": "number"
            }
        },
        "required": [
            "fichaId"
        ],
        "additionalProperties": false,
        "description": "Entrada da listagem do histórico de uma ficha — o `fichaId` vem do `@Param`. Exige permissão de\n**visualização** da ficha (§14, reusa `FichaService.recuperarFicha` — quem pode ver a ficha pode\nver o histórico dela). Paginado (`executarConsultaPaginada`, §10.5), mais recente primeiro."
    },
    "RolagemCampanhaListarDto": {
        "type": "object",
        "properties": {
            "campanhaId": {
                "type": "number"
            }
        },
        "required": [
            "campanhaId"
        ],
        "additionalProperties": false,
        "description": "Entrada da listagem do feed de uma campanha — o `campanhaId` vem do `@Param`. Exige ser\n**membro** da campanha (mesmo gate de `FichaService.listarFichas`); o recorte de visibilidade\n(`PRIVADA` só para o autor ou o mestre) é resolvido na service/repository, nunca no frontend."
    },
    "UsuarioCriarDto": {
        "type": "object",
        "properties": {
            "login": {
                "type": "string"
            },
            "senha": {
                "type": "string"
            },
            "nome": {
                "type": "string"
            }
        },
        "required": [
            "login",
            "senha",
            "nome"
        ],
        "additionalProperties": false,
        "description": "Entrada de registro (`AutenticacaoService.registrar`). A `senha` chega em claro e é\nencriptada (bcrypt) na service antes de persistir."
    },
    "UsuarioCriadoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "login": {
                "type": "string"
            },
            "nome": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "login",
            "nome"
        ],
        "additionalProperties": false,
        "description": "Saída de registro — o usuário criado, **sem** a senha."
    },
    "UsuarioAutenticarDto": {
        "type": "object",
        "properties": {
            "login": {
                "type": "string"
            },
            "senha": {
                "type": "string"
            }
        },
        "required": [
            "login",
            "senha"
        ],
        "additionalProperties": false,
        "description": "Entrada de login (`AutenticacaoService.autenticar`) — credenciais."
    },
    "UsuarioAutenticadoDto": {
        "type": "object",
        "properties": {
            "token": {
                "type": "string"
            },
            "id": {
                "type": "number"
            },
            "login": {
                "type": "string"
            },
            "nome": {
                "type": "string"
            },
            "tipo": {
                "type": "string",
                "enum": [
                    "NORMAL",
                    "ADMIN",
                    "TESTER"
                ]
            }
        },
        "required": [
            "token",
            "id",
            "login",
            "nome",
            "tipo"
        ],
        "additionalProperties": false,
        "description": "Saída de login — o JWT emitido + os dados básicos do usuário, **sem** a senha."
    },
    "UsuarioAdministrativoCriarDto": {
        "type": "object",
        "properties": {
            "login": {
                "type": "string"
            },
            "senha": {
                "type": "string"
            },
            "nome": {
                "type": "string"
            },
            "tipo": {
                "type": "string",
                "enum": [
                    "NORMAL",
                    "ADMIN",
                    "TESTER"
                ]
            }
        },
        "required": [
            "login",
            "senha",
            "nome",
            "tipo"
        ],
        "additionalProperties": false,
        "description": "Entrada administrativa de criação de conta, com escolha explícita do tipo."
    },
    "UsuarioLoginRecuperarDto": {
        "type": "object",
        "properties": {
            "login": {
                "type": "string"
            }
        },
        "required": [
            "login"
        ],
        "additionalProperties": false,
        "description": "Entrada interna de busca de usuário pelo `login` (validação de duplicidade e login)."
    },
    "UsuarioSessaoRecuperarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada interna da consulta leve de sessão usada pelo guard global."
    },
    "UsuarioSessaoDto": {
        "type": "object",
        "properties": {
            "tipo": {
                "type": "string",
                "enum": [
                    "NORMAL",
                    "ADMIN",
                    "TESTER"
                ]
            },
            "tokenVersao": {
                "type": "number"
            },
            "isDeleted": {
                "type": "boolean"
            }
        },
        "required": [
            "tipo",
            "tokenVersao",
            "isDeleted"
        ],
        "additionalProperties": false,
        "description": "Estado atual da sessão persistida, consultado a cada requisição autenticada."
    },
    "UsuarioRecuperarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada de recuperação individual do usuário (m2-03 — perfil self-service). O `id` vem do\nJWT (`@ActiveUser().sub`), injetado no DTO pela controller — nunca primitivo solto."
    },
    "UsuarioRecuperadoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "login": {
                "type": "string"
            },
            "nome": {
                "type": "string"
            },
            "tipo": {
                "type": "string",
                "enum": [
                    "NORMAL",
                    "ADMIN",
                    "TESTER"
                ]
            }
        },
        "required": [
            "id",
            "login",
            "nome",
            "tipo"
        ],
        "additionalProperties": false,
        "description": "Saída do perfil do usuário autenticado (m2-03) — os dados públicos, **sem** a senha."
    },
    "UsuarioSenhaAlterarDto": {
        "type": "object",
        "properties": {
            "senhaAtual": {
                "type": "string"
            },
            "novaSenha": {
                "type": "string"
            }
        },
        "required": [
            "senhaAtual",
            "novaSenha"
        ],
        "additionalProperties": false,
        "description": "Entrada pública da troca da própria senha (m2-03): a `senhaAtual` (validada por\n`bcrypt.compare` na service) e a `novaSenha` (encriptada antes de persistir). Complemento\n`Senha` inteiro antes do verbo (CONVENTIONS / skill `dto-conventions`)."
    },
    "UsuarioSenhaAlteradaDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "login": {
                "type": "string"
            },
            "nome": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "login",
            "nome"
        ],
        "additionalProperties": false,
        "description": "Saída da troca de senha — os dados públicos do usuário, **sem** a senha."
    },
    "UsuarioPerfilAlterarDto": {
        "type": "object",
        "properties": {
            "nome": {
                "type": "string"
            },
            "login": {
                "type": "string"
            }
        },
        "required": [
            "nome",
            "login"
        ],
        "additionalProperties": false,
        "description": "Entrada pública da alteração dos dados de perfil do próprio usuário autenticado (m2-11):\n`nome` e `login`. Complemento `Perfil` inteiro antes do verbo (CONVENTIONS / skill\n`dto-conventions`). O `id` vem do JWT (`@ActiveUser().sub`), nunca do corpo."
    },
    "UsuarioPerfilAlteradoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "login": {
                "type": "string"
            },
            "nome": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "login",
            "nome"
        ],
        "additionalProperties": false,
        "description": "Saída da alteração de perfil — os dados públicos do usuário, **sem** a senha."
    },
    "UsuarioExcluirDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada da exclusão (soft delete) da própria conta (m2-11). O `id` vem do JWT\n(`@ActiveUser().sub`), injetado no DTO pela controller — nunca primitivo solto."
    },
    "UsuarioListarDto": {
        "type": "object",
        "properties": {
            "pagina": {
                "type": "number"
            },
            "itensPorPagina": {
                "type": "number"
            },
            "ordenarPor": {
                "type": "string"
            },
            "direcao": {
                "type": "string",
                "enum": [
                    "ASC",
                    "DESC"
                ]
            },
            "allRows": {
                "type": "boolean"
            },
            "login": {
                "type": "string"
            },
            "nome": {
                "type": "string"
            },
            "busca": {
                "type": "string"
            },
            "tipo": {
                "type": "string",
                "enum": [
                    "NORMAL",
                    "ADMIN",
                    "TESTER"
                ]
            },
            "apenasExcluidos": {
                "type": "boolean"
            },
            "situacao": {
                "type": "string",
                "enum": [
                    "ATIVOS",
                    "EXCLUIDOS",
                    "TODOS"
                ]
            }
        },
        "required": [
            "pagina",
            "itensPorPagina",
            "ordenarPor",
            "direcao"
        ],
        "additionalProperties": false,
        "description": "Filtros e paginação da gestão administrativa de contas."
    },
    "UsuarioResumoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "login": {
                "type": "string"
            },
            "nome": {
                "type": "string"
            },
            "tipo": {
                "type": "string",
                "enum": [
                    "NORMAL",
                    "ADMIN",
                    "TESTER"
                ]
            },
            "tipoDescricao": {
                "type": "string"
            },
            "isDeleted": {
                "type": "boolean"
            }
        },
        "required": [
            "id",
            "login",
            "nome",
            "tipo",
            "tipoDescricao",
            "isDeleted"
        ],
        "additionalProperties": false,
        "description": "Recorte de uma conta exibido na listagem administrativa."
    },
    "UsuarioListadosDto": {
        "type": "object",
        "properties": {
            "itens": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/UsuarioResumoDto"
                }
            },
            "totalItens": {
                "type": "number"
            },
            "paginaAtual": {
                "type": "number"
            },
            "totalPaginas": {
                "type": "number"
            }
        },
        "required": [
            "itens",
            "totalItens",
            "paginaAtual",
            "totalPaginas"
        ],
        "additionalProperties": false,
        "description": "Resultado paginado da listagem administrativa."
    },
    "UsuarioReativarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada interna para reverter o soft delete de uma conta."
    },
    "UsuarioReativadoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "login": {
                "type": "string"
            },
            "nome": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "login",
            "nome"
        ],
        "additionalProperties": false,
        "description": "Conta reativada, sem qualquer dado de senha."
    },
    "UsuarioTipoAlterarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "tipo": {
                "type": "string",
                "enum": [
                    "NORMAL",
                    "ADMIN",
                    "TESTER"
                ]
            }
        },
        "required": [
            "id",
            "tipo"
        ],
        "additionalProperties": false,
        "description": "Entrada administrativa para alterar o tipo de uma conta ativa."
    },
    "UsuarioTipoAlteradoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "login": {
                "type": "string"
            },
            "nome": {
                "type": "string"
            },
            "tipo": {
                "type": "string",
                "enum": [
                    "NORMAL",
                    "ADMIN",
                    "TESTER"
                ]
            },
            "tipoDescricao": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "login",
            "nome",
            "tipo",
            "tipoDescricao"
        ],
        "additionalProperties": false,
        "description": "Conta retornada depois da troca administrativa de tipo."
    },
    "UsuarioSenhaResetarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "novaSenha": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "novaSenha"
        ],
        "additionalProperties": false,
        "description": "Entrada administrativa para redefinir a senha sem exigir a senha atual."
    },
    "UsuarioSenhaResetadaDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "login": {
                "type": "string"
            },
            "nome": {
                "type": "string"
            }
        },
        "required": [
            "id",
            "login",
            "nome"
        ],
        "additionalProperties": false,
        "description": "Confirmação pública da redefinição de senha, sem expor senha ou hash."
    },
    "UsuarioAdminAtivoContarDto": {
        "type": "object",
        "properties": {
            "idExcluido": {
                "type": "number"
            }
        },
        "additionalProperties": false,
        "description": "Filtro interno da contagem de administradores ativos."
    },
    "UsuarioImpersonarDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            }
        },
        "required": [
            "id"
        ],
        "additionalProperties": false,
        "description": "Entrada administrativa para substituir a sessão atual pela identidade da conta alvo."
    },
    "UsuarioIdentidadeSessaoDto": {
        "type": "object",
        "properties": {
            "id": {
                "type": "number"
            },
            "login": {
                "type": "string"
            },
            "nome": {
                "type": "string"
            },
            "tipo": {
                "type": "string",
                "enum": [
                    "NORMAL",
                    "ADMIN",
                    "TESTER"
                ]
            },
            "tokenVersao": {
                "type": "number"
            }
        },
        "required": [
            "id",
            "login",
            "nome",
            "tipo",
            "tokenVersao"
        ],
        "additionalProperties": false,
        "description": "Identidade persistida necessária para emitir uma sessão, sem senha ou hash."
    }
} as const;

export const operacoesContratosPublicos = {
    "HealthController_verificar": {
        "controller": "HealthController",
        "metodo": "get",
        "caminho": "/health",
        "tag": "Operação",
        "publica": true,
        "responseSchema": "object"
    },
    "AutenticacaoController_registrar": {
        "controller": "AutenticacaoController",
        "metodo": "post",
        "caminho": "/autenticacao/registro",
        "tag": "Autenticação",
        "publica": true,
        "requestSchema": "UsuarioCriarDto",
        "responseSchema": "UsuarioCriadoDto"
    },
    "AutenticacaoController_logar": {
        "controller": "AutenticacaoController",
        "metodo": "post",
        "caminho": "/autenticacao/login",
        "tag": "Autenticação",
        "publica": true,
        "requestSchema": "UsuarioAutenticarDto",
        "responseSchema": "UsuarioAutenticadoDto"
    },
    "CampanhaController_criar": {
        "controller": "CampanhaController",
        "metodo": "post",
        "caminho": "/campanha",
        "tag": "Campanhas",
        "publica": false,
        "requestSchema": "CampanhaCriarDto",
        "responseSchema": "CampanhaCriadaDto"
    },
    "CampanhaController_listar": {
        "controller": "CampanhaController",
        "metodo": "get",
        "caminho": "/campanha",
        "tag": "Campanhas",
        "publica": false,
        "responseSchema": "CampanhaResumoDto[]"
    },
    "CampanhaController_entrar": {
        "controller": "CampanhaController",
        "metodo": "post",
        "caminho": "/campanha/entrar",
        "tag": "Campanhas",
        "publica": false,
        "requestSchema": "CampanhaEntrarDto",
        "responseSchema": "CampanhaEntradaDto"
    },
    "CampanhaController_recuperar": {
        "controller": "CampanhaController",
        "metodo": "get",
        "caminho": "/campanha/:id",
        "tag": "Campanhas",
        "publica": false,
        "responseSchema": "CampanhaRecuperadaDto"
    },
    "CampanhaController_listarMembros": {
        "controller": "CampanhaController",
        "metodo": "get",
        "caminho": "/campanha/:id/membros",
        "tag": "Campanhas",
        "publica": false,
        "responseSchema": "CampanhaMembroResumoDto[]"
    },
    "CampanhaController_regenerarConvite": {
        "controller": "CampanhaController",
        "metodo": "post",
        "caminho": "/campanha/:id/convite/regenerar",
        "tag": "Campanhas",
        "publica": false,
        "responseSchema": "CampanhaConviteRegeneradoDto"
    },
    "CampanhaController_regenerarConviteEspectador": {
        "controller": "CampanhaController",
        "metodo": "post",
        "caminho": "/campanha/:id/convite-espectador/regenerar",
        "tag": "Campanhas",
        "publica": false,
        "responseSchema": "CampanhaConviteEspectadorRegeneradoDto"
    },
    "CampanhaController_alterarPapelMembro": {
        "controller": "CampanhaController",
        "metodo": "patch",
        "caminho": "/campanha/:id/membro/:usuarioId/papel",
        "tag": "Campanhas",
        "publica": false,
        "requestSchema": "Omit",
        "responseSchema": "CampanhaMembroPapelAlteradoDto"
    },
    "CampanhaController_removerMembro": {
        "controller": "CampanhaController",
        "metodo": "delete",
        "caminho": "/campanha/:id/membro/:usuarioId",
        "tag": "Campanhas",
        "publica": false,
        "responseSchema": "CampanhaMembroRemovidoDto"
    },
    "CampanhaController_transferirMestre": {
        "controller": "CampanhaController",
        "metodo": "post",
        "caminho": "/campanha/:id/mestre/transferir",
        "tag": "Campanhas",
        "publica": false,
        "requestSchema": "CampanhaMestreTransferirDto",
        "responseSchema": "CampanhaMestreTransferidoDto"
    },
    "CampanhaController_alterar": {
        "controller": "CampanhaController",
        "metodo": "put",
        "caminho": "/campanha/:id",
        "tag": "Campanhas",
        "publica": false,
        "requestSchema": "CampanhaAlterarDto",
        "responseSchema": "CampanhaAlteradaDto"
    },
    "CampanhaController_alterarEstado": {
        "controller": "CampanhaController",
        "metodo": "put",
        "caminho": "/campanha/:id/estado",
        "tag": "Campanhas",
        "publica": false,
        "requestSchema": "CampanhaEstadoAlterarDto",
        "responseSchema": "CampanhaEstadoAlteradaDto"
    },
    "CampanhaController_excluir": {
        "controller": "CampanhaController",
        "metodo": "delete",
        "caminho": "/campanha/:id",
        "tag": "Campanhas",
        "publica": false,
        "responseSchema": "null"
    },
    "CampanhaController_listarInventario": {
        "controller": "CampanhaController",
        "metodo": "get",
        "caminho": "/campanha/:id/inventario",
        "tag": "Campanhas",
        "publica": false,
        "responseSchema": "CampanhaInventarioDto"
    },
    "CampanhaController_adicionarItemInventario": {
        "controller": "CampanhaController",
        "metodo": "post",
        "caminho": "/campanha/:id/inventario/item",
        "tag": "Campanhas",
        "publica": false,
        "requestSchema": "CampanhaInventarioItemAdicionarDto",
        "responseSchema": "CampanhaInventarioDto"
    },
    "CampanhaController_alterarItemInventario": {
        "controller": "CampanhaController",
        "metodo": "patch",
        "caminho": "/campanha/:id/inventario/item/:itemId",
        "tag": "Campanhas",
        "publica": false,
        "requestSchema": "Omit",
        "responseSchema": "CampanhaInventarioDto"
    },
    "CampanhaController_removerItemInventario": {
        "controller": "CampanhaController",
        "metodo": "delete",
        "caminho": "/campanha/:id/inventario/item/:itemId",
        "tag": "Campanhas",
        "publica": false,
        "responseSchema": "CampanhaInventarioDto"
    },
    "CampanhaController_ajustarQuantidadeItemInventario": {
        "controller": "CampanhaController",
        "metodo": "patch",
        "caminho": "/campanha/:id/inventario/item/:itemId/quantidade",
        "tag": "Campanhas",
        "publica": false,
        "requestSchema": "object",
        "responseSchema": "CampanhaInventarioDto"
    },
    "CampanhaProjecaoController_recuperarPainelEspectador": {
        "controller": "CampanhaProjecaoController",
        "metodo": "get",
        "caminho": "/campanha/:id/painel-espectador",
        "tag": "Campanhas",
        "publica": false,
        "responseSchema": "CampanhaPainelEspectadorDto"
    },
    "CampanhaProjecaoController_recuperarPreviaJogador": {
        "controller": "CampanhaProjecaoController",
        "metodo": "get",
        "caminho": "/campanha/:id/previa-jogador/:usuarioAlvoId",
        "tag": "Campanhas",
        "publica": false,
        "responseSchema": "CampanhaPreviaJogadorDto"
    },
    "CampanhaProjecaoController_recuperarFichaPreviaJogador": {
        "controller": "CampanhaProjecaoController",
        "metodo": "get",
        "caminho": "/campanha/:id/previa-jogador/:usuarioAlvoId/ficha/:fichaId",
        "tag": "Campanhas",
        "publica": false,
        "responseSchema": "FichaRecuperadaDto"
    },
    "EncontroController_criar": {
        "controller": "EncontroController",
        "metodo": "post",
        "caminho": "/campanha/:id/encontro",
        "tag": "Encontros",
        "publica": false,
        "requestSchema": "EncontroCriarDto",
        "responseSchema": "EncontroCriadoDto"
    },
    "EncontroController_listarPorCampanha": {
        "controller": "EncontroController",
        "metodo": "get",
        "caminho": "/campanha/:id/encontro",
        "tag": "Encontros",
        "publica": false,
        "responseSchema": "EncontroResumoDto[]"
    },
    "EncontroController_recuperar": {
        "controller": "EncontroController",
        "metodo": "get",
        "caminho": "/encontro/:id",
        "tag": "Encontros",
        "publica": false,
        "responseSchema": "EncontroRecuperadoDto"
    },
    "EncontroController_adicionarCombatente": {
        "controller": "EncontroController",
        "metodo": "post",
        "caminho": "/encontro/:id/combatente",
        "tag": "Encontros",
        "publica": false,
        "requestSchema": "EncontroCombatenteAdicionarDto",
        "responseSchema": "EncontroRecuperadoDto"
    },
    "EncontroController_removerCombatente": {
        "controller": "EncontroController",
        "metodo": "delete",
        "caminho": "/encontro/combatente/:id",
        "tag": "Encontros",
        "publica": false,
        "responseSchema": "EncontroRecuperadoDto"
    },
    "EncontroController_alterarIdentidadeAvulso": {
        "controller": "EncontroController",
        "metodo": "put",
        "caminho": "/encontro/combatente/:id/identidade",
        "tag": "Encontros",
        "publica": false,
        "requestSchema": "EncontroCombatenteIdentidadeAlterarDto",
        "responseSchema": "EncontroRecuperadoDto"
    },
    "EncontroController_alterarImagemAvulso": {
        "controller": "EncontroController",
        "metodo": "post",
        "caminho": "/encontro/combatente/:id/imagem",
        "tag": "Encontros",
        "publica": false,
        "responseSchema": "EncontroRecuperadoDto"
    },
    "EncontroController_excluirImagemAvulso": {
        "controller": "EncontroController",
        "metodo": "delete",
        "caminho": "/encontro/combatente/:id/imagem",
        "tag": "Encontros",
        "publica": false,
        "responseSchema": "EncontroRecuperadoDto"
    },
    "EncontroController_atribuirIniciativa": {
        "controller": "EncontroController",
        "metodo": "put",
        "caminho": "/encontro/combatente/:id/iniciativa",
        "tag": "Encontros",
        "publica": false,
        "requestSchema": "EncontroCombatenteIniciativaAtribuirDto",
        "responseSchema": "EncontroRecuperadoDto"
    },
    "EncontroController_alterarFormulaIniciativa": {
        "controller": "EncontroController",
        "metodo": "put",
        "caminho": "/encontro/combatente/:id/iniciativa/formula",
        "tag": "Encontros",
        "publica": false,
        "requestSchema": "EncontroCombatenteIniciativaFormulaAlterarDto",
        "responseSchema": "EncontroRecuperadoDto"
    },
    "EncontroController_iniciar": {
        "controller": "EncontroController",
        "metodo": "post",
        "caminho": "/encontro/:id/iniciar",
        "tag": "Encontros",
        "publica": false,
        "responseSchema": "EncontroRecuperadoDto"
    },
    "EncontroController_encerrar": {
        "controller": "EncontroController",
        "metodo": "post",
        "caminho": "/encontro/:id/encerrar",
        "tag": "Encontros",
        "publica": false,
        "responseSchema": "EncontroRecuperadoDto"
    },
    "EncontroController_avancarTurno": {
        "controller": "EncontroController",
        "metodo": "post",
        "caminho": "/encontro/:id/turno/avancar",
        "tag": "Encontros",
        "publica": false,
        "responseSchema": "EncontroRecuperadoDto"
    },
    "EncontroController_voltarTurno": {
        "controller": "EncontroController",
        "metodo": "post",
        "caminho": "/encontro/:id/turno/voltar",
        "tag": "Encontros",
        "publica": false,
        "responseSchema": "EncontroRecuperadoDto"
    },
    "EncontroController_pedirIniciativa": {
        "controller": "EncontroController",
        "metodo": "post",
        "caminho": "/encontro/:id/iniciativa/pedido",
        "tag": "Encontros",
        "publica": false,
        "responseSchema": "EncontroRecuperadoDto"
    },
    "EncontroController_ajustarVida": {
        "controller": "EncontroController",
        "metodo": "put",
        "caminho": "/encontro/combatente/:id/vida",
        "tag": "Encontros",
        "publica": false,
        "requestSchema": "EncontroCombatenteVidaAjustarDto",
        "responseSchema": "EncontroRecuperadoDto"
    },
    "EncontroController_ajustarEnergia": {
        "controller": "EncontroController",
        "metodo": "put",
        "caminho": "/encontro/combatente/:id/energia",
        "tag": "Encontros",
        "publica": false,
        "requestSchema": "EncontroCombatenteEnergiaAjustarDto",
        "responseSchema": "EncontroRecuperadoDto"
    },
    "EncontroController_aplicarCondicao": {
        "controller": "EncontroController",
        "metodo": "post",
        "caminho": "/encontro/combatente/:id/condicao",
        "tag": "Encontros",
        "publica": false,
        "requestSchema": "EncontroCombatenteCondicaoAtribuirDto",
        "responseSchema": "EncontroRecuperadoDto"
    },
    "EncontroController_removerCondicao": {
        "controller": "EncontroController",
        "metodo": "delete",
        "caminho": "/encontro/combatente/:id/condicao",
        "tag": "Encontros",
        "publica": false,
        "requestSchema": "EncontroCombatenteCondicaoRemoverDto",
        "responseSchema": "EncontroRecuperadoDto"
    },
    "EncontroController_rolarIniciativasFaltantes": {
        "controller": "EncontroController",
        "metodo": "put",
        "caminho": "/encontro/:id/iniciativa",
        "tag": "Encontros",
        "publica": false,
        "requestSchema": "EncontroIniciativaRolarDto",
        "responseSchema": "EncontroRecuperadoDto"
    },
    "FichaController_criar": {
        "controller": "FichaController",
        "metodo": "post",
        "caminho": "/ficha",
        "tag": "Fichas",
        "publica": false,
        "requestSchema": "FichaCriarDto",
        "responseSchema": "FichaCriadaDto"
    },
    "FichaController_listar": {
        "controller": "FichaController",
        "metodo": "get",
        "caminho": "/ficha",
        "tag": "Fichas",
        "publica": false,
        "responseSchema": "FichaResumoDto[]"
    },
    "FichaController_minhas": {
        "controller": "FichaController",
        "metodo": "get",
        "caminho": "/ficha/minhas",
        "tag": "Fichas",
        "publica": false,
        "responseSchema": "FichaResumoDto[]"
    },
    "FichaController_mediasEsquadrao": {
        "controller": "FichaController",
        "metodo": "get",
        "caminho": "/ficha/medias-esquadrao",
        "tag": "Fichas",
        "publica": false,
        "responseSchema": "FichaMediasEsquadraoDto"
    },
    "FichaController_criarCriatura": {
        "controller": "FichaController",
        "metodo": "post",
        "caminho": "/ficha/criatura",
        "tag": "Fichas",
        "publica": false,
        "requestSchema": "FichaCriaturaCriarDto",
        "responseSchema": "FichaCriaturaCriadaDto"
    },
    "FichaController_recuperarCriatura": {
        "controller": "FichaController",
        "metodo": "get",
        "caminho": "/ficha/criatura/:id",
        "tag": "Fichas",
        "publica": false,
        "responseSchema": "FichaCriaturaRecuperadaDto"
    },
    "FichaController_alterarCriatura": {
        "controller": "FichaController",
        "metodo": "put",
        "caminho": "/ficha/criatura/:id",
        "tag": "Fichas",
        "publica": false,
        "requestSchema": "FichaCriaturaAlterarDto",
        "responseSchema": "FichaCriaturaAlteradaDto"
    },
    "FichaController_recuperar": {
        "controller": "FichaController",
        "metodo": "get",
        "caminho": "/ficha/:id",
        "tag": "Fichas",
        "publica": false,
        "responseSchema": "FichaRecuperadaDto"
    },
    "FichaController_alterar": {
        "controller": "FichaController",
        "metodo": "put",
        "caminho": "/ficha/:id",
        "tag": "Fichas",
        "publica": false,
        "requestSchema": "FichaAlterarDto",
        "responseSchema": "FichaAlteradaDto"
    },
    "FichaController_alterarVitalidade": {
        "controller": "FichaController",
        "metodo": "patch",
        "caminho": "/ficha/:id/vitalidade",
        "tag": "Fichas",
        "publica": false,
        "requestSchema": "FichaVitalidadeAlterarDto",
        "responseSchema": "FichaAlteradaDto"
    },
    "FichaController_alterarImagem": {
        "controller": "FichaController",
        "metodo": "post",
        "caminho": "/ficha/:id/imagem",
        "tag": "Fichas",
        "publica": false,
        "responseSchema": "FichaImagemAlteradaDto"
    },
    "FichaController_excluirImagem": {
        "controller": "FichaController",
        "metodo": "delete",
        "caminho": "/ficha/:id/imagem",
        "tag": "Fichas",
        "publica": false,
        "responseSchema": "FichaImagemAlteradaDto"
    },
    "FichaController_excluir": {
        "controller": "FichaController",
        "metodo": "delete",
        "caminho": "/ficha/:id",
        "tag": "Fichas",
        "publica": false,
        "responseSchema": "null"
    },
    "FichaController_duplicar": {
        "controller": "FichaController",
        "metodo": "post",
        "caminho": "/ficha/:id/duplicar",
        "tag": "Fichas",
        "publica": false,
        "responseSchema": "FichaCriadaDto"
    },
    "FichaController_atribuirCampanha": {
        "controller": "FichaController",
        "metodo": "put",
        "caminho": "/ficha/:id/campanha",
        "tag": "Fichas",
        "publica": false,
        "requestSchema": "FichaCampanhaAtribuirDto",
        "responseSchema": "FichaCampanhaAtribuidaDto"
    },
    "FichaController_pegarItemInventario": {
        "controller": "FichaController",
        "metodo": "post",
        "caminho": "/ficha/:id/inventario/item/pegar",
        "tag": "Fichas",
        "publica": false,
        "requestSchema": "Omit",
        "responseSchema": "FichaRecuperadaDto"
    },
    "FichaController_mandarItemInventarioParaBase": {
        "controller": "FichaController",
        "metodo": "post",
        "caminho": "/ficha/:id/inventario/item/mandar-para-base",
        "tag": "Fichas",
        "publica": false,
        "requestSchema": "Omit",
        "responseSchema": "FichaRecuperadaDto"
    },
    "FichaController_listarAcessos": {
        "controller": "FichaController",
        "metodo": "get",
        "caminho": "/ficha/:id/acesso",
        "tag": "Fichas",
        "publica": false,
        "responseSchema": "FichaAcessoResumoDto[]"
    },
    "FichaController_concederAcesso": {
        "controller": "FichaController",
        "metodo": "post",
        "caminho": "/ficha/:id/acesso",
        "tag": "Fichas",
        "publica": false,
        "requestSchema": "FichaAcessoConcederDto",
        "responseSchema": "FichaAcessoConcedidoDto"
    },
    "FichaController_revogarAcesso": {
        "controller": "FichaController",
        "metodo": "delete",
        "caminho": "/ficha/:id/acesso/:usuarioId",
        "tag": "Fichas",
        "publica": false,
        "responseSchema": "FichaAcessoRevogadoDto"
    },
    "PaginaCadernoController_listar": {
        "controller": "PaginaCadernoController",
        "metodo": "get",
        "caminho": "/campanha/:campanhaId/caderno/paginas",
        "tag": "Caderno",
        "publica": false,
        "responseSchema": "PaginaCadernoResumoDto[]"
    },
    "PaginaCadernoController_listarEsquadrao": {
        "controller": "PaginaCadernoController",
        "metodo": "get",
        "caminho": "/campanha/:campanhaId/caderno/esquadrao/paginas",
        "tag": "Caderno",
        "publica": false,
        "responseSchema": "PaginaCadernoResumoDto[]"
    },
    "PaginaCadernoController_listarMembro": {
        "controller": "PaginaCadernoController",
        "metodo": "get",
        "caminho": "/campanha/:campanhaId/caderno/membros/:usuarioId/paginas",
        "tag": "Caderno",
        "publica": false,
        "responseSchema": "PaginaCadernoResumoDto[]"
    },
    "PaginaCadernoController_recuperar": {
        "controller": "PaginaCadernoController",
        "metodo": "get",
        "caminho": "/pagina-caderno/:id",
        "tag": "Caderno",
        "publica": false,
        "responseSchema": "PaginaCadernoDto"
    },
    "PaginaCadernoController_criar": {
        "controller": "PaginaCadernoController",
        "metodo": "post",
        "caminho": "/campanha/:campanhaId/caderno/paginas",
        "tag": "Caderno",
        "publica": false,
        "requestSchema": "PaginaCadernoCriarDto",
        "responseSchema": "PaginaCadernoDto"
    },
    "PaginaCadernoController_criarEsquadrao": {
        "controller": "PaginaCadernoController",
        "metodo": "post",
        "caminho": "/campanha/:campanhaId/caderno/esquadrao/paginas",
        "tag": "Caderno",
        "publica": false,
        "requestSchema": "PaginaCadernoEsquadraoCriarDto",
        "responseSchema": "PaginaCadernoEsquadraoEstadoDto"
    },
    "PaginaCadernoController_recuperarEstadoEsquadrao": {
        "controller": "PaginaCadernoController",
        "metodo": "get",
        "caminho": "/pagina-caderno/:id/esquadrao/estado",
        "tag": "Caderno",
        "publica": false,
        "responseSchema": "PaginaCadernoEsquadraoEstadoDto"
    },
    "PaginaCadernoController_alterarEsquadrao": {
        "controller": "PaginaCadernoController",
        "metodo": "put",
        "caminho": "/pagina-caderno/:id/esquadrao/alteracoes",
        "tag": "Caderno",
        "publica": false,
        "requestSchema": "PaginaCadernoEsquadraoAlterarDto",
        "responseSchema": "PaginaCadernoEsquadraoAlteradaDto"
    },
    "PaginaCadernoController_excluirEsquadrao": {
        "controller": "PaginaCadernoController",
        "metodo": "delete",
        "caminho": "/pagina-caderno/:id/esquadrao",
        "tag": "Caderno",
        "publica": false,
        "responseSchema": "null"
    },
    "PaginaCadernoController_alterar": {
        "controller": "PaginaCadernoController",
        "metodo": "put",
        "caminho": "/pagina-caderno/:id",
        "tag": "Caderno",
        "publica": false,
        "requestSchema": "PaginaCadernoAlterarDto",
        "responseSchema": "PaginaCadernoDto"
    },
    "PaginaCadernoController_excluir": {
        "controller": "PaginaCadernoController",
        "metodo": "delete",
        "caminho": "/pagina-caderno/:id",
        "tag": "Caderno",
        "publica": false,
        "responseSchema": "null"
    },
    "PaginaCadernoController_buscar": {
        "controller": "PaginaCadernoController",
        "metodo": "get",
        "caminho": "/campanha/:campanhaId/busca",
        "tag": "Caderno",
        "publica": false,
        "responseSchema": "PaginatedResult<BuscaCampanhaResultadoDto>"
    },
    "RolagemController_registrar": {
        "controller": "RolagemController",
        "metodo": "post",
        "caminho": "/ficha/:id/rolagem",
        "tag": "Rolagens",
        "publica": false,
        "requestSchema": "RolagemRegistrarDto",
        "responseSchema": "RolagemResumoDto"
    },
    "RolagemController_registrarAvulso": {
        "controller": "RolagemController",
        "metodo": "post",
        "caminho": "/encontro/:encontroId/combatente/:combatenteId/rolagem",
        "tag": "Rolagens",
        "publica": false,
        "requestSchema": "RolagemRegistrarDto",
        "responseSchema": "RolagemResumoDto"
    },
    "RolagemController_listarPorFicha": {
        "controller": "RolagemController",
        "metodo": "get",
        "caminho": "/ficha/:id/rolagem",
        "tag": "Rolagens",
        "publica": false,
        "responseSchema": "PaginatedResult<RolagemResumoDto>"
    },
    "RolagemController_listarPorCampanha": {
        "controller": "RolagemController",
        "metodo": "get",
        "caminho": "/campanha/:id/rolagem",
        "tag": "Rolagens",
        "publica": false,
        "responseSchema": "RolagemResumoDto[]"
    },
    "UsuarioController_recuperarPerfil": {
        "controller": "UsuarioController",
        "metodo": "get",
        "caminho": "/usuario/perfil",
        "tag": "Usuários",
        "publica": false,
        "responseSchema": "UsuarioRecuperadoDto"
    },
    "UsuarioController_alterarSenha": {
        "controller": "UsuarioController",
        "metodo": "patch",
        "caminho": "/usuario/senha",
        "tag": "Usuários",
        "publica": false,
        "requestSchema": "UsuarioSenhaAlterarDto",
        "responseSchema": "UsuarioSenhaAlteradaDto"
    },
    "UsuarioController_alterarPerfil": {
        "controller": "UsuarioController",
        "metodo": "patch",
        "caminho": "/usuario/perfil",
        "tag": "Usuários",
        "publica": false,
        "requestSchema": "UsuarioPerfilAlterarDto",
        "responseSchema": "UsuarioPerfilAlteradoDto"
    },
    "UsuarioController_excluirConta": {
        "controller": "UsuarioController",
        "metodo": "delete",
        "caminho": "/usuario",
        "tag": "Usuários",
        "publica": false,
        "responseSchema": "null"
    },
    "UsuarioController_listar": {
        "controller": "UsuarioController",
        "metodo": "get",
        "caminho": "/usuario/admin",
        "tag": "Usuários",
        "publica": false,
        "responseSchema": "UsuarioListadosDto"
    },
    "UsuarioController_criar": {
        "controller": "UsuarioController",
        "metodo": "post",
        "caminho": "/usuario/admin",
        "tag": "Usuários",
        "publica": false,
        "requestSchema": "UsuarioAdministrativoCriarDto",
        "responseSchema": "UsuarioCriadoDto"
    },
    "UsuarioController_impersonar": {
        "controller": "UsuarioController",
        "metodo": "post",
        "caminho": "/usuario/admin/impersonar",
        "tag": "Usuários",
        "publica": false,
        "requestSchema": "UsuarioImpersonarDto",
        "responseSchema": "UsuarioAutenticadoDto"
    },
    "UsuarioController_alterar": {
        "controller": "UsuarioController",
        "metodo": "patch",
        "caminho": "/usuario/admin/:id",
        "tag": "Usuários",
        "publica": false,
        "requestSchema": "UsuarioPerfilAlterarDto",
        "responseSchema": "UsuarioPerfilAlteradoDto"
    },
    "UsuarioController_excluir": {
        "controller": "UsuarioController",
        "metodo": "delete",
        "caminho": "/usuario/admin/:id",
        "tag": "Usuários",
        "publica": false,
        "responseSchema": "null"
    },
    "UsuarioController_reativar": {
        "controller": "UsuarioController",
        "metodo": "patch",
        "caminho": "/usuario/admin/:id/reativar",
        "tag": "Usuários",
        "publica": false,
        "responseSchema": "UsuarioReativadoDto"
    },
    "UsuarioController_alterarTipo": {
        "controller": "UsuarioController",
        "metodo": "patch",
        "caminho": "/usuario/admin/:id/tipo",
        "tag": "Usuários",
        "publica": false,
        "requestSchema": "UsuarioTipoAlterarDto",
        "responseSchema": "UsuarioTipoAlteradoDto"
    },
    "UsuarioController_resetarSenha": {
        "controller": "UsuarioController",
        "metodo": "patch",
        "caminho": "/usuario/admin/:id/senha",
        "tag": "Usuários",
        "publica": false,
        "requestSchema": "UsuarioSenhaResetarDto",
        "responseSchema": "UsuarioSenhaResetadaDto"
    }
} as const;
