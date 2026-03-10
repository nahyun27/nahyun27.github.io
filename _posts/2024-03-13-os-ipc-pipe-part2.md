---
layout: post
title: "[운영체제 Deep Dive #2] ls | grep .c는 어떻게 동작할까? - Pipe와 IPC의 모든 것"
date: 2024-03-13 14:00:00 +0900
categories: [Operating System, IPC]
tags: [operating-system, linux, ipc, pipe, dup2, file-descriptor, signal, nsh]
description: "운영체제 Deep Dive #2 – Pipe와 IPC: ls | grep 동작, 파이프, dup2, 파일 디스크립터, 신호 처리까지."
image:
  path: /assets/img/os/pipe-ipc.png
  alt: Inter-Process Communication with Pipes
math: false
mermaid: true
series: 운영체제 Deep Dive
---

## 들어가며

오늘은 **IPC (Inter-Process Communication)**, 특히 **Pipe**를 파헤쳐봅시다.

터미널에서 우리는 다음과 같은 명령을 매우 자주 사용합니다.

```bash
ls | grep .c
```

이 명령은 직관적으로 보면 다음과 같은 의미입니다.

- `ls`가 현재 디렉토리의 파일 목록을 출력하고
- 그 결과를 `grep .c`가 받아서
- `.c`가 포함된 파일만 필터링합니다.

즉,

```bash
ls의 출력 → grep의 입력
```

이라는 **데이터 흐름**이 만들어집니다.

---

### 프로그램 두 개가 동시에 동작한다

이 명령이 실행되면 실제로는 **두 개의 프로그램이 동시에 실행됩니다.**

```bash
ls
grep .c
```

그리고 이 두 프로그램 사이에는 다음과 같은 연결이 생깁니다.

```bash
ls (stdout)
     │
     │ pipe
     ▼
grep (stdin)
```

여기서 중요한 점은 다음입니다.

- `ls`는 결과를 **표준 출력(stdout)** 으로 출력합니다.
- `grep`은 데이터를 **표준 입력(stdin)** 으로 읽습니다.

그리고 Shell은 이 둘을 **Pipe**로 연결합니다.

---

### 그렇다면 Shell은 무엇을 할까?

이 명령을 실행하기 위해 Shell은 다음과 같은 작업을 수행합니다.

1. Pipe 생성
2. 두 개의 프로세스 생성 (`fork()` 두 번)
3. 각 프로세스의 입출력 재연결 (`dup2()`)
4. 각각의 프로그램 실행 (`exec()`)

흐름을 단순화하면 다음과 같습니다.

```
Shell
 │
 │ pipe()
 ▼
Pipe 생성
 │
 ├─ fork() → ls 프로세스
 │
 └─ fork() → grep 프로세스
```

그리고 각각의 프로세스에서 입출력이 다음과 같이 연결됩니다.

```
ls stdout  ─────┐
                │
             [ Pipe ]
                │
grep stdin ─────┘
```

이 구조 덕분에 `ls`가 출력하는 데이터가 **실시간으로 `grep`에게 전달**됩니다.

---

### 이 모든 것이 IPC

이렇게 **프로세스 간에 데이터를 전달하는 기술**을 운영체제에서는 다음과 같이 부릅니다.

> **IPC (Inter-Process Communication)**

즉,

**프로세스 간 통신**입니다.

Linux에서는 다양한 IPC 방법이 존재합니다.

대표적으로 다음과 같은 것들이 있습니다.

- Pipe
- Named Pipe (FIFO)
- Message Queue
- Shared Memory
- Socket
- Signal

이 글에서는 그중에서도 **가장 기본적이고 중요한 IPC인 Pipe**를 집중적으로 살펴보겠습니다.

---

## Pipe란 무엇인가

Pipe는 **두 프로세스 사이에 데이터를 전달하기 위한 커널 버퍼**입니다.

개념적으로 보면 다음과 같습니다.

