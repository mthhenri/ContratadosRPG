import { ItemCategoriaEnum } from '../../enums';

/**
 * Catálogo de itens da loja (`CATALOGO_ITENS` do site antigo), migrado de
 * `contratados-calculadora/src/script.js` e conferido contra
 * docs/core/sistema-v4.1.0.md — capítulo "Equipamentos" (tabelas de item por
 * categoria). Em conflito, o documento vence (proibição #27). Os amplificadores
 * (categoria `AMPLIFICADOR`) vivem em `compras.dados` (`AMPLIFICADORES`).
 */

/**
 * Um item do catálogo. Os campos além de nome/custo/peso variam por categoria:
 * `dano`/`informacao` (armas), `resistencia` (proteções), `bonus`
 * (armazenamento). `categoriaEmprestada` marca itens exóticos que, com a
 * modificação "Faz Parte", passam a aceitar modificações de outra categoria.
 * `ehEscudo` distingue os escudos dentro da categoria `PROTECOES` (que também
 * abriga coletes/armaduras): só escudos aceitam as modificações "Apenas para
 * escudos" (Combativo, Arremesso). Fonte: docs/core/sistema-v4.1.0.md — Proteções.
 */
export interface ItemCatalogo {
  readonly nome: string;
  readonly custo: number;
  readonly peso: number;
  readonly dano?: string;
  readonly informacao?: string;
  readonly resistencia?: string;
  readonly bonus?: string;
  readonly descricao?: string;
  readonly categoriaEmprestada?: ItemCategoriaEnum;
  readonly ehEscudo?: boolean;
}

