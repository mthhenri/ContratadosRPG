/**
 * Conteúdo de ajuda por aba da calculadora — equivalente ao `HELP_CONTENT` do site antigo
 * (`contratados-calculadora`), consumido pelo componente reutilizável `AjudaCalculadora`.
 *
 * **Origem do texto (quebra de paridade documentada, como na m1-11):** o `HELP_CONTENT`
 * original não foi migrado para este repositório e não está disponível para inspeção — a SPA
 * antiga é um projeto à parte, arquivada só após o M1 (SYSTEM.SPEC §1). Não havendo o texto de
 * origem, a paridade textual literal é impossível; a pedido do autor, cada entrada é um **guia de
 * "como usar esta página"** (instruções de uso da aba), redigido a partir do comportamento já
 * implementado das páginas (m1-07..m1-11) e conferido contra `docs/core/sistema-v4.1.0.md`.
 * Não há regra de jogo nova aqui — é texto de interface, no tom institucional do tema.
 */

/** Aba da calculadora que possui conteúdo de ajuda (casa com o `caminho` da rota). */
export type AbaAjuda = 'agente' | 'dt' | 'novo-agente' | 'patente' | 'descanso' | 'compras';

/** Conteúdo de ajuda de uma aba: guia de uso exibido no modal. */
export interface ConteudoAjuda {
  /** Título do modal — nome da aba. */
  readonly titulo: string;
  /** Uma frase resumindo para que serve a página. */
  readonly resumo: string;
  /** Passos / instruções de uso, exibidos como lista. */
  readonly passos: readonly string[];
  /** Observação final opcional (dica ou ressalva). */
  readonly nota?: string;
}

export const CONTEUDO_AJUDA: Readonly<Record<AbaAjuda, ConteudoAjuda>> = {
  agente: {
    titulo: 'Agente / Civil',
    resumo:
      'Calcula todas as estatísticas de um personagem a partir da classe, dos atributos e do nível.',
    passos: [
      'Escolha a Classe / Registro no seletor. Registros civis não têm Defesa, Proficiência, Dano Furtivo nem limite de Traumas — esses campos aparecem como N/A.',
      'Ajuste os cinco atributos nos steppers. Cada um alimenta stats diferentes (ex.: Vigor → Vida, Destreza → Energia); o limite máximo por atributo depende da classe.',
      'Defina o Nível no controle deslizante — a faixa mínima e máxima também varia conforme a classe.',
      'O card Status do Personagem recalcula sozinho: Vida e Energia em destaque, e o grid com Defesa, Esquiva, Bloqueio, Deslocamento, Inventário, Dano e demais stats.',
      'Benefícios deste Nível mostra o que o nível atual concede; Progressão Acumulada soma todos os ganhos até ele.',
    ],
    nota: 'Ao trocar de classe, o Nível e os atributos são reajustados automaticamente aos limites do novo registro.',
  },
  dt: {
    titulo: 'DT — Dificuldade de Teste',
    resumo:
      'Calcula a DT que aliados e inimigos precisam superar para resistir às suas ações.',
    passos: [
      'Informe o Nível do personagem e o Atributo usado na ação nos dois steppers.',
      'O resultado em destaque é a DT do teste, atualizada a cada mudança.',
      'A Tabela de Referência Rápida cruza atributos (linhas) e níveis (colunas) para consulta sem digitar.',
    ],
    nota: 'Fórmula: 10 + Nível + (Atributo × 2).',
  },
  'novo-agente': {
    titulo: 'Novo Agente',
    resumo:
      'Estima o Nível e o Prestígio iniciais de um agente que entra num grupo já em andamento, e o bônus monetário correspondente.',
    passos: [
      'Escolha o Motivo de entrada — ele define como o Prestígio inicial é deduzido da média do grupo.',
      'Informe a Média de Nível e a Média de Prestígio do grupo, excluindo quem está saindo.',
      'O card Resultado mostra o Nível Inicial, o Prestígio Inicial e a Patente resultante, com a memória de cálculo.',
      'Em Bônus Monetário Inicial, o Prestígio já vem preenchido com o valor calculado, mas pode ser editado à mão.',
    ],
    nota: 'O dinheiro inicial padrão (1.000 + 4D4 × 250) é aleatório e somado à parte — não entra neste cálculo. Alguns motivos concedem a condição Amaldiçoado pelo Passado.',
  },
  patente: {
    titulo: 'Patentes',
    resumo:
      'Consulta a patente correspondente a um valor de Prestígio e mostra a tabela completa de progressão.',
    passos: [
      'Informe o Prestígio atual no stepper.',
      'O destaque mostra a patente e sua faixa de Prestígio; abaixo, o Salário por Missão e o Limite de Modificações.',
      'A Referência Completa de Patentes lista todas as faixas, com a linha atual destacada.',
    ],
    nota: 'O Limite de Modificações é o mesmo consumido na aba Compras.',
  },
  descanso: {
    titulo: 'Descanso',
    resumo:
      'Calcula quanto de Vida e Energia um personagem recupera em um descanso, e permite rolar os dados.',
    passos: [
      'Escolha o Tipo de Descanso e a Qualidade do Ambiente, e informe Vigor, Destreza e Nível.',
      'Indique se houve Refeição e se o descanso foi Interrompido — ambos afetam a recuperação.',
      'O card Resultado mostra a faixa (mínimo–máximo) de recuperação de Vida e Energia, com a fórmula e as notas.',
      'Em Rolar Dados, opcionalmente informe Dados Extras (ex.: 2d6) e clique em Rolar para obter um valor concreto, com o detalhamento do cálculo.',
    ],
    nota: 'Vigor determina a recuperação de Vida; Destreza, a de Energia. Descansos curtos não recuperam Vida.',
  },
  compras: {
    titulo: 'Compras',
    resumo:
      'Monta o equipamento de um agente dentro dos limites de dinheiro, inventário e patente.',
    passos: [
      'Em Configuração, informe Dinheiro, Prestígio, Inventário e Vontade — eles definem os limites de gasto, peso e modificações.',
      'O Resumo acompanha em tempo real o dinheiro gasto e restante, o inventário usado e os limites de modificações e amplificadores.',
      'No Catálogo, navegue pelas categorias ou use a busca e clique num item para adicioná-lo ao carrinho.',
      'No Carrinho, ajuste quantidades, alterne entre Guardada e Vestida, e abra o painel de modificações de cada item; amplificadores aparecem na própria seção.',
      'No topo, alterne para Vender: monte um carrinho de venda separado (mesmo catálogo e modificações) e veja quanto renderia — escolha a taxa (Normal 50%, Check-in 75% ou Fora de patente 25%). O bloco de Fragmentos soma módulos I–V por Potencializador / Construtor, e o Total de Venda combina itens + fragmentos.',
    ],
    nota: 'O carrinho de compra é salvo automaticamente neste navegador (o de venda não). Use Exportar / Importar para transferi-lo — o código é próprio desta calculadora e não é compatível com o do site antigo. Ressalvas de venda que a calculadora não modela: o equipamento inicial só pode ser vendido ao atingir Operador, um item inutilizável não tem valor, e o Módulo ∅ de fragmento é negociado com o Mestre (fora da tabela).',
  },
};
