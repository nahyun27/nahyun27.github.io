---
layout: post
title: "[Program Synthesis #4] Enumerative Synthesis: 가능한 프로그램을 전부 만들어보면?"
date: 2026-03-21 00:00:00 +0900
categories: [PL / Formal Methods, Program Synthesis]
tags: [program synthesis, enumeration, search, sygus, grammar, brute force, formal methods]
description: "Program Synthesis 시리즈 4편 – Grammar 기반으로 프로그램을 실제로 생성하는 가장 기본적인 방법인 Enumerative Synthesis 이해하기"
image:
  path: /assets/img/posts/program-synthesis/enumeration.png
  alt: Enumerative Search
math: true
mermaid: false
series: Program Synthesis
---

## Enumerative Synthesis — 가장 단순한 방법

이제 우리는 Program Synthesis의 전체 구조를 알고 있다.

$$
\text{Search} \rightarrow \text{Check} \rightarrow \text{Refine}
$$

그리고 CEGIS를 통해 “어떻게 반복하는지”도 이해했다.

---

그렇다면 이제 남은 질문은 이것이다.

> **“프로그램 후보는 어떻게 만들까?”**

---

이 질문에 대한 가장 단순하고 직접적인 답이 바로

> **Enumerative Synthesis**

이다.

---

### 핵심 아이디어

아이디어는 놀랍도록 단순하다.

> **“가능한 프로그램을 하나씩 만들어보고, 맞는지 검사하자”**

---

즉,

1. Grammar로부터 프로그램을 하나 생성한다
2. Specification을 만족하는지 검사한다
3. 맞으면 종료, 아니면 다음 후보

---

이걸 수식적으로 보면:

$$
\text{for } e \in L(G):\ \text{if } P(e)\ \text{return } e
$$

---

### 이게 가능한 이유

이 방식이 가능한 이유는 단 하나다:

> **Grammar가 search space를 유한하게 만들어주기 때문**

---

Grammar가 없다면:

- 가능한 프로그램 수 = 무한
- enumeration = 불가능

---

하지만 Grammar가 있으면:

$$
L(G) = \{ e_1, e_2, e_3, \dots \}
$$

이렇게 “순회 가능한 집합”이 된다.

---

### 직관적으로 보면

이건 사실 매우 익숙한 방식이다.

- brute-force search
- generate-and-test
- exhaustive search

---

즉 Enumerative Synthesis는

> **“가장 단순하지만, 가장 확실한 방법”**

이다.

---

## Search Space Explosion — 왜 enumeration은 어려운가

Enumerative Synthesis의 아이디어는 단순하다.

> 가능한 프로그램을 하나씩 만들어서 검사한다

---

그런데 여기서 바로 문제가 생긴다.

> **가능한 프로그램의 수는 얼마나 될까?**

---

### 간단한 grammar를 보자

아주 단순한 grammar를 하나 생각해보자:

$$
E ::= x \mid E + E
$$

---

이 grammar로 만들 수 있는 프로그램을 depth 기준으로 세어보면:

- depth 0:  
  $$x$$  
  → 1개

- depth 1:  
  $$x + x$$  
  → 2개

- depth 2:  
  더 많은 조합 등장  
  → 5개

---

일반적으로는 이런 형태가 된다:

$$
N(d) = 1 + N(d-1)^2
$$

---

이 식의 의미는 명확하다:

> **프로그램 수는 depth가 증가할수록 기하급수적으로 증가한다**

---

### 실제로는 얼마나 커질까

조금만 depth를 올려보면:

- $$d = 4$$ → 수십 개
- $$d = 5$$ → 수백 개
- $$d = 6$$ → 수십만 개
- $$d = 7$$ → 수천억 개

---

즉,

> **조금만 커져도 탐색 공간이 폭발한다**

---

### 연산이 많아지면 더 심각해진다

Grammar가 조금만 현실적으로 바뀌면 상황은 더 나빠진다.

$$
E ::= x \mid 1 \mid E + E \mid E \times E
$$

---

이제는:

- 변수
- 상수
- 여러 연산

이 모두 조합되면서

$$
N(d) = k + m \cdot N(d-1)^2
$$

형태가 된다.

---

여기서:

- $$k$$ = terminal 개수
- $$m$$ = 연산자 개수

---

결과는 뻔하다.

> **search space는 “이중 지수 수준”으로 증가한다**

---

### 직관적으로 보면

이걸 그림 없이 직관적으로 이해하면:

- depth가 1 늘어날 때마다
- 가능한 프로그램이 “제곱 수준”으로 늘어난다

---

즉,

> **“하나 더 깊게 보자”는 선택이 이미 게임 오버일 수 있다**

---

### 핵심 문제

그래서 Enumerative Synthesis의 핵심 문제는 이것이다:

> **“어떻게 하면 이 미친 search space를 줄일 것인가?”**

---

이 질문이 바로 다음 글들에서 다룰 내용이다.

- pruning
- equivalence reduction
- search prioritization

---

즉 Enumerative Synthesis는 단순한 방법이지만,

> **그대로 쓰면 절대 안 되는 방법이다**

---

## Bottom-up vs Top-down — 프로그램을 만드는 두 가지 방법

이제 우리는 알았다.

- enumeration은 필요하다
- 하지만 search space는 폭발한다

---

그렇다면 다음 질문은 자연스럽다.

> **“그래서 프로그램을 어떤 순서로 만들 것인가?”**

---

이 질문에 대한 대표적인 두 가지 답이 있다:

- **Bottom-up enumeration**
- **Top-down enumeration**

---

## Bottom-up Enumeration — 작은 것부터 쌓아가기

Bottom-up 방식은 이름 그대로다.

> **가장 작은 프로그램부터 시작해서 점점 큰 프로그램을 만든다**

---

