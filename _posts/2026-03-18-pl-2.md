---

layout: post
title: "[Programming Languages #2] Structural Induction과 프로그램의 의미 정의"
date: 2026-03-18 00:00:00 +0900
categories: [Programming Languages, Formal Methods]
tags: [programming languages, structural induction, semantics, evaluation, environment, formal methods]
description: "Programming Languages 시리즈 2편 – Structural Induction과 evaluation relation을 통해 프로그램의 의미를 수학적으로 정의하는 방법"
image:
  path: /assets/img/posts/programming-languages/pl2.png
  alt: Structural Induction and Semantics
math: true
mermaid: false
series: Programming Languages
---

## 프로그램의 성질은 어떻게 증명할까?

지난 글에서는 프로그램을 정의하는 방법을 봤다.

- Inductive Definition  
- Syntax vs Semantics  
- Inference Rules  

이제 자연스럽게 다음 질문이 나온다.

> **“이렇게 정의된 프로그램이 항상 올바르다는 걸 어떻게 증명할까?”**

이 질문에 답하는 도구가 바로  
**Structural Induction (구조적 귀납법)** 이다.

---

## Structural Induction — 구조를 따라 증명하는 방법

Structural Induction은 한 문장으로 정리된다.

> **“프로그램의 구조를 따라 성질이 유지됨을 증명하는 방법”**

---

### 왜 필요한가

우리가 다루는 대상은 이런 것들이다.

- 프로그램 (expression)  
- 트리 구조  
- 리스트  

이들의 공통점은 하나다.

> **귀납적으로 정의된 구조**

즉,

- base case가 있고  
- recursive case가 있다  

---

하지만 여기서 중요한 차이가 있다.

우리가 아는 일반적인 수학적 귀납법은  
숫자에 대해 사용된다.

$$
P(0), \quad P(n) \Rightarrow P(n+1)
$$

반면, 프로그램은 이런 선형 구조가 아니다.

> **프로그램은 “트리 구조”로 만들어진다**

예를 들어:

~~~
x
x + 1
(x + 1) * (x + 2)
if x then y else z
~~~

이건 “다음 단계”가 아니라  
**구조적으로 확장되는 형태**다.

---

그래서 필요한 것이 바로 Structural Induction이다.

핵심 아이디어는 단순하다.

> **“정의된 방식 그대로 증명한다”**

---

### 어떻게 증명하는가

Inductive Definition을 다시 보자.

$$
S \rightarrow x \mid S + S \mid 1
$$

이 문법으로 만들어지는 모든 식 $$e$$에 대해  
어떤 성질 $$P(e)$$를 증명하고 싶다면,  
다음만 보이면 된다.

---

**1) Base case**

$$
P(x), \quad P(1)
$$

---

**2) Inductive case**

$$
P(e_1), P(e_2) \Rightarrow P(e_1 + e_2)
$$

---

이 두 가지가 성립하면,

$$
\forall e \in L(G), \quad P(e)
$$

가 성립한다.

---

### 중요한 감각

여기서 가장 중요한 포인트는 이것이다.

> **“증명은 생성 규칙을 그대로 따라간다”**

- 어떻게 만들어졌는지를 보면  
- 어떻게 증명할지도 결정된다  

---

### 왜 PL에서 핵심인가

이 개념이 중요한 이유는 명확하다.

> **프로그래밍 언어의 모든 것이 귀납적으로 정의되기 때문이다**

- 프로그램  
- 값  
- 평가 규칙  
- 타입 시스템  

따라서,

> **PL에서의 모든 증명은 Structural Induction으로 이루어진다**

---

### 한 줄 정리

$$
\text{Structural Induction} = \text{구조를 따라가는 증명 방법}
$$

---

## Evaluation Relation — 프로그램의 의미를 정의하는 방법

Structural Induction을 통해  
“프로그램에 대해 어떻게 증명하는지”를 봤다.

이제 더 근본적인 질문으로 넘어간다.

> **“그래서 이 프로그램은 실제로 무엇을 의미하는가?”**

이 질문에 답하는 것이 바로  
**Evaluation Relation**이다.

---

### 프로그램의 의미를 수식으로 표현하기

우리는 보통 이렇게 말한다.

