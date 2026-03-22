---
layout: post
title: "[Program Synthesis #8] Bidirectional Search: Top-down과 Bottom-up의 결합"
date: 2026-03-21 00:00:00 +0900
categories: [PL / Formal Methods, Program Synthesis]
tags: [program synthesis, bidirectional search, top down, bottom up, search strategy, synthesis]
description: "Program Synthesis 시리즈 8편 – Top-down과 Bottom-up 탐색을 결합하여 search space를 효과적으로 줄이는 Bidirectional Search 이해하기"
image:
  path: /assets/img/posts/program-synthesis/ps08.png
  alt: Bidirectional Search
math: true
mermaid: false
series: Program Synthesis
---

## 들어가며 — 두 방향에서 동시에 탐색하기

지금까지 우리는 Program Synthesis를 다양한 관점에서 살펴봤다.

- Enumeration → 가능한 프로그램 생성
- Pruning / Prioritization → 탐색 효율 개선
- Representation → 프로그램 공간을 압축

---

이제 남은 질문은 이것이다.

> 탐색을 더 빠르게 만들 수는 없을까?

---

지금까지의 대부분의 방법은 한 방향으로 동작한다.

- Bottom-up → 작은 프로그램부터 쌓아올림
- Top-down → 목표로부터 구조를 분해

---

각각 장점이 있지만,  
단독으로 사용할 경우 명확한 한계를 가진다.

- Bottom-up → 너무 많은 후보 생성
- Top-down → 중간 상태를 평가하기 어려움

---

그래서 자연스럽게 다음 아이디어가 나온다.

> 두 방향을 동시에 사용하면 어떨까?

---

이 접근이 바로

> **Bidirectional Search**

이다.

---

이 방식에서는

- Bottom-up으로 생성된 부분 프로그램과
- Top-down으로 요구되는 구조

를 **중간에서 연결**한다.

---

즉 탐색은 더 이상 한 방향이 아니라

> **두 방향에서 동시에 수렴하는 과정**

이 된다.

---

이 글에서는 다음을 다룬다.

- Bottom-up과 Top-down의 한계
- Bidirectional Search의 핵심 아이디어
- 실제로 어떻게 연결되는지
- 왜 search space를 크게 줄일 수 있는지

---

## Bottom-up vs Top-down — 왜 하나로는 부족한가

Bidirectional Search를 이해하려면  
먼저 두 가지 기본 탐색 방식을 다시 살펴볼 필요가 있다.

---

### Bottom-up — 작은 것부터 쌓아올리기

Bottom-up 방식은 가장 직관적인 접근이다.

- terminal부터 시작하고
- 점점 더 큰 프로그램을 생성한다

---

이 방식의 장점은 명확하다.

- 항상 실행 가능한 프로그램만 생성된다
- 구현이 단순하다
- 완전한 탐색이 가능하다

---

하지만 문제도 분명하다.

> **너무 많은 프로그램을 만든다**

---

실제로 대부분의 후보는

- 의미 없는 조합이거나
- 문제와 전혀 관계없는 구조다

---

즉,

> 정답과 무관한 프로그램을 너무 많이 생성한다

---

### Top-down — 목표로부터 분해하기

Top-down 방식은 반대 방향이다.

- 목표 output을 기준으로
- 가능한 프로그램 구조를 추론한다

---

이 접근의 장점은 다음과 같다.

- 불필요한 구조를 애초에 생성하지 않는다
- 문제에 맞는 형태만 고려한다

---

하지만 이 방식도 한계를 가진다.

> **중간 상태를 평가하기 어렵다**

---

예를 들어:

~~~
E → Concat(E, E)
~~~

이 상태에서

- 어떤 E가 맞는지
- 어떤 선택이 좋은지

판단하기 어렵다.

---

즉,

> search 방향은 좋지만, guidance가 부족하다

---

### 핵심 문제

두 방식을 비교하면 다음과 같다.

