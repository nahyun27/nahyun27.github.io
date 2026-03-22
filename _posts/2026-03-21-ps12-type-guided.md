---
layout: post
title: "[Program Synthesis #12] Type-Guided Synthesis: 타입으로 탐색 공간을 줄이는 방법"
date: 2026-03-21 00:00:00 +0900
categories: [PL / Formal Methods, Program Synthesis]
tags: [program synthesis, type guided synthesis, type system, lambda calculus, inhabitation, formal methods]
description: "Program Synthesis 시리즈 12편 – 타입 정보를 활용해 프로그램 탐색 공간을 구조적으로 제한하는 Type-Guided Synthesis 이해하기"
image:
  path: /assets/img/posts/program-synthesis/type.png
  alt: Type Guided Synthesis
math: true
mermaid: false
series: Program Synthesis
---

## 들어가며 — 타입만으로도 프로그램을 만들 수 있을까

지금까지 우리는 Program Synthesis를 다양한 방식으로 접근해왔다.

- Search → 가능한 프로그램을 탐색하고  
- Representation → 공간을 압축하며  
- Constraint → 조건을 논리로 정의하고  
- Stochastic → 확률적으로 탐색한다  

---

이 모든 접근은 공통된 전제를 가진다.

> 프로그램을 “탐색 대상”으로 본다

---

하지만 여기서 한 가지 근본적인 질문이 생긴다.

> 프로그램의 구조를 더 강하게 제한할 수는 없을까?

---

이 질문에 대한 답 중 하나가 바로

> **Type-Guided Synthesis**

다.

---

이 접근에서는 프로그램을 만들 때  
타입(type)을 단순한 검증 도구로 보지 않는다.

> 타입을 “탐색을 제한하는 규칙”으로 사용한다

---

즉 타입은 더 이상

- 프로그램이 맞는지 확인하는 용도가 아니라

> **어떤 프로그램이 가능한지를 결정하는 기준**

이 된다.

---

이 관점에서 synthesis 문제는 다음처럼 바뀐다.

- 기존 → 가능한 프로그램 중에서 정답을 찾는다  
- 이제 → **타입을 만족하는 프로그램만 고려한다**  

---

특히 함수형 언어에서는  
타입만으로도 프로그램 구조가 강하게 제한된다.

예를 들어:

$$
f : \text{int} \rightarrow \text{int}
$$

라는 타입이 주어지면,

- 가능한 프로그램 형태가 이미 제한되고  
- 일부 경우에는 거의 유일하게 결정되기도 한다  

---

이 글에서는 다음을 다룬다.

- 타입이 탐색 공간을 어떻게 줄이는지  
- type inhabitation 문제  
- λ-calculus에서의 synthesis  
- 왜 타입만으로도 프로그램을 만들 수 있는지  

---

## 타입은 Constraint다 — 가능한 프로그램을 미리 제한하기

Type-Guided Synthesis의 핵심은 간단하다.

> 타입이 가능한 프로그램을 “사전에” 걸러낸다

---

### 기존 접근과의 차이

지금까지의 synthesis는 보통 이렇게 동작했다.

- 프로그램을 생성하고  
- 조건을 검사한다  

---

즉,

> generate → test

---

하지만 타입을 도입하면 순서가 바뀐다.

> **생성 전에 이미 많은 후보가 제거된다**

---

### 타입이 하는 일

타입 시스템은 다음을 보장한다.

- 잘못된 프로그램은 애초에 생성되지 않는다  
- 의미 없는 조합은 고려되지 않는다  

---

예를 들어 다음 타입을 보자.

$$
f : \text{int} \rightarrow \text{int}
$$

---

이 경우 가능한 프로그램은 제한된다.

- 문자열 연산 ❌  
- boolean 반환 ❌  
- 타입이 맞는 연산만 가능  

---

즉,

> 타입 자체가 강력한 pruning 역할을 한다

---

### 함수 타입이 주는 구조

타입은 단순히 값의 종류만 제한하지 않는다.

> 프로그램의 “형태”도 제한한다

---

예를 들어:

$$
f : A \rightarrow B \rightarrow A
$$

---

이 타입을 만족하는 함수는 무엇일까?

가능한 구현은 매우 제한적이다.

~~~
f x y = x
~~~

---

여기서 중요한 점은:

> 타입만 보고도 프로그램 구조가 거의 결정된다

---

### 더 복잡한 예

다음 타입을 보자.

$$
f : (A \rightarrow B) \rightarrow A \rightarrow B
$$

---

이 타입을 만족하는 가장 자연스러운 프로그램은:

~~~
f g x = g x
~~~

---

즉,

> 타입이 프로그램의 skeleton을 제공한다

---

### 핵심 직관

Type-Guided Synthesis에서는

- 타입 = constraint  
- 프로그램 생성 = constraint 만족  

---

즉 synthesis는 다음처럼 바뀐다.

$$
\text{Find } f \quad \rightarrow \quad \text{Find } f \text{ such that } f : \tau
$$

---

