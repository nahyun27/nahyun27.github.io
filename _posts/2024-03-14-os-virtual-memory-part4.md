---
title: "[운영체제 Deep Dive #4] 4GB RAM으로 16GB 쓰는 마법 - Virtual Memory의 모든 것"
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

이런 경험 있으신가요?

```c
int *huge = malloc(1024 * 1024 * 1024);  // 1GB 할당
// → 즉시 리턴! (0.001초)

// 실제 사용할 때
huge[0] = 42;  // 이 순간 Page Fault!
// → 이제서야 물리 메모리 할당
```

**어떻게 가능할까요?**

```bash
$ free -h
              total        used        free
Mem:           4Gi        3.5Gi       500Mi

$ ./program  # 10GB 메모리 할당 요청
# → 에러 안 남! 정상 실행!
```

**4GB RAM에서 10GB를 쓴다?!**

오늘은 OS의 가장 아름다운 추상화, **Virtual Memory**를 파헤쳐봅시다.

---

## Virtual Memory란?

### 물리 메모리 vs 가상 메모리

**물리 메모리 (Physical Memory)**:
```
실제 RAM 칩에 있는 메모리
- 크기: 고정 (예: 4GB, 16GB)
- 주소: 0x0000 ~ 0x3FFF FFFF (4GB)
- 공유: 모든 프로세스가 공유
```

**가상 메모리 (Virtual Memory)**:
```
프로세스가 보는 메모리 (환상!)
- 크기: 매우 큼 (예: 128TB on x86-64)
- 주소: 0x0000 ~ 0x7FFF FFFF FFFF
- 독립: 각 프로세스마다 별도
```

---

### 왜 Virtual Memory?

**문제 1: 메모리 부족**
```c
// 물리 메모리만 사용한다면...
void *p1 = malloc(2GB);  // 프로세스 A
void *p2 = malloc(2GB);  // 프로세스 B
void *p3 = malloc(2GB);  // 프로세스 C → 에러!
// 4GB RAM에서 6GB 할당 불가
```

**해결: Swap + Paging**
```
디스크를 메모리처럼 사용!
자주 안 쓰는 페이지 → 디스크로
```

---

**문제 2: 보안 (프로세스 간 간섭)**
```c
// 프로세스 A
int *p = (int *)0x1000;
*p = 42;

// 프로세스 B
int *q = (int *)0x1000;  // 같은 주소!
*q = 100;  // A의 데이터 덮어씀! 위험!
```

**해결: 주소 공간 분리**
```
각 프로세스마다 독립적인 가상 주소 공간
0x1000 (프로세스 A) → 물리 주소 0x5000
0x1000 (프로세스 B) → 물리 주소 0x8000
```

---

**문제 3: 메모리 단편화**
```
물리 메모리:
[프로세스A][빈공간][프로세스B][빈공간][프로세스C]
           ↑ 50MB           ↑ 30MB
  → 80MB 빈 공간 있지만 연속적이지 않음!
  → 70MB 할당 불가!
```

**해결: Paging**
```
연속적이지 않아도 OK!
가상 메모리: [연속적]
물리 메모리: [조각조각 흩어진 페이지들]
```

---

## Paging: 메모리를 쪼개다

### Page와 Frame

**Page (가상 메모리)**:
```
가상 주소 공간을 고정 크기로 나눈 블록
크기: 보통 4KB (4096 bytes)
```

**Frame (물리 메모리)**:
```
물리 주소 공간을 고정 크기로 나눈 블록
크기: Page와 동일 (4KB)
```

**관계**:
```
Virtual Page 0 → Physical Frame 5
Virtual Page 1 → Physical Frame 2
Virtual Page 2 → Physical Frame 9
...
```

---

### 주소 변환

**Virtual Address 구조** (4KB page 기준):

```
64-bit Virtual Address (x86-64):
┌────────────┬─────────────┬─────────────┐
│ Page Number│   Offset    │  (unused)   │
│   52 bits  │   12 bits   │   12 bits   │
└────────────┴─────────────┴─────────────┘
              ↓             ↓
        Page Table       Page 내 위치
```

