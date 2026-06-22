@echo off
cd /d "C:\Users\24377\Desktop\Sycamore-Grove\Overlogic"
git rm --cached _commit2.bat 2>nul
del /q _commit2.bat 2>nul
git add -A
git commit -m "chore: remove temp build script accidentally committed

Co-Authored-By: AtomCode (GLM-5.2) <noreply@atomgit.com>"
git push origin main
git log --oneline -3
git status --short
echo CLEANUP_DONE
del /q "%~f0"
