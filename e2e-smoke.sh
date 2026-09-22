#!/usr/bin/env bash
# E2E smoke test for Solai platform (runs against http://localhost:3000)
set -u
BASE=http://localhost:3000
JAR=$(mktemp)
JAR2=$(mktemp)
JAR3=$(mktemp)
JAR4=$(mktemp)
PASS=0; FAIL=0
check() { # name, expected_substr, actual
  if echo "$3" | grep -q "$2"; then PASS=$((PASS+1)); echo "  ✓ $1";
  else FAIL=$((FAIL+1)); echo "  ✗ $1 — expected /$2/"; echo "    got: $(echo "$3" | head -c 300)"; fi
}

echo "== 1. Public home =="
HOME=$(curl -s $BASE/)
check "home renders hero" "blooming step by step" "$HOME"
check "home renders featured course" "Tamil for Beginners" "$HOME"
check "home renders workshop" "Conversation Bootcamp" "$HOME"

echo "== 2. Course catalog =="
LEARN=$(curl -s $BASE/learn)
check "course list" "Everyday Tamil" "$LEARN"

echo "== 3. Registration =="
REG=$(curl -s -c $JAR -X POST $BASE/api/auth/register -H 'Content-Type: application/json' -d '{"name":"E2E Tester","email":"e2e@test.dev","password":"password123","native_language":"hi"}')
check "register ok" '"ok":true' "$REG"

echo "== 4. Login (demo learner priya) =="
LOGIN=$(curl -s -c $JAR2 -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"priya@solai.test","password":"learner1234"}')
check "login ok" '"ok":true' "$LOGIN"
BADLOGIN=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"priya@solai.test","password":"wrong"}')
check "bad login rejected" 'Invalid email or password' "$BADLOGIN"

echo "== 5. Dashboard =="
DASH=$(curl -s -b $JAR2 $BASE/dashboard)
check "dashboard continue-learning" "Continue learning" "$DASH"
check "dashboard shows a course" "Everyday Tamil — Conversation" "$DASH"
check "dashboard streak" "Streak" "$DASH"

echo "== 6. Course detail + progress =="
COURSE=$(curl -s -b $JAR2 $BASE/learn/tamil-for-beginners)
check "course detail" "Sounds of Tamil" "$COURSE"

echo "== 7. Lesson page (video) =="
LESSON=$(curl -s -b $JAR2 $BASE/learn/tamil-for-beginners/greetings)
check "lesson renders" "Greetings" "$LESSON"
check "lesson video player" "video" "$LESSON"

echo "== 8. Progress tracking =="
# lesson 6 is mid-progress (70%) for priya — watching the rest should complete it
PROG=$(curl -s -b $JAR2 -X POST $BASE/api/progress -H 'Content-Type: application/json' -d '{"lesson_id":6,"position":13,"duration":13,"watched":13,"percent":100,"save":true}')
check "video progress -> complete" '"completed":true' "$PROG"

echo "== 9. Quiz submit (server-scored) =="
QUIZ=$(curl -s -b $JAR2 -X POST $BASE/api/quizzes/submit -H 'Content-Type: application/json' -d '{"quiz_id":1,"answers":{"1":0,"2":1,"3":2,"4":1,"5":2,"6":true,"7":"பெயர்","8":"ஒரு அறை வேண்டும், தயவு செய்து"},"duration_seconds":120}')
check "quiz scored" '"score":' "$QUIZ"
check "quiz passed" '"passed":true' "$QUIZ"

echo "== 10. AI tutor (local retrieval, lesson context) =="
AI=$(curl -s -b $JAR2 -X POST $BASE/api/ai/chat -H 'Content-Type: application/json' -d '{"question":"What does வணக்கம் mean?","context":{"type":"lesson","id":4,"label":"Greetings"}}')
check "AI answers vocab" "Hello" "$AI"
check "AI local provider" 'local' "$AI"
AI2=$(curl -s -b $JAR2 -X POST $BASE/api/ai/chat -H 'Content-Type: application/json' -d '{"question":"explain the ordering food formula","context":{"type":"lesson","id":8,"label":"Ordering Food"}}')
check "AI retrieves lesson content" "Ordering Food" "$AI2"
check "AI answer cites lesson vocab" "வேண்டும்" "$AI2"

echo "== 11. Workshop register + attendance (90% rule) =="
WREG=$(curl -s -b $JAR2 -X POST $BASE/api/workshops/register -H 'Content-Type: application/json' -d '{"workshop_id":1}')
check "free workshop registered" 'CONFIRMED' "$WREG"
WIN=$(curl -s -b $JAR2 -X POST $BASE/api/attendance/checkin -H 'Content-Type: application/json' -d '{"session_id":3}')
check "checkin ok" '"ok":true' "$WIN"
WOUT=$(curl -s -b $JAR2 -X POST $BASE/api/attendance/checkout -H 'Content-Type: application/json' -d '{"session_id":3}')
check "checkout ok" '"ok":true' "$WOUT"

