#!/bin/bash
# Mints a just-in-time runner config before each runner container starts. Runs on
# the control plane as keepbreath3, from ExecStartPre in runner.container, so it
# is outside the job container entirely.
#
# Why this exists: the earlier design mounted the long-lived registration
# credential into the runner container as a Podman secret. The entrypoint read
# it and unset the variable, but the file stayed mounted at /run/secrets/ for the
# life of the container, and the job runs in that container. A workflow step
# could read a repository-admin token. Now the credential is read here, on the
# host, and never enters a container.
#
# What the container gets instead is a JIT config: a registration that GitHub
# allows to run exactly one job before removing the runner. A job that reads
# /run/secrets/ finds a config that was spent the moment the job started.
set -euo pipefail

REPO=sh4i-yurei/keepbreathing

# The credential comes straight out of the secret store and goes to curl on
# stdin as a header, so it appears neither on disk nor in the process list.
PAT=$(podman secret inspect --showsecret -f '{{.SecretData}}' runner-registration-token)

CONFIG=$(printf 'Authorization: Bearer %s\n' "${PAT}" | curl -sS --fail-with-body -X POST \
  -H @- \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/${REPO}/actions/runners/generate-jitconfig" \
  -d '{"name":"control","runner_group_id":1,"labels":["self-hosted","Linux","X64","keepbreathing"]}' \
  | jq -r .encoded_jit_config)
unset PAT

if [ -z "${CONFIG}" ] || [ "${CONFIG}" = "null" ]; then
  echo "runner-jitconfig: GitHub returned no encoded_jit_config" >&2
  exit 1
fi

# Replaced on every start: each config is single-use, so the previous one is
# already spent by the time this runs again.
printf '%s' "${CONFIG}" | podman secret create --replace runner-jitconfig -
echo "runner-jitconfig: minted a new config for runner 'control'"
