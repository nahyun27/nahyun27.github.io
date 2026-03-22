---
layout: post
title: "[Program Synthesis #14] Program Synthesis in the Wild: 실제 시스템과 응용"
date: 2026-03-21 00:00:00 +0900
categories: [PL / Formal Methods, Program Synthesis]
tags: [program synthesis, program repair, superoptimization, llm, real world, applications]
description: "Program Synthesis 시리즈 14편 – Superoptimization, Program Repair, LLM 기반 코드 생성까지 실제 환경에서의 synthesis 응용 이해하기"
image:
  path: /assets/img/posts/program-synthesis/ps14.png
  alt: Program Synthesis in the Wild
math: true
mermaid: false
series: Program Synthesis
---

## 들어가며 — 이론은 이미 현실이 되었다

지금까지 우리는 Program Synthesis를 다양한 관점에서 살펴봤다.

- Search, Constraint, Type, Deductive
- 그리고 실제 시스템 (FlashFill, Sketch, STOKE)

---

이제 마지막 질문이 남는다.

> 이 모든 기술은 실제로 어디에 쓰이고 있을까?

---

Program Synthesis는 더 이상 연구 주제가 아니다.

이미 다양한 형태로 실제 시스템에 적용되고 있다.

---

- 프로그램을 더 빠르게 만들고  
- 버그를 자동으로 수정하며  
- 코드를 직접 생성하는 수준까지 발전했다  

---

즉 synthesis는 이제

> **“코드를 만드는 기술”**

로 확장되고 있다.

---

이 글에서는 다음을 살펴본다.

- Superoptimization — 프로그램을 더 빠르게  
- Program Repair — 버그를 자동으로 수정  
- LLM 기반 Synthesis — 자연어에서 코드로  

---

이 세 가지는 서로 다른 접근이지만,  
하나의 공통점을 가진다.

> **프로그램을 자동으로 생성하거나 개선한다**

---

## Superoptimization — 프로그램을 더 빠르게 만드는 synthesis

Program Synthesis의 가장 직관적인 응용 중 하나는

> 이미 존재하는 프로그램을 더 좋은 프로그램으로 바꾸는 것

이다.

---

### 문제 정의

Superoptimization은 다음 문제를 푼다.

> 주어진 프로그램과 동일하게 동작하면서  
> **더 빠른 프로그램을 찾아라**

---

즉,

- correctness는 유지하고  
- performance는 개선한다  

---

### 예시

간단한 예를 보자.

~~~
x * 2
~~~

이걸 더 효율적으로 바꾸면:

~~~
x << 1
~~~

---

이건 단순하지만, 실제 문제는 훨씬 복잡하다.

- instruction sequence  
- register allocation  
- CPU pipeline  

---

즉,

> 가능한 프로그램 공간이 매우 크다

---

### 왜 어려운가

이 문제는 기존 synthesis 방식으로 풀기 어렵다.

- grammar가 매우 자유롭고  
- 가능한 조합이 폭발적으로 많으며  
- “정답 구조”가 명확하지 않다  

---

즉,

> search space가 거의 제한되지 않는다

---

### STOKE의 접근

이 문제를 해결하기 위해 등장한 것이

> **STOKE**

다.

---

STOKE는 완전히 다른 접근을 사용한다.

> **Stochastic Search 기반 synthesis**

---

### 핵심 아이디어

STOKE는 프로그램을 다음처럼 다룬다.

- 하나의 프로그램을 선택하고  
- mutation을 통해 조금씩 변경하며  
- 더 좋은 프로그램으로 이동한다  

---

즉,

> 프로그램을 “탐색”하는 것이 아니라  
> **“개선”하는 과정**

이다.

---

### Cost Function

STOKE에서 가장 중요한 요소는 cost다.

---

cost는 두 가지를 반영한다.

- correctness  
- performance  

---

즉,

$$
cost = correctness\_penalty + performance\_cost
$$

---

이때 중요한 점은:

> 완벽한 correctness가 아니라  
> **“충분히 좋은” correctness를 허용한다**

---

### 왜 효과적인가

이 방식이 잘 작동하는 이유는 다음과 같다.

---

#### 1. enormous search space 대응

완전 탐색이 불가능한 공간에서도 작동한다.

---

#### 2. local improvement

작은 변화를 통해 점진적으로 개선한다.

---

#### 3. flexibility

grammar에 강하게 의존하지 않는다.

---

### 중요한 관점

Superoptimization은 synthesis를 이렇게 바꾼다.

- 기존 → 프로그램을 찾는다  
- 이제 → **프로그램을 개선한다**

---

즉,

> **optimization 문제**

---