**예시**:
```
Virtual Address: 0x0000 1234 5678

분해:
Page Number: 0x00001234 5 (상위 비트)
Offset:      0x678         (하위 12비트 = 4KB)

변환:
Page Table lookup → Physical Frame Number: 0xABCDE
Physical Address: 0xABCDE678
```

---

### Page Table Entry (PTE)

**구조** (64-bit):

```c
typedef struct {
    unsigned long present    : 1;  // 메모리에 존재?
    unsigned long writable   : 1;  // 쓰기 가능?
    unsigned long user       : 1;  // 유저 모드 접근 가능?
    unsigned long pwt        : 1;  // Page write-through
    unsigned long pcd        : 1;  // Page cache disabled
    unsigned long accessed   : 1;  // 최근 접근?
    unsigned long dirty      : 1;  // 수정됨?
    unsigned long pat        : 1;  // Page attribute table
    unsigned long global     : 1;  // Global page
    unsigned long available  : 3;  // OS 사용 가능
    unsigned long frame_num  : 40; // 물리 프레임 번호 ★
    unsigned long reserved   : 11;
    unsigned long nx         : 1;  // No execute (보안!)
} pte_t;
```

**핵심 비트**:

- **Present (P)**: 1 = RAM에 있음, 0 = Swap/Disk
- **Writable (W)**: 1 = 쓰기 가능, 0 = Read-only
- **User (U)**: 1 = 유저 접근 OK, 0 = 커널만
- **Accessed (A)**: 1 = 최근 접근함 (Page Replacement 참고)
- **Dirty (D)**: 1 = 수정됨 (Swap 시 디스크 쓰기 필요)
- **NX (No eXecute)**: 1 = 실행 불가 (Buffer Overflow 방어!)

---

## Multi-level Page Table

### 왜 Multi-level?

**문제: 1-level Page Table의 크기**

```
가상 주소 공간: 48-bit (x86-64)
Page 크기: 4KB (12-bit offset)
→ Page 수: 2^(48-12) = 2^36 pages

PTE 크기: 8 bytes
→ Page Table 크기: 2^36 * 8 = 512 GB!

각 프로세스마다 512GB Page Table?!
→ 불가능!
```

---

### 4-level Page Table (x86-64)

**구조**:

```
48-bit Virtual Address:
┌──────┬──────┬──────┬──────┬────────┐
│ PGD  │ PUD  │ PMD  │ PTE  │ Offset │
│ 9bit │ 9bit │ 9bit │ 9bit │ 12bit  │
└──────┴──────┴──────┴──────┴────────┘
   ↓      ↓      ↓      ↓       ↓
  512   512    512    512    4096
 entry  entry  entry  entry  bytes
```

**레벨**:
1. **PGD (Page Global Directory)**: 최상위
2. **PUD (Page Upper Directory)**
3. **PMD (Page Middle Directory)**
4. **PTE (Page Table Entry)**: 최하위
5. **Offset**: 페이지 내 위치

---

### Page Walk 예시

**Virtual Address**: `0x00007F1234567890`

```
Binary: 0000 0000 0000 0000 0111 1111 0001 0010 0011 0100 0101 0110 0111 1000 1001 0000

분해:
PGD index: 000000000 (0)
PUD index: 111111000 (504)
PMD index: 100100011 (291)
PTE index: 010001010 (138)
Offset:    011001110010000 (0x890)
```

**Walk 과정**:

```
1. CR3 레지스터 → PGD 물리 주소
   PGD base: 0x1000

2. PGD[0] → PUD 물리 주소
   PGD[0] = 0x2000 | flags

3. PUD[504] → PMD 물리 주소
   PUD[504] = 0x3000 | flags

4. PMD[291] → PTE 물리 주소
   PMD[291] = 0x4000 | flags

5. PTE[138] → Frame 물리 주소
   PTE[138] = 0xABCDE000 | flags

6. Physical Address = Frame + Offset
   0xABCDE000 + 0x890 = 0xABCDE890
```

