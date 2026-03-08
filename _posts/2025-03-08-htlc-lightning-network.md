---
layout: post
title: "HTLC: 라이트닝 네트워크의 핵심 메커니즘 완벽 이해"
date: 2025-03-08 14:00:00 +0900
categories: [Blockchain, Lightning Network]
tags: [blockchain, bitcoin, lightning-network, htlc, smart-contract]
image:
  path: /assets/img/posts/htlc/htlc-cover.png
  alt: HTLC Hash Time Locked Contract
---


## 들어가며

비트코인 **라이트닝 네트워크(Lightning Network)**를 공부하다 보면  
반드시 등장하는 개념이 있습니다.

바로 **HTLC (Hash Time Locked Contract)** 입니다.

처음 보면 이름도 어렵고 구조도 복잡해 보입니다.  
하지만 사실 핵심 아이디어는 생각보다 단순합니다.

> **조건이 맞으면 돈을 지급하고, 조건이 맞지 않으면 환불한다.**

이 단순한 원칙을 이용해서  
라이트닝 네트워크는 **중간 노드를 신뢰하지 않아도 안전한 결제**를 가능하게 합니다.

이번 글에서는

- HTLC가 왜 필요한지
- HTLC가 무엇인지
- 실제로 어떻게 동작하는지

를 **차근차근 이해해보겠습니다.**

---

# 1. Multi-hop Payment의 문제
라이트닝 네트워크의 핵심 아이디어는 **직접 채널이 없어도 중간 노드를 통해 돈을 보낼 수 있다**는 것입니다.

예를 들어 이런 상황이 있습니다.

![Multi-hop Payment](/assets/img/posts/htlc/htlc-slide-3.png)
_Bob을 통한 Multi-hop Payment_

Alice와 Charlie 사이에 직접 채널은 없지만, Bob을 통해 거래할 수 있습니다.  
이것을 **Multi-hop Payment**라고 합니다.

즉,

- Alice → Bob
- Bob → Charlie

이 두 개의 채널을 이용해서 Alice가 Charlie에게 돈을 보낼 수 있습니다.


### 그런데 문제가 있습니다 🤔

여기서 자연스럽게 이런 의문이 생깁니다.

> "Bob을 믿을 수 있을까?"

![Problem](/assets/img/posts/htlc/htlc-slide-4.png)
_신뢰 문제_

만약 Bob이

1. Alice에게 돈을 받고
2. Charlie에게는 보내지 않는다면?

Alice는 돈을 잃게 됩니다.

이 문제를 해결하기 위해 등장한 것이 바로

> **HTLC (Hash Time Locked Contract)** 입니다.

---

## 2. HTLC란 무엇인가?

**HTLC (Hash Time Locked Contract)**는 두 가지 메커니즘을 결합한 조건부 결제 방식입니다.

![HTLC Definition](/assets/img/posts/htlc/htlc-slide-5.png)
_HTLC의 정의_


### 🔑 Hash Lock (해시 잠금)

특정 **pre-image**를 알아야만 자금을 가져갈 수 있는 조건입니다.

쉽게 말하면

> "정답을 맞춰야 돈을 가져갈 수 있는 금고"

라고 생각하면 됩니다.

### ⏰ Time Lock (시간 잠금)

일정 시간이 지나면  
**송신자가 돈을 다시 가져갈 수 있는 장치**입니다.

> "정해진 시간 안에 조건이 충족되지 않으면 자동 환불"

---
### 핵심 아이디어

두 조건을 합치면 이런 구조가 됩니다.


조건 충족 → 돈 지급
시간 초과 → 돈 환불


이 구조 덕분에 **중간 노드를 신뢰하지 않아도 되는 결제 시스템**이 만들어집니다.

---

## 3. Pre-image 이해하기

HTLC를 이해하려면 먼저 **pre-image**가 뭔지 알아야 합니다.

![Pre-image](/assets/img/posts/htlc/htlc-slide-6.png)
_복권 비유로 이해하는 Pre-image_

### 복권 비유 🎫

- **Pre-image (S)**: 당첨 복권 원본 (Charlie만 가지고 있음)
- **Hash (H)**: 당첨 번호만 공개 (모두가 볼 수 있음)

**중요한 특징**: 아시다시피 해시 함수는 **일방향**입니다. 당첨 번호(H)로는 원본 복권(S)을 만들 수 없어요!


### Pre-image의 3가지 역할

