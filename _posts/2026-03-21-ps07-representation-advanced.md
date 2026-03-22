---
layout: post
title: "[Program Synthesis #7] Representation의 확장: FTA와 E-graph로 보는 프로그램 공간"
date: 2026-03-21 00:00:00 +0900
categories: [PL / Formal Methods, Program Synthesis]
tags: [program synthesis, representation, vsa, fta, egraph, equality saturation, formal methods]
description: "Program Synthesis 시리즈 7편 – Version Space Algebra를 넘어, Finite Tree Automata와 E-graph를 통해 다양한 프로그램 표현 방식 비교하기"
image:
  path: /assets/img/posts/program-synthesis/ps07.png
  alt: FTA E-graph Representation
math: true
mermaid: false
series: Program Synthesis
---

## 들어가며 — 하나의 표현으로는 충분하지 않다

앞선 글에서는 VSA를 통해  
프로그램 집합을 압축해서 표현하는 방법을 살펴봤다.

VSA는 중요한 전환을 보여준다.

- 프로그램을 하나씩 다루는 대신
- 가능한 프로그램들의 집합을 구성하고
- 이를 구조적으로 표현하는 방식이다

---

하지만 여기서 한 가지 질문이 자연스럽게 생긴다.

> 이게 유일한 방법일까?

---

실제로는 그렇지 않다.

Program Synthesis에서 “표현(representation)”은 하나로 정해져 있지 않으며,  
문제의 성격에 따라 전혀 다른 방식이 사용된다.

---

어떤 문제에서는

- 가능한 프로그램을 직접 구성하는 것이 유리하고

어떤 문제에서는

- 프로그램 집합을 언어로 표현하는 것이 더 적합하며

또 어떤 경우에는

- 서로 동등한 프로그램들을 묶는 것이 핵심이 된다

---

즉 representation은 단순한 구현 선택이 아니라,

> **문제를 어떻게 바라볼 것인가에 대한 선택**

이다.

---

이 글에서는 VSA를 확장해서,

- 프로그램 집합을 오토마타로 표현하는 방식 (FTA)
- 동등한 프로그램들을 하나로 묶는 방식 (E-graph)

을 살펴보고,

각 접근이 어떤 상황에서 유리한지 비교해본다.

---

이 과정을 통해 Program Synthesis를 하나의 알고리즘이 아니라,

> **여러 관점이 공존하는 문제 공간**

으로 이해하게 될 것이다.


## Representation의 확장 — FTA와 E-graph

앞선 글에서 VSA를 통해  
프로그램 집합을 압축해서 표현하는 방법을 살펴봤다.

이제 시야를 조금 넓혀보자.

---

### 공통 목표

이 모든 방법의 목표는 동일하다.

> 많은 프로그램을 개별적으로 다루지 않고  
> **하나의 구조로 표현하는 것**

---

차이는 “어떤 구조를 사용하느냐”에 있다.

대표적으로 다음 세 가지가 있다.

- VSA (Version Space Algebra)
- FTA (Finite Tree Automata)
- E-graph (Equality Saturation)

---

### FTA — 프로그램을 오토마타로 표현하기

FTA는 프로그램 집합을 오토마타로 표현한다.

---

#### 핵심 아이디어

> 프로그램을 tree로 보고  
> 그 tree를 인식하는 automaton을 만든다

---

즉,

- 프로그램 = tree
- 프로그램 집합 = tree language
- representation = automaton

---

FTA는 다음을 표현한다.

> “이 구조를 가진 모든 프로그램”

---

#### 장점

- 형식적으로 깔끔함
- 자동화된 연산 (intersection, union 등) 가능
- constraint 처리에 강함

---

#### 단점

- 직관적으로 이해하기 어렵다
- 구현 복잡도 높음

---

### E-graph — 동등한 프로그램을 묶는다

E-graph는 완전히 다른 접근을 취한다.

---

#### 핵심 아이디어

> **동일한 의미를 가진 프로그램들을 하나의 클래스에 넣는다**

---

예를 들어:

~~~
x + 0
x
~~~

이 둘은 같은 의미를 가진다.

E-graph에서는 이걸 하나의 equivalence class로 묶는다.

