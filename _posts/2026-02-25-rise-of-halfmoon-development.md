---
title: "Rise of the Half Moon: 달 위상 전략 카드 게임 개발기"
date: 2026-02-25 12:00:00 +0900
categories: [Projects, Game Development]
tags: [nextjs, typescript, threejs, game-dev, web-audio, framer-motion]
image:
  path: /assets/img/posts/rise-of-halfmoon/demo.gif
  alt: Rise of the Half Moon - 달 위상 전략 카드 게임
---

## 🌙 들어가며

구글 두들의 달 위상 게임에서 영감을 받아, 전략성을 더한 카드 게임 **"Rise of the Half Moon"**을 개발했다. 
그래프 기반 보드에서 8가지 달 위상 카드를 배치하며 AI와 대결하는 턴제 전략 게임이다.

이 글에서는 프로젝트의 기획부터 구현, 그리고 수많은 시행착오와 개선 과정을 상세히 다룬다.

---

## 🎮 게임 소개

### 핵심 메커니즘

**목표**: Half Moon AI를 상대로 더 많은 점수 획득

**스코어링 시스템**:
- **Phase Pair** (1점): 동일한 달 위상 2개 연결 (🌒-🌒)
- **Full Moon Pair** (2점): 반대 위상 연결 (🌑-🌕)
- **Lunar Cycle** (N점): 3개 이상 연속 위상 체인 (🌑→🌒→🌓→🌔)
- **Chain Steal**: 상대 체인을 확장하면 전체 탈취!

**게임 특징**:
- 9x3 그래프 보드 (Force-directed layout)
- 3단계 AI 난이도 (레벨별 증가)
- 패배 시 레벨 1로 복귀 (로그라이크 요소)
- 무승부 시 재도전

---

## 🛠️ 기술 스택
```typescript
// Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion (애니메이션)

// Libraries
- D3-Force (그래프 레이아웃)
- Web Audio API (사운드)

// Tools
- Vercel (배포)
- Git/GitHub
```

**선택 이유**:
- Next.js 15: 최신 React 기능 + 빠른 개발
- TypeScript: 타입 안정성 (게임 로직 복잡도 관리)
- Framer Motion: 선언적 애니메이션
- D3-Force: 물리 기반 그래프 레이아웃

---

## 📐 구현 과정

### 1단계: 프로젝트 초기화 및 기본 구조
```bash
npx create-next-app@latest rise-of-halfmoon --typescript --tailwind
cd rise-of-halfmoon
npm install framer-motion d3-force
```

기본 게임 상태 타입 정의:
```typescript
// types/game.ts
type MoonPhase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface Card {
  id: string;
  phase: MoonPhase;
  owner: 'player' | 'opponent' | null;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  card: Card | null;
}

interface GraphEdge {
  source: string;
  target: string;
}

type GamePhase = 
  | 'start' 
  | 'tutorial' 
  | 'playing' 
  | 'levelWin' 
  | 'gameOver'
  | 'draw';
```

### 2단계: 그래프 보드 시스템

**문제**: 정적인 격자형 보드는 지루하고, 시각적 흥미가 떨어진다.

**해결**: D3-Force를 사용한 동적 그래프 레이아웃
```typescript
// utils/graphLayout.ts
import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force';

function generateGraphLayout(
  nodeCount: number = 9,
  connections: [number, number][]
) {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `node-${i}`,
    x: 0,
    y: 0,
  }));

  const links = connections.map(([source, target]) => ({
    source: `node-${source}`,
    target: `node-${target}`,
  }));

  const simulation = forceSimulation(nodes)
    .force('link', forceLink(links).id(d => d.id).distance(150))
    .force('charge', forceManyBody().strength(-300))
    .force('center', forceCenter(400, 300));

  // 시뮬레이션 실행
  simulation.tick(300);
  simulation.stop();

  return { nodes, edges: links };
}

// 3x3 그리드 연결 패턴
const connections: [number, number][] = [
  [0, 1], [1, 2],       // 1행
  [3, 4], [4, 5],       // 2행
  [6, 7], [7, 8],       // 3행
  [0, 3], [3, 6],       // 1열
  [1, 4], [4, 7],       // 2열
  [2, 5], [5, 8],       // 3열
];
```

