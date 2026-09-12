#!/bin/bash
# Entrypoint for the runner container. Starts the runner with the just-in-time
# config that runner-jitconfig.sh minted on the host before this container came
# up. The config registers a runner that GitHub allows to run exactly one job and
# then removes, so the container exits after that job and Quadlet starts a fresh
# one, which gets a fresh config.
#
# Nothing long-lived is in this container. The only secret mounted is the JIT
# config, and it is spent the moment the job starts.
set -euo pipefail

cd /home/runner
exec ./run.sh --jitconfig "$(cat /run/secrets/runner-jitconfig)"
