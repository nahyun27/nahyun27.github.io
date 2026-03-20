---

layout: post
title: "[Programming Languages #5] Polymorphism: 하나의 코드가 여러 타입을 가지는 이유"
date: 2026-03-22 00:00:00 +0900
categories: [Programming Languages, Formal Methods]
tags: [polymorphism, let-polymorphism, type inference, type system, formal methods]
description: "Programming Languages 시리즈 5편 – 다형성의 개념과 let-polymorphism을 통해 하나의 함수가 여러 타입에서 동작하는 원리 이해하기"
image:
  path: /assets/img/posts/programming-languages/pl5.png
  alt: Polymorphism
math: true
mermaid: false
series: Programming Languages
---

## Polymorphism이란 무엇인가

앞에서 우리는 Type Inference를 통해  
프로그램의 타입을 자동으로 계산하는 방법을 봤다.

이제 자연스럽게 다음 질문이 나온다.

> **“하나의 프로그램은 항상 하나의 타입만 가져야 할까?”**

---

### 직관적인 예

다음 함수를 보자.

~~~
proc (x) x
~~~

이 함수는 무엇을 하는가?

> 입력을 그대로 반환한다

---

### 다양한 사용

이 함수는 이렇게 사용할 수 있다.

~~~
(proc (x) x) 1
~~~

→ 결과: int  

---

또는

~~~
(proc (x) x) true
~~~

→ 결과: bool  

---

### 중요한 관찰

이 함수는:

- int → int  
- bool → bool  

둘 다 가능하다.

---

### 핵심 문제

그렇다면 이 함수의 타입은 무엇일까?

> **하나로 정할 수 없다**

---

### Polymorphism의 등장

이 문제를 해결하는 개념이 바로  
**Polymorphism (다형성)**이다.

> **“하나의 프로그램이 여러 타입으로 해석될 수 있는 것”**

---

### 수식으로 보면

이 함수는 이렇게 표현된다.

$$
\forall t.\; t \rightarrow t
$$

---

### 의미

이 식은 이렇게 읽는다.

> **“모든 타입 t에 대해, t → t 타입을 가진다”**

---

### 중요한 감각

여기서 꼭 가져가야 할 핵심은 이것이다.

> **타입이 하나가 아니라 “패턴”이 된다**

---

### 한 줄 정리

$$
\text{Polymorphism} = \text{하나의 코드가 여러 타입에서 동작하는 성질}
$$

---

## 왜 기존 타입 시스템은 부족한가

앞에서 우리는 타입 시스템과 타입 추론을 배웠다.

즉,

- 프로그램의 타입을 자동으로 계산할 수 있고  
- 타입이 맞는지 검사할 수도 있다  

여기까지 보면 모든 문제가 해결된 것처럼 보인다.

---

### 그런데 실제로는 문제가 있다

다음 프로그램을 보자.

~~~
let id = proc (x) x in
  (id 1, id true)
~~~

이 코드는 직관적으로 완전히 정상이다.

- `id 1` → int  
- `id true` → bool  

즉,

> **같은 함수가 서로 다른 타입으로 사용된다**

---

### 기존 타입 시스템의 한계

하지만 우리가 지금까지 만든 타입 시스템은  
이걸 처리하지 못한다.

왜냐하면:

> **하나의 변수는 하나의 타입만 가져야 하기 때문**

---

### 문제 상황

`id`의 타입을 정해야 한다.

가능한 선택:

#### 경우 1

$$
id : int \rightarrow int
$$

→ `id true`에서 실패  

---

#### 경우 2

$$
id : bool \rightarrow bool
$$

→ `id 1`에서 실패  

---

### 핵심 문제

> **하나의 타입으로는 이 함수를 표현할 수 없다**

---

### 왜 이런 일이 생기는가

지금까지의 타입 시스템은  
이렇게 동작했다.

> **“각 변수는 하나의 고정된 타입을 가진다”**

하지만 `id` 같은 함수는:

- 입력 타입에 따라  
- 다른 타입으로 동작한다  

