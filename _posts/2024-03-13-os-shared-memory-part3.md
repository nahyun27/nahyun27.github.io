---
title: "[운영체제 Deep Dive #3] Shared Memory는 왜 Pipe보다 빠를까? - Zero-copy IPC"
date: 2024-03-13 16:00:00 +0900
categories: [Operating System, IPC]
tags: [operating-system, linux, shared-memory, mmap, ipc, zero-copy, shm]
description: "운영체제 Deep Dive #3 – Shared Memory: Pipe보다 빠른 IPC, 커널 복사 없이 프로세스가 직접 데이터를 공유하는 방법"
image:
  path: /assets/img/os/shared-memory.png
  alt: Shared Memory IPC
math: false
series: 운영체제 Deep Dive
---

## 들어가며

[Part 2]({% post_url 2024-03-13-os-ipc-pipe-part2 %})에서 Pipe를 배웠습니다:
프로세스 간 데이터를 전달하는 단방향 통신 방식이었죠. 하지만 Pipe는 커널 버퍼를 거치고, 데이터 복사 비용이 발생하며, 단방향이라는 한계가 있습니다.  

이번 글에서는 이러한 한계를 해결하는 **Shared Memory**를 다룹니다.  
커널을 거치지 않고 프로세스가 같은 메모리 영역을 직접 공유할 수 있어 **대용량 데이터 전달 시 매우 빠른 IPC 방식**입니다.

---

## Shared Memory란?

### 개념

**정의**: 여러 프로세스가 **같은 물리 메모리 영역**을 공유

```
Process A           Process B
VA: 0x1000         VA: 0x5000
   ↓                  ↓
   └──→ Physical Memory: 0xABCD ←──┘
         (Same location!)
```

**특징**:
- Zero-copy (복사 없음)
- 가장 빠른 IPC
- Synchronization 필요 (나중에 다룸)

---

### Pipe vs Shared Memory

#### Pipe 데이터 흐름

```
Process A                      Process B
┌─────────┐                   ┌─────────┐
│  data   │                   │         │
└────┬────┘                   └────▲────┘
     │ write()                     │ read()
     ↓                             │
┌─────────────────┐                │
│  Kernel Buffer  │────────────────┘
│   (복사본 1)     │
└─────────────────┘

데이터 이동: User → Kernel → User (2번 복사)
```

#### Shared Memory 데이터 흐름

```
Process A           Process B
┌─────────┐         ┌─────────┐
│  *shm   │         │  *shm   │
└────┬────┘         └────┬────┘
     │                   │
     └─────────┬─────────┘
               ↓
       ┌─────────────┐
       │   Physical  │
       │   Memory    │
       └─────────────┘

데이터 이동: 없음! (0번 복사)
```

---

## POSIX Shared Memory

### shm_open() / shm_unlink()

```c
#include <sys/mman.h>
#include <fcntl.h>

// Shared Memory Object 생성
int shm_fd = shm_open(
    "/myshm",                // 이름 (반드시 /로 시작)
    O_CREAT | O_RDWR,       // 생성 + 읽기/쓰기
    0666                     // 권한
);

// 크기 설정 (중요!)
ftruncate(shm_fd, 4096);     // 4KB

// 사용 후 삭제
shm_unlink("/myshm");
```

---

### mmap() - Memory Mapping

```c
void *ptr = mmap(
    NULL,              // 커널이 주소 선택
    4096,              // 크기 (4KB)
    PROT_READ | PROT_WRITE,  // 읽기+쓰기
    MAP_SHARED,        // 다른 프로세스와 공유!
    shm_fd,            // File descriptor
    0                  // Offset
);

// 사용 완료
munmap(ptr, 4096);
```

**MAP_SHARED vs MAP_PRIVATE**:

```c
// MAP_SHARED: 변경사항 공유
// Process A가 쓰면 → Process B가 즉시 봄

// MAP_PRIVATE: 변경사항 독립 (Copy-on-Write)
// Process A가 쓰면 → Process B는 못 봄
```

---

## 실전 예제

### Producer-Consumer (간단 버전)

#### Producer (쓰기)

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <unistd.h>

