// 扑克牌花色
export enum Suit {
  Spade = '♠',    // 黑桃
  Heart = '♥',    // 红心
  Club = '♣',     // 梅花
  Diamond = '♦',  // 方块
  Joker = '🃏'    // 大小王
}

// 扑克牌点数
export enum Rank {
  Two = '2',
  Three = '3',
  Four = '4',
  Five = '5',
  Six = '6',
  Seven = '7',
  Eight = '8',
  Nine = '9',
  Ten = '10',
  Jack = 'J',
  Queen = 'Q',
  King = 'K',
  Ace = 'A',
  SmallJoker = '小王',
  BigJoker = '大王'
}

// 单张牌
export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;  // 用于比较大小
  isJoker: boolean;
}

// 玩家位置
export enum Position {
  South = 0,  // 南（自己）
  West = 1,   // 西
  North = 2,  // 北
  East = 3    // 东
}

// 玩家
export interface Player {
  id: string;
  name: string;
  position: Position;
  cards: Card[];
  isHuman: boolean;
  teamId: number;  // 0 或 1，表示红队或蓝队
}

// 牌型
export enum CardPattern {
  Single = '单张',
  Pair = '对子',
  Triple = '三张',
  TripleWithSingle = '三带一',
  TripleWithPair = '三带二',
  Straight = '顺子',
  DoubleStraight = '连对',
  TripleStraight = '钢板',
  Bomb = '炸弹',
  Rocket = '火箭',
  FlushStraight = '同花顺',
  FourWithTwo = '四带二'
}

// 出牌组合
export interface CardCombination {
  cards: Card[];
  pattern: CardPattern;
  mainValue: number;  // 主牌值，用于比较
  length: number;     // 牌数
}

// 游戏状态
export enum GamePhase {
  Waiting = '等待开始',
  Dealing = '发牌',
  Playing = '出牌',
 贡牌 = '贡牌',
  还牌 = '还牌',
  GameOver = '游戏结束'
}

// 游戏状态
export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  lastPlay: CardCombination | null;
  lastPlayPlayerIndex: number;
  passCount: number;
  roundNumber: number;
  level: [number, number];  // 两队的等级
 贡牌: {
    required: boolean;
    fromIndex: number;
    toIndex: number;
    card: Card | null;
  };
}

// 音效类型
export enum SoundType {
  Deal = 'deal',
  Play = 'play',
  Pass = 'pass',
  Bomb = 'bomb',
  Win = 'win',
  Lose = 'lose'
}
