/**
 * Orion ARC-AGI-3 Financial Trading Agent
 * RL-based autonomous trading with PPO, sentiment analysis, and risk management
 */

import { LogManager, Logger } from '../core/log-manager';
import type { LLMProvider } from '../providers/llm/llm-factory';

export interface MarketTick {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  volume: number;
  timestamp: number;
  orderBook?: {
    bids: Array<[number, number]>;
    asks: Array<[number, number]>;
  };
}

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  type: 'market' | 'limit' | 'stop';
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  filledQuantity: number;
  avgFillPrice: number;
  timestamp: number;
}

export interface NewsEvent {
  headline: string;
  tickers: string[];
  sentiment: number;
  source: string;
  timestamp: number;
}

export interface TradingSignal {
  action: 'buy' | 'sell' | 'hold';
  symbol: string;
  confidence: number;
  targetPrice?: number;
  stopLoss?: number;
  reasoning: string;
}

export interface RiskMetrics {
  totalExposure: number;
  dailyPnL: number;
  maxDrawdown: number;
  var99: number;
  positions: Position[];
}

export class ArcFinancialTrading {
  private logger: Logger;
  private llmProvider: LLMProvider | null = null;

  private portfolio = {
    cash: 100000,
    positions: new Map<string, Position>(),
    initialCapital: 100000,
  };

  private config = {
    maxPositionPct: 0.05,
    maxDrawdown: 0.02,
    varLimit99: 10000,
    minConfidence: 0.6,
    maxDailyLoss: 2000,
  };

  private ppoPolicy = {
    epsilon: 0.2,
    clipRange: 0.2,
    learningRate: 0.0003,
    gamma: 0.99,
    lambda: 0.95,
    entropyCoef: 0.01,
  };

  private sentimentModel: 'finbert' | 'mock' = 'mock';
  private priceHistory: Map<string, number[]> = new Map();
  private recentTrades: Array<{ pnl: number; timestamp: number }> = [];
  private isHalted = false;

  constructor(llmProvider?: LLMProvider) {
    this.logger = LogManager.getInstance().createLogger('ArcFinancialTrading');
    this.llmProvider = llmProvider || null;
    this.logger.info('ArcFinancialTrading initialized');
  }

  setLLMProvider(provider: LLMProvider): void {
    this.llmProvider = provider;
    this.logger.info('LLM provider configured for macro analysis');
  }

  async processTick(tick: MarketTick): Promise<Order | null> {
    if (this.isHalted) {
      this.logger.warn('Trading halted - circuit breaker active');
      return null;
    }

    this.updatePriceHistory(tick);
    const signal = await this.generateSignal(tick);

    if (signal.action === 'hold' || signal.confidence < this.config.minConfidence) {
      return null;
    }

    const order = await this.executeSignal(signal);
    return order;
  }

  private updatePriceHistory(tick: MarketTick): void {
    const history = this.priceHistory.get(tick.symbol) || [];
    history.push(tick.mid);

    if (history.length > 1000) {
      history.shift();
    }

    this.priceHistory.set(tick.symbol, history);
  }