1. **🔑 비밀 열쇠**: 보여주면 돈을 수령할 수 있는 증명
2. **⚡ 연쇄 반응**: Charlie → Bob → Alice 순으로 전파됨
3. **🎯 소유권**: Charlie만 원본 보유, Alice는 번호만 알고 있음

---

## 4. HTLC 작동 과정 (성공 시나리오)

이제 본격적으로 HTLC가 어떻게 작동하는지 단계별로 살펴보겠습니다.

### Step 1: Pre-image 생성

![Step 1](/assets/img/posts/htlc/htlc-slide-8.png)
_Charlie가 Pre-image 생성_

**초기 상황**: Alice는 Bob을 통해 Charlie에게 1 BTC를 보내고 싶습니다.

```
1. Charlie가 랜덤 시크릿 S 생성
   S = "mysecret123"

2. S의 해시값 H 계산
   H = hash(S) = "a1b2c3..."

3. Charlie가 H를 Alice에게 전송
   ✅ Alice는 H만 알고, S는 모름
```

> **핵심**: 돈을 받을 Charlie가 pre-image를 생성합니다!

---

### Step 2: Alice-Bob HTLC 설정

![Step 2](/assets/img/posts/htlc/htlc-slide-9.png)
_Alice-Bob 채널의 HTLC_

Alice가 Bob에게 제안합니다:

```
Alice: 3 BTC
Bob: 5 BTC
HTLC: 2 BTC (Lock-up)
```

**HTLC 조건**:
- ✅ **Path 1 (Hash Lock)**: Bob이 pre-image 제공하면 청구 가능
- ⏰ **Path 2 (Time Lock)**: 100블록 후 Alice가 회수

**Bob의 입장**:
- 손실 위험 없음 (timeout되면 Alice가 회수)
- 성공하면 라우팅 수수료 1 BTC 획득!

---

### Step 3: Bob-Charlie HTLC 설정

![Step 3](/assets/img/posts/htlc/htlc-slide-10.png)
_Bob-Charlie 채널의 HTLC_

Bob도 같은 방식으로 Charlie에게 HTLC를 제안합니다:

```
Bob: 4 BTC
Charlie: 5 BTC
HTLC: 1 BTC (Lock-up)
```

**HTLC 조건**:
- ✅ **Path 1**: Charlie가 pre-image 제공하면 청구
- ⏰ **Path 2**: 50블록 후 Bob이 회수

여기서 매우 중요한 조건이 있습니다.

![Timeline](/assets/img/posts/htlc/htlc-slide-11.png)
_타임락 시간차_

```
cltv_expiry_BC < cltv_expiry_AB
    50블록    <    100블록
```
이 **시간차가 반드시 필요합니다.**


왜냐하면
- Bob이 Charlie로부터 pre-image를 받고
- Alice에게 전달할 시간을 확보하기 위함입니다!

---

### Step 4: Pre-image 공개 (역순 전파)

![Step 4-1](/assets/img/posts/htlc/htlc-slide-12.png)
_Charlie → Bob으로 Pre-image 공개_

**1. Charlie → Bob**
- Charlie가 pre-image S를 Bob에게 공개
- Bob-Charlie 채널 상태 업데이트: Charlie 6 BTC

![Step 4-2](/assets/img/posts/htlc/htlc-slide-13.png)
_Bob → Alice로 Pre-image 전파_

**2. Bob → Alice**
- Bob이 S를 Alice에게 공개
- Alice-Bob 채널 상태 업데이트: Bob 7 BTC

✅ **모든 HTLC 해소, 채널 상태 업데이트 완료!**

> **중요**: Pre-image는 **역순(Charlie → Bob → Alice)**으로 전파됩니다.

---

### Step 5: 최종 상태

![Final](/assets/img/posts/htlc/htlc-slide-14.png)
_최종 결과_

**✅ 결제 완료!**

```
Alice: 5 BTC → 3 BTC  (-2 BTC: 결제 1 BTC + 수수료 1 BTC)
Bob:   10 BTC → 11 BTC (+1 BTC: 라우팅 수수료)
Charlie: 5 BTC → 6 BTC (+1 BTC: 결제금)
```

**결과 분석**:
- Alice는 Charlie에게 1 BTC를 성공적으로 전송
- Bob은 중간 노드 역할로 1 BTC 수수료 획득
- 🎯 **Multi-hop payment 성공!**

---

## 5. 실패 시나리오 (Timeout 처리)

