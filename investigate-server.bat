@echo off
setlocal enabledelayedexpansion
set KEY=C:\Users\Admin\Downloads\icss-company2025-gmail-com-vm-454-new-key.pem
set SSH=ssh -i "%KEY%" -o StrictHostKeyChecking=no root@193.123.160.174

echo.
echo ===================================================================
echo  oracle-ics-admin Server Investigation
echo ===================================================================

echo.
echo === STEP 1: Git log (last 5 commits) ===
%SSH% "cd /root/oracle-ics-admin && git log --oneline -5"

echo.
echo === STEP 2: PM2 list ===
%SSH% "pm2 list"

echo.
echo === STEP 3: PM2 logs (last 300 lines) ===
%SSH% "pm2 logs --lines 300 --nostream 2>&1 | tail -300"

echo.
echo === STEP 4: App directory listing ===
%SSH% "ls -la /root/oracle-ics-admin/"

echo.
echo === STEP 5: Find .env files ===
%SSH% "ls /root/ && find /root -name '*.env' -not -path '*/node_modules/*' 2>/dev/null | head -20"

echo.
echo === STEP 6: .env contents ===
%SSH% "cat /root/oracle-ics-admin/.env 2>/dev/null || cat /root/oracle-ics-admin/.env.production 2>/dev/null || cat /root/oracle-ics-admin/.env.local 2>/dev/null || echo 'no .env found'"

echo.
echo === STEP 7: PM2 env / show process 0 ===
%SSH% "pm2 env 0 2>/dev/null || pm2 show 0 2>/dev/null"

echo.
echo === STEP 8: Node/PM2 processes and port 3003 ===
%SSH% "ps aux | grep -E '(node|pm2|next)' && echo '--- port 3003 ---' && netstat -tlnp 2>/dev/null | grep 3003 || ss -tlnp | grep 3003"

echo.
echo === STEP 9a: TS files with 'password' ===
%SSH% "find /root -name '*.ts' -not -path '*/node_modules/*' | xargs grep -l 'password' 2>/dev/null | head -10"

echo.
echo === STEP 9b: JS files with cloudbase/resetPassword/windows password ===
%SSH% "find /root -name '*.js' -not -path '*/node_modules/*' | xargs grep -li 'cloudbase\|resetPassword\|windows.*password' 2>/dev/null | head -10"

echo.
echo === STEP 10: PM2 log files ===
%SSH% "ls /root/.pm2/logs/ && tail -200 /root/.pm2/logs/*.log 2>/dev/null | head -300"

echo.
echo === STEP 11: ecosystem.config.js ===
%SSH% "cat /root/oracle-ics-admin/ecosystem.config.js"

echo.
echo === STEP 12: OCI config ===
%SSH% "ls ~/.oci/ 2>/dev/null && echo '---' && cat ~/.oci/config 2>/dev/null || echo 'no OCI config'"

echo.
echo === STEP 13: Search logs for failing VMs ===
%SSH% "grep -r 'vutuyenchilinh\|vm-28\|vm-29\|vm-30\|vm-31\|vm-32' /root/.pm2/logs/ 2>/dev/null | tail -100"

echo.
echo === STEP 14: List /root and /home ===
%SSH% "ls /root/ && echo '--- /home ---' && ls /home/ 2>/dev/null"

echo.
echo === STEP 15: SSH keys ===
%SSH% "ls -la /root/.ssh/ && echo '--- .pem/.key files in project ---' && ls -la /root/oracle-ics-admin/ | grep -E '\.pem|\.key|ssh'"

echo.
echo === STEP 16: Backend repo check ===
%SSH% "ls /root/ | grep -i backend && cat /root/oracle-ics-backend/ecosystem.config.js 2>/dev/null || cat /root/oracle-ics-api/ecosystem.config.js 2>/dev/null || echo 'no backend ecosystem found'"

echo.
echo === STEP 17: Backend .env ===
%SSH% "cat /root/oracle-ics-backend/.env 2>/dev/null || find /root -name '.env' -not -path '*/node_modules/*' -exec echo '--- {}' \; -exec cat {} \; 2>/dev/null | head -100"

echo.
echo === STEP 18: All PM2 processes + backend port ===
%SSH% "pm2 list --no-color && echo '--- all listening ports ---' && netstat -tlnp 2>/dev/null || ss -tlnp"

echo.
echo ===================================================================
echo  Investigation complete
echo ===================================================================
pause
