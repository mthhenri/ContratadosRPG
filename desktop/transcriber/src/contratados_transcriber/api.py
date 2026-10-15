"""HTTPS only, certificate verification, bounded responses/timeouts and no redirects."""
import json
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError, URLError
from .core import validate_origin, OfflineError, CredentialError

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl): return None

class Api:
    def __init__(self, origin: str):
        self.origin = validate_origin(origin)
        self.opener = build_opener(NoRedirect())
    def request(self, path, method="GET", secret=None, data=None):
        if not path.startswith("/transcricao/") or ".." in path or "?" in path or "#" in path:
            raise ValueError("Operação não permitida.")
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
            if e.code == 404: raise ValueError("Abertura indisponível: prazo, conta ou permissão de Mestre.") from None
            if e.code == 429: raise ValueError("Muitas solicitações. Aguarde antes de tentar novamente.") from None
            raise ValueError("Servidor recusou a operação. Tente novamente.") from None
        except (URLError, TimeoutError, OSError): raise OfflineError("Sem conexão. Resultados locais foram preservados.") from None
    def start_link(self, digest, name): return self.request("/transcricao/vinculo", "POST", data={"segredoHash": digest, "nome": name})
    def status(self, secret): return self.request("/transcricao/vinculo/estado", secret=secret)
    def resolve(self, intent, secret): return self.request("/transcricao/aplicativo/abertura/" + intent, "POST", secret, {})
    def revoke(self, secret): return self.request("/transcricao/vinculo", "DELETE", secret)