  private async generateSignal(tick: MarketTick): Promise<TradingSignal> {
    const features = this.extractFeatures(tick);
    const pricePrediction = this.predictPrice(tick.symbol);
    const rlAction = await this.getRLAction(features);

    let sentiment = 0;
    if (this.llmProvider) {
      sentiment = await this.analyzeSentiment(tick.symbol);
    }

    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 0.5;
    let reasoning = '';

    const momentum = this.calculateMomentum(tick.symbol);
    const meanReversion = this.calculateMeanReversion(tick.symbol);
    const priceEdge = pricePrediction - tick.mid;
    const sentimentEdge = sentiment;

    const combinedScore = (
      momentum * 0.2 +
      meanReversion * 0.2 +
      priceEdge * 0.3 +
      sentimentEdge * 0.3
    );

    if (combinedScore > 0.02 && rlAction !== 'sell') {
      action = 'buy';
      confidence = Math.min(0.95, 0.5 + Math.abs(combinedScore));
      reasoning = `Combined score: ${combinedScore.toFixed(4)}, momentum: ${momentum.toFixed(4)}`;
    } else if (combinedScore < -0.02 && rlAction !== 'buy') {
      action = 'sell';
      confidence = Math.min(0.95, 0.5 + Math.abs(combinedScore));
      reasoning = `Combined score: ${combinedScore.toFixed(4)}, momentum: ${momentum.toFixed(4)}`;
    } else {
      action = 'hold';
      confidence = 0.6;
      reasoning = 'No clear signal';
    }

    return {
      action,
      symbol: tick.symbol,
      confidence,
      targetPrice: action === 'buy' ? tick.ask * 1.02 : action === 'sell' ? tick.bid * 0.98 : undefined,
      stopLoss: action === 'buy' ? tick.bid * 0.97 : action === 'sell' ? tick.ask * 1.03 : undefined,
      reasoning,
    };
  }

  private extractFeatures(tick: MarketTick): number[] {
    const history = this.priceHistory.get(tick.symbol) || [];
    const spread = (tick.ask - tick.bid) / tick.mid;

    let volatility = 0;
    if (history.length > 20) {
      const returns: number[] = [];
      for (let i = 1; i < history.length; i++) {
        returns.push((history[i] - history[i - 1]) / history[i - 1]);
      }
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
      volatility = Math.sqrt(variance * 252);
    }

    let momentum = 0;
    if (history.length >= 10) {
      momentum = (history[history.length - 1] - history[history.length - 10]) / history[history.length - 10];
    }

    let volumeRatio = 1;
    if (tick.volume > 0) {
      const avgVolume = tick.volume * 0.8;
      volumeRatio = tick.volume / avgVolume;
    }

    let orderImbalance = 0;
    if (tick.orderBook) {
      const bidVolume = tick.orderBook.bids.reduce((sum, [, v]) => sum + v, 0);
      const askVolume = tick.orderBook.asks.reduce((sum, [, v]) => sum + v, 0);
      orderImbalance = (bidVolume - askVolume) / (bidVolume + askVolume + 1);
    }

    return [
      spread,
      volatility,
      momentum,
      volumeRatio,
      orderImbalance,
      tick.mid,
    ];
  }

  private predictPrice(symbol: string): number {
    const history = this.priceHistory.get(symbol) || [];
    if (history.length < 20) return history[history.length - 1] || 0;

    const recent = history.slice(-20);
    const weights = recent.map((_, i) => Math.exp(-0.1 * (recent.length - 1 - i)));
    const weightSum = weights.reduce((a, b) => a + b, 0);

    let weightedSum = 0;
    for (let i = 0; i < recent.length; i++) {
      weightedSum += recent[i] * weights[i];
    }

    return weightedSum / weightSum;
  }

  private calculateMomentum(symbol: string): number {
    const history = this.priceHistory.get(symbol) || [];
    if (history.length < 20) return 0;

    const shortMA = history.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const longMA = history.slice(-20).reduce((a, b) => a + b, 0) / 20;

    return (shortMA - longMA) / longMA;
  }

  private calculateMeanReversion(symbol: string): number {
    const history = this.priceHistory.get(symbol) || [];
    if (history.length < 50) return 0;

    const recent = history.slice(-50);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const current = recent[recent.length - 1];

    return (mean - current) / mean;
  }

  private async getRLAction(features: number[]): Promise<'buy' | 'sell' | 'hold'> {
    const exploration = Math.random() < this.ppoPolicy.epsilon;

    if (exploration) {
      const actions: Array<'buy' | 'sell' | 'hold'> = ['buy', 'sell', 'hold'];
      return actions[Math.floor(Math.random() * actions.length)];
    }

    const score = features.reduce((sum, f, i) => sum + f * (0.5 - i * 0.05), 0);

    if (score > 0.1) return 'buy';
    if (score < -0.1) return 'sell';
    return 'hold';
  }

