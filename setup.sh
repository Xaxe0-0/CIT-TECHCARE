#!/usr/bin/env bash
# TechCare launcher for macOS and Linux. Run ./setup.sh, or ./setup.sh 1 / ./setup.sh 2.
set -u
cd "$(dirname "$0")"

# Logo colours as 24-bit ANSI: blue #0a68fc and teal #00cacc. Off when not a terminal or NO_COLOR is set.
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  BLUE=$'\e[38;2;10;104;252m' TEAL=$'\e[38;2;0;202;204m' WARN=$'\e[38;2;245;166;35m'
  ERR=$'\e[38;2;235;87;87m' BOLD=$'\e[1m' RESET=$'\e[0m'
else
  BLUE='' TEAL='' WARN='' ERR='' BOLD='' RESET=''
fi
step() { echo "${BLUE}$1${RESET} $2"; }
# Applies any new mysql-upgrade-N.sql after a git pull, so starting never fails with
# "MySQL schema is not at version N". Safe to repeat: it does nothing when up to date.
update_database() {
  node scripts/setup-database.mjs ||
    fail "The database could not be updated. Fix the message above, then try again."
}
warn() { echo "${WARN}$*${RESET}"; }
fail() { echo "${ERR}$*${RESET}"; exit 1; }
# Reinstalling packages while TechCare runs breaks on files the server has open.
running() {
  for port in 3000 3100; do
    if curl -s -o /dev/null "http://127.0.0.1:$port/api/settings"; then echo "$port"; return; fi
  done
}

MODEL=qwen2.5:3b
EMBED_MODEL=nomic-embed-text
if [ -f .env.local ]; then
  value=$(grep -E '^TECHCARE_OLLAMA_MODEL=.+' .env.local | tail -n 1 | cut -d= -f2-)
  [ -n "$value" ] && MODEL=$value
  value=$(grep -E '^TECHCARE_OLLAMA_EMBED_MODEL=.+' .env.local | tail -n 1 | cut -d= -f2-)
  [ -n "$value" ] && EMBED_MODEL=$value
fi

ollama_running() { curl -s -o /dev/null http://127.0.0.1:11434/api/tags; }
start_ollama() {
  command -v ollama >/dev/null 2>&1 || return 0
  ollama_running && return 0
  echo "Starting Ollama..."
  nohup ollama serve >/dev/null 2>&1 &
  for _ in $(seq 1 20); do
    sleep 1
    ollama_running && return 0
  done
  warn "Ollama did not start. The assistant will use built-in help only."
}

start_app() {
  if [ ! -d node_modules/@next/env ] || [ ! -f .env.local ]; then
    fail "TechCare is not set up yet. Run ./setup.sh 2 first."
  fi
  update_database
  start_ollama
  echo
  echo "${TEAL}Starting TechCare.${RESET} Open ${BLUE}http://127.0.0.1:3000${RESET} in your browser when it says Ready."
  echo "Press Ctrl+C to stop."
  exec npm run dev
}

setup_all() {
  if ! command -v node >/dev/null 2>&1 || [ "$(node -p "process.versions.node.split('.')[0]")" -lt 24 ]; then
    fail "Node.js 24 or later is required. Install it from https://nodejs.org/ and run setup again."
  fi
  port=$(running)
  if [ -n "$port" ]; then
    fail "TechCare is running on port $port. Stop it first with Ctrl+C in its window, then run ./setup.sh 2 again."
  fi

  step "[1/5]" "Installing dependencies..."
  npm ci || fail "Installing dependencies failed. Close anything using this folder and run ./setup.sh 2 again."

  echo
  step "[2/5]" "Creating local settings..."
  if [ -f .env.local ]; then
    echo "Kept your existing .env.local."
  else
    cp .env.example .env.local
    echo "Created .env.local from .env.example."
  fi

  echo
  step "[3/5]" "Preparing the database..."
  db_ready=1
  if ! node scripts/setup-database.mjs; then
    db_ready=0
    warn "The database is not ready yet. Fix the message above, then run ./setup.sh 2 again."
  fi

  echo
  step "[4/5]" "Setting up the local AI assistant..."
  if ! command -v ollama >/dev/null 2>&1; then
    echo "Ollama is not installed. Installing it..."
    case "$(uname -s)" in
      Linux) curl -fsSL https://ollama.com/install.sh | sh ;;
      Darwin)
        if command -v brew >/dev/null 2>&1; then brew install ollama; fi ;;
    esac
  fi
  if command -v ollama >/dev/null 2>&1; then
    start_ollama
    echo "Downloading the AI models. The first download is about 2 GB and can take a while..."
    ollama pull "$MODEL"
    ollama pull "$EMBED_MODEL"
  else
    warn "Ollama could not be installed automatically. Download it from https://ollama.com/download,"
    warn "then run ./setup.sh 2 again. Until then the assistant uses built-in help only."
  fi

  echo
  step "[5/5]" "Administrator account"
  read -r -p "Create an administrator account now? [y/N]: " make_admin
  case "$make_admin" in [yY]*) npm run create-admin ;; esac

  echo
  if [ "$db_ready" = 0 ]; then
    fail "Setup finished, but the database still needs attention. See the message above."
  fi
  echo "${TEAL}Setup finished.${RESET}"
  read -r -p "Start TechCare now? [Y/n]: " start_now
  case "$start_now" in [nN]*) exit 0 ;; esac
  start_app
}

