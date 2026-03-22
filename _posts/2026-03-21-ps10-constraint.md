---
layout: post
title: "[Program Synthesis #10] Constraint-Based Synthesis: 논리로 프로그램을 만드는 방법"
date: 2026-03-21 00:00:00 +0900
categories: [PL / Formal Methods, Program Synthesis]
tags: [program synthesis, constraint solving, smt, sat, sketch, formal methods]
description: "Program Synthesis 시리즈 10편 – SAT/SMT 기반으로 프로그램을 제약 문제로 변환하여 해결하는 Constraint-Based Synthesis 이해하기"
image:
  path: /assets/img/posts/program-synthesis/ps10.png
  alt: Constraint Based Synthesis
math: true
mermaid: false
series: Program Synthesis
---

## 들어가며 — 탐색하지 말고, 풀어버리자

지금까지 우리는 Program Synthesis를 다양한 방식으로 접근해왔다.

- Enumeration → 가능한 프로그램 생성  
- Prioritization / Stochastic → 탐색을 더 똑똑하게  
- Representation → 공간을 압축  
- Bidirectional → 탐색 방향 결합  

---

이 모든 접근은 공통된 특징을 가진다.

> 프로그램 공간을 “탐색”한다

---

하지만 여기에는 근본적인 한계가 있다.

- search space가 너무 크고  
- 탐색 전략이 복잡해지며  
- 최적 해를 찾기 어려운 경우가 많다  

---

그래서 완전히 다른 접근이 등장한다.

> **탐색하지 말고, 문제를 풀어버리자**

---

이 아이디어의 핵심은 다음과 같다.

- 프로그램을 직접 찾는 대신  
- 프로그램이 만족해야 할 조건을 정의하고  
- 그 조건을 만족하는 해를 solver로 찾는다  

---

즉 Program Synthesis를 다음과 같이 바꾼다.

$$
\text{Find program } f
\quad \rightarrow \quad
\text{Solve constraints on } f
$$

---

이 접근이 바로

> **Constraint-Based Synthesis**

다.

---

이 방식에서는

- SAT / SMT solver를 사용해  
- 프로그램을 “논리적 해”로 구한다

---

즉 탐색은 더 이상 heuristic한 과정이 아니라

> **논리적으로 정의된 문제를 해결하는 과정**

이 된다.

---

이 글에서는 다음을 다룬다.

- Constraint-Based Synthesis의 기본 아이디어  
- 프로그램을 constraint로 변환하는 방법  
- Sketch 기반 접근  
- 왜 이 방식이 강력한지

---

## 프로그램을 Constraint로 바꾸는 방법

Constraint-Based Synthesis의 핵심은 단순하다.

> 프로그램을 직접 찾는 대신,  
> **프로그램이 만족해야 할 조건을 정의한다**

---

### 다시 문제를 보자

우리가 풀고 싶은 문제는 다음과 같다.

$$
\exists f.\ \forall x.\ P(f, x)
$$

---

기존 접근에서는:

- $$f$$를 직접 생성하고
- $$P(f, x)$$를 검사했다

---

Constraint-Based 접근에서는 다르게 한다.

> $$f$$ 자체를 **unknown 변수로 본다**

---

### Hole 개념

이를 위해 사용하는 개념이 바로 **hole**이다.

---

예를 들어 다음과 같은 sketch를 생각해보자.

~~~
f(x) = x + ??
~~~

---

여기서 `??`는 아직 결정되지 않은 값이다.

이걸 변수로 바꾸면:

$$
f(x) = x + c
$$

---

즉,

> 프로그램의 일부를 **symbolic 변수로 치환한다**

---

### Constraint 생성

이제 specification을 constraint로 바꾼다.

예:

> $$f(1) = 2$$  
> $$f(2) = 3$$

---

이를 대입하면:

$$
1 + c = 2  
$$
$$
2 + c = 3
$$

---

즉 constraint는 다음과 같다.

$$
c = 1
$$

---

이걸 solver가 풀면:

- $$c = 1$$

→ 프로그램 완성

---

### 일반적인 형태

조금 더 일반적으로 쓰면:

- 프로그램 = $$f(x, \theta)$$
- $$\theta$$ = unknown parameter

---

그리고 우리는 다음을 푼다.

$$
\exists \theta.\ \forall x.\ P(f(x, \theta), x)
$$

---

즉 synthesis는 다음으로 바뀐다.

> **parameter를 찾는 문제**

---

### Symbolic Execution 관점

이 과정을 다른 관점에서 보면 다음과 같다.

- 프로그램을 실행하되
- 값을 concrete가 아니라 symbolic으로 유지한다

---

예:

~~~
f(x) = x + c
~~~

실행:

- input: 1 → output: $$1 + c$$
- input: 2 → output: $$2 + c$$

---

이걸 constraint로 모은다.

---

즉,

> 프로그램 실행 → constraint 생성

