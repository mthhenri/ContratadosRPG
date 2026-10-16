"""HTTPS only, certificate verification, bounded responses/timeouts and no redirects."""
import json
from urllib.parse import urlencode
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError, URLError
from .core import validate_origin, OfflineError, CredentialError

class ConflitoError(ValueError):
    """409 do servidor: duplicidade ou participante parecido. O usuário revisa e confirma; nada é fundido sozinho."""


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl): return None

class Api:
    def __init__(self, origin: str):
        self.origin = validate_origin(origin)
        self.opener = build_opener(NoRedirect())
    def request(self, path, method="GET", secret=None, data=None, consulta=None):
        if not path.startswith("/transcricao/") or ".." in path or "?" in path or "#" in path:
            raise ValueError("Operação não permitida.")
        if consulta:
            # Só inteiros positivos em chaves simples: nada de texto livre, caminho ou conteúdo na URL.
            if any(not k.isalpha() or isinstance(v, bool) or not isinstance(v, int) or v < 1 for k, v in consulta.items()):
                raise ValueError("Operação não permitida.")
            path = path + "?" + urlencode(consulta)
        headers = {"Content-Type": "application/json"}
        if secret: headers["Authorization"] = "Bearer " + secret
        req = Request(self.origin + path, data=None if data is None else json.dumps(data).encode(), headers=headers, method=method)
        try:
            with self.opener.open(req, timeout=10) as response:
                raw = response.read(65537)
                if len(raw) > 65536: raise ValueError("Resposta excede o limite técnico.")
                envelope = json.loads(raw)
                if not envelope.get("sucesso"): raise ValueError("Operação recusada pelo servidor.")
                return envelope.get("dados")
        except HTTPError as e:
            if e.code == 401: raise CredentialError("Vínculo expirado ou revogado. Vincule novamente.") from None
            if e.code == 404 and path.startswith("/transcricao/aplicativo/abertura"):
                raise ValueError("Abertura indisponível: prazo, conta ou permissão de Mestre.") from None
            if e.code == 404: raise ValueError("Indisponível: confira a permissão de Mestre e se a sessão ainda existe.") from None
            if e.code == 409: raise ConflitoError("Duplicidade ou participante parecido: revise e confirme.") from None
            if e.code == 429: raise ValueError("Muitas solicitações. Aguarde antes de tentar novamente.") from None
            raise ValueError("Servidor recusou a operação. Tente novamente.") from None
        except (URLError, TimeoutError, OSError): raise OfflineError("Sem conexão. Resultados locais foram preservados.") from None
    def start_link(self, digest, name): return self.request("/transcricao/vinculo", "POST", data={"segredoHash": digest, "nome": name})
    def status(self, secret): return self.request("/transcricao/vinculo/estado", secret=secret)
    def resolve(self, intent, secret): return self.request("/transcricao/aplicativo/abertura/" + intent, "POST", secret, {})
    def revoke(self, secret): return self.request("/transcricao/vinculo", "DELETE", secret)

    # --- Importação (task 02): só metadados; WAV, caminho absoluto e hash de áudio nunca entram em nenhum corpo. ---
    def glossario(self, secret, campanha_id): return self.request("/transcricao/aplicativo/glossario", secret=secret, consulta={"campanhaId": campanha_id})
    def identidades(self, secret, campanha_id): return self.request("/transcricao/aplicativo/identidade", secret=secret, consulta={"campanhaId": campanha_id})
    def criar_identidade(self, secret, campanha_id, nome_origem, participante, confirmar_parecido=False):
        corpo = {"campanhaId": campanha_id, "nomeOrigem": nome_origem, "participante": participante}
        if confirmar_parecido: corpo["confirmarParecido"] = True
        return self.request("/transcricao/aplicativo/identidade", "POST", secret, corpo)
    def faixas(self, secret, sessao_id): return self.request(f"/transcricao/aplicativo/sessao/{int(sessao_id)}/faixa", secret=secret)
    def criar_faixa(self, secret, sessao_id, nome_arquivo, participante, deslocamento_ms):
        if not nome_arquivo or any(c in nome_arquivo for c in "\\/:") or nome_arquivo in (".", ".."):
            raise ValueError("Só o nome do arquivo pode ser enviado, nunca o caminho.")
        return self.request(f"/transcricao/aplicativo/sessao/{int(sessao_id)}/faixa", "POST", secret,
            {"nomeArquivo": nome_arquivo, "participante": participante, "deslocamentoMilissegundos": deslocamento_ms})
    def alterar_faixa(self, secret, faixa_id, participante, identidade_confirmada, deslocamento_ms, silencio_ms, confirmar_parecido=False):
        corpo = {"participante": participante, "identidadeConfirmada": identidade_confirmada,
                 "deslocamentoMilissegundos": deslocamento_ms, "silencioInicialMilissegundos": silencio_ms}
        if confirmar_parecido: corpo["confirmarParecido"] = True
        return self.request(f"/transcricao/aplicativo/faixa/{int(faixa_id)}", "PUT", secret, corpo)
