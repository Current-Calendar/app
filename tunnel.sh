#!/bin/bash
# ─────────────────────────────────────────────────────────────
# tunnel.sh — Share-preview tunnel para desarrollo local
#
# Uso: ./tunnel.sh
#
# Arranca un tunnel público hacia localhost:8000 con serveo.net
# (solo necesita SSH, sin instalar nada).
# Actualiza frontend/.env con la URL del tunnel para que los
# links de compartir funcionen con preview en WhatsApp/Telegram.
# Al parar (Ctrl+C) restaura frontend/.env automáticamente.
# ─────────────────────────────────────────────────────────────

ENV_FILE="frontend/.env"
KEY="EXPO_PUBLIC_SHARE_BASE_URL"
TMP_OUTPUT="/tmp/serveo_tunnel_output.txt"

# Guardar valor original
ORIGINAL=$(grep "^${KEY}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)

cleanup() {
    echo ""
    echo "Parando tunnel y restaurando $ENV_FILE..."
    if [ -n "$ORIGINAL" ]; then
        sed -i '' "s|^${KEY}=.*|${KEY}=${ORIGINAL}|" "$ENV_FILE"
    else
        sed -i '' "/^${KEY}=/d" "$ENV_FILE" 2>/dev/null
    fi
    echo "✓ $ENV_FILE restaurado"
    kill "$TUNNEL_PID" 2>/dev/null
    rm -f "$TMP_OUTPUT"
}
trap cleanup EXIT INT TERM

echo "Arrancando tunnel en puerto 8000 via serveo.net..."
ssh -o StrictHostKeyChecking=no \
    -o ServerAliveInterval=30 \
    -R 80:localhost:8000 serveo.net > "$TMP_OUTPUT" 2>&1 &
TUNNEL_PID=$!

# Esperar hasta 20 s a que aparezca la URL
URL=""
for i in $(seq 1 20); do
    URL=$(grep -oE 'https://[a-zA-Z0-9._-]+(serveo\.net|serveousercontent\.com)' "$TMP_OUTPUT" 2>/dev/null | head -1)
    if [ -n "$URL" ]; then break; fi
    sleep 1
done

if [ -z "$URL" ]; then
    echo "Error: no se pudo obtener la URL del tunnel."
    echo "Salida de serveo:"
    cat "$TMP_OUTPUT"
    exit 1
fi

# Actualizar frontend/.env
if grep -q "^${KEY}=" "$ENV_FILE" 2>/dev/null; then
    sed -i '' "s|^${KEY}=.*|${KEY}=${URL}|" "$ENV_FILE"
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
echo "  Reinicia Expo para que coja los nuevos env vars:"
echo "  cd frontend && npx expo start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Presiona Ctrl+C para parar el tunnel y restaurar .env"

wait "$TUNNEL_PID"