```
Process A
   │ write()
   ▼
[ Kernel Pipe Buffer ]
   ▲
   │ read()
Process B
```

특징은 다음과 같습니다.

- **한쪽은 쓰기(write)**
- **다른 쪽은 읽기(read)**

즉 **단방향 데이터 흐름**입니다.

그리고 이 Pipe는 커널이 관리합니다.

---

### pipe() 시스템 콜

Pipe를 만들기 위해 Linux에서는 다음 시스템 콜을 사용합니다.

```bash
int pipe(int fd[2]);
```

이 함수는 **두 개의 파일 디스크립터**를 반환합니다.

```bash
fd[0] → 읽기(Read End)
fd[1] → 쓰기(Write End)
```

구조를 그림으로 보면 다음과 같습니다.

```bash
Process
 │
 │ pipe(fd)
 ▼

fd[0]  ← read
 │
[ PIPE BUFFER ]
 │
fd[1]  → write
```

즉

- `fd[1]` 로 데이터를 쓰면
- `fd[0]` 에서 읽을 수 있습니다.

---

### 그런데 ls는 pipe를 모르는데?

여기서 중요한 질문이 하나 생깁니다.

`ls` 프로그램은 **Pipe의 존재를 전혀 모릅니다.**

`ls`는 단순히 다음처럼 동작할 뿐입니다.

```c
printf(...)
write(STDOUT, ...)
```

즉 `ls`는 단지 **표준 출력(stdout)** 으로 데이터를 보내고 있을 뿐입니다.

그렇다면 어떻게 `ls`의 출력이 **Pipe로 들어갈 수 있을까요?**

이 질문을 이해하려면 먼저 **Linux의 입출력 구조**를 알아야 합니다.

핵심 개념이 바로 **File Descriptor** 입니다.

---

## File Descriptor

Linux에서 모든 입출력은 **File Descriptor(FD)** 라는 정수 번호로 관리됩니다.

File Descriptor는 **프로세스가 열어둔 파일이나 입출력 자원을 가리키는 핸들**입니다.

예를 들어 프로그램이 실행되면 기본적으로 다음 세 가지 FD가 열려 있습니다.

```
0 → stdin   (표준 입력)
1 → stdout  (표준 출력)
2 → stderr  (표준 에러)
```

즉 우리가 터미널에서 프로그램을 실행하면 다음과 같은 구조가 됩니다.

```
Keyboard
   │
   ▼
stdin (0)

stdout (1)
   │
   ▼
Terminal 화면

stderr (2)
   │
   ▼
Terminal 화면
```

예를 들어 `ls` 프로그램은 단순히 다음처럼 출력할 뿐입니다.

```c
write(1, "file1.c\n", 8);
```

여기서 `1`은 **stdout**을 의미합니다.

즉 `ls`는 단지 **표준 출력으로 데이터를 보내고 있을 뿐**입니다.

---

### 그런데 파이프에서는 무슨 일이 일어날까?

다시 우리가 처음 본 명령을 보겠습니다.

```bash
ls | grep .c
```

이 명령의 핵심은 다음과 같습니다.

```bash
ls stdout → grep stdin
```

즉

- `ls`의 **stdout (FD 1)**
- `grep`의 **stdin (FD 0)**

이 둘이 **Pipe로 연결**되어야 합니다.

개념적으로 보면 다음과 같습니다.

```
ls (FD 1)
   │
   ▼
[ PIPE ]
   ▲
   │
grep (FD 0)
```

하지만 기본적으로

- stdout은 **터미널**
- stdin은 **키보드**

에 연결되어 있습니다.

따라서 Shell은 **File Descriptor를 다른 곳으로 바꿔야 합니다.**

이 작업을 수행하는 시스템 콜이 바로

```bash
dup2()
```

입니다.

---

## dup2()로 입출력 재연결하기

이제 Shell이 어떻게 **stdout을 Pipe로 바꾸는지** 살펴보겠습니다.