### 중요한 관점

이 접근에서 타입은 단순한 필터가 아니다.

> **탐색 공간 자체를 정의하는 역할**

을 한다.

---

즉,

- search space를 줄이는 것이 아니라  
- 애초에 가능한 공간을 재정의한다  

---

### 결과적으로

Type-Guided Synthesis는 다음과 같이 볼 수 있다.

- 기존 → 큰 공간에서 정답 찾기  
- 변경 → 작은 공간만 생성하기  

---

이 차이는 매우 중요하다.

왜냐하면:

> search를 줄이는 것이 아니라  
> **search 자체를 바꾸기 때문**


---

## Type Inhabitation — 타입을 만족하는 프로그램 찾기

앞에서 타입이 탐색 공간을 제한하는 역할을 한다고 했다.

이제 질문을 한 단계 더 밀어붙여보자.

> 타입만 주어졌을 때, 그 타입을 만족하는 프로그램을 만들 수 있을까?

---

이 문제가 바로

> **Type Inhabitation**

이다.

---

### 문제 정의

Type Inhabitation은 다음과 같이 정의된다.

$$
\text{Given a type } \tau,\ \text{find a term } e \text{ such that } e : \tau
$$

---

즉,

> 어떤 타입을 “채울 수 있는 프로그램”을 찾는 문제다

---

### 간단한 예

다음 타입을 보자.

$$
A \rightarrow A
$$

---

이 타입을 만족하는 프로그램은 무엇일까?

가장 간단한 답은:

~~~
f x = x
~~~

---

즉,

> identity function

---

### 조금 더 복잡한 예

다음 타입을 보자.

$$
A \rightarrow B \rightarrow A
$$

---

가능한 프로그램은?

~~~
f x y = x
~~~

---

이건 사실상 유일한 형태다.

---

### 중요한 관점

여기서 중요한 점은 이것이다.

> 타입이 프로그램의 “가능한 형태”를 강하게 제한한다

---

즉,

- 아무 프로그램이나 만들 수 있는 것이 아니라  
- 타입을 만족하는 프로그램만 가능하다  

---

### λ-calculus 관점

Type-Guided Synthesis는 보통 λ-calculus 기반으로 설명된다.

---

프로그램은 다음과 같은 형태를 가진다.

~~~
e ::= x | λx.e | e1 e2
~~~

---

즉,

- 변수  
- 함수 정의  
- 함수 적용  

---

이 구조 안에서 타입을 만족하는 term을 찾는다.

---

### 구성 방식

Type Inhabitation은 보통 다음 방식으로 진행된다.

---

#### 1. 타입을 분석한다

예:

$$
A \rightarrow B
$$

→ 함수 필요

---

#### 2. 구조를 만든다

~~~
λx. ...
~~~

---

#### 3. 남은 타입을 채운다

남은 목표 타입을 계속 쪼갠다.

---

이 과정을 반복하면 프로그램이 완성된다.

---

### 핵심 직관

이 과정을 요약하면 다음과 같다.

- 타입 → 프로그램 구조 결정  
- 남은 타입 → subproblem  

---

즉 synthesis는:

> **타입을 따라 프로그램을 “구성하는 과정”**

이 된다.

---

### search와의 관계

겉으로 보면 여전히 탐색처럼 보인다.

하지만 중요한 차이가 있다.

---

- 기존 → 구조를 모르고 탐색  
- 여기 → 타입이 구조를 알려줌  

---

즉,

> **guided construction**

---

### 중요한 성질

Type Inhabitation은 강력하지만,  
항상 간단한 문제는 아니다.

---

- 단순 타입 → 비교적 쉬움  
- 고급 타입 → 매우 복잡  

---

특히:

- polymorphism  
- higher-order 함수  

이 포함되면 난이도가 급격히 올라간다.

---

### 핵심 정리

Type Inhabitation은

> 타입을 만족하는 프로그램을 찾는 문제

이며,

Type-Guided Synthesis는 이를 기반으로 한다.

---

즉,

- 타입이 constraint가 되고  
- 프로그램은 그 constraint를 만족하는 해가 된다  

---

## 타입만으로 충분한가 — Refinement Type으로 확장하기

앞에서 타입만으로도 프로그램 구조를 강하게 제한할 수 있다는 것을 봤다.

하지만 여기서 자연스럽게 다음 질문이 나온다.

> 타입만으로 모든 제약을 표현할 수 있을까?

---

### 단순 타입의 한계

기본 타입 시스템은 다음과 같은 정보만 제공한다.

- 값의 형태 (int, bool, string)
- 함수 구조 (A → B)

---

하지만 실제 프로그램에서는 더 많은 제약이 필요하다.

예:

- 양수만 허용  
- 리스트의 길이  
- 특정 조건을 만족하는 값  

---

예를 들어 다음 specification을 생각해보자.

> 입력보다 큰 값을 반환하는 함수

---

타입만으로 표현하면:

$$
f : \text{int} \rightarrow \text{int}
$$

---

