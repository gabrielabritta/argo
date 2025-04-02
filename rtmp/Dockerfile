FROM alpine:3.18

# Instalar dependências
RUN apk add --no-cache nginx nginx-mod-rtmp ffmpeg

# Verificar se o módulo RTMP está instalado
RUN ls -la /usr/lib/nginx/modules/ngx_rtmp_module.so

# Criar diretório para logs
RUN mkdir -p /var/log/nginx

# Criar diretório para HLS
RUN mkdir -p /tmp/hls

# Copiar configurações
COPY nginx.conf /etc/nginx/nginx.conf
COPY rtmp.conf /etc/nginx/rtmp.conf

# Expor portas
EXPOSE 1935
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"] 