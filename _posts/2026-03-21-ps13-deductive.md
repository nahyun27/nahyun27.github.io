---
layout: post
title: "[Program Synthesis #13] Deductive Synthesis: Specification에서 프로그램을 유도하기"
date: 2026-03-21 00:00:00 +0900
categories: [PL / Formal Methods, Program Synthesis]
tags: [program synthesis, deductive synthesis, formal methods, specification, derivation, program correctness]
description: "Program Synthesis 시리즈 13편 – specification으로부터 transformation rule을 통해 프로그램을 직접 유도하는 Deductive Synthesis 이해하기"
image:
  path: /assets/img/posts/program-synthesis/ps13.png
  alt: Deductive Synthesis
math: true
mermaid: false
series: Program Synthesis
---

## 들어가며 — 프로그램을 찾지 말고, 유도하자

지금까지 우리는 Program Synthesis를 여러 방식으로 접근해왔다.

- Search → 프로그램을 탐색하고  
- Constraint → 조건을 풀고  
- Type → 가능한 구조를 제한했다  

---

이 모든 접근은 공통된 전제를 가진다.

> 프로그램을 “찾는다”

---

하지만 여기서 한 가지 더 근본적인 질문이 가능하다.

> 프로그램을 찾지 않고, 직접 만들어낼 수는 없을까?

---

이 질문에서 출발한 접근이 바로

> **Deductive Synthesis**

다.

---

이 방식에서는 프로그램을 다음과 같이 본다.

- 프로그램 = specification을 만족하는 구조  
- synthesis = specification으로부터 프로그램을 “유도”하는 과정  

---

즉,

- 후보를 만들고 검사하는 것이 아니라  
- 논리적으로 프로그램을 구성한다  

---

이 관점에서 synthesis는 다음처럼 바뀐다.

$$
\text{Find program } f
\quad \rightarrow \quad
\text{Derive } f \text{ from specification}
$$

---

이 방식의 핵심 특징은 명확하다.

> **correctness가 처음부터 보장된다**

---

왜냐하면 프로그램은  
specification을 기반으로 만들어지기 때문이다.

---

이 글에서는 다음을 다룬다.

- Deductive Synthesis의 기본 아이디어  
- specification을 프로그램으로 바꾸는 과정  
- transformation rule 기반 접근  
- 왜 이 방식이 이론적으로 중요한지  

---

## Specification에서 프로그램으로 — 논리에서 구조로

Deductive Synthesis의 핵심은 다음 질문이다.

> specification을 어떻게 프로그램으로 바꿀 수 있을까?

---

### 출발점: Specification

Deductive Synthesis에서는 먼저  
문제를 논리적 specification으로 표현한다.

---

예를 들어:

> 두 수 중 더 큰 값을 반환하는 함수

---

이를 논리로 쓰면:

$$
f(x, y) = 
\begin{cases}
x & \text{if } x \ge y \\
y & \text{otherwise}
\end{cases}
$$

---

또는 더 일반적으로:

$$
\forall x, y.\ f(x, y) \ge x \land f(x, y) \ge y
$$

---

즉,

> 프로그램이 아니라 “성질(property)”부터 시작한다

---

### 핵심 아이디어

Deductive Synthesis는 다음과 같이 진행된다.

1. specification을 분석한다  
2. 이를 더 작은 조건으로 분해한다  
3. 각 조건에 대응하는 프로그램 조각을 만든다  
4. 이를 조합해 전체 프로그램을 구성한다  

---

즉,

> 논리 → 구조

---

### 예: 조건 분해

다음 specification을 보자.

$$
f(x, y) = \max(x, y)
$$

---

이건 다음과 같이 분해할 수 있다.

- 경우 1: $$x \ge y$$ → 결과는 $$x$$  
- 경우 2: $$x < y$$ → 결과는 $$y$$  

---

이 분해는 자연스럽게 프로그램 구조로 이어진다.

~~~
if (x >= y) then x else y
~~~

---

즉,

> 논리적 case 분석이 프로그램의 control flow를 만든다

---

### 일반적인 패턴

Deductive Synthesis에서는 다음과 같은 패턴이 반복된다.

---

#### 1. Case Analysis

조건을 나눈다.

→ if / pattern matching 생성

---

