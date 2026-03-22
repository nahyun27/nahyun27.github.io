---
layout: post
title: "[Program Synthesis #9] Stochastic Search: 확률로 프로그램을 찾는 방법"
date: 2026-03-21 00:00:00 +0900
categories: [PL / Formal Methods, Program Synthesis]
tags: [program synthesis, stochastic search, local search, cost function, superoptimization, heuristic]
description: "Program Synthesis 시리즈 9편 – 확률 기반 탐색과 local search를 통해 넓은 프로그램 공간을 효율적으로 탐색하는 방법 이해하기"
image:
  path: /assets/img/posts/program-synthesis/stochastic.png
  alt: Stochastic Search
math: true
mermaid: false
series: Program Synthesis
---

## 들어가며 — 완벽하게 찾지 말고, 점점 개선하자

지금까지 우리는 Program Synthesis를 “체계적으로 탐색하는 문제”로 다뤄왔다.

- Enumeration → 가능한 프로그램 생성
- Pruning / Prioritization → 탐색 효율 개선
- Representation → 공간 압축
- Bidirectional → 탐색 방향 결합

---

이 접근들은 모두 공통된 특징을 가진다.

> 가능한 프로그램을 “정확하게” 찾으려고 한다

---

즉,

- 조건을 만족하는 프로그램만 고려하고
- 틀린 후보는 제거하며
- 점점 정답으로 수렴한다

---

이 방식은 강력하지만, 한 가지 한계가 있다.

> search space가 너무 크면, 아무리 잘 설계해도 힘들다

---

특히 다음과 같은 경우 문제가 된다.

- 프로그램 구조가 매우 복잡할 때
- grammar가 크고 자유도가 높을 때
- 정답이 “희귀한 형태”일 때

---

이때는 다른 접근이 필요하다.

> **완벽하게 찾으려고 하지 말고, 점점 개선해보자**

---

이 아이디어에서 출발한 방법이

> **Stochastic Search**

다.

---

이 방식에서는

- 프로그램을 하나 선택하고
- 조금씩 수정하면서
- 점점 더 좋은 프로그램으로 이동한다

---

즉 탐색은 더 이상

> 전체 공간을 체계적으로 훑는 과정

이 아니라

> **공간 위를 “이동”하는 과정**

이 된다.

---

이 글에서는 다음을 다룬다.

- Local Search의 기본 아이디어
- Cost function과 프로그램 평가
- Mutation / Neighborhood 정의
- 왜 이 방식이 큰 공간에서 효과적인지

---


## Local Search — 프로그램 공간 위를 이동하기

Stochastic Search의 핵심은 Local Search다.

이 방식에서는 프로그램을 하나의 “정답 후보”로 보고,  
그 주변을 탐색하면서 점점 더 좋은 프로그램으로 이동한다.

---

### 기본 아이디어

Local Search는 다음과 같은 구조를 가진다.

1. 초기 프로그램 $$f_0$$를 선택한다  
2. 이웃(neighbor) 프로그램을 생성한다  
3. 더 좋은 프로그램으로 이동한다  
4. 이를 반복한다  

---

이 과정을 수식적으로 보면 다음과 같다.

$$
f_0 \rightarrow f_1 \rightarrow f_2 \rightarrow \dots
$$

---

즉 탐색은 더 이상

- 프로그램을 “생성”하는 과정이 아니라

> **프로그램 공간 위를 “이동”하는 과정**

이 된다.

---

### 핵심 구성 요소

이 방식에서 중요한 것은 세 가지다.

---

#### 1. 초기 프로그램 (Initialization)

탐색은 항상 하나의 프로그램에서 시작한다.

예:

- 랜덤 프로그램
- 간단한 baseline
- heuristic으로 생성된 프로그램

---

초기 선택은 매우 중요하다.

> 시작점이 좋을수록 빠르게 수렴한다

---

#### 2. 이웃 정의 (Neighborhood)

하나의 프로그램에서 “조금 다른 프로그램”을 만드는 방법이다.

예:

- 연산자 변경  
  ~~~
  x + y → x * y
  ~~~

- 상수 변경  
  ~~~
  x + 1 → x + 2
  ~~~

- subtree 교체  
  ~~~
  (x + y) → (x + 1)
  ~~~

---

이웃은 다음 조건을 만족해야 한다.

- 충분히 다양해야 하고
- 너무 멀지 않아야 한다

---

즉,

> **“조금씩 변화시키는 연산”**

이어야 한다.

---

#### 3. 평가 함수 (Cost Function)

각 프로그램이 얼마나 좋은지 평가하는 기준이다.

예:

$$
cost(f) = \sum_{x \in E} \mathbf{1}[f(x) \neq target(x)]
$$

---

즉:

- 틀린 input 개수
- error 크기
- 또는 성능 metric

---

이 함수가 탐색 방향을 결정한다.

