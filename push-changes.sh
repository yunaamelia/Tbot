#!/bin/bash
cd /home/senarokalie/Desktop/TBot

echo "=== Checking Git Status ==="
git status

echo ""
echo "=== Adding all changes ==="
git add -A

echo ""
echo "=== Committing changes ==="
git commit -m "feat: Complete Phase 7 - Admin Stock Management and Store Control (User Story 5)

- Fix missing adminCommands import in bot.js (T106)
- Add store status check in checkout handler (T103)
- Create integration tests for admin stock commands (T092)
- Create integration tests for store open/close commands (T093)
- Implement admin interface for viewing order history (T110)
- Implement admin interface for viewing customer information (T111)
- Update tasks.md to mark all Phase 7 tasks as complete"

echo ""
echo "=== Pushing to remote ==="
git push

echo ""
echo "=== Done ==="

