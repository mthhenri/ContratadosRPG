import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import type {
  DocumentoAlteradoDto,
  DocumentoImagemAlteradaDto,
  DocumentoRecuperadoDto,
} from '@contratados-rpg/shared/dtos/documento';
import { TipoDocumentoEnum } from '@contratados-rpg/shared/enums';
import type { StandardResponse } from '@contratados-rpg/shared/interfaces';
import {
  DOCUMENTO_CONTEUDO_MAXIMO,
  DOCUMENTO_IMAGEM_MIMES_PERMITIDOS,
  DOCUMENTO_IMAGEM_TAMANHO_MAXIMO_BYTES,
  DOCUMENTO_TITULO_MAXIMO,
} from '@contratados-rpg/shared/validators';

import {
  normalizarMarkdownImportado,
  possuiFrontMatterYaml,
  validarArquivoMarkdown,
  type FalhaImportacaoMarkdown,
} from '../../../../shared/markdown/importar-markdown';
import { Icone } from '../../../../shared/icone/icone.component';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Campo } from '../../../../shared/ui/campo/campo.component';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { EditorMarkdown } from '../../../../shared/ui/editor-markdown/editor-markdown.component';
import { NotificacaoService } from '../../../../shared/ui/notificacao/notificacao.service';
import { DocumentoService } from '../../documento.service';
import { LeitorDocumento } from '../leitor-documento/leitor-documento.component';

/** O teto do upload em MB, para as mensagens — derivado da constante de `shared`, não repetido. */
const TAMANHO_MAXIMO_IMAGEM_MB = DOCUMENTO_IMAGEM_TAMANHO_MAXIMO_BYTES / (1024 * 1024);

/**
 * O Milkdown sempre serializa terminando em `\n`; texto gravado por fora do editor não tem a
 * quebra. Comparar sem ela evita "Descartar alterações?" e versão nova sem mudança real (P-091).
 */
function semQuebraFinal(texto: string): string {
  return texto.replace(/\n+$/, '');
}

/**
 * Edição de um documento no próprio lugar (m9-04, extraída da `BibliotecaMestre` na m9-13) — a
 * mesma na página do mestre e no painel flutuante: título, texto (editor Markdown e importação) ou
 * imagem (escolher/trocar, com a validação de `shared`), o aviso de conflito 409 e o rodapé
 * Cancelar/Salvar. O host **é** o `.biblioteca__edicao`.
 *
 * Nasce da versão do `documento` de onde a edição partiu e guarda o rascunho sozinho; quem monta é
 * dono do documento aberto e da lista, e só adota o que sai daqui: {@link salvo} (a versão salva —
 * quem monta fecha a edição), {@link imagemEnviada} (a imagem e a versão novas, sem sair da
 * edição), {@link versaoRecarregada} ("Recarregar" do conflito) e {@link encerrada} (Cancelar, ou
 * Salvar sem mudança). Trocar o `documento` depois da criação não mexe no rascunho — só a versão
 * otimista de `updatedDate` avança com ele (a do upload, por exemplo).
 *
 * **Salvar explícito, sem autosave:** com o documento revelado, cada digitação salva chegaria à
 * mesa. Salvar e o rascunho leem o texto do editor **agora** (`confirmarValor()`, P-081).
 */
@Component({
  selector: 'app-documento-edicao',
  imports: [ReactiveFormsModule, Icone, Botao, Campo, EditorMarkdown, LeitorDocumento],
  templateUrl: './documento-edicao.component.html',
  styleUrl: './documento-edicao.component.scss',
  host: {
    class: 'biblioteca__edicao',
    '[class.biblioteca__edicao--editor-focado]': 'editorFocado()',
    '[class.biblioteca__edicao--painel]': 'emPainel()',
  },
})
export class DocumentoEdicao implements OnInit {
  private readonly documentoService = inject(DocumentoService);
  private readonly confirmacaoService = inject(ConfirmacaoService);
  private readonly notificacaoService = inject(NotificacaoService);
  private readonly destroyRef = inject(DestroyRef);

  /** O documento aberto — a versão de onde a edição parte, e depois a que o upload devolveu. */
  readonly documento = input.required<DocumentoRecuperadoDto>();
  /**
   * Dentro do painel flutuante (m9-13): o editor ocupa a altura que sobra na janela, e o rodapé
   * Cancelar/Salvar fica à vista sem rolar — na página, o editor tem a altura própria de sempre.
   */
  readonly emPainel = input(false);

  readonly salvo = output<DocumentoAlteradoDto>();
  readonly imagemEnviada = output<DocumentoImagemAlteradaDto>();
  readonly versaoRecarregada = output<DocumentoRecuperadoDto>();
  readonly encerrada = output<void>();