**트러블슈팅 #1: 모바일에서 노드 간격 문제**

초기 구현에서 모바일 화면에서 노드들이 너무 밀집되어 터치하기 어려웠다.
```typescript
// ❌ Before: 고정 간격
forceLink(links).distance(150)

// ✅ After: 반응형 간격
const getNodeSpacing = () => {
  if (typeof window === 'undefined') return 150;
  if (window.innerWidth < 640) return 100;  // Mobile
  if (window.innerWidth < 768) return 120;  // Tablet
  return 150;  // Desktop
};

forceLink(links).distance(getNodeSpacing())
```

추가로 CSS로 보드 전체를 축소:
```css
@media (max-width: 640px) {
  .board-container {
    transform: scale(0.9);
  }
}
```

### 3단계: 카드 시스템 및 스코어링 로직

**Phase Pair 검증**:
```typescript
function checkPhasePair(card1: Card, card2: Card): boolean {
  return card1.phase === card2.phase;
}
```

**Full Moon Pair 검증** (반대 위상):
```typescript
const OPPOSITE_PHASES: Record<MoonPhase, MoonPhase> = {
  0: 4, 1: 5, 2: 6, 3: 7,
  4: 0, 5: 1, 6: 2, 7: 3,
};

function checkFullMoonPair(card1: Card, card2: Card): boolean {
  return card1.phase === OPPOSITE_PHASES[card2.phase];
}
```

**Lunar Cycle (체인) 검증**:

이 부분이 가장 복잡했다. 그래프에서 연속된 위상을 찾아야 한다.
```typescript
function findLunarCycles(
  placedCard: Card,
  node: GraphNode,
  graph: { nodes: GraphNode[], edges: GraphEdge[] }
): Card[][] {
  const chains: Card[][] = [];
  
  // BFS로 연결된 노드 탐색
  function bfs(startNode: GraphNode, direction: 'forward' | 'backward') {
    const chain: Card[] = [placedCard];
    let current = startNode;
    let expectedPhase = direction === 'forward' 
      ? (placedCard.phase + 1) % 8 
      : (placedCard.phase - 1 + 8) % 8;

    while (true) {
      const neighbors = getNeighbors(current, graph);
      const nextNode = neighbors.find(n => 
        n.card?.phase === expectedPhase && 
        n.card.owner === placedCard.owner
      );

      if (!nextNode || !nextNode.card) break;

      chain.push(nextNode.card);
      current = nextNode;
      expectedPhase = direction === 'forward'
        ? (expectedPhase + 1) % 8
        : (expectedPhase - 1 + 8) % 8;
    }

    return chain;
  }

  const forwardChain = bfs(node, 'forward');
  const backwardChain = bfs(node, 'backward').reverse();
  
  // 전체 체인 조합
  const fullChain = [...backwardChain.slice(0, -1), ...forwardChain];
  
  if (fullChain.length >= 3) {
    chains.push(fullChain);
  }

  return chains;
}
```

**트러블슈팅 #2: Chain Steal 로직**

초기 구현에서 체인 탈취가 제대로 작동하지 않았다.

**문제**: 상대 체인을 확장했을 때, 전체 체인의 소유권을 어떻게 이전할지 명확하지 않았다.