---

### 직관적으로 보면

이 함수는 사실 이런 성질을 가진다.

> **“어떤 타입이든 그대로 돌려준다”**

---

### 해결 방향

이 문제를 해결하려면  
타입 시스템을 이렇게 바꿔야 한다.

> **“하나의 값이 여러 타입을 가질 수 있도록 하자”**

---

### Polymorphism의 필요성

이 지점에서 등장하는 개념이 바로  
**Polymorphism**이다.

즉,

> **타입을 하나로 고정하지 않고, 일반화한다**

---

### 슬라이드와 연결

이 문제는 실제 강의에서도 핵심 포인트로 등장한다.

- 단순 타입 시스템 → 표현력 부족  
- polymorphism 필요  

👉 이후 let-polymorphism으로 해결  
:contentReference[oaicite:0]{index=0}  

---

### 중요한 감각

여기서 꼭 가져가야 할 핵심은 이것이다.

> **타입 시스템이 너무 단순하면, “정상적인 프로그램”도 표현하지 못한다**

---

### 한 줄 정리

$$
\text{단순 타입 시스템} \Rightarrow \text{표현력 부족}
$$

$$
\text{Polymorphism} \Rightarrow \text{이 문제를 해결}
$$

---

## Let-Polymorphism — 핵심 아이디어

앞에서 우리는 문제를 확인했다.

> **하나의 함수가 여러 타입으로 사용될 수 있다**

하지만 기존 타입 시스템은:

> **하나의 변수 = 하나의 타입**

이 제한 때문에  
정상적인 프로그램도 표현하지 못했다.

---

### 해결 아이디어

이 문제를 해결하는 핵심 아이디어는 이것이다.

> **“let으로 정의된 값은 일반화해서 사용하자”**

---

### 다시 예제를 보자

~~~
let id = proc (x) x in
  (id 1, id true)
~~~

---

### 기존 방식 (실패)

기존 타입 시스템에서는:

- `id`에 하나의 타입만 할당  
- 두 번 사용할 때 충돌 발생  

---

### Let-Polymorphism 방식

이제 이렇게 바꾼다.

> **let에서 정의된 값은 “일반화된 타입”을 가진다**

---

### Generalized Type

`id`의 타입을 이렇게 본다.

$$
id : \forall t.\; t \rightarrow t
$$

---

### 핵심 변화

이제 중요한 변화가 생긴다.

> **id를 사용할 때마다 새로운 타입으로 “인스턴스화”한다**

---

### 사용 과정

#### 1) 첫 번째 사용

~~~
id 1
~~~

$$
t = int
$$

→ $$int \rightarrow int$$  

---

#### 2) 두 번째 사용

~~~
id true
~~~

$$
t = bool
$$

→ $$bool \rightarrow bool$$  

---

### 핵심 구조

이 과정을 한 줄로 보면 이렇게 된다.

> **Generalize → Instantiate**

---

### 왜 let에서만 가능한가

여기서 중요한 디테일이 있다.

> **이건 아무 곳에서나 되는 게 아니다**

---

다음 코드를 보자.

~~~
(proc (id)
  (id 1, id true))
(proc (x) x)
~~~

이건 polymorphism이 안 된다.

---

### 이유

- `proc`의 인자는  
  하나의 타입으로 고정됨  

즉,

> **let은 “값을 정의하는 곳”  
> proc은 “값을 사용하는 곳”**

---

### 중요한 감각

여기서 꼭 가져가야 할 핵심은 이것이다.

> **Polymorphism은 “언제 타입을 일반화하느냐”의 문제다**

---

### 슬라이드 핵심 연결

강의에서는 이걸 이렇게 정리한다.

- let에서만 generalization  
- 사용 시 instantiation  
:contentReference[oaicite:0]{index=0}  

---

### 직관적으로 보면

Let-polymorphism은 이런 느낌이다.

> **“함수를 하나 만들어두고, 쓸 때마다 타입을 새로 맞춰 쓴다”**

