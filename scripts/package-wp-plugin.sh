#!/usr/bin/env bash
# package-wp-plugin.sh — Build a distributable .zip of the Chatbot Drop WP plugin
# Usage: ./scripts/package-wp-plugin.sh [version]
# Output: dist/chatbot-drop-wp-<version>.zip

set -euo pipefail

PLUGIN_DIR="chatbot-drop-wp"
DIST_DIR="dist"
VERSION="${1:-$(grep "Version:" "$PLUGIN_DIR/chatbot-drop-wp.php" | head -1 | sed "s/.*Version:[[:space:]]*//" | tr -d '[:space:]')}"
ZIP_NAME="chatbot-drop-wp-${VERSION}.zip"
ZIP_PATH="$DIST_DIR/$ZIP_NAME"

echo "📦 Packaging Chatbot Drop WP Plugin v${VERSION}..."

# Ensure dist/ exists
mkdir -p "$DIST_DIR"

# Remove any previous build of the same version
if [ -f "$ZIP_PATH" ]; then
  echo "  Removing existing $ZIP_PATH"
  rm -f "$ZIP_PATH"
fi

# Create zip — include the plugin folder so it unzips as chatbot-drop-wp/
zip -r "$ZIP_PATH" "$PLUGIN_DIR" \
  --exclude "*.DS_Store" \
  --exclude "__MACOSX/*" \
  --exclude "$PLUGIN_DIR/.git/*"

echo "✅ Created $ZIP_PATH"
echo ""
echo "Install instructions:"
echo "  1. WordPress Admin → Plugins → Add New → Upload Plugin"
echo "  2. Choose $ZIP_NAME and click Install Now"
echo "  3. Activate 'Chatbot Drop' and go to Settings → Chatbot Drop"