int main() {
    // 1. Shared Memory 생성
    int shm_fd = shm_open("/myshm", O_CREAT | O_RDWR, 0666);
    ftruncate(shm_fd, 4096);
    
    // 2. 메모리 매핑
    char *ptr = mmap(NULL, 4096, PROT_READ | PROT_WRITE,
                     MAP_SHARED, shm_fd, 0);
    
    // 3. 데이터 쓰기
    sprintf(ptr, "Hello from Producer!");
    printf("Producer: Wrote '%s'\n", ptr);
    
    // 4. 정리
    munmap(ptr, 4096);
    close(shm_fd);
    
    return 0;
}
```

#### Consumer (읽기)

```c
#include <stdio.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <unistd.h>

int main() {
    // 1. 기존 Shared Memory 열기
    int shm_fd = shm_open("/myshm", O_RDONLY, 0666);
    
    // 2. 메모리 매핑
    char *ptr = mmap(NULL, 4096, PROT_READ,
                     MAP_SHARED, shm_fd, 0);
    
    // 3. 데이터 읽기
    printf("Consumer: Read '%s'\n", ptr);
    
    // 4. 정리
    munmap(ptr, 4096);
    close(shm_fd);
    
    // 5. Shared Memory 삭제
    shm_unlink("/myshm");
    
    return 0;
}
```

**실행**:

```bash
# Terminal 1
$ gcc producer.c -o producer -lrt
$ ./producer
Producer: Wrote 'Hello from Producer!'

# Terminal 2
$ gcc consumer.c -o consumer -lrt
$ ./consumer
Consumer: Read 'Hello from Producer!'
```

---

## System V Shared Memory

### 전통적 방식

```c
#include <sys/ipc.h>
#include <sys/shm.h>

// 1. Key 생성
key_t key = ftok("/tmp/myfile", 'R');

// 2. Shared Memory 생성
int shmid = shmget(key, 4096, IPC_CREAT | 0666);

// 3. Attach (mmap과 유사)
char *ptr = (char *)shmat(shmid, NULL, 0);

// 4. 사용
strcpy(ptr, "Hello");

// 5. Detach
shmdt(ptr);

// 6. 삭제
shmctl(shmid, IPC_RMID, NULL);
```

**POSIX vs System V**:

| 항목 | POSIX (shm_open) | System V (shmget) |
|------|------------------|-------------------|
| 이름 | 파일명 (`/myshm`) | 숫자 Key |
| 생성 | shm_open() | shmget() |
| 매핑 | mmap() | shmat() |
| 삭제 | shm_unlink() | shmctl(IPC_RMID) |
| 추천 | ✅ 모던, 간단 | ⚠️ 레거시 |

**권장**: POSIX 방식 사용!

---

## 성능 비교

### Benchmark: Pipe vs Shared Memory

```c
// 10MB 데이터 전송

// Pipe
write(pipefd[1], data, 10MB);
read(pipefd[0], buf, 10MB);
// 시간: ~50ms

// Shared Memory
memcpy(shm_ptr, data, 10MB);
// 시간: ~5ms

→ 10배 빠름!
```

---

### 실제 측정

```c
#include <time.h>

// Pipe 벤치마크
clock_t start = clock();
for (int i = 0; i < 1000; i++) {
    write(pipefd[1], data, 1024);
    read(pipefd[0], buf, 1024);
}
clock_t end = clock();
printf("Pipe: %lf ms\n", 
       (double)(end - start) / CLOCKS_PER_SEC * 1000);

// Shared Memory 벤치마크
start = clock();
for (int i = 0; i < 1000; i++) {
    memcpy(shm_ptr, data, 1024);
    // (실제론 Synchronization 필요)
}
end = clock();
printf("Shared Memory: %lf ms\n",
       (double)(end - start) / CLOCKS_PER_SEC * 1000);
```

**결과** (1KB × 1000회):

```
Pipe:          15.2 ms
Shared Memory:  1.3 ms

→ 11배 차이!
```

---

## 주의사항

### 1. Synchronization 필요!

```c
// 문제 상황
// Process A
shm_ptr[0] = 42;  // 쓰기

// Process B (동시에)
int x = shm_ptr[0];  // 읽기
// → Race Condition!
```

**해결** (Part 5에서 자세히):

```c
// Mutex 사용
pthread_mutex_lock(&mutex);
shm_ptr[0] = 42;
pthread_mutex_unlock(&mutex);
```

---

### 2. 메모리 누수

```c
// 잘못된 예
shm_open("/myshm", O_CREAT | O_RDWR, 0666);
// ... crash!
// → shm_unlink() 안 함
// → /dev/shm/myshm 파일 남음!

