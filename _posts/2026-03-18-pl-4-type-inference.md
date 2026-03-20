---
layout: post
title: "[Programming Languages #4] Type Inference: 타입을 자동으로 추론하는 방법"
date: 2026-03-21 00:00:00 +0900
categories: [Programming Languages, Formal Methods]
tags: [type inference, unification, type system, polymorphism, formal methods]
description: "Programming Languages 시리즈 4편 – 타입을 명시하지 않아도 자동으로 추론하는 원리와 Unification 알고리즘 이해하기"
image:
  path: /assets/img/posts/programming-languages/pl4.png
  alt: Type Inference
math: true
mermaid: false
series: Programming Languages
---

## Type Inference란 무엇인가

앞에서 우리는 타입 시스템을 통해  
프로그램의 안전성을 검사하는 방법을 봤다.

$$
\Gamma \vdash e : t
$$

즉,

> **“이 프로그램은 이 타입을 가진다”**

라는 것을 판단했다.

---

### 그런데 한 가지 문제가 있다

지금까지는 타입을 이렇게 가정했다.

~~~
x : int
~~~

즉,

- 변수의 타입을 알고 있고  
- 그걸 기반으로 타입을 검사했다  

---

하지만 현실에서는?

> **우리는 매번 타입을 직접 쓰고 싶지 않다**

---

### 예시

다음 프로그램을 보자.

~~~
let f = proc (x) x in f 1
~~~

이 함수의 타입은 무엇일까?

직관적으로 보면:

- $$f$$는 입력을 그대로 반환  
- 즉, $$t \rightarrow t$$ 형태  

---

하지만 여기서 중요한 점:

> **우리는 이 타입을 “적지 않았다”**

---

### 핵심 질문

이제 문제가 바뀐다.

> **“타입을 우리가 직접 쓰지 않으면, 누가 알아내는가?”**

---

### Type Inference의 등장

이 질문에 대한 답이 바로  
**Type Inference (타입 추론)**이다.

> **“프로그램을 보고 타입을 자동으로 계산하는 것”**

---

### 핵심 아이디어

Type Inference는 다음과 같이 볼 수 있다.

$$
\text{Program} \rightarrow \text{Type}
$$

즉,

- 입력: 프로그램  
- 출력: 타입  

---

### Type Checking vs Type Inference

이제 두 개념을 비교해보자.

| 구분 | 의미 |
|------|------|
| Type Checking | 주어진 타입이 맞는지 검사 |
| Type Inference | 타입을 자동으로 계산 |

---

### 중요한 감각

여기서 꼭 가져가야 할 포인트는 이것이다.

> **Type Inference는 “타입을 찾는 문제”다**

즉,

- 타입을 아는 상태 → 검사  
- 타입을 모르는 상태 → 추론  

---

### 왜 중요한가

이 개념이 중요한 이유는 명확하다.

- 코드가 더 간결해지고  
- 개발자가 타입을 일일이 쓰지 않아도 되며  
- 강력한 정적 검사를 유지할 수 있다  

---

### 직관적으로 보면

Type Inference는 이런 느낌이다.

> **“코드를 보고 숨겨진 타입을 추리하는 과정”**

---

### 한 줄 정리

$$
\text{Type Inference} = \text{프로그램으로부터 타입을 자동으로 추론하는 과정}
$$

---


## Type Equation — 타입을 식으로 바꾸기

앞에서 우리는 타입 추론을 이렇게 정의했다.

> **“프로그램으로부터 타입을 자동으로 알아내는 과정”**

그런데 여기서 중요한 질문이 생긴다.

> **“그걸 어떻게 계산하지?”**

---

### 핵심 아이디어

Type Inference의 핵심은 의외로 단순하다.

> **“타입을 바로 구하지 말고, 먼저 식으로 바꾸자”**

---

### 직관

우리는 프로그램을 보면 바로 타입을 알기 어렵다.

대신 이렇게 생각한다.

