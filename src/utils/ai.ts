import { Card, CardCombination, CardPattern } from '../types';
import { identifyPattern, compareCombinations } from './patternRecognition';

/**
 * AI 玩家策略模块
 */

// 获取所有可能的牌型组合
export function findAllPossiblePlays(cards: Card[], currentLevel: number): CardCombination[] {
  const plays: CardCombination[] = [];
  const n = cards.length;

  // 按点数分组
  const byValue = new Map<number, Card[]>();
  cards.forEach(card => {
    const key = card.value;
    if (!byValue.has(key)) byValue.set(key, []);
    byValue.get(key)!.push(card);
  });

  // 1. 单张
  cards.forEach(card => {
    const pattern = identifyPattern([card], currentLevel);
    if (pattern) plays.push(pattern);
  });

  // 2. 对子
  byValue.forEach(group => {
    if (group.length >= 2) {
      const pattern = identifyPattern([group[0], group[1]], currentLevel);
      if (pattern) plays.push(pattern);
    }
  });

  // 3. 三张
  byValue.forEach(group => {
    if (group.length >= 3) {
      const pattern = identifyPattern([group[0], group[1], group[2]], currentLevel);
      if (pattern) plays.push(pattern);
    }
  });

  // 4. 三带一
  byValue.forEach((tripleGroup, tripleValue) => {
    if (tripleGroup.length >= 3) {
      cards.forEach(card => {
        if (card.value !== tripleValue) {
          const combo = [tripleGroup[0], tripleGroup[1], tripleGroup[2], card];
          const pattern = identifyPattern(combo, currentLevel);
          if (pattern) plays.push(pattern);
        }
      });
    }
  });

  // 5. 三带二
  byValue.forEach((tripleGroup, tripleValue) => {
    if (tripleGroup.length >= 3) {
      byValue.forEach((pairGroup, pairValue) => {
        if (pairValue !== tripleValue && pairGroup.length >= 2) {
          const combo = [...tripleGroup.slice(0, 3), pairGroup[0], pairGroup[1]];
          const pattern = identifyPattern(combo, currentLevel);
          if (pattern) plays.push(pattern);
        }
      });
    }
  });

  // 6. 炸弹（4张相同）
  byValue.forEach(group => {
    if (group.length === 4) {
      const pattern = identifyPattern(group, currentLevel);
      if (pattern) plays.push(pattern);
    }
  });

  // 7. 顺子（5-12张连续）
  const sortedValues = Array.from(byValue.keys()).filter(v => v >= 3 && v <= 14).sort((a, b) => a - b);
  for (let len = 5; len <= 12; len++) {
    for (let i = 0; i <= sortedValues.length - len; i++) {
      let isConsecutive = true;
      const straightCards: Card[] = [];
      for (let j = 0; j < len; j++) {
        const val = sortedValues[i + j];
        if (j > 0 && sortedValues[i + j] - sortedValues[i + j - 1] !== 1) {
          isConsecutive = false;
          break;
        }
        straightCards.push(byValue.get(val)![0]);
      }
      if (isConsecutive) {
        const pattern = identifyPattern(straightCards, currentLevel);
        if (pattern) plays.push(pattern);
      }
    }
  }

  // 8. 连对（至少3对）
  for (let len = 3; len <= Math.floor(sortedValues.length / 2); len++) {
    for (let i = 0; i <= sortedValues.length - len; i++) {
      let isConsecutive = true;
      const pairCards: Card[] = [];
      for (let j = 0; j < len; j++) {
        const val = sortedValues[i + j];
        if (byValue.get(val)!.length < 2) {
          isConsecutive = false;
          break;
        }
        if (j > 0 && sortedValues[i + j] - sortedValues[i + j - 1] !== 1) {
          isConsecutive = false;
          break;
        }
        pairCards.push(byValue.get(val)![0], byValue.get(val)![1]);
      }
      if (isConsecutive && pairCards.length >= 6) {
        const pattern = identifyPattern(pairCards, currentLevel);
        if (pattern) plays.push(pattern);
      }
    }
  }

  // 9. 火箭（大小王）
  const smallJoker = cards.find(c => c.value === 15);
  const bigJoker = cards.find(c => c.value === 16);
  if (smallJoker && bigJoker) {
    const pattern = identifyPattern([smallJoker, bigJoker], currentLevel);
    if (pattern) plays.push(pattern);
  }

  return plays;
}

// AI 选择出牌
export function aiSelectPlay(
  cards: Card[],
  lastPlay: CardCombination | null,
  currentLevel: number
): CardCombination | null {
  const allPlays = findAllPossiblePlays(cards, currentLevel);

  if (allPlays.length === 0) return null;

  // 如果没有上家出牌，自由选择
  if (!lastPlay) {
    // 策略：优先出小牌，保留炸弹和火箭
    const nonBombs = allPlays.filter(
      p => p.pattern !== CardPattern.Bomb && p.pattern !== CardPattern.Rocket
    );

    if (nonBombs.length > 0) {
      // 优先出单张、对子，避免过早出顺子/钢板
      const simples = nonBombs.filter(
        p => p.pattern === CardPattern.Single ||
             p.pattern === CardPattern.Pair ||
             p.pattern === CardPattern.Triple
      );

      if (simples.length > 0) {
        // 出最小的
        simples.sort((a, b) => a.mainValue - b.mainValue);
        return simples[0];
      }

      // 没有简单牌型，出最小的三带
      nonBombs.sort((a, b) => a.mainValue - b.mainValue);
      return nonBombs[0];
    }

    // 只有炸弹/火箭了，出最小的炸弹
    const bombs = allPlays.filter(p => p.pattern === CardPattern.Bomb);
    if (bombs.length > 0) {
      bombs.sort((a, b) => a.mainValue - b.mainValue);
      return bombs[0];
    }

    // 只有火箭了
    return allPlays[0];
  }

  // 有上家出牌，需要找能压过的牌
  const validPlays = allPlays.filter(play =>
    compareCombinations(play, lastPlay, currentLevel)
  );

  if (validPlays.length === 0) return null; // 过

  // 策略：出刚好能压过的最小牌
  // 优先非炸弹
  const nonBombValid = validPlays.filter(
    p => p.pattern !== CardPattern.Bomb && p.pattern !== CardPattern.Rocket
  );

  if (nonBombValid.length > 0) {
    nonBombValid.sort((a, b) => a.mainValue - b.mainValue);
    return nonBombValid[0];
  }

  // 只有炸弹能压
  // 如果手牌少于5张，果断炸
  if (cards.length <= 5) {
    validPlays.sort((a, b) => a.mainValue - b.mainValue);
    return validPlays[0];
  }

  // 手牌还多，有30%概率不炸选择过
  if (Math.random() < 0.3) {
    return null;
  }

  validPlays.sort((a, b) => a.mainValue - b.mainValue);
  return validPlays[0];
}