  protected readonly tituloMaximo = DOCUMENTO_TITULO_MAXIMO;
  protected readonly conteudoMaximo = DOCUMENTO_CONTEUDO_MAXIMO;
  protected readonly mimesAceitos = DOCUMENTO_IMAGEM_MIMES_PERMITIDOS.join(',');
  protected readonly tamanhoMaximoImagemMb = TAMANHO_MAXIMO_IMAGEM_MB;

  protected readonly tituloEdicao = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(DOCUMENTO_TITULO_MAXIMO)],
  });
  /** Espelho do título em edição, para o contador e o erro. */
  protected readonly tituloEditado = signal('');
  /** O rascunho do texto como o editor o propagou (debounced — ver `confirmarValor()`). */
  protected readonly conteudoEdicao = signal('');
  /**
   * No mobile, com o editor focado, a barra dele vira `position: fixed` sobre o rodapé
   * Cancelar/Salvar, que vem depois do editor no fluxo. Reserva o espaço da barra para ele
   * continuar alcançável (m9-06).
   */
  protected readonly editorFocado = signal(false);
  /** O salvar voltou 409: outra sessão alterou o documento depois que a edição começou. */
  protected readonly conflito = signal(false);
  protected readonly salvando = signal(false);
  protected readonly erroImagem = signal<string | null>(null);
  protected readonly enviandoImagem = signal(false);
  protected readonly avisoImportacao = signal<{ texto: string; erro: boolean } | null>(null);
  protected readonly importandoMarkdown = signal(false);
  /** Invalida uma leitura local pendente ao reiniciar ou destruir a edição. */
  private sequenciaEdicao = 0;

  private readonly editor = viewChild<EditorMarkdown>('editor');

  protected readonly ehTexto = computed(() => this.documento().tipo === TipoDocumentoEnum.TEXTO);
  protected readonly erroTitulo = computed(() =>
    !this.tituloEditado().trim() ? 'Dê um título ao documento.' : '',
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.sequenciaEdicao++);
    this.tituloEdicao.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((titulo) => this.tituloEditado.set(titulo));
  }

  ngOnInit(): void {
    this.iniciar(this.documento());
  }

  /**
   * Há algo diferente do salvo? Lê o texto do editor **agora** (`confirmarValor()`) — o
   * `valorChange` é debounced e perderia as últimas teclas (P-081).
   */
  haRascunho(): boolean {
    const documento = this.documento();
    const titulo = this.tituloEdicao.value;
    const conteudo = this.editor()?.confirmarValor() ?? this.conteudoEdicao();
    return (
      titulo !== documento.titulo ||
      (documento.tipo === TipoDocumentoEnum.TEXTO &&
        semQuebraFinal(conteudo) !== semQuebraFinal(documento.conteudoMarkdown ?? ''))
    );
  }

  /** "Descartar alterações?" — só pergunta quando há mesmo o que perder. */
  async confirmarDescarte(): Promise<boolean> {
    if (!this.haRascunho()) {
      return true;
    }
    const titulo = this.documento().titulo;
    return this.confirmacaoService.confirmar({
      titulo: 'Descartar alterações?',
      mensagem: `As alterações em ${titulo} ainda não foram salvas.`,
      entidade: titulo,
      rotuloConfirmar: 'Descartar',
      rotuloCancelar: 'Continuar editando',
    });
  }

  protected async cancelar(): Promise<void> {
    if (await this.confirmarDescarte()) {
      this.encerrada.emit();
    }
  }

  protected salvar(): void {
    const documento = this.documento();
    if (this.salvando() || this.conflito()) {
      return;
    }
    const titulo = this.tituloEdicao.value.trim();
    const conteudoMarkdown =
      documento.tipo === TipoDocumentoEnum.TEXTO
        ? (this.editor()?.confirmarValor() ?? this.conteudoEdicao())
        : null;
    if (!titulo || this.tituloEdicao.invalid) {
      return;
    }
    if (
      titulo === documento.titulo &&
      semQuebraFinal(conteudoMarkdown ?? '') === semQuebraFinal(documento.conteudoMarkdown ?? '')
    ) {
      this.encerrada.emit();
      return;
    }
    this.salvando.set(true);
    this.documentoService
      .alterar({ id: documento.id, titulo, conteudoMarkdown, updatedDate: documento.updatedDate })
      .pipe(
        finalize(() => this.salvando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (alterado) => {
          this.notificacaoService.notificar({
            severidade: 'sucesso',
            resumo: 'Documento salvo',
            detalhe: alterado.revelado
              ? `${alterado.titulo} — a mesa já vê esta versão.`
              : alterado.titulo,
          });
          this.salvo.emit(alterado);
        },
        error: (erro: unknown) => {
          if (erro instanceof HttpErrorResponse && erro.status === HttpStatusCode.Conflict) {
            this.conflito.set(true);
          }
        },
      });
  }

  /**
   * "Recarregar" do aviso de conflito — o mestre pediu: traz a versão atual e reabre a edição sobre
   * ela, descartando o rascunho.
   */
  protected recarregarVersao(): void {
    this.documentoService
      .recuperar(this.documento().id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (documento) => {
          this.versaoRecarregada.emit(documento);
          this.iniciar(documento);
        },
      });
  }

  /** Importa somente texto local para o rascunho; persistência continua exclusiva de Salvar. */
  protected async aoSelecionarMarkdown(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0] ?? null;
    entrada.value = '';
    if (!arquivo || !this.ehTexto() || this.importandoMarkdown()) return;
    const sequencia = this.sequenciaEdicao;
    this.avisoImportacao.set(null);
    const falhaArquivo = validarArquivoMarkdown(arquivo, DOCUMENTO_CONTEUDO_MAXIMO);
    if (falhaArquivo) {
      this.definirFalhaImportacao(falhaArquivo);
      return;
    }
    this.importandoMarkdown.set(true);
    try {
      const texto = await arquivo.text();
      if (sequencia !== this.sequenciaEdicao) return;
      const conteudoMarkdown = normalizarMarkdownImportado(texto);
      const falhaConteudo = validarArquivoMarkdown(
        arquivo,
        DOCUMENTO_CONTEUDO_MAXIMO,
        conteudoMarkdown,
      );
      if (falhaConteudo) {
        this.definirFalhaImportacao(falhaConteudo);
        return;
      }
      const conteudoAtual = this.editor()?.confirmarValor() ?? this.conteudoEdicao();
      if (conteudoAtual.trim()) {
        const confirmado = await this.confirmacaoService.confirmar({
          titulo: 'Substituir o conteúdo?',
          mensagem:
            'O texto atual do documento será trocado pelo conteúdo do arquivo. Nada é salvo até clicar em Salvar.',
          rotuloConfirmar: 'Substituir',
          rotuloCancelar: 'Cancelar',
        });
        if (!confirmado || sequencia !== this.sequenciaEdicao) return;
      }
      this.conteudoEdicao.set(conteudoMarkdown);
      this.avisoImportacao.set({
        texto: `Importado de "${arquivo.name}".${possuiFrontMatterYaml(texto) ? ' Front matter removido.' : ''} Salve para gravar.`,
        erro: false,
      });
    } catch {
      if (sequencia === this.sequenciaEdicao) {
        this.avisoImportacao.set({
          texto: 'Não foi possível ler o arquivo. Tente novamente.',
          erro: true,
        });
      }
    } finally {
      if (sequencia === this.sequenciaEdicao) this.importandoMarkdown.set(false);
    }
  }

  /** Arquivo escolhido: valida tipo e tamanho aqui (constantes de `shared`) antes de enviar. */
  protected aoSelecionarImagem(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0] ?? null;
    entrada.value = '';
    if (!arquivo || this.enviandoImagem()) {
      return;
    }
    if (!DOCUMENTO_IMAGEM_MIMES_PERMITIDOS.includes(arquivo.type)) {
      this.erroImagem.set('Formato inválido: use JPEG, PNG ou WEBP.');
      return;
    }
    if (arquivo.size > DOCUMENTO_IMAGEM_TAMANHO_MAXIMO_BYTES) {
      this.erroImagem.set(`Imagem maior que o limite permitido (${TAMANHO_MAXIMO_IMAGEM_MB} MB).`);
      return;
    }
    this.erroImagem.set(null);
    this.enviandoImagem.set(true);
    this.documentoService
      .enviarImagem(this.documento().id, arquivo)
      .pipe(
        finalize(() => this.enviandoImagem.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (resposta) => this.imagemEnviada.emit(resposta),
        error: (erro: unknown) => {
          const resposta =
            erro instanceof HttpErrorResponse ? (erro.error as StandardResponse | null) : null;
          this.erroImagem.set(resposta?.mensagem ?? 'Não foi possível enviar a imagem.');
        },
      });
  }

  private iniciar(documento: DocumentoRecuperadoDto): void {
    this.sequenciaEdicao++;
    this.avisoImportacao.set(null);
    this.importandoMarkdown.set(false);
    this.tituloEdicao.reset(documento.titulo);
    this.tituloEditado.set(documento.titulo);
    this.conteudoEdicao.set(documento.conteudoMarkdown ?? '');
    this.conflito.set(false);
    this.erroImagem.set(null);
    this.editorFocado.set(false);
  }

  private definirFalhaImportacao(falha: FalhaImportacaoMarkdown): void {
    const textos = {
      EXTENSAO: 'Formato inválido: envie um arquivo .md',
      TAMANHO: `Arquivo maior que o limite do documento (${DOCUMENTO_CONTEUDO_MAXIMO.toLocaleString('pt-BR')} caracteres)`,
      VAZIO: 'O arquivo não tem conteúdo',
    } as const;
    this.avisoImportacao.set({ texto: textos[falha], erro: true });
  }
}