#### 2. Decomposition

문제를 더 작은 문제로 나눈다.

→ 함수 호출 / recursion 생성

---

#### 3. Composition

부분 해를 결합한다.

→ 프로그램 완성

---

### 핵심 직관

이 과정을 요약하면 다음과 같다.

- specification은 “무엇을 해야 하는지”를 정의하고  
- transformation rule은 “어떻게 만들지”를 제공한다  

---

즉 synthesis는:

> **논리를 프로그램으로 번역하는 과정**

이 된다.

---

### search와의 차이

이 접근은 기존 방식과 완전히 다르다.

---

- 기존 → 후보 생성 후 검사  
- 여기 → 논리적으로 구성  

---

즉,

> 잘못된 프로그램이 애초에 만들어지지 않는다

---

### 중요한 특징

Deductive Synthesis는 다음을 보장한다.

- correctness-by-construction  
- 구조적으로 의미 있는 프로그램  
- 불필요한 탐색 없음  

---

### 핵심 정리

Deductive Synthesis는

> specification을 분석하고  
> 그 구조를 그대로 프로그램으로 변환한다

---

즉,

> **프로그램은 spec의 “구조적 반영”이다**

---

## Transformation Rules — 프로그램을 유도하는 규칙

앞에서 specification을 분해해서 프로그램 구조를 만든다는 것을 봤다.

그럼 다음 질문이 자연스럽게 나온다.

> 이 과정을 어떻게 체계적으로 할 수 있을까?

---

이걸 가능하게 하는 것이 바로

> **Transformation Rules (유도 규칙)**

이다.

---

### 핵심 아이디어

Transformation Rule은 다음을 정의한다.

> 특정한 형태의 specification을  
> **프로그램 구조로 바꾸는 방법**

---

즉,

- 입력: 논리적 조건  
- 출력: 프로그램 조각  

---

### Rule 기반 접근

Deductive Synthesis는 rule-driven 방식으로 진행된다.

즉,

- specification을 보고  
- 적용 가능한 rule을 찾고  
- 이를 반복 적용한다  

---

이 과정은 일종의 “증명(proof)”과 비슷하다.

---

### Rule 1 — Case Analysis

가장 기본적인 규칙이다.

---

형태:

$$
P = P_1 \lor P_2
$$

---

이걸 프로그램으로 바꾸면:

~~~
if (condition) then e1 else e2
~~~

---

즉,

> 논리적 분기 → control flow

---

### Rule 2 — Decomposition

문제를 더 작은 문제로 나누는 규칙이다.

---

예:

$$
f(x) = g(h(x))
$$

---

이건 프로그램에서는:

~~~
f(x) = g(h(x))
~~~

---

하지만 중요한 건:

> h와 g를 각각 따로 유도할 수 있다

---

즉,

> 큰 문제 → 작은 문제

---

### Rule 3 — Recursion

재귀 구조를 만드는 규칙이다.

---

예: 리스트 합

$$
sum([]) = 0
$$
$$
sum(x :: xs) = x + sum(xs)
$$

---

이건 바로 다음 프로그램으로 이어진다.

~~~
sum(xs) =
  if xs == [] then 0
  else head(xs) + sum(tail(xs))
~~~

---

즉,

> inductive definition → recursive program

---

### Rule 4 — Introduction

필요한 값을 “도입”하는 규칙이다.

---

예:

- 변수 도입  
- 중간 결과 생성  

---

이건 보통 다음과 같이 나타난다.

~~~
let y = ...
in ...
~~~

---

즉,

> 계산을 단계적으로 나눈다

---

### Rule 5 — Refinement

추상적인 specification을  
더 구체적인 형태로 바꾸는 과정이다.

---

예:

- “정렬된 리스트” → “merge sort 구조”  
- “최소값” → “비교 기반 구조”  

---

즉,

> 추상 → 구체

---

### 전체 흐름

이제 Deductive Synthesis는 다음처럼 동작한다.

1. specification을 분석한다  
2. 적용 가능한 rule을 선택한다  
3. specification을 더 작은 문제로 변환한다  
4. 이를 반복한다  
5. 최종적으로 프로그램이 생성된다  

---

즉,

> **rule 적용의 연쇄 과정**

---

### proof와의 관계