만약 Charlie가 응답하지 않으면 어떻게 될까요?

![Fail 1](/assets/img/posts/htlc/htlc-slide-15.png)
_Bob-Charlie 채널 timeout_

### Step 1: Bob-Charlie 채널 timeout
- Bob이 commitment transaction 브로드캐스트
- 50블록 도달 시 time-locked path로 회수

![Fail 2](/assets/img/posts/htlc/htlc-slide-16.png)
_Alice-Bob 채널 timeout_

### Step 2: Alice-Bob 채널도 timeout
- Bob이 Charlie로부터 자금 회수 후
- Alice에게도 환불

![Fail 3](/assets/img/posts/htlc/htlc-slide-17.png)
_원상 복구_

### Step 3: 원상 복구 ✅
```
최종 상태:
Alice: 5 BTC
Bob: 10 BTC (5+5)
Charlie: 5 BTC
```

> **핵심**: 최악의 경우에도 원래 자금을 안전하게 회수할 수 있습니다!

---

## 6. HTLC의 장점

![Summary](/assets/img/posts/htlc/htlc-slide-18.png)
_HTLC 핵심 요약_

### 💡 HTLC가 제공하는 가치

✅ **신뢰 불필요**: 중간 노드를 신뢰하지 않아도 됨  
✅ **자금 안전성**: 최악의 경우에도 원래 자금 회수 가능  
✅ **확장성**: 여러 홉을 거친 결제 가능  
✅ **인센티브**: 라우팅 수수료로 참여 유도  

### 🔒 Time Lock의 중요성

```
cltv_expiry_BC < cltv_expiry_AB
```

이 시간차 덕분에:
- Bob이 pre-image를 받고 전달할 시간 확보
- 공정한 시스템 운영 가능

---

## 7. 기술적 구현 (심화)

여기서부터는 조금 더 기술적인 내용입니다. HTLC가 실제로 어떻게 구현되는지 알아볼게요.

### Commitment Transaction의 비대칭성

![Tech](/assets/img/posts/htlc/htlc-slide-19.png)
_기술적 구현 개요_

**핵심 원칙**: 
> 자신에게 가는 output은 항상 `to_self_delay` 적용

**역할 구분**:
- **HTLC Offerer (Alice)**: timeout 시 → **HTLC-timeout tx** 사용
- **HTLC Receiver (Bob)**: 성공 시 → **HTLC-success tx** 사용

---

### Alice의 Commitment Transaction

![Alice Tx](/assets/img/posts/htlc/htlc-slide-20.png)
_Alice의 Commitment Tx 구조_

**3개의 Output**:
1. **Bob 5 BTC** (즉시 사용 가능)
2. **Alice 3 BTC** (to_self_delay 후 사용 가능)
3. **HTLC 2 BTC** (조건부)

**HTLC output의 3가지 경로**:
- ✅ Bob이 pre-image 제공 시 (정상 작동)
- ⏰ HTLC-timeout tx로 Alice 회수 (실패 시)
- 🔑 Bob의 revocation key (패널티)

---

### HTLC-timeout Transaction

![Timeout Tx](/assets/img/posts/htlc/htlc-slide-21.png)
_HTLC-timeout Transaction_

**⚠️ 문제점**: 
두 타임락(cltv_expiry + to_self_delay) 모두 적용하면 Bob에게 너무 많은 시간이 주어짐

**✅ 해결책**: 
별도의 HTLC-timeout transaction 생성!

```
nLockTime = cltv_expiry  (예: 100블록)
output에 to_self_delay 적용 (예: 1000블록)
```

**결과**:
- Alice: 100블록 기다린 후 tx 올리고, 다시 1000블록 후 회수
- Bob: revocation key 있으면 즉시 패널티

---

### Bob의 Commitment Transaction

![Bob Tx](/assets/img/posts/htlc/htlc-slide-22.png)
_Bob의 Commitment Tx 구조_

**3개의 Output**:
1. **Alice 3 BTC** (즉시)
2. **Bob 5 BTC** (to_self_delay 후)
3. **HTLC 2 BTC** (조건부)

**HTLC output의 3가지 경로**:
- ✅ HTLC-success tx로 Bob 청구 (정상 작동)
- ⏰ Alice가 cltv_expiry 후 회수 (실패 시)
- 🔑 Alice의 revocation key (패널티)

---

### HTLC-success Transaction

