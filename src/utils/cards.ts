import { Card, Suit, Rank } from '../types';

// 牌值映射
const RANK_VALUES: Record<Rank, number> = {
  [Rank.Two]: 2,
  [Rank.Three]: 3,
  [Rank.Four]: 4,
  [Rank.Five]: 5,
  [Rank.Six]: 6,
  [Rank.Seven]: 7,
  [Rank.Eight]: 8,
  [Rank.Nine]: 9,
  [Rank.Ten]: 10,
  [Rank.Jack]: 11,
  [Rank.Queen]: 12,
  [Rank.King]: 13,
  [Rank.Ace]: 14,
  [Rank.SmallJoker]: 15,
  [Rank.BigJoker]: 16
};

// 生成一副牌（54张）
export function createDeck(): Card[] {
  const deck: Card[] = [];
  const suits = [Suit.Spade, Suit.Heart, Suit.Club, Suit.Diamond];
  const ranks = [
    Rank.Two, Rank.Three, Rank.Four, Rank.Five, Rank.Six, Rank.Seven,
    Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace
  ];

  let id = 0;

  // 生成普通牌
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        id: `card-${id++}`,
        suit,
        rank,
        value: RANK_VALUES[rank],
        isJoker: false
      });
    }
  }

  // 添加大小王
  deck.push({
    id: `card-${id++}`,
    suit: Suit.Joker,
    rank: Rank.SmallJoker,
    value: RANK_VALUES[Rank.SmallJoker],
    isJoker: true
  });

  deck.push({
    id: `card-${id++}`,
    suit: Suit.Joker,
    rank: Rank.BigJoker,
    value: RANK_VALUES[Rank.BigJoker],
    isJoker: true
  });

  return deck;
}

// 生成两副牌（掼蛋用108张）
export function createGuandanDeck(): Card[] {
  const deck1 = createDeck();
  const deck2 = createDeck();

  // 重新生成唯一ID
  return [...deck1, ...deck2].map((card, index) => ({
    ...card,
    id: `card-${index}`
  }));
}

// 洗牌
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 发牌（逆时针：南→东→北→西，即玩家0→3→2→1）
export function dealCards(deck: Card[], playerCount: number = 4): Card[][] {
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  // 逆时针发牌顺序：0(南) → 3(东) → 2(北) → 1(西)
  const dealOrder = [0, 3, 2, 1];

  for (let i = 0; i < deck.length; i++) {
    const playerIndex = dealOrder[i % playerCount];
    hands[playerIndex].push(deck[i]);
  }

  return hands;
}

// 排序手牌
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    // 先按点数降序
    if (a.value !== b.value) {
      return b.value - a.value;
    }
    // 同点数按花色排序
    const suitOrder = [Suit.Spade, Suit.Heart, Suit.Club, Suit.Diamond];
    return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
  });
}

// 获取牌的花色颜色
export function getSuitColor(suit: Suit): string {
  return suit === Suit.Heart || suit === Suit.Diamond ? '#ff4444' : '#333333';
}

// 根据数值获取对应的Rank（用于将level数值转为Rank字符串）
export function getRankFromValue(value: number): Rank | null {
  const entry = Object.entries(RANK_VALUES).find(([_, v]) => v === value);
  return entry ? entry[0] as Rank : null;
}

// 判断是否是红级牌（逢人配 - 红桃花色的当前级牌）
export function isRedLevelCard(card: Card, level: number): boolean {
  if (card.isJoker) return false;
  if (card.suit !== Suit.Heart) return false;
  const levelRank = getRankFromValue(level);
  return levelRank !== null && card.rank === levelRank;
}

// 判断是否是级牌（当前级的牌，包括红级牌）
export function isLevelCard(card: Card, level: number): boolean {
  if (card.isJoker) return false;
  const levelRank = getRankFromValue(level);
  return levelRank !== null && card.rank === levelRank;
}

// 判断是否是王
export function isJoker(card: Card): boolean {
  return card.isJoker;
}