### 한계

- global optimum 보장 없음  
- correctness 검증이 어려움  
- tuning 필요  

---

하지만 그럼에도 불구하고,

> **현실에서 매우 강력한 접근**

이다.

---

## Program Repair — 버그를 자동으로 고치는 synthesis

Program Synthesis의 또 다른 강력한 응용은

> **잘못된 프로그램을 자동으로 수정하는 것**

이다.

---

### 문제 정의

Program Repair는 다음 문제를 푼다.

> 버그가 있는 프로그램이 주어졌을 때,  
> 이를 수정하여 올바르게 동작하게 만들어라

---

즉,

- 입력 → buggy program  
- 출력 → corrected program  

---

### 예시

~~~
# buggy code
def max(a, b):
    if a > b:
        return b
    else:
        return a
~~~

---

이 코드는 잘못된 결과를 낸다.

---

수정된 프로그램:

~~~
def max(a, b):
    if a > b:
        return a
    else:
        return b
~~~

---

즉,

> 작은 수정으로 올바른 프로그램 생성

---

### 핵심 아이디어

Program Repair는 다음 구조를 가진다.

1. 프로그램을 수정 가능한 형태로 만든다  
2. 테스트 케이스를 기반으로 평가한다  
3. 수정 후보를 생성하고 선택한다  

---

즉,

> **synthesis + testing**

---

### Generate and Validate

가장 기본적인 접근은 다음과 같다.

---

1. 프로그램을 변형 (mutation)  
2. 테스트 케이스 실행  
3. 통과하면 채택  

---

~~~
for candidate in mutations(program):
    if passes_all_tests(candidate):
        return candidate
~~~

---

이 방식은 단순하지만 강력하다.

---

### GenProg

대표적인 시스템은

> **GenProg**

이다.

---

GenProg는 다음을 수행한다.

- 코드 조각을 삭제 / 교체 / 삽입  
- 테스트 케이스로 평가  
- genetic algorithm으로 개선  

---

즉,

> **evolutionary synthesis**

---

### Prophet

또 다른 접근은

> **Prophet**

이다.

---

Prophet은 다음을 추가한다.

- 과거 패치를 학습  
- 더 “자연스러운” 수정 우선  

---

즉,

> **learning-based repair**

---

### 핵심 직관

Program Repair는 synthesis를 이렇게 바꾼다.

- 기존 → 프로그램을 새로 만든다  
- 이제 → **기존 프로그램을 수정한다**

---

즉,

> search space가 “전체 프로그램”이 아니라  
> **“수정 가능한 변화”로 제한된다**

---

### 왜 효과적인가

이 방식이 잘 작동하는 이유는 다음과 같다.

---

#### 1. 작은 변화로 해결 가능

대부분의 버그는 작은 수정으로 해결된다.

---

#### 2. 테스트 기반 검증

명확한 correctness 기준이 존재한다.

---

#### 3. 기존 구조 활용

프로그램을 처음부터 만들 필요가 없다.

---

### 한계

- 테스트 케이스에 의존  
- overfitting 가능  
- 의미적 correctness 보장 어려움  

---

### 중요한 관점

Program Repair는 synthesis를 다음처럼 재정의한다.

> 프로그램을 만드는 것이 아니라  
> **프로그램을 고치는 것**

---

즉,

> **maintenance 문제로 확장된다**

---

## LLM 기반 Synthesis — 자연어에서 코드로

최근 Program Synthesis의 가장 큰 변화는

> **대형 언어 모델(LLM)을 활용한 코드 생성**

이다.

---

### 문제 설정

기존 synthesis는 보통 다음과 같았다.

- input-output 예제  
- formal specification  
- 또는 타입  

---

하지만 LLM 기반 접근은 다르다.

> 자연어로 프로그램을 정의한다

---

예:

~~~
"리스트에서 짝수만 필터링하는 함수 작성해줘"
~~~

---

→ LLM이 코드 생성:

~~~
def filter_even(xs):
    return [x for x in xs if x % 2 == 0]
~~~

---

즉,

> **prompt → program**

---

### 핵심 아이디어

LLM 기반 synthesis는 다음과 같이 작동한다.

- 방대한 코드 데이터를 학습하고  
- 확률적으로 다음 토큰을 예측하며  
- 전체 프로그램을 생성한다  

---

즉,

> **확률 분포 기반 프로그램 생성**

---

### 기존 방식과의 차이

이 접근은 지금까지의 방법들과 크게 다르다.

---

- Search → 구조적으로 탐색  
- Constraint → 논리적으로 해결  
- Type → 가능성 제한  
- Deductive → 규칙 기반 구성  

---

