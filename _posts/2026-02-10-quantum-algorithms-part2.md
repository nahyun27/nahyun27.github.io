---
layout: post
title: "[양자컴퓨터 입문 #2] 양자 알고리즘 - 어떻게 더 빠를까?"
date: 2026-02-10 14:00:00 +0900
categories: [Quantum Computing, Basics]
tags: [quantum-computing, shor-algorithm, grover-algorithm, quantum-algorithm, rsa, cryptography]
image:
  path: /assets/img/quantum/quantum-algorithms.png
  alt: Quantum Algorithms Explained
math: true
series: 양자컴퓨터 입문
---

## 들어가며

[지난 포스트]({% post_url 2024-03-09-quantum-computing-basics-part1 %})에서 큐비트의 **중첩**, **얽힘**, **간섭**이 왜 강력한지 배웠습니다. 이제 진짜 궁금한 건 이거죠:

> "그래서 실제로 얼마나 빠른데?" 🤔

오늘은 양자컴퓨터가 **고전컴퓨터를 압도하는 두 가지 알고리즘**을 알아봅니다:

1. **Shor's Algorithm** (1994): RSA 암호를 깨뜨리는 폭탄 💣
2. **Grover's Algorithm** (1996): 검색을 가속하는 마법 🔍

---

## 왜 알고리즘이 중요한가?

### 하드웨어만으론 부족하다

```
아무리 빠른 자동차(양자컴퓨터)가 있어도,
지름길(양자 알고리즘)을 모르면 소용없다.
```

**핵심**:
- 양자컴퓨터 ≠ 모든 문제에서 빠름
- **특정 문제**에서만 지수적/다항적 가속
- 알고리즘이 그 차이를 만든다!

---

### 가속의 종류

| 유형 | 설명 | 예시 |
|------|------|------|
| **지수적 가속** | $O(2^n) → O(n^3)$ | Shor's Algorithm |
| **다항적 가속** | $O(n^2) → O(n \log n)$ | (현재 발견 안 됨) |
| **2차 가속** | $O(N) → O(\sqrt{N})$ | Grover's Algorithm |
| **상수 배** | $O(N) → O(N/k)$ | (실용성 낮음) |

**의미**:
- **지수적**: 혁명적 (RSA 깨짐)
- **2차**: 유용하지만 제한적 (암호는 안전)

---

## Shor's Algorithm: 암호화의 종말? 💣

### 문제 정의: 소인수분해

**입력**: 큰 정수 $N$ (예: 15)  
**출력**: $N$의 소인수 (예: 3 × 5)

**왜 어려운가?**

```
곱셈은 쉬움:  61 × 53 = 3,233
분해는 어려움: 3,233 = ? × ?
```

**크기가 커지면**:

| 비트 수 | 숫자 예시 | 고전 컴퓨터 소요 시간 |
|---------|---------|------------------|
| 10 | 1,024 | 밀리초 |
| 100 | 2^100 | 몇 초 |
| 512 | RSA-512 | 몇 주 |
| 1024 | RSA-1024 | 수년 |
| **2048** | **RSA-2048** | **수십억 년** 🌌 |

---

### RSA 암호화: 왜 소인수분해가 중요한가?

**RSA의 원리**:

```
1. 두 큰 소수 선택: p = 61, q = 53
2. 곱해서 공개키 생성: N = p × q = 3,233
3. 암호화: 공개키(N)로 암호화
4. 복호화: 개인키(p, q)로 복호화
```

**보안 근거**:
> $N$을 알아도 $p$와 $q$를 모르면 복호화 불가!

**현실**:
- 웹사이트 HTTPS: RSA-2048
- VPN, 이메일 암호화: RSA 기반
- 전자서명: RSA 의존

---

### Shor's Algorithm의 작동 원리

**핵심 아이디어**:
> 소인수분해 → **주기 찾기 문제**로 변환!

**단계별 설명**:

#### Step 1: 고전 전처리 (Classical Reduction)

