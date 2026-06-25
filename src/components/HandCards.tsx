import React, { useState, useMemo } from 'react';
import { Card as CardType } from '../types';
import { identifyPattern } from '../utils/patternRecognition';
import { isRedLevelCard } from '../utils/cards';
import './HandCards.css';

interface HandCardsProps {
  cards: CardType[];
  selectedCards: CardType[];
  onCardSelect: (card: CardType) => void;
  currentLevel: number;
  isMyTurn: boolean;
}

// 花色符号映射
const SUIT_SYMBOLS: Record<string, string> = {
  'spade': '♠',
  'heart': '♥',
  'diamond': '♦',
  'club': '♣'
};

const SUIT_COLORS: Record<string, string> = {
  'spade': 'black',
  'heart': 'red',
  'diamond': 'red',
  'club': 'black'
};

// 点数显示
const RANK_LABELS: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '小王', 16: '大王'
};

export const HandCards: React.FC<HandCardsProps> = ({
  cards,
  selectedCards,
  onCardSelect,
  currentLevel,
  isMyTurn
}) => {
  const [layout, setLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const [hoveredSuit, setHoveredSuit] = useState<string | null>(null);

  // 按花色分组
  const cardsBySuit = useMemo(() => {
    const groups: Record<string, CardType[]> = {
      'spade': [],
      'heart': [],
      'diamond': [],
      'club': [],
      'joker': []
    };
    
    cards.forEach(card => {
      if (card.value >= 15) {
        groups['joker'].push(card);
      } else {
        groups[card.suit].push(card);
      }
    });
    
    // 每组内排序
    Object.keys(groups).forEach(suit => {
      groups[suit].sort((a, b) => b.value - a.value);
    });
    
    return groups;
  }, [cards]);

  // 查找所有同花顺
  const findStraightFlushes = useMemo(() => {
    const flushes: CardType[][] = [];
    
    ['spade', 'heart', 'diamond', 'club'].forEach(suit => {
      const suitCards = cardsBySuit[suit];
      if (suitCards.length < 5) return;
      
      // 查找连续5张
      for (let i = 0; i <= suitCards.length - 5; i++) {
        const sequence: CardType[] = [];
        for (let j = i; j < suitCards.length && sequence.length < 5; j++) {
          const expectedValue = suitCards[i].value - (j - i);
          if (suitCards[j].value === expectedValue) {
            sequence.push(suitCards[j]);
          } else {
            break;
          }
        }
        if (sequence.length === 5) {
          flushes.push(sequence);
        }
      }
    });
    
    return flushes;
  }, [cardsBySuit]);

  // 查找所有炸弹
  const findBombs = useMemo(() => {
    const bombs: CardType[][] = [];
    const byValue: Record<number, CardType[]> = {};
    
    cards.forEach(card => {
      if (!byValue[card.value]) byValue[card.value] = [];
      byValue[card.value].push(card);
    });
    
    Object.values(byValue).forEach(group => {
      if (group.length >= 4) {
        bombs.push(group);
      }
    });
    
    return bombs.sort((a, b) => b.length - a.length);
  }, [cards]);

  // 一键选择同花顺
  const selectStraightFlush = (flush: CardType[]) => {
    flush.forEach(card => {
      if (!selectedCards.find(c => c.id === card.id)) {
        onCardSelect(card);
      }
    });
  };

  // 一键选择炸弹
  const selectBomb = (bomb: CardType[]) => {
    bomb.forEach(card => {
      if (!selectedCards.find(c => c.id === card.id)) {
        onCardSelect(card);
      }
    });
  };

  const isCardSelected = (card: CardType) => {
    return selectedCards.some(c => c.id === card.id);
  };

  const isRedLevel = (card: CardType) => {
    return isRedLevelCard(card, currentLevel);
  };

  if (layout === 'vertical') {
    return (
      <div className="hand-cards-vertical">
        <div className="layout-toggle">
          <button 
            className={`layout-btn ${layout === 'horizontal' ? 'active' : ''}`}
            onClick={() => setLayout('horizontal')}
          >
            横向
          </button>
          <button 
            className={`layout-btn ${layout === 'vertical' ? 'active' : ''}`}
            onClick={() => setLayout('vertical')}
          >
            纵向
          </button>
        </div>
        
        {/* 快捷按钮 */}
        {isMyTurn && (
          <div className="quick-actions">
            {findStraightFlushes.length > 0 && (
              <div className="quick-action-group">
                <span className="quick-label">同花顺:</span>
                {findStraightFlushes.map((flush, idx) => (
                  <button
                    key={idx}
                    className="quick-btn flush-btn"
                    onClick={() => selectStraightFlush(flush)}
                  >
                    {SUIT_SYMBOLS[flush[0].suit]}
                    {RANK_LABELS[flush[0].value]}-{RANK_LABELS[flush[4].value]}
                  </button>
                ))}
              </div>
            )}
            {findBombs.length > 0 && (
              <div className="quick-action-group">
                <span className="quick-label">炸弹:</span>
                {findBombs.map((bomb, idx) => (
                  <button
                    key={idx}
                    className="quick-btn bomb-btn"
                    onClick={() => selectBomb(bomb)}
                  >
                    {RANK_LABELS[bomb[0].value]}×{bomb.length}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* 垂直理牌 - 按花色分列 */}
        <div className="vertical-columns">
          {['spade', 'heart', 'diamond', 'club', 'joker'].map(suit => {
            const suitCards = cardsBySuit[suit];
            if (suitCards.length === 0) return null;
            
            return (
              <div 
                key={suit} 
                className={`suit-column ${hoveredSuit === suit ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredSuit(suit)}
                onMouseLeave={() => setHoveredSuit(null)}
              >
                <div className="suit-header" style={{ color: SUIT_COLORS[suit] }}>
                  {suit === 'joker' ? '🃏' : SUIT_SYMBOLS[suit]}
                </div>
                <div className="suit-cards">
                  {suitCards.map(card => (
                    <div
                      key={card.id}
                      className={`card-mini ${isCardSelected(card) ? 'selected' : ''} ${isRedLevel(card) ? 'wild-card' : ''}`}
                      onClick={() => isMyTurn && onCardSelect(card)}
                      style={{ color: SUIT_COLORS[card.suit] }}
                    >
                      <span className="card-rank">{RANK_LABELS[card.value]}</span>
                      {suit !== 'joker' && <span className="card-suit">{SUIT_SYMBOLS[card.suit]}</span>}
                      {isRedLevel(card) && <span className="wild-badge">配</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 横向布局（默认）
  return (
    <div className="hand-cards-horizontal">
      <div className="layout-toggle">
        <button 
          className={`layout-btn ${layout === 'horizontal' ? 'active' : ''}`}
          onClick={() => setLayout('horizontal')}
        >
          横向
        </button>
        <button 
          className={`layout-btn ${layout === 'vertical' ? 'active' : ''}`}
          onClick={() => setLayout('vertical')}
        >
          纵向
        </button>
      </div>
      
      {/* 快捷按钮 */}
      {isMyTurn && (
        <div className="quick-actions">
          {findStraightFlushes.length > 0 && (
            <div className="quick-action-group">
              <span className="quick-label">同花顺:</span>
              {findStraightFlushes.map((flush, idx) => (
                <button
                  key={idx}
                  className="quick-btn flush-btn"
                  onClick={() => selectStraightFlush(flush)}
                >
                  {SUIT_SYMBOLS[flush[0].suit]}
                  {RANK_LABELS[flush[0].value]}-{RANK_LABELS[flush[4].value]}
                </button>
              ))}
            </div>
          )}
          {findBombs.length > 0 && (
            <div className="quick-action-group">
              <span className="quick-label">炸弹:</span>
              {findBombs.map((bomb, idx) => (
                <button
                  key={idx}
                  className="quick-btn bomb-btn"
                  onClick={() => selectBomb(bomb)}
                >
                  {RANK_LABELS[bomb[0].value]}×{bomb.length}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* 横向手牌 */}
      <div className="horizontal-cards">
        {cards.map(card => (
          <div
            key={card.id}
            className={`card-normal ${isCardSelected(card) ? 'selected' : ''} ${isRedLevel(card) ? 'wild-card' : ''}`}
            onClick={() => isMyTurn && onCardSelect(card)}
          >
            <div className="card-content" style={{ color: SUIT_COLORS[card.suit] }}>
              <div className="card-rank">{RANK_LABELS[card.value]}</div>
              {card.value < 15 && <div className="card-suit">{SUIT_SYMBOLS[card.suit]}</div>}
            </div>
            {isRedLevel(card) && <div className="wild-indicator">配</div>}
          </div>
        ))}
      </div>
    </div>
  );
};