- Bottom-up → 많은 후보 + 정확한 평가
- Top-down → 적은 후보 + 평가 어려움

---

즉 각각은 서로의 약점을 그대로 가진다.

---

### 자연스러운 질문

이 시점에서 질문은 명확해진다.

> Bottom-up의 “평가 가능성”과  
> Top-down의 “구조적 제한”을  
> 동시에 사용할 수는 없을까?

---

이 질문이 바로 다음 단계로 이어진다.

> **두 탐색을 중간에서 연결하는 방법**

---

## Bidirectional Search — 중간에서 만나는 탐색

앞에서 본 두 가지 접근은 각각 명확한 한계를 가진다.

- Bottom-up → 너무 많은 후보 생성
- Top-down → 중간 상태를 평가하기 어려움

---

Bidirectional Search는 이 두 문제를 동시에 해결하려는 시도다.

핵심 아이디어는 단순하다.

> 두 방향에서 탐색을 시작해서  
> **중간에서 만나게 한다**

---

### Meet-in-the-middle

이 방식은 일반적인 탐색에서도 자주 등장한다.

- 시작점에서 forward search
- 목표에서 backward search
- 중간에서 두 결과를 연결

---

Program Synthesis에서도 동일한 구조를 사용한다.

- Bottom-up → 가능한 부분 프로그램 생성
- Top-down → 필요한 구조를 정의

---

그리고 이 둘이 “맞아떨어지는 지점”을 찾는다.

---

### 직관적인 예

다음 문제를 생각해보자.

> 문자열 "abc"를 만드는 프로그램

---

Top-down에서는 다음과 같이 생각한다.

~~~
Concat(E1, E2)
~~~

그리고 조건은:

- E1 + E2 = "abc"

---

즉 가능한 분해는 다음과 같다.

- ("a", "bc")
- ("ab", "c")

---

이건 Top-down이 제공하는 정보다.

> 어떤 구조가 가능한지

---

한편 Bottom-up에서는 다음을 생성한다.

- "a"
- "b"
- "c"
- "ab"
- "bc"

---

이건 Bottom-up이 제공하는 정보다.

> 어떤 부분 프로그램이 실제로 존재하는지

---

이제 핵심이 나온다.

- Top-down: ("a", "bc")
- Bottom-up: "a", "bc" 존재

→ 연결 가능

---

즉,

> 두 탐색이 **중간에서 만난다**

---

### 구조적으로 보면

이 과정을 더 일반화하면 다음과 같다.

- Top-down → 요구사항을 subproblem으로 분해
- Bottom-up → 가능한 sub-solution 생성
- Matching → 두 결과를 연결

---

즉 탐색은 이렇게 바뀐다.

- 단방향 탐색 → 양방향 수렴

---

### 왜 효과적인가

이 방식이 강력한 이유는 명확하다.

Bottom-up은:

- 실제로 존재하는 프로그램만 제공하고

Top-down은:

- 필요한 구조만 제공한다

---

이 둘이 결합되면:

> **“필요하면서 동시에 존재하는 프로그램”만 고려한다**

---

즉 search space는 다음처럼 줄어든다.

- 기존 → 전체 프로그램 공간
- 변경 → 구조와 일치하는 부분만

---

### 핵심 관점

Bidirectional Search는 단순한 최적화가 아니다.

> 탐색을 “필터링된 결합 과정”으로 바꾼다

---

이제 탐색은 더 이상

- 생성 → 검사

가 아니라

- 생성 (Bottom-up)
- 요구 (Top-down)
- 연결 (Match)

로 구성된다.

---

## Bidirectional Search를 구현하는 방법

앞에서 Bidirectional Search의 핵심 아이디어를 살펴봤다.

이제 중요한 질문은 이것이다.

> 이걸 실제로 어떻게 구현할 수 있을까?

---

### 전체 구조

Bidirectional Search는 크게 세 단계로 구성된다.