하지만 이 타입은 너무 약하다.

- $$f(x) = x$$ 도 가능  
- $$f(x) = x - 1$$ 도 가능  

---

즉,

> 우리가 원하는 조건을 표현하지 못한다

---

### Refinement Type

이 문제를 해결하기 위해 등장한 것이

> **Refinement Type**

이다.

---

Refinement Type은 타입에 논리적 조건을 추가한다.

---

예:

$$
f : (x : \text{int}) \rightarrow \{ y : \text{int} \mid y > x \}
$$

---

이건 다음을 의미한다.

> 입력 $$x$$보다 큰 $$y$$를 반환해야 한다

---

### 타입이 더 강해진다

이제 가능한 프로그램은 훨씬 제한된다.

- $$f(x) = x + 1$$ ✔  
- $$f(x) = x$$ ❌  
- $$f(x) = x - 1$$ ❌  

---

즉,

> 타입이 훨씬 강력한 constraint가 된다

---

### synthesis 관점에서 보면

Refinement Type을 사용하면 synthesis는 이렇게 바뀐다.

---

기존:

- 타입 → 구조 제한  
- 나머지는 탐색  

---

확장:

- 타입 + 조건 → 구조 + 의미 제한  

---

즉,

> 더 적은 프로그램만 고려하게 된다

---

### constraint와의 연결

Refinement Type은 constraint와 매우 밀접하다.

---

사실상 다음과 같이 볼 수 있다.

- 타입 → 구조 constraint  
- refinement → 논리 constraint  

---

즉 synthesis는:

$$
\text{Type} + \text{Logic} \rightarrow \text{Program}
$$

---

### Liquid Types

Refinement Type을 실용적으로 만든 것이

> **Liquid Types**

다.

---

이 접근은:

- refinement를 자동으로 추론하고  
- SMT solver로 검증한다  

---

즉,

> 타입 시스템 + constraint solving 결합

---

### 핵심 직관

이제 타입의 역할은 완전히 바뀐다.

- 단순 검증 도구 ❌  
- 강력한 synthesis constraint ✔  

---

즉,

> 타입이 프로그램을 “걸러내는 것”이 아니라  
> **“만드는 데 직접 참여한다”**

---

### 중요한 관점

이 시점에서 synthesis는 또 한 번 변한다.

- search 기반 → constraint 기반  
- 구조 제한 → 의미까지 제한  

---

즉,

> **타입이 곧 specification이 된다**

---

## 정리 — 타입은 탐색을 바꾸는 가장 강력한 제약이다

지금까지 Type-Guided Synthesis를 통해  
타입을 이용해 프로그램을 구성하는 방법을 살펴봤다.

---

이 접근은 기존의 synthesis 방식과 근본적으로 다른 관점을 가진다.

- 기존 → 가능한 프로그램을 탐색한다  
- 이제 → 타입이 가능한 프로그램을 정의한다  

---

즉,

> 탐색 공간을 줄이는 것이 아니라  
> **애초에 가능한 공간을 재정의한다**

---

### 전체 흐름 속에서의 위치

지금까지 시리즈에서 본 접근들을 비교해보면 다음과 같다.

---

- Search → 프로그램을 어떻게 탐색할 것인가  
- Representation → 프로그램 공간을 어떻게 압축할 것인가  
- Constraint → 프로그램을 어떻게 논리로 표현할 것인가  
- Type → 프로그램이 어떤 형태를 가질 수 있는가  

---

이 중에서 타입은 특별한 위치를 가진다.

> **가장 “앞단”에서 탐색을 제한한다**

---

즉,

- search는 나중에 줄이고  
- constraint는 조건을 추가하지만  

> 타입은 **처음부터 가능성을 제한한다**

---

### 중요한 차이

이 차이를 다시 정리하면 다음과 같다.

- Search → 많은 후보 중에서 선택  
- Constraint → 조건을 만족하는 후보 선택  
- Type → 애초에 가능한 후보만 생성  

---

즉 Type-Guided Synthesis는

> **“후처리”가 아니라 “사전 정의”**

다.

---

### 한계와 가능성

물론 타입만으로 모든 것을 해결할 수는 없다.

- 표현력이 제한될 수 있고  
- 복잡한 조건은 refinement가 필요하며  
- 고급 타입에서는 계산이 어려워진다  

---

하지만 그럼에도 불구하고,

> 타입은 synthesis에서 가장 강력한 pruning 도구 중 하나다

---

### 마지막 관점

이제 synthesis를 다음과 같이 볼 수 있다.

- search로 찾고  
- constraint로 제한하고  
- type으로 구조를 정의한다  

---

즉,

> **Type + Constraint + Search의 결합**

---

이 관점은 다음 단계로 자연스럽게 이어진다.

> specification으로부터 프로그램을 직접 “유도”할 수는 없을까?

---

다음 글에서는 이를 위해,

> **Deductive Synthesis**

를 살펴본다.

specification에서 transformation rule을 통해  
프로그램을 직접 구성하는 접근이다.

