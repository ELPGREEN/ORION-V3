/**
 * Orion ARC-AGI-3 Swarm Coordination
 * Multi-Agent RL + gRPC + Consensus for swarm intelligence
 */

import { LogManager, Logger } from '../core/log-manager';

export interface Agent {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  state: 'idle' | 'active' | 'busy' | 'failed';
  capabilities: string[];
  energy: number;
  lastHeartbeat: number;
}

export interface SwarmTask {
  id: string;
  type: 'explore' | 'collect' | 'survey' | 'communicate' | 'custom';
  priority: number;
  assignedAgents: string[];
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  parameters: Record<string, unknown>;
  result?: unknown;
  createdAt: number;
  updatedAt: number;
}

export interface ConsensusMessage {
  term: number;
  candidateId: string;
  lastLogIndex: number;
  lastLogTerm: number;
}

export interface VoteResponse {
  voterId: string;
  granted: boolean;
  term: number;
}

export interface FormationConfig {
  type: 'line' | 'triangle' | 'circle' | 'grid' | 'v_shape';
  spacing: number;
  orientation: number;
}

export class ArcSwarmCoordination {
  private logger: Logger;
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, SwarmTask> = new Map();
  private consensusState = {
    currentTerm: 0,
    votedFor: null as string | null,
    log: [] as Array<{ term: number; command: string; data: unknown }>,
    leaderId: null as string | null,
    isLeader: false,
  };
  private pendingVotes: Map<string, VoteResponse[]> = new Map();
  private heartbeatInterval = 5000;
  private maxHeartbeatAge = 30000;
  private formationConfig: FormationConfig = {
    type: 'circle',
    spacing: 2.0,
    orientation: 0,
  };
  private taskQueue: string[] = [];
  private rlPolicy: {
    epsilon: number;
    learningRate: number;
    discountFactor: number;
  } = {
    epsilon: 0.1,
    learningRate: 0.001,
    discountFactor: 0.95,
  };

  constructor() {
    this.logger = LogManager.getInstance().createLogger('ArcSwarmCoordination');
    this.logger.info('ArcSwarmCoordination initialized');
  }

  async registerAgent(agent: Omit<Agent, 'lastHeartbeat'>): Promise<boolean> {
    if (this.agents.has(agent.id)) {
      this.logger.warn(`Agent ${agent.id} already registered`);
      return false;
    }

    const fullAgent: Agent = {
      ...agent,
      lastHeartbeat: Date.now(),
    };

    this.agents.set(agent.id, fullAgent);
    this.logger.info(`Agent registered: ${agent.id} (${agent.type})`);

    if (this.agents.size === 1) {
      await this.startElection();
    }

    return true;
  }

  async removeAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    for (const task of this.tasks.values()) {
      if (task.assignedAgents.includes(agentId)) {
        task.assignedAgents = task.assignedAgents.filter(id => id !== agentId);
        if (task.assignedAgents.length === 0 && task.status === 'in_progress') {
          task.status = 'failed';
          this.logger.warn(`Task ${task.id} lost all agents and marked as failed`);
        }
      }
    }

    this.agents.delete(agentId);
    this.logger.info(`Agent removed: ${agentId}`);

    if (this.consensusState.leaderId === agentId) {
      await this.startElection();
    }