**해결**:
```typescript
function handleChainSteal(
  newChain: Card[],
  existingChains: Card[][],
  player: 'player' | 'opponent'
): StolenChain | null {
  for (const existingChain of existingChains) {
    // 새 체인이 기존 체인을 포함하는지 확인
    const isExtension = existingChain.every(card => 
      newChain.some(c => c.id === card.id)
    );

    if (isExtension && newChain.length > existingChain.length) {
      // 탈취 발생!
      const stolenCards = existingChain.filter(card => 
        card.owner !== player
      );

      // 소유권 이전
      stolenCards.forEach(card => {
        card.owner = player;
      });

      return {
        stolenCards,
        newLength: newChain.length,
        points: newChain.length,
      };
    }
  }

  return null;
}
```

### 4단계: AI 구현

3단계 난이도 AI를 구현했다.
```typescript
function getAIMove(
  level: number,
  hand: Card[],
  board: GraphNode[],
  graph: { nodes: GraphNode[], edges: GraphEdge[] }
): { card: Card, nodeId: string } | null {
  
  // Level 1: Random
  if (level <= 3) {
    return getRandomMove(hand, board);
  }

  // Level 2-5: Greedy (점수 최대화)
  if (level <= 5) {
    return getGreedyMove(hand, board, graph);
  }

  // Level 6-8: Strategic (체인 방어 + 공격)
  if (level <= 8) {
    return getStrategicMove(hand, board, graph);
  }

  // Level 9+: Expert (미래 예측)
  return getExpertMove(hand, board, graph);
}

function getGreedyMove(hand: Card[], board: GraphNode[], graph) {
  let bestMove = null;
  let bestScore = -1;

  for (const card of hand) {
    for (const node of board.filter(n => !n.card)) {
      const score = calculateMoveScore(card, node, graph);
      if (score > bestScore) {
        bestScore = score;
        bestMove = { card, nodeId: node.id };
      }
    }
  }

  return bestMove;
}
```

### 5단계: 애니메이션 시스템

**카드 드로우 애니메이션**:
```typescript
function DrawCardAnimation({ card }: { card: Card }) {
  return (
    <motion.div
      initial={{ 
        rotateY: 180,  // 뒷면
        scale: 0.5,
        y: -100,
      }}
      animate={{ 
        rotateY: 0,    // 앞면으로 뒤집기
        scale: 1,
        y: 0,
      }}
      transition={{ 
        duration: 0.5,
        ease: 'easeOut',
      }}
      className="card"
    >
      {getMoonEmoji(card.phase)}
    </motion.div>
  );
}
```

**체인 애니메이션**:

**트러블슈팅 #3: 체인 애니메이션 속도**

초기에는 체인 카드들이 200ms 간격으로 빠르게 강조되어 사용자가 따라가기 어려웠다.
```typescript
// ❌ Before: 너무 빠름
const CHAIN_DELAY = 200;

// ✅ After: 2배 느리게
const CHAIN_DELAY = 400;

async function animateChain(chain: Card[]) {
  for (let i = 0; i < chain.length; i++) {
    await highlightCard(chain[i].id);
    playChainSound(i, chain.length);
    
    if (i < chain.length - 1) {
      await drawConnectionLine(chain[i], chain[i + 1]);
    }
    
    await delay(CHAIN_DELAY);
  }
}
```

카드 강조 효과도 개선:
```typescript
function highlightCard(cardId: string) {
  return new Promise(resolve => {
    const card = document.getElementById(cardId);
    
    card?.animate([
      { 
        transform: 'scale(1)',
        boxShadow: '0 0 0px rgba(255,215,0,0)',
        borderColor: 'transparent',
        borderWidth: '3px',
      },
      { 
        transform: 'scale(1.25)',
        boxShadow: '0 0 40px rgba(255,215,0,1)',
        borderColor: '#FFD700',
        borderWidth: '5px',
      },
      { 
        transform: 'scale(1.1)',
        boxShadow: '0 0 30px rgba(255,215,0,0.8)',
        borderColor: '#FFD700',
        borderWidth: '4px',
      }
    ], {
      duration: 600,
      fill: 'forwards',
    });
    
    setTimeout(resolve, 600);
  });
}
```

**점수 팝업 애니메이션**:

**트러블슈팅 #4: 점수가 어디로 가는지 불명확**

초기에는 "+2 PTS"가 카드 위에 뜨고 사라졌다. 사용자 피드백을 받고 개선했다.
```typescript
// ✅ 점수가 플레이어 스코어로 날아감
function ScorePopup({ 
  points, 
  fromPosition, 
  toPlayer 
}: ScorePopupProps) {
  const scorePosition = toPlayer === 'player'
    ? { x: window.innerWidth / 2, y: window.innerHeight - 50 }
    : { x: window.innerWidth / 2, y: 50 };

  return (
    <motion.div
      className="score-popup"
      initial={{ 
        x: fromPosition.x,
        y: fromPosition.y,
        scale: 1,
        opacity: 1,
      }}
      animate={{ 
        x: scorePosition.x,
        y: scorePosition.y,
        scale: 0.5,
        opacity: 0,
      }}
      transition={{ 
        duration: 0.8,
        ease: 'easeInOut',
      }}
      onAnimationComplete={() => updateScore(toPlayer, points)}
    >
      +{points} PTS
    </motion.div>
  );
}
```

스코어 숫자도 변경 시 애니메이션 추가:
```typescript
function ScoreDisplay({ score }: { score: number }) {
  return (
    <motion.div
      key={score}  // 점수 변경 시 재렌더링
      initial={{ scale: 1 }}
      animate={{ 
        scale: [1, 1.3, 1],
        color: ['#ffffff', '#ffd700', '#ffffff']
      }}
      transition={{ duration: 0.5 }}
    >
      {score} PTS
    </motion.div>
  );
}
```

### 6단계: 사운드 시스템

Web Audio API로 모든 사운드를 프로시저럴 생성했다.
```typescript
// utils/sound.ts
class SoundEngine {
  private ctx: AudioContext;

  constructor() {
    this.ctx = new AudioContext();
  }

  playChainSound(index: number, totalLength: number) {
    const baseFreq = 400;
    const freq = baseFreq + (index * 100);  // 상승 톤

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.value = freq;
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.01, 
      this.ctx.currentTime + 0.3
    );

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playPairSound() {
    // 파란색 느낌 (600Hz)
    this.playTone(600, 0.4, 'sine');
  }

  playFullMoonSound() {
    // 금색 느낌 (800Hz)
    this.playTone(800, 0.5, 'triangle');
  }

  playWinSound() {
    // 상승 팡파르
    const notes = [523, 659, 784, 1047];  // C-E-G-C
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.3, 'triangle');
      }, i * 150);
    });
  }

  playLoseSound() {
    // 하강 멜로디
    const notes = [880, 784, 698, 587];  // A-G-F-D
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.4, 'sine');
      }, i * 200);
    });
  }

  private playTone(
    freq: number, 
    duration: number, 
    type: OscillatorType = 'sine'
  ) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.value = freq;
    osc.type = type;

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.01, 
      this.ctx.currentTime + duration
    );

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }
}

export const soundEngine = new SoundEngine();
```

**BGM 추가**:
```typescript
// components/BGMPlayer.tsx
export function BGMPlayer() {
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // localStorage에서 음소거 설정 로드
    const savedMute = localStorage.getItem('bgm-muted') === 'true';
    setIsMuted(savedMute);
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : 0.3;
      localStorage.setItem('bgm-muted', String(isMuted));
    }
  }, [isMuted]);

  return (
    <>
      <audio 
        ref={audioRef}
        src="/bgm.mp3" 
        loop 
        autoPlay
      />
      <button 
        onClick={() => setIsMuted(!isMuted)}
        className="sound-toggle"
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
    </>
  );
}
```

### 7단계: 튜토리얼 시스템

6단계 튜토리얼을 만들었다.

**트러블슈팅 #5: 튜토리얼과 실제 게임 비주얼 불일치**