**메모리 접근 횟수**: **5번!**  
(CR3 → PGD → PUD → PMD → PTE → 실제 데이터)

---

### Page Table 크기 계산

**실제 사용하는 메모리만 할당**:

```c
// 프로세스가 1MB만 사용
1MB / 4KB = 256 pages

필요한 Page Table:
- PGD: 1개 (항상)
- PUD: 1개
- PMD: 1개
- PTE: 1개 (256 entries)

총 크기: 4 * 4KB = 16KB
(vs 1-level: 512GB!)
```

---

## Translation Lookaside Buffer (TLB)

### TLB란?

**문제**:
```
매 메모리 접근마다 5번 메모리 읽기?
→ 너무 느림!
```

**해결: TLB (캐시!)**

```
TLB: 최근 주소 변환 결과 캐싱

Virtual Page Number → Physical Frame Number
```

---

### TLB 동작

```
CPU가 가상 주소 접근:

1. TLB 확인
   ├─ Hit: 즉시 물리 주소 획득! (0.5ns)
   └─ Miss: Page Walk 수행 (100ns)
             → TLB에 저장

2. 실제 메모리 접근
```

---

### TLB 구조

**일반적인 TLB**:

```
Intel Core i7:
- L1 DTLB: 64 entries (data)
- L1 ITLB: 128 entries (instruction)
- L2 TLB: 1536 entries (unified)

각 Entry:
┌────────────┬─────────────┬───────┐
│ Virtual PN │ Physical FN │ Flags │
└────────────┴─────────────┴───────┘
```

---

### TLB Miss 처리

**Hardware-managed TLB** (x86):
```
1. TLB Miss 발생
2. CPU가 자동으로 Page Walk
3. PTE 찾아서 TLB에 저장
4. 명령 재시작
```

**Software-managed TLB** (MIPS):
```
1. TLB Miss 발생
2. Exception → OS 호출
3. OS가 Page Walk
4. OS가 TLB 업데이트
5. 명령 재시작
```

---

### TLB Performance

**Hit Rate의 중요성**:

```
Assumptions:
- TLB hit time: 0.5ns
- Memory access time: 100ns
- TLB hit rate: 99%

Effective Access Time (EAT):
= 0.99 * (0.5 + 100)     [TLB hit]
+ 0.01 * (0.5 + 5*100 + 100)  [TLB miss]
= 99.495 + 6.005
= 105.5ns

vs TLB hit rate: 80%
EAT = 80 * 100.5 + 20 * 600.5
    = 80.4 + 120.1 = 200.5ns

→ Hit rate 20% 차이 = 2배 성능 차이!
```

---

### TLB Flush

**언제 Flush?**

```c
// Context Switch (프로세스 전환)
switch_to(process_A, process_B);
→ TLB flush (A의 변환 정보 무효)
→ B의 Page Table 적용

// Page Table 변경
munmap(addr, size);
→ 해당 페이지 TLB 무효화

// Fork + exec
fork();
exec("/bin/ls");
→ 완전히 새로운 주소 공간
→ TLB 전체 flush
```

**비용**:
```
TLB flush → 다음 여러 메모리 접근이 모두 Miss
→ 성능 저하!
```

---

### ASID (Address Space Identifier)

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
```

---

## Page Fault

### Page Fault란?

**발생 조건**:

```c
int *p = malloc(1GB);  // 가상 메모리만 할당
p[0] = 42;  ← Page Fault! (Present bit = 0)
```

**종류**:

1. **Minor Fault**: 페이지가 RAM에는 있지만 Page Table에 없음
2. **Major Fault**: 페이지가 Disk에 있음 (Swap)
3. **Invalid Fault**: 접근 불가 영역 (Segmentation Fault!)

---

### Page Fault Handler 동작

```
1. CPU가 Page Fault 감지
   ├─ Present bit = 0
   └─ Exception 발생

