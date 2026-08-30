# Imagem do backend para Google Cloud Run. Build a partir da RAIZ do repositório (não de
# backend/) porque o workspace `shared` é resolvido por symlink do npm workspaces — o mesmo
# motivo que faz o render.yaml usar rootDir vazio. Ver docs/DEPLOY.md para o runbook completo
# (esta imagem substitui o buildCommand/startCommand do Render, migrations à parte — ver
# cloudbuild.yaml).

# ---- build ---------------------------------------------------------------
# Instala os três workspaces (o postinstall compila o shared, do qual o backend depende) e
# compila o backend com `nest build`. Precisa das devDependencies (@nestjs/cli, typescript) —
# por isso NÃO definir NODE_ENV=production nesta etapa (mesma ressalva do render.yaml/DEPLOY.md).
FROM node:22-bookworm-slim AS build
WORKDIR /app

# bcrypt (dependência nativa) tenta usar um binário pré-compilado; python3/make/g++ ficam como
# fallback de compilação caso não haja prebuild pra plataforma alvo. Só existem nesta etapa —
# a imagem final (runtime) não carrega toolchain de build.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY shared shared
COPY backend backend
COPY frontend/package.json frontend/package.json

RUN npm install
RUN npm run build --workspace=backend

# ---- migrator ---------------------------------------------------------------
# Estágio usado só pelo Cloud Build para rodar `db:migrate` (equivalente ao passo que o
# render.yaml encadeia no buildCommand). Reaproveita o `build` com devDependencies intactas —
# o knexfile.ts precisa do ts-node pra ser lido pela CLI do knex.
FROM build AS migrator
CMD ["npm", "run", "db:migrate", "--workspace=backend"]

# ---- runtime ---------------------------------------------------------------
# Imagem final: só o necessário pra rodar `node dist/main` — sem devDependencies, sem código
# fonte do frontend/shared, sem toolchain de build.
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/shared/package.json shared/package.json
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/backend/package.json backend/package.json
COPY --from=build /app/backend/dist backend/dist
# frontend/package.json não é usado em runtime — só existe pra satisfazer a declaração de
# workspaces do package.json raiz, que o `npm prune` abaixo precisa resolver sem erro.
COPY --from=build /app/frontend/package.json frontend/package.json
COPY --from=build /app/node_modules node_modules
RUN npm prune --omit=dev

# Cloud Run injeta a env var PORT (padrão 8080) e espera o processo escutar exatamente nela.
# O backend lê a porta via APP_PORTA (ConfigService, Proibição #10) — configure
# APP_PORTA=8080 no serviço Cloud Run para casar com o valor abaixo.
EXPOSE 8080

CMD ["node", "backend/dist/main.js"]