share_online() {
  if [ ! -d node_modules/@next/env ]; then
    fail "TechCare is not set up yet. Run ./setup.sh 2 first."
  fi
  if curl -s -o /dev/null http://127.0.0.1:3100/api/settings; then
    echo "${TEAL}TechCare is already being shared from this computer.${RESET} Stop that window first to restart it."
    exit 0
  fi
  echo
  step "[1/5]" "Updating the database and checking the sharing settings..."
  update_database
  node scripts/setup-sharing.mjs || exit 1
  origin=$(grep -E '^TECHCARE_ORIGIN=' .env.production.local | tail -n 1 | cut -d= -f2-)
  host=${origin#https://}

  echo
  step "[2/5]" "Checking Cloudflare Tunnel..."
  if ! command -v cloudflared >/dev/null 2>&1; then
    if [ "$(uname -s)" = Darwin ] && command -v brew >/dev/null 2>&1; then
      brew install cloudflared
    else
      fail "Install cloudflared from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/ then run ./setup.sh 3 again."
    fi
  fi
  if [ ! -f "$HOME/.cloudflared/cert.pem" ]; then
    echo "A browser window will open. Sign in to Cloudflare and choose ${TEAL}$host${RESET}."
    cloudflared tunnel login || exit 1
  fi
  if ! cloudflared tunnel info techcare >/dev/null 2>&1; then
    echo "Creating the \"techcare\" tunnel..."
    cloudflared tunnel create techcare || exit 1
  fi
  echo "Pointing $host at the tunnel..."
  cloudflared tunnel route dns --overwrite-dns techcare "$host" || exit 1

  echo
  step "[3/5]" "Starting the local AI assistant if available..."
  start_ollama

  echo
  step "[4/5]" "Building the production version..."
  npm run build || exit 1

  echo
  step "[5/5]" "Sharing TechCare at ${TEAL}$origin${RESET}"
  echo "Keep this window open while people use it. Press Ctrl+C to stop."
  cloudflared tunnel run --url http://127.0.0.1:3100 techcare >/dev/null 2>&1 &
  tunnel=$!
  trap 'kill "$tunnel" 2>/dev/null' EXIT
  PORT=3100 npm start
}

choice=${1:-}
if [ -z "$choice" ]; then
  echo
  echo "  ${BOLD}${BLUE}Tech${TEAL}Care${RESET}"
  echo "  ${BLUE}--------${RESET}"
  echo "  ${TEAL}1.${RESET} Start TechCare ${BLUE}[default]${RESET}"
  echo "  ${TEAL}2.${RESET} Set up everything: dependencies, settings, database, and local AI"
  echo "  ${TEAL}3.${RESET} Share online at your Cloudflare domain"
  echo
  read -r -p "Choose 1, 2, or 3 and press Enter [1]: " choice
fi
case "$choice" in
  2) setup_all ;;
  3) share_online ;;
  *) start_app ;;
esac