초기 튜토리얼에서는:
- 카드에 숫자(0-7)가 표시됨 ❌
- Phase Pair 연결에 "-" 기호 ❌
- Full Moon에 "+" 기호 ❌

실제 게임에서는:
- 카드에 달 이모지만 표시 ✅
- Phase Pair: 파란 선 + 채워진 원 ○
- Full Moon: 금색 선 + 빈 원 ◯

수정:
```typescript
// Tutorial Phase Pair 화면
<div className="tutorial-example">
  <div className="card">🌒</div>
  <div className="connection blue">
    <div className="symbol filled-circle">○</div>
  </div>
  <div className="card">🌒</div>
</div>

// Tutorial Full Moon 화면
<div className="tutorial-example">
  <div className="card">🌒</div>
  <div className="connection gold">
    <div className="symbol hollow-circle">◯</div>
  </div>
  <div className="card">🌕</div>
</div>

// 체인 설명도 숫자 대신 이모지로
<p>
  Connect 3+ phases in order:<br/>
  🌑→🌒→🌓 or 🌘→🌑→🌒
</p>
```

### 8단계: 게임 결과 처리

**트러블슈팅 #6: 무승부 케이스 누락**

초기 구현에서 무승부 시 "Game Over" 화면이 표시되어 플레이어가 혼란스러워했다.
```typescript
// ❌ Before: 무승부 케이스 없음
function checkGameEnd() {
  if (playerScore > opponentScore) {
    setGamePhase('levelWin');
  } else {
    setGamePhase('gameOver');
  }
}

// ✅ After: 무승부 추가
function checkGameEnd() {
  if (playerScore > opponentScore) {
    setGamePhase('levelWin');
  } else if (playerScore < opponentScore) {
    setGamePhase('gameOver');
  } else {
    setGamePhase('draw');  // 새로 추가!
  }
}
```

무승부 화면:
```typescript
function DrawScreen({ level, score, onRetry }) {
  return (
    <div className="result-screen">
      <h1>🌗 IT'S A TIE!</h1>
      
      <div className="score-comparison">
        <div className="opponent-score">
          <span>HALF MOON</span>
          <div>{score} PTS</div>
        </div>
        
        <span className="vs">VS</span>
        
        <div className="player-score">
          <span>YOU</span>
          <div>{score} PTS</div>
        </div>
      </div>
      
      <p>The moon is perfectly balanced.</p>
      <p>Try again to break the tie!</p>
      
      <button onClick={onRetry}>
        🔄 RETRY LEVEL
      </button>
    </div>
  );
}
```

### 9단계: 레벨 시작 인트로

각 레벨 시작 시 3초 애니메이션을 추가했다.
{% raw %}
```typescript
function LevelIntro({ level, levelName }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="level-intro-overlay"
    >
      {/* 배경 파티클 */}
      <ParticleBackground />
      
      {/* 레벨 번호 */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="level-number"
      >
        {level}
      </motion.div>
      
      {/* 레벨 이름 */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="level-name"
      >
        🌙 {levelName}
      </motion.div>
    </motion.div>
  );
}

function ParticleBackground() {
  return (
    <div className="particles">
      {/* 펄스 서클 */}
      <motion.div
        className="pulse-circle"
        animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      {/* 떠다니는 별 */}
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="star"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: Math.random() * 2 + 1,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
}
```
{% endraw %}

### 10단계: 모바일 최적화

**카드 크기 반응형**:

**트러블슈팅 #7: 카드 비율 - 직사각형 vs 정사각형**

초기에는 80×100px 직사각형 카드를 사용했으나, 보드에 배치 시 어색했다.
```typescript
// ❌ Before: 직사각형
className="w-[60px] h-[75px] sm:w-[70px] sm:h-[88px] md:w-[80px] md:h-[100px]"

// ✅ After: 정사각형
className="w-[60px] h-[60px] sm:w-[70px] sm:h-[70px] md:w-[80px] md:h-[80px]"
```

