---
layout: post
title: "[운영체제 Deep Dive #4] Virtual Memory 완전 정복 - Page Table과 MMU의 동작"
date: 2024-03-14 14:00:00 +0900
categories: [Operating System, Memory]
tags: [operating-system, linux, virtual-memory, page-table, tlb, copy-on-write, mmu]
description: "운영체제 Deep Dive #4 – Virtual Memory: 페이지 테이블, 페이지 폴트, Copy-on-Write, 메모리 매핑 심화."
image:
  path: /assets/img/os/virtual-memory.png
  alt: Virtual Memory and Paging
math: false
series: 운영체제 Deep Dive
---

## 들어가며

[Part 3]({% post_url 2024-03-13-os-shared-memory-part3 %})에서는 **Shared Memory**를 살펴봤습니다.  
여러 프로세스가 **같은 물리 메모리를 직접 공유**하여 데이터를 빠르게 교환하는 IPC 방식이었죠.

그런데 여기서 자연스럽게 한 가지 질문이 생깁니다.

> 서로 다른 프로세스가 **같은 물리 메모리**를 어떻게 공유할 수 있을까요?

각 프로세스는 보통 **서로 독립적인 주소 공간**을 가지고 있습니다.  
Process A의 `0x1000` 주소와 Process B의 `0x1000` 주소는 실제로는 **완전히 다른 메모리**를 가리키는 것이 일반적입니다.

하지만 Shared Memory에서는 이런 일이 가능합니다.

~~~
Process A: VA 0x1000
Process B: VA 0x5000
                ↓
        Physical Memory 0xABCD
~~~

즉, **서로 다른 가상 주소가 같은 물리 메모리를 가리키는 것**입니다.

이것을 가능하게 만드는 것이 바로 **Virtual Memory(가상 메모리)** 입니다.

가상 메모리는 현대 운영체제의 핵심 메커니즘으로, 다음과 같은 일을 가능하게 합니다.

- 각 프로세스에게 **독립적인 주소 공간 제공**
- 실제 RAM보다 **더 큰 메모리 공간처럼 사용**
- 프로세스 간 **메모리 보호**
- `fork()`에서 사용하는 **Copy-on-Write**
- `mmap()` 기반 **Memory-Mapped I/O**

이번 글에서는 Virtual Memory가 어떻게 동작하는지 **운영체제 내부 관점**에서 살펴봅니다.

특히 다음 내용을 중심으로 다룰 예정입니다.

~~~
1. Virtual Address vs Physical Address
2. Page Table 구조 (4-level paging)
3. MMU와 주소 변환 과정
4. TLB (속도 최적화)
5. Page Fault 처리
6. Copy-on-Write
7. mmap과 Memory-Mapped I/O
~~~

이 글을 읽고 나면 다음 질문에 답할 수 있게 됩니다.

- 프로그램이 사용하는 주소는 **왜 항상 0x400000 같은 값일까?**
- `malloc()`은 **왜 즉시 메모리를 할당하지 않을까?**
- `fork()`는 **왜 생각보다 빠를까?**
- `mmap()`은 **어떻게 파일을 메모리처럼 사용할까?**

---

## Virtual Memory란?

현대 운영체제에서 **프로세스는 실제 물리 메모리를 직접 사용하지 않습니다.**

대신 각 프로세스는 **Virtual Address Space(가상 주소 공간)** 을 사용합니다.

즉 프로그램이 보는 메모리는 실제 RAM이 아니라 **가상 주소(Virtual Address)** 입니다.

예를 들어 프로그램 내부에서 이런 코드가 있다고 해봅시다.

~~~
int x = 10;
printf("%p\n", &x);
~~~

출력은 보통 이런 식입니다.

~~~
0x7ffd3a8c1b2c
~~~

하지만 이 주소는 **실제 RAM 주소가 아닙니다.**

이것은 **Virtual Address** 입니다.

실제 하드웨어 메모리는 다음과 같이 존재합니다.

~~~
Physical Memory (RAM)

0x00000000
0x00001000
0x00002000
...
0x7fffffff
~~~

운영체제는 프로그램이 사용하는 **Virtual Address**를  
실제 **Physical Address**로 변환해줍니다.

이 변환 과정은 다음과 같이 이루어집니다.

~~~
Virtual Address
      ↓
Page Table
      ↓
Physical Address
~~~

이 작업을 담당하는 하드웨어가 바로 **MMU (Memory Management Unit)** 입니다.

---

### 왜 Virtual Memory가 필요할까?

Virtual Memory는 단순한 추상화가 아니라 **운영체제의 핵심 기능**을 가능하게 합니다.

대표적으로 다음과 같은 기능들이 있습니다.

#### 1️⃣ 프로세스 메모리 격리

각 프로세스는 **자신만의 독립적인 주소 공간**을 가집니다.

~~~
Process A
0x400000 → code
0x600000 → heap

Process B
0x400000 → code
0x600000 → heap
~~~

같은 주소를 사용하지만 실제로는 **다른 물리 메모리**를 가리킵니다.

