import { Card, CardPattern, CardCombination, Rank, Suit } from '../types';

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

// 获取牌的主值（考虑级牌）
export function getCardValue(card: Card, currentLevel: number): number {
  if (card.isJoker) {
    return card.value;
  }
  
  // 级牌（逢人配）的值提升
  if (card.rank === Rank.Ace && currentLevel === 14) {
    return 14;
  }
  
  // 如果是级牌，提升为主牌
  const levelRank = Object.entries(RANK_VALUES).find(([_, v]) => v === currentLevel)?.[0] as Rank;
  if (card.rank === levelRank) {
    return 14.5; // 级牌介于A和小王之间
  }
  
  return card.value;
}

// 判断是否是级牌
export function isLevelCard(card: Card, currentLevel: number): boolean {
  const levelRank = Object.entries(RANK_VALUES).find(([_, v]) => v === currentLevel)?.[0] as Rank;
  return card.rank === levelRank;
}

// 统计各点数的数量
function countByValue(cards: Card[], currentLevel: number): Map<number, Card[]> {
  const count = new Map<number, Card[]>();
  cards.forEach(card => {
    const value = getCardValue(card, currentLevel);
    if (!count.has(value)) {
      count.set(value, []);
    }
    count.get(value)!.push(card);
  });
  return count;
}

// 识别单张
function identifySingle(cards: Card[], currentLevel: number): CardCombination | null {
  if (cards.length !== 1) return null;
  
  return {
    cards,
    pattern: CardPattern.Single,
    mainValue: getCardValue(cards[0], currentLevel),
    length: 1
  };
}

// 识别对子
function identifyPair(cards: Card[], currentLevel: number): CardCombination | null {
  if (cards.length !== 2) return null;
  
  const values = cards.map(c => getCardValue(c, currentLevel));
  if (values[0] !== values[1]) return null;
  
  return {
    cards,
    pattern: CardPattern.Pair,
    mainValue: values[0],
    length: 2
  };
}

// 识别三张
function identifyTriple(cards: Card[], currentLevel: number): CardCombination | null {
  if (cards.length !== 3) return null;
  
  const values = cards.map(c => getCardValue(c, currentLevel));
  if (values[0] !== values[1] || values[1] !== values[2]) return null;
  
  return {
    cards,
    pattern: CardPattern.Triple,
    mainValue: values[0],
    length: 3
  };
}

// 识别三带一
function identifyTripleWithSingle(cards: Card[], currentLevel: number): CardCombination | null {
  if (cards.length !== 4) return null;
  
  const count = countByValue(cards, currentLevel);
  
  for (const [value, group] of count) {
    if (group.length === 3) {
      return {
        cards,
        pattern: CardPattern.TripleWithSingle,
        mainValue: value,
        length: 4
      };
    }
  }
  
  return null;
}

// 识别三带二
function identifyTripleWithPair(cards: Card[], currentLevel: number): CardCombination | null {
  if (cards.length !== 5) return null;
  
  const count = countByValue(cards, currentLevel);
  let hasTriple = false;
  let hasPair = false;
  let tripleValue = 0;
  
  for (const [value, group] of count) {
    if (group.length === 3) {
      hasTriple = true;
      tripleValue = value;
    }
    if (group.length === 2) {
      hasPair = true;
    }
  }
  
  if (hasTriple && hasPair) {
    return {
      cards,
      pattern: CardPattern.TripleWithPair,
      mainValue: tripleValue,
      length: 5
    };
  }
  
  return null;
}

// 识别顺子（至少5张连续的牌）
function identifyStraight(cards: Card[], currentLevel: number): CardCombination | null {
  if (cards.length < 5) return null;
  
  const values = cards.map(c => getCardValue(c, currentLevel)).sort((a, b) => a - b);
  
  // 检查是否连续（不含2和王）
  if (values.some(v => v === 2 || v >= 15)) return null; // 顺子不能包含2、小王、大王
  
  for (let i = 1; i < values.length; i++) {
    if (values[i] - values[i - 1] !== 1) return null;
  }
  
  return {
    cards,
    pattern: CardPattern.Straight,
    mainValue: values[values.length - 1],
    length: cards.length
  };
}

