import { Component, computed, input } from "@angular/core";

/**
 * Nomes de ícone suportados. Os seis primeiros são as abas da simulacao (batem com o
 * `caminho` da rota); os dez seguintes são as categorias do catálogo de compras + amplificador;
 * depois (m2-09) topbar, autenticação e campanhas (nav, dropdown de perfil, chips de papel,
 * ações); e por fim as seis abas da ficha (batem com o `id` da aba — Visão Geral, Combate,
 * Inventário, Habilidades, Sanidade, Rolagens); e por fim as três condições rastreadas na ficha
 * (`sistema-v4.1.3.md` — "Condições"; m2-16b), usadas no editor e no mini-card de campanha; e
 * `infinito`, marca de lesão permanente na aba Sanidade; `alerta`, sinal de sobrecarga na linha
 * "Inventário"; `camadas`/`teto`, toggles "não conta no total/teto" das modificações de item; e
 * `busca`, botão de busca de itens na aba Inventário; `duplicar`, ação de clonar uma ficha no
 * painel da campanha (m3-52); `d20`, gatilho da barra lateral de histórico de rolagens
 * (campanha e ficha); `d4`/`d6`/`d8`/`d10`/`d12`, mesma família de dado sólido do `d20` — usados
 * no pool de dados de `ResultadoRolagem` (silhueta do dado por trás do valor rolado, em vez do
 * quadradinho); e `fragmento-construtor`/`fragmento-potencializador`, variantes do
 * diamante genérico `fragmento` com um selo no canto inferior direito (martelo/estrela) —
 * usadas só onde a categoria específica importa (abas do catálogo, select de item custom);
 * o `fragmento` genérico continua valendo pros demais usos (filtro, badge "de Fragmento"); as
 * duas AÇÕES do fragmento Potencializador seguem o mesmo padrão "2 ícones em 1" de
 * `fragmento-construtor`/`fragmento-potencializador` (diamante menor + selo no canto inferior
 * direito), pra não repetir o diamante puro: `link` (Aplicar em... — selo de elo de corrente) e
 * `chama` (Consumir — selo de chama, o fragmento é destruído); e `modificador` (±), rótulo do
 * stepper de modificador de teste na edição de atributos — mesmo papel que `dado` cumpre pro
 * rótulo do stepper de ajuste de dados, ao lado; `carregando`, o giro do estado de carregamento
 * do primitivo de botão (`shared/ui/botao`, ui-01b) — primeiro spinner do projeto; e `fantasma`,
 * identidade visual do papel `ESPECTADOR` (m8-01) — chip de papel na lista de Membros, botão
 * "Painel" e selo "Modo espectador" — distinto de `olho`, que fica só para ações de
 * visualização/prévia (não é uma identidade de papel); e `membros`, grupo de pessoas — item
 * "Membros" de `app-coluna-acoes` e a dialog homônima do painel de mestre da campanha; e
 * `vincular`, ícone "link" inteiro da Tabler Icons (MIT) — ação "Vincular ficha existente" do
 * jogador (ui-33 follow-up; antes reaproveitava `duplicar`, que já tem sentido próprio de clonar
 * uma ficha, m3-52), distinto do selo elo-de-corrente recortado usado em `link`.
 * `caderno`, caderno espiral: ação "Caderno" (registro compartilhado da campanha) na coluna de
 * ações/menu "⋯" da ficha — antes reaproveitava `anotacoes`, o mesmo glifo já usado para as
 * Anotações da própria ficha (achado ao vivo pelo autor: os dois itens ficavam indistinguíveis
 * lado a lado no menu), distinto também de `documentos` (livro aberto, reservado ao leitor global
 * de Sistema/Guia do Mestre).
 * `dados`, dois d20 sobrepostos (ui-37): "Rolar iniciativas" na condução de turno do mestre.
 * `info`, círculo com "i": mostra/oculta o texto da missão no cabeçalho da campanha do jogador.
 * `desfazer`/`refazer`, setas em gancho ("arrow-back-up"/"arrow-forward-up" da Tabler Icons, MIT):
 * histórico da barra do editor Markdown.
 * `senha`, chave ("key" da Tabler Icons, MIT): ação "Trocar senha" do Perfil — antes
 * reaproveitava `patente`, a medalha da Patente, que tem sentido próprio
 * (skills-10-gerenciamento-de-impacto).
 * Biblioteca de documentos da campanha (m9-04), todos da Tabler Icons (MIT): `biblioteca`, estante de
 * livros ("books") — item "Biblioteca" do mestre, distinto de `documentos` (livro aberto, leitor
 * global das regras) e de `caderno`; `imagem`, moldura com montanha ("photo") — tipo de documento
 * de imagem (o de texto usa `anotacoes`); `tamanho-real`/`ajustar-largura`, setas para fora/para
 * dentro ("arrows-maximize"/"arrows-minimize") — alternância de tamanho do leitor de imagem.
 * Pastas da Biblioteca (biblioteca-pastas), da Tabler Icons (MIT): `pasta` ("folder") fechada e
 * `pasta-aberta` ("folder-open"), usadas na linha de pasta (`app-pasta-linha`); `opcoes`
 * ("dots", três pontos), gatilho do menu de ações por item no modo Organizar.
 * Família de identidade (m10-03): classes, arquétipos, subclasses de experimento, Civil e NPC,
 * para os dossiês do leitor de Regras (M10) e futuros consumidores. Desenhos aprovados em
 * `docs/specs/backlog/m10-regras/m10-regras-exemplao.html`, objeto ICO, opção `dec`.
 * Tipos de dano, categorias de habilidade e reações (icones-dano-habilidade-fragmento-reacao):
 * `dano-*`, `habilidade-*` e `reacao-*`, de contorno, sempre ao lado do texto do conceito —
 * desenhos votados na prancha de `docs/specs/active/icones-recursos-sistema/`. As variantes
 * `fragmento-construtor`/`fragmento-potencializador` trocaram de desenho (Prisma e Cristal radiante).
 * Marcas preenchidas (m10-04): `scp`/`criatura` são o logo oficial, `contratados` é a marca
 * SCP + D20. Geometria e crédito aprovados em `docs/design/MARCAS.md`.
 * Cenas (UI-41): `cena-*` identifica cada tipo e `cenas` é o genérico (claquete).
 * Desenhos originais Codex (OpenAI), aprovados pelo autor na prancha da UI-41;
 * Furtiva segue o pedido expresso de homem encapuzado. O glifo `combate` é preservado.
 * `maestria` (Atributo coroado) e `critico` (dado em silhueta com brilho de quatro pontas por cima):
 * desenhos originais Codex (OpenAI), aprovados pelo autor em 18/10/2026 (o brilho grande do crítico foi
 * escolhido em 20/10/2026), sem assets externos; uso sob a licença do projeto.
 * `valor-desafio` (Patamares de nível) e `tenacidade` (Coração reforçado): desenhos originais Codex (OpenAI),
 * rodada 2 da `icones-criatura-vd-tenacidade`, votados pelo autor em 18/10/2026; sem assets externos.
 */
