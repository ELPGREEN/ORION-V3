/**
 * Orion ARC-AGI-3 System Integrator
 * Unifies Decision Core, Robotics, Swarm, and Financial modules
 * with existing IoT Bridge, ROS2, and Smart Home infrastructure
 */

import { LogManager, Logger } from '../core/log-manager';
import { ArcDecisionCore, type DecisionContext, type DecisionResult } from './arc-decision-core';
import { ArcRoboticsPerception, type RobotPose, type FusionResult } from './arc-robotics-perception';
import { ArcSwarmCoordination, type Agent, type SwarmTask, type FormationConfig } from './arc-swarm-coordination';
import { ArcFinancialTrading, type MarketTick, type TradingSignal, type RiskMetrics } from './arc-financial-trading';
import { iotBridge, type IoTDevice } from './iot-device-bridge';
import { SmartHomeController, type SmartDeviceState } from './smart-home-controller';
import { bluetoothManager } from './bluetooth-manager';

export interface IntegratedAgent {
  id: string;
  type: 'iot' | 'robot' | 'swarm' | 'trading';
  capabilities: string[];
  state: 'idle' | 'active' | 'busy';
  energy?: number;
  position?: { x: number; y: number; z: number };
}

export interface SystemIntegrationStatus {
  decisionCore: boolean;
  roboticsPerception: boolean;
  swarmCoordination: boolean;
  financialTrading: boolean;
  iotBridge: boolean;
  ros2Bridge: boolean;
  smartHome: boolean;
}

export class ArcSystemIntegrator {
  private logger: Logger;
  private decisionCore: ArcDecisionCore;
  private roboticsPerception: ArcRoboticsPerception;
  private swarmCoordination: ArcSwarmCoordination;
  private financialTrading: ArcFinancialTrading;
  private smartHomeController: SmartHomeController;
  private agents: Map<string, IntegratedAgent> = new Map();
  private isInitialized = false;

  constructor() {
    this.logger = LogManager.getInstance().createLogger('ArcSystemIntegrator');
    this.decisionCore = new ArcDecisionCore();
    this.roboticsPerception = new ArcRoboticsPerception();
    this.swarmCoordination = new ArcSwarmCoordination();
    this.financialTrading = new ArcFinancialTrading();
    this.smartHomeController = new SmartHomeController();
    this.logger.info('ArcSystemIntegrator created');
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing ARC-AGI-3 System Integration...');

    await this.roboticsPerception.initialize();

    await this.syncIoTDevicesToSwarm();

    this.setupIoTEventListeners();

    this.isInitialized = true;
    this.logger.info('ARC-AGI-3 System fully integrated');
  }

  private async syncIoTDevicesToSwarm(): Promise<void> {
    const devices = iotBridge.deviceList;

    for (const device of devices) {
      const agent: IntegratedAgent = {
        id: device.id,
        type: this.mapDeviceTypeToAgentType(device.type),
        capabilities: this.getDeviceCapabilities(device),
        state: device.status === 'online' ? 'idle' : 'idle',
        energy: device.type === 'robot' ? 100 : undefined,
      };

      this.agents.set(device.id, agent);
      await this.swarmCoordination.registerAgent({
        id: device.id,
        type: device.type,
        position: { x: 0, y: 0, z: 0 },
        state: 'idle',
        capabilities: agent.capabilities,
        energy: 100,
      });
    }

    this.logger.info(`Synced ${devices.length} IoT devices to swarm coordination`);
  }

  private mapDeviceTypeToAgentType(deviceType: string): 'iot' | 'robot' | 'swarm' | 'trading' {
    if (deviceType === 'robot') return 'robot';
    return 'iot';
  }

  private getDeviceCapabilities(device: IoTDevice): string[] {
    const capabilities: string[] = [];
    if (device.type === 'light') capabilities.push('control_light', 'adjust_brightness', 'set_color');
    if (device.type === 'plug') capabilities.push('control_power', 'monitor_power');
    if (device.type === 'sensor') capabilities.push('read_sensor', 'monitor');
    if (device.type === 'robot') capabilities.push('navigate', 'manipulate', 'sense');
    if (device.type === 'camera') capabilities.push('stream_video', 'detect_motion');
    if (device.type === 'thermostat') capabilities.push('set_temperature', 'monitor_climate');
    if (device.type === 'speaker') capabilities.push('play_audio', 'voice_output');
    return capabilities;
  }

  private setupIoTEventListeners(): void {
    iotBridge.on((event) => {
      if (event.type === 'device_update') {
        const device = event.data as IoTDevice;
        this.handleIoTDeviceUpdate(device);
      }
      if (event.type === 'message') {
        this.handleIoTMessage(event.data);
      }
    });
  }

  private async handleIoTDeviceUpdate(device: IoTDevice): Promise<void> {
    const agent = this.agents.get(device.id);
    if (agent) {
      agent.state = device.status === 'online' ? 'idle' : 'idle';
    }

    if (device.type === 'sensor' && device.lastValue !== undefined) {
      this.roboticsPerception.addSensorReading({
        type: 'ultrasonic',
        data: device.lastValue,
        timestamp: Date.now(),
        confidence: device.status === 'online' ? 0.9 : 0.1,
      });
    }
  }

