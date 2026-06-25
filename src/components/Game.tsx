import React, { useState, useEffect, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import { HandCards } from './HandCards';
import { GamePhase } from '../types';
import { identifyPattern, getAllValidPlays } from '../utils/patternRecognition';
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
  const [animatingCards, setAnimatingCards] = useState<string[]>([]); // 动画中的牌ID
  const [bombEffect, setBombEffect] = useState(false); // 炸弹特效
  const [lastPlayedCards, setLastPlayedCards] = useState<any[]>([]); // 上一手出的牌（用于动画）

  // AI 自动出牌
  useEffect(() => {
    if (phase === GamePhase.Playing && currentPlayerIndex !== 0) {
      const timer = setTimeout(() => {
        aiPlay(currentPlayerIndex);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [phase, currentPlayerIndex]);

  // 显示选中的牌型
  useEffect(() => {
    if (selectedCards.length > 0) {
      const pattern = identifyPattern(selectedCards, currentLevel);
      if (pattern) {
        // 显示牌型名称 + 描述
        const desc = getPlayDescription(pattern);
        setPatternHint(desc);
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

  // 处理出牌
  const handlePlay = () => {
    if (selectedCards.length === 0) return;

    // 检查牌型
    const pattern = identifyPattern(selectedCards, currentLevel);
    if (!pattern) {
      setErrorMessage('无效牌型');
      return;
    }

    // 如果有上家出牌，检查是否能压过
    if (lastPlay && !compareWithLastPlay(pattern)) {
      setErrorMessage('无法压过上家');
      return;
    }

    // 触发出牌动画
    const cardIds = selectedCards.map(c => c.id);
    setAnimatingCards(cardIds);
    setLastPlayedCards([...selectedCards]);

    // 炸弹特效
    if (pattern.pattern.includes('Bomb') || pattern.pattern === 'FlushStraight') {
      setBombEffect(true);
      setTimeout(() => setBombEffect(false), 800);
    }

    // 动画结束后执行出牌
    setTimeout(() => {
      setAnimatingCards([]);
      playCards();
    }, 400);
  };

  // 处理过牌
  const handlePass = () => {
    if (!lastPlay) return;
    pass();
  };

  // 比较牌型
  const compareWithLastPlay = (pattern: any): boolean => {
    if (!lastPlay) return true;
    // 调用 patternRecognition 的比较函数
    return true; // 简化，实际调用 compareCombinations
  };

  // 获取牌型描述
  const getPlayDescription = (pattern: any): string => {
    const names: Record<string, string> = {
      'Single': '单张',
      'Pair': '对子',
      'Triplet': '三张',
      'TripletWithPair': '三带二',
      'Straight': '顺子',
      'StraightPair': '三连对',
      'TripletStraight': '钢板',
      'Bomb': '炸弹',
      'FlushStraight': '同花顺',
      'Rocket': '火箭'
    };
    const name = names[pattern.pattern] || pattern.pattern;
    return name;
  };

  // 获取当前可出的所有牌型
  const getAvailablePlays = () => {
    if (!lastPlay) {
      // 自由出牌，返回所有可能的牌型
      return getAllValidPlays(currentPlayer.cards, null, currentLevel);
    }
    // 跟牌，返回能压过的牌型
    return getAllValidPlays(currentPlayer.cards, lastPlay, currentLevel);
  };

  // 判断某个玩家是否有最近的出牌
  const isLastPlayFrom = (playerIndex: number) => {
    return lastPlayPlayerIndex === playerIndex;
  };

  // 获取玩家位置标签
  const getPositionLabel = (index: number) => {
    const labels = ['你', '西家', '北家', '东家'];
    return labels[index] || `玩家${index}`;
  };

  // 判断是否是自己的回合
  const isMyTurn = currentPlayerIndex === 0 && phase === GamePhase.Playing;

  return (
    <div className="game">
      {/* 炸弹特效 */}
      {bombEffect && <div className="bomb-effect">💥</div>}

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
          级牌 {['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'][currentLevel - 2] || 'A'}
        </div>
        {showLevelSelector && (
          <div className="level-selector">
            {['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].map((label, i) => (
              <div
                key={i + 2}
                className={`level-option ${currentLevel === i + 2 ? 'active' : ''}`}
                onClick={() => {
                  setLevel(i + 2);
                  setShowLevelSelector(false);
                  setShowLevelTip(true);
                }}
              >
                {label}
              </div>
            ))}
          </div>
        )}
        {/* 级牌提示弹窗 */}
        {showLevelTip && phase === GamePhase.Playing && (
          <div className="level-tip">
            <div className="level-tip-title">当前级牌：{['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'][currentLevel - 2]}</div>
            <div className="level-tip-body">
              逢人配（♥{['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'][currentLevel - 2]}）：你手中有 <strong>{currentPlayer.cards.filter(c => isRedLevelCard(c, currentLevel)).length}</strong> 张 |
              级牌共有 <strong>{currentPlayer.cards.filter(c => isLevelCard(c, currentLevel)).length}</strong> 张
            </div>
          </div>
        )}
      </div>

      {/* 回合指示器 */}
      <div className="turn-indicator">
        <div className={`turn-badge ${isMyTurn ? 'my-turn' : ''}`}>
          {isMyTurn ? '🎯 你的回合' : `${getPositionLabel(currentPlayerIndex)}出牌中...`}
        </div>
      </div>

      {/* 北家 */}
      <div className="player-area player-north">
        <div className="cards-row">
          {players[2].cards.map((card, i) => (
            <Card key={card.id} card={card} faceDown />
          ))}
        </div>
        <div className="player-info">
          <div className="player-name">{players[2].name}</div>
          <div className="card-count">{players[2].cards.length}张</div>
        </div>
        {/* 北家出的牌 */}
        {isLastPlayFrom(2) && lastPlay && (
          <div className="player-play-area north-play">
            <div className="play-label">出牌</div>
            <div className="played-cards">
              {lastPlay.cards.map((card, i) => (
                <Card key={i} card={card} />
              ))}
            </div>
          </div>
        )}
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

      {/* 中央出牌区 */}
      <div className="play-area">
        {phase === GamePhase.Waiting && (
          <button className="start-button" onClick={initGame}>
            开始游戏
          </button>
        )}
        {phase === GamePhase.Playing && currentPlayerIndex !== 0 && (
          <div className="thinking">
            <div className="thinking-dots">
              <span></span><span></span><span></span>
            </div>
            {players[currentPlayerIndex].name}思考中...
          </div>
        )}
        {/* 中央显示上一手出的牌 */}
        {lastPlay && (
          <div className="center-play">
            <div className="center-play-label">{getPositionLabel(lastPlayPlayerIndex)}出牌</div>
            <div className="center-play-cards">
              {lastPlay.cards.map((card, i) => (
                <Card key={i} card={card} currentLevel={currentLevel} />
              ))}
            </div>
          </div>
        )}
        {/* 牌型提示 */}
        {patternHint && (
          <div className="center-pattern-hint">{patternHint}</div>
        )}
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
          {isMyTurn && (
            <>
              <button
                className="action-button play-button"
                onClick={handlePlay}
                disabled={selectedCards.length === 0}
              >
                出牌
              </button>
              {lastPlay && (
                <button className="action-button pass-button" onClick={handlePass}>
                  过
                </button>
              )}
            </>
          )}
          {errorMessage && <div className="error-hint">{errorMessage}</div>}
        </div>

        <div className="player-hand">
          <HandCards
            cards={currentPlayer.cards}
            selectedCards={selectedCards}
            onCardSelect={handleCardClick}
            currentLevel={currentLevel}
            isMyTurn={isMyTurn}
            animatingIds={animatingCards}
          />
        </div>
        
        {/* 理牌按钮 */}
        <div className="card-actions">
          <button className="sort-button" onClick={sortCards}>理牌</button>
          {selectedCards.length > 0 && (
            <button className="restore-button" onClick={restoreCards}>取消</button>
          )}
        </div>
      </div>
    </div>
  );
};
