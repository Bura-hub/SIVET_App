@echo off
echo Configurando variables de entorno para MTE SIVE...
set REACT_APP_API_URL=http://192.168.1.25:3504
set REACT_APP_FRONTEND_URL=http://192.168.1.25:3503
echo Variables configuradas:
echo REACT_APP_API_URL=%REACT_APP_API_URL%
echo REACT_APP_FRONTEND_URL=%REACT_APP_FRONTEND_URL%
echo.
echo Iniciando servidor de desarrollo...
npm start
