import mqtt from 'mqtt';

// Configurar URL do broker MQTT WebSocket
// Usamos o hostname atual com a porta 9001 que é o WebSocket do broker MQTT
const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const host = window.location.hostname;
const mqttUrl = `${protocol}://${host}:9001`;

// Opções de conexão
const options = {
  clientId: 'argo_web_client_' + Math.random().toString(16).substr(2, 8),
  clean: true,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000
};

// Criar cliente MQTT
const client = mqtt.connect(mqttUrl, options);

// Configurar event handlers
client.on('connect', () => {
  console.log('Conectado ao broker MQTT');
});

client.on('error', (err) => {
  console.error('Erro MQTT:', err);
});

client.on('offline', () => {
  console.warn('Cliente MQTT está offline');
});

client.on('reconnect', () => {
  console.log('Tentando reconectar ao broker MQTT');
});

// Exportar o cliente MQTT
export const mqttClient = client;
