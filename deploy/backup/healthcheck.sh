#!/bin/sh
# Unhealthy si aucune sauvegarde n'a réussi depuis plus de 26 h (une nuit ratée + marge)
STATE_DIR=${STATE_DIR:-/state}
ref=$(cat "$STATE_DIR/last-success" 2>/dev/null || cat "$STATE_DIR/started" 2>/dev/null || echo 0)
age=$(( $(date +%s) - ref ))
[ "$age" -lt $((26 * 3600)) ] || { echo "dernière sauvegarde réussie il y a $((age / 3600)) h"; exit 1; }
