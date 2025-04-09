/**
 * RoverSimulation.js
 * 
 * Este módulo implementa uma simulação simplificada do modelo de rover
 * baseado no SkidSteerRoverModel da pasta RoverModel.
 */

class MotorModel {
  constructor(maxTorque, resistance, kt, ke, friction, inertia, pwmMax, dampingFactor) {
    this.maxTorque = maxTorque;
    this.resistance = resistance;
    this.kt = kt;
    this.ke = ke;
    this.friction = friction;
    this.inertia = inertia;
    this.pwmMax = pwmMax;
    this.dampingFactor = dampingFactor;
    
    this.current = 0;
    this.torque = 0;
    this.angularVelocity = 0;
  }
  
  updateTorque(pwm, dt, batteryVoltage) {
    // Versão simplificada do modelo do motor
    const voltage = (pwm / this.pwmMax) * batteryVoltage;
    const voltageInduced = this.ke * this.angularVelocity;
    const voltageNet = voltage - voltageInduced;
    
    // Atualiza corrente
    const diDt = (voltageNet - this.current * this.resistance) / 0.2; // Indutância fixa
    this.current += diDt * dt;
    this.current = Math.min(Math.max(this.current, -50), 50); // Limita corrente
    
    // Calcula torque
    this.torque = this.kt * this.current - this.friction * this.angularVelocity;
    
    // Atualiza velocidade angular
    const angularAcceleration = (this.torque - this.dampingFactor * this.angularVelocity) / this.inertia;
    this.angularVelocity += angularAcceleration * dt;
    
    return this.torque;
  }
}

class RoverModel {
  constructor(mass, inertia, wheelbase, wheelRadius, rotResistance, dragCoef, rollingCoef) {
    this.mass = mass;
    this.inertia = inertia;
    this.wheelbase = wheelbase;
    this.wheelRadius = wheelRadius;
    this.rotResistance = rotResistance;
    this.dragCoef = dragCoef;
    this.rollingCoef = rollingCoef;
    
    // Cria os motores
    this.motorLeft = new MotorModel(80, 1.0, 0.08, 0.05, 0.01, 0.01, 100, 0.05);
    this.motorRight = new MotorModel(80, 1.0, 0.08, 0.05, 0.01, 0.01, 100, 0.05);
    
    // Estado inicial
    this.state = {
      x: 0,
      y: 0,
      theta: 0,
      v: 0,
      omega: 0
    };
  }
  
  dynamics(pwmLeft, pwmRight, dt, batteryVoltage) {
    // Atualiza os motores
    const tauLeft = this.motorLeft.updateTorque(pwmLeft, dt, batteryVoltage);
    const tauRight = this.motorRight.updateTorque(pwmRight, dt, batteryVoltage);
    
    // Velocidades das rodas
    const omegaLeft = tauLeft / (this.mass * this.wheelRadius);
    const omegaRight = tauRight / (this.mass * this.wheelRadius);
    
    // Velocidade linear e angular do veículo
    const vNew = (this.wheelRadius / 2) * (omegaRight + omegaLeft);
    const omegaNew = (this.wheelRadius / this.wheelbase) * (omegaRight - omegaLeft);
    
    // Resistências
    const fDrag = this.dragCoef * this.state.v * this.state.v;
    const fRolling = this.rollingCoef * this.state.v;
    const fResistance = fDrag + fRolling;
    
    // Atualiza velocidades
    this.state.v = vNew - (fResistance / this.mass) * dt;
    this.state.omega = omegaNew - (this.rotResistance / this.inertia) * this.state.omega * dt;
    
    // Atualiza posição
    this.state.x += this.state.v * Math.cos(this.state.theta) * dt;
    this.state.y += this.state.v * Math.sin(this.state.theta) * dt;
    this.state.theta += this.state.omega * dt;
    
    // Normaliza o ângulo
    this.state.theta = this.state.theta % (2 * Math.PI);
    
    return { ...this.state };
  }
  
  getState() {
    return { ...this.state };
  }
  
  setState(state) {
    this.state = { ...state };
  }
}

