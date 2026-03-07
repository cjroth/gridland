#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUT_DIR="$PROJECT_DIR/public/c2w"

if ! command -v c2w &>/dev/null; then
  echo "Error: c2w is not installed."
  echo "Install it from: https://github.com/container2wasm/container2wasm"
  echo "  go install github.com/container2wasm/container2wasm/cmd/c2w@latest"
  exit 1
fi

echo "Building container WASM (this may take several minutes)..."
mkdir -p "$OUT_DIR"
c2w --to-js --target-arch=riscv64 riscv64/alpine:3.20 "$OUT_DIR/"

# Patch out.js to export FS, TTY, and Asyncify so we can hook up terminal I/O.
# By default these are unexported (accessing them on Module throws an error).
# We insert exports BEFORE run() so they're available in preRun callbacks.
echo "Patching out.js to export FS/TTY/Asyncify..."
sed -i '' '/^run();$/i\
// --- container-demo patch: export FS, TTY, Asyncify for terminal I/O ---\
Object.defineProperty(Module, "FS", { value: FS, writable: true, configurable: true });\
Object.defineProperty(Module, "TTY", { value: TTY, writable: true, configurable: true });\
Object.defineProperty(Module, "Asyncify", { value: Asyncify, writable: true, configurable: true });\
// --- end patch ---\
' "$OUT_DIR/out.js"

# Download c2w-net-proxy.wasm for browser networking
C2W_NET_PROXY_VERSION="v0.5.0"
if [ ! -f "$OUT_DIR/c2w-net-proxy.wasm.gzip" ]; then
  echo "Downloading c2w-net-proxy.wasm ($C2W_NET_PROXY_VERSION)..."
  curl -L -o "$OUT_DIR/c2w-net-proxy.wasm" \
    "https://github.com/ktock/container2wasm/releases/download/${C2W_NET_PROXY_VERSION}/c2w-net-proxy.wasm"
  gzip -c "$OUT_DIR/c2w-net-proxy.wasm" > "$OUT_DIR/c2w-net-proxy.wasm.gzip"
  rm "$OUT_DIR/c2w-net-proxy.wasm"
  echo "c2w-net-proxy.wasm downloaded and compressed."
else
  echo "c2w-net-proxy.wasm.gzip already exists, skipping download."
fi

echo "Done! Container WASM files are in $OUT_DIR/"
echo "You can now run: bun run dev"