// Ações: desenhos originais Codex (OpenAI), votos de 20/10/2026, prancha-acoes aprovada.
export type IconeNome =
  | 'menu-acoes'
  | 'alca-arrastar'
  | 'apagar-termo'
  | 'rolagem-encadeada'
  | 'janela-minimizar'
  | 'janela-maximizar'
  | 'janela-restaurar'
  | 'mover-acima'
  | 'mover-abaixo'
  | 'rolar-inicio'
  | 'rolar-fim'
  | 'fechar-painel'
  | 'cancelar-edicao'
  | 'restaurar-padrao'
  | 'maestria'
  | 'critico'
  | 'valor-desafio'
  | 'tenacidade'
  | 'agente'
  | 'dt'
  | 'novo-agente'
  | 'patente'
  | 'descanso'
  | 'compras'
  | 'vendas'
  | 'corpo-a-corpo'
  | 'explosivos'
  | 'armas-de-fogo'
  | 'municoes'
  | 'protecoes'
  | 'exoticos'
  | 'armazenamento'
  | 'operacional'
  | 'medicinal'
  | 'amplificador'
  | 'sem-categoria'
  | 'campanhas'
  | 'ficha'
  | 'simulacao'
  | 'calculadora'
  | 'documentos'
  | 'sair'
  | 'entrar'
  | 'chevron'
  | 'chevron-direita'
  | 'copiar'
  | 'check'
  | 'mais'
  | 'convite'
  | 'coroa'
  | 'atualizar'
  | 'voltar'
  | 'abrir-externo'
  | 'editar'
  | 'excluir'
  | 'olho'
  | 'olho-fechado'
  | 'olho-rolagens'
  | 'olho-fechado-rolagens'
  | 'olho-membros'
  | 'tema'
  | 'visao-geral'
  | 'combate'
  | 'cena-investigacao'
  | 'cena-combate'
  | 'cena-furtiva'
  | 'cena-perseguicao'
  | 'cena-resistencia'
  | 'cenas'
  | 'inventario'
  | 'habilidades'
  | 'sanidade'
  | 'anotacoes'
  | 'vestida'
  | 'guardada'
  | 'fragmento'
  | 'fragmento-construtor'
  | 'fragmento-potencializador'
  | 'link'
  | 'chama'
  | 'dado'
  | 'dado-mais'
  | 'dados'
  | 'morrendo'
  | 'machucado'
  | 'inconsciente'
  | 'infinito'
  | 'alerta'
  | 'camadas'
  | 'teto'
  | 'busca'
  | 'busca-titulo'
  | 'busca-descricao'
  | 'busca-ambos'
  | 'info'
  | 'duplicar'
  | 'd20'
  | 'd3'
  | 'd4'
  | 'd6'
  | 'd8'
  | 'd10'
  | 'd12'
  | 'modificador'
  | 'vassoura'
  | 'importar'
  | 'tabela'
  | 'linha-adicionar'
  | 'linha-remover'
  | 'coluna-adicionar'
  | 'coluna-remover'
  | 'carregando'
  | 'fantasma'
  | 'membros'
  | 'vincular'
  | 'senha'
  | 'caderno'
  | 'desfazer'
  | 'refazer'
  | 'biblioteca'
  | 'imagem'
  | 'tamanho-real'
  | 'ajustar-largura'
  | 'pasta'
  | 'pasta-aberta'
  | 'opcoes'
    | "combatente"
    | "especialista"
    | "suporte"
    | "lutador"
    | "mercenario"
    | "vanguarda"
    | "engenheiro"
    | "assassino"
    | "academico"
    | "paramedico"
    | "diplomata"
    | "comandante"
    | "bestial"
    | "artificial"
    | "hibrido"
    | "civil"
    | "npc"
    | "scp"
    | "criatura"
    | "contratados"
    | "vida"
    | "energia"
    | "defesa"
    | "dano-fisico"
    | "dano-balistico"
    | "dano-explosao"
    | "dano-quimico"
    | "dano-geral"
    | "dano-composto"
    | "habilidade-geral"
    | "habilidade-geral-melhorada"
    | "habilidade-classe"
    | "habilidade-arquetipo"
    | "habilidade-subclasse"
    | "habilidade-outra-classe"
    | "habilidade-personalidade"
    | "habilidade-especialidade"
    | "habilidade-civil"
    | "habilidade-unica"
    | "reacao-esquiva"
    | "reacao-bloqueio"
    | "reacao-contra-ataque";

/**
 * Ícone monocromático de linha (SVG inline, `stroke: currentColor`) — reutilizado nos menus de
 * abas da simulacao e nas categorias da aba `compras`. **Não é emoji** (o tema "Terminal de
 * Contenção" proíbe emoji decorativo — por isso os `⚔ 🎯 …` do site antigo foram removidos nas
 * m1-06/m1-10): é um traço técnico que herda a cor do texto do controle (inclusive o accent no
 * estado ativo) e escala com a fonte (`1.15em`). As marcas usam preenchimento herdado sem
 * traço; os demais glifos mantêm o contorno original. Puramente decorativo → `aria-hidden`.
 */
@Component({
  selector: 'app-icone',
  imports: [],
  templateUrl: './icone.component.html',
  styleUrl: './icone.component.scss',
})
export class Icone {
  /** Qual glifo desenhar. */
  readonly nome = input.required<IconeNome>();

    /** SCP oficial só em Criatura; nossa marca é a referência de Regras e níveis. */
    protected readonly glifo = computed(() => this.nome() === "criatura" ? "scp" : this.nome());
    protected readonly preenchido = computed(() =>
        ["scp", "contratados", "vida", "energia", "defesa"].includes(this.glifo()),
    );
}
