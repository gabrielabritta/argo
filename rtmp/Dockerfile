FROM alpine:3.18

RUN apk add --no-cache nginx nginx-mod-rtmp

COPY nginx.conf /etc/nginx/nginx.conf
COPY rtmp.conf /etc/nginx/rtmp.conf

EXPOSE 1935
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 