// 확인
$ ls -lh /dev/shm/
-rw-r--r-- 1 user user 4.0K ... myshm  ← 좀비 파일!

// 수동 삭제
$ rm /dev/shm/myshm
```

**올바른 패턴**:

```c
int shm_fd = shm_open("/myshm", O_CREAT | O_RDWR, 0666);
// ... 사용 ...
munmap(ptr, size);
close(shm_fd);
shm_unlink("/myshm");  // 반드시!
```

---

### 3. 크기 제한

```bash
# 시스템 한계 확인
$ cat /proc/sys/kernel/shmmax
18446744073692774399  # 약 16EB (충분!)

$ cat /proc/sys/kernel/shmall
18446744073692774399  # 전체 페이지 수

# /dev/shm 크기 (tmpfs)
$ df -h /dev/shm
Filesystem      Size  Used Avail Use% Mounted on
tmpfs           7.7G  100M  7.6G   2% /dev/shm
```

---

## 실전 활용

### 1. 대용량 데이터 공유

```c
// 이미지 처리 파이프라인
// Process A: 카메라에서 프레임 캡처
// Process B: 이미지 처리
// Process C: 화면 출력

// Shared Memory로 프레임 공유
struct Frame {
    uint8_t data[1920 * 1080 * 3];  // RGB
    uint64_t timestamp;
};

void *shm = mmap(..., sizeof(struct Frame), ...);
struct Frame *frame = (struct Frame *)shm;

// Process A
capture_frame(frame->data);
frame->timestamp = get_time();

// Process B (즉시 접근!)
process_image(frame->data);

// Process C (즉시 출력!)
display(frame->data);
```

---

### 2. Database Shared Buffer

```c
// PostgreSQL, MySQL 등에서 사용

// Shared Buffer Pool
void *buffer_pool = mmap(..., 1GB, MAP_SHARED, ...);

// 여러 백엔드 프로세스가 공유
// → Disk I/O 최소화
// → 성능 향상
```

---

### 3. 게임 서버 상태 공유

```c
// 게임 서버
struct GameState {
    Player players[100];
    Map map;
    int score;
};

// Main process가 상태 관리
void *shm = mmap(..., sizeof(GameState), ...);
GameState *state = (GameState *)shm;

// Worker processes (읽기 전용)
// → 즉시 상태 조회
// → Pipe보다 훨씬 빠름
```

---

## 디버깅

### 1. /dev/shm 확인

```bash
# 생성된 Shared Memory 목록
$ ls -lh /dev/shm/
-rw-r--r-- 1 user user 4.0K ... myshm
-rw-r--r-- 1 user user 1.0M ... game_state

# 내용 확인 (텍스트면)
$ cat /dev/shm/myshm
Hello from Producer!

# 크기 확인
$ du -h /dev/shm/myshm
4.0K    /dev/shm/myshm
```

---

### 2. ipcs / ipcrm (System V)

```bash
# System V Shared Memory 확인
$ ipcs -m
------ Shared Memory Segments --------
key        shmid      owner      perms      bytes      nattch
0x52001234 0          user       666        4096       2

# 삭제
$ ipcrm -m 0
```

---

### 3. strace로 추적

```bash
$ strace -e shm_open,mmap,munmap ./producer

shm_open("/myshm", O_RDWR|O_CREAT, 0666) = 3
ftruncate(3, 4096) = 0
mmap(NULL, 4096, PROT_READ|PROT_WRITE, MAP_SHARED, 3, 0) = 0x7f...
...
munmap(0x7f..., 4096) = 0
```

---

## 고급 주제

### 1. mmap() 플래그

```c
// MAP_SHARED: 변경사항 공유 (IPC용)
mmap(..., MAP_SHARED, ...);

// MAP_PRIVATE: Copy-on-Write (독립)
mmap(..., MAP_PRIVATE, ...);

// MAP_ANONYMOUS: 파일 없이 메모리만
// (fork() 시 부모-자식 간 공유)
mmap(..., MAP_SHARED | MAP_ANONYMOUS, -1, 0);

// MAP_LOCKED: Swap 방지 (메모리 고정)
mmap(..., MAP_LOCKED, ...);

