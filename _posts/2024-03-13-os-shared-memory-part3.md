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

Shared Memory는 말 그대로 **여러 프로세스가 같은 물리 메모리 영역을 공유**하는 방식이에요.  
즉, 한 프로세스가 메모리에 쓴 데이터가 **즉시 다른 프로세스에서도 보인다**는 뜻이죠.  

```bash 
Process A                      Process B
VA: 0x1000                     VA: 0x5000
   ↓                               ↓
   └──→ Physical Memory: 0xABCD ←──┘
         (Same location!)
```

여기서 중요한 특징은 **Zero-copy**라는 점입니다.  
Pipe처럼 데이터를 커널로 보내고 다시 가져오는 과정이 없어요.  
즉, **복사 비용 0**으로 데이터를 공유할 수 있어서 대용량 IPC에 강력합니다.

---

### Pipe vs Shared Memory

Pipe를 쓸 때 데이터가 이동하는 경로를 생각해보면, 실제로는 이렇게 돼요:


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


즉, **User → Kernel → User**로 두 번 복사되는 셈이죠.  
이게 작은 데이터는 문제없지만, 수 MB 단위 데이터가 오가면 성능이 눈에 띄게 떨어집니다.

반면 Shared Memory는 이렇게 동작합니다:


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

Zero-copy IPC 덕분에 Pipe보다 **10배 이상 빠른 속도**를 낼 수 있어요.  

---


### POSIX Shared Memory: `shm_open` + `mmap`

POSIX Shared Memory는 비교적 간단합니다.  
1. `shm_open()`으로 **Shared Memory 객체 생성**  
2. `ftruncate()`로 크기 지정  
3. `mmap()`으로 메모리 매핑 → 실제 메모리에 접근  
4. 작업 끝나면 `munmap()` + `close()` + `shm_unlink()`로 정리  

```c
#include <sys/mman.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>

int main() {
    // 1. Shared Memory 생성
    int shm_fd = shm_open("/myshm", O_CREAT | O_RDWR, 0666);
    ftruncate(shm_fd, 4096); // 4KB

    // 2. 메모리 매핑
    char *ptr = mmap(NULL, 4096, PROT_READ | PROT_WRITE,
                     MAP_SHARED, shm_fd, 0);

    // 3. 데이터 쓰기
    sprintf(ptr, "Hello, Shared Memory!");
    printf("Wrote: %s\n", ptr);

    // 4. 정리
    munmap(ptr, 4096);
    close(shm_fd);
    shm_unlink("/myshm");

    return 0;
}
```

여기서 **`MAP_SHARED`**를 쓰면, Process A가 쓴 내용이 Process B에서 바로 보이게 됩니다.  
즉, **커널 복사 없이 직접 접근**이 가능하다는 뜻이죠.

---

### 성능 차이 예시

Pipe로 10MB 데이터를 전송한다고 가정하면, 실제로는 두 번 복사되어 약 **50ms** 정도 걸립니다.  
반면 Shared Memory에서는 **한 번 접근만으로 전달**되기 때문에 약 **5ms**, 10배 이상 빠른 결과가 나옵니다.

~~~
Pipe:          User → Kernel → User (2번 복사)
Shared Memory: 직접 접근! (0번 복사)
~~~

이처럼 대용량 데이터를 다루거나, 프로세스 간 빈번하게 데이터를 교환해야 하는 경우 Shared Memory가 확실히 유리합니다.

---
## 실전 예제: Producer-Consumer

Shared Memory를 이해하려면 직접 데이터를 주고받는 예제를 보는 게 가장 직관적입니다.  
이번에는 **Producer가 데이터를 쓰고, Consumer가 읽는 간단한 예제**를 만들어보겠습니다.

---

### Producer (쓰기)

Producer는 Shared Memory를 생성하고 데이터를 씁니다.

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
    if (shm_fd == -1) { perror("shm_open"); exit(1); }

    // 2. 크기 설정 (4KB)
    if (ftruncate(shm_fd, 4096) == -1) { perror("ftruncate"); exit(1); }

    // 3. 메모리 매핑
    char *ptr = mmap(NULL, 4096, PROT_READ | PROT_WRITE,
                     MAP_SHARED, shm_fd, 0);
    if (ptr == MAP_FAILED) { perror("mmap"); exit(1); }

    // 4. 데이터 쓰기
    sprintf(ptr, "Hello from Producer!");
    printf("Producer: Wrote '%s'\n", ptr);

    // 5. 정리
    munmap(ptr, 4096);
    close(shm_fd);

    return 0;
}
```

---

### Consumer (읽기)

Consumer는 기존 Shared Memory를 열어 데이터를 읽습니다.

```c
#include <stdio.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <unistd.h>

