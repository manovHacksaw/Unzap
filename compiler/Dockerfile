FROM debian:bookworm-slim

# ── System deps ───────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    git \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# ── Scarb (Cairo compiler + package manager) ──────────────────────────────────
ARG SCARB_VERSION=2.9.2
RUN apt-get update && apt-get install -y bash && rm -rf /var/lib/apt/lists/*
RUN curl --proto '=https' --tlsv1.2 -sSf \
    https://docs.swmansion.com/scarb/install.sh | bash -s -- -v ${SCARB_VERSION}
ENV PATH="/root/.local/bin:$PATH"

# ── Bun (JS runtime — runs server.ts directly, no build step) ────────────────
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# ── App ───────────────────────────────────────────────────────────────────────
WORKDIR /app
COPY server.ts .

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

CMD ["bun", "run", "server.ts"]