LLM은:

> **데이터 기반으로 “그럴듯한 프로그램”을 생성한다**

---

### 강력한 이유

이 방식이 성공한 이유는 명확하다.

---

#### 1. implicit knowledge

수많은 코드 패턴을 학습했다.

---

#### 2. flexible input

자연어, 예제, 코드 등 다양한 입력 처리 가능

---

#### 3. 빠른 생성

즉시 프로그램 생성 가능

---

### 한계

하지만 중요한 한계도 존재한다.

---

#### 1. correctness 보장 없음

- 실행은 되지만 틀릴 수 있음

---

#### 2. reasoning 부족

- 복잡한 논리에서는 오류 발생

---

#### 3. hallucination

- 존재하지 않는 API 생성

---

### synthesis와의 관계

LLM은 전통적인 synthesis를 대체하지 않는다.

---

대신 다음과 같이 결합된다.

- LLM → 후보 생성  
- Constraint / Test → 검증  
- Search → refinement  

---

즉,

> **Neuro-symbolic synthesis**

---

### 중요한 관점

LLM 기반 접근은 synthesis를 또 한 번 바꾼다.

- 기존 → 정확한 프로그램 생성  
- 이제 → **가능성 높은 프로그램 생성**

---

즉,

> 확률 기반 synthesis

---

## 정리 — Program Synthesis는 이미 현실이 되었다

지금까지 우리는 Program Synthesis가  
실제 시스템에서 어떻게 사용되는지 살펴봤다.

---

- Superoptimization → 프로그램을 더 빠르게 만들고  
- Program Repair → 버그를 자동으로 수정하며  
- LLM 기반 Synthesis → 자연어로부터 코드를 생성한다  

---

이 세 가지는 접근 방식은 다르지만,  
하나의 공통된 방향을 가진다.

> **프로그램을 자동으로 생성하고, 개선하는 것**

---

### 이론에서 현실로

시리즈 초반에서 우리는 synthesis를 이렇게 배웠다.

- 프로그램을 탐색하고  
- 조건을 만족하는 후보를 찾는 문제  

---

하지만 이제는 다르다.

---

- 프로그램을 개선하고  
- 버그를 수정하고  
- 자연어에서 생성한다  

---

즉 synthesis는 더 이상

> “프로그램을 찾는 문제”

가 아니라

> **“코드를 다루는 전반적인 자동화 기술”**

이 된다.

---

### 전체 흐름 다시 보기

이 시리즈 전체를 하나의 흐름으로 보면 다음과 같다.

---

- Enumeration → brute-force 탐색  
- Pruning / Representation → 공간 축소  
- Bidirectional / Stochastic → 탐색 전략 개선  
- Constraint / Type / Deductive → 구조적 접근  
- Systems → 실제 구현  
- Wild → 현실 응용  

---

이 흐름은 하나의 방향을 보여준다.

> 점점 더 “탐색”에서 벗어나  
> **구조화된 문제 해결로 이동한다**

---

### 현재의 위치

현재 Program Synthesis는 다음 세 축 위에 있다.

- Symbolic (logic, constraint, type)  
- Search (heuristic, stochastic)  
- Neural (LLM, learned models)  

---

그리고 실제 시스템은 항상 이 세 가지를 결합한다.

> **Neuro-Symbolic + Search**

---

### 중요한 변화

이 분야의 가장 큰 변화는 이것이다.

---

- 과거 → 사람이 코드를 작성  
- 현재 → 사람이 “의도”를 정의  

---

그리고 시스템이:

- 코드를 생성하고  
- 수정하고  
- 최적화한다  

---

즉,

> **Programming → Intent → Synthesis**

---

### 앞으로의 방향

앞으로 Program Synthesis는 더 확장될 것이다.

- LLM + formal verification 결합  
- 자동 코드 최적화  
- self-improving systems  
- end-to-end program generation  

---

이 흐름은 결국 다음으로 향한다.

> **코드를 직접 작성하지 않는 시대**

---

### 시리즈를 마치며

이 시리즈를 통해 우리는 다음을 경험했다.

- 프로그램을 탐색하는 것에서 시작해  
- 구조를 이해하고  
- 논리로 표현하며  
- 결국 프로그램을 유도하는 단계까지  

---

그리고 이제는,

> 그 모든 개념이 실제로 사용되고 있다는 것

을 확인했다.

---

### 마지막 한 줄

Program Synthesis는 더 이상 연구 주제가 아니다.

> **이미 소프트웨어 개발의 일부가 되고 있다**

---

이제 남은 것은 하나다.

> 이 기술을 이해하는 것을 넘어, 직접 활용하는 것

