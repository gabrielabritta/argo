# Argo Project

Este repositório contém o código do projeto Argo, que inclui o backend em Django e o frontend usando CoreUI e Leaflet.js.

## Começando

Clone o repositório:

```bash
git clone https://github.com/gabrielabritta/argo.git
cd argo
```

## Pré-requisitos

### 1. Instalação do Docker

#### Windows
1. Baixe o Docker Desktop para Windows no [site oficial do Docker](https://docs.docker.com/desktop/install/windows-install/)
2. Execute o instalador e siga as instruções
3. Inicie o Docker Desktop após a instalação

#### Linux
1. Siga o tutorial oficial do Docker para sua distribuição:
   - [Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
   - [Debian](https://docs.docker.com/engine/install/debian/)
   - [Fedora](https://docs.docker.com/engine/install/fedora/)
   - [CentOS](https://docs.docker.com/engine/install/centos/)

### 2. Atualização dos Submódulos Git

Após clonar o repositório, execute os seguintes comandos para inicializar e atualizar os submódulos:

```bash
git submodule init
git submodule update --recursive
```

## Executando o Projeto

Para iniciar todos os serviços (backend e frontend), execute:

```bash
docker compose up --build
```

Após a inicialização:
- Frontend estará disponível em: http://localhost:3000
- Backend estará disponível em: http://localhost:8000

Para parar os serviços, pressione `Ctrl+C` ou execute em outro terminal:

```bash
docker compose down
```
