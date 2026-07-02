@echo off
setlocal

call "%~dp0app\Start-Mai.cmd" %*
exit /b %errorlevel%