---

### 핵심 직관

이 접근의 핵심은 다음이다.

- 프로그램을 생성하지 않는다  
- 대신 프로그램의 형태를 고정하고  
- 내부 값을 solver가 결정한다  

---

즉 탐색은 이렇게 바뀐다.

- 기존 → 구조 + 값 모두 탐색  
- 변경 → 구조는 고정, 값만 해결  

---

### 장점

- solver가 constraint를 한 번에 해결  
- 탐색 공간 크게 감소  
- 논리적으로 정확한 결과  

---

### 한계

- 구조가 고정되어야 한다  
- 표현력이 제한될 수 있다  
- constraint가 커지면 solver가 느려질 수 있다  

---

### 핵심 정리

Constraint-Based Synthesis는

> 프로그램을 찾는 문제가 아니라  
> **constraint를 만족하는 해를 찾는 문제**

로 바꾼다.

---

## Sketch-Based Synthesis — 구조는 주고, 나머지는 채운다

앞에서 우리는 프로그램의 일부를 unknown으로 두고  
constraint를 통해 값을 결정하는 방법을 살펴봤다.

이 아이디어를 한 단계 확장하면 다음과 같은 형태가 된다.

> 프로그램의 전체 구조는 유지하되,  
> 일부를 비워두고 solver가 채우게 한다

---

### Sketch의 개념

이 접근에서 사용하는 것이 바로 **Sketch**다.

Sketch는 다음과 같은 형태의 프로그램이다.

~~~
f(x) = if (x > 0) then x + ?? else ??
~~~

---

여기서:

- 전체 구조는 이미 정해져 있고
- 일부 값이나 표현만 비어 있다

---

이 빈 부분을 hole이라고 한다.

---

### Hole을 변수로 바꾸기

각 hole은 unknown 변수로 변환된다.

예:

~~~
f(x) = if (x > 0) then x + c1 else c2
~~~

---

이제 문제는 다음과 같이 바뀐다.

> 적절한 $$c_1, c_2$$를 찾아라

---

### Constraint 생성

이제 specification을 적용한다.

예:

- $$f(1) = 2$$  
- $$f(-1) = 0$$  

---

이를 대입하면:

- $$1 + c_1 = 2$$  
- $$c_2 = 0$$  

---

즉 constraint는:

$$
c_1 = 1,\quad c_2 = 0
$$

---

solver가 이를 풀면 프로그램이 완성된다.

---

### Sketch의 역할

Sketch는 매우 중요한 역할을 한다.

> **탐색 공간을 강하게 제한한다**

---

기존 synthesis에서는:

- 구조 + 값 모두 탐색

---

Sketch에서는:

- 구조는 고정
- 값만 탐색

---

이 차이는 매우 크다.

---

### 왜 강력한가

Sketch 기반 접근이 효과적인 이유는 다음과 같다.

---

#### 1. search space 축소

구조가 고정되면 탐색 공간이 급격히 줄어든다.

---

#### 2. solver 활용

constraint solving으로 문제를 한 번에 해결할 수 있다.

---

#### 3. 사용자 개입

사람이 구조를 제공할 수 있다.

→ domain knowledge 활용 가능

---

### 직관적으로 보면

Sketch-based synthesis는 다음과 같다.

- 사람이 “틀”을 만들고
- solver가 “빈칸”을 채운다

---

즉,

> **programming + solving의 결합**

이다.

---

### 중요한 한계

하지만 이 접근도 완벽하지 않다.

---

#### 1. sketch에 의존

- 좋은 sketch → 빠르게 해결
- 나쁜 sketch → 해를 못 찾음

---

#### 2. 표현력 제한

구조를 고정하면 가능한 프로그램이 제한된다.

---

#### 3. constraint explosion

hole이 많아지면 constraint가 급격히 커진다.

---

### 핵심 정리

Sketch-based synthesis는

- 구조는 고정하고
- 나머지를 constraint로 해결하는 방식이다

---

즉,

> **탐색 문제를 “부분적으로” constraint 문제로 바꾼다**

---

## Constraint와 Search의 결합 — CEGIS와 Sketch

지금까지 Constraint-Based Synthesis와 Sketch 기반 접근을 살펴봤다.

이제 중요한 질문이 남는다.

> 이 둘은 어떻게 결합되는가?

---

### 다시 CEGIS를 떠올려보자

CEGIS는 다음과 같은 구조를 가진다.

1. 프로그램 후보를 생성한다  
2. 반례(counterexample)를 찾는다  
3. 이를 반영해서 프로그램을 개선한다  

---

이 구조를 Constraint 기반 접근과 결합하면 다음처럼 바뀐다.

---

### Sketch + CEGIS 구조

Sketch 기반 synthesis에서는:

- 프로그램 구조는 고정되어 있고
- hole이 존재한다

---

이 상태에서 CEGIS loop는 다음과 같이 동작한다.