```python
# 입력: N = 15 (3 × 5 찾기)
# 1. 랜덤 정수 a 선택 (1 < a < N)
a = 7

# 2. GCD(a, N) 계산
import math
gcd = math.gcd(7, 15)  # = 1

# GCD > 1이면 즉시 인수 발견!
# GCD = 1이면 다음 단계로
```

---

#### Step 2: 양자 주기 찾기 (Quantum Period Finding)

**목표**: $a^r \equiv 1 \pmod{N}$을 만족하는 최소 $r$ (주기) 찾기

**예시**:
```
a = 7, N = 15

7^1 mod 15 = 7
7^2 mod 15 = 4
7^3 mod 15 = 13
7^4 mod 15 = 1  ← 주기 r = 4!
```

**양자 회로**:

```
|0⟩ ─ H^⊗n ─── [ a^x mod N ] ─── QFT^† ─── Measure
|0⟩ ───────────      ↑      ───────────────
                     |
              (Modular Exponentiation)
```

**과정**:
1. **중첩 생성**: $H^{\otimes n}$ → 모든 $x$를 동시에 준비
2. **모듈러 지수 계산**: $|x\rangle \rightarrow |a^x \mod N\rangle$
3. **QFT (Quantum Fourier Transform)**: 주기 추출
4. **측정**: 주기 $r$ 얻음

---

#### Step 3: 고전 후처리 (Classical Post-processing)

```python
# r = 4 (주기)
# r이 짝수인지 확인
if r % 2 == 0:
    # 인수 계산
    factor1 = math.gcd(a**(r//2) - 1, N)
    factor2 = math.gcd(a**(r//2) + 1, N)
    
    # 예시:
    # gcd(7^2 - 1, 15) = gcd(48, 15) = 3
    # gcd(7^2 + 1, 15) = gcd(50, 15) = 5
    
    print(f"{N} = {factor1} × {factor2}")
    # 출력: 15 = 3 × 5
```

---

### 복잡도 비교

**고전 알고리즘 (General Number Field Sieve)**:

$$
O\left( \exp\left( \left(\frac{64}{9}\right)^{1/3} (\log N)^{1/3} (\log \log N)^{2/3} \right) \right)
$$

→ **준지수 시간** (sub-exponential)

**Shor's Algorithm**:

$$
O\left( (\log N)^3 \right)
$$

→ **다항 시간** (polynomial)!

---

### 실제 예시: RSA-2048 깨기

**필요한 리소스**:

| 논문 | 필요 큐비트 | 소요 시간 |
|------|-----------|---------|
| Beckman et al. (1996) | 10,241 논리 큐비트 | 미정 |
| Beauregard (2003) | 4,099 논리 큐비트 | 미정 |
| Gidney & Ekerå (2021) | **20백만 물리 큐비트** | **8시간** |

**현재 상황 (2024)**:
- IBM Condor: 1,121 큐비트
- Google Willow: 105 큐비트 (하지만 에러 정정 돌파!)

**예상 타임라인**:
```
현재: 15, 21, 35 정도만 분해 가능
~2030: RSA-512 위험
~2035: RSA-2048 위험
```

---

### Shor's Algorithm의 실제 구현

**성공 사례**:

| 연도 | 팀 | 숫자 | 큐비트 | 기술 |
|------|-----|------|--------|------|
| 2001 | IBM | **15** | 7 | NMR |
| 2012 | 여러 팀 | **15** | - | Photonic, Ion trap |
| 2012 | - | **21** | - | Trapped ions |
| 2021 | IBM | **21** | 5 | Superconducting |

**주의사항**:
> 실제로는 정답을 **미리 알고** 회로를 최적화한 경우가 많음!  
> 진정한 Shor's Algorithm이라고 보기 어려움

---

## Grover's Algorithm: 검색의 가속 🔍

### 문제 정의: 비정렬 검색

**시나리오**: 전화번호부에서 번호로 이름 찾기 (비정렬)

**입력**: $N$개 항목의 데이터베이스  
**목표**: 조건을 만족하는 항목 찾기

**고전 알고리즘**:
```
최악: N번 확인 (전부 다 봐야 함)
평균: N/2번
```