// 识别连对（至少3对连续的对子）
function identifyDoubleStraight(cards: Card[], currentLevel: number): CardCombination | null {
  if (cards.length < 6 || cards.length % 2 !== 0) return null;
  
  const count = countByValue(cards, currentLevel);
  const pairs: number[] = [];
  
  for (const [value, group] of count) {
    if (group.length !== 2) return null;
    pairs.push(value);
  }
  
  pairs.sort((a, b) => a - b);
  
  // 检查是否连续
  for (let i = 1; i < pairs.length; i++) {
    if (pairs[i] - pairs[i - 1] !== 1) return null;
  }
  
  // 连对不能包含2和王
  if (pairs.some(v => v === 2 || v >= 15)) return null;
  
  return {
    cards,
    pattern: CardPattern.DoubleStraight,
    mainValue: pairs[pairs.length - 1],
    length: cards.length
  };
}

// 识别钢板（两个或更多连续的三张）
function identifyTripleStraight(cards: Card[], currentLevel: number): CardCombination | null {
  if (cards.length < 6 || cards.length % 3 !== 0) return null;
  
  const count = countByValue(cards, currentLevel);
  const triples: number[] = [];
  
  for (const [value, group] of count) {
    if (group.length !== 3) return null;
    triples.push(value);
  }
  
  triples.sort((a, b) => a - b);
  
  // 至少2个三张
  if (triples.length < 2) return null;
  
  // 检查是否连续
  for (let i = 1; i < triples.length; i++) {
    if (triples[i] - triples[i - 1] !== 1) return null;
  }
  
  // 钢板不能包含2和王
  if (triples.some(v => v === 2 || v >= 15)) return null;
  
  return {
    cards,
    pattern: CardPattern.TripleStraight,
    mainValue: triples[triples.length - 1],
    length: cards.length
  };
}

// 识别炸弹（4张相同点数的牌）
function identifyBomb(cards: Card[], currentLevel: number): CardCombination | null {
  if (cards.length !== 4) return null;
  
  const values = cards.map(c => getCardValue(c, currentLevel));
  if (values[0] !== values[1] || values[1] !== values[2] || values[2] !== values[3]) return null;
  
  return {
    cards,
    pattern: CardPattern.Bomb,
    mainValue: values[0],
    length: 4
  };
}

// 识别火箭（大小王）
function identifyRocket(cards: Card[]): CardCombination | null {
  if (cards.length !== 2) return null;
  
  const hasSmallJoker = cards.some(c => c.rank === Rank.SmallJoker);
  const hasBigJoker = cards.some(c => c.rank === Rank.BigJoker);
  
  if (hasSmallJoker && hasBigJoker) {
    return {
      cards,
      pattern: CardPattern.Rocket,
      mainValue: 16, // 最高值
      length: 2
    };
  }
  
  return null;
}

// 识别同花顺（同一花色的顺子）
function identifyFlushStraight(cards: Card[], currentLevel: number): CardCombination | null {
  if (cards.length < 5) return null;
  
  // 先检查是否是顺子
  const straight = identifyStraight(cards, currentLevel);
  if (!straight) return null;
  
  // 检查是否同花
  const suits = cards.map(c => c.suit);
  if (suits.some(s => s !== suits[0])) return null;
  
  return {
    cards,
    pattern: CardPattern.FlushStraight,
    mainValue: straight.mainValue,
    length: cards.length
  };
}

// 识别四带二
function identifyFourWithTwo(cards: Card[], currentLevel: number): CardCombination | null {
  if (cards.length !== 6) return null;
  
  const count = countByValue(cards, currentLevel);
  
  for (const [value, group] of count) {
    if (group.length === 4) {
      return {
        cards,
        pattern: CardPattern.FourWithTwo,
        mainValue: value,
        length: 6
      };
    }
  }
  
  return null;
}