---

#### Equality Saturation

E-graph의 핵심 기법은 이것이다.

> 가능한 rewrite를 계속 적용해서  
> 모든 동등한 프로그램을 한 구조에 넣는다

---

즉,

- rewrite rules 적용
- 동등한 표현 계속 추가
- 하나의 graph로 수렴

---

#### 장점

- 수학적 최적화에 매우 강함
- 많은 변형을 동시에 고려 가능

---

#### 단점

- search space가 커질 수 있음
- 비용 모델 필요

---

### 세 방식의 차이

세 방법은 모두 “압축 표현”이지만, 접근이 다르다.

- VSA → 가능한 프로그램을 직접 구성
- FTA → 프로그램 집합을 언어로 표현
- E-graph → 프로그램 간의 동등성을 중심으로 구성

---

### 중요한 관점

여기서 중요한 건 특정 방법이 더 좋다는 게 아니다.

> 문제에 따라 적절한 representation이 달라진다

---

- PBE 문제 → VSA
- 형식적 제약 → FTA
- 최적화 문제 → E-graph

---

### 흐름 정리

지금까지의 흐름을 정리하면 다음과 같다.

- Enumeration → 프로그램 생성
- Pruning → 공간 축소
- Prioritization → 순서 최적화
- Representation → 공간 자체를 압축

---

이제 탐색은 더 이상 단순한 생성 과정이 아니다.

> **구조 + 확률 + 표현이 결합된 문제**

---

이 단계까지 오면 synthesis의 기본 틀은 완성된다.

---

## Representation의 역할 — 탐색을 바꾸는 세 가지 축

지금까지 살펴본 방법들은 서로 다르게 보이지만,  
공통적으로 같은 문제를 해결하려고 한다.

> 프로그램 공간을 어떻게 다룰 것인가

---

이걸 조금 더 구조적으로 보면,  
Program Synthesis는 세 가지 축으로 나눌 수 있다.

---

### 1. Search — 어디를 탐색할 것인가

앞선 글에서 다룬 내용이다.

- Enumeration → 전체 탐색
- Pruning → 불필요 제거
- Prioritization → 순서 최적화

---

이 축은 다음 질문에 답한다.

> 어떤 프로그램을 먼저 볼 것인가?

---

### 2. Representation — 무엇을 탐색할 것인가

이번 글의 핵심이다.

- VSA → 프로그램 집합을 직접 구성
- FTA → 프로그램 집합을 언어로 표현
- E-graph → 동등한 프로그램을 묶어서 표현

---

이 축은 다음 질문에 답한다.

> 프로그램 공간을 어떻게 표현할 것인가?

---

### 3. Constraint / Verification — 언제 멈출 것인가

초반에 본 CEGIS와 연결된다.

- SMT solver
- counterexample
- constraint solving

---

이 축은 다음 질문에 답한다.

> 이 프로그램이 맞는지 어떻게 확인할 것인가?

---

### 세 축의 결합

이 세 가지는 독립적이지 않다.

실제 synthesis 시스템에서는 항상 함께 작동한다.

---

예를 들어:

- Representation이 바뀌면  
  → search 방식도 바뀌고

- Constraint가 강해지면  
  → representation이 달라지며

- Search 전략이 바뀌면  
  → 필요한 representation도 달라진다

---

즉 synthesis는 단순한 알고리즘이 아니라

> **Search × Representation × Constraint의 결합 문제**

다.

---

### 관점의 완성

지금까지의 흐름을 통해 synthesis를 다음처럼 볼 수 있다.

- 단순한 brute-force 문제가 아니라
- 구조를 활용하고
- 확률을 반영하며
- 제약을 이용하는

---

> **복합적인 탐색 시스템**

이다.

---

이제 남은 질문은 자연스럽다.

> 이 세 가지를 실제로 어떻게 결합할 것인가?

---

이걸 이해하기 위해 다음 글에서는,

> **Bidirectional Search**

를 살펴본다.

top-down과 bottom-up을 결합해  
탐색을 더 효율적으로 만드는 방법이다.


--

## 같은 문제를 다르게 표현해보기

지금까지 VSA, FTA, E-graph를 각각 살펴봤다.