**Grover's Algorithm**:
```
√N번만에 찾기!
```

---

### 2차 가속의 의미

**예시**:

| 데이터 크기 $N$ | 고전 (평균) | Grover | 가속 비율 |
|--------------|-----------|--------|---------|
| 100 | 50 | 10 | **5배** |
| 10,000 | 5,000 | 100 | **50배** |
| 1,000,000 | 500,000 | 1,000 | **500배** |
| $2^{40}$ | $2^{39}$ | $2^{20}$ | **524,288배** |

**실용성**:
- Shor만큼 **극적이진 않음**
- 하지만 **최적** (더 빠를 수 없음 증명됨!)

---

### Grover's Algorithm 작동 원리

#### 핵심 개념: Amplitude Amplification

**비유**: 바늘을 빛나게 만들기 🌟

```
전통 방법: 건초더미를 하나씩 확인
양자 방법: 바늘을 점점 더 밝게 빛나게!
```

**과정**:

```
1. 초기 상태 (균등 중첩)
   |ψ⟩ = (1/√N) Σ|x⟩
   모든 항목이 같은 확률 (1/N)

2. Oracle 적용
   "정답" 항목에 마킹 (위상 반전)
   
3. Diffusion (확산)
   마킹된 항목의 진폭 증폭
   나머지 항목 진폭 감소
   
4. 반복 (√N번)
   정답 확률 → 1에 근접
   
5. 측정
   높은 확률로 정답!
```

---

#### Oracle (오라클): 신탁의 블랙박스

**정의**:
> 정답인지 판별하는 **블랙박스 함수**

**함수 형태**:
$$
f(x) = \begin{cases}
1 & \text{if } x \text{는 정답} \\
0 & \text{otherwise}
\end{cases}
$$

**양자 Oracle**:
$$
U_f |x\rangle = (-1)^{f(x)} |x\rangle
$$

**의미**:
- 정답 $|x\rangle$: 위상 반전 (- 부호)
- 오답: 변화 없음

---

#### Diffusion Operator: 진폭 재분배

**역할**: 평균을 중심으로 반전

**수식**:
$$
D = 2|s\rangle\langle s| - I
$$

여기서 $|s\rangle = \frac{1}{\sqrt{N}} \sum |x\rangle$ (균등 중첩)

**효과**:
```
평균보다 작은 진폭 → 더 작아짐
평균보다 큰 진폭 → 더 커짐
```

**결과**:
- Oracle이 마킹한 상태: 진폭 **증가**
- 나머지 상태: 진폭 **감소**

---

### 양자 회로

**3-qubit Grover (8개 중 1개 찾기)**:

```
     ┌───┐┌─────────┐┌─────────┐     
q0: ─┤ H ├┤         ├┤         ├─ M ─
     ├───┤│         ││         │ │
q1: ─┤ H ├┤ Oracle  ├┤Diffusion├─ M ─
     ├───┤│         ││         │ │
q2: ─┤ H ├┤         ├┤         ├─ M ─
     └───┘└─────────┘└─────────┘
     
반복 횟수: π/4 × √8 ≈ 2회
```

**단계**:
1. **H 게이트**: 균등 중첩 생성
2. **Oracle**: 정답 마킹
3. **Diffusion**: 진폭 증폭
4. **반복**: √N번
5. **측정**: 정답 획득

---

### 최적 반복 횟수

**이론**:
$$
R \approx \frac{\pi}{4} \sqrt{\frac{N}{M}}
$$

여기서:
- $N$: 전체 항목 수
- $M$: 정답 개수

**예시**:

| $N$ | $M$ | 최적 반복 $R$ |
|-----|-----|------------|
| 4 | 1 | 1 |
| 16 | 1 | 3 |
| 100 | 1 | 8 |
| 1,000 | 1 | 25 |

**주의**:
- 너무 적게 → 정답 확률 낮음
- 너무 많이 → 정답 확률 다시 낮아짐!

---

### 기하학적 이해

**2D 평면 시각화**:

```
        |good⟩ (정답 상태)
             ↑
             │   θ
             │  ╱
             │ ╱
             │╱______ → |bad⟩ (오답 상태)
             
초기 상태: θ ≈ 0 (|bad⟩에 가까움)
각 반복: θ 증가
최종: θ ≈ 90° (|good⟩에 도달)
```

**회전 각도**:
- 1회 반복 = 2θ 회전
- 최적 반복 = 90° 도달

---

## 실제 응용: 양자 알고리즘은 어디에 쓰일까?

### Shor's Algorithm 응용

**1. 암호 해독** 💔:
```
RSA, ECC, Diffie-Hellman → 모두 위험!
```

**2. 수학 문제**:
- Discrete Logarithm Problem
- Hidden Subgroup Problem

**3. 파급 효과**:
- Post-Quantum Cryptography 개발 촉진
- 양자 키 분배 (QKD) 연구 가속

---

### Grover's Algorithm 응용

**1. 데이터베이스 검색** 🔍:
```
비정렬 DB에서 특정 항목 찾기
```

**2. 최적화 문제**:
- 여행 외판원 문제 (TSP)
- 조합 최적화
- SAT Solving

**3. 암호 분석**:
```
AES-128: 128비트 → 실효 64비트 (안전!)
AES-256: 256비트 → 실효 128비트 (여전히 안전)
```

**대칭키 암호는 살아남는다**:
- 키 길이 2배로 늘리면 됨
- AES-256 → 양자 컴퓨터에도 안전

---

**4. 양자 화학**:
- 분자 구조 탐색
- 반응 경로 찾기

**5. 머신러닝**:
- Feature selection
- Clustering

---

## 한계와 도전 과제

### Shor's Algorithm

**1. 큐비트 요구량**:
```
RSA-2048: 20백만 물리 큐비트 필요
현재: ~1,000 큐비트
차이: 20,000배!
```

**2. 에러율**:
```
필요: 10^-10 이하
현재: 10^-3
차이: 10,000,000배!
```

**3. Decoherence Time**:
```
필요: 수 시간 계산
현재: 수 밀리초 유지
```

---

### Grover's Algorithm

**1. 2차 가속의 한계**:
```
N = 10^6
고전: 500,000회
양자: 1,000회

여전히 1,000회는 많음!
```

**2. Oracle 구현 비용**:
```
Oracle 자체가 복잡하면 → 이득 상쇄
```

**3. 에러 누적**:
```
반복 횟수 √N → 에러 누적 위험
```

**4. 실용성**:
```
고전 컴퓨터 클럭: GHz
양자 컴퓨터 게이트: kHz~MHz

2차 가속으로는 속도 차이 극복 어려움
```

---

## 두 알고리즘 비교

| 항목 | Shor's | Grover's |
|------|--------|----------|
| **발표** | 1994 | 1996 |
| **가속** | 지수적 ($2^n → n^3$) | 2차 ($N → \sqrt{N}$) |
| **문제** | 소인수분해 | 비정렬 검색 |
| **응용** | RSA 깨기 | 검색, 최적화 |
| **최적성** | 모름 | **증명됨** (더 빠를 수 없음) |
| **큐비트** | $O(\log N)$ | $O(\log N)$ |
| **깊이** | $O((\log N)^3)$ | $O(\sqrt{N})$ |
| **실용화** | 먼 미래 (~2035) | 더 먼 미래 |
| **임팩트** | 암호화 혁명 | 점진적 개선 |

---

## 다른 양자 알고리즘들 (간략 소개)

### 1. VQE (Variational Quantum Eigensolver)

**목적**: 분자의 바닥 상태 에너지 찾기

**특징**:
- NISQ 시대에 실용 가능!
- 화학, 재료 과학에 응용

**응용**:
```
신약 개발, 배터리 재료, 촉매 설계
```

---

### 2. QAOA (Quantum Approximate Optimization Algorithm)

**목적**: 조합 최적화 문제 근사 해

**특징**:
- NP-hard 문제 공략
- 하이브리드 (양자 + 고전)