---

### 한 줄 정리

$$
\text{Let-Polymorphism} = \text{Generalization + Instantiation}
$$

---

## Type Generalization — 타입을 일반화하는 방법

앞에서 우리는 Let-Polymorphism의 핵심 구조를 봤다.

> **Generalize → Instantiate**

그렇다면 이제 질문이 남는다.

> **“어떻게 generalize를 하는가?”**

---

### 핵심 아이디어

Type Generalization은 한 문장으로 정리된다.

> **“타입에서 자유로운 타입 변수를 찾아서 ∀로 묶는다”**

---

### 예시

다음 함수를 다시 보자.

~~~
proc (x) x
~~~

Type Inference를 하면:

$$
t \rightarrow t
$$

---

### 그런데 이건 아직 불완전하다

이 타입은 사실 이렇게 해석되어야 한다.

> **“어떤 타입이든 가능하다”**

---

### 그래서 이렇게 바꾼다

$$
\forall t.\; t \rightarrow t
$$

---

### Generalization의 정의

좀 더 정확하게 쓰면:

$$
\text{Generalize}(t) = \forall \alpha_1, \alpha_2, \dots .\; t
$$

---

### 중요한 조건

여기서 핵심은 이것이다.

> **“모든 타입 변수를 generalize하면 안 된다”**

---

### Environment (Γ) 등장

우리는 항상 환경을 가지고 있다.

$$
\Gamma
$$

즉,

- 이미 정의된 변수들의 타입 정보  

---

### Generalization 규칙

따라서 실제 규칙은 이렇게 된다.

> **Γ에 등장하지 않는 타입 변수만 generalize한다**

---

### 수식으로 보면

$$
\forall \alpha \in \text{FTV}(t) - \text{FTV}(\Gamma)
$$

---

### 의미

- $$\text{FTV}(t)$$ → 타입 t에 등장하는 자유 변수  
- $$\text{FTV}(\Gamma)$$ → 환경에 이미 있는 변수  

---

### 왜 이런 제한이 필요한가

이 제한이 없으면 문제가 생긴다.

> **외부 정보까지 같이 일반화되어 버린다**

즉,

- 실제로는 고정되어야 하는 타입까지  
- 마음대로 바뀌어버린다  

---

### 직관적으로 보면

Generalization은 이런 느낌이다.

> **“이 값이 진짜로 자유롭게 변할 수 있는 타입만 추출한다”**

---

### 중요한 감각

여기서 꼭 가져가야 할 핵심은 이것이다.

> **Polymorphism은 “모든 것”이 아니라 “안전한 것만 일반화”한다**

---

### 전체 연결

이제 흐름이 완성된다.

1. 타입 방정식 생성  
2. Unification  
3. 타입 얻기  
4. Generalization (let에서만)

---

### 한 줄 정리

$$
\text{Generalization} = \text{환경에 의존하지 않는 타입 변수만 ∀로 묶는 것}
$$

---

## Type Instantiation — 사용할 때 타입을 구체화하는 방법

앞에서 우리는 Generalization을 봤다.

> **타입을 ∀로 일반화한다**

그렇다면 이제 반대로 질문이 생긴다.

> **“이걸 실제로 사용할 때는 어떻게 하는가?”**

---

### 핵심 아이디어

Type Instantiation은 한 문장으로 정리된다.

> **“∀로 묶인 타입 변수에 구체적인 타입을 넣는다”**

---

### 다시 예제

앞에서 본 `id`를 보자.

$$
id : \forall t.\; t \rightarrow t
$$

---

### 사용 순간

이제 `id`를 사용할 때:

~~~
id 1
~~~

이 상황에서는 자연스럽게:

$$
t = int
$$

---

### 결과

$$
id : int \rightarrow int
$$

---

### 또 다른 사용

~~~
id true
~~~

이번에는:

$$
t = bool
$$

---

### 결과

$$
id : bool \rightarrow bool
$$

---

### 핵심 구조

이 과정을 한 줄로 보면:

