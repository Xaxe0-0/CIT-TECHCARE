#!/usr/bin/env bash
# TechCare launcher for macOS and Linux. Run ./setup.sh, or ./setup.sh 1 / ./setup.sh 2.
set -u
cd "$(dirname "$0")"

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
  echo "Ollama did not start. The assistant will use built-in help only."
}

start_app() {
  if [ ! -d node_modules ] || [ ! -f .env.local ]; then
    echo "TechCare is not set up yet. Run ./setup.sh 2 first."
    exit 1
  fi
  start_ollama
  echo
  echo "Starting TechCare. Open http://127.0.0.1:3000 in your browser when it says Ready."
  echo "Press Ctrl+C to stop."
  exec npm run dev
}

setup_all() {
  if ! command -v node >/dev/null 2>&1 || [ "$(node -p "process.versions.node.split('.')[0]")" -lt 24 ]; then
    echo "Node.js 24 or later is required. Install it from https://nodejs.org/ and run setup again."
    exit 1
  fi

  echo "[1/5] Installing dependencies..."
  npm ci || exit 1

  echo
  echo "[2/5] Creating local settings..."
  if [ -f .env.local ]; then
    echo "Kept your existing .env.local."
  else
    cp .env.example .env.local
    echo "Created .env.local from .env.example."
  fi

  echo
  echo "[3/5] Preparing the database..."
  db_ready=1
  if ! node scripts/setup-database.mjs; then
    db_ready=0
    echo "The database is not ready yet. Fix the message above, then run ./setup.sh 2 again."
  fi

  echo
  echo "[4/5] Setting up the local AI assistant..."
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
    echo "Ollama could not be installed automatically. Download it from https://ollama.com/download,"
    echo "then run ./setup.sh 2 again. Until then the assistant uses built-in help only."
  fi

  echo
  echo "[5/5] Administrator account"
  read -r -p "Create an administrator account now? [y/N]: " make_admin
  case "$make_admin" in [yY]*) npm run create-admin ;; esac

  echo
  if [ "$db_ready" = 0 ]; then
    echo "Setup finished, but the database still needs attention. See the message above."
    exit 1
  fi
  echo "Setup finished."
  read -r -p "Start TechCare now? [Y/n]: " start_now
  case "$start_now" in [nN]*) exit 0 ;; esac
  start_app
}

share_online() {
  if [ ! -d node_modules ]; then
    echo "TechCare is not set up yet. Run ./setup.sh 2 first."
    exit 1
  fi
  echo
  echo "[1/5] Checking the sharing settings..."
  node scripts/setup-sharing.mjs || exit 1
  origin=$(grep -E '^TECHCARE_ORIGIN=' .env.production.local | tail -n 1 | cut -d= -f2-)
  host=${origin#https://}

  echo
  echo "[2/5] Checking Cloudflare Tunnel..."
  if ! command -v cloudflared >/dev/null 2>&1; then
    if [ "$(uname -s)" = Darwin ] && command -v brew >/dev/null 2>&1; then
      brew install cloudflared
    else
      echo "Install cloudflared from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
      echo "then run ./setup.sh 3 again."
      exit 1
    fi
  fi
  if [ ! -f "$HOME/.cloudflared/cert.pem" ]; then
    echo "A browser window will open. Sign in to Cloudflare and choose $host."
    cloudflared tunnel login || exit 1
  fi
  if ! cloudflared tunnel info techcare >/dev/null 2>&1; then
    echo "Creating the \"techcare\" tunnel..."
    cloudflared tunnel create techcare || exit 1
  fi
  echo "Pointing $host at the tunnel..."
  cloudflared tunnel route dns --overwrite-dns techcare "$host" || exit 1

  echo
  echo "[3/5] Starting the local AI assistant if available..."
  start_ollama

  echo
  echo "[4/5] Building the production version..."
  npm run build || exit 1

  echo
  echo "[5/5] Sharing TechCare at $origin"
  echo "Keep this window open while people use it. Press Ctrl+C to stop."
  cloudflared tunnel run --url http://127.0.0.1:3100 techcare >/dev/null 2>&1 &
  tunnel=$!
  trap 'kill "$tunnel" 2>/dev/null' EXIT
  PORT=3100 npm start
}

choice=${1:-}
if [ -z "$choice" ]; then
  echo
  echo "  TechCare"
  echo "  --------"
  echo "  1. Start TechCare [default]"
  echo "  2. Set up everything: dependencies, settings, database, and local AI"
  echo "  3. Share online at your Cloudflare domain"
  echo
  read -r -p "Choose 1, 2, or 3 and press Enter [1]: " choice
fi
case "$choice" in
  2) setup_all ;;
  3) share_online ;;
  *) start_app ;;
esac