1. Bottom-up으로 부분 프로그램을 생성한다  
2. Top-down으로 요구되는 구조를 분해한다  
3. 두 결과를 매칭하여 결합한다  

---

이 과정을 반복하면서 점점 더 큰 프로그램을 만든다.

---

### 핵심 데이터 구조

이 방식에서 중요한 것은 “중간 결과를 저장하는 방법”이다.

보통 다음과 같은 형태를 사용한다.

---

#### Bottom-up 테이블

각 값에 대해, 그 값을 생성할 수 있는 프로그램들을 저장한다.

예:

~~~
" a "  → { "a" }
" b "  → { "b" }
" ab " → { Concat("a","b") }
~~~

---

즉,

> **value → 프로그램 집합**

---

이 구조는 매우 중요하다.

왜냐하면 Top-down에서 요구하는 값과 바로 매칭할 수 있기 때문이다.

---

#### Top-down 요구

Top-down은 목표를 분해한다.

예:

~~~
target = "abc"

→ Concat(E1, E2)
→ ("a", "bc"), ("ab", "c")
~~~

---

즉,

> 필요한 sub-value들을 생성한다

---

### Matching 과정

이제 핵심 단계다.

Top-down에서 요구한 값이  
Bottom-up에서 이미 생성된 값과 일치하는지 확인한다.

---

예:

- Top-down: ("a", "bc")
- Bottom-up: "a", "bc" 존재

→ 결합 가능

---

이때 새로운 프로그램이 만들어진다.

~~~
Concat("a", "bc")
~~~

---

### 전체 알고리즘 흐름

이걸 정리하면 다음과 같다.

~~~
BottomUpTable = {}

while True:
    expand bottom-up programs
    propagate top-down constraints
    
    for each subproblem:
        if match found in BottomUpTable:
            combine and build larger program
    
    if solution found:
        return program
~~~

---

### 중요한 최적화

이 구조에서 성능을 결정하는 요소는 다음과 같다.

---

#### 1. Value-based pruning

같은 값을 만드는 프로그램은 하나로 묶는다.

→ observational equivalence와 연결됨

---

#### 2. Early matching

Top-down 요구가 나오면  
즉시 Bottom-up과 비교한다.

→ 불필요한 확장 방지

---

#### 3. Memoization

이미 계산한 subproblem은 다시 계산하지 않는다.

→ 중복 제거

---

### 핵심 직관

이 알고리즘의 핵심은 다음이다.

- Bottom-up은 “가능한 것”을 제공하고
- Top-down은 “필요한 것”을 제공한다

---

그리고 두 조건을 동시에 만족하는 경우만 남는다.

> **가능하면서 동시에 필요한 프로그램**

---

이 조건이 search space를 급격히 줄인다.

---

### 구조적으로 보면

Bidirectional Search는 다음과 같이 볼 수 있다.

- Enumeration → 후보 생성
- Constraint → 구조 제한
- Matching → 결합

---

즉 탐색은 더 이상 단순한 생성이 아니라

> **조건을 만족하는 조합을 찾는 과정**

으로 바뀐다.

---

## 왜 Bidirectional Search는 빠른가

Bidirectional Search의 아이디어와 구현을 살펴봤다.

이제 중요한 질문이 남는다.

> 왜 이 방식이 실제로 그렇게 큰 성능 향상을 가져올까?

---

### 단방향 탐색의 비용

먼저 Bottom-up을 생각해보자.

프로그램의 크기를 $$d$$라고 하면,

가능한 프로그램의 수는 대략 다음과 같이 증가한다.

$$
O(b^d)
$$

여기서 $$b$$는 branching factor다.

---

즉 depth가 조금만 증가해도  
탐색 공간은 급격히 커진다.

---

### Bidirectional의 핵심 아이디어

Bidirectional Search는 이 깊이를 반으로 나눈다.