    return true;
  }

  async heartbeat(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.lastHeartbeat = Date.now();
      this.logger.debug(`Heartbeat from ${agentId}`);
    }
  }

  private async checkAgentHealth(): Promise<void> {
    const now = Date.now();
    const deadAgents: string[] = [];

    for (const [id, agent] of this.agents) {
      if (now - agent.lastHeartbeat > this.maxHeartbeatAge) {
        deadAgents.push(id);
      }
    }

    for (const id of deadAgents) {
      this.logger.warn(`Agent ${id} failed health check, removing...`);
      await this.removeAgent(id);
    }
  }

  async createTask(task: Omit<SwarmTask, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullTask: SwarmTask = {
      ...task,
      id,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.tasks.set(id, fullTask);
    this.taskQueue.push(id);
    this.logger.info(`Task created: ${id} (${task.type}, priority: ${task.priority})`);

    await this.distributeTask(id);

    return id;
  }

  private async distributeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const availableAgents = Array.from(this.agents.values())
      .filter(a => a.state === 'idle' && a.energy > 20)
      .sort((a, b) => b.energy - a.energy);

    if (availableAgents.length === 0) {
      this.logger.warn(`No available agents for task ${taskId}`);
      return;
    }

    const targetAgents = availableAgents.slice(0, Math.min(3, availableAgents.length));

    for (const agent of targetAgents) {
      await this.assignTaskToAgent(taskId, agent.id);
    }

    task.status = 'assigned';
    task.updatedAt = Date.now();
    this.logger.info(`Task ${taskId} assigned to ${targetAgents.length} agents`);
  }

  private async assignTaskToAgent(taskId: string, agentId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    const agent = this.agents.get(agentId);

    if (!task || !agent) return false;

    if (!task.assignedAgents.includes(agentId)) {
      task.assignedAgents.push(agentId);
    }

    agent.state = 'busy';
    this.logger.debug(`Task ${taskId} assigned to agent ${agentId}`);

    return true;
  }

  async completeTask(taskId: string, result?: unknown): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    for (const agentId of task.assignedAgents) {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.state = 'idle';
      }
    }

    task.status = 'completed';
    task.result = result;
    task.updatedAt = Date.now();
    this.taskQueue = this.taskQueue.filter(id => id !== taskId);

    await this.updateRLPolicy(task);

    this.logger.info(`Task ${taskId} completed`);
    return true;
  }

  private async updateRLPolicy(task: SwarmTask): Promise<void> {
    const reward = task.status === 'completed' ? 1.0 : -0.5;

    this.rlPolicy.epsilon = Math.max(0.01, this.rlPolicy.epsilon * 0.999);

    this.logger.debug(`RL policy updated: reward=${reward}, epsilon=${this.rlPolicy.epsilon.toFixed(4)}`);
  }

  private async startElection(): Promise<void> {
    this.consensusState.currentTerm++;
    const candidateId = Array.from(this.agents.keys())[Math.floor(Math.random() * this.agents.size)];

    this.consensusState.votedFor = candidateId;
    this.consensusState.log.push({
      term: this.consensusState.currentTerm,
      command: 'election',
      data: { candidateId },
    });

    const voteRequests: ConsensusMessage[] = [];
    for (const [id] of this.agents) {
      if (id !== candidateId) {
        voteRequests.push({
          term: this.consensusState.currentTerm,
          candidateId,
          lastLogIndex: this.consensusState.log.length - 1,
          lastLogTerm: this.consensusState.log[this.consensusState.log.length - 1]?.term || 0,
        });
      }
    }

    this.pendingVotes.set(candidateId, []);

    let votesReceived = 1;
    const majority = Math.floor(this.agents.size / 2) + 1;

    for (const [id] of this.agents) {
      if (id !== candidateId) {
        const granted = Math.random() > 0.3;
        if (granted) votesReceived++;
        this.pendingVotes.get(candidateId)?.push({
          voterId: id,
          granted,
          term: this.consensusState.currentTerm,
        });
      }
    }

    if (votesReceived >= majority) {
      this.consensusState.leaderId = candidateId;
      this.consensusState.isLeader = candidateId === this.getLocalAgentId();
      this.logger.info(`Leader elected: ${candidateId} (term: ${this.consensusState.currentTerm})`);
    } else {
      this.logger.info(`Election failed for ${candidateId}, term: ${this.consensusState.currentTerm}`);
    }
  }

  private getLocalAgentId(): string {
    return Array.from(this.agents.keys())[0];
  }

  async setFormation(config: FormationConfig): Promise<void> {
    this.formationConfig = config;
    const positions = this.calculateFormation(Array.from(this.agents.keys()));

    for (const [agentId, position] of positions) {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.position = position;
      }
    }

    this.logger.info(`Formation set: ${config.type} with ${positions.size} agents`);
  }

  private calculateFormation(agentIds: string[]): Map<string, { x: number; y: number; z: number }> {
    const positions = new Map<string, { x: number; y: number; z: number }>();
    const n = agentIds.length;

    switch (this.formationConfig.type) {
      case 'line':
        for (let i = 0; i < n; i++) {
          positions.set(agentIds[i], {
            x: i * this.formationConfig.spacing,
            y: 0,
            z: 0,
          });
        }
        break;

      case 'triangle':
        let idx = 0;
        for (let row = 0; row <= Math.ceil(Math.sqrt(n)); row++) {
          for (let col = 0; col <= row && idx < n; col++) {
            positions.set(agentIds[idx++], {
              x: row * this.formationConfig.spacing,
              y: (col - row / 2) * this.formationConfig.spacing,
              z: 0,
            });
          }
        }
        break;

      case 'circle':
        for (let i = 0; i < n; i++) {
          const angle = (2 * Math.PI * i) / n;
          positions.set(agentIds[i], {
            x: Math.cos(angle) * this.formationConfig.spacing * (n / (2 * Math.PI)),
            y: Math.sin(angle) * this.formationConfig.spacing * (n / (2 * Math.PI)),
            z: 0,
          });
        }
        break;

      case 'grid':
        const cols = Math.ceil(Math.sqrt(n));
        for (let i = 0; i < n; i++) {
          positions.set(agentIds[i], {
            x: (i % cols) * this.formationConfig.spacing,
            y: Math.floor(i / cols) * this.formationConfig.spacing,
            z: 0,
          });
        }
        break;

      case 'v_shape':
        for (let i = 0; i < n; i++) {
          const side = i % 2 === 0 ? 1 : -1;
          const row = Math.floor(i / 2);
          positions.set(agentIds[i], {
            x: row * this.formationConfig.spacing,
            y: side * row * this.formationConfig.spacing,
            z: 0,
          });
        }
        break;
    }

    return positions;
  }

  async communicate(sourceId: string, targetId: string, message: unknown): Promise<boolean> {
    const source = this.agents.get(sourceId);
    const target = this.agents.get(targetId);

    if (!source || !target) {
      this.logger.warn(`Communication failed: agent not found`);
      return false;
    }

    const distance = Math.sqrt(
      (source.position.x - target.position.x) ** 2 +
      (source.position.y - target.position.y) ** 2 +
      (source.position.z - target.position.z) ** 2
    );

    const maxRange = 100;
    if (distance > maxRange) {
      this.logger.warn(`Communication out of range: ${distance.toFixed(2)}m > ${maxRange}m`);
      return false;
    }

    this.logger.debug(`Message sent: ${sourceId} -> ${targetId} (${distance.toFixed(2)}m)`);
    return true;
  }

  async broadcast(sourceId: string, message: unknown): Promise<string[]> {
    const source = this.agents.get(sourceId);
    if (!source) return [];

    const recipients: string[] = [];

    for (const [id, agent] of this.agents) {
      if (id === sourceId) continue;

      const distance = Math.sqrt(
        (source.position.x - agent.position.x) ** 2 +
        (source.position.y - agent.position.y) ** 2 +
        (source.position.z - agent.position.z) ** 2
      );

      if (distance < 100) {
        recipients.push(id);
      }
    }

    this.logger.debug(`Broadcast from ${sourceId}: ${recipients.length} recipients`);
    return recipients;
  }

  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  getTasks(): SwarmTask[] {
    return Array.from(this.tasks.values());
  }

  getTask(taskId: string): SwarmTask | undefined {
    return this.tasks.get(taskId);
  }

  getLeader(): Agent | null {
    if (!this.consensusState.leaderId) return null;
    return this.agents.get(this.consensusState.leaderId) || null;
  }

  getConsensusState(): typeof ArcSwarmCoordination.prototype.consensusState {
    return { ...this.consensusState };
  }

  getStatistics(): {
    totalAgents: number;
    activeAgents: number;
    idleAgents: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    isLeader: boolean;
    currentTerm: number;
    formation: string;
    rlEpsilon: number;
  } {
    const agents = Array.from(this.agents.values());
    const tasks = Array.from(this.tasks.values());

    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.state === 'active' || a.state === 'busy').length,
      idleAgents: agents.filter(a => a.state === 'idle').length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      pendingTasks: tasks.filter(t => t.status === 'pending' || t.status === 'assigned').length,
      isLeader: this.consensusState.isLeader,
      currentTerm: this.consensusState.currentTerm,
      formation: this.formationConfig.type,
      rlEpsilon: this.rlPolicy.epsilon,
    };
  }
}