그래서 한 프로세스가 다른 프로세스의 메모리를 **침범할 수 없습니다.**

---

#### 2️⃣ 실제 RAM보다 큰 메모리 사용

예를 들어 RAM이 **8GB**인 시스템에서도 프로그램은 더 큰 메모리를 사용할 수 있습니다.

~~~
Program allocates: 16GB
Physical RAM:      8GB
~~~

부족한 메모리는 디스크의 **Swap 공간**을 사용하여 관리합니다.

---

#### 3️⃣ Lazy Allocation

흥미로운 점은 `malloc()`이 **즉시 메모리를 할당하지 않는다는 것**입니다.

~~~
void *ptr = malloc(1ULL * 1024 * 1024 * 1024); // 1GB
~~~

이 코드는 보통 **즉시 성공합니다.**

하지만 실제 RAM은 **아직 할당되지 않았습니다.**

실제 메모리는 **처음 접근할 때** 할당됩니다.

~~~
ptr[0] = 1;
        ↑
    Page Fault 발생
        ↑
    OS가 실제 페이지 할당
~~~

이것을 **Demand Paging**이라고 합니다.

---

### Virtual Address 공간 구조

Linux의 일반적인 64-bit 프로세스 메모리 구조는 다음과 같습니다.

~~~
High Address
+--------------------+
| Kernel Space       |
+--------------------+
| Stack              |
|        ↓           |
|                    |
| Memory Mapping     |
| (mmap)             |
|                    |
| Heap               |
|        ↑           |
+--------------------+
| Data               |
+--------------------+
| Text (Code)        |
+--------------------+
Low Address
~~~

각 영역의 역할은 다음과 같습니다.

**Text**: 프로그램 코드, 읽기 전용

**Data**: 전역 변수, 정적 변수

**Heap**: malloc / new 로 할당, 위쪽으로 증가

**Stack**: 함수 호출, 지역 변수, 아래쪽으로 증가

---

하지만 여기서 중요한 질문이 하나 생깁니다.

> Virtual Address는 **어떻게 Physical Address로 변환될까요?**

이 변환을 담당하는 핵심 구조가 바로 **Page Table** 입니다.

---

## Page Table: 가상 주소 → 물리 주소 변환

앞에서 보았듯이 프로그램이 사용하는 주소는 **Virtual Address**입니다.

하지만 실제 RAM은 **Physical Address**로 구성되어 있습니다.

그렇다면 CPU는 어떻게 이 주소를 변환할까요?

핵심은 바로 **Page Table** 입니다.

---

## 메모리를 페이지로 나누기

Virtual Memory 시스템에서는 메모리를 **고정된 크기의 블록**으로 나눕니다.

이 블록을 **Page**라고 합니다.

Linux에서 일반적인 페이지 크기는 다음과 같습니다.

~~~
Page Size = 4KB (4096 bytes)
~~~

그래서 메모리는 다음과 같이 나뉩니다.

~~~
Virtual Memory

+--------+--------+--------+--------+
| Page 0 | Page 1 | Page 2 | Page 3 |
+--------+--------+--------+--------+

Physical Memory

+--------+--------+--------+--------+
|Frame 5 |Frame 2 |Frame 9 |Frame 1 |
+--------+--------+--------+--------+
~~~

여기서 중요한 점은 다음입니다.

> **Virtual Page와 Physical Frame은 1:1로 매핑됩니다.**

이 매핑 정보를 저장하는 것이 바로 **Page Table**입니다.

---

## Page Table 구조

Page Table은 **Virtual Page → Physical Frame** 매핑 정보를 저장합니다.

예를 들어 다음과 같은 Page Table이 있다고 해봅시다.

~~~
Virtual Page   Physical Frame
-----------    --------------
0              5
1              2
2              9
3              1
~~~

이 의미는 다음과 같습니다.

~~~
Virtual Page 0 → Physical Frame 5
Virtual Page 1 → Physical Frame 2
Virtual Page 2 → Physical Frame 9
Virtual Page 3 → Physical Frame 1
~~~

즉 프로그램이 사용하는 주소가

~~~
Virtual Address = 0x1234
~~~

라면 내부적으로 다음과 같은 과정이 일어납니다.

~~~
Virtual Address
      ↓
Page Number + Offset
      ↓
Page Table lookup
      ↓
Physical Frame + Offset
      ↓
Physical Address
~~~

---

## 주소 분해 과정

Virtual Address는 두 부분으로 나뉩니다.

~~~
[ Page Number | Offset ]
~~~

예를 들어 **페이지 크기가 4KB**라면 다음과 같습니다.

~~~
Page Size = 4096 bytes = 2^12
~~~

즉 **Offset은 12비트**가 됩니다.

그래서 48-bit Virtual Address의 구조는 다음과 같습니다.

~~~
| Page Number | Offset |
|    36 bits  | 12 bits|
~~~

여기서 중요한 점은 다음입니다.