이를 위해 사용하는 시스템 콜이 바로 다음 함수입니다.

```c
int dup2(int oldfd, int newfd);
```

`dup2()`는 **File Descriptor를 복제하여 다른 번호로 연결하는 함수**입니다.

동작은 다음과 같습니다.

```c
dup2(oldfd, newfd)
```

의 의미는

```
newfd → oldfd가 가리키는 대상과 동일한 곳을 가리키도록 만든다
```

입니다.

예를 들어 다음 코드가 있다고 가정해보겠습니다.

```c
dup2(pipefd[1], 1);
```

이 코드는 다음과 같은 의미입니다.

```
stdout(1) → pipefd[1]
```

즉 **표준 출력(stdout)이 Pipe의 write end로 바뀝니다.**

구조를 보면 다음과 같습니다.

```
Before

stdout (1)
   │
   ▼
Terminal
```

```
After

stdout (1)
   │
   ▼
Pipe write end
```

이제 프로그램이 `printf()`나 `write(1, ...)`를 호출하면  
데이터는 **터미널이 아니라 Pipe로 들어가게 됩니다.**

---

### grep 쪽에서는 어떻게 될까?

이번에는 `grep` 프로세스를 생각해 보겠습니다.

`grep`은 입력을 **stdin**으로 읽습니다.

예를 들어 내부적으로 다음과 같은 호출을 합니다.

```c
read(0, buffer, size);
```

여기서 `0`은 **stdin**을 의미합니다.

Shell은 이 stdin을 다음과 같이 바꿉니다.

```c
dup2(pipefd[0], 0);
```

즉

```
stdin (0) → Pipe read end
```

이 됩니다.

구조를 보면 다음과 같습니다.

```
Pipe write end
        │
        ▼
     [ PIPE ]
        │
        ▼
Pipe read end
        │
        ▼
stdin (0) → grep
```

결과적으로 전체 연결은 다음과 같습니다.

```
ls stdout (1)
      │
      ▼
   pipe write
      │
   [ PIPE ]
      │
   pipe read
      ▼
grep stdin (0)
```

이제 `ls`가 출력한 데이터는 **Pipe를 통해 바로 `grep`으로 전달**됩니다.

---

## 중간 정리

Shell은 파이프라인을 만들기 위해 다음 작업을 수행합니다.

```
1. pipe() 생성
2. fork() 로 프로세스 생성
3. dup2() 로 입출력 재연결
4. exec() 로 프로그램 실행
```

즉 `ls | grep .c` 명령은 내부적으로 다음과 같은 구조로 실행됩니다.

```
ls (stdout)
    │
    ▼
 [ Pipe ]
    ▲
    │
grep (stdin)
```

---

## File Descriptor 변화 과정

`ls | grep .c` 실행 중 각 프로세스의 File Descriptor 테이블은 단계적으로 변화합니다.

Shell이 내부적으로 수행하는 작업을 순서대로 보면 다음과 같습니다.

---

### Step 1: pipe() 생성

먼저 Shell은 파이프를 생성합니다.

```c
int pipefd[2];
pipe(pipefd);
```

이때 두 개의 File Descriptor가 만들어집니다.

- `pipefd[0]` : 읽기 끝 (read end)
- `pipefd[1]` : 쓰기 끝 (write end)

부모 프로세스의 FD 테이블은 다음과 같습니다.

```
FD Table (Shell)

0 → keyboard
1 → terminal
2 → terminal
3 → pipe read
4 → pipe write
```

---

### Step 2: ls 프로세스 생성

이제 Shell은 첫 번째 명령어를 실행하기 위해 `fork()`를 호출합니다.

```c
pid = fork();
```

`fork()`가 호출되면 자식 프로세스는 **부모의 File Descriptor 테이블을 그대로 복사**합니다.

```
FD Table (ls process)

0 → keyboard
1 → terminal
2 → terminal
3 → pipe read
4 → pipe write
```

하지만 아직까지는 `ls`의 출력이 터미널로 향합니다.

