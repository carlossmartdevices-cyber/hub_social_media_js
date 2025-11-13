@echo off
REM Deployment Script for Hostinger Server (Windows)
REM This script helps prepare your application for deployment

echo =========================================
echo Social Media Hub - Deployment Preparation
echo =========================================
echo.

REM Check if required files exist
if not exist "package.json" (
    echo Error: package.json not found!
    exit /b 1
)

if not exist ".env" (
    echo Warning: .env file not found. Make sure to configure it on the server!
)

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs
echo Created logs directory

echo.
echo =========================================
echo Creating deployment package...
echo =========================================
echo.

REM Create deployment package directory
set DEPLOY_DIR=deploy_package
if exist %DEPLOY_DIR% rmdir /s /q %DEPLOY_DIR%
mkdir %DEPLOY_DIR%

REM Copy necessary files
echo Copying project files...
xcopy /E /I /Y /EXCLUDE:deploy_exclude.txt . %DEPLOY_DIR%

REM Create exclude list for xcopy
(
echo node_modules
echo .git
echo logs
echo deploy_package
echo *.log
) > deploy_exclude.txt

echo.
echo =========================================
echo Deployment package created in: %DEPLOY_DIR%
echo =========================================
echo.
echo Next steps:
echo.
echo 1. Compress the deployment package using a tool like 7-Zip or WinRAR
echo.
echo 2. Upload to your Hostinger server using FileZilla or similar FTP client:
echo    - Host: your-server-ip or ftp.yourdomain.com
echo    - Username: your-hostinger-username
echo    - Password: your-hostinger-password
echo    - Upload to: /public_html/ or /var/www/
echo.
echo 3. SSH into your server (use PuTTY on Windows):
echo    ssh username@your-server-ip
echo.
echo 4. Follow the instructions in HOSTINGER_DEPLOY.md
echo.
pause