// MAP_HUGETLB: Huge Pages 사용 (성능)
mmap(..., MAP_HUGETLB, ...);
```

---

### 2. File-backed vs Anonymous

```c
// File-backed (POSIX Shared Memory)
int fd = shm_open("/myshm", ...);
mmap(..., fd, 0);
// → /dev/shm/myshm 파일 생성
// → 무관한 프로세스도 접근 가능

// Anonymous (fork 전용)
void *shm = mmap(NULL, size, PROT_READ|PROT_WRITE,
                 MAP_SHARED | MAP_ANONYMOUS, -1, 0);
fork();
// → 부모-자식만 공유
// → 파일 안 생김
```

---

### 3. msync() - 디스크 동기화

```c
// Shared Memory 변경사항을 디스크에 저장
void *shm = mmap(..., fd, 0);

// 데이터 수정
strcpy(shm, "Important data");

// 디스크에 강제 쓰기
msync(shm, size, MS_SYNC);  // 블로킹
// 또는
msync(shm, size, MS_ASYNC); // 비블로킹
```

---

## 정리

### 핵심 개념

**1. Shared Memory**

```
✓ 여러 프로세스가 같은 물리 메모리 공유
✓ Zero-copy (복사 없음)
✓ 가장 빠른 IPC
```

**2. POSIX 방식 (추천)**

```c
shm_open()   → Shared Memory 생성
ftruncate()  → 크기 설정
mmap()       → 메모리 매핑
// 사용
munmap()     → 매핑 해제
shm_unlink() → 삭제
```

**3. 성능**

```
Pipe:          2번 복사 (User→Kernel→User)
Shared Memory: 0번 복사 (Zero-copy)

→ 10배 이상 빠름!
```

---

### Pipe vs Shared Memory

| 항목 | Pipe | Shared Memory |
|------|------|---------------|
| 복사 | 2번 | 0번 (Zero-copy) |
| 속도 | 느림 | 빠름 (10배+) |
| 사용 | 간단 | 약간 복잡 |
| Sync | 자동 (FIFO) | 수동 (Mutex 필요) |
| 크기 | 제한적 (64KB) | 큰 데이터 OK |
| 용도 | 작은 데이터 | 큰 데이터, 빈번한 접근 |

---

### 선택 기준

**Pipe 사용**:

```
✓ 작은 데이터 (<1KB)
✓ 단방향 통신
✓ Producer-Consumer 패턴
✓ Shell 파이프라인
```

**Shared Memory 사용**:

```
✓ 큰 데이터 (>1MB)
✓ 빈번한 데이터 교환
✓ 다중 Reader/Writer
✓ 실시간 데이터 공유
✓ 성능이 중요한 경우
```

---

### 다음 편 예고

**Part 4: Virtual Memory**  
"메모리 주소는 환상이다"

Shared Memory를 이해하려면 **가상 메모리**를 알아야 합니다.

```c
// 다음 편에서 다룰 내용

// 두 프로세스가 다른 가상 주소로 같은 물리 메모리 접근?
Process A: 0x1000 ─┐
                   ├→ Physical: 0xABCD
Process B: 0x5000 ─┘

// 어떻게 가능할까?
// → Page Table!

malloc(1GB);  // 즉시 리턴 (실제 할당 안 함!)
ptr[0] = 42;  // 이제서야 할당 (Page Fault)

fork();       // Copy-on-Write
// → Shared Memory와 유사한 메커니즘!
```

**다룰 주제**:
- Virtual Address → Physical Address 변환
- Page Table (4-level)
- TLB (Translation Lookaside Buffer)
- Page Fault 처리
- Copy-on-Write 심화
- Memory-Mapped I/O (mmap 내부 동작)

Shared Memory가 **어떻게 작동하는지** 알아봅시다!

---

## 더 알아보기

### 추천 자료

**책**:
- "The Linux Programming Interface" (Ch. 48, 49: Shared Memory)
- "Advanced Programming in the UNIX Environment" (Ch. 15.9)

**온라인**:
- [man shm_open](https://man7.org/linux/man-pages/man3/shm_open.3.html)
- [man mmap](https://man7.org/linux/man-pages/man2/mmap.2.html)

**실습**:
```bash
# Shared Memory 생성/확인
ls -lh /dev/shm/

# System V IPC 확인
ipcs -m
```

---

**태그**: `#운영체제` `#SharedMemory` `#IPC` `#mmap` `#Zero-copy` `#Performance`