---

### Step 3: stdout을 Pipe로 연결

이제 Shell은 `dup2()`를 이용하여 `stdout`을 파이프의 write end로 재연결합니다.

```c
dup2(pipefd[1], STDOUT_FILENO);
```

이 호출 이후 FD 테이블은 다음처럼 변합니다.

```
FD Table (ls process)

0 → keyboard
1 → pipe write
2 → terminal
```

이제 `ls`가 출력하는 모든 데이터는

```
stdout → pipe
```

로 전달됩니다.

`ls` 프로그램은 여전히 단순히

```c
write(1, ...)
```

를 호출할 뿐입니다.

하지만 **FD 1이 Pipe에 연결되어 있기 때문에 출력이 Pipe로 흘러가게 됩니다.**

---

### Step 4: grep 프로세스 생성

이제 Shell은 두 번째 명령어를 실행합니다.

```c
pid = fork();
```

그리고 `grep`의 `stdin`을 파이프의 read end에 연결합니다.

```c
dup2(pipefd[0], STDIN_FILENO);
```

이후 `grep`의 FD 테이블은 다음과 같습니다.

```
FD Table (grep process)

0 → pipe read
1 → terminal
2 → terminal
```

즉 데이터 흐름은 다음과 같습니다.

```
ls stdout → pipe → grep stdin
```

---

## Pipe 사용 시 주의할 점

### 왜 Pipe의 양쪽 끝을 닫아야 할까?

파이프를 사용할 때 매우 중요한 규칙이 있습니다.

**사용하지 않는 Pipe 끝은 반드시 닫아야 합니다.**

예를 들어 `ls` 프로세스는 읽기 끝을 사용할 필요가 없습니다.

따라서 다음과 같이 닫아야 합니다.

```c
close(pipefd[0]);
```

마찬가지로 `grep`은 write end를 사용하지 않습니다.

```c
close(pipefd[1]);
```

이 작업을 하지 않으면 문제가 발생할 수 있습니다.

#### Blocking 문제

파이프는 **모든 write end가 닫혀야 EOF를 전달합니다.**

만약 write end가 열려 있다면 `grep`은 계속 데이터를 기다리게 됩니다.

즉 프로그램이 **끝나지 않고 block 상태에 들어갈 수 있습니다.**

그래서 Shell은 항상

- 사용하지 않는 read end
- 사용하지 않는 write end

를 **명확하게 닫습니다.**


### Broken Pipe와 SIGPIPE

Pipe에서 **읽는 쪽 프로세스가 먼저 종료되면**  
쓰는 프로세스는 `SIGPIPE` 시그널을 받게 됩니다.

예를 들어 다음 명령을 보겠습니다.

```bash
yes | head -1
```

- yes → 무한히 문자열 출력
- head → 한 줄 읽고 즉시 종료

이 경우 `head`가 먼저 종료되면서 Pipe의 read end가 닫히게 됩니다.

그 이후 `yes`가 Pipe에 데이터를 쓰려고 하면  
커널은 `SIGPIPE`를 보내고 `yes` 프로세스는 종료됩니다.

이 현상은 **Broken Pipe**라고 불립니다.

---

## Shell이 `ls | grep .c` 파이프라인을 만드는 과정

이제 모든 개념이 준비되었습니다.

- `pipe()` : 프로세스 간 데이터 통로 생성
- `fork()` : 새로운 프로세스 생성
- `dup2()` : 표준 입출력 재연결
- `exec()` : 프로그램 실행

Shell은 이 네 가지 시스템 콜을 조합하여  
`ls | grep .c` 파이프라인을 생성합니다.

전체 구조는 다음과 같습니다.

```
        pipe()
          │
          ▼
     ┌───────────┐
     │   PIPE    │
     └───────────┘
       ▲       ▲
       │       │
   read end  write end
```

이 Pipe를 기준으로 **두 개의 프로세스가 생성됩니다.**

