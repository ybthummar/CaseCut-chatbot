#!/usr/bin/env bash
# ----------------------------------------------------------------
# CaseCut AI — Daily Case Update Script
# Runs scrapers then re-indexes new documents into Qdrant.
#
# Usage:
#   chmod +x cronjobs/update_cases.sh
#   ./cronjobs/update_cases.sh
#
# Cron example (every day at 2 AM):
#   0 2 * * * cd /path/to/backend && ./cronjobs/update_cases.sh >> logs/cron.log 2>&1
# ----------------------------------------------------------------

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BACKEND_DIR"

echo "========================================"
echo "CaseCut AI — Case Update  $(date)"
echo "========================================"

# Activate virtualenv if available
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
elif [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

echo ""
echo "▶ Step 1: Running Indian Kanoon scraper..."
python -c "from scrapers.kanoon_scraper import scrape_indian_kanoon; scrape_indian_kanoon('Supreme Court judgments 2024', max_results=15)"

echo ""
echo "▶ Step 2: Running SCI PDF scraper..."
python -c "from scrapers.ecourts_scraper import scrape_sci_judgments; scrape_sci_judgments(max_results=10)"

echo ""
echo "▶ Step 3: Re-indexing into Qdrant..."
python cronjobs/update_index.py

echo ""
echo "✅ Case update completed at $(date)"