> **“이 프로그램이 만족해야 하는 타입 조건을 모아보자”**

---

### 예시

다음 프로그램을 보자.

~~~
x + 1
~~~

이걸 보면 우리는 이런 사실을 안다.

- $$x$$는 int여야 한다  
- $$1$$은 int  
- 결과도 int  

---

### 이걸 식으로 표현하면

타입을 변수로 두고 식을 만든다.

$$
t_x = int
$$

$$
t_1 = int
$$

$$
t_{result} = int
$$

---

### 더 일반적인 형태

이제 조금 더 일반적인 예를 보자.

~~~
e1 + e2
~~~

이 경우 조건은 다음과 같다.

$$
t_1 = int
$$

$$
t_2 = int
$$

$$
t = int
$$

---

### 핵심 구조

이렇게 얻은 것들을 모으면:

> **“타입 방정식 집합 (Type Equations)”**

이 된다.

---

### 왜 이렇게 하는가

이 방식이 중요한 이유는 단순하다.

> **복잡한 문제를 “식 풀기 문제”로 바꾼다**

---

### 슬라이드 핵심 연결

실제로는 이렇게 정의된다.

- 타입 방정식 = 타입 동등성들의 집합 

즉,

$$
t_0 = t_1 \rightarrow t_2
$$

$$
t_1 = int
$$

같은 형태들이다.

---

### 중요한 감각

여기서 꼭 잡아야 할 핵심은 이것이다.

> **Type Inference = 방정식 생성 + 방정식 풀이**

---

### 한 줄 정리

$$
\text{Type Equation} = \text{타입 조건을 식으로 표현한 것}
$$

---

## Unification — 타입 방정식을 푸는 방법

앞에서 우리는 타입 추론을 이렇게 바꿨다.

> **프로그램 → 타입 방정식**

이제 마지막 질문이다.

> **“그래서 이 방정식들을 어떻게 풀지?”**

그 답이 바로 **Unification (통합)**이다.

---

### 핵심 아이디어

Unification은 한 문장으로 정리된다.

> **“타입 변수에 값을 할당해서 모든 방정식을 만족시키는 과정”**

---

### 직관적으로 보면

다음과 같은 식이 있다고 하자.

$$
t_1 = int
$$

$$
t_2 = t_1
$$

---

이걸 풀면:

$$
t_1 = int
$$

$$
t_2 = int
$$

---

즉,

> **변수들을 실제 타입으로 “치환(substitution)”하는 과정**

이다.

---

### 조금 더 복잡한 예시

다음 식을 보자.

$$
t_0 = t_1 \rightarrow t_2
$$

$$
t_1 = int
$$

$$
t_2 = int
$$

---

이걸 풀면:

$$
t_0 = int \rightarrow int
$$

---

### 핵심 구조

Unification은 항상 이 형태로 진행된다.

- 방정식들을 모으고  
- 하나씩 처리하면서  
- substitution을 만들어간다  

---

### Substitution

여기서 중요한 개념이 하나 나온다.

> **Substitution = 타입 변수 → 타입 매핑**

예를 들어:

$$
S = \{ t_1 \mapsto int,\; t_2 \mapsto int \}
$$

---

이걸 타입에 적용하면:

$$
S(t_1 \rightarrow t_2) = int \rightarrow int
$$

---

### 알고리즘 핵심 흐름

Unification은 다음 규칙으로 동작한다.

#### 1) 같은 타입이면 무시

$$
int = int
$$

→ 아무것도 안 함  

---

#### 2) 변수 = 타입

$$
t = int
$$

→ substitution에 추가  

---

#### 3) 함수 타입

$$
t_1 \rightarrow t_2 = t_3 \rightarrow t_4
$$

→ 쪼갠다

$$
t_1 = t_3,\quad t_2 = t_4
$$

---

### 실패하는 경우

Unification은 항상 성공하지 않는다.

#### 1) 타입 충돌