2. 제어권이 Kernel로
   ├─ Page Fault Handler 호출
   └─ 오류 주소 저장 (CR2 레지스터)

3. Page Fault 원인 판단
   ├─ Invalid Address? → SIGSEGV (Segmentation Fault)
   ├─ Permission Denied? → SIGSEGV
   ├─ Copy-on-Write? → 페이지 복사
   └─ Swap에 있음? → Disk에서 로드

4. 페이지 할당 및 매핑
   ├─ 물리 프레임 할당
   ├─ 필요시 Disk에서 읽기
   ├─ Page Table 업데이트 (Present = 1)
   └─ TLB 업데이트

5. 명령 재시작
   └─ 이제 성공!
```

---

### Demand Paging (요구 페이징)

**Lazy Allocation**:

```c
void *huge = malloc(1GB);
// → 즉시 리턴 (가상 메모리만 예약)
// → 실제 RAM 할당 안 함!

huge[0] = 42;  // 첫 번째 접근
// → Page Fault!
// → 이제서야 4KB 할당

huge[4096] = 100;  // 두 번째 페이지 접근
// → Page Fault!
// → 또 4KB 할당

// 1GB 할당했지만 실제로는 8KB만 사용!
```

**이점**:
- 메모리 낭비 방지
- 빠른 할당
- fork() 최적화 (Copy-on-Write와 함께)

---

### Copy-on-Write (COW)

**fork() 최적화의 핵심**:

```c
int x = 10;

pid_t pid = fork();
// → 메모리 복사 안 함!
// → 부모와 자식이 같은 물리 페이지 공유
// → Page Table에 "Read-Only" 마킹

if (pid == 0) {
    // 자식
    x = 20;  ← Page Fault! (Write to Read-Only)
    // → 이제서야 페이지 복사
    // → 자식만 새 물리 페이지 할당
    // → x 값 변경
}
else {
    // 부모
    printf("%d\n", x);  // 여전히 10
    // → Page Fault 안 남 (Read-Only 읽기는 OK)
}
```

---

### COW 상세 동작

```
Initial (fork 직후):
Parent Page Table:        Child Page Table:
VA 0x1000 → PA 0x5000    VA 0x1000 → PA 0x5000
          (R/O)                    (R/O)
          ↓                        ↓
    Same Physical Page! (0x5000)
    값: 10

Child writes x = 20:
1. Write to Read-Only → Page Fault!
2. Kernel: "아, COW구나"
3. 새 물리 페이지 할당 (0x8000)
4. 기존 페이지 내용 복사 (10 → new page)
5. Child Page Table 업데이트:
   VA 0x1000 → PA 0x8000 (R/W)
6. 새 페이지에 20 쓰기

After:
Parent: VA 0x1000 → PA 0x5000 (값: 10)
Child:  VA 0x1000 → PA 0x8000 (값: 20)
```

**이점**:
```
fork() + exec() 패턴:
→ exec()가 메모리 덮어쓰기
→ 복사할 필요 없음!
→ COW 덕분에 빠른 fork!
```

---

### Redis의 COW 활용

```c
// Redis BGSAVE
int bgsave() {
    pid_t pid = fork();
    // → COW: 메모리 공유 (빠름!)
    
    if (pid == 0) {
        // 자식: 데이터 디스크 저장 (느림)
        save_to_disk();  // Read-only 접근
        exit(0);
    }
    
    // 부모: 계속 요청 처리 (쓰기 가능)
    // → 쓸 때만 COW로 복사
    // → 빠른 응답!
}
```

---

## Swapping

### Swap이란?

**메모리 확장**:

```
물리 RAM: 4GB
Swap Partition: 8GB
→ 총 가용 메모리: 12GB!

자주 안 쓰는 페이지 → Swap으로
자주 쓰는 페이지 → RAM에
```

---

### Page Replacement 알고리즘

#### 1. FIFO (First-In-First-Out)

```
페이지 참조: 1 2 3 4 1 2 5 1 2 3 4 5

