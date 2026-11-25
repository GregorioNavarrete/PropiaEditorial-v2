#!/usr/bin/env bash
set -euo pipefail

sed -i '/case \$- in/,/esac/d' ~/.bashrc 2>/dev/null || true

mkdir -p /home/antigravity/data /home/antigravity/storage/engravings

if [ -f /home/antigravity/package.json ]; then
  npm --prefix /home/antigravity install --no-audit --no-fund
fi