$$
int = bool
$$

→ 실패  

---

#### 2) 무한 타입 (occurs check)

$$
t = t \rightarrow int
$$

→ 불가능  

이건 “자기 자신을 포함하는 타입”이기 때문이다  
:contentReference[oaicite:0]{index=0}  

---

### 중요한 감각

여기서 꼭 잡아야 할 핵심은 이것이다.

> **타입 추론은 결국 “방정식을 푸는 문제”다**

---

### 전체 흐름 연결

이제 모든 퍼즐이 맞춰진다.

1. 프로그램을 본다  
2. 타입 방정식을 만든다  
3. Unification으로 푼다  
4. 최종 타입을 얻는다  

---

### 직관적으로 보면

Unification은 이런 느낌이다.

> **“흩어진 조건들을 맞춰서 하나의 일관된 타입을 만드는 과정”**

---

### 한 줄 정리

$$
\text{Unification} = \text{타입 방정식을 만족시키는 substitution을 찾는 과정}
$$

---

## Type Inference의 전체 흐름 — 프로그램에서 타입까지

지금까지 우리는 다음을 단계별로 봤다.

- Type Inference  
- Type Equation  
- Unification  

이제 이걸 하나로 합쳐보자.

---

### 핵심 질문

> **“프로그램 하나가 주어지면, 타입은 어떻게 계산되는가?”**

---

### 전체 흐름

Type Inference는 다음 3단계로 이루어진다.

#### 1) 타입 변수 도입

프로그램의 각 부분에  
**타입 변수를 할당**한다.

예를 들어:

~~~
x + 1
~~~

이걸 이렇게 본다.

$$
x : t_x
$$

$$
1 : int
$$

$$
x + 1 : t
$$

---

#### 2) 타입 방정식 생성

이제 규칙을 이용해서  
조건들을 만든다.

- $$t_x = int$$  
- $$t = int$$  

즉,

> **프로그램이 만족해야 하는 타입 조건을 수집**

---

### 여기까지가 핵심 함수

슬라이드에서는 이 과정을 이렇게 정의한다.

> **V(Γ, e, t)**  
→ “e가 타입 t를 가지기 위한 조건 생성” :contentReference[oaicite:0]{index=0}  

---

#### 3) Unification (방정식 풀이)

이제 생성된 식을 푼다.

- substitution을 만들고  
- 변수들을 실제 타입으로 치환  

---

### 최종 결과

결국 우리는 다음을 얻는다.

$$
t = int
$$

---

### 전체를 한 줄로 보면

$$
\text{Program} \rightarrow \text{Constraints} \rightarrow \text{Solve} \rightarrow \text{Type}
$$

---

### 중요한 감각

여기서 꼭 가져가야 할 핵심은 이것이다.

> **Type Inference는 “계산”이 아니라 “문제 해결 과정”이다**

---

### 다시 정리

- 타입을 직접 계산하지 않는다  
- 조건을 만든다  
- 조건을 푼다  

즉,

> **“타입 추론 = 제약 조건 해결 (constraint solving)”**

---

### 왜 이게 중요한가

이 구조는 단순히 타입 시스템에서만 쓰이는 게 아니다.

- SMT Solver  
- Program Analysis  
- Program Synthesis  

에서도 동일하게 등장한다.

---

### 지금까지의 위치

이제 우리는 다음을 모두 이해했다.

- Syntax → 프로그램 구조  
- Semantics → 프로그램 의미  
- Type System → 안전성  
- Type Inference → 자동화  

---

### 다음 단계

이제 자연스럽게 다음 질문이 나온다.

> **“이 타입 시스템은 얼마나 강력할 수 있을까?”**

다음 글에서는:

- **Polymorphism (다형성)**  
- Let-polymorphism  
- 더 강력한 타입 시스템  

을 다룬다.

---

### 한 줄 정리

$$
\text{Type Inference} = \text{제약 생성 + 제약 해결}
$$