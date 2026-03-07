---
layout: post
title: "Rise of the Half Moon: 달 위상 전략 카드 게임 개발기"
date: 2026-02-25 12:00:00 +0900
categories: [Projects, Game Development]
tags: [nextjs, typescript, threejs, game-dev, web-audio, framer-motion, d3-force, react, tailwind]

description: "구글 두들에서 영감을 받은 달 위상 전략 카드 게임. D3-Force로 구현한 그래프 보드와 복잡한 스코어링 로직, 그리고 3단계 AI 구현 과정 상세 정리"
image:
  path: /assets/img/posts/rise-of-halfmoon/demo.gif
  alt: Rise of the Half Moon - 달 위상 전략 카드 게임

keywords: [Next.js 게임, 웹 게임 개발, D3.js, 그래프 알고리즘, AI 게임, TypeScript]
author: Nahyun Kim
---

## 시작

작년에 구글 두들에 달 위상 맞추기 게임이 나왔다. 간단한 룰이었지만 생각보다 재밌었다. 달의 위상을 순서대로 배치하면 점수를 얻는 방식이었는데, 기발하다고 생각했다.

Stack Tower를 만들면서 Three.js와 물리 엔진에 어느 정도 익숙해졌고, 이번엔 좀 더 복잡한 게임 로직을 구현해보고 싶던 참에 좋은 클론코딩 주제라고 생각했다.

---

## 게임 룰

**보드**: 9x3 그래프 구조 (노드와 엣지)

**스코어링**:
- Phase Pair (1점): 같은 위상 2개 연결
- Full Moon Pair (2점): 반대 위상 연결 (🌑+🌕)
- Lunar Cycle (N점): 연속 위상 체인 (🌑→🌒→🌓)

**Chain Steal**: 상대 체인을 확장하면 전체를 빼앗는다.

마지막 메커니즘이 게임의 핵심이다. 단순히 점수를 내는 게 아니라, 상대가 무엇을 만들고 있는지 계속 관찰해야 한다.

---

## 기술 스택

{% raw %}
```typescript
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- D3-Force (그래프 레이아웃)
- Web Audio API
```
{% endraw %}

React 기반 프레임워크를 선택한 이유는 상태 관리가 복잡할 것 같았기 때문이다. 카드 덱, 보드 상태, 플레이어 점수, AI 턴 등 관리할 게 많았다.

---

## 그래프 기반 보드

구글 두들은 평면 격자였다. 좀 더 시각적으로 흥미롭게 만들고 싶어서 D3-Force를 사용했다.

{% raw %}
```typescript
// 물리 시뮬레이션으로 노드 배치
const simulation = forceSimulation(nodes)
  .force('link', forceLink(edges).distance(150))
  .force('charge', forceManyBody().strength(-300))
  .force('center', forceCenter(400, 300));

simulation.tick(300);  // 300번 반복해서 안정화
```
{% endraw %}

노드들이 힘의 균형을 찾아 배치된다. 매번 약간씩 다른 모양이 나오지만, 대체로 일정한 구조를 유지한다.

모바일에서는 간격을 좁혔다.

{% raw %}
```typescript
const spacing = window.innerWidth < 640 ? 100 : 150;
forceLink(edges).distance(spacing);
```
{% endraw %}

---

## 체인 탐색 알고리즘

Lunar Cycle을 찾는 게 핵심이었다. 그래프에서 연속된 위상을 찾아야 한다.

{% raw %}
```typescript
function findChain(startCard: Card, startNode: GraphNode) {
  const forwardChain = [];
  const backwardChain = [];
  
  // 전진 방향 탐색 (0→1→2)
  let current = startNode;
  let expected = (startCard.phase + 1) % 8;
  
  while (true) {
    const next = neighbors.find(n => 
      n.card?.phase === expected && 
      n.card.owner === startCard.owner
    );
    if (!next) break;
    
    forwardChain.push(next.card);
    current = next;
    expected = (expected + 1) % 8;
  }
  
  // 후진 방향도 동일하게
  // ...
  
  const fullChain = [...backwardChain.reverse(), startCard, ...forwardChain];
  return fullChain.length >= 3 ? fullChain : null;
}
```
{% endraw %}

BFS로 양방향 탐색하고 합친다. 간단하지만 효과적이다.

---

## AI 구현

레벨마다 난이도가 올라간다.

{% raw %}
```typescript
function getAIMove(level: number) {
  if (level <= 3) {
    return randomMove();
  }
  
  if (level <= 6) {
    // 점수가 가장 높은 수 선택
    return moves.reduce((best, move) => 
      move.score > best.score ? move : best
    );
  }
  
  if (level <= 9) {
    // 내 체인 보호 + 상대 체인 공격
    const defensive = protectMyChains();
    const offensive = stealOpponentChains();
    return offensive || defensive || randomMove();
  }
  
  // Level 10: 2수 앞 예측
  return minimax(2);
}
```
{% endraw %}

처음엔 전부 랜덤이었다가, 점점 전략적으로 변한다. 레벨 10은 실제로 꽤 어렵다.

---

## 애니메이션

### 체인 애니메이션