프레임 (3개):
[1] [ ] [ ]
[1] [2] [ ]
[1] [2] [3]
[4] [2] [3]  ← 1 out (FIFO)
[4] [1] [3]  ← 2 out
[4] [1] [2]  ← 3 out
...

Page Faults: 10회
```

**단점**: Belady's Anomaly (프레임 늘려도 Fault 증가 가능!)

---

#### 2. LRU (Least Recently Used)

```
최근에 사용 안 한 페이지 교체

페이지 참조: 1 2 3 4 1 2 5 1 2 3 4 5

프레임 (3개):
[1] [ ] [ ]   최근: 1
[1] [2] [ ]   최근: 2 1
[1] [2] [3]   최근: 3 2 1
[4] [2] [3]   최근: 4 3 2 (1 out - LRU)
[4] [1] [3]   최근: 1 4 3 (2 out - LRU)
[2] [1] [3]   최근: 2 1 4 (4 out - LRU)
...

Page Faults: 8회 (FIFO보다 적음!)
```

**구현**: 
- Accessed bit 활용
- Timestamp 기록

---

#### 3. Clock Algorithm (Second Chance)

```
원형 큐 + Reference bit

   ┌─→ [1|1] → [2|0] → [3|1] → [4|1] ─┐
   │    ↑                               │
   └────────────────────────────────────┘
       hand (pointer)

교체 알고리즘:
1. hand가 가리키는 페이지 확인
2. Reference bit = 1? → 0으로 설정, hand++
3. Reference bit = 0? → 교체!

실제 Linux 구현과 유사!
```

---

### Linux Page Replacement

**kswapd (Page Daemon)**:

```c
while (1) {
    if (free_pages < pages_low) {
        // 메모리 부족!
        
        // LRU 리스트에서 페이지 선택
        page = select_victim_page();
        
        if (page->dirty) {
            // Dirty page → 디스크 쓰기
            write_to_swap(page);
        }
        
        // 페이지 해제
        free_page(page);
    }
    
    sleep(1);  // 1초마다 체크
}
```

---

### Swap 성능

**Swap vs RAM**:

```
RAM 접근: ~100ns
SSD Swap: ~100,000ns (1,000배 느림!)
HDD Swap: ~10,000,000ns (100,000배 느림!)

→ Swap은 최후의 수단!
→ Thrashing 주의!
```

**Thrashing**:
```
메모리 부족 → Swap 과다 → 모든 프로세스 느려짐
→ Page Fault → Swap In → Swap Out → Page Fault
→ CPU는 놀고 Disk만 바쁨!
```

---

## Memory-Mapped I/O

### mmap()

```c
#include <sys/mman.h>

void *addr = mmap(
    NULL,          // 커널이 주소 선택
    length,        // 매핑할 크기
    PROT_READ | PROT_WRITE,  // 읽기+쓰기
    MAP_SHARED,    // 다른 프로세스와 공유
    fd,            // 파일 디스크립터
    offset         // 파일 내 위치
);
```

---

### 파일 매핑 예제

```c
int fd = open("bigfile.dat", O_RDWR);
struct stat sb;
fstat(fd, &sb);

// 파일을 메모리에 매핑
char *data = mmap(NULL, sb.st_size,
                  PROT_READ | PROT_WRITE,
                  MAP_SHARED, fd, 0);

// 파일을 배열처럼 접근!
data[0] = 'A';  // 파일의 첫 바이트 변경
data[100] = 'B';

// 변경 사항 디스크 동기화
msync(data, sb.st_size, MS_SYNC);

munmap(data, sb.st_size);
close(fd);
```

**장점**:
- read()/write() 불필요
- 커널이 Page Fault로 자동 로드
- Shared Memory로 사용 가능

---

### Shared Memory (IPC)

```c
// 프로세스 A
int shm_fd = shm_open("/myshm", O_CREAT | O_RDWR, 0666);
ftruncate(shm_fd, 4096);