> **“필요할 때마다 타입을 새로 만든다”**

---

### Substitution 형태

Instantiation은 실제로 substitution이다.

$$
S = \{ t \mapsto int \}
$$

---

적용하면:

$$
S(t \rightarrow t) = int \rightarrow int
$$

---

### 중요한 디테일

여기서 핵심은 이것이다.

> **매번 “새로운 타입 변수”로 시작한다**

---

### 왜 중요한가

이걸 안 하면 문제가 생긴다.

- 한 번 정해진 타입이  
- 모든 사용에 영향을 줌  

즉,

> **Polymorphism이 깨진다**

---

### Generalization vs Instantiation

이제 두 개를 같이 보면 완벽하다.

| 단계 | 역할 |
|------|------|
| Generalization | 타입을 일반화 (∀ 도입) |
| Instantiation | 사용할 때 구체화 |

---

### 전체 흐름

이제 Let-Polymorphism의 전체 구조가 보인다.

1. let에서 정의  
2. 타입 추론  
3. Generalization  
4. 사용할 때 Instantiation  

---

### 직관적으로 보면

이건 이런 느낌이다.

> **“함수를 하나 만들어두고, 쓸 때마다 새 타입으로 복사해서 쓴다”**

---

### 전체 한 줄 정리

$$
\text{Polymorphism} = \text{Generalize + Instantiate}
$$

---

## 마무리 — 이제 프로그램을 “만들” 차례다

여기까지 오면 우리는 중요한 도구들을 모두 갖게 된다.

- 프로그램을 **형식적으로 정의하는 방법**  
- 그 의미를 **수학적으로 설명하는 방법**  
- 타입 시스템을 통해 **안전성을 보장하는 방법**  
- 그리고 타입을 **자동으로 추론하는 방법**  

---

### 지금까지 우리가 해온 것

이 시리즈의 핵심은 하나였다.

> **“프로그램을 이해하는 방법”**

우리는 프로그램을 단순한 코드가 아니라  
다음과 같은 대상으로 다뤘다.

$$
\text{Program} \rightarrow \text{Meaning}
$$

그리고

$$
\text{Program} \rightarrow \text{Type}
$$

---

### 이제 질문을 바꿔보자

지금까지는 계속 이런 질문을 했다.

> **“이 프로그램이 맞는가?”**

---

이제는 이 질문을 바꿀 수 있다.

> **“조건을 만족하는 프로그램을 만들 수 있는가?”**

---

### 왜 지금 가능한가

이 질문을 할 수 있게 된 이유는 명확하다.

우리는 이미:

- 프로그램을 **논리적으로 표현할 수 있고**  
- 그 의미를 **형식적으로 검사할 수 있으며**  
- 조건을 **수식으로 다룰 수 있는 상태**다  

---

### 다음 단계

이제 문제는 이렇게 바뀐다.

$$
\text{“이 조건을 만족하는 프로그램이 존재하는가?”}
$$

그리고 더 나아가:

$$
\text{“그 프로그램을 자동으로 찾을 수 있는가?”}
$$

---

### Program Synthesis로의 전환

이 질문이 바로  
**Program Synthesis (프로그램 합성)**의 시작이다.

---

### 연결되는 개념들

앞으로 다루게 될 내용은 다음과 같다.

- **SAT / SMT** → 조건 만족 문제  
- **Logic** → 프로그램의 의미 표현  
- **Grammar** → 가능한 프로그램의 범위 제한  
- **Search / Refinement** → 프로그램을 찾는 과정  

---

### 중요한 연결

지금까지 배운 것들은  
단순한 이론이 아니라:

> **프로그램을 “자동으로 생성하기 위한 기반”**

이다.

$$
\text{지금까지} = \text{프로그램을 이해하는 방법}
$$

$$
\text{이제부터} = \text{프로그램을 자동으로 만드는 방법}
$$

---

다음 글에서는  
이 흐름을 이어서 **Program Synthesis의 핵심 개념**부터 시작한다.