> 더 좋은 프로그램 = cost가 낮은 프로그램

---

### 기본 알고리즘

Local Search는 보통 다음과 같이 동작한다.

~~~
f = initial_program()

while not done:
    f' = random_neighbor(f)
    
    if cost(f') < cost(f):
        f = f'
~~~

---

이건 가장 단순한 형태인 Hill Climbing이다.

---

### 직관

이 과정을 직관적으로 보면 다음과 같다.

- 프로그램 공간 = 거대한 지형
- 각 프로그램 = 하나의 점
- cost = 높이

---

Local Search는:

> **높이를 낮추는 방향으로 계속 이동하는 과정**

이다.

---

### 중요한 특징

이 방식의 가장 큰 특징은 다음이다.

> 전체 공간을 보지 않는다

---

대신:

- 현재 위치 주변만 보고
- 점점 더 나은 방향으로 이동한다

---

이 덕분에

- 매우 큰 search space에서도
- 빠르게 좋은 해를 찾을 수 있다

---

## Local Optimum — 왜 멈추는가, 그리고 어떻게 탈출하는가

Local Search는 단순하고 강력하다.

하지만 한 가지 치명적인 문제가 있다.

> **local optimum에 빠질 수 있다**

---

### Local Optimum이란 무엇인가

Local Search는 항상 더 좋은 방향으로만 이동한다.

즉,

- cost가 줄어드는 경우만 선택한다

---

문제는 다음과 같은 상황이다.

- 현재 프로그램 $$f$$보다 더 좋은 이웃이 없음
- 하지만 전역적으로는 더 좋은 프로그램이 존재함

---

즉,

> **더 좋은 해가 있음에도 불구하고 멈춘다**

---

### 직관적으로 보면

프로그램 공간을 “지형”으로 생각해보자.

- 낮은 곳 = 좋은 프로그램
- 높은 곳 = 나쁜 프로그램

---

Local Search는 이렇게 움직인다.

> 항상 아래로만 내려간다

---

문제는 다음이다.

- 작은 골짜기(local minimum)에 도달하면
- 더 이상 내려갈 수 없음

---

하지만 더 큰 골짜기(global minimum)는  
다른 위치에 있을 수 있다.

---

### 해결 방법 1 — Random Restart

가장 간단한 방법이다.

> 여러 번 다시 시작한다

---

알고리즘:

~~~
for i in range(N):
    f = random_initial()
    run local search
    keep best result
~~~

---

이 방법의 핵심은:

> 다양한 시작점을 통해 다른 영역을 탐색한다

---

### 해결 방법 2 — Simulated Annealing

조금 더 정교한 방법이다.

> 가끔은 나쁜 선택도 허용한다

---

기본 아이디어:

- cost가 낮아지면 항상 이동
- cost가 높아져도 일정 확률로 이동

---

확률은 다음과 같이 정의된다.

$$
P = e^{-\Delta / T}
$$

- $$\Delta$$ = cost 증가량
- $$T$$ = temperature

---

초기에는 $$T$$가 크다 → 자유롭게 이동  
나중에는 $$T$$가 작다 → 안정적으로 수렴

---

즉,

> 초반에는 탐색, 후반에는 수렴

---

### 해결 방법 3 — Stochastic Acceptance

간단한 확률 기반 방법이다.

- 더 좋은 해 → 항상 선택
- 나쁜 해 → 일정 확률로 선택

---

이 방식은:

- 구현이 간단하고
- 탐색 다양성을 유지한다

---

### 핵심 직관

이 모든 방법의 공통점은 하나다.

> **“완벽한 선택”을 포기한다**

---

즉,

- 항상 최선만 선택하지 않고
- 때로는 돌아가기도 하면서
- 더 넓은 공간을 탐색한다

---

### 중요한 관점

Deterministic search는:

> 항상 옳은 선택을 하려고 한다

---

Stochastic search는:

> **가끔 틀린 선택을 통해 더 나은 결과를 찾는다**

---

이 차이가 큰 공간에서 성능 차이를 만든다.

---

### 정리

- Local Search는 빠르지만 local optimum에 갇힐 수 있다
- 이를 해결하기 위해 확률적 요소를 도입한다
- 탐색과 수렴 사이의 균형이 중요하다

---

## 실제 적용 — Superoptimization과 STOKE

지금까지 Stochastic Search의 구조와 문제, 그리고 해결 방법을 살펴봤다.

이제 중요한 질문은 이것이다.

> 이 방식이 실제로 어디에 쓰일까?

---

### Superoptimization 문제

가장 대표적인 응용이 바로 **Superoptimization**이다.

---

문제는 다음과 같다.

> 주어진 프로그램과 동일한 동작을 하면서  
> **더 빠른 프로그램을 찾아라**

---

예를 들어:

~~~
x * 2
~~~

이걸 더 빠르게 만들면:

~~~
x << 1
~~~

---

이건 간단한 예지만, 실제로는 훨씬 복잡하다.

- instruction sequence
- CPU architecture
- latency / throughput

---

즉,

> 가능한 프로그램 공간이 매우 크다

---

### 왜 기존 방법이 어려운가

이 문제는 기존 synthesis 방법으로 풀기 어렵다.

- search space가 너무 크고
- grammar가 매우 자유롭고
- 정답 구조가 명확하지 않다

---

즉,

> 체계적인 탐색으로는 감당하기 어렵다

---

### Stochastic 접근

여기서 Stochastic Search가 등장한다.

---

기본 구조는 다음과 같다.

1. 초기 프로그램을 선택한다  
2. mutation을 통해 새로운 프로그램을 만든다  
3. cost를 비교해서 더 좋은 방향으로 이동한다  

---

여기서 cost는 다음과 같이 정의된다.

- correctness (동일한 결과)
- performance (실행 속도)

---

즉,

$$
cost(f) = correctness\_penalty + performance\_cost
$$

---

### STOKE

이 접근을 실제로 구현한 대표적인 시스템이

> **STOKE**

다.

---

STOKE는 다음과 같이 동작한다.

- 프로그램을 랜덤하게 변형 (mutation)
- equivalence를 테스트 (test cases / SMT)
- 더 좋은 프로그램으로 이동

---

이 과정은 완전히 stochastic하다.

---

### 중요한 특징

STOKE의 핵심은 이것이다.

> 완벽하게 증명하지 않고,  
> **좋은 프로그램을 찾는다**

---

즉,

- correctness는 테스트 기반으로 확인하고
- performance는 cost로 평가한다

---

이건 기존 synthesis와 큰 차이다.

---

### 왜 효과적인가

이 방식이 잘 작동하는 이유는 다음과 같다.

- search space가 너무 클 때
- 구조적 접근이 어려울 때
- local improvement가 가능한 문제일 때

---

이 경우 stochastic search는

> **유일하게 실용적인 방법**

이 될 수 있다.

---

### 핵심 관점

이 시점에서 synthesis는 또 한 번 바뀐다.

- 기존 → “정답 프로그램을 찾는다”
- 이제 → **“더 좋은 프로그램을 찾는다”**

---

즉,

> optimization 문제로 확장된다

---

### 한계

물론 단점도 있다.

- 항상 최적 해를 보장하지 않는다
- correctness가 완벽하지 않을 수 있다
- tuning이 필요하다

---

그래서 이 방법은 보통

- 다른 방법과 결합되거나
- 특정 문제에 제한적으로 사용된다

---

### 정리

- Stochastic Search는 매우 큰 공간에서 강력하다
- local search + 확률적 선택이 핵심이다
- 실제 시스템 (STOKE)에서 효과적으로 사용된다

---

## 정리 — 완벽한 탐색에서, 확률적 탐색으로

지금까지 Stochastic Search를 통해  
확률 기반으로 프로그램을 탐색하는 방법을 살펴봤다.

---

지금까지의 흐름을 돌아보면, Program Synthesis는 점점 다음과 같이 확장되어 왔다.

- Enumeration → 가능한 프로그램 생성  
- Pruning / Prioritization → 탐색 효율 개선  
- Representation → 공간 압축  
- Bidirectional → 탐색 방향 결합  

---

이 모든 접근은 공통된 목표를 가진다.

> 가능한 한 “정확하게” 정답 프로그램을 찾는다

---

하지만 Stochastic Search는 이 흐름에서 한 걸음 더 나아간다.

> 완벽한 탐색을 포기하고,  
> **좋은 해를 빠르게 찾는 것**을 목표로 한다

---

이 변화는 단순한 성능 개선이 아니다.

문제 자체를 다음처럼 재정의한다.

- 기존 → 정확한 프로그램을 찾는 문제  
- 이제 → **더 나은 프로그램을 찾는 문제**

---

즉 Program Synthesis는

> **탐색 문제이면서 동시에 최적화 문제**

로 확장된다.

---

이 관점은 특히 다음과 같은 상황에서 중요하다.

- search space가 너무 클 때  
- 구조적 접근이 어려울 때  
- 완벽한 해보다 “충분히 좋은 해”가 중요한 경우  

---

물론 이 접근은 trade-off를 가진다.

- 최적성을 보장하지 않으며  
- correctness 검증이 어려울 수 있다  

---

그래서 실제 시스템에서는

- deterministic search  
- constraint solving  
- stochastic search  

를 상황에 따라 결합한다.

---

이 시점에서 synthesis는 더 이상 단일 기법이 아니다.

> **여러 전략이 결합된 복합적인 탐색 시스템**

이다.

---

다음 글에서는 이 흐름을 이어서,

> **Constraint-Based Synthesis**

를 살펴본다.

SAT/SMT를 기반으로  
프로그램을 논리적으로 구성하는 접근이다.