- **Offset은 페이지 내부 위치**
- Page Table 변환에서는 **Offset이 변하지 않습니다**

즉 주소 변환은 다음과 같이 이루어집니다.

~~~
Physical Address
    =
Physical Frame + Offset
~~~

---

## 예시

다음과 같은 주소가 있다고 가정해봅시다.

~~~
Virtual Address = 0x1234
Page Size       = 4KB
~~~

주소를 분해하면 다음과 같습니다.

~~~
Page Number = 0x1
Offset      = 0x234
~~~

이제 Page Table을 조회합니다.

~~~
Page Table

Page 0 → Frame 5
Page 1 → Frame 7
Page 2 → Frame 3
~~~

따라서 변환 결과는 다음과 같습니다.

~~~
Page 1 → Frame 7
~~~

최종 Physical Address는

~~~
Physical Address = Frame7 + 0x234
~~~

이 과정은 프로그램이 직접 하는 것이 아니라  
**CPU 내부의 MMU(Memory Management Unit)** 가 자동으로 수행합니다.

---

하지만 여기서 중요한 문제가 하나 발생합니다.

> Virtual Address가 매우 크다면 Page Table은 얼마나 커질까요?

예를 들어 다음과 같은 시스템을 생각해봅시다.

~~~
Virtual Address = 48 bits
Page Size       = 4KB
~~~

그러면 페이지 개수는 다음과 같습니다.

~~~
2^(48-12) = 2^36 pages
~~~

즉 Page Table만 해도 **수십 GB 크기**가 필요합니다.

이 문제를 해결하기 위해 현대 운영체제는  
**Multi-Level Page Table** 구조를 사용합니다.

---

## 4-Level Page Table (Linux Paging 구조)

앞에서 보았듯이 단순한 Page Table을 사용하면 문제가 발생합니다.

예를 들어 다음과 같은 시스템을 생각해봅시다.

~~~
Virtual Address = 48 bits
Page Size       = 4KB
~~~

페이지 수는 다음과 같습니다.

~~~
2^(48 - 12) = 2^36 pages
~~~

즉 Page Table 엔트리가 **2^36개** 필요합니다.

엔트리 하나가 8 bytes라고 가정하면

~~~
2^36 × 8 bytes = 512GB
~~~

Page Table만 **512GB**가 필요합니다.

물리 메모리보다 더 큰 구조가 필요한 셈입니다.

그래서 현대 운영체제는 **Multi-Level Page Table**을 사용합니다.

Linux에서는 일반적으로 **4-Level Paging** 구조를 사용합니다.

---

## 48-bit Virtual Address 구조

Linux x86-64에서 Virtual Address는 다음과 같이 나뉩니다.

~~~
| PGD | PUD | PMD | PTE | Offset |
| 9b  | 9b  | 9b  | 9b  | 12b   |
~~~

각 필드의 의미는 다음과 같습니다.

**PGD**: Page Global Directory

**PUD**: Page Upper Directory

**PMD**: Page Middle Directory

**PTE**: Page Table Entry

**Offset**: 페이지 내부 위치

---

## 주소 변환 과정

CPU가 Virtual Address를 받으면 다음 과정을 수행합니다.

~~~
Virtual Address
      ↓
PGD index
      ↓
PUD index
      ↓
PMD index
      ↓
PTE index
      ↓
Physical Frame + Offset
~~~

즉 주소 변환은 다음과 같은 **트리 구조 탐색**입니다.

~~~
PGD
 └── PUD
      └── PMD
           └── PTE
                └── Physical Page
~~~

이 방식의 장점은 **필요한 부분만 메모리에 생성**된다는 것입니다.

예를 들어 어떤 프로세스가 **4KB만 사용**한다면 실제로 필요한 것은

~~~
PGD 1개
PUD 1개
PMD 1개
PTE 1개
~~~

뿐입니다.

그래서 Page Table 메모리 사용량이 **극적으로 줄어듭니다.**

---

## 실제 주소 변환 예시

예를 들어 다음과 같은 Virtual Address가 있다고 가정해봅시다.

~~~
0x7f12abcd1234
~~~

이 주소는 내부적으로 다음과 같이 분해됩니다.

~~~
PGD index
PUD index
PMD index
PTE index
Offset
~~~

CPU의 **MMU**는 다음과 같은 순서로 메모리를 탐색합니다.

~~~
1. PGD에서 PUD 위치 찾기
2. PUD에서 PMD 위치 찾기
3. PMD에서 PTE 위치 찾기
4. PTE에서 Physical Frame 찾기
5. Offset 더하기
~~~

결과적으로 **Physical Address**가 계산됩니다.

---

하지만 여기서 또 하나의 문제가 있습니다.

> 메모리 접근마다 Page Table을 4번이나 조회해야 할까요?

이렇게 되면 메모리 접근이 매우 느려집니다.

그래서 CPU에는 **TLB (Translation Lookaside Buffer)** 라는  
**주소 변환 캐시**가 존재합니다.

---
## TLB (Translation Lookaside Buffer)