echo "== 12. Certificate verification (QR target) =="
VERIFY=$(curl -s $BASE/verify/TN-$(date +%Y)-000001)
check "verify page valid" "Valid Certificate" "$VERIFY"
check "verify shows name" "Priya Nair" "$VERIFY"
QR=$(curl -s $BASE/api/certificates/TN-$(date +%Y)-000001/qr)
check "QR data url" "data:image/png" "$QR"

echo "== 13. Certificate claim (priya eligible at 97.5%) =="
CLAIM=$(curl -s -b $JAR2 -X POST $BASE/api/certificates/claim -H 'Content-Type: application/json' -d '{"type":"workshop","workshop_id":1}')
check "claim eligible" '"ok":true' "$CLAIM"

echo "== 14. Ineligible learner cannot claim (marco 55%) =="
MLOGIN=$(curl -s -c $JAR3 -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"marco@solai.test","password":"learner1234"}')
MCLAIM=$(curl -s -b $JAR3 -X POST $BASE/api/certificates/claim -H 'Content-Type: application/json' -d '{"type":"workshop","workshop_id":1}')
check "ineligible rejected" "Eligibility requirements not met" "$MCLAIM"

echo "== 15. Ask teacher + AI preliminary =="
Q=$(curl -s -b $JAR2 -X POST $BASE/api/questions -F "title=When do I use -க்கு (kku)?" -F "body=I keep seeing the suffix -க்கு in lessons, when exactly should I use it in a sentence?")
check "question submitted" '"ok":true' "$Q"
check "AI preliminary answer present" 'ai_answer' "$Q"

echo "== 16. Community join + post + react =="
JOIN=$(curl -s -b $JAR2 -X POST $BASE/api/communities/join -H 'Content-Type: application/json' -d '{"community_id":3}')
check "join community" '"ok":true' "$JOIN"
POST=$(curl -s -b $JAR2 -X POST $BASE/api/communities/post -H 'Content-Type: application/json' -d '{"community_id":3,"title":"E2E post","body":"Testing the community flow with a real request."}')
check "community post" '"ok":true' "$POST"
REACT=$(curl -s -b $JAR2 -X POST $BASE/api/communities/react -H 'Content-Type: application/json' -d '{"post_id":3,"type":"like"}')
check "reaction" '"ok":true' "$REACT"

echo "== 17. Search =="
SRCH=$(curl -s "$BASE/api/search?q=theenir")
check "search finds vocab" "theenir" "$SRCH"
SRCH2=$(curl -s "$BASE/api/search?q=bus")
check "search finds lessons" "Bus" "$SRCH2"

echo "== 18. RBAC: learner blocked from /api/admin/analytics =="
RBAC=$(curl -s -b $JAR2 $BASE/api/admin/analytics)
check "RBAC 403 for learner" 'permission' "$RBAC"

echo "== 19. Admin login + analytics + audit =="
ALOGIN=$(curl -s -c $JAR4 -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@solai.test","password":"admin1234"}')
check "admin login" '"ok":true' "$ALOGIN"
ANALYTICS=$(curl -s -b $JAR4 $BASE/api/admin/analytics)
check "analytics totals" '"users":' "$ANALYTICS"
check "analytics ai use" '"aiUse"' "$ANALYTICS"

echo "== 20. Admin creates user (audited) =="
NEWUSER=$(curl -s -b $JAR4 -X POST $BASE/api/admin/users -H 'Content-Type: application/json' -d '{"name":"Audit Check","email":"audit@test.dev","password":"password123","role":"learner"}')
check "admin create user" '"ok":true' "$NEWUSER"
AUDIT=$(curl -s -b $JAR4 $BASE/api/admin/audit)
check "audit log entry" "ADMIN_CREATED_USER" "$AUDIT"

echo "== 21. Admin reindex (AI knowledge) =="
REINDEX=$(curl -s -b $JAR4 -X POST $BASE/api/admin/ai -H 'Content-Type: application/json' -d '{"action":"reindex_all"}')
check "reindex all" '"status":"AI KNOWLEDGE UPDATED"' "$REINDEX"

echo "== 22. CMS: admin edits site settings, visible on home =="
CMS=$(curl -s -b $JAR4 -X PUT $BASE/api/admin/cms -H 'Content-Type: application/json' -d '{"target":"settings","hero_title":"CMS-EDITED HERO"}')
check "cms update ok" '"ok":true' "$CMS"
HOME2=$(curl -s $BASE/)
check "home shows CMS edit" "CMS-EDITED HERO" "$HOME2"
# restore
curl -s -b $JAR4 -X PUT $BASE/api/admin/cms -H 'Content-Type: application/json' -d '{"target":"settings","hero_title":"Learn Tamil, blooming step by step"}' > /dev/null

echo "== 23. PWA assets =="
SW=$(curl -s $BASE/sw.js | head -c 100)
check "service worker served" "Solai PWA" "$SW"
MANI=$(curl -s $BASE/manifest.json)
check "manifest" "Solai" "$MANI"

echo "== 24. 404 page =="
NF=$(curl -s -o /dev/null -w "%{http_code}" $BASE/does-not-exist)
check "404 code" "404" "$NF"

echo
echo "=============================="
echo "PASS: $PASS   FAIL: $FAIL"
echo "=============================="
[ $FAIL -eq 0 ]
