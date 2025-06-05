#!/bin/bash

# Este script se usa para inicializar las credenciales del zonal cache y ejecutarlo.
set -euo pipefail

# Verificar que las variables de entorno necesarias estén definidas
: "${VERCEL_TOKEN:?Environment variable VERCEL_TOKEN is required}"
: "${VERCEL_EDGE_CONFIG_ID:?Environment variable VERCEL_EDGE_CONFIG_ID is required}"
: "${APP_ID:?Environment variable APP_ID is required}"
: "${REST_API:?Environment variable REST_API is required}"
: "${APP_ID:?Environment variable APP_ID is required}"
: "${COUNTRY:?Environment variable COUNTRY is required}"

# Generar API key de autenticación con el API de Vercel
API_KEY=$(openssl rand -hex 16)
export API_KEY
echo "Generated API_KEY: $API_KEY"

# Cuerpo del request para la API de Vercel Edge Config
REQUEST_BODY=$(cat <<EOF
{
  "items": [
    {
      "operation": "upsert",
      "key": "${APP_ID}",
      "value": "${API_KEY}"
    }
  ]
}
EOF
)

# URL para la API de Vercel Edge Config
URL="https://api.vercel.com/v1/edge-config/${VERCEL_EDGE_CONFIG_ID}/items"

echo "Updating Edge Config with API key for APP_ID: ${APP_ID}"
# Realizar el request PATCH a la API de Vercel Edge Config para actualizar el API key
curl --retry 10 -f --retry-all-errors --retry-delay  5 -s -o /dev/null \
     -X PATCH "$URL" \
     -H "Authorization: Bearer $VERCEL_TOKEN" \
     -H "Content-Type: application/json" \
     -d "$REQUEST_BODY"

sleep 10

PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
export PUBLIC_IP

echo "Public IP of the instance: $PUBLIC_IP"

echo "Registering zonal cache with REST API at ${REST_API}"
curl --retry 10 -kfsS --retry-all-errors --retry-delay 5 \
     -X POST "https://${REST_API}/cache/register" \
     -H "x-api-key: ${API_KEY}" \
     -H "x-app-id: ${APP_ID}" \
     -H "Content-Type: application/json" \
     -d "{\"country\":\"${COUNTRY}\", \"ip\":\"${PUBLIC_IP}\"}"

sleep 5

echo "Executing zonal cache with APP_ID: ${APP_ID}, REST_API: ${REST_API}, COUNTRY: ${COUNTRY}"
# Se levanta el zonal cache
exec ./zonal_cache

# Referencias:
# Para enviar el request PATCH a la API de Vercel Edge Config:
# https://gist.github.com/mohanpedala/1e2ff5661761d3abd0385e8223e16425?permalink_comment_id=3935570
# https://unix.stackexchange.com/questions/644343/bash-while-loop-stop-after-a-successful-curl-request
# https://vercel.com/docs/edge-config/vercel-api
# Para acceder a la IP pública de la instancia EC2:
# https://stackoverflow.com/questions/38679346/get-public-ip-address-on-current-ec2-instance
# http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html