앞에서 본 것처럼 Virtual Address를 Physical Address로 변환하려면  
이론적으로 다음 과정을 거쳐야 합니다.

~~~
Virtual Address
 → PGD
 → PUD
 → PMD
 → PTE
 → Physical Address
~~~

즉 **최대 4번의 메모리 접근**이 필요합니다.

그리고 마지막에 실제 데이터를 읽기 위해 **한 번 더 메모리 접근**이 발생합니다.

~~~
총 5번의 메모리 접근
~~~

이는 성능에 매우 치명적입니다.

그래서 CPU에는 이를 해결하기 위한 **TLB (Translation Lookaside Buffer)** 가 존재합니다.

---

## TLB란?

TLB는 **Page Table lookup 결과를 캐싱하는 하드웨어 캐시**입니다.

즉 다음과 같은 정보를 저장합니다.

~~~
Virtual Page → Physical Frame
~~~

CPU가 메모리에 접근할 때 과정은 다음과 같습니다.

~~~
Virtual Address
      ↓
TLB 조회
      ↓
TLB Hit → 바로 Physical Address
TLB Miss → Page Table Walk
~~~

즉 대부분의 경우 **Page Table을 아예 조회하지 않습니다.**

---

## TLB Hit vs Miss

### TLB Hit

TLB에 매핑 정보가 존재하는 경우입니다.

~~~
Virtual Address
      ↓
TLB Hit
      ↓
Physical Address
      ↓
Memory Access
~~~

이 경우 주소 변환이 **매우 빠르게** 수행됩니다.

---

### TLB Miss

TLB에 정보가 없는 경우입니다.

~~~
Virtual Address
      ↓
TLB Miss
      ↓
Page Table Walk
      ↓
TLB 업데이트
      ↓
Physical Address
~~~

이 과정은 상대적으로 **느립니다.**

하지만 한번 변환되면 **TLB에 저장되기 때문에**  
다음 접근은 빠르게 처리됩니다.

---

## 왜 TLB가 잘 동작할까?

TLB가 효과적인 이유는 **Locality of Reference** 때문입니다.

프로그램은 일반적으로 **근처 메모리를 반복해서 접근**합니다.

예를 들어 다음과 같은 코드가 있다고 해봅시다.

~~~
for (int i = 0; i < 1000000; i++) {
    sum += arr[i];
}
~~~

배열 `arr`은 **연속된 메모리**에 존재합니다.

즉 대부분의 접근은 **같은 페이지 안에서 발생**합니다.

그래서

~~~
한 번 TLB에 올라가면
→ 수천 번 재사용
~~~

이것이 가능한 이유입니다.

---

## TLB Flush

프로세스가 전환될 때는 문제가 발생합니다.

각 프로세스는 **서로 다른 Page Table**을 가지고 있기 때문입니다.

~~~
Process A → Page Table A
Process B → Page Table B
~~~

그래서 Context Switch가 발생하면 보통 다음이 수행됩니다.

~~~
TLB Flush
~~~

즉 기존 TLB 내용을 모두 지웁니다.

하지만 최신 CPU는 이를 최적화하기 위해  
**ASID (Address Space Identifier)** 같은 기술을 사용합니다.

<!-- #### ASID (Address Space Identifier)

**TLB Flush 최적화**:

```
기존:
Context Switch → TLB flush

개선 (ASID):
TLB Entry에 프로세스 ID 추가

┌──────┬────────────┬─────────────┬───────┐
│ ASID │ Virtual PN │ Physical FN │ Flags │
└──────┴────────────┴─────────────┴───────┘

→ Context Switch 시 flush 불필요!
→ 여러 프로세스의 변환 정보 공존
``` -->


---

하지만 아직 중요한 상황이 하나 남아 있습니다.

> 만약 Page Table에 **매핑이 존재하지 않는다면** 어떻게 될까요?

즉 프로그램이 아직 할당되지 않은 메모리를 접근하면 어떻게 될까요?

이때 발생하는 것이 바로 **Page Fault** 입니다.

---

## Page Fault와 Demand Paging

앞에서 `malloc()`이 **즉시 실제 메모리를 할당하지 않는다**는 이야기를 했습니다.

예를 들어 다음 코드를 생각해봅시다.

~~~
void *ptr = malloc(1ULL * 1024 * 1024 * 1024); // 1GB
~~~

이 코드는 보통 **즉시 성공합니다.**

하지만 실제로는 **1GB RAM이 바로 할당되지 않습니다.**

왜냐하면 운영체제는 **Demand Paging**이라는 전략을 사용하기 때문입니다.

---

## Page Fault란?

Page Fault는 **프로그램이 접근한 페이지가 아직 물리 메모리에 없는 경우** 발생하는 예외입니다.

예를 들어 다음 코드가 있다고 합시다.

~~~
int *arr = malloc(1024 * 1024 * 1024);

arr[0] = 1;
~~~

이때 내부적으로 일어나는 과정은 다음과 같습니다.

~~~
arr[0] 접근
    ↓