export const CATALOGO_ITENS: Readonly<Record<ItemCategoriaEnum, readonly ItemCatalogo[]>> = {
  [ItemCategoriaEnum.CORPO_A_CORPO]: [
    { nome: 'Acessório de Combate', custo: 250, peso: 0.5, dano: '1D3~1D6+Corpo [Físico]', descricao: 'Adereço de combate para as mãos, sapatos, etc.' },
    { nome: 'Leve', custo: 500, peso: 1, dano: '1D6+DES [Físico]', descricao: 'Armas pequenas e ágeis como facas ou martelos — 1 mão' },
    { nome: 'Mediana', custo: 1000, peso: 2, dano: '3D4+FOR [Físico]', descricao: 'Espadas, sabres e martelos médios — 1 mão' },
    { nome: 'Grande', custo: 1250, peso: 3, dano: '3D6+FOR [Físico]', descricao: 'Claymore, maça pesada e armas de grande porte — 2 mãos' },
    { nome: 'Pesada', custo: 1500, peso: 5, dano: '3D8+FOR [Físico]', descricao: 'Armas massivas e destrutivas — 2 mãos' },
  ],
  [ItemCategoriaEnum.EXPLOSIVOS]: [
    { nome: 'Molotov', custo: 400, peso: 1, dano: '3D8 [Químico]', informacao: 'Curto · 2m · Em Chamas (2t)', descricao: 'Garrafa incendiária que cobre área em chamas' },
    { nome: 'Granada de Mão', custo: 350, peso: 1, dano: '3D10 [Explosão]', informacao: 'Médio · 3m', descricao: 'Granada explosiva padrão — 1 mão' },
    { nome: 'Granada de Fragmentação', custo: 500, peso: 1, dano: '5D10 [Explosão]', informacao: 'Médio · 3m', descricao: 'Alta fragmentação, dano elevado em área — 1 mão' },
    { nome: 'Granada Incendiária', custo: 600, peso: 1, dano: '2D12 [Químico]', informacao: 'Médio · 3m · Em Chamas', descricao: 'Cobre área em fogo persistente — 1 mão' },
    { nome: 'Granada de Impacto', custo: 750, peso: 1, dano: '5D12 [Explosão]', informacao: 'Médio · 3m · −2 dados p/ reagir', descricao: 'Explode no impacto, difícil de esquivar — 1 mão' },
    { nome: 'Granada de Fumaça', custo: 300, peso: 1, dano: '— (fumaça)', informacao: 'Médio · 5m · +5 furtividade (3t)', descricao: 'Cortina de fumaça por 3 turnos — 1 mão' },
    { nome: 'Granada de Congelamento', custo: 600, peso: 1, dano: '2D10 [Químico]', informacao: 'Médio · 3m · Imobiliza (FOR DT PON)', descricao: 'Congela alvos, podendo imobilizar — 1 mão' },
  ],
  [ItemCategoriaEnum.ARMAS_DE_FOGO]: [
    { nome: 'Pistola', custo: 500, peso: 1, dano: '2D6 [Balístico]', informacao: 'Curto · Mun: 9mm', descricao: 'Leve e compacta, ideal para curta distância — 1 mão' },
    { nome: 'Submetralhadora', custo: 600, peso: 1, dano: '3D4 [Balístico]', informacao: 'Curto · Mun: 10mm', descricao: 'Alta cadência, eficaz contra múltiplos alvos — 1 mão' },
    { nome: 'Escopeta', custo: 750, peso: 2, dano: '3D6 [Balístico]', informacao: 'Curto · Mun: 12GA', descricao: 'Devastadora em ambientes fechados — 2 mãos' },
    { nome: 'Fuzil de Assalto', custo: 1000, peso: 2, dano: '2D8 [Balístico]', informacao: 'Médio · Mun: 5.56mm', descricao: 'Versátil, equilibra alcance e poder de fogo — 2 mãos' },
    { nome: 'Rifle de Precisão', custo: 1250, peso: 2, dano: '2D10 [Balístico]', informacao: 'Longo · Mun: 7.62mm', descricao: 'Preciso a longas distâncias — 2 mãos' },
    { nome: 'Metralhadora', custo: 2000, peso: 4, dano: '4D4 [Balístico]', informacao: 'Médio · Mun: 12.7mm', descricao: 'Alta cadência, enorme poder de fogo — 2 mãos' },
  ],
  [ItemCategoriaEnum.MUNICOES]: [
    { nome: '9mm', custo: 100, peso: 0.5, descricao: 'Para pistolas e SMGs' },
    { nome: '10mm', custo: 180, peso: 0.7, descricao: 'Para submetralhadoras' },
    { nome: 'Cartuchos 12GA', custo: 100, peso: 0.5, descricao: 'Para escopetas' },
    { nome: '5.56mm', custo: 200, peso: 1, descricao: 'Para fuzis de assalto' },
    { nome: '7.62mm', custo: 300, peso: 1, descricao: 'Para rifles de precisão' },
    { nome: '12.7mm', custo: 450, peso: 1.5, descricao: 'Para metralhadoras e torretas' },
    { nome: 'Granadas Simples', custo: 500, peso: 1.5, descricao: 'Para lança-granadas' },
    { nome: 'Tanque de Propano', custo: 500, peso: 1, descricao: 'Combustível para lança-chamas' },
    { nome: 'Míssil', custo: 1000, peso: 3, descricao: 'Para bazucas' },
    { nome: 'Virotes', custo: 130, peso: 1, descricao: 'Para balestras' },
    { nome: 'Células de Plasma', custo: 400, peso: 1.5, descricao: 'Para o Quebra-Átomos e armas Plasma' },
    { nome: 'Gasolina', custo: 300, peso: 2, descricao: 'Combustível para a Motoserra. Mods: Calibre, Explosiva, Incendiária, Perfurante, Selante, Supressora, Tóxica' },
  ],
  [ItemCategoriaEnum.PROTECOES]: [
    { nome: 'Colete Leve', custo: 500, peso: 0.5, resistencia: '2 [Físico]', descricao: 'Proteção básica, leve e discreta' },
    { nome: 'Colete Tático', custo: 1000, peso: 1, resistencia: '4 [Físico]', descricao: 'Proteção tática balanceada' },
    { nome: 'Colete de Kevlar', custo: 1500, peso: 2, resistencia: '5 [Físico], 3 [Balístico]', descricao: 'Proteção contra projéteis e impactos' },
    { nome: 'Roupa Anti-Químico', custo: 2500, peso: 2, resistencia: '6 [Químico]', descricao: 'Proteção total contra agentes químicos e gases' },
    { nome: 'Armadura Pesada', custo: 3000, peso: 4, resistencia: '10 [Físico], 6 [Balístico]', descricao: 'Máxima proteção. Penalidade: −1 dado DES' },
    { nome: 'Escudo Leve', custo: 300, peso: 1, resistencia: '1 [Físico/Balístico]', ehEscudo: true, descricao: 'Escudo compacto para bloqueio rápido — 1 mão' },
    { nome: 'Escudo Médio', custo: 750, peso: 2, resistencia: '3 [Físico/Balístico]', ehEscudo: true, descricao: 'Equilíbrio entre proteção e mobilidade — 1 mão' },
    { nome: 'Escudo Pesado', custo: 1250, peso: 3, resistencia: '5 [Físico/Balístico]', ehEscudo: true, descricao: 'Proteção robusta — 2 mãos' },
    { nome: 'Escudo-Barreira Móvel', custo: 1750, peso: 4, resistencia: '7 [Físico/Balístico]', ehEscudo: true, descricao: 'Barreira de combate. Penalidade: −1 dado DES — 2 mãos' },
  ],
  [ItemCategoriaEnum.EXOTICOS]: [
    { nome: 'Lança-Granada', custo: 3000, peso: 3, dano: '4D8 [Explosão]', informacao: 'Médio · 3m · Mun: Granadas', descricao: 'Lança granadas explosivas em área — 2 mãos', categoriaEmprestada: ItemCategoriaEnum.ARMAS_DE_FOGO },
    { nome: 'Balestra', custo: 750, peso: 1.5, dano: '2D6 [Físico]', informacao: 'Médio · Mun: Virotes', descricao: 'Arco mecânico de alta precisão — 2 mãos', categoriaEmprestada: ItemCategoriaEnum.ARMAS_DE_FOGO },
    { nome: 'Torreta', custo: 7500, peso: 5, dano: '3D6 [Balístico]', informacao: 'Médio · Mun: 12.7mm', descricao: 'Máquina autônoma de disparo; usa PON de quem a posicionou', categoriaEmprestada: ItemCategoriaEnum.ARMAS_DE_FOGO },
    { nome: 'Bazuca', custo: 5000, peso: 7, dano: '12D8 [Explosão]', informacao: 'Médio · 7m · Mun: Míssil', descricao: 'Míssil em linha reta, explode no contato — 2 mãos', categoriaEmprestada: ItemCategoriaEnum.ARMAS_DE_FOGO },
    { nome: 'Lança-Chamas', custo: 3000, peso: 4, dano: '3D8 [Químico]', informacao: 'Curto · Em Chamas · Mun: Propano', descricao: 'Rajada de fogo contínua, incendeia área — 2 mãos', categoriaEmprestada: ItemCategoriaEnum.ARMAS_DE_FOGO },
    { nome: 'Motoserra', custo: 2500, peso: 3, dano: '2D8 [Físico]', informacao: 'CaC · Crítico ×3 · Mun: Gasolina', descricao: 'Arma brutal — crítico causa dano ×3 — 2 mãos', categoriaEmprestada: ItemCategoriaEnum.CORPO_A_CORPO },
    { nome: 'Quebra-Átomos', custo: 3500, peso: 4, dano: '2D12 [Químico]', informacao: 'Médio · Mun: Células de Plasma', descricao: 'Fuzil de plasma que desintegra alvos — 2 mãos', categoriaEmprestada: ItemCategoriaEnum.ARMAS_DE_FOGO },
  ],
  [ItemCategoriaEnum.ARMAZENAMENTO]: [
    { nome: 'Bolso de Corpo', custo: 75, peso: 0.1, bonus: '+1 inv.', descricao: 'Pequeno bolso corporal discreto' },
    { nome: 'Pochete', custo: 200, peso: 0.2, bonus: '+2 inv.', descricao: 'Pochete compacta de cintura' },
    { nome: 'Mochila Pequena', custo: 300, peso: 0.3, bonus: '+3 inv.', descricao: 'Mochila leve para missões rápidas' },
    { nome: 'Mochila Mediana', custo: 750, peso: 0.5, bonus: '+6 inv.', descricao: 'Mochila tática de uso geral' },
    { nome: 'Mochila Grande', custo: 1200, peso: 0.7, bonus: '+9 inv.', descricao: 'Mochila de grande capacidade' },
    { nome: 'Mochila Cargueira', custo: 2000, peso: 1.0, bonus: '+12 inv.', descricao: 'Mochila de capacidade máxima' },
    { nome: 'Mochila Kevlar', custo: 1200, peso: 0.7, bonus: '+4,5 inv.', descricao: 'Proteção para conteúdo + armazenamento médio' },
    { nome: 'Mochila Médica', custo: 1600, peso: 0.5, bonus: '+5 inv.', descricao: 'Bolsas organizadas para kits médicos' },
  ],
  [ItemCategoriaEnum.OPERACIONAL]: [
    { nome: 'Energético', custo: 50, peso: 0.5, descricao: 'Recupera 50% da Energia máxima (2×/missão)' },
    { nome: 'Energético Concentrado', custo: 250, peso: 0.5, descricao: 'Recupera 100% da Energia máxima (2×/missão)' },
    { nome: 'Carga Vital', custo: 450, peso: 1, descricao: 'Reduz custo de habilidades −2E por 2D4t. Depois: −1 dado DES/FOR' },
    { nome: 'Refeição', custo: 50, peso: 0.5, descricao: 'Usada em descanso para aumentar recuperação de Vida e Energia' },
    { nome: 'Equipamento de Descanso', custo: 400, peso: 2.5, descricao: '+1 nível de qualidade de descanso (ou +1 dado se já Confortável)' },
    { nome: 'Lanterna', custo: 50, peso: 0.5, descricao: 'Remove Escuridão até alcance Curto — 1 mão' },
    { nome: 'Lanterna Tática', custo: 200, peso: 0.3, descricao: 'Remove Escuridão até alcance Médio (corporal)' },
    { nome: 'Binóculos', custo: 250, peso: 1, descricao: 'Visão precisa a até 50 metros de distância' },
    { nome: 'Lockpick', custo: 50, peso: 0.5, descricao: 'Abre fechaduras (DES/INT). 3 usos; falha remove 1 uso' },
    { nome: 'Óculos de Visão Noturna', custo: 1250, peso: 1, descricao: 'Remove penalidade de Escuridão até alcance Médio (corporal)' },
    { nome: 'Óculos de Visão Térmica', custo: 1000, peso: 1, descricao: 'Vê alvos com calor corporal através de paredes (corporal)' },
    { nome: 'Máscara de Respiração', custo: 1000, peso: 1, descricao: 'Auxilia respiração em ambientes difíceis. Recarga: Tanque de Oxigênio' },
    { nome: 'Tanque de Oxigênio', custo: 300, peso: 1, descricao: 'Dura 1 cena. Recarga para Máscara de Respiração' },
    { nome: 'Ponto de Comunicação', custo: 250, peso: 0.2, descricao: 'Comunicação a distância em até 100 metros (corporal)' },
    { nome: 'Radio Comunicador', custo: 100, peso: 0.5, descricao: 'Comunicação a distância em até 50 metros — 1 mão' },
    { nome: 'Bandoleira', custo: 250, peso: 1, descricao: 'Saca/guarda uma arma como ação livre (corporal)' },
    { nome: 'Kit de Transmissão de Rádio', custo: 2500, peso: 4, descricao: 'Base de transmissão portátil — alcance 50m em zonas bloqueadas' },
    { nome: 'Algemas', custo: 200, peso: 0.5, descricao: 'Prende alvo (LUT/DES × LUT/DES). Liberta com FOR DT INT' },
    { nome: 'Contingência Viva', custo: 1500, peso: 0.5, descricao: 'Prende alvos de até tamanho grande (DT INT+5)' },
    { nome: 'Dispositivo de Distração', custo: 300, peso: 0.5, descricao: 'Som em alcance Médio: seres fazem INT DT SOC' },
    { nome: 'Equipamentos de Emergência', custo: 2500, peso: 4, descricao: 'Carrega até 3 itens úteis pré-definidos (sem armas/munições)' },
    { nome: 'Sinalizador', custo: 500, peso: 1, descricao: 'Emite luz e fumaça a 100m por 1D4 turnos' },
    { nome: 'Kit de Reparo', custo: 350, peso: 1, descricao: '+3 no teste de reparo de equipamento' },
  ],
  [ItemCategoriaEnum.MEDICINAL]: [
    { nome: 'Calmante', custo: 300, peso: 0.5, descricao: 'Suprime 1 sequela à escolha por 1 cena' },
    { nome: 'Inalador Medicinal', custo: 100, peso: 0.5, descricao: 'Suprime 1 sequela à escolha por 3 turnos' },
    { nome: 'Ampola Estímulo Neurológico', custo: 1150, peso: 1, descricao: 'Suprime 1 sequela à escolha por 3 cenas' },
    { nome: 'Bandagem', custo: 50, peso: 0.2, descricao: 'Cura: 2D4 Vida' },
    { nome: 'Gel Cicatrizante', custo: 250, peso: 0.5, descricao: 'Cura: 2D6 Vida' },
    { nome: 'Spray Medicinal', custo: 150, peso: 0.3, descricao: 'Cura: 1D8 Vida (ação de Movimento)' },
    { nome: 'Pomada Médica', custo: 500, peso: 1, descricao: 'Cura: 2D8+MED Vida. +1 dado p/ tratar Morrendo (DT 10)' },
    { nome: 'Kit Médico', custo: 1000, peso: 2, descricao: 'Cura: 3D10+MED×2 Vida. +1 dado +3 p/ Morrendo (DT 15)' },
    { nome: 'Reanimador', custo: 1750, peso: 3, descricao: 'Cura: 2D12+MED×3 Vida. +1 dado +5 p/ Morrendo (DT 20)' },
    { nome: 'Atadura de Luxo', custo: 2500, peso: 1, descricao: 'Cura: 4D12+MED×2+Patente×2 Vida. +2 dados +7 p/ Morrendo (DT 25)' },
    { nome: 'Kit de Recuperação Completo', custo: 4000, peso: 4, descricao: 'Cura: (4D6)×Patente Vida. +3 dados +10 p/ Morrendo (DT 30)' },
    { nome: 'Estabilizador de Lesão', custo: 2000, peso: 1, descricao: 'Ignora penalidade de 1 lesão por 1D3+1t. MED DT 15' },
    { nome: 'Estimulante Potente', custo: 1750, peso: 0.5, descricao: '−50% dano recebido por 1D8t. Depois: Cansado 2t. DT 10' },
    { nome: 'Solução Energizante', custo: 1000, peso: 0.5, descricao: '+VIG de resist. [Físico] por 1D8t. DT 10' },
    { nome: 'Adrenalina', custo: 1000, peso: 0.5, descricao: '+1 tipo dado CaC, remove Inconsciente. Depois: Cansado 1t. DT 10' },
    { nome: 'Morfina', custo: 1000, peso: 0.5, descricao: 'Nega 1D4 testes em Morrendo. Depois: Inconsciente. DT 10' },
    { nome: 'Desfibrilador', custo: 1500, peso: 1, descricao: '−1D6×5 da DT de Morrendo. Teste INT DT 15 (falha: inutiliza). DT 10' },
    { nome: 'Esterilizante Medicinal', custo: 1250, peso: 1, descricao: 'Junto a outro item de cura: +1 tipo de dado na cura. DT 10' },
    { nome: 'Analgésico', custo: 1500, peso: 1, descricao: '−1 nível de DT de lesão por 1D6+1t. DT 10' },
    { nome: 'Anestesia', custo: 1250, peso: 1, descricao: 'Ignora dano recebido por 1D4+1t; recebe tudo depois (sem lesões). DT 10' },
    { nome: 'Compressor de Ferida', custo: 500, peso: 0.5, descricao: 'Remove condição Sangramento. MED DT 15' },
    { nome: 'Kit de Tratamento', custo: 500, peso: 0.5, descricao: 'Remove condição Envenenado. MED DT 15' },
  ],
  // Amplificadores vivem em `compras.dados` (`AMPLIFICADORES`) — não têm custo/peso de item.
  [ItemCategoriaEnum.AMPLIFICADOR]: [],
  // Fragmentos não são comprados no catálogo: são achados e montados como itens custom
  // (módulo + forma base + stats próprios). Sem itens fixos aqui.
  [ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR]: [],
  [ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR]: [],
};
