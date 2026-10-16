"""Sessão de importação (task 02): lote de WAVs, sugestão e confirmação de identidade, offset manual e registro SÓ de metadados.

Regras que este módulo garante:
- WAV, caminho absoluto e hash de áudio nunca entram em nenhuma requisição (só nome do arquivo e metadados confirmados);
- sugestão não é confirmação, e nada se funde sozinho (participante parecido pede confirmação explícita);
- o silêncio inicial é só medido: o offset é sempre manual;
- o estado local (que guarda caminhos, por isso é local) fica na pasta da conta e nunca é enviado.
"""
import json
import os
from dataclasses import dataclass
from pathlib import Path

from .api import ConflitoError
from .core import OfflineError
from .regras_transcricao import (_inteiro_seguro, candidatos_nome_origem, detectar_duplicidade, localizar_participante_parecido,
                                  montar_pacote_trabalho, normalizar_rotulo, participantes_sem_faixa, sugerir_identidade,
                                  validar_participante)
from .wav import InfoWav, WavInvalido, calcular_hash, inspecionar_wav

VERSAO_ESTADO = 1


class ParecidoError(ValueError):
    """O participante informado é parecido (só caixa/acento) com outro já conhecido: confirme que são pessoas diferentes."""

    def __init__(self, parecido: str):
        super().__init__(f'Já existe o participante "{parecido}", parecido com este. Confirme se são pessoas diferentes.')
        self.parecido = parecido


@dataclass
class FaixaImportada:
    caminho: Path
    nome_arquivo: str
    info: InfoWav | None
    erro: str | None
    codigo_erro: str | None
    sugestao: dict
    participante: str | None
    nome_origem: str
    confirmada: bool = False
    deslocamento_ms: int = 0
    faixa_id: int | None = None
    faixa_identificador: str | None = None
    sincronizada: bool = False
    hash: str | None = None
    parecido_confirmado: bool = False
    avisos: tuple = ()