**응용**:
```
물류 최적화, 스케줄링, 포트폴리오 최적화
```

---

### 3. Quantum Simulation

**목적**: 양자 시스템 시뮬레이션

**파인만의 말**:
> "Nature isn't classical, dammit, and if you want to make a simulation of nature, you'd better make it quantum mechanical."

**응용**:
```
고온 초전도체, 양자 재료, 복잡계
```

---

## 양자 알고리즘 개발의 미래

### 현재 연구 방향

**1. Error-Tolerant Algorithms**:
- 에러에 강한 알고리즘 설계
- Variational 접근법

**2. Hybrid Algorithms**:
- 양자 + 고전 협력
- VQE, QAOA 계열

**3. Near-Term Applications**:
- NISQ 시대에 실용 가능한 문제 탐색
- 양자 이점 입증

---

### 도전 과제

**1. Killer App 찾기**:
```
Shor 이후 30년... 또 다른 혁명적 알고리즘은?
```

**2. 실용적 이점**:
```
이론상 빠름 ≠ 실제 빠름
오버헤드, 에러, 속도 차이 고려
```

**3. Algorithm-Hardware Co-Design**:
```
하드웨어에 맞는 알고리즘
알고리즘에 맞는 하드웨어
```

---

## 정리: 핵심만 기억하자!

### Shor's Algorithm

✅ **목적**: 소인수분해 (RSA 깨기)  
✅ **가속**: 지수적 (준지수 → 다항)  
✅ **핵심**: 양자 주기 찾기 + QFT  
✅ **임팩트**: 암호화 패러다임 전환  
✅ **현실**: 2030년대 위협 예상

---

### Grover's Algorithm

✅ **목적**: 비정렬 검색  
✅ **가속**: 2차 ($N → \sqrt{N}$)  
✅ **핵심**: 진폭 증폭  
✅ **최적성**: 증명됨 (더 빠를 수 없음)  
✅ **현실**: 대칭키 암호는 안전 (키 2배)

---

### 양자 알고리즘의 교훈

**1. 만능이 아니다**:
```
특정 문제에서만 가속
범용 가속 알고리즘은 없음
```

**2. 가속 ≠ 실용**:
```
이론적 가속도 중요
실제 구현 가능성도 중요
```

**3. 새로운 사고방식**:
```
고전 알고리즘의 양자화 X
양자 고유의 접근법 필요
```

---

## 다음 시간에는...

이번 글에서는 **양자 알고리즘**의 양대산맥을 배웠습니다.

**다음 포스트 예고** 🎬:

📌 **#3: 양자컴퓨터와 보안 - RSA는 끝났나?**
- Post-Quantum Cryptography (PQC)
- 양자 키 분배 (QKD)
- Store Now, Decrypt Later 위협
- NIST 표준화 현황
- 실제 대응 방안

---

## 더 알아보기

### 실습 리소스

**Qiskit (IBM)**:
```python
from qiskit import QuantumCircuit
from qiskit.algorithms import Grover

# Grover 알고리즘 실습
oracle = ...
grover = Grover(oracle)
result = grover.run()
```

**온라인 실습**:
- [IBM Quantum Composer](https://quantum.ibm.com/composer)
- [IBM Quantum Learning - Shor's Algorithm](https://learning.quantum.ibm.com/tutorial/shors-algorithm)
- [IBM Quantum Learning - Grover's Algorithm](https://learning.quantum.ibm.com/tutorial/grovers-algorithm)

---

### 추천 자료

**논문**:
- Shor (1994): "Algorithms for Quantum Computation: Discrete Logarithms and Factoring"
- Grover (1996): "A Fast Quantum Mechanical Algorithm for Database Search"

**강의**:
- [Qiskit Textbook](https://qiskit.org/textbook/)
- [Microsoft Quantum Documentation](https://quantum.microsoft.com/)

**책**:
- "Quantum Computation and Quantum Information" (Nielsen & Chuang) - 바이블!

---

**태그**: `#양자알고리즘` `#Shor알고리즘` `#Grover알고리즘` `#RSA` `#양자암호`
