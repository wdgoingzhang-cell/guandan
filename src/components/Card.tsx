import React from 'react';
import { Card as CardType, Suit } from '../types';
import { getSuitColor, isLevelCard, isRedLevelCard } from '../utils/cards';
import './Card.css';

interface CardProps {
  card: CardType;
  selected?: boolean;
  onClick?: () => void;
  faceDown?: boolean;
  currentLevel?: number;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
}

export const Card: React.FC<CardProps> = ({ card, selected, onClick, faceDown, currentLevel, onTouchStart, onTouchEnd }) => {
  if (faceDown) {
    return (
      <div className="card face-down">
        <div className="card-back">
          <div className="card-back-pattern"></div>
        </div>
      </div>
    );
  }

  const color = getSuitColor(card.suit);
  
  // 级牌/逢人配标记
  const _isLevel = !card.isJoker && currentLevel ? isLevelCard(card, currentLevel) : false;
  const _isWild = !card.isJoker && currentLevel ? isRedLevelCard(card, currentLevel) : false;
  
  let cardClass = 'card';
  if (selected) cardClass += ' selected';
  if (_isWild) cardClass += ' wild-card';
  else if (_isLevel) cardClass += ' level-card';

  return (
    <div
      className={cardClass}
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ color }}
    >
      <div className="card-inner">
        <div className="card-top-left">
          <div className="card-rank">{card.rank}</div>
          <div className="card-suit">{card.suit}</div>
        </div>
        <div className="card-center">
          <div className="card-suit-large">{card.suit}</div>
        </div>
        <div className="card-bottom-right">
          <div className="card-rank">{card.rank}</div>
          <div className="card-suit">{card.suit}</div>
        </div>
        {/* 逢人配标记 */}
        {_isWild && <div className="wild-badge">配</div>}
        {/* 级牌标记 */}
        {_isLevel && !_isWild && <div className="level-dot"></div>}
      </div>
    </div>
  );
};