class RoverSimulation {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Canvas with id ${canvasId} not found`);
      return;
    }
    
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    
    // Cria o modelo do rover
    this.rover = new RoverModel(10, 3, 0.5, 0.1, 0.3, 0.01, 0.01);
    
    // Configurações de visualização
    this.scale = 20; // pixels por metro
    this.offsetX = this.width / 2;
    this.offsetY = this.height / 2;
    
    // Controles
    this.pwmLeft = 0;
    this.pwmRight = 0;
    this.batteryVoltage = 12;
    
    // Obstáculos (exemplo)
    this.obstacles = [
      { x: 2, y: 1, width: 1, height: 0.5 },
      { x: -3, y: -2, width: 0.5, height: 1 },
      { x: -1, y: 2, width: 0.8, height: 0.8 }
    ];
    
    // Inicializa a simulação
    this.lastTime = Date.now();
    this.running = false;
  }
  
  start() {
    if (this.running) return;
    this.running = true;
    this.animate();
  }
  
  stop() {
    this.running = false;
  }
  
  setControls(direction) {
    // Mapeia direções para valores PWM
    switch (direction) {
      case 'forward':
        this.pwmLeft = 50;
        this.pwmRight = 50;
        break;
      case 'backward':
        this.pwmLeft = -50;
        this.pwmRight = -50;
        break;
      case 'left':
        this.pwmLeft = -30;
        this.pwmRight = 30;
        break;
      case 'right':
        this.pwmLeft = 30;
        this.pwmRight = -30;
        break;
      case 'stop':
      default:
        this.pwmLeft = 0;
        this.pwmRight = 0;
        break;
    }
  }
  
  animate() {
    if (!this.running) return;
    
    const now = Date.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // Limita dt para evitar instabilidades
    this.lastTime = now;
    
    // Atualiza o modelo
    const state = this.rover.dynamics(this.pwmLeft, this.pwmRight, dt, this.batteryVoltage);
    
    // Atualiza os elementos da UI
    this.updateUI(state);
    
    // Renderiza
    this.render();
    
    // Continua a animação
    requestAnimationFrame(() => this.animate());
  }
  
  updateUI(state) {
    // Atualiza os elementos da UI com os valores do estado
    const xElement = document.getElementById('rover-x');
    const yElement = document.getElementById('rover-y');
    const thetaElement = document.getElementById('rover-theta');
    
    if (xElement) xElement.textContent = state.x.toFixed(2);
    if (yElement) yElement.textContent = state.y.toFixed(2);
    if (thetaElement) thetaElement.textContent = ((state.theta * 180 / Math.PI) % 360).toFixed(1);
  }
  
  render() {
    // Limpa o canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Desenha a grade
    this.drawGrid();
    
    // Desenha os obstáculos
    this.drawObstacles();
    
    // Desenha o rover
    this.drawRover();
  }
  
  drawGrid() {
    const gridSize = 1; // 1 metro
    const numCells = Math.max(this.width, this.height) / (gridSize * this.scale);
    
    this.ctx.strokeStyle = '#ddd';
    this.ctx.lineWidth = 0.5;
    
    // Linhas horizontais
    for (let i = -numCells; i <= numCells; i++) {
      const y = this.offsetY + i * gridSize * this.scale;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
    
    // Linhas verticais
    for (let i = -numCells; i <= numCells; i++) {
      const x = this.offsetX + i * gridSize * this.scale;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    
    // Eixos principais
    this.ctx.strokeStyle = '#999';
    this.ctx.lineWidth = 1;
    
    // Eixo X
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.offsetY);
    this.ctx.lineTo(this.width, this.offsetY);
    this.ctx.stroke();
    
    // Eixo Y
    this.ctx.beginPath();
    this.ctx.moveTo(this.offsetX, 0);
    this.ctx.lineTo(this.offsetX, this.height);
    this.ctx.stroke();
  }
  
  drawObstacles() {
    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    
    for (const obstacle of this.obstacles) {
      const x = this.offsetX + obstacle.x * this.scale;
      const y = this.offsetY - obstacle.y * this.scale; // Inverte Y para coordenadas de tela
      const width = obstacle.width * this.scale;
      const height = obstacle.height * this.scale;
      
      this.ctx.fillRect(x - width/2, y - height/2, width, height);
    }
  }
  
  drawRover() {
    const state = this.rover.getState();
    const x = this.offsetX + state.x * this.scale;
    const y = this.offsetY - state.y * this.scale; // Inverte Y para coordenadas de tela
    
    // Tamanho do rover
    const roverLength = 0.6 * this.scale;
    const roverWidth = 0.4 * this.scale;
    
    // Salva o contexto atual
    this.ctx.save();
    
    // Translada para a posição do rover
    this.ctx.translate(x, y);
    
    // Rotaciona de acordo com a orientação do rover
    this.ctx.rotate(-state.theta); // Negativo porque o Y da tela é invertido
    
    // Desenha o corpo do rover
    this.ctx.fillStyle = '#3498db';
    this.ctx.fillRect(-roverLength/2, -roverWidth/2, roverLength, roverWidth);
    
    // Desenha as rodas
    this.ctx.fillStyle = '#333';
    // Roda frontal esquerda
    this.ctx.fillRect(-roverLength/2, -roverWidth/2 - 0.1*this.scale, 0.2*this.scale, 0.1*this.scale);
    // Roda frontal direita
    this.ctx.fillRect(-roverLength/2, roverWidth/2, 0.2*this.scale, 0.1*this.scale);
    // Roda traseira esquerda
    this.ctx.fillRect(roverLength/2 - 0.2*this.scale, -roverWidth/2 - 0.1*this.scale, 0.2*this.scale, 0.1*this.scale);
    // Roda traseira direita
    this.ctx.fillRect(roverLength/2 - 0.2*this.scale, roverWidth/2, 0.2*this.scale, 0.1*this.scale);
    
    // Desenha uma seta para indicar a frente
    this.ctx.fillStyle = '#e74c3c';
    this.ctx.beginPath();
    this.ctx.moveTo(roverLength/2, 0);
    this.ctx.lineTo(roverLength/2 - 0.15*this.scale, -0.15*this.scale);
    this.ctx.lineTo(roverLength/2 - 0.15*this.scale, 0.15*this.scale);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Restaura o contexto
    this.ctx.restore();
  }
  
  // Método para adicionar obstáculos
  addObstacle(x, y, width, height) {
    this.obstacles.push({ x, y, width, height });
  }
  
  // Método para limpar obstáculos
  clearObstacles() {
    this.obstacles = [];
  }
  
  // Método para resetar a posição do rover
  resetRover() {
    this.rover.setState({ x: 0, y: 0, theta: 0, v: 0, omega: 0 });
  }
}

export default RoverSimulation;
