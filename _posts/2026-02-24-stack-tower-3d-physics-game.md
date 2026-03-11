---
layout: post
title: "Stack Tower: 3D 타이밍 게임으로 배운 물리 엔진과 사용자 경험"
date: 2026-02-24 17:45:00 +0900
categories: [Projects, Game Development]
tags: [threejs, physics, game-dev, cannon-js, webgl, javascript, 3d-game]

description: "Three.js와 Cannon.js로 만든 3D 타이밍 게임. 물리 엔진 구현부터 60fps 최적화, 중독성 있는 UX 디자인까지 실전 개발기"

image:
  path: /assets/img/posts/stack-tower/demo.gif
  alt: Stack Tower - 3D 타이밍 쌓기 게임

keywords: [Three.js 게임, 웹 게임 개발, 물리 엔진, Cannon.js, WebGL, 게임 최적화]
---

## 시작

Three.js를 한 번 써보고 싶었다. 2D 웹 게임은 몇 번 만들어봤지만, 3D는 처음이었다. 

간단하면서도 물리 엔진을 경험할 수 있는 프로젝트를 찾다가 타이밍 쌓기 게임을 선택했다. 

결과적으로는 생각보다 빠르게 완성됐고,  
Three.js와 물리 엔진의 기본 개념을 익히기에 꽤 좋은 프로젝트가 됐다.

---

## 게임 룰

1. 블록이 좌우로 움직인다
2. 클릭하면 멈춘다
3. 이전 블록과 겹치는 부분만 남는다
4. 어긋난 부분은 날아간다
5. 10층마다 속도가 증가한다

끝이다.

---

## 기술 스택

{% raw %}
```typescript
- Three.js (3D 렌더링)
- Cannon.js (물리 엔진)
- Vanilla JavaScript
- Vite (번들러)
```
{% endraw %}

프레임워크를 안 쓴 이유는 간단하다. Three.js 자체를 배우는 게 목적이었기 때문이다. React나 Vue를 거치면 오히려 복잡해질 것 같았다.

게임 루프를 직접 구현하는 것도 배우고 싶었다.

{% raw %}
```javascript
function gameLoop() {
  requestAnimationFrame(gameLoop);
  
  // 물리 시뮬레이션
  world.step(1/60);
  
  // Three.js 렌더링
  renderer.render(scene, camera);
}
```
{% endraw %}

게임 루프를 직접 작성해보니 렌더링과 물리 시뮬레이션이 어떻게 맞물리는지 훨씬 이해하기 쉬웠다.

---

## Three.js 기본 구조

Three.js의 구조는 생각보다 단순하다.

{% raw %}
```javascript
// Scene: 모든 객체를 담는 컨테이너
const scene = new THREE.Scene();

// Camera: 어디서 볼 것인가
const camera = new THREE.PerspectiveCamera(
  75,                                    // FOV
  window.innerWidth / window.innerHeight, // Aspect
  0.1,                                   // Near
  1000                                   // Far
);

// Renderer: 실제로 그리기
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

// Light: 조명 없으면 안 보임
const light = new THREE.DirectionalLight(0xffffff, 1);
scene.add(light);
```
{% endraw %}

그리고 한 가지 중요한 것이,

조명이 없으면 아무것도 보이지 않는다...

처음 실행했을 때 화면이 새까맣게 나와서 한참을 헤맸다.

3D 엔진을 처음 사용할 때 가장 흔한 실수 중 하나다.

---

## Cannon.js로 물리 구현

블록이 떨어지고 튕기는 것을 구현하려면 물리 엔진이 필요했다.

{% raw %}
```javascript
// 물리 세계 생성
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

// 블록 물리 바디
const blockBody = new CANNON.Body({
  mass: 1,
  shape: new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2)),
  position: new CANNON.Vec3(x, y, z)
});

world.addBody(blockBody);
```
{% endraw %}

물리 시뮬레이션과 Three.js 렌더링을 동기화하는 게 핵심이다.

{% raw %}
```javascript
// 매 프레임마다
world.step(1/60);

// 물리 위치를 Three.js 메시에 복사
blockMesh.position.copy(blockBody.position);
blockMesh.quaternion.copy(blockBody.quaternion);
```
{% endraw %}

---

## Perfect 보너스 시스템

초기 버전은 그냥 블록을 쌓기만 했다. 재미는 있었지만 10층 이후부터 금방 질렸다.

그래서 추가한 것이 Perfect 시스템이다.

완벽하게 쌓으면 블록이 잘리지 않고 추가 점수를 주도록 만들었다.

{% raw %}
```javascript
const overlap = calculateOverlap(current, previous);
const accuracy = overlap / previous.width;

if (accuracy > 0.99) {
  // Perfect! 블록 크기 유지
  current.width = previous.width;
  showPerfectEffect();
} else {
  // 겹친 부분만 남김
  current.width = overlap;
}
```
{% endraw %}

Perfect를 계속 성공하면 블록이 넓게 유지되고 점수 격차도 커진다.

---

## 잘린 블록 날리기

처음엔 어긋난 부분을 그냥 사라지게 했더니 너무 밋밋했다.

그래서 잘린 조각도 물리 객체로 만들어 날려버렸다.

