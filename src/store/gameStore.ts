import { create } from 'zustand';
import { GameState, GamePhase, Player, Position, Card, CardCombination, CardPattern, Rank } from '../types';
import { createGuandanDeck, shuffleDeck, dealCards, sortCards } from '../utils/cards';
import { identifyPattern, compareCombinations } from '../utils/patternRecognition';
import { aiSelectPlay } from '../utils/ai';

interface GameStore extends GameState {
  selectedCards: Card[];
  currentLevel: number;
  timer: number;
  timerActive: boolean;
  originalCards: Card[];
  winHistory: { winner: number; round: number }[]; // 胜利记录
  lastWinnerTeam: number | null; // 上一局获胜方
  lastLoserIndices: number[]; // 上一局输家索引
  initGame: () => void;
  selectCard: (card: Card) => void;
  playCards: () => boolean;
  pass: () => void;
  aiPlay: (playerIndex: number) => void;
  setLevel: (level: number) => void;
  sortCards: () => void;
  restoreCards: () => void;
  startTimer: () => void;
  stopTimer: () => void;
  tickTimer: () => void;
  getValidPlay: (cards: Card[], lastPlay: CardCombination | null) => boolean;
  checkGameOver: () => number | null; // 返回获胜队伍索引或 null
  newRound: () => void; // 开始新一轮
  handleTribute: () => void; // 处理贡牌
  handleReturn: () => void; // 处理还牌
}