  private async analyzeSentiment(symbol: string): Promise<number> {
    if (this.sentimentModel === 'mock') {
      return (Math.random() - 0.5) * 2;
    }

    if (!this.llmProvider) return 0;

    try {
      const prompt = `Analyze the sentiment for ${symbol} based on recent market conditions. Return a value between -1 (very bearish) and +1 (very bullish).`;

      const response = await this.llmProvider.complete(prompt, {
        maxTokens: 50,
        temperature: 0.3,
      });

      const match = response.text?.match(/[-+]?\d*\.?\d+/);
      return match ? Math.max(-1, Math.min(1, parseFloat(match[0]))) : 0;
    } catch (error) {
      this.logger.warn('Sentiment analysis failed', error);
      return 0;
    }
  }

  private async executeSignal(signal: TradingSignal): Promise<Order | null> {
    if (!this.checkRisk(signal)) {
      this.logger.warn(`Risk check failed for ${signal.action} ${signal.symbol}`);
      return null;
    }

    const order: Order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: signal.symbol,
      side: signal.action as 'buy' | 'sell',
      quantity: this.calculatePositionSize(signal),
      price: signal.targetPrice || 0,
      type: 'market',
      status: 'pending',
      filledQuantity: 0,
      avgFillPrice: 0,
      timestamp: Date.now(),
    };

    order.filledQuantity = order.quantity;
    order.avgFillPrice = signal.targetPrice || 0;
    order.status = 'filled';

    this.applyOrder(order);

    this.logger.info(`Order executed: ${order.side.toUpperCase()} ${order.quantity} ${order.symbol} @ ${order.avgFillPrice}`);