// 主入口：识别牌型
export function identifyPattern(cards: Card[], currentLevel: number): CardCombination | null {
  if (cards.length === 0) return null;
  
  // 按优先级尝试识别（从特殊到一般）
  const identifiers = [
    identifyRocket,
    (cards: Card[]) => identifyFlushStraight(cards, currentLevel),
    (cards: Card[]) => identifyBomb(cards, currentLevel),
    (cards: Card[]) => identifyFourWithTwo(cards, currentLevel),
    (cards: Card[]) => identifyTripleStraight(cards, currentLevel),
    (cards: Card[]) => identifyDoubleStraight(cards, currentLevel),
    (cards: Card[]) => identifyStraight(cards, currentLevel),
    (cards: Card[]) => identifyTripleWithPair(cards, currentLevel),
    (cards: Card[]) => identifyTripleWithSingle(cards, currentLevel),
    (cards: Card[]) => identifyTriple(cards, currentLevel),
    (cards: Card[]) => identifyPair(cards, currentLevel),
    (cards: Card[]) => identifySingle(cards, currentLevel)
  ];
  
  for (const identifier of identifiers) {
    const result = identifier(cards);
    if (result) return result;
  }
  
  return null;
}

// 比较两组牌的大小
export function compareCombinations(
  play: CardCombination,
  lastPlay: CardCombination | null,
  currentLevel: number
): boolean {
  // 如果没有上家出牌，任何牌都可以出
  if (!lastPlay) return true;
  
  // 火箭最大（双王）
  if (play.pattern === CardPattern.Rocket) return true;
  if (lastPlay.pattern === CardPattern.Rocket) return false;
  
  // 炸弹大小规则：
  // 6张以上炸弹 > 同花顺 > 5张炸弹 > 4张炸弹
  
  // 炸弹 vs 非炸弹
  if (play.pattern === CardPattern.Bomb || play.pattern === CardPattern.FlushStraight) {
    // 炸弹可以压任何非炸弹牌型
    if (lastPlay.pattern !== CardPattern.Bomb && lastPlay.pattern !== CardPattern.FlushStraight) {
      return true;
    }
  }
  
  if (lastPlay.pattern === CardPattern.Bomb || lastPlay.pattern === CardPattern.FlushStraight) {
    // 非炸弹不能压炸弹
    if (play.pattern !== CardPattern.Bomb && play.pattern !== CardPattern.FlushStraight) {
      return false;
    }
  }
  
  // 炸弹之间的比较（含同花顺）
  if ((play.pattern === CardPattern.Bomb || play.pattern === CardPattern.FlushStraight) &&
      (lastPlay.pattern === CardPattern.Bomb || lastPlay.pattern === CardPattern.FlushStraight)) {
    
    const playBombLevel = getBombLevel(play);
    const lastBombLevel = getBombLevel(lastPlay);
    
    // 不同等级的炸弹比较
    if (playBombLevel !== lastBombLevel) {
      return playBombLevel > lastBombLevel;
    }
    
    // 同等级比较主值
    return play.mainValue > lastPlay.mainValue;
  }
  
  // 同类型牌型比较
  if (play.pattern !== lastPlay.pattern) return false;
  if (play.length !== lastPlay.length) return false;
  
  return play.mainValue > lastPlay.mainValue;
}

// 炸弹等级：6张+=4, 同花顺=3, 5张=2, 4张=1
function getBombLevel(combo: CardCombination): number {
  if (combo.pattern === CardPattern.FlushStraight) {
    return 3; // 同花顺
  }
  if (combo.length >= 6) {
    return 4; // 6张以上炸弹
  }
  if (combo.length === 5) {
    return 2; // 5张炸弹
  }
  return 1; // 4张炸弹
}
