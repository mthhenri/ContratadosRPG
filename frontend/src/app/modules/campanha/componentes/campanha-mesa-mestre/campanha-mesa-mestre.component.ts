import { Component, computed, input, output } from '@angular/core';
import type { CenaDocumentoResumoDto } from '@contratados-rpg/shared/dtos/cena';
import type { DocumentoResumoDto } from '@contratados-rpg/shared/dtos/documento';
import type { PaginaCadernoResumoDto } from '@contratados-rpg/shared/dtos/pagina-caderno';

import { Icone } from '../../../../shared/icone/icone.component';
import { rotuloRelativo } from '../../../../shared/rotulo-relativo.util';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Chip, type ChipSeveridade } from '../../../../shared/ui/chip/chip.component';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import type { EstadoBlocoMesa } from '../../paginas/detalhe-mestre/campanha-mesa-mestre.service';

/** Uma linha do bloco Documentos, já com o estado que a mesa mostra. */
interface LinhaDocumento {
  readonly id: number;
  readonly titulo: string;
  readonly estado: string;
  readonly severidade: ChipSeveridade | undefined;
  readonly emFoco: boolean;
}

/**
 * Blocos "Documentos" e "Caderno · última editada" da mesa do mestre na campanha (ui-45). Só
 * apresenta: o dado vem de `CampanhaMesaMestreService`; abrir a Biblioteca ou uma página do Caderno
 * sai como evento para a página, que é dona dos painéis flutuantes. Caixa na receita do painel
 * lateral da própria página (`--surface`, borda, raio de cartão) e cabeçalho de seção no padrão
 * "título mono + régua" da página.
 */
@Component({
  selector: 'app-campanha-mesa-mestre',
  imports: [Botao, Chip, Esqueleto, EstadoVazio, Icone],
  templateUrl: './campanha-mesa-mestre.component.html',
  styleUrl: './campanha-mesa-mestre.component.scss',
})
export class CampanhaMesaMestre {
  /** Há Investigação ativa: o bloco lista os documentos dela; senão, os últimos revelados. */
  readonly comInvestigacao = input(false);
  readonly documentosCena = input<readonly CenaDocumentoResumoDto[]>([]);
  readonly revelados = input<readonly DocumentoResumoDto[]>([]);
  readonly estadoDocumentos = input<EstadoBlocoMesa>('CARREGANDO');

  readonly pagina = input<PaginaCadernoResumoDto | null>(null);
  readonly trecho = input<string | null>(null);
  readonly estadoCaderno = input<EstadoBlocoMesa>('CARREGANDO');
  /** Relógio da página (ms) — recomputa o "editada há…". */
  readonly agora = input(Date.now());

  readonly abrirBiblioteca = output<void>();
  readonly abrirPagina = output<number>();
  readonly novaPagina = output<void>();

  protected readonly tituloDocumentos = computed(() =>
    this.comInvestigacao() ? 'Documentos da cena' : 'Revelados na Biblioteca',
  );

  protected readonly linhas = computed<readonly LinhaDocumento[]>(() =>
    this.comInvestigacao()
      ? this.documentosCena().map((documento) => ({
          id: documento.documentoId,
          titulo: documento.titulo,
          estado: documento.emFoco ? 'Em foco' : documento.revelado ? 'Revelado' : 'Oculto',
          severidade: documento.emFoco ? 'primario' : documento.revelado ? 'sucesso' : undefined,
          emFoco: documento.emFoco,
        }))
      : this.revelados().map((documento) => ({
          id: documento.id,
          titulo: documento.titulo,
          estado: 'Revelado',
          severidade: 'sucesso',
          emFoco: false,
        })),
  );

  protected readonly editadaHa = computed(() => {
    const pagina = this.pagina();
    return pagina ? rotuloRelativo(Date.parse(pagina.updatedDate), this.agora()) : null;
  });
}