- “이 프로그램은 3이 된다”  
- “이 식은 True로 계산된다”  

PL에서는 이를 다음처럼 쓴다.

$$
\rho \vdash e \Rightarrow v
$$

---

### 기호의 의미

이 식은 다음과 같이 읽는다.

> **“환경 $$\rho$$에서, 프로그램 $$e$$는 값 $$v$$로 평가된다”**

각 요소는 다음을 의미한다.

- $$e$$ : 프로그램 (expression)  
- $$v$$ : 결과 값 (value)  
- $$\rho$$ : 환경 (environment)  

---

### 왜 환경이 필요한가

프로그램은 혼자서는 의미를 가지지 않는다.

예를 들어:

~~~
x + 1
~~~

이 식은 $$x$$ 값이 없으면 계산할 수 없다.

그래서 환경을 도입한다.

$$
\rho = \{ x \mapsto 3 \}
$$

이제 다음이 가능해진다.

$$
\rho \vdash x + 1 \Rightarrow 4
$$

즉,

> **환경은 변수의 값을 제공하는 역할을 한다**

---

### Evaluation Relation의 본질

여기서 중요한 관점이 있다.

> **Evaluation Relation은 “함수”가 아니라 “규칙 집합”이다**

즉,

- 실행을 구현하는 것이 아니라  
- **실행을 정의하는 것**이다  

---

### Inference Rule로 정의하기

Evaluation Relation은 Inference Rule로 표현된다.

#### 숫자

$$
\frac{}{\rho \vdash n \Rightarrow n}
$$

→ 숫자는 그대로 평가된다

---

#### 변수

$$
\frac{}{\rho \vdash x \Rightarrow \rho(x)}
$$

→ 변수는 환경에서 값을 가져온다

---

#### 덧셈

$$
\frac{
\rho \vdash e_1 \Rightarrow n_1 \quad
\rho \vdash e_2 \Rightarrow n_2
}{
\rho \vdash e_1 + e_2 \Rightarrow n_1 + n_2
}
$$

→ 두 식을 먼저 계산한 뒤 더한다

---

### 중요한 감각

여기서 꼭 가져가야 할 핵심은 이것이다.

> **“프로그램 실행 = 규칙을 적용하는 과정”**

즉,

- 실행한다 → 계산한다  
- 계산한다 → 규칙을 적용한다  
- 규칙을 적용한다 → derivation을 만든다  

---

### 한 줄 정리

$$
\text{Evaluation Relation} = \text{프로그램 의미를 정의하는 규칙 시스템}
$$

---

## Derivation — 실행은 증명이다

앞에서 우리는 다음과 같은 형태를 봤다.

$$
\rho \vdash e \Rightarrow v
$$

그리고 이게 단순한 결과가 아니라  
**Inference Rule로 정의된 것**이라는 것도 확인했다.

이제 중요한 질문이 남는다.

> **“그럼 실제로 이 식은 어떻게 계산되는가?”**

이 질문에 답하는 것이 바로  
**Derivation (유도 과정)** 이다.

---

### 실행은 규칙을 적용하는 과정

프로그램을 실행한다는 것은 이렇게 볼 수 있다.

> **규칙을 계속 적용해서 결과를 만들어내는 것**

즉,

- 한 번에 계산되는 것이 아니라  
- 여러 단계의 규칙 적용으로 이루어진다  

---

### 간단한 예제

다음 식을 보자.

~~~
x + 1
~~~

환경이 다음과 같다고 하자.

$$
\rho = \{ x \mapsto 3 \}
$$

우리는 다음을 보이고 싶다.

$$
\rho \vdash x + 1 \Rightarrow 4
$$

---

### 계산 과정

이 결과는 한 번에 나오지 않는다.  
작은 단위부터 계산한다.

#### 1) 변수 평가

$$
\rho \vdash x \Rightarrow 3
$$

#### 2) 숫자 평가

$$
\rho \vdash 1 \Rightarrow 1
$$

#### 3) 덧셈 적용

$$
\rho \vdash x + 1 \Rightarrow 3 + 1 = 4
$$

---

### Derivation Tree

이 과정을 트리로 표현하면 다음과 같다.

~~~
        ρ ⊢ x + 1 ⇒ 4
       /               \