int main() {
    // 1. 기존 Shared Memory 열기
    int shm_fd = shm_open("/myshm", O_RDONLY, 0666);
    if (shm_fd == -1) { perror("shm_open"); return 1; }

    // 2. 메모리 매핑
    char *ptr = mmap(NULL, 4096, PROT_READ,
                     MAP_SHARED, shm_fd, 0);
    if (ptr == MAP_FAILED) { perror("mmap"); return 1; }

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

---

### 실행 방법

터미널을 두 개 열고, 먼저 Producer를 실행한 뒤 Consumer를 실행하면 됩니다.

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

이 예제에서 보듯이, **커널 복사 없이 직접 메모리를 공유**하기 때문에 Pipe보다 훨씬 빠르게 데이터를 주고받을 수 있습니다.  

---

## Pipe vs Shared Memory 성능 비교

Pipe는 편리하지만, 데이터를 주고받을 때 **User → Kernel → User**로 2번 복사됩니다.  
Shared Memory는 **커널 복사 없이 Zero-copy**로 바로 접근 가능하죠.  
그래서 데이터가 많을수록 차이가 크게 납니다.

---

### Pipe 벤치마크 예제

```c
#include <stdio.h>
#include <unistd.h>
#include <string.h>
#include <time.h>

int main() {
    int pipefd[2];
    if (pipe(pipefd) == -1) { perror("pipe"); return 1; }

    char data[1024];
    char buf[1024];
    memset(data, 'A', sizeof(data));

    clock_t start = clock();

    for (int i = 0; i < 1000; i++) {
        write(pipefd[1], data, sizeof(data));
        read(pipefd[0], buf, sizeof(buf));
    }

    clock_t end = clock();
    printf("Pipe: %lf ms\n", 
           (double)(end - start) / CLOCKS_PER_SEC * 1000);

    return 0;
}
```

~~~

**결과** 예시 (1KB × 1000회 전송):
Pipe: 15.2 ms

~~~



---

### Shared Memory 벤치마크 예제

```c
#include <stdio.h>
#include <string.h>
#include <sys/mman.h>
#include <fcntl.h>
#include <unistd.h>
#include <time.h>

int main() {
    int shm_fd = shm_open("/myshm", O_CREAT | O_RDWR, 0666);
    ftruncate(shm_fd, 1024);

    char *shm_ptr = mmap(NULL, 1024, PROT_READ | PROT_WRITE,
                         MAP_SHARED, shm_fd, 0);

    char data[1024];
    memset(data, 'A', sizeof(data));

    clock_t start = clock();

    for (int i = 0; i < 1000; i++) {
        memcpy(shm_ptr, data, sizeof(data));
        // 실제로는 Synchronization 필요
    }

    clock_t end = clock();
    printf("Shared Memory: %lf ms\n",
           (double)(end - start) / CLOCKS_PER_SEC * 1000);

    munmap(shm_ptr, 1024);
    close(shm_fd);
    shm_unlink("/myshm");

    return 0;
}
```

~~~

**결과** 예시:
Shared Memory: 1.3 ms

~~~



---

### 결론

| 항목 | Pipe | Shared Memory |
|------|------|---------------|
| 복사 | 2번 (User→Kernel→User) | 0번 (Zero-copy) |
| 속도 | 느림 | 빠름 (10배 이상) |
| 데이터 크기 | 제한적 (64KB 정도) | 큰 데이터도 OK |
| Sync | FIFO 자동 | 수동 (Mutex 필요) |

**정리**:  
- **작은 데이터, 단순 통신** → Pipe  
- **대용량 데이터, 빠른 접근 필요** → Shared Memory  

---

## Shared Memory와 Synchronization

Shared Memory는 빠르지만, 여러 프로세스가 동시에 접근하면 **Race Condition**이 발생할 수 있어요.  
즉, 한 프로세스가 데이터를 쓰는 동안 다른 프로세스가 읽거나 쓰면 **예상치 못한 값**이 읽힐 수 있습니다.

---

### 문제 상황 예제

~~~
shm_ptr[0] = 42;  // Process A가 쓰는 중

// 동시에 Process B가 읽으면?
int x = shm_ptr[0];
// → x가 42가 아닐 수도 있음!
~~~

**결과**: 데이터 불일치 발생 → 프로그램 버그로 이어질 수 있음

---

### POSIX Mutex를 사용한 해결

Shared Memory 영역 내에 **pthread_mutex_t**를 넣어 동기화합니다.

#### 초기화

```c
#include <pthread.h>
#include <sys/mman.h>
#include <fcntl.h>
#include <unistd.h>

typedef struct {
    pthread_mutex_t mutex;
    int value;
} shm_data_t;

int main() {
    int shm_fd = shm_open("/myshm", O_CREAT | O_RDWR, 0666);
    ftruncate(shm_fd, sizeof(shm_data_t));

    shm_data_t *shm_ptr = mmap(NULL, sizeof(shm_data_t),
                               PROT_READ | PROT_WRITE,
                               MAP_SHARED, shm_fd, 0);

    // Mutex 초기화 (다중 프로세스 공유)
    pthread_mutexattr_t attr;
    pthread_mutexattr_init(&attr);
    pthread_mutexattr_setpshared(&attr, PTHREAD_PROCESS_SHARED);
    pthread_mutex_init(&shm_ptr->mutex, &attr);

    return 0;
}
```

#### 사용 예제

```c
void write_value(shm_data_t *ptr, int val) {
    pthread_mutex_lock(&ptr->mutex);
    ptr->value = val;
    pthread_mutex_unlock(&ptr->mutex);
}

int read_value(shm_data_t *ptr) {
    pthread_mutex_lock(&ptr->mutex);
    int val = ptr->value;
    pthread_mutex_unlock(&ptr->mutex);
    return val;
}
```

> **포인트**: Mutex를 사용하면 한 번에 한 프로세스만 데이터에 접근 가능 → Race Condition 방지

---

### System V Semaphores 예제

POSIX Mutex 대신 전통적인 **System V Semaphore**도 사용 가능:

```c
#include <sys/sem.h>
#include <sys/ipc.h>

key_t key = ftok("/tmp/myfile", 'R');
int semid = semget(key, 1, IPC_CREAT | 0666);

// Semaphore 초기화
union semun {
    int val;
} arg;
arg.val = 1;
semctl(semid, 0, SETVAL, arg);

// 사용
struct sembuf sb = {0, -1, 0};  // P 연산 (wait)
semop(semid, &sb, 1);

shm_ptr->value = 42;             // critical section

sb.sem_op = 1;                   // V 연산 (signal)
semop(semid, &sb, 1);
```

> **팁**: POSIX Mutex가 더 간단하고, 다중 프로세스 환경에서도 안전하게 사용 가능

---

### 요약

- Shared Memory는 **Zero-copy로 빠르지만**, 동시에 접근하면 **Race Condition** 위험
- **POSIX Mutex**나 **Semaphore**를 통해 안전하게 동기화 필요
- Synchronization 없이는 데이터 손상 가능 → 실전에서 반드시 적용

---
---

## 정리

이번 글에서는 Pipe의 한계를 극복하는 **Shared Memory**를 살펴봤습니다. 핵심 내용을 정리하면 다음과 같습니다.

### 1. Shared Memory 특징
- 여러 프로세스가 같은 물리 메모리를 **직접 공유**  
- **Zero-copy**: 데이터 복사 없이 IPC 가능  
- 대용량 데이터 전달과 빈번한 접근에서 **가장 빠른 IPC 방식**

### 2. POSIX 방식 (추천)

```c
shm_open()   // Shared Memory 생성
ftruncate()  // 크기 설정
mmap()       // 메모리 매핑
// 사용 후
munmap()     // 매핑 해제
shm_unlink() // 삭제
```


### 3. Pipe와 비교
| 항목 | Pipe | Shared Memory |
|------|------|---------------|
| 데이터 복사 | 2번 (User→Kernel→User) | 0번 (Zero-copy) |
| 속도 | 느림 | 빠름 (10배 이상) |
| 사용 난이도 | 간단 | 약간 복잡 |
| 동기화 | 자동(FIFO) | 수동(Mutex 필요) |
| 크기 | 제한적 (64KB) | 큰 데이터 가능 |
| 용도 | 작은 데이터, 단방향 | 큰 데이터, 다중 프로세스, 실시간 공유 |

### 4. 선택 기준
**Pipe**
~~~
✓ 작은 데이터 (<1KB)
✓ 단방향 통신
✓ 간단한 Producer-Consumer
✓ Shell 파이프라인
~~~
**Shared Memory**
~~~
✓ 큰 데이터 (>1MB)
✓ 빈번한 데이터 교환
✓ 다중 Reader/Writer
✓ 실시간 데이터 공유
✓ 성능이 중요한 경우
~~~

---

## 다음 글 예고

**Part 4: Virtual Memory – "메모리 주소는 환상이다"**  

Shared Memory가 어떻게 가능했는지 이해하려면 **가상 메모리(Virtual Memory)**를 알아야 합니다.  
다음 글에서는 다음을 다룹니다:

- Virtual Address → Physical Address 변환
- Page Table (4-level paging)
- TLB (Translation Lookaside Buffer)
- Page Fault 처리
- Copy-on-Write 심화
- Memory-Mapped I/O 내부 동작

Shared Memory와 가상 메모리의 연결 고리를 이해하며, OS 내부 메모리 구조를 깊이 있게 들여다보겠습니다.

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
