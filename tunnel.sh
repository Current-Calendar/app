#!/bin/bash
# ─────────────────────────────────────────────────────────────
# tunnel.sh — Share-preview tunnel para desarrollo local
#
# Uso: ./tunnel.sh
#
# Compatible con macOS, Linux y Windows (WSL / Git Bash).
# Solo requiere Node.js / npm (ya incluido con Expo).
#
# Arranca un tunnel público hacia localhost:8000 con localtunnel.
# Actualiza frontend/.env con la URL del tunnel para que los
# links de compartir funcionen con preview en WhatsApp/Telegram.
# Al parar (Ctrl+C) restaura frontend/.env automáticamente.
# ─────────────────────────────────────────────────────────────

ENV_FILE="frontend/.env"
KEY="EXPO_PUBLIC_SHARE_BASE_URL"
TMP_OUTPUT="/tmp/localtunnel_output.txt"

# sed -i necesita '' en macOS, nada en Linux/WSL/Git Bash
if [[ "$OSTYPE" == "darwin"* ]]; then
    SED_I() { sed -i '' "$@"; }
else
    SED_I() { sed -i "$@"; }
fi

# Guardar valor original
ORIGINAL=$(grep "^${KEY}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)

cleanup() {
    echo ""
    echo "Parando tunnel y restaurando $ENV_FILE..."
    if [ -n "$ORIGINAL" ]; then
        SED_I "s|^${KEY}=.*|${KEY}=${ORIGINAL}|" "$ENV_FILE"
    else
        SED_I "/^${KEY}=/d" "$ENV_FILE" 2>/dev/null
    fi
    echo "✓ $ENV_FILE restaurado"
    kill "$TUNNEL_PID" 2>/dev/null
    rm -f "$TMP_OUTPUT"
}
trap cleanup EXIT INT TERM

echo "Arrancando tunnel en puerto 8000 via localtunnel..."
npx --yes localtunnel --port 8000 > "$TMP_OUTPUT" 2>&1 &
TUNNEL_PID=$!

# Esperar hasta 30 s a que aparezca la URL
URL=""
for i in $(seq 1 30); do
    URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.loca\.lt' "$TMP_OUTPUT" 2>/dev/null | head -1)
    if [ -n "$URL" ]; then break; fi
    sleep 1
done

if [ -z "$URL" ]; then
    echo "Error: no se pudo obtener la URL del tunnel."
    echo "Salida de localtunnel:"
    cat "$TMP_OUTPUT"
    exit 1
fi

# Actualizar frontend/.env
if grep -q "^${KEY}=" "$ENV_FILE" 2>/dev/null; then
    SED_I "s|^${KEY}=.*|${KEY}=${URL}|" "$ENV_FILE"
else
    echo "${KEY}=${URL}" >> "$ENV_FILE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Tunnel activo: $URL"
echo "✓ frontend/.env actualizado"
echo ""
echo "  Los links de compartir usarán:"
echo "  $URL/share/calendar/<id>/"
echo ""
echo "  NOTA: la primera vez que abras el link en el navegador"
echo "  localtunnel pide confirmar la IP en $URL — haz clic en"
echo "  'Click to continue' para activarlo."
echo ""
echo "  Reinicia Expo para que coja los nuevos env vars:"
echo "  cd frontend && npx expo start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Presiona Ctrl+C para parar el tunnel y restaurar .env"

wait "$TUNNEL_PID"
