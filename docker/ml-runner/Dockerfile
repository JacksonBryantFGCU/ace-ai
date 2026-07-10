# ACE.AI Machine Learning candidate execution image.
#
# Deterministic, versioned, minimal: pinned Python base + a fixed,
# allowlisted set of packages (requirements.txt), installed at BUILD time
# only. Candidate code never runs pip/conda/etc — the container has no
# network access at run time anyway (see server/scenarios/sandbox), so even
# an attempted install would fail closed.
#
# Runs as a non-root user. The image intentionally contains nothing beyond
# what current + planned Easy/Medium ML scenarios need (pytest, numpy,
# pandas, scikit-learn) — no notebooks, no GPU stack, no extra tooling.
FROM python:3.11.9-slim-bookworm

LABEL org.opencontainers.image.title="ace-ai-ml-runner"
LABEL org.opencontainers.image.description="Isolated candidate execution image for ACE.AI machine-learning interview scenarios"
LABEL ace.ai.sandbox.image="ml-runner"

# No compilers/build tools are installed — numpy/pandas/scikit-learn ship
# manylinux wheels for this base image, so nothing needs to compile from
# source. Keeps the image minimal and removes an entire class of "candidate
# code shells out to a build tool" concerns.
RUN pip install --no-cache-dir --upgrade pip==24.2

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt \
    && rm /tmp/requirements.txt \
    && python -c "import pytest, numpy, pandas, sklearn" \
    && rm -rf /root/.cache

# Fixed, deterministic non-root UID/GID (also passed via `--user` at `docker
# run` time as belt-and-suspenders — the image default matters for anything
# that doesn't explicitly override it, e.g. `docker exec` during debugging).
RUN groupadd --gid 10001 sandbox \
    && useradd --uid 10001 --gid sandbox --no-create-home --shell /usr/sbin/nologin sandbox

# The runtime always bind-mounts the real per-execution workspace over this
# path (see server/scenarios/sandbox/container-sandbox-executor.ts) — this
# mkdir only ensures the mountpoint exists with the right ownership before
# the mount happens, and gives `docker run` a sane default WORKDIR.
RUN mkdir -p /workspace && chown sandbox:sandbox /workspace
WORKDIR /workspace

USER sandbox

# No ENTRYPOINT/CMD — the runtime always passes an explicit command
# (`python main.py` / `python -m pytest ...`); there is nothing useful to
# run by default, and an implicit default is one more thing to audit.
