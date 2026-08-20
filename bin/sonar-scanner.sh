#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

npm run coverage

sonar-scanner \
  -Dproject.settings="$PROJECT_ROOT/sonar-project.properties" \
  -Dsonar.token="${SONAR_TOKEN:?SONAR_TOKEN environment variable not set}"