![Success Tx](/assets/img/posts/htlc/htlc-slide-23.png)
_HTLC-success Transaction_

**⚠️ 문제점**: 
Bob이 to_self_delay 기다리는 동안 Alice가 먼저 timeout으로 청구할 수 있음

**✅ 해결책**: 
즉시 올릴 수 있는 HTLC-success transaction!

```
nLockTime = 0  (즉시 브로드캐스트 가능!)
output에 to_self_delay 적용
```

**결과**:
- Bob: pre-image 받자마자 즉시 success tx 올려서 권리 확보
- 그 다음 to_self_delay 기다린 후 최종 수령

---

### 전체 구조 종합

![Structure](/assets/img/posts/htlc/htlc-slide-24.png)
_전체 구조_

**핵심 차이점**:
- Alice는 HTLC offerer → **HTLC-timeout tx** 사용
- Bob은 HTLC receiver → **HTLC-success tx** 사용

**비대칭적 구조의 이점**:
1. 오래된 state 악용 시 패널티
2. 각자의 역할에 맞게 HTLC 처리
3. 시간 조건들이 서로 충돌하지 않음

---

## 8. Bitcoin Script 구현

실제로 이런 조건들이 어떻게 구현될까요? **Bitcoin Script**를 사용합니다!

![Script](/assets/img/posts/htlc/htlc-slide-25.png)
_Bitcoin Script 구조_

### Alice의 HTLC Output 경로

1. **Revocation path** - 패널티
2. **HTLC-timeout path** - Alice timeout 회수
3. **Hash-locked path** - Bob pre-image 청구

### Bob의 HTLC Output 경로

1. **Revocation path** - 패널티
2. **HTLC-success path** - Bob pre-image 청구
3. **Time-locked path** - Alice timeout 회수

### 핵심 OP Code

- `OP_HASH160`: pre-image 해시 검증
- `OP_EQUALVERIFY`: 값 일치 확인
- `OP_CHECKSIG`: 서명 검증
- `OP_CHECKLOCKTIMEVERIFY`: 절대 시간 체크 (cltv_expiry)
- `OP_CHECKSEQUENCEVERIFY`: 상대 시간 체크 (to_self_delay)
- `OP_CHECKMULTISIG`: 다중 서명 검증

---

### 실제 코드 예시

![Code](/assets/img/posts/htlc/htlc-slide-26.png)
_실제 Bitcoin Script 코드_

**왼쪽: Bob의 commitment tx HTLC output**
- 3가지 경로 (Revocation / HTLC-success / Time-locked)

**오른쪽: HTLC-timeout tx output**
- 2가지 경로 (Revocation / to_self_delay)

> **핵심**: IF-ELSE 구조로 여러 경로를 만들고, 각 경로마다 조건을 체크합니다!

---

## 9. 자주 오해하는 부분

### Q: 정상 거래에도 commitment transaction을 블록체인에 올리나요?

**A: 아니요! 올리지 않습니다.**

```
✅ 정상 작동 시:
- 오프체인에서만 채널 상태 업데이트
- 블록체인 사용 0번!

❌ 분쟁/실패 시에만:
- Commitment transaction을 블록체인에 올림
```

**HTLC의 진짜 의미**:
- Commitment transaction은 "만약을 위한 보험" 💼
- 정상 작동하면 서명만 교환하고 블록체인 안 씀
- 문제 생길 때만 블록체인의 힘을 빌림

> 이게 바로 라이트닝 네트워크가 빠르고 저렴한 이유입니다.

---

## 마치며

HTLC는 처음 보면 복잡하지만  
핵심 아이디어는 의외로 단순합니다.

> **"조건 맞으면 돈 줘, 안 맞으면 환불"**

이 단순한 원칙을 **Hash Lock**과 **Time Lock**으로 구현해서:
- 중간 노드를 신뢰하지 않아도 되고
- 실패해도 안전하게 환불받을 수 있는

**신뢰 없는 결제 시스템** 을 만들어낸 것이 바로 **HTLC**입니다.

단순한 아이디어를 정교하게 구현해냈다는 점에서  
가히 라이트닝 **네트워크의 꽃**이라고 불릴 만 한 매커니즘이라는 생각이 듭니다..

---

## 참고 자료

- https://ellemouton.com/posts/htlc/
- https://ellemouton.com/posts/htlc-deep-dive/

---

**태그**: `#blockchain` `#bitcoin` `#lightning-network` `#htlc` `#smart-contract`