// 创建初始玩家
function createPlayers(): Player[] {
  return [
    {
      id: 'player-0',
      name: '你',
      position: Position.South,
      cards: [],
      isHuman: true,
      teamId: 0
    },
    {
      id: 'player-1',
      name: '西家',
      position: Position.West,
      cards: [],
      isHuman: false,
      teamId: 1
    },
    {
      id: 'player-2',
      name: '北家',
      position: Position.North,
      cards: [],
      isHuman: false,
      teamId: 0
    },
    {
      id: 'player-3',
      name: '东家',
      position: Position.East,
      cards: [],
      isHuman: false,
      teamId: 1
    }
  ];
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: GamePhase.Waiting,
  players: createPlayers(),
  currentPlayerIndex: 0,
  lastPlay: null,
  lastPlayPlayerIndex: -1,
  passCount: 0,
  roundNumber: 1,
  level: [2, 2],
  贡牌: {
    required: false,
    fromIndex: -1,
    toIndex: -1,
    card: null
  },
  selectedCards: [],
  currentLevel: 2,
  timer: 30,
  timerActive: false,
  originalCards: [],
  winHistory: [],
  lastWinnerTeam: null,
  lastLoserIndices: [],

  setLevel: (level: number) => {
    set({ currentLevel: level });
  },

  sortCards: () => {
    const { players } = get();
    const currentPlayer = players[0];

    // 改进版理牌：按点数分组，再按花色排序
    // 级牌排在最前面，然后是A、K、Q...2，大小王在最后
    const sorted = [...currentPlayer.cards].sort((a, b) => {
      // 大小王排最后
      if (a.isJoker && b.isJoker) {
        return b.value - a.value; // 大王 > 小王
      }
      if (a.isJoker) return 1;
      if (b.isJoker) return -1;
      
      // 其他牌按点数降序
      if (a.value !== b.value) {
        return b.value - a.value;
      }
      
      // 同点数按花色排序：黑桃 > 红心 > 梅花 > 方块
      const suitOrder = ['♠', '♥', '♣', '♦'];
      return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    });

    const newPlayers = [...players];
    newPlayers[0] = { ...currentPlayer, cards: sorted };
    set({ players: newPlayers, originalCards: [...currentPlayer.cards] });
  },

  restoreCards: () => {
    const { players, originalCards } = get();
    if (originalCards.length === 0) return;

    const newPlayers = [...players];
    newPlayers[0] = { ...players[0], cards: [...originalCards] };
    set({ players: newPlayers, originalCards: [] });
  },

  startTimer: () => {
    set({ timer: 30, timerActive: true });
  },

  stopTimer: () => {
    set({ timerActive: false, timer: 30 });
  },

  tickTimer: () => {
    const { timer, timerActive, currentPlayerIndex } = get();
    if (!timerActive || currentPlayerIndex !== 0) return;

    if (timer <= 1) {
      set({ timer: 30 });
      get().pass();
    } else {
      set({ timer: timer - 1 });
    }
  },

  getValidPlay: (cards: Card[], lastPlay: CardCombination | null): boolean => {
    const { currentLevel } = get();
    const pattern = identifyPattern(cards, currentLevel);
    
    if (!pattern) return false;
    
    if (!lastPlay) return true;
    
    return compareCombinations(pattern, lastPlay, currentLevel);
  },

  initGame: () => {
    const deck = shuffleDeck(createGuandanDeck());
    const hands = dealCards(deck, 4);
    const players = createPlayers();

    players.forEach((player, index) => {
      player.cards = sortCards(hands[index]);
    });

    set({
      phase: GamePhase.Playing,
      players,
      currentPlayerIndex: 0,
      lastPlay: null,
      lastPlayPlayerIndex: -1,
      passCount: 0,
      selectedCards: [],
      timer: 30,
      timerActive: true,
      originalCards: []
    });
  },

  selectCard: (card: Card) => {
    const { selectedCards } = get();
    const index = selectedCards.findIndex(c => c.id === card.id);

    if (index > -1) {
      selectedCards.splice(index, 1);
    } else {
      selectedCards.push(card);
    }

    set({ selectedCards: [...selectedCards] });
  },

  playCards: (): boolean => {
    const { selectedCards, players, currentPlayerIndex, lastPlay, currentLevel } = get();
    if (selectedCards.length === 0) return false;

    // 识别牌型
    const pattern = identifyPattern(selectedCards, currentLevel);
    if (!pattern) {
      console.log('无效牌型');
      return false;
    }

    // 验证是否能压过上家
    if (lastPlay && !compareCombinations(pattern, lastPlay, currentLevel)) {
      console.log('牌型无法压过上家');
      return false;
    }

    const currentPlayer = players[currentPlayerIndex];
    const newCards = currentPlayer.cards.filter(
      c => !selectedCards.find(sc => sc.id === c.id)
    );

    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = {
      ...currentPlayer,
      cards: newCards
    };

    set({
      players: newPlayers,
      lastPlay: pattern,
      lastPlayPlayerIndex: currentPlayerIndex,
      passCount: 0,
      selectedCards: [],
      currentPlayerIndex: (currentPlayerIndex + 1) % 4,
      timer: 30
    });

    // 检查游戏是否结束
    const winner = get().checkGameOver();
    if (winner !== null) {
      const { winHistory, roundNumber, level } = get();
      const newWinHistory = [...winHistory, { winner, round: roundNumber }];

      // 找出输家（手牌最多的那一队的两个玩家）
      const loserTeam = winner === 0 ? 1 : 0;
      const loserIndices = [0, 1, 2, 3].filter(i => newPlayers[i].teamId === loserTeam);

      // 升级逻辑：获胜方升1级，如果对手没出过牌则升3级
      const loserPlayer = newPlayers.find((p, i) =>
        i % 2 === loserTeam && p.cards.length === 27
      );
      const jumpLevels = loserPlayer ? 3 : 1;

      const newLevel = [...level];
      newLevel[winner] = Math.min(14, newLevel[winner] + jumpLevels);

      set({
        phase: GamePhase.GameOver,
        winHistory: newWinHistory,
        level: newLevel as [number, number],
        lastWinnerTeam: winner,
        lastLoserIndices: loserIndices
      });
    }

    return true;
  },

  pass: () => {
    const { currentPlayerIndex, passCount, lastPlayPlayerIndex } = get();
    const newPassCount = passCount + 1;

    if (newPassCount >= 3) {
      set({
        passCount: 0,
        lastPlay: null,
        lastPlayPlayerIndex: -1,
        currentPlayerIndex: lastPlayPlayerIndex === -1 ? 0 : lastPlayPlayerIndex,
        timer: 30
      });
    } else {
      set({
        passCount: newPassCount,
        currentPlayerIndex: (currentPlayerIndex + 1) % 4,
        timer: 30
      });
    }
  },

  aiPlay: (playerIndex: number) => {
    const { players, lastPlay, currentLevel } = get();
    const player = players[playerIndex];

    if (player.cards.length === 0) return;

    // 使用智能 AI 选择出牌
    const selectedPlay = aiSelectPlay(player.cards, lastPlay, currentLevel);

    if (!selectedPlay) {
      // AI 选择过
      get().pass();
      return;
    }

    // 出牌
    const playedCardIds = new Set(selectedPlay.cards.map(c => c.id));
    const newCards = player.cards.filter(c => !playedCardIds.has(c.id));
    const newPlayers = [...players];
    newPlayers[playerIndex] = { ...player, cards: newCards };

    set({
      players: newPlayers,
      lastPlay: selectedPlay,
      lastPlayPlayerIndex: playerIndex,
      passCount: 0,
      currentPlayerIndex: (playerIndex + 1) % 4,
      timer: 30
    });

    // 检查游戏是否结束
    const winner = get().checkGameOver();
    if (winner !== null) {
      const { winHistory, roundNumber, level } = get();
      const newWinHistory = [...winHistory, { winner, round: roundNumber }];

      // 找出输家
      const loserTeam = winner === 0 ? 1 : 0;
      const loserIndices = [0, 1, 2, 3].filter(i => newPlayers[i].teamId === loserTeam);

      // 升级逻辑：获胜方升1级，如果对手没出过牌则升3级
      const loserPlayer = newPlayers.find((p, i) =>
        i % 2 === loserTeam && p.cards.length === 27
      );
      const jumpLevels = loserPlayer ? 3 : 1;

      const newLevel = [...level];
      newLevel[winner] = Math.min(14, newLevel[winner] + jumpLevels);

      set({
        phase: GamePhase.GameOver,
        winHistory: newWinHistory,
        level: newLevel as [number, number],
        lastWinnerTeam: winner,
        lastLoserIndices: loserIndices
      });
    }
  },

  checkGameOver: (): number | null => {
    const { players } = get();

    // 检查是否有人出完牌
    for (let i = 0; i < 4; i++) {
      if (players[i].cards.length === 0) {
        // 该玩家所属队伍获胜
        return players[i].teamId;
      }
    }

    return null;
  },

  newRound: () => {
    const { roundNumber, level, lastWinnerTeam } = get();
    const deck = shuffleDeck(createGuandanDeck());
    const hands = dealCards(deck, 4);
    const players = createPlayers();

    players.forEach((player, index) => {
      player.cards = sortCards(hands[index]);
    });

    // 如果上一局有赢家，进入贡牌阶段
    if (lastWinnerTeam !== null) {
      set({
        phase: GamePhase['贡牌'],
        players,
        currentPlayerIndex: 0,
        lastPlay: null,
        lastPlayPlayerIndex: -1,
        passCount: 0,
        roundNumber: roundNumber + 1,
        selectedCards: [],
        timer: 30,
        timerActive: false,
        originalCards: []
      });

      // 自动处理贡牌
      setTimeout(() => {
        get().handleTribute();
      }, 500);

      // 自动处理还牌
      setTimeout(() => {
        get().handleReturn();
      }, 1500);
    } else {
      // 第一局，直接开始
      set({
        phase: GamePhase.Playing,
        players,
        currentPlayerIndex: 0,
        lastPlay: null,
        lastPlayPlayerIndex: -1,
        passCount: 0,
        roundNumber: roundNumber + 1,
        selectedCards: [],
        timer: 30,
        timerActive: true,
        originalCards: []
      });
    }
  },

  handleTribute: () => {
    const { players, lastWinnerTeam, lastLoserIndices, currentLevel } = get();
    if (lastWinnerTeam === null || lastLoserIndices.length === 0) return;

    // 找输家最大的牌（除了大小王不进贡）
    const loserIndex = lastLoserIndices[0];
    const loserCards = players[loserIndex].cards;
    const tributeCard = loserCards
      .filter(c => c.value < 15) // 排除大小王
      .sort((a, b) => b.value - a.value)[0];

    if (!tributeCard) return;

    // 找赢家
    const winnerIndices = [0, 1, 2, 3].filter(i => players[i].teamId === lastWinnerTeam);
    const winnerIndex = winnerIndices[0];

    // 移除输家的牌，加给赢家
    const newPlayers = [...players];
    newPlayers[loserIndex] = {
      ...players[loserIndex],
      cards: players[loserIndex].cards.filter(c => c.id !== tributeCard.id)
    };
    newPlayers[winnerIndex] = {
      ...players[winnerIndex],
      cards: [...players[winnerIndex].cards, tributeCard]
    };

    // 设置贡牌状态
    set({
      players: newPlayers,
      phase: GamePhase['还牌'],
      贡牌: {
        required: true,
        fromIndex: loserIndex,
        toIndex: winnerIndex,
        card: tributeCard
      },
      currentPlayerIndex: winnerIndex
    });
  },

  handleReturn: () => {
    const { players, lastWinnerTeam, currentLevel } = get();
    if (lastWinnerTeam === null) return;

    const winnerIndices = [0, 1, 2, 3].filter(i => players[i].teamId === lastWinnerTeam);
    const winnerIndex = winnerIndices[0];
    const loserIndices = [0, 1, 2, 3].filter(i => players[i].teamId !== lastWinnerTeam);
    const loserIndex = loserIndices[0];

    // 赢家还一张最小的牌
    const winnerCards = players[winnerIndex].cards;
    const returnCard = winnerCards.sort((a, b) => a.value - b.value)[0];

    if (!returnCard) return;

    // 移除赢家的牌，还给输家
    const newPlayers = [...players];
    newPlayers[winnerIndex] = {
      ...players[winnerIndex],
      cards: players[winnerIndex].cards.filter(c => c.id !== returnCard.id)
    };
    newPlayers[loserIndex] = {
      ...players[loserIndex],
      cards: [...players[loserIndex].cards, returnCard]
    };

    // 排序手牌
    newPlayers.forEach((p, i) => {
      newPlayers[i] = { ...p, cards: sortCards(p.cards) };
    });

    // 开始游戏
    set({
      players: newPlayers,
      phase: GamePhase.Playing,
      贡牌: {
        required: false,
        fromIndex: -1,
        toIndex: -1,
        card: null
      },
      currentPlayerIndex: winnerIndex // 赢家先出牌
    });
  }
}));