### 기본 아이디어

1. terminal부터 시작한다
2. 작은 프로그램들을 조합해서 더 큰 프로그램을 만든다
3. 크기(size) 기준으로 점점 확장한다

---

### 예제로 보면

다음 grammar를 보자:

~~~
E ::= x | 1 | E + E | E * E
~~~

---

#### Size 1

~~~
x
1
~~~

---

#### Size 2

~~~
x + x
x * x
1 + 1
1 * 1
...
~~~

---

#### Size 3

~~~
(x + x) + x
(x * x) + 1
...
~~~

---

이렇게 점점 커진다.

---

### 특징

- 항상 **완성된 프로그램**을 생성한다
- 생성된 프로그램은 바로 실행 가능하다

---

### 장점

- 구현이 단순하다
- 모든 프로그램을 빠짐없이 탐색한다 (complete)

---

### 단점

- search space가 매우 빠르게 커진다
- 의미 없는 프로그램도 많이 생성된다

---

## Top-down Enumeration — 큰 틀부터 쪼개기

Top-down 방식은 반대다.

> **전체 프로그램 형태를 먼저 만들고, 점점 구체화한다**

---

### 기본 아이디어

1. 시작 기호에서 출발한다
2. grammar rule을 적용해서 확장한다
3. 점점 구체적인 프로그램으로 내려간다

---

### 예제로 보면

시작:

~~~
E
~~~

---

확장:

~~~
E + E
~~~

---

더 확장:

~~~
(x + E)
→ (x + x)
~~~

---

이렇게 “구조 → 세부” 순으로 내려간다.

---

### 특징

- 중간 상태는 **완성되지 않은 프로그램 (hole 포함)** 이다
- 일부는 실행 불가능하다

---

### 장점

- output structure를 먼저 고려할 수 있다
- 특정 형태의 프로그램을 빠르게 찾을 수 있다

---

### 단점

- 중간 상태를 평가하기 어렵다
- pruning이 없으면 비효율적이다

---

## 두 방식 비교

| 구분 | Bottom-up | Top-down |
|------|----------|----------|
| 생성 단위 | 완성된 프로그램 | 부분 프로그램 |
| 실행 가능 여부 | 항상 가능 | 불가능한 경우 있음 |
| 탐색 순서 | 작은 것 → 큰 것 | 큰 것 → 작은 것 |
| 장점 | 단순, 완전성 보장 | 구조적 탐색 가능 |
| 단점 | explosion 심함 | pruning 없으면 비효율 |

---

## 중요한 관찰

이 두 방식은 단순한 구현 차이가 아니다.

> **“탐색 공간을 어떻게 바라보느냐”의 차이다**

---

- Bottom-up → 결과를 쌓아가는 방식
- Top-down → 구조를 분해하는 방식

---

그리고 실제 synthesis 시스템에서는:

> **이 둘을 섞어서 사용한다**

(이건 이후 글에서 다룬다)

---

## Pruning과 Optimization — enumeration을 살리는 핵심 전략

앞에서 봤듯이 Enumerative Synthesis는 단순하다.

> 가능한 프로그램을 만들어보고 검사한다

하지만 문제는 명확하다.

> **그대로 하면 절대 못 쓴다**

그래서 실제 synthesis에서는 항상 다음 질문을 한다:

> **“어떻게 하면 쓸데없는 프로그램을 안 만들 수 있을까?”**

---

### Observational Equivalence — 같은 프로그램은 하나만

많은 프로그램은 겉보기만 다르고 실제로는 같은 동작을 한다.

예를 들어:

~~~
x + 0
x
~~~

이 둘은 모든 입력에 대해 동일하다.

$$
\forall x.\ x + 0 = x
$$

따라서 두 프로그램을 모두 유지할 필요가 없다.

> **하나만 남기고 나머지는 제거한다**

이걸 **observational equivalence**라고 한다.

---

#### 효과

- 중복 제거
- search space 급격히 감소

---

### Partial Evaluation — 중간에 걸러내기

프로그램을 끝까지 만들지 않아도,

> **이미 틀린 프로그램은 중간에 버릴 수 있다**

예를 들어:

- spec: $$f(1) = 2$$

후보:

~~~
f(x) = x * x
~~~

$$
f(1) = 1 \neq 2
$$

이미 틀렸다.

> **즉시 pruning 가능**

---

#### 핵심 아이디어

> 완성되기 전에 틀린 걸 잡아낸다

---

### Size / Depth 제한 — 탐색 범위 통제

가장 단순하지만 중요한 방법:

> **프로그램 크기를 제한한다**

예:

- depth ≤ 5
- AST node ≤ 20

이건 단순하지만 매우 효과적이다.

---

#### 이유

> 큰 프로그램일수록 search space 폭발의 원인이 된다

---

### Heuristic Ordering — 가능성 높은 것부터

모든 프로그램을 동일하게 다루면 비효율적이다.

그래서 보통:

> **정답일 가능성이 높은 프로그램부터 탐색한다**

예:

- 작은 프로그램 먼저 (Occam’s razor)
- 자주 쓰이는 패턴 우선
- 특정 연산 선호

---

### 핵심 정리

이 모든 기법을 한 줄로 정리하면:

> **정답이 아닌 것들을 최대한 빨리 제거하자**

즉:

$$
\text{Enumerative Synthesis} = \text{Enumeration} + \text{Pruning}
$$

---

### 관점 변화

처음에는 이렇게 생각했다:

> 프로그램을 어떻게 만들까?

이제는 이렇게 바뀐다:

> **쓸데없는 프로그램을 어떻게 안 만들까?**

이게 synthesis 연구의 핵심이다.

---

## 다음 글

다음 글에서는 이 아이디어를 더 발전시켜서

> **Search Prioritization**

을 다룬다.