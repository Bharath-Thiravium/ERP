#!/usr/bin/env bash
set -euo pipefail

SAP_ROOT="/var/www/SAP-Python"
OUT_ROOT="$PWD/masteradmin-export"

FE_ROOT="$SAP_ROOT/frontend/src"
FE_PAGES="$FE_ROOT/pages"
FE_COMPONENTS="$FE_ROOT/components"
FE_ROUTES="$FE_ROOT/routes"

BE_ROOT="$SAP_ROOT/backend"
BE_MODULES="$BE_ROOT/modules"
BE_APP="$BE_ROOT"

rm -rf "$OUT_ROOT"
mkdir -p "$OUT_ROOT"/{frontend,backend,notes}

echo "✅ Exporting SAP-Python MasterAdmin bundle to: $OUT_ROOT"

copy_if_exists() {
  local src="$1"; local dst="$2"
  if [ -e "$src" ]; then
    mkdir -p "$(dirname "$dst")"
    cp -a "$src" "$dst"
    echo "  + copied: $src"
  fi
}

rsync_if_exists() {
  local src="$1"; local dst="$2"
  if [ -e "$src" ]; then
    mkdir -p "$dst"
    rsync -a "$src"/ "$dst"/
    echo "  + synced: $src -> $dst"
  fi
}

echo "== FRONTEND =="

CANDIDATE_FE_DIRS=(
  "$FE_PAGES/masteradmin"
  "$FE_PAGES/superadmin"
  "$FE_PAGES/admin/masteradmin"
  "$FE_COMPONENTS/masteradmin"
  "$FE_COMPONENTS/superadmin"
  "$FE_COMPONENTS/admin/masteradmin"
)

for d in "${CANDIDATE_FE_DIRS[@]}"; do
  rsync_if_exists "$d" "$OUT_ROOT/frontend/$(echo "$d" | sed "s|$FE_ROOT/||")"
done

copy_if_exists "$FE_ROUTES/index.ts" "$OUT_ROOT/frontend/routes/index.ts"
copy_if_exists "$FE_ROUTES/routes.ts" "$OUT_ROOT/frontend/routes/routes.ts"
copy_if_exists "$FE_ROUTES/appRoutes.ts" "$OUT_ROOT/frontend/routes/appRoutes.ts"

rsync_if_exists "$FE_COMPONENTS/ui" "$OUT_ROOT/frontend/components/ui"
rsync_if_exists "$FE_COMPONENTS/layout" "$OUT_ROOT/frontend/components/layout"
rsync_if_exists "$FE_COMPONENTS/common" "$OUT_ROOT/frontend/components/common"

echo "== BACKEND =="

CANDIDATE_BE_MODULES=(
  "authn"
  "audit"
  "notifications"
  "security"
  "users"
  "roles"
  "permissions"
  "sessions"
  "apikeys"
  "settings"
  "billing"
  "subscriptions"
  "support"
)

mkdir -p "$OUT_ROOT/backend/modules"
for m in "${CANDIDATE_BE_MODULES[@]}"; do
  if [ -d "$BE_MODULES/$m" ]; then
    rsync -a "$BE_MODULES/$m" "$OUT_ROOT/backend/modules/$m"
    echo "  + exported module: $m"
  fi
done

copy_if_exists "$BE_APP/urls.py" "$OUT_ROOT/backend/urls.py"
copy_if_exists "$BE_APP/settings.py" "$OUT_ROOT/backend/settings.py"
copy_if_exists "$BE_APP/settings/base.py" "$OUT_ROOT/backend/settings.base.py"
copy_if_exists "$BE_APP/settings/production.py" "$OUT_ROOT/backend/settings.production.py"

echo "== EXCLUSIONS =="

rm -rf "$OUT_ROOT"/backend/modules/tenancy 2>/dev/null || true
rm -rf "$OUT_ROOT"/backend/modules/companies 2>/dev/null || true
rm -rf "$OUT_ROOT"/backend/modules/services 2>/dev/null || true
rm -rf "$OUT_ROOT"/backend/modules/athens_sustainability 2>/dev/null || true
rm -rf "$OUT_ROOT"/frontend/pages/services 2>/dev/null || true
rm -rf "$OUT_ROOT"/frontend/pages/athens-sustainability 2>/dev/null || true

echo "✅ Exclusions applied (companies/services/athens sustainability)."

echo "== INVENTORY ==" | tee "$OUT_ROOT/notes/inventory.txt"
( cd "$OUT_ROOT" && find . -maxdepth 4 -type d | sort ) >> "$OUT_ROOT/notes/inventory.txt"

echo "✅ Done."
echo "Bundle created at: $OUT_ROOT"