{% raw %}
```typescript
async function animateChain(chain: Card[]) {
  for (let i = 0; i < chain.length; i++) {
    // 카드 강조
    card.animate({
      transform: ['scale(1)', 'scale(1.25)', 'scale(1.1)'],
      boxShadow: ['0 0 0px gold', '0 0 40px gold', '0 0 30px gold'],
    }, { duration: 600 });
    
    // 사운드
    playTone(400 + i * 100);
    
    // 다음 카드까지 선 그리기
    if (i < chain.length - 1) {
      drawLine(chain[i], chain[i + 1]);
    }
    
    await delay(400);  // 충분히 느리게
  }
}
```
{% endraw %}

처음엔 200ms 간격으로 했더니 너무 빨라서 알아보기 힘들었다. 400ms로 늘렸다.

### 점수 이동

{% raw %}
```typescript
// 점수 팝업이 플레이어 스코어로 날아감
<motion.div
  initial={{ x: cardX, y: cardY }}
  animate={{ x: scoreX, y: scoreY, scale: 0.5 }}
  transition={{ duration: 0.8 }}
>
  +{points} PTS
</motion.div>
```
{% endraw %}

시각적으로 점수가 어디로 가는지 보여준다.

---

## 사운드

Web Audio API로 모든 사운드를 실시간 생성했다.

{% raw %}
```typescript
function playChainSound(index: number) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  
  osc.frequency.value = 400 + (index * 100);
  osc.type = 'sine';
  
  gain.gain.setValueAtTime(0.15, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  osc.connect(gain).connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + 0.3);
}
```
{% endraw %}

체인이 길어질수록 톤이 높아진다. 귀로도 몇 개 연결됐는지 알 수 있다.

---

## 모바일 대응

카드 크기를 반응형으로 조정했다.

{% raw %}
```typescript
// 모바일: 60×60px
// 태블릿: 70×70px
// 데스크탑: 80×80px

className="w-[60px] h-[60px] sm:w-[70px] sm:w-[70px] md:w-[80px] md:h-[80px]"
```
{% endraw %}

처음엔 직사각형(80×100px)이었는데, 보드에 배치했을 때 어색해서 정사각형으로 바꿨다.

화면 비율도 조정했다.

{% raw %}
```css
/* 상단(AI): 18vh */
/* 보드: flex-1 */
/* 하단(플레이어): 18vh */

@media (max-width: 640px) {
  .board { transform: scale(0.9); }
}
```
{% endraw %}

---

## 디테일

### 무승부 화면

초기 버전에는 무승부 처리가 없었다. 점수가 같으면 "Game Over"가 떴다.

무승부 전용 화면을 추가했다.

{% raw %}
```
🌗 IT'S A TIE!

HALF MOON: 12 PTS  |  YOU: 12 PTS

[🔄 RETRY LEVEL]
```
{% endraw %}

무승부면 같은 레벨을 다시 한다.

### 튜토리얼

튜토리얼 화면과 실제 게임 화면이 달랐다. 튜토리얼에는 위상 번호(0-7)가 표시됐는데, 실제 게임에는 없었다.

통일했다.

{% raw %}
```
Before: 🌒 (1) → 🌓 (2)
After:  🌒 → 🌓

Before: "0→1→2 순서"
After:  "🌑→🌒→🌓 순서"
```
{% endraw %}

---

## 테스트 데이터

100명 테스트 결과:

| 레벨 | 평균 시도 | Chain Steal 성공률 |
|------|----------|------------------|
| 1-3  | 1.2회    | 5%               |
| 4-6  | 2.3회    | 15%              |
| 7-9  | 4.8회    | 35%              |
| 10   | 11.2회   | 60%              |

레벨 10 클리어율: 23%

Chain Steal을 3번 이상 성공한 플레이어의 승률이 85%였다. 이 메커니즘을 이해하면 훨씬 유리하다.

---

## 배운 점

### 기술

- 그래프 알고리즘 실전 적용
- D3-Force로 물리 기반 레이아웃
- 게임 AI 난이도 밸런싱
- Web Audio API 프로시저럴 사운드

### 게임 디자인

- 간단한 룰에 깊이 있는 전략을 담기
- 애니메이션 속도가 사용자 이해도에 직접적 영향
- 피드백(시각/청각)이 게임 느낌을 결정

---

## 플레이

**게임**: [https://rise-of-halfmoon.vercel.app](https://rise-of-halfmoon.vercel.app)

**소스**: [https://github.com/nahyun27/rise-of-halfmoon](https://github.com/nahyun27/rise-of-halfmoon)

---

## 버그 리포트

버그를 발견하면 [GitHub Issues](https://github.com/nahyun27/rise-of-halfmoon/issues)에 제보 부탁드립니다.

필요한 정보:
- 어떤 상황에서 발생했나요?
- 기대한 동작은 무엇인가요?
- 실제로는 어떻게 동작했나요?
- 스크린샷 (가능하면)

개선 아이디어나 제안도 환영합니다.

---

## 마치며

구글 두들에서 본 간단한 게임을 직접 만들어봤다. 클론 코딩으로 시작했지만, Chain Steal 메커니즘을 추가하면서 다른 게임이 됐다.

가장 재밌었던 부분은 AI 밸런싱이었다. 너무 약하면 지루하고, 너무 강하면 짜증난다. 적절한 난이도를 찾는 게 생각보다 어려웠다.

체인 스틸 성공하면... 그 쾌감은 말로 표현할 수 없다. 직접 경험해보시길.

---

*Tags: #GameDev #Strategy #GraphAlgorithm #GameAI #CloneCoding*