{% raw %}
```javascript
// 잘린 조각도 물리 객체로
const cutPiece = new CANNON.Body({
  mass: 1,
  shape: new CANNON.Box(cutSize),
  position: cutPosition
});

// 옆으로 튕겨나가는 힘
cutPiece.velocity.set(direction * 5, 2, 0);

// 회전
cutPiece.angularVelocity.set(
  Math.random() * 5,
  Math.random() * 5,
  Math.random() * 5
);

world.addBody(cutPiece);
```
{% endraw %}

블록이 진짜로 날아가면서 회전하고 떨어진다. 실수해도 보는 재미가 있다.

---

## 난이도 조절 실패

처음에는 이렇게 구현했다.

{% raw %}
```javascript
// ❌ 처음 시도: 10층마다 2배
speed = baseSpeed * Math.pow(2, Math.floor(level / 10));
```
{% endraw %}

당연히 20층은 거의 불가능하고 30층은 인간 반응속도를 초과하는 수준이었다.

그래서 로그 스케일로 바꿨다.

{% raw %}
```javascript
// ✅ 수정: 점진적 증가
speed = baseSpeed * (1 + level * 0.05);

// 10층: 1.5배
// 20층: 2배
// 50층: 3.5배
```
{% endraw %}

50층도 집중하면 가능한(?) 수준이 됐다.
(성공한 사람을 본적은 없다.)

---

## 카메라 이동

블록을 계속 쌓다 보니 카메라가 바닥만 보고 있었다.

그래서 높이에 따라 카메라가 올라가도록 만들었다.

{% raw %}
```javascript
function updateCamera() {
  const targetY = currentHeight + 10;
  camera.position.y += (targetY - camera.position.y) * 0.1;
}
```
{% endraw %}

부드럽게 따라 올라간다.

---

## 모바일 터치 지연

모바일 테스트 중 이상한 점을 발견했다.

탭 반응이 항상 늦었다.

한 0.1초 정도 지연됐다. 항상 늦게 멈춰서 실패했다.

원인은 브라우저의 더블탭 줌 감지였다.

{% raw %}
```javascript
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();  // 기본 동작 차단
  handleStop();
}, { passive: false });
```
{% endraw %}

이 한 줄로 문제 해결.

---

## 최적화

블록이 많아지면 렉이 생겼다.

그래서 두 가지를 적용했다.

{% raw %}
```javascript
// ❌ 모든 블록 렌더링
blocks.forEach(block => renderer.render(block));

// ✅ 화면 밖은 제외
const visible = blocks.filter(block => isInViewport(block, camera));
visible.forEach(block => renderer.render(block));

// ✅ 같은 모양은 Instanced Mesh
const instancedMesh = new THREE.InstancedMesh(
  geometry,
  material,
  maxBlocks
);
```
{% endraw %}

이후 200개 블록에서도 60fps를 유지한다.

---

## 사운드

노래는 https://pixabay.com/music/에서 직접 골랐다.

{% raw %}
```javascript
function playSound(type) {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  if (type === 'perfect') {
    osc.frequency.value = 800;  // 높은 음
  } else if (type === 'good') {
    osc.frequency.value = 600;  // 중간
  } else {
    osc.frequency.value = 400;  // 낮은 음
  }
  
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
  
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}
```
{% endraw %}

Perfect, Good, Miss마다 다른 음을 낸다.

---

## 배운 점

### Three.js

- Scene, Camera, Renderer 구조
- Mesh, Geometry, Material 개념
- 조명의 중요성
- 좌표계 (Y축이 위)

### Cannon.js

- 물리 세계와 렌더링 동기화
- Body, Shape, Mass
- 중력, 속도, 각속도

### 게임 디자인

- 간단한 룰이 중독성의 핵심
- 완벽함에 대한 보상 (Perfect 시스템)
- 실패도 재미있게 (블록 날아가는 것)

---

## 개발 시간

전체: 약 3일
- Day 1: Three.js 기본 + 블록 쌓기
- Day 2: 물리 엔진 + Perfect 시스템
- Day 3: 사운드 + 모바일 최적화

생각보다 빨리 만들어졌다. 룰이 간단해서 가능했다.

이 프로젝트로 Three.js와 물리 엔진에 자신감이 생겼다. 다음 프로젝트(Rise of the Half Moon)를 시작할 수 있었던 계기가 됐다.

---

## 플레이

**게임**: [https://stack-tower.vercel.app](https://stack-tower.vercel.app)

**소스**: [https://github.com/YOUR_USERNAME/stack-tower](https://github.com/YOUR_USERNAME/stack-tower)

---

## 버그 리포트

버그를 발견하면 [GitHub Issues](https://github.com/YOUR_USERNAME/stack-tower/issues)에 제보 부탁드립니다.

필요한 정보:
- 어떤 상황인가요?
- 기대한 동작은?
- 실제 동작은?
- 스크린샷 (가능하면)

---

## 마치며

Three.js를 배우려고 시작한 프로젝트였다. 간단한 게임이지만 3D 렌더링과 물리 엔진의 기초를 배우기에 좋았다.

가장 중요한 교훈은 "간단한 룰을 재미있게 만드는 것이 더 어렵다"는 것이었다. 복잡한 메커니즘을 추가하는 건 쉽지만, 한 가지를 완벽하게 만드는 건 어렵다.

50층 돌파하면 댓글로 인증 부탁드립니다.

---

*Tags: #GameDev #ThreeJS #Physics #WebGL #CannonJS*