class Importacao:
    def __init__(self, contexto: dict, associacoes: list[dict], *, participantes_esperados: list[str] | None = None,
                 participantes_conhecidos: list[str] | None = None):
        self.contexto = contexto
        self.associacoes = [dict(a) for a in associacoes]
        self.participantes_esperados = list(participantes_esperados or [])
        self.participantes_conhecidos = list(participantes_conhecidos or [])
        self.faixas: list[FaixaImportada] = []

    # --- lote -----------------------------------------------------------
    def _nova_faixa(self, caminho: Path) -> FaixaImportada:
        caminho = Path(caminho)
        sugestao = sugerir_identidade(caminho.name, self.associacoes)
        origem = candidatos_nome_origem(caminho.name)
        try:
            info, erro, codigo = inspecionar_wav(caminho), None, None
        except WavInvalido as falha:
            info, erro, codigo = None, str(falha), falha.codigo
        proposto = sugestao["participante"] if (info is not None and sugestao["origem"] == "ASSOCIACAO") else None
        return FaixaImportada(caminho, caminho.name, info, erro, codigo, sugestao, proposto, origem[-1] if origem else caminho.stem,
                              avisos=info.avisos if info else ())

    def adicionar(self, caminhos: list[Path]) -> None:
        """Um arquivo ruim vira uma faixa com erro isolado; o resto do lote segue normalmente."""
        self.faixas.extend(self._nova_faixa(c) for c in caminhos)

    def remover(self, indice: int) -> None:
        del self.faixas[indice]

    def _validas(self) -> list[tuple[int, FaixaImportada]]:
        return [(i, f) for i, f in enumerate(self.faixas) if f.info is not None]

    def alertas_duplicidade(self) -> list[dict]:
        validas = self._validas()
        arquivos = [{"nomeArquivo": f.nome_arquivo, "tamanhoBytes": f.info.tamanho_bytes, "duracaoMilissegundos": f.info.duracao_ms}
                    for _, f in validas]
        return [{"tipo": a["tipo"], "indices": [validas[i][0] for i in a["indices"]]} for a in detectar_duplicidade(arquivos)]

    def participantes_faltantes(self) -> list[str]:
        return participantes_sem_faixa(self.participantes_esperados, [f.participante for f in self.faixas if f.confirmada and f.participante])

    # --- confirmação e offset ------------------------------------------
    def _conhecidos(self, exceto: int) -> list[str]:
        outros = [f.participante for i, f in enumerate(self.faixas) if i != exceto and f.confirmada and f.participante]
        return [*self.participantes_conhecidos, *(a["participante"] for a in self.associacoes), *outros]

    def confirmar(self, indice: int, participante, *, confirmar_parecido: bool = False) -> None:
        faixa = self.faixas[indice]
        if faixa.info is None:
            raise ValueError(f"{faixa.nome_arquivo}: arquivo com erro não pode ser confirmado.")
        validado = validar_participante(participante)
        if not validado["valido"]:
            raise ValueError("Informe um participante válido (sem quebra de linha nem caracteres invisíveis).")
        valor = validado["valor"]
        parecido = localizar_participante_parecido(valor, self._conhecidos(indice))
        if parecido is not None and not confirmar_parecido:
            raise ParecidoError(parecido)
        if faixa.participante != valor:
            faixa.sincronizada = False
        faixa.participante, faixa.confirmada, faixa.parecido_confirmado = valor, True, parecido is not None
        try:
            faixa.hash = calcular_hash(faixa.caminho)  # só local: detecta arquivo alterado depois
        except WavInvalido:
            faixa.hash = None

    def rejeitar_sugestao(self, indice: int) -> None:
        faixa = self.faixas[indice]
        faixa.participante, faixa.confirmada, faixa.parecido_confirmado, faixa.sincronizada = None, False, False, False

    def ajustar_offset(self, indice: int, milissegundos) -> None:
        if isinstance(milissegundos, bool) or not isinstance(milissegundos, int) or not _inteiro_seguro(milissegundos):
            raise ValueError("O deslocamento precisa ser um número inteiro de milissegundos.")
        faixa = self.faixas[indice]
        faixa.deslocamento_ms = milissegundos
        faixa.sincronizada = False

    def pode_transcrever(self) -> bool:
        validas = [f for _, f in self._validas()]
        return bool(validas) and all(f.confirmada and f.sincronizada for f in validas)

    # --- registro no servidor (só metadados) -------------------------
    def registrar(self, api, segredo: str, *, salvar_associacoes: bool = True) -> list[dict]:
        """Cria/confirma só as faixas confirmadas. Falha de uma faixa não derruba as outras; sem rede, para e preserva o estado."""
        resumo: list[dict] = []
        for indice, faixa in enumerate(self.faixas):
            if faixa.info is None or not faixa.confirmada:
                continue
            if faixa.sincronizada:
                resumo.append({"indice": indice, "ok": True})
                continue
            try:
                if faixa.faixa_id is None:  # uma faixa já criada nunca é recriada em nova tentativa
                    criada = api.criar_faixa(segredo, self.contexto["sessaoId"], faixa.nome_arquivo, faixa.participante, faixa.deslocamento_ms)
                    faixa.faixa_id, faixa.faixa_identificador = criada["id"], criada["identificador"]
                api.alterar_faixa(segredo, faixa.faixa_id, faixa.participante, True, faixa.deslocamento_ms,
                                  faixa.info.silencio_inicial_ms, confirmar_parecido=faixa.parecido_confirmado)
                faixa.sincronizada = True
                if salvar_associacoes:
                    self._salvar_associacao(api, segredo, faixa)
                resumo.append({"indice": indice, "ok": True})
            except OfflineError:
                raise
            except ValueError as erro:
                resumo.append({"indice": indice, "ok": False, "erro": str(erro)})
        return resumo

    def _salvar_associacao(self, api, segredo: str, faixa: FaixaImportada) -> None:
        sugerido = faixa.sugestao["participante"]
        if faixa.sugestao["origem"] == "ASSOCIACAO" and sugerido is not None and normalizar_rotulo(sugerido) == faixa.participante:
            return  # a associação já existe e já aponta para esta pessoa
        try:
            api.criar_identidade(segredo, self.contexto["campanhaId"], faixa.nome_origem, faixa.participante,
                                 confirmar_parecido=faixa.parecido_confirmado)
        except ConflitoError:
            return  # nome de origem já associado (ou parecido não confirmado): o Mestre ajusta pelo site
        self.associacoes.append({"nomeOrigem": faixa.nome_origem, "participante": faixa.participante})

    # --- contrato do motor ---------------------------------------------
    def pacote_trabalho(self, termos_glossario: list[str], idioma: str, *, glossario_por_campanha: list[dict] | None = None) -> dict:
        """O glossário vem sempre da campanha desta sessão; o que for de outra campanha faz o pacote ser recusado."""
        glossario = [{"campanhaId": self.contexto["campanhaId"], "termo": t} for t in termos_glossario]
        glossario += list(glossario_por_campanha or [])
        faixas = [{
            "identificador": f.faixa_identificador, "nomeArquivo": f.nome_arquivo, "participante": f.participante or "",
            "identidadeConfirmada": bool(f.confirmada and f.sincronizada), "deslocamentoMilissegundos": f.deslocamento_ms,
            "silencioInicialMilissegundos": f.info.silencio_inicial_ms,
        } for _, f in self._validas()]
        return montar_pacote_trabalho({"campanhaId": self.contexto["campanhaId"], "sessaoId": self.contexto["sessaoId"],
                                       "idioma": idioma, "glossario": glossario, "faixas": faixas})

    # --- persistência local, por conta ------------------------------------
    def _arquivo(self, pasta: Path) -> Path:
        return Path(pasta) / f"importacao-{self.contexto['sessaoId']}.json"

    def salvar(self, pasta: Path) -> None:
        """Estado local (inclui caminhos, por isso NUNCA é enviado). A pasta é a da conta: cada conta tem a sua."""
        destino = self._arquivo(pasta)
        destino.parent.mkdir(parents=True, exist_ok=True)
        estado = {"versao": VERSAO_ESTADO, "sessaoId": self.contexto["sessaoId"], "faixas": [{
            "caminho": str(f.caminho), "participante": f.participante, "confirmada": f.confirmada, "deslocamento_ms": f.deslocamento_ms,
            "nome_origem": f.nome_origem, "faixa_id": f.faixa_id, "faixa_identificador": f.faixa_identificador,
            "sincronizada": f.sincronizada, "hash": f.hash, "parecido_confirmado": f.parecido_confirmado,
        } for f in self.faixas]}
        temporario = destino.with_suffix(".tmp")
        temporario.write_text(json.dumps(estado, ensure_ascii=False), encoding="utf-8")
        os.replace(temporario, destino)

    @classmethod
    def carregar(cls, pasta: Path, contexto: dict, associacoes: list[dict], **extra) -> "Importacao":
        importacao = cls(contexto, associacoes, **extra)
        try:
            estado = json.loads(importacao._arquivo(pasta).read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return importacao
        if not isinstance(estado, dict) or estado.get("versao") != VERSAO_ESTADO or estado.get("sessaoId") != contexto["sessaoId"]:
            return importacao
        for salvo in estado.get("faixas", []):
            faixa = importacao._nova_faixa(Path(salvo["caminho"]))
            faixa.participante = salvo.get("participante") or faixa.participante
            faixa.deslocamento_ms = salvo.get("deslocamento_ms", 0)
            faixa.faixa_id, faixa.faixa_identificador = salvo.get("faixa_id"), salvo.get("faixa_identificador")
            faixa.sincronizada = bool(salvo.get("sincronizada"))
            faixa.parecido_confirmado = bool(salvo.get("parecido_confirmado"))
            faixa.confirmada, faixa.hash = bool(salvo.get("confirmada")), salvo.get("hash")
            if faixa.confirmada and faixa.info is not None and faixa.hash is not None:
                try:
                    alterado = calcular_hash(faixa.caminho) != faixa.hash
                except WavInvalido:
                    alterado = True
                if alterado:  # arquivo mudou no disco depois da confirmação: pede confirmação de novo
                    faixa.confirmada, faixa.sincronizada, faixa.hash = False, False, None
                    faixa.avisos = (*faixa.avisos, "ARQUIVO_ALTERADO")
            importacao.faixas.append(faixa)
        return importacao


def preparar_importacao(sessao) -> Importacao:
    """Abre a importação da sessão autorizada pela intenção: lê do servidor as associações e os participantes e retoma o estado local da conta."""
    contexto = sessao.context
    if not contexto:
        raise ValueError("Abra uma sessão pelo site antes de importar.")
    segredo = sessao.credencial()
    associacoes = sessao.api.identidades(segredo, contexto["campanhaId"])
    conhecidos = [faixa["participante"] for faixa in sessao.api.faixas(segredo, contexto["sessaoId"])]
    esperados = sorted({a["participante"] for a in associacoes})
    return Importacao.carregar(sessao.pasta_da_conta(), contexto, associacoes, participantes_esperados=esperados,
                               participantes_conhecidos=conhecidos)


def obter_glossario(sessao) -> list[str]:
    """Termos do glossário da campanha DESTA sessão (o servidor só entrega o glossário do Mestre atual dela)."""
    contexto = sessao.context
    if not contexto:
        raise ValueError("Abra uma sessão pelo site antes de importar.")
    return [t["termo"] for t in sessao.api.glossario(sessao.credencial(), contexto["campanhaId"])]
