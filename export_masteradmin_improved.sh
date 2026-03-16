#!/usr/bin/env bash
set -euo pipefail

SAP_ROOT="/var/www/SAP-Python"
OUT_ROOT="$SAP_ROOT/masteradmin-export"

FE_ROOT="$SAP_ROOT/frontend/src"
BE_ROOT="$SAP_ROOT/backend"

rm -rf "$OUT_ROOT"
mkdir -p "$OUT_ROOT"/{frontend/{pages,components,hooks,services,lib},backend/{apps,core},docs}

echo "✅ Exporting SAP-Python MasterAdmin bundle to: $OUT_ROOT"

copy_if_exists() {
  local src="$1"; local dst="$2"
  if [ -e "$src" ]; then
    mkdir -p "$(dirname "$dst")"
    cp -a "$src" "$dst"
    echo "  ✓ $src"
  fi
}

rsync_if_exists() {
  local src="$1"; local dst="$2"
  if [ -e "$src" ]; then
    mkdir -p "$dst"
    rsync -a "$src"/ "$dst"/
    echo "  ✓ $src -> $dst"
  fi
}

echo ""
echo "📦 FRONTEND EXPORT"
echo "===================="

# Master Admin Pages (EXCLUDE athens-sustainability subdirectory)
if [ -d "$FE_ROOT/pages/master-admin" ]; then
  mkdir -p "$OUT_ROOT/frontend/pages/master-admin"
  rsync -a --exclude='athens-sustainability' "$FE_ROOT/pages/master-admin/" "$OUT_ROOT/frontend/pages/master-admin/"
  echo "  ✓ pages/master-admin (excluding athens-sustainability)"
fi

# Auth pages
rsync_if_exists "$FE_ROOT/pages/auth" "$OUT_ROOT/frontend/pages/auth"

# Components (EXCLUDE company/athens-sustainability)
rsync_if_exists "$FE_ROOT/components/ui" "$OUT_ROOT/frontend/components/ui"
rsync_if_exists "$FE_ROOT/components/layout" "$OUT_ROOT/frontend/components/layout"
rsync_if_exists "$FE_ROOT/components/auth" "$OUT_ROOT/frontend/components/auth"
rsync_if_exists "$FE_ROOT/components/security" "$OUT_ROOT/frontend/components/security"
rsync_if_exists "$FE_ROOT/components/modals" "$OUT_ROOT/frontend/components/modals"
rsync_if_exists "$FE_ROOT/components/forms" "$OUT_ROOT/frontend/components/forms"

# Hooks
rsync_if_exists "$FE_ROOT/hooks" "$OUT_ROOT/frontend/hooks"

# Lib utilities
rsync_if_exists "$FE_ROOT/lib" "$OUT_ROOT/frontend/lib"

# Services (analytics, government, etc - NOT athens sustainability)
copy_if_exists "$FE_ROOT/services/analyticsApi.ts" "$OUT_ROOT/frontend/services/analyticsApi.ts"
copy_if_exists "$FE_ROOT/services/governmentApi.ts" "$OUT_ROOT/frontend/services/governmentApi.ts"

echo ""
echo "🔧 BACKEND EXPORT"
echo "===================="

# Authentication (core MasterAdmin auth)
rsync_if_exists "$BE_ROOT/authentication" "$OUT_ROOT/backend/apps/authentication"

# Notifications
rsync_if_exists "$BE_ROOT/notifications" "$OUT_ROOT/backend/apps/notifications"

# Configuration
rsync_if_exists "$BE_ROOT/configuration" "$OUT_ROOT/backend/apps/configuration"

# Analytics
rsync_if_exists "$BE_ROOT/analytics" "$OUT_ROOT/backend/apps/analytics"

# Athens Control Plane (if it's MasterAdmin related)
rsync_if_exists "$BE_ROOT/athens_control_plane" "$OUT_ROOT/backend/apps/athens_control_plane"

# Core settings
copy_if_exists "$BE_ROOT/sap_backend/urls.py" "$OUT_ROOT/backend/core/urls.py"
copy_if_exists "$BE_ROOT/sap_backend/settings.py" "$OUT_ROOT/backend/core/settings.py"

# Requirements
copy_if_exists "$BE_ROOT/requirements.txt" "$OUT_ROOT/backend/requirements.txt"

echo ""
echo "🚫 APPLYING EXCLUSIONS"
echo "===================="

# Hard remove excluded modules
rm -rf "$OUT_ROOT"/backend/apps/athens_sustainability 2>/dev/null || true
rm -rf "$OUT_ROOT"/frontend/pages/services 2>/dev/null || true
rm -rf "$OUT_ROOT"/frontend/pages/athens-sustainability 2>/dev/null || true
rm -rf "$OUT_ROOT"/frontend/pages/master-admin/athens-sustainability 2>/dev/null || true
rm -rf "$OUT_ROOT"/frontend/components/company/athens-sustainability 2>/dev/null || true

# Remove service-specific files from authentication
find "$OUT_ROOT/backend/apps/authentication" -type f -name "*service*" -o -name "*services_management*" 2>/dev/null | while read f; do
  if grep -q "service" "$f" 2>/dev/null; then
    echo "  ⚠ Flagged for review: $f"
  fi
done

echo "  ✓ Exclusions applied"

echo ""
echo "📊 GENERATING INVENTORY"
echo "===================="

{
  echo "# MasterAdmin Export Inventory"
  echo "Generated: $(date)"
  echo ""
  echo "## Directory Structure"
  cd "$OUT_ROOT" && tree -L 3 -d 2>/dev/null || find . -type d -maxdepth 3 | sort
  echo ""
  echo "## File Count by Type"
  echo "TypeScript/TSX: $(find . -name '*.ts' -o -name '*.tsx' | wc -l)"
  echo "Python: $(find . -name '*.py' | wc -l)"
  echo "Total Files: $(find . -type f | wc -l)"
} > "$OUT_ROOT/docs/inventory.md"

echo ""
echo "✅ EXPORT COMPLETE"
echo "===================="
echo "Bundle location: $OUT_ROOT"
echo "Inventory: $OUT_ROOT/docs/inventory.md"
