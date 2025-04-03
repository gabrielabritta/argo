O plano é:
1- Criar um "servidor" rtmp estavel e confiavel, dentro de um container docker
2- Receber video de uma webcam, e exibir na tela usando o endereço IP do server e uma key
3- Inicialmente a key deve ser fixa.
4- As tecnologias usadas devem deixar a transmissão o mais estavel possível, e com a menor latencia possivel;

Antes de TUDO:
Começar do zero, e apagar todos os arquivos existentes relacionados a isso: Stream360.js e pasta rtmp
Use outros arquivos da pasta components do client para verificar estrutura de codigo de CoreUI.
Use "docker compose" sem hifen no terminal, para economizar

No fim de cada etapa, atualize o PLAN.md, para mantermos tracking do que esta acontecendo

## Progresso - 03/04/2025

### Etapa 1: Criação do Servidor RTMP ✅

- Servidor RTMP implementado usando Docker com a imagem alfg/nginx-rtmp
- Configuração do nginx otimizada para baixa latência:
  - Buffer reduzido para 100ms
  - Configurações HLS otimizadas (fragmentos de 2s)
  - Conversão RTMP para HLS para compatibilidade com navegadores
- Interface web básica criada em HTML/JS para visualização do stream
- Testado com:
  - OBS Studio: rtmp://localhost:1935/live/stream
  - FFmpeg: ffmpeg -f v4l2 -i /dev/video0 -c:v libx264 -preset ultrafast -tune zerolatency -b:v 2500k -f flv rtmp://localhost:1935/live/stream

### Próximos Passos

- Integrar o player na interface do cliente CoreUI
- Implementar controle de acesso com chave fixa
- Testar e otimizar para estabilidade e latência