  private async handleIoTMessage(message: { topic: string; payload: any }): Promise<void> {
    const context: DecisionContext = {
      objective: `Handle IoT message on ${message.topic}`,
      constraints: ['maintain system stability', 'minimize energy usage'],
      availableActions: ['log', 'forward_to_swarm', 'trigger_action', 'ignore'],
      currentState: {
        topic: message.topic,
        payload: message.payload,
        timestamp: Date.now(),
        connected_devices: this.agents.size,
      },
    };

    const decision = await this.decisionCore.decide(context);

    if (decision.action === 'forward_to_swarm') {
      await this.swarmCoordination.broadcast('orion_core', {
        type: 'iot_event',
        topic: message.topic,
        payload: message.payload,
      });
    }
  }

  async controlSmartDevice(deviceId: string, action: string, params?: Record<string, unknown>): Promise<boolean> {
    const device = iotBridge.deviceList.find(d => d.id === deviceId);
    if (!device) return false;

    const context: DecisionContext = {
      objective: `Control device ${deviceId}: ${action}`,
      constraints: ['safe operation', 'user preferences'],
      availableActions: ['execute', 'delay', 'cancel'],
      currentState: {
        deviceType: device.type,
        deviceStatus: device.status,
        action,
        params,
      },
    };

    const decision = await this.decisionCore.decide(context);

    if (decision.action !== 'execute' || decision.confidence < 0.5) {
      this.logger.warn(`Control rejected: ${decision.reasoning}`);
      return false;
    }

    if (device.type === 'light' || device.type === 'plug') {
      const topic = device.topic.replace('home/', 'command/');
      const command = action === 'on' ? 'ON' : 'OFF';
      await iotBridge.publish(topic, { state: command });
      return true;
    }

    return false;
  }

  async coordinateRoboticsTask(goal: string, robotIds: string[]): Promise<string> {
    const context: DecisionContext = {
      objective: goal,
      constraints: ['avoid collisions', 'minimize time', 'conserve energy'],
      availableActions: ['navigate', 'manipulate', 'scan', 'report', 'wait'],
      currentState: {
        robotCount: robotIds.length,
        goal,
        timestamp: Date.now(),
      },
      timeHorizon: 300,
    };

    const decision = await this.decisionCore.decide(context);

    const task = await this.swarmCoordination.createTask({
      type: 'custom',
      priority: 5,
      assignedAgents: robotIds,
      parameters: { goal, decision },
    });

    return task;
  }

  async processTradingTick(tick: MarketTick): Promise<void> {
    await this.financialTrading.processTick(tick);
  }

  async triggerFinancialDecision(signal: TradingSignal): Promise<void> {
    this.logger.info(`Trading signal: ${signal.action} ${signal.symbol} @ ${signal.confidence.toFixed(2)}`);
  }

  getIntegratedStatus(): SystemIntegrationStatus {
    return {
      decisionCore: true,
      roboticsPerception: this.roboticsPerception.getStatistics().isInitialized,
      swarmCoordination: this.swarmCoordination.getStatistics().totalAgents > 0,
      financialTrading: !this.financialTrading.getStatistics().isHalted,
      iotBridge: iotBridge.connected,
      ros2Bridge: false,
      smartHome: this.smartHomeController !== null,
    };
  }

  getAgents(): IntegratedAgent[] {
    return Array.from(this.agents.values());
  }

  getSwarmStats() {
    return this.swarmCoordination.getStatistics();
  }

  getFinancialStats() {
    return this.financialTrading.getStatistics();
  }

  getRiskMetrics(): RiskMetrics {
    return this.financialTrading.getRiskMetrics();
  }

  async setFormation(config: FormationConfig): Promise<void> {
    await this.swarmCoordination.setFormation(config);
  }

  async executeSwarmTask(taskType: SwarmTask['type'], priority: number): Promise<string> {
    const task = await this.swarmCoordination.createTask({
      type: taskType,
      priority,
      assignedAgents: [],
      parameters: {},
    });
    return task;
  }

  getRoboticsPose(): RobotPose {
    return this.roboticsPerception.getPose();
  }

  getFusionResult(): FusionResult {
    return this.roboticsPerception.getPose() as unknown as FusionResult;
  }

  async decision(query: string): Promise<DecisionResult> {
    const context: DecisionContext = {
      objective: query,
      constraints: ['safe', 'efficient', 'user-aligned'],
      availableActions: ['execute', 'explain', 'suggest', 'cancel'],
      currentState: {
        agents: this.agents.size,
        swarmLeader: this.swarmCoordination.getLeader()?.id || 'none',
        tradingActive: !this.financialTrading.getStatistics().isHalted,
      },
    };

    return this.decisionCore.decide(context);
  }
}

export const arcSystemIntegrator = new ArcSystemIntegrator();