- Bottom-up → depth $$d/2$$까지 탐색
- Top-down → depth $$d/2$$까지 분해

---

그리고 중간에서 연결한다.

---

### 복잡도 변화

이제 탐색 비용은 다음처럼 바뀐다.

- 기존: $$O(b^d)$$
- 변경: $$O(b^{d/2}) + O(b^{d/2})$$

---

즉,

$$
O(b^d) \rightarrow O(b^{d/2})
$$

---

이 차이는 매우 크다.

예를 들어:

- $$b = 10$$
- $$d = 6$$

---

- 단방향: $$10^6 = 1,000,000$$
- 양방향: $$2 \cdot 10^3 = 2,000$$

---

거의 **500배 이상 차이**가 난다.

---

### 왜 가능한가

이게 가능한 이유는 다음과 같다.

Bidirectional Search는 단순히 탐색을 나누는 것이 아니다.

> 탐색 공간을 “조건 기반으로 분할”한다

---

- Bottom-up → 실제로 존재하는 프로그램만
- Top-down → 필요한 구조만

---

이 두 조건을 동시에 적용하면

> 고려해야 할 후보가 급격히 줄어든다

---

### Matching의 역할

여기서 핵심은 Matching이다.

중간에서 두 탐색이 만나는 순간,

- 불필요한 경로는 제거되고
- 가능한 경로만 남는다

---

즉,

> 탐색은 더 이상 “확장”이 아니라  
> **“필터링된 결합”**이 된다

---

### 직관적으로 보면

단방향 탐색은 이런 구조다.

- 계속 확장
- 나중에 필터링

---

Bidirectional Search는 다르다.

- 확장 전에 필터링
- 필요한 부분만 확장

---

이 차이가 성능 차이를 만든다.

---

### 중요한 한계

물론 항상 좋은 것은 아니다.

- matching 비용이 클 수 있다
- representation이 없으면 효과가 제한적이다
- 문제에 따라 적용이 어려울 수 있다

---

즉 Bidirectional Search는

> **조건이 맞을 때 매우 강력한 전략**

이다.

---

### 핵심 정리

- 탐색 깊이를 절반으로 줄인다
- 불필요한 후보를 초기에 제거한다
- 두 방향의 정보를 결합한다

---

이 세 가지가 결합되면서  
탐색 성능이 크게 향상된다.


--

## 정리 — 탐색은 구조적으로 설계되어야 한다

지금까지 Bidirectional Search를 통해  
두 방향에서 탐색을 결합하는 방법을 살펴봤다.

---

이 방식이 중요한 이유는 단순한 성능 향상 때문만은 아니다.

더 중요한 변화는 다음에 있다.

> 탐색을 더 이상 “한 방향으로 확장하는 과정”으로 보지 않는다

---

대신 탐색은 이렇게 재구성된다.

- Bottom-up → 가능한 부분 프로그램 생성  
- Top-down → 필요한 구조 정의  
- Matching → 두 조건을 동시에 만족하는 후보만 선택  

---

이 구조는 지금까지 살펴본 여러 개념과 연결된다.

- Enumeration → 후보 생성  
- Pruning → 불필요 제거  
- Representation → 공간 압축  
- Bidirectional → 탐색 방향 결합  

---

즉 Program Synthesis는 점점 다음과 같은 형태로 발전해왔다.

> 단순한 생성 → 필터링 → 구조화된 탐색

---

이제 탐색은 더 이상 brute-force가 아니라

> **설계된 과정(designed process)**

이다.

---

이 관점은 이후의 기법들을 이해하는 데 중요한 기반이 된다.

- 더 복잡한 search 전략
- 확률 기반 탐색과의 결합
- constraint와의 통합

---

다음 단계에서는 이 흐름을 이어서,

> **Stochastic Search**

를 살펴본다.

탐색을 확률적으로 수행하여  
local optimum을 넘어서고 더 넓은 공간을 탐색하는 방법이다.