이제 중요한 질문은 이것이다.

> 같은 synthesis 문제를 세 방식으로 보면 어떻게 달라질까?

---

### 문제 예시

다음과 같은 간단한 문제를 생각해보자.

> 문자열 "ab"를 만드는 프로그램을 찾기

---

### VSA 관점

VSA에서는 이 문제를 다음처럼 본다.

- 가능한 프로그램 집합을 구성한다
- 각 부분 문제를 version space로 표현한다
- 이를 Join으로 결합한다

---

즉 구조는 다음과 같다.

~~~
Concat(VS("a"), VS("b"))
~~~

---

이 접근은:

- 가능한 프로그램을 직접 구성하고
- 집합을 점점 좁혀가는 방식이다

---

### FTA 관점

FTA에서는 이 문제를 language로 본다.

- "ab"를 생성하는 모든 tree를 인식하는 automaton 구성
- 각 production rule을 상태 전이로 표현

---

즉:

> “이 문자열을 생성할 수 있는 모든 프로그램의 집합”  
을 하나의 automaton으로 표현한다

---

이 접근은:

- constraint와 결합이 쉽고
- 형식적으로 매우 강력하다

---

### E-graph 관점

E-graph에서는 문제를 다르게 본다.

- 가능한 프로그램을 생성하고
- rewrite를 통해 동등한 표현을 계속 추가

---

예를 들어:

~~~
Concat("a", "b")
Concat("ab", "")
Concat("", "ab")
~~~

이런 표현들이 하나의 equivalence class로 묶인다.

---

이 접근은:

- 표현 간 변환을 자유롭게 하고
- 최적 표현을 선택하는 데 강하다

---

### 핵심 차이

같은 문제지만 관점은 완전히 다르다.

- VSA → “가능한 해의 집합”을 구성
- FTA → “가능한 해의 언어”를 인식
- E-graph → “동등한 해의 관계”를 확장

---

이 차이는 단순한 구현 차이가 아니다.

> **문제를 어떻게 모델링하느냐의 차이**

다.

---

### 왜 중요한가

이걸 이해하면 다음이 가능해진다.

- 문제에 맞는 representation 선택
- 서로 다른 방법을 조합
- 더 강력한 synthesis 시스템 설계

---

이 시점에서 synthesis는 단순한 알고리즘이 아니라

> **모델링 문제**

가 된다.


---

## 정리 — Representation은 선택의 문제다

지금까지 VSA, FTA, E-graph를 통해  
프로그램 집합을 표현하는 다양한 방법을 살펴봤다.

이들은 서로 다른 방식으로 보이지만,  
공통적으로 같은 목표를 가진다.

> 많은 프로그램을 개별적으로 다루지 않고  
> 하나의 구조로 표현한다

---

하지만 중요한 점은  
이 중 하나가 “정답”이라는 것은 아니라는 것이다.

각 방법은 서로 다른 관점을 기반으로 한다.

- VSA는 가능한 프로그램을 직접 구성하고  
- FTA는 프로그램 집합을 언어로 표현하며  
- E-graph는 동등한 프로그램들의 관계를 확장한다  

---

이 차이는 단순한 구현 선택이 아니다.

> **문제를 어떻게 모델링할 것인가에 대한 선택**

이다.

---

따라서 실제 synthesis에서는

- 문제의 형태
- 사용할 제약
- 목표하는 결과

에 따라 representation이 달라진다.

---

이 시점에서 synthesis는 더 이상  
단일 알고리즘으로 이해할 수 있는 문제가 아니다.

- 어떤 공간을 만들고 (representation)
- 어떻게 탐색하며 (search)
- 어떻게 검증할 것인가 (constraint)

이 세 가지가 함께 결정된다.

---

결국 Program Synthesis는

> **탐색 문제이면서 동시에 모델링 문제**

다.

---

이제 다음 단계는 자연스럽다.

> 이 다양한 표현과 탐색 전략을 실제로 어떻게 결합할 것인가?

---

다음 글에서는 이를 위해,

> **Bidirectional Search**

를 살펴본다.

top-down과 bottom-up을 결합해  
탐색을 구조적으로 가속하는 방법이다.