---

#### Step 1 — Constraint 생성

현재까지의 input 집합 $$E$$에 대해

$$
\forall x \in E.\ P(f(x, \theta), x)
$$

를 constraint로 만든다.

---

#### Step 2 — Solver로 해결

이 constraint를 solver에 넘겨

$$
\theta
$$

를 찾는다.

---

즉,

> 현재까지의 예제를 만족하는 프로그램을 만든다

---

#### Step 3 — Verification

이제 전체 specification에 대해 검사한다.

$$
\exists x.\ \neg P(f(x, \theta), x)
$$

---

- 반례가 존재하면 → $$E$$에 추가  
- 없으면 → 정답  

---

### 전체 흐름

이걸 코드 형태로 쓰면 다음과 같다.

~~~
E = {}

while True:
    θ = solve_constraints(E)
    
    x = find_counterexample(f(θ))
    
    if x is None:
        return f(θ)
    
    E = E ∪ {x}
~~~

---

### 핵심 차이

기존 CEGIS에서는:

- 프로그램을 직접 생성했다

---

이제는:

- solver가 프로그램을 “구성”한다

---

즉,

> **탐색 대신 constraint solving을 사용한다**

---

### 왜 강력한가

이 방식의 핵심 장점은 다음과 같다.

---

#### 1. 탐색 공간 축소

- 구조는 sketch로 제한  
- 값은 solver가 결정  

---

#### 2. 정확성 보장

- SMT solver 기반  
- 논리적으로 검증 가능  

---

#### 3. 점진적 refinement

- counterexample 기반으로  
- 점점 constraint 강화  

---

### 전체 관점

이제 synthesis는 다음처럼 통합된다.

- Sketch → 구조 정의  
- Constraint → 조건 정의  
- CEGIS → 반복적 refinement  

---

즉,

$$
\text{Synthesis} = \text{Structure} + \text{Constraint} + \text{Refinement}
$$

---

### 중요한 의미

이 구조는 매우 일반적이다.

- search 기반 접근과  
- constraint 기반 접근이  

> 하나의 프레임워크로 결합된다

---

이 시점에서 synthesis는 더 이상

- 탐색 문제
- constraint 문제

중 하나가 아니라

> **두 접근이 결합된 문제**

로 이해할 수 있다.

---

## 정리 — 탐색과 논리의 결합

지금까지 Constraint-Based Synthesis를 통해  
프로그램을 논리적 문제로 바꾸는 방법을 살펴봤다.

---

이 접근은 기존의 흐름과 근본적으로 다른 출발점을 가진다.

- 기존 → 프로그램을 탐색한다  
- 이제 → 조건을 정의하고 해를 구한다  

---

하지만 더 중요한 점은 이것이다.

> Constraint-Based Synthesis는  
> 기존 접근을 대체하는 것이 아니라,  
> **보완하고 결합된다**

---

지금까지의 시리즈를 정리해보면 다음과 같다.

- Search → 어떤 프로그램을 볼 것인가  
- Representation → 프로그램 공간을 어떻게 표현할 것인가  
- Stochastic → 큰 공간을 어떻게 탐색할 것인가  
- Constraint → 프로그램을 어떻게 논리로 표현할 것인가  

---

이 네 가지는 서로 독립적이지 않다.

실제 synthesis 시스템에서는 항상 함께 사용된다.

---

예를 들어:

- Sketch로 구조를 제한하고  
- Constraint로 조건을 정의하며  
- CEGIS로 refinement를 반복하고  
- Search 전략으로 효율을 개선한다  

---

즉 synthesis는 다음과 같이 이해할 수 있다.

> **탐색 + 표현 + 확률 + 논리의 결합**

---

이 시점에서 Program Synthesis는 더 이상 하나의 기술이 아니다.

> **여러 접근이 결합된 설계 문제**

다.

---

### 전체 흐름 정리

지금까지의 시리즈를 통해 synthesis는 다음처럼 확장되어 왔다.

- brute-force enumeration에서 시작해  
- pruning과 prioritization으로 개선되고  
- representation으로 공간을 압축하며  
- bidirectional로 구조를 활용하고  
- stochastic으로 확률적 탐색을 도입하고  
- constraint로 논리적 해결까지 확장된다  

---

이 흐름은 하나의 방향을 보여준다.

> 점점 더 구조적이고, 더 일반적인 문제로 확장된다

---

### 마지막 관점

이제 synthesis를 다음처럼 볼 수 있다.

- 프로그램을 “작성하는” 문제가 아니라  
- 프로그램을 “정의하고 찾는” 문제  

---

즉,

> **Programming → Problem Solving**

으로의 전환이다.

---

이 시리즈의 다음 단계에서는  
이러한 접근들이 실제 시스템에서 어떻게 결합되는지,

> **현대 Program Synthesis 시스템의 구조**

를 살펴본다.