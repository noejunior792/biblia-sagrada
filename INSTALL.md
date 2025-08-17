# 🚀 Guia de Instalação - Bíblia Sagrada

Este guia irá te ajudar a instalar e configurar o aplicativo da Bíblia Sagrada no Ubuntu/Debian.

## 📋 Requisitos do Sistema

### Mínimos
- **OS**: Ubuntu 18.04+ ou Debian 10+
- **Arquitetura**: x64 (64-bit)
- **RAM**: 2 GB
- **Armazenamento**: 500 MB livres
- **Node.js**: 18.0+ (apenas para desenvolvimento)

### Recomendados
- **OS**: Ubuntu 22.04 LTS
- **RAM**: 4 GB
- **Armazenamento**: 1 GB livres
- **Resolução**: 1024x768 ou superior

## 🎯 Instalação Rápida (Usuário Final)

### Opção 1: Instalação via .deb (Recomendado)

1. **Baixe o pacote .deb**:
   ```bash
   wget https://github.com/bibliasagrada/app/releases/latest/download/biblia-sagrada.deb
   ```

2. **Instale o pacote**:
   ```bash
   sudo dpkg -i biblia-sagrada.deb
   sudo apt install -f  # Corrigir dependências se necessário
   ```

3. **Execute o aplicativo**:
   ```bash
   biblia-sagrada
   ```
   
   Ou encontre "Bíblia Sagrada" no menu de aplicativos.

### Opção 2: Instalação via AppImage

1. **Baixe o AppImage**:
   ```bash
   wget https://github.com/bibliasagrada/app/releases/latest/download/biblia-sagrada.AppImage
   ```

2. **Torne executável e execute**:
   ```bash
   chmod +x biblia-sagrada.AppImage
   ./biblia-sagrada.AppImage
   ```

## 🔧 Build e Instalação (Desenvolvedores)

### Preparação do Ambiente

1. **Instale o Node.js 18+**:
   ```bash
   # Via NodeSource (recomendado)
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Ou via snap
   sudo snap install node --classic
   ```

2. **Instale dependências do sistema**:
   ```bash
   sudo apt update
   sudo apt install -y \
     git \
     build-essential \
     libnss3-dev \
     libatk-bridge2.0-dev \
     libxkbcomposite-dev \
     libxdamage-dev \
     libxrandr-dev \
     libgbm-dev \
     libxss-dev \
     libasound2-dev
   ```

### Build do Projeto

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/bibliasagrada/app.git
   cd app
   ```

2. **Execute o script de build automatizado**:
   ```bash
   ./build.sh
   ```
   
   Ou manualmente:
   ```bash
   npm install
   npm run make:deb
   ```

3. **Instale o pacote gerado**:
   ```bash
   sudo dpkg -i out/make/deb/x64/*.deb
   ```

## 🐳 Build com Docker

Para um ambiente de build isolado:

```bash
# Build da imagem
docker build -t biblia-build .

# Extrair o .deb
docker run --rm -v $(pwd):/host biblia-build

# O arquivo .deb será copiado para o diretório atual
```

## 🔍 Verificação da Instalação

Após a instalação, verifique se tudo está funcionando:

```bash
# Verificar se o comando está disponível
which biblia-sagrada

# Verificar versão
biblia-sagrada --version

# Testar execução
biblia-sagrada --help
```

## ⚠️ Solução de Problemas

### Erro: "Package dependencies not met"
```bash
sudo apt update
sudo apt install -f
```

### Erro: "libnode.so not found"
```bash
sudo apt install nodejs-dev
```

### Aplicativo não abre
1. Execute via terminal para ver erros:
   ```bash
   biblia-sagrada --verbose
   ```

2. Verifique logs:
   ```bash
   journalctl --user -f
   ```

### Problemas com GPU/Renderização
```bash
# Executar com renderização por software
biblia-sagrada --disable-gpu
```

## 🗑️ Desinstalação

### Via .deb
```bash
sudo apt remove biblia-sagrada
```

### Via AppImage
```bash
rm biblia-sagrada.AppImage
rm -rf ~/.config/biblia-sagrada  # Remove configurações
```

### Limpeza Completa
```bash
# Remove aplicativo e dados
sudo apt remove --purge biblia-sagrada
rm -rf ~/.config/biblia-sagrada
rm -rf ~/.local/share/biblia-sagrada
```

## 📁 Localizações dos Arquivos

- **Executável**: `/usr/bin/biblia-sagrada`
- **Dados do app**: `/usr/share/biblia-sagrada/`
- **Configurações**: `~/.config/biblia-sagrada/`
- **Banco de dados**: `~/.local/share/biblia-sagrada/biblia.db`
- **Logs**: `~/.local/share/biblia-sagrada/logs/`

## 🔐 Permissões

O aplicativo precisa das seguintes permissões:
- **Leitura/Escrita**: Para salvar configurações e dados
- **Rede**: Para futuras funcionalidades (opcional)
- **Notificações**: Para versículo do dia (opcional)

## 🔄 Atualizações

### Via .deb
```bash
# Baixar nova versão e instalar
sudo dpkg -i biblia-sagrada-nova-versao.deb
```

### Via AppImage
```bash
# Substituir arquivo antigo pelo novo
rm biblia-sagrada.AppImage
wget https://github.com/bibliasagrada/app/releases/latest/download/biblia-sagrada.AppImage
chmod +x biblia-sagrada.AppImage
```

## 🆘 Suporte

### Problemas Conhecidos
- **Ubuntu 16.04**: Não suportado (Node.js muito antigo)
- **32-bit**: Não suportado
- **Wayland**: Funciona, mas pode ter problemas visuais menores

### Obter Ajuda
- **Issues**: https://github.com/bibliasagrada/app/issues
- **Discussões**: https://github.com/bibliasagrada/app/discussions
- **Email**: suporte@bibliasagrada.com

### Relatando Bugs
1. Inclua versão do sistema: `lsb_release -a`
2. Inclua logs de erro
3. Descreva passos para reproduzir
4. Screenshots se aplicável

## 📚 Recursos Adicionais

- **Manual do Usuário**: [MANUAL.md](MANUAL.md)
- **FAQ**: [FAQ.md](FAQ.md)
- **Atalhos de Teclado**: [SHORTCUTS.md](SHORTCUTS.md)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

---

**Precisa de ajuda?** Abra uma [issue](https://github.com/bibliasagrada/app/issues) ou consulte nossa [documentação completa](https://docs.bibliasagrada.com).