ρ ⊢ x ⇒ 3         ρ ⊢ 1 ⇒ 1
~~~

이 구조를 **Derivation Tree**라고 한다.

---

### 이 트리가 의미하는 것

이건 단순한 그림이 아니다.

> **“왜 이 결과가 나오는지에 대한 증명”**

- 루트 → 우리가 증명하려는 결과  
- 자식 → 그 결과를 만들기 위한 조건  
- 리프 → 더 이상 쪼갤 수 없는 기본 규칙  

---

### 핵심 관점

여기서 가장 중요한 포인트는 이것이다.

> **프로그램 실행 = derivation tree를 만드는 과정**

즉,

- 실행한다 → 값을 계산한다  
- 계산한다 → 규칙을 적용한다  
- 규칙을 적용한다 → 트리를 만든다  

---

### 왜 중요한가

이 관점이 중요한 이유는 명확하다.

이제 우리는 단순히 실행하는 것이 아니라  
다음과 같은 것을 할 수 있게 된다.

- 실행 결과의 존재 증명  
- 결과의 유일성 증명 (determinism)  
- 프로그램 성질 분석  

즉,

> **프로그램을 분석 가능한 대상로 만든다**

---

### 한 줄 정리

$$
\text{Execution} = \text{Derivation}
$$

---


## Interpreter — 규칙을 코드로 만든 것

지금까지 우리는 프로그램의 의미를 이렇게 정의했다.

- Evaluation Relation  
- Inference Rules  
- Derivation Tree  

이제 마지막 질문이다.

> **“이걸 실제로 실행하려면 어떻게 해야 할까?”**

---

### 핵심 아이디어

답은 단순하다.

> **Inference Rule을 그대로 코드로 옮기면 된다**

---

### 규칙을 다시 보면

우리는 이미 다음과 같은 규칙을 가지고 있다.

$$
\frac{}{\rho \vdash n \Rightarrow n}
\qquad
\frac{}{\rho \vdash x \Rightarrow \rho(x)}
$$

$$
\frac{
\rho \vdash e_1 \Rightarrow n_1 \quad
\rho \vdash e_2 \Rightarrow n_2
}{
\rho \vdash e_1 + e_2 \Rightarrow n_1 + n_2
}
$$

이건 단순한 수식이 아니라,

> **“이 언어는 이렇게 실행된다”는 정의**

다.

---

### 코드로 바꾸면

이 규칙을 그대로 함수로 만들 수 있다.

~~~
eval(e, ρ):
  match e:
    case n:
      return n
    case x:
      return ρ(x)
    case e1 + e2:
      v1 = eval(e1, ρ)
      v2 = eval(e2, ρ)
      return v1 + v2
~~~

이게 바로 interpreter다.

---

### 중요한 관점

여기서 핵심은 이것이다.

> **Interpreter는 “구현”이 아니라 “정의의 실행 버전”이다**

- Inference Rule → 수학적 정의  
- Interpreter → 그 정의를 코드로 옮긴 것  

---

### 전체 흐름 정리

이제 전체 구조가 연결된다.

$$
\text{Syntax} \rightarrow \text{Semantics} \rightarrow \text{Interpreter}
$$

- Syntax → 프로그램 정의  
- Semantics → 의미 정의  
- Interpreter → 실제 실행  

---

### 왜 중요한가

이 접근의 핵심은 다음이다.

> **정의가 명확하면 구현은 따라온다**

- 먼저 정의하고  
- 그 다음 구현한다  

이 순서를 따르면

- 버그 감소  
- 의미 명확화  
- 분석 용이  

---

### 한 줄 정리

$$
\text{Interpreter} = \text{Semantics의 실행 버전}
$$

---

## 마무리

이번 글에서는 프로그램의 의미가  
어떻게 정의되고 실행으로 이어지는지를 봤다.

- Structural Induction → 성질 증명  
- Evaluation Relation → 의미 정의  
- Derivation → 실행 과정  
- Interpreter → 실행 구현  

이 흐름이 프로그래밍 언어 이론의 핵심이다.

---

다음 글에서는 다음 질문으로 넘어간다.

> **“변수는 어떻게 값을 찾는가?”**

- Environment 구조  
- Scope (lexical vs dynamic)  
- 변수 바인딩  

을 본격적으로 살펴본다.