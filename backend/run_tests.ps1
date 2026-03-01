# Script para ejecutar los tests del sistema de registro

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   Tests - Sistema de Registro" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "manage.py")) {
    Write-Host "Error: Debes ejecutar este script desde la carpeta backend" -ForegroundColor Red
    exit 1
}

Write-Host "Ejecutando tests..." -ForegroundColor Yellow
Write-Host ""

# Ejecutar tests con verbose
python manage.py test main.tests.RegistroUsuarioTests --verbosity=2

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "   ✓ Todos los tests pasaron" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Red
    Write-Host "   ✗ Algunos tests fallaron" -ForegroundColor Red
    Write-Host "=====================================" -ForegroundColor Red
}