**전체 레이아웃 반응형**:
```typescript
// app/page.tsx
<div className="game-container h-screen flex flex-col">
  {/* Opponent section - 18% */}
  <div className="h-[18vh] sm:h-[20vh]">
    {/* ... */}
  </div>
  
  {/* Board - 60% (flex-1) */}
  <div className="flex-1 min-h-0">
    {/* ... */}
  </div>
  
  {/* Player section - 18% */}
  <div className="h-[18vh] sm:h-[20vh]">
    {/* ... */}
  </div>
</div>
```

**레벨 인트로 모바일 최적화**:
```css
/* globals.css */
@media (max-width: 640px) {
  .level-number {
    font-size: 72px;
  }
  
  .level-name {
    font-size: 20px;
  }
}

@media (min-width: 641px) and (max-width: 768px) {
  .level-number {
    font-size: 96px;
  }
  
  .level-name {
    font-size: 24px;
  }
}

@media (min-width: 769px) {
  .level-number {
    font-size: 120px;
  }
  
  .level-name {
    font-size: 28px;
  }
}
```

### 11단계: 시작 화면 개선

초기 시작 화면은 단순했으나, 신비로운 테마로 개선했다.
```typescript
function StartScreen() {
  return (
    <div className="start-screen">
      {/* 배경 효과 */}
      <StarField />
      <CosmicGlow />
      
      {/* 메인 카드 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="start-card"
      >
        {/* 큰 달 아이콘 */}
        <motion.div
          className="hero-moon"
          animate={{
            y: [0, -15, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
          }}
        >
          🌙
        </motion.div>
        
        {/* 타이틀 */}
        <h1 className="game-title">
          <span className="title-rise">RISE OF THE</span>
          <span className="title-half-moon">HALF MOON</span>
        </h1>
        
        <p className="tagline">
          A Strategic Moon Phase Card Game
        </p>
        
        {/* 버튼 */}
        <button className="start-button primary">
          🎮 START GAME
        </button>
        <button className="start-button secondary">
          📖 HOW TO PLAY
        </button>
        
        {/* 통계 */}
        <div className="stats">
          <div>📍 Current Level: {currentLevel}</div>
          <div>🏆 Best Level: {bestLevel}</div>
        </div>
        
        {/* GitHub 링크 */}
        <a href="https://github.com/..." className="github-link">
          <GitHubIcon /> View on GitHub
        </a>
        <p className="github-message">
          Enjoyed the game? ⭐ Star the repo!<br/>
          <span>Found a bug or have ideas? Open an issue! 💡</span>
        </p>
      </motion.div>
    </div>
  );
}
```

---

## 🐛 주요 트러블슈팅 요약

### 1. 모바일 노드 간격 문제
- **문제**: 화면에 노드가 너무 밀집
- **해결**: 반응형 간격 + CSS scale

### 2. Chain Steal 로직
- **문제**: 소유권 이전이 불명확
- **해결**: 체인 포함 여부 검증 로직

### 3. 체인 애니메이션 속도
- **문제**: 200ms 간격으로 너무 빠름
- **해결**: 400ms로 2배 느리게 + 강조 효과 강화

### 4. 점수 이동 불명확
- **문제**: 점수가 어디로 가는지 모름
- **해결**: 스코어로 날아가는 애니메이션

### 5. 튜토리얼 비주얼 불일치
- **문제**: 숫자 표시, 잘못된 심볼
- **해결**: 이모지 + 올바른 연결 심볼

### 6. 무승부 케이스 누락
- **문제**: 무승부 시 Game Over
- **해결**: 별도 Draw 화면 + 재도전

### 7. 카드 비율
- **문제**: 직사각형이 보드에서 어색
- **해결**: 정사각형으로 변경

---

## 📊 성능 최적화

### 1. 애니메이션 최적화