Virtual Address 생성
    ↓
Page Table 조회
    ↓
페이지 없음 (Present bit = 0)
    ↓
Page Fault 발생
    ↓
Kernel 진입
    ↓
물리 페이지 할당
    ↓
Page Table 업데이트
    ↓
프로그램 재실행
~~~

즉 **Page Fault는 오류가 아니라 정상적인 메커니즘**입니다.

---

## Page Fault 처리 과정

Page Fault가 발생하면 CPU는 즉시 **Kernel Mode**로 전환됩니다.

이후 운영체제가 다음 작업을 수행합니다.

~~~
1. Fault 주소 확인
2. 접근이 합법적인지 검사
3. 새로운 Physical Page 할당
4. Page Table 업데이트
5. 프로그램 실행 재개
~~~

만약 접근이 **허용되지 않은 메모리**라면 다음이 발생합니다.

~~~
Segmentation Fault (SIGSEGV)
~~~

예를 들어 다음 코드입니다.

~~~
int *ptr = NULL;
*ptr = 1;
~~~

이 경우 프로그램은 다음과 같이 종료됩니다.

~~~
Segmentation fault (core dumped)
~~~

---

## Demand Paging

Demand Paging은 **페이지가 실제로 필요할 때만 메모리를 할당하는 방식**입니다.

즉 메모리 할당 흐름은 다음과 같습니다.

~~~
malloc()
  ↓
Virtual Address Space 예약
  ↓
(아직 Physical Memory 없음)
  ↓
첫 접근
  ↓
Page Fault
  ↓
Physical Page 할당
~~~

이 방식의 장점은 다음과 같습니다.

- 메모리 낭비 감소
- 프로그램 시작 속도 증가
- 매우 큰 메모리 공간 사용 가능

---

## Page Fault 예시 실험

다음 프로그램을 실행해봅시다.

~~~
#include <stdlib.h>

int main() {
    char *p = malloc(1024 * 1024 * 1024); // 1GB

    for (size_t i = 0; i < 1024 * 1024 * 1024; i += 4096) {
        p[i] = 1;
    }

    return 0;
}
~~~

이 코드는 **페이지 단위(4KB)** 로 메모리를 접근합니다.

그래서 실행 중에 다음과 같은 일이 반복적으로 발생합니다.

~~~
page access
   ↓
page fault
   ↓
physical page allocation
~~~

즉 프로그램이 실행되면서 **점진적으로 RAM이 할당됩니다.**

---

하지만 여기서 또 흥미로운 메커니즘이 등장합니다.

> `fork()`는 어떻게 그렇게 빠르게 동작할까요?

프로세스를 복제하려면 **전체 메모리를 복사해야 할 것처럼 보입니다.**

하지만 실제로는 그렇지 않습니다.

그 비밀이 바로 **Copy-on-Write (COW)** 입니다.

바로 밑에서 **fork()가 빠른 이유인 Copy-on-Write**를 살펴보겠습니다.

---

## Copy-on-Write (COW)

앞에서 이런 질문을 던졌습니다.

> `fork()`는 어떻게 그렇게 빠를까요?

`fork()`는 **부모 프로세스를 그대로 복제**하는 시스템 콜입니다.

하지만 만약 부모 프로세스가 **1GB 메모리**를 사용 중이라면 어떻게 될까요?

~~~
fork()
 → 1GB 메모리 복사
~~~

이 방식이라면 `fork()`는 **매우 느려야 합니다.**

하지만 실제로는 **거의 즉시 반환됩니다.**

그 이유가 바로 **Copy-on-Write (COW)** 입니다.

---

## Copy-on-Write의 핵심 아이디어

`fork()`가 호출되면 **메모리를 바로 복사하지 않습니다.**

대신 다음과 같은 일이 발생합니다.

~~~
부모 Page Table
        ↓
자식 Page Table 생성
        ↓
둘 다 같은 Physical Memory를 가리킴
        ↓
페이지를 Read-Only로 표시
~~~

즉 부모와 자식 프로세스는 **같은 물리 메모리를 공유**합니다.

~~~
Process A (parent)
Virtual 0x1000 ─┐
                ├── Physical Page
Process B (child)
Virtual 0x1000 ─┘
~~~

이 상태에서는 **메모리 복사가 전혀 발생하지 않습니다.**

---

## 언제 복사가 일어날까?

복사는 **쓰기(write)** 가 발생할 때만 일어납니다.

예를 들어 다음 코드입니다.

~~~
int *p = malloc(sizeof(int));
*p = 10;

pid_t pid = fork();

if (pid == 0) {
    *p = 20;  // 자식이 쓰기
}
~~~

이때 내부적으로 발생하는 흐름은 다음과 같습니다.

~~~
fork()
 ↓
부모와 자식이 같은 Physical Page 공유
 ↓
자식이 *p = 20 실행
 ↓
Write 시도 → Read-Only 페이지
 ↓
Page Fault 발생
 ↓
Kernel이 새로운 Physical Page 할당
 ↓