이 과정은 논리적 증명과 매우 유사하다.

- theorem proving → 증명 생성  
- synthesis → 프로그램 생성  

---

즉,

> **프로그램 = 증명의 결과**

---

### 핵심 직관

Transformation Rule 기반 synthesis는

- 탐색이 아니라  
- **구성(construction)**이다  

---

즉,

- 후보를 찾는 것이 아니라  
- 규칙을 따라 “만든다”  

---

### 중요한 특징

이 접근의 가장 큰 장점은 다음이다.

> correctness-by-construction

---

프로그램은 항상 specification을 만족한다.

왜냐하면:

> specification으로부터 직접 유도되었기 때문이다

---

### 핵심 정리

- rule은 “논리 → 프로그램” 변환 규칙이다  
- synthesis는 rule 적용의 연쇄다  
- 프로그램은 specification의 구조적 결과다  

---

## 정리 — 탐색에서 유도로, Program Synthesis의 완성

지금까지 Deductive Synthesis를 통해  
specification으로부터 프로그램을 직접 유도하는 방법을 살펴봤다.

---

이 접근은 지금까지의 흐름과 가장 근본적으로 다른 관점을 가진다.

- 기존 → 프로그램을 탐색한다  
- Constraint → 조건을 풀어 프로그램을 찾는다  
- Type → 가능한 구조를 제한한다  

---

하지만 Deductive Synthesis는 다르다.

> 프로그램을 찾지 않는다  
> **논리적으로 구성한다**

---

### 전체 패러다임 비교

지금까지 시리즈에서 다룬 접근들을 하나의 축으로 정리해보면 다음과 같다.

---

- Search-based → 후보를 생성하고 선택  
- Constraint-based → 조건을 만족하는 해를 찾음  
- Type-guided → 가능한 구조를 제한  
- Deductive → specification에서 직접 유도  

---

이들은 단순히 다른 방법이 아니라,

> **문제를 바라보는 관점 자체가 다르다**

---

### 점점 줄어드는 “탐색”

이 흐름을 보면 하나의 방향성이 드러난다.

- 초기 → 많은 후보를 생성 (brute-force)  
- 중간 → pruning / constraint로 줄임  
- 이후 → 타입으로 구조 제한  
- 마지막 → 탐색 없이 직접 구성  

---

즉 synthesis는 점점 다음으로 이동한다.

> **탐색 → 제약 → 구조 → 유도**

---

### 프로그램의 본질

이 시점에서 프로그램은 더 이상 코드가 아니다.

- 단순한 실행 가능한 객체가 아니라  
- specification의 구조를 반영한 결과  

---

즉,

> **프로그램은 specification의 “구체화”다**

---

### 중요한 의미

Deductive Synthesis는 이론적으로 가장 강력하다.

- correctness 보장  
- 불필요한 탐색 없음  
- 구조적으로 명확한 결과  

---

하지만 동시에 현실적인 한계도 있다.

- specification 작성이 어렵고  
- rule 설계가 복잡하며  
- 자동화가 쉽지 않다  

---

그래서 실제 시스템에서는

> 이 모든 접근이 결합된다

---

- search로 후보를 만들고  
- constraint로 제한하며  
- type으로 구조를 잡고  
- deductive rule로 구성한다  

---

즉 synthesis는 다음과 같이 이해할 수 있다.

> **여러 패러다임이 결합된 설계 문제**

---

### 시리즈를 마치며

이 시리즈를 통해 우리는 다음을 살펴봤다.

- brute-force에서 시작해  
- 구조와 확률을 도입하고  
- 표현 방식을 바꾸며  
- 논리와 결합하고  
- 프로그램을 유도하는 단계까지  

---

이 흐름은 하나의 메시지를 전달한다.

> Program Synthesis는 단순한 기술이 아니라  
> **문제를 해결하는 새로운 방식**

이다.

---

### 마지막 관점

이제 프로그램을 바라보는 방식은 바뀐다.

- 코드를 직접 작성하는 것이 아니라  
- 원하는 성질을 정의하고  
- 그에 맞는 프로그램을 구성하는 것  

---

즉,

> **Programming → Specification → Synthesis**

---

이제 남은 것은 하나다.

> 이 개념들을 실제 문제에 적용해보는 것