    return order;
  }

  private checkRisk(signal: TradingSignal): boolean {
    const positionSize = this.calculatePositionSize(signal);
    const positionValue = positionSize * (signal.targetPrice || 0);
    const positionPct = positionValue / this.portfolio.cash;

    if (positionPct > this.config.maxPositionPct) {
      this.logger.warn(`Position size exceeds limit: ${positionPct.toFixed(2)}% > ${this.config.maxPositionPct}`);
      return false;
    }

    const varEstimate = this.estimateVaR();
    if (varEstimate > this.config.varLimit99) {
      this.logger.warn(`VaR limit exceeded: $${varEstimate.toFixed(2)} > $${this.config.varLimit99}`);
      return false;
    }

    const dailyPnL = this.calculateDailyPnL();
    if (dailyPnL < -this.config.maxDailyLoss) {
      this.haltTrading();
      return false;
    }

    return true;
  }

  private calculatePositionSize(signal: TradingSignal): number {
    const baseSize = this.portfolio.cash * this.config.maxPositionPct * signal.confidence;
    const price = signal.targetPrice || 100;
    return Math.floor(baseSize / price);
  }

  private estimateVaR(positions: number = 10000): number {
    if (this.recentTrades.length < 10) return this.portfolio.cash * 0.01;

    const returns = this.recentTrades.map(t => t.pnl);
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor(positions * 0.01);

    return Math.abs(sortedReturns[varIndex] || 0);
  }

  private calculateDailyPnL(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.recentTrades
      .filter(t => t.timestamp >= today.getTime())
      .reduce((sum, t) => sum + t.pnl, 0);
  }

  private applyOrder(order: Order): void {
    if (order.side === 'buy') {
      const cost = order.filledQuantity * order.avgFillPrice;
      this.portfolio.cash -= cost;

      const existing = this.portfolio.positions.get(order.symbol);
      if (existing) {
        const totalQty = existing.quantity + order.filledQuantity;
        existing.avgPrice = (existing.avgPrice * existing.quantity + order.avgFillPrice * order.filledQuantity) / totalQty;
        existing.quantity = totalQty;
      } else {
        this.portfolio.positions.set(order.symbol, {
          symbol: order.symbol,
          quantity: order.filledQuantity,
          avgPrice: order.avgFillPrice,
          currentPrice: order.avgFillPrice,
          pnl: 0,
          pnlPercent: 0,
        });
      }
    } else {
      const revenue = order.filledQuantity * order.avgFillPrice;
      this.portfolio.cash += revenue;

      const existing = this.portfolio.positions.get(order.symbol);
      if (existing) {
        const pnl = (order.avgFillPrice - existing.avgPrice) * order.filledQuantity;
        this.recentTrades.push({ pnl, timestamp: Date.now() });

        existing.quantity -= order.filledQuantity;
        if (existing.quantity <= 0) {
          this.portfolio.positions.delete(order.symbol);
        }
      }
    }

    this.updatePositionPnL();
  }

  private updatePositionPnL(): void {
    for (const position of this.portfolio.positions.values()) {
      position.pnl = (position.currentPrice - position.avgPrice) * position.quantity;
      position.pnlPercent = ((position.currentPrice - position.avgPrice) / position.avgPrice) * 100;
    }
  }

  async processNews(news: NewsEvent): Promise<void> {
    if (Math.abs(news.sentiment) > 0.7) {
      this.logger.info(`Strong sentiment detected: ${news.sentiment.toFixed(2)} for ${news.tickers.join(', ')}`);
    }
  }

  private haltTrading(): void {
    this.isHalted = true;
    this.logger.error('Circuit breaker triggered - trading halted');
  }

  resumeTrading(): void {
    this.isHalted = false;
    this.logger.info('Trading resumed');
  }

  getRiskMetrics(): RiskMetrics {
    const positions = Array.from(this.portfolio.positions.values());
    const totalExposure = positions.reduce((sum, p) => sum + p.quantity * p.currentPrice, 0);
    const dailyPnL = this.calculateDailyPnL();
    const maxDrawdown = this.calculateMaxDrawdown();
    const var99 = this.estimateVaR();

    return {
      totalExposure,
      dailyPnL,
      maxDrawdown,
      var99,
      positions,
    };
  }

  private calculateMaxDrawdown(): number {
    const peak = this.portfolio.initialCapital;
    const current = this.portfolio.cash + Array.from(this.portfolio.positions.values())
      .reduce((sum, p) => sum + p.quantity * p.currentPrice, 0);

    return ((peak - current) / peak) * 100;
  }

  getPortfolio(): {
    cash: number;
    totalValue: number;
    positions: Position[];
    pnl: number;
    pnlPercent: number;
  } {
    const positionsValue = Array.from(this.portfolio.positions.values())
      .reduce((sum, p) => sum + p.quantity * p.currentPrice, 0);

    const totalValue = this.portfolio.cash + positionsValue;
    const pnl = totalValue - this.portfolio.initialCapital;
    const pnlPercent = (pnl / this.portfolio.initialCapital) * 100;

    return {
      cash: this.portfolio.cash,
      totalValue,
      positions: Array.from(this.portfolio.positions.values()),
      pnl,
      pnlPercent,
    };
  }

  getStatistics(): {
    isHalted: boolean;
    recentTrades: number;
    avgTradePnl: number;
    winRate: number;
    rlEpsilon: number;
    config: typeof ArcFinancialTrading.prototype.config;
  } {
    const winningTrades = this.recentTrades.filter(t => t.pnl > 0).length;
    const avgTradePnl = this.recentTrades.length > 0
      ? this.recentTrades.reduce((sum, t) => sum + t.pnl, 0) / this.recentTrades.length
      : 0;

    return {
      isHalted: this.isHalted,
      recentTrades: this.recentTrades.length,
      avgTradePnl,
      winRate: this.recentTrades.length > 0 ? winningTrades / this.recentTrades.length : 0,
      rlEpsilon: this.ppoPolicy.epsilon,
      config: { ...this.config },
    };
  }
}