기존 데이터 복사
 ↓
자식 Page Table 업데이트
~~~

결과적으로 메모리는 다음과 같이 분리됩니다.

~~~
Before Write (Shared)

Parent ─┐
        ├── Physical Page (10)
Child ──┘


After Write (Copy)

Parent ── Physical Page (10)

Child  ── Physical Page (20)
~~~

이것이 바로 **Copy-on-Write** 입니다.

---

## Copy-on-Write의 장점

이 방식은 운영체제에서 매우 중요한 최적화입니다.

- `fork()`가 매우 빠름
- 불필요한 메모리 복사 제거
- 메모리 사용량 감소

특히 다음과 같은 경우에 효과적입니다.

~~~
fork()
 → exec()
~~~

Shell에서 명령어를 실행할 때 항상 등장하는 패턴입니다.

예를 들어 다음과 같습니다.

~~~
pid = fork();

if (pid == 0) {
    execvp("ls", args);
}
~~~

여기서 `exec()`가 호출되면 **프로세스 메모리가 완전히 교체**됩니다.

따라서 `fork()` 직후 메모리를 복사하는 것은 **완전히 낭비**입니다.

Copy-on-Write 덕분에 Linux는 이 문제를 해결합니다.

---

## COW와 Page Fault

여기서 중요한 사실이 하나 있습니다.

**Copy-on-Write도 Page Fault를 사용합니다.**

흐름은 다음과 같습니다.

~~~
Write to shared page
        ↓
Page Fault 발생
        ↓
Kernel이 새 페이지 할당
        ↓
기존 페이지 복사
        ↓
Page Table 업데이트
~~~

즉 Page Fault는 단순히 **메모리 오류 처리**가 아니라

- Demand Paging
- Copy-on-Write
- Memory Mapping

같은 **가상 메모리 핵심 기능의 기반**이 됩니다.

---

그리고 이제 마지막 퍼즐이 남았습니다.

지금까지 우리는 이런 시스템 콜을 여러 번 봤습니다.

~~~
mmap()
~~~

Shared Memory에서도 등장했고, Virtual Memory에서도 계속 나타납니다.

그렇다면 다음 질문이 자연스럽게 등장합니다.

> `mmap()`은 도대체 무엇을 하는 시스템 콜일까요?

----

## Copy-on-Write (COW)

앞에서 이런 질문을 던졌습니다.

> `fork()`는 어떻게 그렇게 빠를까요?

`fork()`는 **부모 프로세스를 그대로 복제**하는 시스템 콜입니다.

하지만 만약 부모 프로세스가 **1GB 메모리**를 사용 중이라면 어떻게 될까요?

~~~
fork()
 → 1GB 메모리 복사
~~~

이 방식이라면 `fork()`는 **매우 느려야 합니다.**

하지만 실제로는 **거의 즉시 반환됩니다.**

그 이유가 바로 **Copy-on-Write (COW)** 입니다.

---

## Copy-on-Write의 핵심 아이디어

`fork()`가 호출되면 **메모리를 바로 복사하지 않습니다.**

대신 다음과 같은 일이 발생합니다.

~~~
부모 Page Table
        ↓
자식 Page Table 생성
        ↓
둘 다 같은 Physical Memory를 가리킴
        ↓
페이지를 Read-Only로 표시
~~~

즉 부모와 자식 프로세스는 **같은 물리 메모리를 공유**합니다.

~~~
Process A (parent)
Virtual 0x1000 ─┐
                ├── Physical Page
Process B (child)
Virtual 0x1000 ─┘
~~~

이 상태에서는 **메모리 복사가 전혀 발생하지 않습니다.**

---

## 언제 복사가 일어날까?

복사는 **쓰기(write)** 가 발생할 때만 일어납니다.

예를 들어 다음 코드입니다.

~~~
int *p = malloc(sizeof(int));
*p = 10;

pid_t pid = fork();

if (pid == 0) {
    *p = 20;  // 자식이 쓰기
}
~~~

이때 내부적으로 발생하는 흐름은 다음과 같습니다.

~~~
fork()
 ↓
부모와 자식이 같은 Physical Page 공유
 ↓
자식이 *p = 20 실행
 ↓
Write 시도 → Read-Only 페이지
 ↓
Page Fault 발생
 ↓
Kernel이 새로운 Physical Page 할당
 ↓
기존 데이터 복사
 ↓
자식 Page Table 업데이트
~~~

결과적으로 메모리는 다음과 같이 분리됩니다.

~~~
Before Write (Shared)

Parent ─┐
        ├── Physical Page (10)
Child ──┘


After Write (Copy)

Parent ── Physical Page (10)

Child  ── Physical Page (20)
~~~

이것이 바로 **Copy-on-Write** 입니다.

---

## Copy-on-Write의 장점

이 방식은 운영체제에서 매우 중요한 최적화입니다.

- `fork()`가 매우 빠름
- 불필요한 메모리 복사 제거
- 메모리 사용량 감소

특히 다음과 같은 경우에 효과적입니다.