void *ptr = mmap(NULL, 4096,
                 PROT_READ | PROT_WRITE,
                 MAP_SHARED, shm_fd, 0);

strcpy(ptr, "Hello from A");

// 프로세스 B
int shm_fd = shm_open("/myshm", O_RDWR, 0666);
void *ptr = mmap(NULL, 4096,
                 PROT_READ | PROT_WRITE,
                 MAP_SHARED, shm_fd, 0);

printf("%s\n", (char*)ptr);  // "Hello from A"
```

**가장 빠른 IPC!** (Zero-copy)

---

## OOM Killer

### Out-of-Memory Killer

**언제 발동?**

```
메모리 부족 상황:
1. 모든 프로세스가 메모리 요구
2. Swap도 꽉 참
3. kswapd도 페이지 못 찾음
4. → OOM Killer 호출!
```

---

### 희생자 선택 알고리즘

```c
// OOM Score 계산
int oom_score(process) {
    int score = 0;
    
    // 메모리 사용량 (MB)
    score += process.mem_usage / 1024;
    
    // 자식 프로세스 많으면 감점
    score -= sqrt(process.num_children) * 10;
    
    // nice 값 고려
    score += process.nice_value;
    
    // root 프로세스 보호
    if (process.uid == 0) score /= 4;
    
    // 오래 실행된 프로세스 보호
    score -= (current_time - process.start_time) / 100;
    
    return score;
}

// 가장 높은 score → 희생!
```

---

### OOM 로그

```bash
$ dmesg | grep -i oom
[12345.678] Out of memory: Kill process 9527 (chrome) score 987 or sacrifice child
[12345.679] Killed process 9527 (chrome) total-vm:4125892kB, anon-rss:3835032kB, file-rss:0kB
```

---

### OOM 방지

```bash
# 1. Swap 늘리기
sudo fallocate -l 4G /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 2. OOM Killer 조정
echo 1000 > /proc/$PID/oom_score_adj  # 높을수록 우선 kill

# 3. cgroup memory limit
echo 2G > /sys/fs/cgroup/memory/myapp/memory.limit_in_bytes
```

---

## 실전 디버깅

### 1. /proc/PID/maps

```bash
$ cat /proc/self/maps
00400000-00401000 r-xp 00000000 08:01 123  /bin/cat
00600000-00601000 r--p 00000000 08:01 123  /bin/cat
00601000-00602000 rw-p 00001000 08:01 123  /bin/cat
7f1234567000-7f1234789000 r-xp 00000000 08:01 456  /lib/libc.so
7ffe12345000-7ffe12366000 rw-p 00000000 00:00 0  [stack]
```

**해석**:
```
주소 범위          권한   오프셋 디바이스 inode 경로
00400000-00401000  r-xp   ...              /bin/cat (코드)
00601000-00602000  rw-p   ...              /bin/cat (데이터)
7ffe12345000-...   rw-p   ...              [stack]
```

---

### 2. Page Fault 측정

```bash
# Major/Minor Faults 확인
$ /usr/bin/time -v ./program
...
    Major (requiring I/O) page faults: 123
    Minor (reclaiming a frame) page faults: 45678
```

**해석**:
- Minor Fault: 빠름 (~μs)
- Major Fault: 느림 (~ms, Disk I/O)

---

### 3. TLB Miss 측정

```bash
$ perf stat -e dTLB-loads,dTLB-load-misses,iTLB-loads,iTLB-load-misses ./program

Performance counter stats:
    123,456,789  dTLB-loads
        12,345   dTLB-load-misses  # 0.01% miss rate
    98,765,432   iTLB-loads
         1,234   iTLB-load-misses  # 0.001% miss rate
```

**목표**: TLB miss rate < 1%

---

### 4. Memory 사용량 모니터링

```bash
# 실시간 메모리 모니터링
$ watch -n 1 'free -h && cat /proc/meminfo | grep -E "Active|Inactive|Dirty|Swap"'