```
        ls (stdout)
            │
            ▼
        write end
           PIPE
        read end
            ▼
        grep (stdin)
```

즉 데이터 흐름은 다음과 같습니다.

```
ls → PIPE → grep
```

---

### Shell 내부 동작 순서

Shell은 실제로 다음 순서로 작업을 수행합니다.

```
1. pipe() 생성
2. fork() → 첫 번째 자식 프로세스 (ls)
3. fork() → 두 번째 자식 프로세스 (grep)
4. dup2()로 입출력 재연결
5. exec()로 프로그램 실행
```

이를 코드 형태로 단순화하면 다음과 같습니다.

```c
int pipefd[2];
pipe(pipefd);

pid_t pid1 = fork();

if (pid1 == 0) {
    dup2(pipefd[1], STDOUT_FILENO);
    close(pipefd[0]);
    execlp("ls", "ls", NULL);
}

pid_t pid2 = fork();

if (pid2 == 0) {
    dup2(pipefd[0], STDIN_FILENO);
    close(pipefd[1]);
    execlp("grep", "grep", ".c", NULL);
}

close(pipefd[0]);
close(pipefd[1]);

wait(NULL);
wait(NULL);
```

이 코드가 바로 Shell이 파이프라인을 만드는 **핵심 구조**입니다.

---

### 전체 실행 흐름

이 과정을 그림으로 정리하면 다음과 같습니다.

```bash
Shell
 │
 │ pipe()
 ▼
Pipe 생성
 │
 ├─ fork() → Child 1 (ls)
 │              │
 │              ├─ dup2(pipe write → stdout)
 │              └─ exec("ls")
 │
 └─ fork() → Child 2 (grep)
                │
                ├─ dup2(pipe read → stdin)
                └─ exec("grep .c")
```

이제 두 프로그램은 동시에 실행됩니다.

그리고 데이터는 다음과 같이 흐릅니다.

```bash
ls stdout
   │
   ▼
[ PIPE ]
   │
   ▼
grep stdin
```

즉 `ls`가 출력하는 데이터가 **실시간으로 `grep`에게 전달**됩니다.

---

### 우리가 사용한 시스템 콜

`ls | grep .c` 명령 하나에는 다음과 같은 시스템 콜이 사용됩니다.

```c
pipe()
fork()
dup2()
exec()
wait()
```

이 다섯 가지 시스템 콜이 함께 동작하면서  
Linux의 **파이프라인 메커니즘**이 만들어집니다.

---

### 마무리

우리가 단순히 입력한 명령

```c
ls | grep .c
```

은 실제로는 다음과 같은 복잡한 과정을 거칩니다.

```bash
pipe()  → 프로세스 간 통로 생성
fork()  → 두 개의 프로세스 생성
dup2()  → 표준 입출력 재연결
exec()  → 프로그램 실행
wait()  → 프로세스 종료 대기
```

이 모든 과정은 **Shell과 커널이 협력하여 매우 빠르게 수행**됩니다.

그래서 우리는 단순히 파이프(`|`) 하나만 사용했을 뿐이지만  
실제로는 **운영체제의 IPC 메커니즘 전체가 동작하고 있는 것**입니다.


---

## 실제로 확인해보기

### strace

지금까지는 개념과 코드 수준에서  
`ls | grep .c` 파이프라인이 어떻게 동작하는지 살펴보았습니다.

그렇다면 이 과정은 실제로도 확인할 수 있을까요?

Linux에서는 **`strace`** 라는 도구를 사용하면  
프로그램이 호출하는 **시스템 콜을 그대로 관찰**할 수 있습니다.

다음 명령을 실행해 보겠습니다.

```
strace -f ls | grep .c
```

여기서 `-f` 옵션은 **fork로 생성된 자식 프로세스까지 추적**하라는 의미입니다.

출력 일부를 보면 다음과 같은 시스템 콜들이 등장합니다.