~~~
fork()
 → exec()
~~~

Shell에서 명령어를 실행할 때 항상 등장하는 패턴입니다.

예를 들어 다음과 같습니다.

~~~
pid = fork();

if (pid == 0) {
    execvp("ls", args);
}
~~~

여기서 `exec()`가 호출되면 **프로세스 메모리가 완전히 교체**됩니다.

따라서 `fork()` 직후 메모리를 복사하는 것은 **완전히 낭비**입니다.

Copy-on-Write 덕분에 Linux는 이 문제를 해결합니다.

---

## COW와 Page Fault

여기서 중요한 사실이 하나 있습니다.

**Copy-on-Write도 Page Fault를 사용합니다.**

흐름은 다음과 같습니다.

~~~
Write to shared page
        ↓
Page Fault 발생
        ↓
Kernel이 새 페이지 할당
        ↓
기존 페이지 복사
        ↓
Page Table 업데이트
~~~

즉 Page Fault는 단순히 **메모리 오류 처리**가 아니라

- Demand Paging
- Copy-on-Write
- Memory Mapping

같은 **가상 메모리 핵심 기능의 기반**이 됩니다.

---

그리고 이제 마지막 퍼즐이 남았습니다.

지금까지 우리는 이런 시스템 콜을 여러 번 봤습니다.

~~~
mmap()
~~~

Shared Memory에서도 등장했고, Virtual Memory에서도 계속 나타납니다.

그렇다면 다음 질문이 자연스럽게 등장합니다.

> `mmap()`은 도대체 무엇을 하는 시스템 콜일까요?

---

## Memory Mapping과 `mmap()`

지금까지 Virtual Memory를 설명하면서 여러 번 등장한 시스템 콜이 있습니다.

~~~
mmap()
~~~

이 함수는 Linux에서 **가장 중요한 메모리 시스템 콜 중 하나**입니다.

간단히 말하면 `mmap()`은 다음과 같은 기능을 합니다.

> **파일이나 장치를 프로세스의 가상 메모리 공간에 매핑(mapping)한다**

즉 프로그램은 **파일을 읽는 대신 메모리를 직접 접근하듯 사용할 수 있습니다.**

---

## 전통적인 파일 읽기 방식

일반적으로 파일을 읽을 때는 다음과 같은 방식이 사용됩니다.

~~~
open()
read()
write()
~~~

예를 들어 다음 코드입니다.

~~~
int fd = open("data.txt", O_RDONLY);

char buffer[4096];
read(fd, buffer, sizeof(buffer));
~~~

이 방식에서는 내부적으로 다음 과정이 발생합니다.

~~~
Disk
 ↓
Kernel Buffer
 ↓
User Buffer
~~~

즉 **데이터 복사가 두 번 발생합니다.**

~~~
Disk → Kernel
Kernel → User
~~~

---

## mmap() 방식

`mmap()`을 사용하면 흐름이 달라집니다.

~~~
Disk File
     ↓
Page Cache
     ↓
Virtual Memory Mapping
     ↓
User Process
~~~

즉 프로그램은 파일을 다음처럼 사용할 수 있습니다.

~~~
int fd = open("data.txt", O_RDONLY);

char *data = mmap(NULL, size,
                  PROT_READ,
                  MAP_PRIVATE,
                  fd, 0);

printf("%c\n", data[0]);
~~~

이 코드는 실제로는 **파일을 읽은 것이 아니라**

> 파일을 **메모리에 매핑**한 것입니다.

---

## mmap()의 동작

`mmap()`이 호출되면 운영체제는 다음 작업을 수행합니다.

~~~
1. Virtual Address Space 확보
2. Page Table에 mapping 등록
3. 실제 데이터는 아직 로드하지 않음
~~~

즉 이 시점에서는 **디스크 접근이 발생하지 않습니다.**

데이터는 **처음 접근할 때** 로드됩니다.

~~~
data[0] 접근
     ↓
Page Fault 발생
     ↓
Kernel이 디스크에서 페이지 로드
     ↓
Page Table 업데이트
~~~

이 방식 역시 **Demand Paging**을 사용합니다.

---

## mmap()의 두 가지 종류

`mmap()`에는 크게 두 가지 방식이 있습니다.

### 1. File-backed Mapping

파일을 메모리에 매핑합니다.

~~~
int fd = open("file.txt", O_RDONLY);

mmap(NULL, size,
     PROT_READ,
     MAP_PRIVATE,
     fd, 0);
~~~

특징

- 파일 내용과 메모리가 연결됨
- 파일을 메모리처럼 접근 가능
- Page Cache 사용

---

### 2. Anonymous Mapping

파일 없이 **순수 메모리 매핑**을 생성합니다.

~~~
void *ptr = mmap(NULL, size,
                 PROT_READ | PROT_WRITE,
                 MAP_SHARED | MAP_ANONYMOUS,
                 -1, 0);
~~~

특징

- 파일 없음
- 프로세스 메모리로 사용
- `malloc()` 내부에서도 사용됨