# 프로세스별 메모리
$ ps aux --sort=-%mem | head

# Swap 사용량
$ swapon --show
```

---

## 성능 최적화

### 1. Huge Pages

**문제**:
```
일반 Page: 4KB
대용량 DB: 100GB
→ Page 수: 100GB / 4KB = 26,214,400 pages!
→ Page Table 크기: 26M * 8B = 200MB
→ TLB Miss 많음
```

**해결**: Huge Pages (2MB or 1GB)

```bash
# Transparent Huge Pages 활성화
echo always > /sys/kernel/mm/transparent_hugepage/enabled

# Static Huge Pages
echo 1024 > /proc/sys/vm/nr_hugepages  # 1024 * 2MB = 2GB
```

**효과**:
```
2MB Huge Pages:
→ Page 수: 100GB / 2MB = 51,200 pages
→ Page Table: 51K * 8B = 400KB (500배 감소!)
→ TLB Hit Rate 증가!
```

---

### 2. NUMA 고려

```c
// NUMA Node 확인
$ numactl --hardware
available: 2 nodes (0-1)
node 0 cpus: 0 1 2 3
node 0 size: 16GB
node 1 cpus: 4 5 6 7
node 1 size: 16GB

// 특정 Node에 바인딩
$ numactl --cpunodebind=0 --membind=0 ./program
```

**Local vs Remote 메모리**:
```
Local:  100ns
Remote: 200ns (2배 느림!)
```

---

### 3. Cache-Friendly 코드

```c
// Bad: Column-major (Cache Miss 많음)
for (int j = 0; j < N; j++) {
    for (int i = 0; i < N; i++) {
        sum += matrix[i][j];  // 비연속적 접근!
    }
}

// Good: Row-major (Cache Hit 많음)
for (int i = 0; i < N; i++) {
    for (int j = 0; j < N; j++) {
        sum += matrix[i][j];  // 연속적 접근!
    }
}
```

**성능 차이**: ~10배!

---

## 정리

### 핵심 개념

**1. Virtual Memory**
```
✓ 프로세스마다 독립적인 주소 공간
✓ 실제 RAM보다 큰 메모리 사용 가능
✓ 보안 & 안정성
```

**2. Paging**
```
✓ Page (4KB) ↔ Frame 매핑
✓ Page Table로 주소 변환
✓ 4-level Page Table (x86-64)
```

**3. TLB**
```
✓ 주소 변환 캐시
✓ Page Walk (5번) → TLB Hit (0.5ns)
✓ Hit Rate 99% 목표
```

**4. Page Fault**
```
✓ Demand Paging (Lazy Allocation)
✓ Copy-on-Write (fork 최적화)
✓ Swap (디스크를 메모리처럼)
```

---

### Virtual Memory의 마법

```c
// 1. 독립적 주소 공간
Process A: 0x1000 → Physical 0x5000
Process B: 0x1000 → Physical 0x8000

// 2. Lazy Allocation
malloc(1GB);  // 즉시 리턴!
ptr[0] = 42;  // 이제 할당 (4KB만)

// 3. Copy-on-Write
fork();       // 메모리 복사 안 함!
x = 20;       // 이제 복사 (쓸 때만)

// 4. Memory Overcommit
4GB RAM + 8GB Swap = 12GB 가용!
```

---

### 다음 편 예고

**Part 5: Synchronization & Deadlock**  
"Race Condition과의 전쟁"

Shared Memory를 사용하면서 발생하는 **동시성 문제**를 해결합니다.

```c
// 다음 편에서 다룰 내용
int counter = 0;  // Shared Memory에 있는 변수

// Thread 1
counter++;  // Read-Modify-Write

// Thread 2
counter++;  // Race Condition!

// 결과: counter = 1 (기대: 2)
// → Synchronization 필요!
```

**다룰 주제**:
- Critical Section
- Mutex vs Semaphore vs Spinlock
- Deadlock (4가지 조건)
- Reader-Writer Problem
- Producer-Consumer Problem
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
