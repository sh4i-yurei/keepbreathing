#!/bin/bash
# Entrypoint for the ephemeral runner container. Trades the long-lived
# registration credential (a Podman secret) for a one-hour registration token,
# registers as an ephemeral runner, and runs until one job completes. The
# container exits after that job and Quadlet starts a fresh one.
set -euo pipefail

REPO=sh4i-yurei/keepbreathing

# The Authorization header is fed to curl on stdin rather than as an argument,
# so the credential never appears in the process list.
PAT=$(cat /run/secrets/runner-registration-token)
TOKEN=$(printf 'Authorization: Bearer %s\n' "${PAT}" | curl -sS -X POST \
  -H @- \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/${REPO}/actions/runners/registration-token" \
  | jq -r .token)
unset PAT

cd /home/runner
./config.sh --unattended --ephemeral --replace \
  --url "https://github.com/${REPO}" \
  --token "${TOKEN}" \
  --name control \
  --labels keepbreathing

exec ./run.sh