---

## mmap()과 Shared Memory

여기서 **Part 3의 내용과 연결**됩니다.

Shared Memory도 결국 내부적으로는 **mmap() 기반**입니다.

예를 들어 POSIX Shared Memory는 다음과 같이 동작합니다.

~~~
int fd = shm_open("/myshm", O_CREAT | O_RDWR, 0666);
ftruncate(fd, 4096);

void *ptr = mmap(NULL, 4096,
                 PROT_READ | PROT_WRITE,
                 MAP_SHARED,
                 fd, 0);
~~~

즉 Shared Memory의 핵심은

> **같은 Physical Page를 여러 프로세스의 Virtual Address에 매핑하는 것**

입니다.

~~~
Process A
Virtual Address ─┐
                 ├── Physical Page
Process B
Virtual Address ─┘
~~~

이 구조 덕분에 **Zero-copy IPC**가 가능해집니다.

---

## 메모리가 부족하면? (Swap)

지금까지는 모든 페이지가 **RAM에 존재한다고 가정**했습니다.

하지만 실제 시스템에서는 RAM이 부족해질 수 있습니다.  
이때 운영체제는 일부 페이지를 **디스크로 이동**시켜 메모리를 확보합니다.

이를 **Swap**이라고 합니다.

~~~
RAM
 ↓
사용하지 않는 페이지 선택
 ↓
Swap 영역(디스크)에 저장
 ↓
필요하면 다시 RAM으로 로드
~~~

예를 들어 다음과 같은 시스템이 있다고 가정해 보겠습니다.

~~~
RAM  : 4GB
Swap : 8GB

→ 총 가용 메모리: 12GB
~~~

하지만 디스크는 RAM보다 훨씬 느립니다.

~~~
RAM 접근 : ~100ns
SSD 접근 : ~100,000ns
HDD 접근 : ~10,000,000ns
~~~

그래서 Swap이 과도하게 발생하면 **Thrashing**이 발생할 수 있습니다.

~~~
Page Fault 증가
→ Swap In / Swap Out 반복
→ 시스템 성능 급격히 하락
~~~

---

## OOM Killer

만약 다음과 같은 상황이 발생하면 어떻게 될까요?

~~~
RAM 사용량 100%
Swap 사용량 100%
더 이상 내보낼 페이지 없음
~~~

Linux에서는 이 상황에서 **OOM Killer (Out-of-Memory Killer)**가 실행됩니다.

~~~
메모리를 많이 사용하는 프로세스 선택
→ 해당 프로세스 강제 종료
→ 메모리 확보
~~~

다음과 같은 로그로 확인할 수 있습니다.

~~~bash
dmesg | grep -i oom
~~~

이 메커니즘 덕분에 시스템 전체가 멈추는 대신  
일부 프로세스를 종료하여 시스템을 유지할 수 있습니다.

---

## 정리

지금까지 Virtual Memory의 핵심 메커니즘을 살펴봤습니다.

**1. Page Table**

~~~
Virtual Address → Physical Address 변환
~~~

**2. Demand Paging**

~~~
필요할 때만 실제 메모리 할당
~~~

**3. Page Fault**

~~~
메모리가 없을 때 Kernel이 처리
~~~

**4. Copy-on-Write**

~~~
fork() 시 메모리 복사 지연
~~~

**5. Memory Mapping**

~~~
파일과 메모리를 연결
~~~

이 모든 기능은 결국 **Page Table과 MMU 위에서 동작**합니다.

---

## 다음 글 예고 (두둥~)

Shared Memory를 사용하면 여러 프로세스가 **같은 메모리를 동시에 접근**할 수 있습니다.

하지만 여기서 새로운 문제가 발생합니다.

~~~
int counter = 0;  // Shared Memory

// Process A
counter++;

// Process B
counter++;
~~~

두 프로세스가 동시에 실행되면 결과는 다음과 같습니다.

~~~
Expected: counter = 2
Actual  : counter = 1
~~~

이 문제를 **Race Condition**이라고 합니다.

다음 글에서는 이러한 문제를 해결하는 **Synchronization 메커니즘**을 살펴봅니다.

### 다음 주제

- Critical Section
- Mutex vs Semaphore vs Spinlock
- Deadlock (4가지 조건)
- Reader–Writer Problem
- Producer–Consumer Problem
- Linux Kernel Synchronization

---

## 더 알아보기

### 추천 자료

**책**:
- "Understanding the Linux Virtual Memory Manager" (Gorman)
- "What Every Programmer Should Know About Memory" (Drepper)

**온라인**:
- [Linux Memory Management](https://www.kernel.org/doc/gorman/)
- [Intel SDM Vol. 3A](https://www.intel.com/sdm) - Paging 세부사항

**실습**:
```bash
# /proc, perf로 실습
cat /proc/PID/maps
perf stat -e page-faults ./program
```

---

**태그**: `#운영체제` `#VirtualMemory` `#Paging` `#TLB` `#CopyOnWrite` `#PageFault`