```c
pipe([3,4])                    = 0
fork()                         = 12345
fork()                         = 12346
dup2(4, 1)                     = 1
dup2(3, 0)                     = 0
execve("/usr/bin/ls", ...)
execve("/usr/bin/grep", ...)
```

이 출력은 우리가 지금까지 설명한 흐름과 정확히 일치합니다.

```bash
pipe()
 → fork()
 → fork()
 → dup2()
 → exec()
```

즉 Shell은 실제로

1. Pipe를 만들고  
2. 두 개의 프로세스를 생성한 뒤  
3. 각각의 표준 입출력을 Pipe로 연결하고  
4. 프로그램을 실행합니다.


---

###  lsof 사용: 열린 File Descriptor 확인하기

특정 프로세스가 어떤 File Descriptor를 사용하고 있는지 확인하려면  
다음 명령을 사용할 수 있습니다.

```bash
lsof -p <PID>
```

#### /proc 파일 시스템 확인

Linux에서는 `/proc`에서도 확인할 수 있습니다.

```bash
ls -l /proc/<PID>/fd
```

예시 출력

```bash
1 -> pipe:[12345]
```

이 출력은 해당 File Descriptor가 **Pipe에 연결되어 있음**을 의미합니다.


---

### nsh 파이프 구현

nsh에서는 파이프를 다음과 같은 핵심 단계로 처리합니다.

1. 입력 명령을 `|` 기준으로 파이프라인으로 분리
2. 각 명령마다 `fork()` 생성
3. `dup2()`로 stdin/stdout을 파이프에 연결
4. 사용하지 않는 파이프 FD는 모두 `close()`
5. `execvp()`로 명령 실행

**핵심 코드 구조 예시**

```c
int pipes[N-1][2];
pipe(pipes[i]);
pid_t pid = fork();
if (pid == 0) {
    dup2(...);  // stdin/stdout 연결
    close(...); // 사용 안 하는 파이프 닫기
    execvp(...);
}
```

전체 구현과 예외 처리 등은 GitHub에서 확인 가능합니다:  
[https://github.com/nahyun27/linux-minishell](https://github.com/nahyun27/linux-minishell)

---

## 정리

이번 글에서는 다음과 같은 Linux의 핵심 메커니즘을 살펴보았습니다.

- **Pipe** : 프로세스 간 데이터 전달
- **File Descriptor** : Linux 입출력 추상화
- **dup2()** : 표준 입출력 재연결
- **fork()** : 프로세스 생성
- **exec()** : 프로그램 실행

이 모든 요소가 결합되어 **Shell의 파이프라인 기능**이 만들어집니다.

---

## 다음 글

이번 들에서는 **프로세스 간 데이터 전달(IPC)** 을 다뤘습니다.  
하지만 Pipe는 다음과 같은 한계를 가지고 있습니다.

- 데이터가 **커널 버퍼를 거쳐야 한다**
- 복사 비용이 발생한다
- 단방향 통신이다

다음 글에서는 이러한 한계를 해결하는 **더 강력한 IPC 메커니즘**을 살펴봅니다.

다음 주제:

> 운영체제 Deep Dive #3  
> Shared Memory는 왜 Pipe보다 빠를까?

- `shm_open`
- `mmap`
- Zero-copy IPC
- Pipe vs Shared Memory 성능 차이

운영체제가 제공하는 **가장 빠른 IPC 방식**을 함께 분석해보겠습니다.

---

## 더 알아보기

### 추천 자료
- [man 7 pipe](https://man7.org/linux/man-pages/man7/pipe.7.html)
- [man 2 dup2](https://man7.org/linux/man-pages/man2/dup2.2.html)
- [man 7 signal](https://man7.org/linux/man-pages/man7/signal.7.html)

**실습**:
- [nsh (Unix minishell)](https://github.com/nahyun27/linux-minishell) - 직접 구현한 Shell!

---

**태그**: `#운영체제` `#IPC` `#Pipe` `#dup2` `#Signal` `#nsh` `#Shell`