Framer Motion의 `layoutId`와 `AnimatePresence` 활용:
```typescript
<AnimatePresence mode="wait">
  {hand.map(card => (
    <motion.div
      key={card.id}
      layoutId={card.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      <MoonCard card={card} />
    </motion.div>
  ))}
</AnimatePresence>
```

### 2. 사운드 메모리 관리

AudioContext 인스턴스 재사용:
```typescript
class SoundEngine {
  private static instance: SoundEngine;
  
  static getInstance() {
    if (!SoundEngine.instance) {
      SoundEngine.instance = new SoundEngine();
    }
    return SoundEngine.instance;
  }
}
```

### 3. 상태 관리 최적화

React의 `useMemo`와 `useCallback` 활용:
```typescript
const validMoves = useMemo(() => {
  return board.filter(node => !node.card);
}, [board]);

const handleCardPlace = useCallback((card: Card, nodeId: string) => {
  // ...
}, [board, currentPlayer]);
```

---

## 🎓 배운 점

### 기술적 측면

1. **D3-Force의 힘**: 정적 레이아웃보다 물리 기반 레이아웃이 훨씬 흥미롭다
2. **Framer Motion 마스터**: 선언적 애니메이션이 명령형보다 유지보수가 쉽다
3. **Web Audio API**: 프로시저럴 사운드 생성으로 파일 크기 제로
4. **TypeScript의 중요성**: 복잡한 게임 로직에서 타입 안정성이 필수

### 게임 디자인 측면

1. **피드백의 중요성**: 애니메이션/사운드가 게임 느낌을 좌우
2. **난이도 곡선**: AI 난이도를 점진적으로 높이는 것이 중요
3. **튜토리얼 일관성**: 튜토리얼과 실제 게임이 일치해야 혼란 방지
4. **모바일 우선**: 처음부터 모바일을 고려해야 나중에 덜 고생

### 개발 프로세스

1. **빠른 프로토타입**: 완벽하지 않아도 일단 만들어보기
2. **반복 개선**: 사용자 피드백 기반 개선
3. **작은 단위**: 기능을 작게 나눠서 개발
4. **기록**: 트러블슈팅 과정을 기록하면 나중에 도움

---

## 🚀 향후 개선 계획

### 기능 추가
- [ ] 멀티플레이어 (WebSocket)
- [ ] 리플레이 시스템
- [ ] 업적 시스템
- [ ] 일일 챌린지

### 기술 개선
- [ ] Canvas로 렌더링 최적화
- [ ] Service Worker (오프라인 플레이)
- [ ] PWA 전환
- [ ] 단위 테스트 추가

### UI/UX 개선
- [ ] 다크/라이트 모드
- [ ] 커스텀 테마
- [ ] 접근성 향상 (키보드 네비게이션)
- [ ] 다국어 지원

---

## 🔗 링크

- **🎮 Live Demo**: [https://rise-of-halfmoon.vercel.app](https://rise-of-halfmoon.vercel.app)
- **💻 GitHub Repository**: [https://github.com/nahyun27/rise-of-halfmoon](https://github.com/nahyun27/rise-of-halfmoon)

---

## 📝 마치며

이 프로젝트를 통해 웹 게임 개발의 전 과정을 경험했다. 특히 사용자 경험을 고려한 애니메이션, 피드백, 그리고 반복적인 개선 과정의 중요성을 깊이 느꼈다.

단순히 "작동하는" 게임을 넘어 "즐거운" 게임을 만들기 위해서는 디테일에 대한 집착이 필요하다는 것을 배웠다. 200ms와 400ms의 차이, 직사각형과 정사각형의 차이, 점수가 날아가는 방향 하나하나가 모두 사용자 경험을 좌우한다.

앞으로도 이러한 경험을 바탕으로 더 재미있고 완성도 높은 프로젝트를 만들어나가고 싶다.

질문이나 피드백이 있다면 GitHub Issue나 이메일로 연락주세요.

---

*Tags: #GameDev #NextJS #TypeScript #WebDevelopment #D3Force #FramerMotion*