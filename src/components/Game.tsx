import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import { GamePhase } from '../types';
import { identifyPattern } from '../utils/patternRecognition';
import { isRedLevelCard, isLevelCard } from '../utils/cards';
import './Game.css';

export const Game: React.FC = () => {
  const {
    phase,
    players,
    currentPlayerIndex,
    lastPlay,
    lastPlayPlayerIndex,
    selectedCards,
    currentLevel,
    level,
    winHistory,
    贡牌,
    initGame,
    selectCard,
    playCards,
    pass,
    aiPlay,
    setLevel,
    sortCards,
    restoreCards,
    newRound
  } = useGameStore();

  const [showLevelSelector, setShowLevelSelector] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [patternHint, setPatternHint] = useState<string>('');
  const [showLevelTip, setShowLevelTip] = useState(false);

  // AI 自动出牌
  useEffect(() => {
    if (phase === GamePhase.Playing && currentPlayerIndex !== 0) {
      const timer = setTimeout(() => {
        aiPlay(currentPlayerIndex);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, currentPlayerIndex]);

  // 显示选中的牌型
  useEffect(() => {
    if (selectedCards.length > 0) {
      const pattern = identifyPattern(selectedCards, currentLevel);
      if (pattern) {
        setPatternHint(`识别为: ${pattern.pattern}`);
        setErrorMessage('');
      } else {
        setPatternHint('');
        setErrorMessage('无效牌型');
      }
    } else {
      setPatternHint('');
      setErrorMessage('');
    }
  }, [selectedCards, currentLevel]);

  // 自动隐藏错误消息
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const currentPlayer = players[0];

  const handleCardClick = (card: any) => {
    if (currentPlayerIndex === 0) {
      selectCard(card);
    }
  };

  // 触摸优化：长按选择多张牌时延迟处理
  const [touchStartY, setTouchStartY] = useState(0);
  const handleTouchStart = (e: React.TouchEvent, card: any) => {
    setTouchStartY(e.touches[0].clientY);
  };
  const handleTouchEnd = (e: React.TouchEvent, card: any) => {
    const endY = e.changedTouches[0].clientY;
    // 如果手指没有大幅滑动，视为点击
    if (Math.abs(endY - touchStartY) < 15) {
      handleCardClick(card);
    }
  };

  const handlePlay = () => {
    if (selectedCards.length === 0) return;
    
    const success = playCards();
    if (!success) {
      setErrorMessage('出牌失败，请检查牌型');
    }
  };

  const handlePass = () => {
    pass();
  };

  const levelOptions = [
    { value: 2, label: '2' },
    { value: 3, label: '3' },
    { value: 4, label: '4' },
    { value: 5, label: '5' },
    { value: 6, label: '6' },
    { value: 7, label: '7' },
    { value: 8, label: '8' },
    { value: 9, label: '9' },
    { value: 10, label: '10' },
    { value: 11, label: 'J' },
    { value: 12, label: 'Q' },
    { value: 13, label: 'K' },
    { value: 14, label: 'A' }
  ];

  // 统计玩家手牌中级牌和逢人配的数量
  const playerCards = currentPlayer.cards;
  const wildCount = playerCards.filter(c => isRedLevelCard(c, currentLevel)).length;
  const levelCount = playerCards.filter(c => isLevelCard(c, currentLevel)).length;
  const levelLabel = levelOptions.find(l => l.value === currentLevel)?.label || String(currentLevel);

  // 3秒后隐藏级牌提示
  useEffect(() => {
    if (phase === GamePhase.Playing && showLevelTip) {
      const timer = setTimeout(() => setShowLevelTip(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [phase, showLevelTip]);

  // 重新出牌时显示提示
  useEffect(() => {
    if (phase === GamePhase.Playing) {
      setShowLevelTip(true);
    }
  }, [lastPlayPlayerIndex]);

  // 判断某个玩家是否有最近的出牌
  const isLastPlayFrom = (playerIndex: number) => {
    return lastPlayPlayerIndex === playerIndex;
  };

  return (
    <div className="game">
      {/* 游戏结束界面 */}
      {phase === GamePhase.GameOver && (
        <div className="game-over-overlay">
          <div className="game-over-content">
            <h2 className="game-over-title">
              {winHistory.length > 0 && winHistory[winHistory.length - 1].winner === 0 ? '🎉 你赢了！' : '😔 你输了'}
            </h2>
            <div className="game-over-stats">
              <p>红队等级: {['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'][level[0] - 2] || 'A'}</p>
              <p>蓝队等级: {['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'][level[1] - 2] || 'A'}</p>
              <p>回合数: {winHistory.length}</p>
            </div>
            <div className="game-over-actions">
              <button className="action-button" onClick={newRound}>
                下一局
              </button>
              <button className="action-button secondary" onClick={initGame}>
                重新开始
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 贡牌/还牌提示 */}
      {(phase === GamePhase['贡牌'] || phase === GamePhase['还牌']) && (
        <div className="tribute-overlay">
          <div className="tribute-content">
            <h3>{phase === GamePhase['贡牌'] ? '🎴 进贡阶段' : '🃏 还牌阶段'}</h3>
            {贡牌.card && (
              <p className="tribute-card-info">
                {phase === GamePhase['贡牌']
                  ? `${players[贡牌.fromIndex]?.name} 向 ${players[贡牌.toIndex]?.name} 进贡`
                  : `${players[贡牌.toIndex]?.name} 还牌给 ${players[贡牌.fromIndex]?.name}`}
              </p>
            )}
            <div className="tribute-animation">处理中...</div>
          </div>
        </div>
      )}

      {/* 级牌设置与提示 */}
      <div className="level-indicator">
        <div className="level-badge" onClick={() => setShowLevelSelector(!showLevelSelector)}>
          级牌 {levelLabel}
        </div>
        {showLevelSelector && (
          <div className="level-selector">
            {levelOptions.map(opt => (
              <div
                key={opt.value}
                className={`level-option ${currentLevel === opt.value ? 'active' : ''}`}
                onClick={() => {
                  setLevel(opt.value);
                  setShowLevelSelector(false);
                  setShowLevelTip(true);
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
        {/* 级牌提示弹窗 */}
        {showLevelTip && phase === GamePhase.Playing && (
          <div className="level-tip">
            <div className="level-tip-title">当前级牌：{levelLabel}</div>
            <div className="level-tip-body">
              逢人配（♥{levelLabel}）：你手中有 <strong>{wildCount}</strong> 张 |
              级牌共有 <strong>{levelCount}</strong> 张
            </div>
          </div>
        )}
      </div>

      {/* 错误消息 */}
      {errorMessage && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}

      {/* 北家 */}
      <div className="player-area player-north">
        <div className="player-info">
          <div className="player-name">{players[2].name}</div>
          {players[2].cards.length <= 10 && (
            <div className="card-count-warning">剩余: {players[2].cards.length}</div>
          )}
        </div>
        {/* 北家出的牌 */}
        {isLastPlayFrom(2) && lastPlay && (
          <div className="player-play-area">
            <div className="play-label">出牌</div>
            <div className="played-cards">
              {lastPlay.cards.map((card, i) => (
                <Card key={i} card={card} />
              ))}
            </div>
          </div>
        )}
        <div className="cards-row">
          {players[2].cards.map((card, i) => (
            <Card key={card.id} card={card} faceDown />
          ))}
        </div>
      </div>

      {/* 西家 */}
      <div className="player-area player-west">
        <div className="player-info">
          <div className="player-name">{players[1].name}</div>
          {players[1].cards.length <= 10 && (
            <div className="card-count-warning">剩余: {players[1].cards.length}</div>
          )}
        </div>
        {/* 西家出的牌 */}
        {isLastPlayFrom(1) && lastPlay && (
          <div className="player-play-area">
            <div className="play-label">出牌</div>
            <div className="played-cards">
              {lastPlay.cards.map((card, i) => (
                <Card key={i} card={card} />
              ))}
            </div>
          </div>
        )}
        <div className="cards-column">
          {players[1].cards.map((card, i) => (
            <Card key={card.id} card={card} faceDown />
          ))}
        </div>
      </div>

      {/* 东家 */}
      <div className="player-area player-east">
        <div className="player-info">
          <div className="player-name">{players[3].name}</div>
          {players[3].cards.length <= 10 && (
            <div className="card-count-warning">剩余: {players[3].cards.length}</div>
          )}
        </div>
        {/* 东家出的牌 */}
        {isLastPlayFrom(3) && lastPlay && (
          <div className="player-play-area">
            <div className="play-label">出牌</div>
            <div className="played-cards">
              {lastPlay.cards.map((card, i) => (
                <Card key={i} card={card} />
              ))}
            </div>
          </div>
        )}
        <div className="cards-column">
          {players[3].cards.map((card, i) => (
            <Card key={card.id} card={card} faceDown />
          ))}
        </div>
      </div>

      {/* 中央出牌区 - 只显示开始按钮和思考提示 */}
      <div className="play-area">
        {phase === GamePhase.Waiting && (
          <button className="start-button" onClick={initGame}>
            开始游戏
          </button>
        )}
        {phase === GamePhase.Playing && currentPlayerIndex !== 0 && (
          <div className="thinking">{players[currentPlayerIndex].name}思考中...</div>
        )}
      </div>

      {/* 玩家手牌 */}
      <div className="player-area player-south">
        {/* 玩家出的牌 */}
        {isLastPlayFrom(0) && lastPlay && (
          <div className="player-play-area south-play">
            <div className="played-cards">
              {lastPlay.cards.map((card, i) => (
                <Card key={i} card={card} currentLevel={currentLevel} />
              ))}
            </div>
          </div>
        )}

        {/* 出牌按钮 */}
        <div className="player-actions">
          {currentPlayerIndex === 0 && phase === GamePhase.Playing && (
            <>
              <button
                className="action-button play-button"
                onClick={handlePlay}
                disabled={selectedCards.length === 0}
              >
                出牌
              </button>
              <button className="action-button pass-button" onClick={handlePass}>
                过
              </button>
            </>
          )}
          {patternHint && <div className="pattern-hint">{patternHint}</div>}
        </div>

        <div className="player-hand">
          {currentPlayer.cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              selected={selectedCards.some(c => c.id === card.id)}
              currentLevel={currentLevel}
              onClick={() => handleCardClick(card)}
              onTouchStart={(e) => handleTouchStart(e, card)}
              onTouchEnd={(e) => handleTouchEnd(e, card)}
            />
          ))}
        </div>
        
        {/* 理牌按钮 */}
        <div className="card-actions">
          <button className="action-btn sort-btn" onClick={sortCards}>
            一键理牌
          </button>
          <button className="action-btn restore-btn" onClick={restoreCards}>
            恢复
          </button>
        </div>
        
        <div className="player-info">
          <div className="player-name">{currentPlayer.name}</div>
          {currentPlayer.cards.length <= 10 && (
            <div className="card-count-warning">剩余: {currentPlayer.cards.length}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Game;
