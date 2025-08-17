#!/bin/bash

# Script de Build Automatizado para Bíblia Sagrada
# Compatível com Ubuntu/Debian e outros sistemas Linux

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Verificar se Node.js está instalado
check_nodejs() {
    log "Verificando Node.js..."
    if ! command -v node &> /dev/null; then
        error "Node.js não encontrado. Por favor, instale Node.js 18 ou superior."
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js versão 18 ou superior é necessária. Versão atual: $(node -v)"
    fi
    
    success "Node.js $(node -v) encontrado"
}

# Verificar dependências do sistema
check_dependencies() {
    log "Verificando dependências do sistema..."
    
    # Lista de pacotes necessários para Ubuntu/Debian
    REQUIRED_PACKAGES=(
        "libnss3-dev"
        "libatk-bridge2.0-dev" 
        "libxkbcommon-dev"
        "libxcomposite-dev"
        "libxdamage-dev"
        "libxrandr-dev"
        "libgbm-dev"
        "libxss-dev"
        "libasound2-dev"
        "build-essential"
    )
    
    MISSING_PACKAGES=()
    
    for package in "${REQUIRED_PACKAGES[@]}"; do
        if ! dpkg -l | grep -q "^ii  $package "; then
            MISSING_PACKAGES+=("$package")
        fi
    done
    
    if [ ${#MISSING_PACKAGES[@]} -ne 0 ]; then
        warning "Pacotes necessários não encontrados: ${MISSING_PACKAGES[*]}"
        log "Execute: sudo apt install ${MISSING_PACKAGES[*]}"
        
        read -p "Deseja instalar automaticamente? (s/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            sudo apt update
            sudo apt install -y "${MISSING_PACKAGES[@]}"
            success "Dependências instaladas"
        else
            error "Dependências necessárias não instaladas"
        fi
    else
        success "Todas as dependências do sistema estão instaladas"
    fi
}

# Instalar dependências npm
install_deps() {
    log "Instalando dependências do projeto..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    success "Dependências instaladas"
}

# Verificar tipos TypeScript
type_check() {
    log "Verificando tipos TypeScript..."
    
    if npm run type-check; then
        success "Verificação de tipos passou"
    else
        warning "Verificação de tipos falhou, mas continuando..."
    fi
}

# Executar linting
lint_code() {
    log "Executando linting..."
    
    if npm run lint; then
        success "Linting passou"
    else
        warning "Linting falhou, mas continuando..."
    fi
}

# Limpar banco de dados de desenvolvimento
clean_db() {
    log "Limpando banco de dados de desenvolvimento..."
    
    # Remover arquivos de banco de dados do diretório do projeto
    find . -name "biblia.db*" -type f -delete 2>/dev/null || true
    
    # Limpar cache do usuário de desenvolvimento
    if [ -d "$HOME/.config/biblia-sagrada" ]; then
        warning "Encontrado diretório de dados de desenvolvimento"
        read -p "Deseja limpar os dados de desenvolvimento? (s/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            rm -rf "$HOME/.config/biblia-sagrada"
            success "Dados de desenvolvimento removidos"
        fi
    fi
    
    success "Limpeza de banco de dados concluída"
}

# Build do aplicativo
build_app() {
    log "Construindo aplicativo..."
    
    export NODE_ENV=production
    
    if npm run build; then
        success "Build concluído"
    else
        error "Falha no build"
    fi
}

# Gerar pacote .deb
make_deb() {
    log "Gerando pacote .deb..."
    
    if npm run make:deb; then
        success "Pacote .deb gerado"
        
        # Encontrar e mostrar o arquivo gerado
        DEB_FILE=$(find out/ -name "*.deb" -type f | head -n 1)
        if [ -n "$DEB_FILE" ]; then
            DEB_SIZE=$(du -h "$DEB_FILE" | cut -f1)
            success "Arquivo: $DEB_FILE ($DEB_SIZE)"
            
            # Verificar integridade do pacote
            if dpkg --info "$DEB_FILE" > /dev/null 2>&1; then
                success "Pacote .deb válido"
            else
                warning "Pacote .deb pode estar corrompido"
            fi
        fi
    else
        error "Falha ao gerar pacote .deb"
    fi
}

# Instalar pacote localmente (opcional)
install_local() {
    DEB_FILE=$(find out/ -name "*.deb" -type f | head -n 1)
    
    if [ -n "$DEB_FILE" ]; then
        read -p "Deseja instalar o pacote localmente? (s/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            log "Instalando pacote localmente..."
            sudo dpkg -i "$DEB_FILE" || sudo apt install -f
            success "Pacote instalado"
        fi
    fi
}

# Limpar arquivos temporários
cleanup() {
    log "Limpando arquivos temporários..."
    
    # Remover diretórios de build anteriores (opcional)
    read -p "Deseja limpar diretórios de build anteriores? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        rm -rf out/ dist/ .vite/
        success "Arquivos temporários removidos"
    fi
    
    # Limpar arquivos de banco de dados também
    clean_db
}

# Menu de opções
show_menu() {
    echo
    echo "=== Build Script - Bíblia Sagrada ==="
    echo "1) Build completo (recomendado)"
    echo "2) Apenas verificar dependências"
    echo "3) Apenas instalar dependências npm"
    echo "4) Apenas build"
    echo "5) Apenas gerar .deb"
    echo "6) Limpar banco de dados"
    echo "7) Limpar arquivos temporários"
    echo "8) Sair"
    echo
}

# Função principal
main() {
    clear
    log "Iniciando build da Bíblia Sagrada v1.0.0"
    
    # Verificar se estamos no diretório correto
    if [ ! -f "package.json" ]; then
        error "package.json não encontrado. Execute este script no diretório raiz do projeto."
    fi
    
    if [ "$#" -eq 0 ]; then
        # Modo interativo
        while true; do
            show_menu
            read -p "Escolha uma opção [1-7]: " choice
            
            case $choice in
                1)
                    check_nodejs
                    check_dependencies
                    clean_db
                    install_deps
                    type_check
                    lint_code
                    build_app
                    make_deb
                    install_local
                    success "Build completo finalizado!"
                    break
                    ;;
                2)
                    check_nodejs
                    check_dependencies
                    ;;
                3)
                    install_deps
                    ;;
                4)
                    build_app
                    ;;
                5)
                    make_deb
                    ;;
                6)
                    clean_db
                    ;;
                7)
                    cleanup
                    ;;
                8)
                    log "Saindo..."
                    exit 0
                    ;;
                *)
                    warning "Opção inválida"
                    ;;
            esac
            
            echo
            read -p "Pressione Enter para continuar..."
        done
    else
        # Modo não-interativo com argumentos
        case "$1" in
            --full)
                check_nodejs
                check_dependencies
                clean_db
                install_deps
                type_check
                lint_code
                build_app
                make_deb
                ;;
            --deps-only)
                check_nodejs
                check_dependencies
                install_deps
                ;;
            --build-only)
                build_app
                ;;
            --deb-only)
                make_deb
                ;;
            --clean-db)
                clean_db
                ;;
            --clean)
                cleanup
                ;;
            --help|-h)
                echo "Uso: $0 [opção]"
                echo
                echo "Opções:"
                echo "  --full       Build completo"
                echo "  --deps-only  Apenas verificar e instalar dependências"
                echo "  --build-only Apenas build"
                echo "  --deb-only   Apenas gerar .deb"
                echo "  --clean-db   Limpar banco de dados"
                echo "  --clean      Limpar arquivos temporários"
                echo "  --help       Mostrar esta ajuda"
                echo
                echo "Sem argumentos: modo interativo"
                ;;
            *)
                error "Opção inválida: $1. Use --help para ver as opções disponíveis."
                ;;
        esac
    fi
}

# Trap para limpeza em caso de interrupção
trap 'echo -e "\n${YELLOW}Build interrompido pelo usuário${NC}"; exit 1' INT TERM

# Executar função principal
main "$@"