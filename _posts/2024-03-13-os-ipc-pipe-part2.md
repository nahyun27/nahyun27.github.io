---
layout: post
title: "[운영체제 Deep Dive #2] ls | grep .c는 어떻게 동작할까? - Pipe와 IPC의 모든 것"
date: 2024-03-13 14:00:00 +0900
categories: [Operating System, IPC]
tags: [operating-system, linux, ipc, pipe, dup2, file-descriptor, signal, nsh]
image:
  path: /assets/img/os/pipe-ipc.png
  alt: Inter-Process Communication with Pipes
math: false
series: 운영체제 Deep Dive
---

## 들어가며

터미널에서 이 명령을 쳐보세요:

```bash
$ ls | grep .c
file1.c
file2.c
main.c
```

파일 목록 중 `.c`로 끝나는 것만 필터링됩니다. 너무나 자연스럽죠.

하지만 **어떻게** `ls`의 출력이 `grep`의 입력으로 연결될까요?

```c
// nsh에서 파이프 구현
int pipefd[2];
pipe(pipefd);           // 1. 파이프 생성

pid_t pid = fork();
if (pid == 0) {
    dup2(pipefd[1], STDOUT_FILENO);  // 2. stdout → pipe
    close(pipefd[0]);
    close(pipefd[1]);
    exec("ls");
}
else {
    dup2(pipefd[0], STDIN_FILENO);   // 3. pipe → stdin
    close(pipefd[0]);
    close(pipefd[1]);
    exec("grep");
}
```

이 **10줄**이 Unix의 철학이자 파워입니다!

오늘은 **IPC (Inter-Process Communication)**, 특히 **Pipe**를 파헤쳐봅시다.

---

## IPC란?

### Inter-Process Communication

**정의**: 프로세스 간 데이터 교환 메커니즘

**왜 필요한가?**

[Part 1](링크)에서 배웠듯이:
```
fork() 후:
부모와 자식의 메모리 공간은 독립!

int x = 10;
fork();
// 부모가 x = 20 해도
// 자식의 x는 여전히 10!
```

**프로세스 간 통신 방법 필요!**

---

### IPC 종류

| 방법 | 설명 | 속도 | 사용 |
|------|------|------|------|
| **Pipe** | 단방향 데이터 스트림 | 빠름 | Shell 파이프 |
| **Named Pipe (FIFO)** | 이름있는 파이프 | 빠름 | 무관한 프로세스 |
| **Message Queue** | 메시지 큐 | 중간 | 비동기 통신 |
| **Shared Memory** | 공유 메모리 | **매우 빠름** | 대용량 데이터 |
| **Socket** | 네트워크 통신 | 느림 | 네트워크/IPC |
| **Signal** | 이벤트 알림 | 빠름 | 프로세스 제어 |

**오늘의 주인공**: **Pipe** & **Signal**

---

## File Descriptor (파일 디스크립터)

### FD란?

**정의**: 열린 파일을 가리키는 **정수 인덱스**

```c
int fd = open("file.txt", O_RDONLY);
// fd = 3 (보통)

read(fd, buffer, size);
write(fd, data, size);
close(fd);
```

---

### 기본 FD (0, 1, 2)

```c
#define STDIN_FILENO  0  // 표준 입력 (키보드)
#define STDOUT_FILENO 1  // 표준 출력 (화면)
#define STDERR_FILENO 2  // 표준 에러 (화면)
```

**프로세스 시작 시 자동으로 열림!**

---

### FD Table

```
Process의 FD Table:
┌───┬──────────────┐
│ 0 │ → keyboard   │ STDIN
├───┼──────────────┤
│ 1 │ → terminal   │ STDOUT
├───┼──────────────┤
│ 2 │ → terminal   │ STDERR
├───┼──────────────┤
│ 3 │ → file.txt   │
├───┼──────────────┤
│ 4 │ → socket     │
├───┼──────────────┤
│ 5 │ → pipe[0]    │
└───┴──────────────┘
```

**FD는 프로세스마다 독립적!**

---

### FD 할당 규칙

**Lowest Available FD**:

```c
int fd1 = open("file1.txt", O_RDONLY);  // fd1 = 3
int fd2 = open("file2.txt", O_RDONLY);  // fd2 = 4

close(fd1);                              // fd 3 해제

int fd3 = open("file3.txt", O_RDONLY);  // fd3 = 3 (재사용!)
```

---

## Pipe의 기초

### pipe() 시스템콜

```c
#include <unistd.h>

int pipefd[2];
int result = pipe(pipefd);

// 성공 시:
// pipefd[0]: read end (읽기용)
// pipefd[1]: write end (쓰기용)
```

**동작**:
```
pipefd[1] (write) → [Kernel Buffer] → pipefd[0] (read)
```

---

### 단순 Pipe 예제

```c
#include <stdio.h>
#include <unistd.h>
#include <string.h>

int main() {
    int pipefd[2];
    char buffer[100];
    
    // 1. 파이프 생성
    pipe(pipefd);
    
    // 2. 데이터 쓰기
    char *msg = "Hello from pipe!";
    write(pipefd[1], msg, strlen(msg) + 1);
    
    // 3. 데이터 읽기
    read(pipefd[0], buffer, sizeof(buffer));
    
    printf("Received: %s\n", buffer);
    
    // 4. 파이프 닫기
    close(pipefd[0]);
    close(pipefd[1]);
    
    return 0;
}
```

**출력**:
```
Received: Hello from pipe!
```

---

### fork()와 함께 사용

```c
#include <stdio.h>
#include <unistd.h>
#include <string.h>

int main() {
    int pipefd[2];
    pipe(pipefd);
    
    pid_t pid = fork();
    
    if (pid == 0) {
        // 자식: 읽기만
        close(pipefd[1]);  // 쓰기 끝 닫기
        
        char buffer[100];
        read(pipefd[0], buffer, sizeof(buffer));
        printf("Child received: %s\n", buffer);
        
        close(pipefd[0]);
    }
    else {
        // 부모: 쓰기만
        close(pipefd[0]);  // 읽기 끝 닫기
        
        char *msg = "Hello from parent!";
        write(pipefd[1], msg, strlen(msg) + 1);
        
        close(pipefd[1]);
        wait(NULL);
    }
    
    return 0;
}
```

**중요**:
- 사용 안 하는 끝은 **반드시 닫기**!
- 안 닫으면 → Blocking 발생 가능

---

## dup2(): FD 복제의 마법

### dup2()란?

```c
#include <unistd.h>

int dup2(int oldfd, int newfd);
```

**동작**:
1. `newfd`가 열려있으면 먼저 닫음
2. `oldfd`를 `newfd`로 복제
3. 이제 `newfd` == `oldfd` (같은 파일 가리킴)

---

### dup2() 시각화

**Before**:
```
FD Table:
0 → keyboard
1 → terminal
3 → file.txt
```

**After `dup2(3, 1)`**:
```
FD Table:
0 → keyboard
1 → file.txt  ← 복제됨!
3 → file.txt
```

**효과**:
```c
printf("Hello");  // terminal이 아닌 file.txt로!
```

---

### 리다이렉션 구현

```c
// command > output.txt 구현
int fd = open("output.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
dup2(fd, STDOUT_FILENO);  // stdout → output.txt
close(fd);

printf("This goes to file!\n");  // output.txt에 기록
```

**Before fork()**:
```
Parent FD:
1 → terminal
```

**After fork() + dup2()**:
```
Child FD:
1 → output.txt  ← 리다이렉션!
```

---

### 입력 리다이렉션

```c
// command < input.txt 구현
int fd = open("input.txt", O_RDONLY);
dup2(fd, STDIN_FILENO);  // stdin → input.txt
close(fd);

char buffer[100];
scanf("%s", buffer);  // input.txt에서 읽음!
```

---

## Pipe + dup2(): Shell 파이프 구현

### 단순 파이프: ls | grep

```c
#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    int pipefd[2];
    pipe(pipefd);
    
    pid_t pid1 = fork();
    
    if (pid1 == 0) {
        // 자식 1: ls
        close(pipefd[0]);              // 읽기 끝 안 씀
        dup2(pipefd[1], STDOUT_FILENO); // stdout → pipe
        close(pipefd[1]);              // 원본 FD 닫기
        
        execlp("ls", "ls", NULL);
        perror("exec ls failed");
        exit(1);
    }
    
    pid_t pid2 = fork();
    
    if (pid2 == 0) {
        // 자식 2: grep
        close(pipefd[1]);              // 쓰기 끝 안 씀
        dup2(pipefd[0], STDIN_FILENO);  // stdin ← pipe
        close(pipefd[0]);              // 원본 FD 닫기
        
        execlp("grep", "grep", ".c", NULL);
        perror("exec grep failed");
        exit(1);
    }
    
    // 부모: 파이프 닫고 대기
    close(pipefd[0]);
    close(pipefd[1]);
    
    waitpid(pid1, NULL, 0);
    waitpid(pid2, NULL, 0);
    
    return 0;
}
```

---

### 작동 과정 상세 분석

#### Step 1: Pipe 생성

```
부모 프로세스:
FD Table:
0 → keyboard
1 → terminal
2 → terminal
3 → pipe[read]   ← pipefd[0]
4 → pipe[write]  ← pipefd[1]
```

#### Step 2: fork() #1 (ls)

```
ls 프로세스 (자식):
FD Table:
0 → keyboard
1 → terminal
2 → terminal
3 → pipe[read]   ← 복사됨!
4 → pipe[write]  ← 복사됨!

close(pipefd[0]):  FD 3 닫기
```

#### Step 3: dup2(pipefd[1], 1)

```
ls 프로세스:
FD Table:
0 → keyboard
1 → pipe[write]  ← stdout이 파이프로!
2 → terminal
4 → pipe[write]

close(pipefd[1]):  FD 4 닫기
```

#### Step 4: exec("ls")

```
ls 출력 → stdout (FD 1) → pipe[write]
```

#### Step 5: fork() #2 (grep)

```
grep 프로세스:
FD Table:
0 → keyboard
1 → terminal
2 → terminal
3 → pipe[read]
4 → pipe[write]

close(pipefd[1]):  FD 4 닫기
```

#### Step 6: dup2(pipefd[0], 0)

```
grep 프로세스:
FD Table:
0 → pipe[read]  ← stdin이 파이프로!
1 → terminal
2 → terminal
3 → pipe[read]

close(pipefd[0]):  FD 3 닫기
```

#### Step 7: exec("grep")

```
grep 입력 ← stdin (FD 0) ← pipe[read]
grep 출력 → stdout (FD 1) → terminal
```

---

### 데이터 흐름

```
ls → stdout(FD 1) 
   → pipe[write] 
   → [Kernel Buffer] 
   → pipe[read] 
   → stdin(FD 0) 
   → grep 
   → stdout(FD 1) 
   → terminal
```

---

## 다단계 Pipe: ls | grep | wc

### 3단계 파이프 구현

```c
#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    int pipe1[2], pipe2[2];
    
    // 파이프 2개 생성
    pipe(pipe1);  // ls → grep
    pipe(pipe2);  // grep → wc
    
    // === ls 프로세스 ===
    if (fork() == 0) {
        // stdout → pipe1[write]
        dup2(pipe1[1], STDOUT_FILENO);
        
        // 모든 파이프 닫기
        close(pipe1[0]);
        close(pipe1[1]);
        close(pipe2[0]);
        close(pipe2[1]);
        
        execlp("ls", "ls", NULL);
        exit(1);
    }
    
    // === grep 프로세스 ===
    if (fork() == 0) {
        // stdin ← pipe1[read]
        dup2(pipe1[0], STDIN_FILENO);
        // stdout → pipe2[write]
        dup2(pipe2[1], STDOUT_FILENO);
        
        // 모든 파이프 닫기
        close(pipe1[0]);
        close(pipe1[1]);
        close(pipe2[0]);
        close(pipe2[1]);
        
        execlp("grep", "grep", ".c", NULL);
        exit(1);
    }
    
    // === wc 프로세스 ===
    if (fork() == 0) {
        // stdin ← pipe2[read]
        dup2(pipe2[0], STDIN_FILENO);
        
        // 모든 파이프 닫기
        close(pipe1[0]);
        close(pipe1[1]);
        close(pipe2[0]);
        close(pipe2[1]);
        
        execlp("wc", "wc", "-l", NULL);
        exit(1);
    }
    
    // === 부모 프로세스 ===
    // 모든 파이프 닫기 (중요!)
    close(pipe1[0]);
    close(pipe1[1]);
    close(pipe2[0]);
    close(pipe2[1]);
    
    // 자식들 대기
    wait(NULL);
    wait(NULL);
    wait(NULL);
    
    return 0;
}
```

---

### 파이프 닫기의 중요성

**왜 모든 파이프를 닫아야 하나?**

```c
// 잘못된 예
if (fork() == 0) {
    dup2(pipefd[0], STDIN_FILENO);
    // pipefd[0], pipefd[1] 안 닫음!
    exec("grep");
}
```

**문제**:
```
grep이 실행되어도:
- grep의 FD 테이블에 pipe[write] 남아있음
- pipe[write]가 완전히 닫히지 않음
- grep이 read() → 영원히 대기 (Blocking!)
```

**해결**:
```c
close(pipefd[0]);  // 사용 후 반드시!
close(pipefd[1]);
```

---

## nsh 파이프 구현

### 파이프 파싱

```c
// "ls | grep .c | wc -l" 파싱
typedef struct {
    char **args;      // 명령어 인자
} Command;

typedef struct {
    Command *commands;
    int count;        // 파이프 개수
} Pipeline;

Pipeline parse_pipeline(char *input) {
    Pipeline pipeline;
    pipeline.count = 0;
    
    char *token = strtok(input, "|");
    while (token != NULL) {
        Command cmd;
        cmd.args = parse_args(token);  // 공백 기준 파싱
        pipeline.commands[pipeline.count++] = cmd;
        token = strtok(NULL, "|");
    }
    
    return pipeline;
}
```

---

### 파이프 실행 엔진

```c
void execute_pipeline(Pipeline *pipeline) {
    int num_cmds = pipeline->count;
    int pipes[num_cmds - 1][2];  // n개 명령 → n-1개 파이프
    
    // 1. 모든 파이프 생성
    for (int i = 0; i < num_cmds - 1; i++) {
        if (pipe(pipes[i]) == -1) {
            perror("pipe failed");
            return;
        }
    }
    
    // 2. 각 명령 실행
    for (int i = 0; i < num_cmds; i++) {
        pid_t pid = fork();
        
        if (pid == 0) {
            // 자식 프로세스
            
            // stdin 리다이렉션 (첫 번째 명령 제외)
            if (i > 0) {
                dup2(pipes[i-1][0], STDIN_FILENO);
            }
            
            // stdout 리다이렉션 (마지막 명령 제외)
            if (i < num_cmds - 1) {
                dup2(pipes[i][1], STDOUT_FILENO);
            }
            
            // 모든 파이프 FD 닫기
            for (int j = 0; j < num_cmds - 1; j++) {
                close(pipes[j][0]);
                close(pipes[j][1]);
            }
            
            // 명령 실행
            execvp(pipeline->commands[i].args[0], 
                   pipeline->commands[i].args);
            
            perror("exec failed");
            exit(EXIT_FAILURE);
        }
    }
    
    // 3. 부모: 모든 파이프 닫기
    for (int i = 0; i < num_cmds - 1; i++) {
        close(pipes[i][0]);
        close(pipes[i][1]);
    }
    
    // 4. 모든 자식 대기
    for (int i = 0; i < num_cmds; i++) {
        wait(NULL);
    }
}
```

---

### 에러 처리

```c
void execute_pipeline_safe(Pipeline *pipeline) {
    // ... (위와 동일)
    
    for (int i = 0; i < num_cmds; i++) {
        pid_t pid = fork();
        
        if (pid < 0) {
            perror("fork failed");
            // 이미 생성된 파이프 정리
            for (int j = 0; j < num_cmds - 1; j++) {
                close(pipes[j][0]);
                close(pipes[j][1]);
            }
            return;
        }
        
        if (pid == 0) {
            // dup2 에러 체크
            if (i > 0) {
                if (dup2(pipes[i-1][0], STDIN_FILENO) == -1) {
                    perror("dup2 stdin");
                    exit(EXIT_FAILURE);
                }
            }
            
            if (i < num_cmds - 1) {
                if (dup2(pipes[i][1], STDOUT_FILENO) == -1) {
                    perror("dup2 stdout");
                    exit(EXIT_FAILURE);
                }
            }
            
            // exec 실패 시 명확한 에러
            execvp(pipeline->commands[i].args[0], 
                   pipeline->commands[i].args);
            
            fprintf(stderr, "nsh: %s: command not found\n", 
                    pipeline->commands[i].args[0]);
            exit(127);
        }
    }
    
    // ... (나머지 동일)
}
```

---

## Signal: 프로세스 제어

### Signal이란?

**정의**: 프로세스에게 보내는 **소프트웨어 인터럽트**

**예시**:
```bash
$ sleep 100
^C  ← Ctrl+C → SIGINT 전송 → 프로세스 종료
```

---

### 주요 Signal

| Signal | 번호 | 의미 | 기본 동작 |
|--------|------|------|----------|
| **SIGINT** | 2 | Interrupt (Ctrl+C) | 종료 |
| **SIGQUIT** | 3 | Quit (Ctrl+\\) | 종료 + Core dump |
| **SIGKILL** | 9 | Kill (강제 종료) | 종료 (무시 불가) |
| **SIGTERM** | 15 | Terminate (정상 종료) | 종료 |
| **SIGCHLD** | 17 | 자식 종료 알림 | 무시 |
| **SIGPIPE** | 13 | Broken pipe | 종료 |
| **SIGTSTP** | 20 | Stop (Ctrl+Z) | 일시 정지 |
| **SIGCONT** | 18 | Continue | 재개 |

---

### Signal 전송

```c
#include <signal.h>

// 특정 프로세스에게
kill(pid, SIGTERM);

// 자신에게
raise(SIGTERM);

// 프로세스 그룹에게
kill(-pgid, SIGTERM);
```

**Shell에서**:
```bash
$ kill 1234       # SIGTERM (15) 전송
$ kill -9 1234    # SIGKILL (9) 전송
$ kill -INT 1234  # SIGINT (2) 전송
```

---

### Signal Handler 등록

```c
#include <signal.h>

void sigint_handler(int signo) {
    printf("\nCaught SIGINT (Ctrl+C)!\n");
    printf("Press Ctrl+C again to exit.\n");
    
    // 기본 핸들러로 복구
    signal(SIGINT, SIG_DFL);
}

int main() {
    // SIGINT 핸들러 등록
    signal(SIGINT, sigint_handler);
    
    printf("Try pressing Ctrl+C...\n");
    
    while (1) {
        sleep(1);
    }
    
    return 0;
}
```

**실행**:
```bash
$ ./program
Try pressing Ctrl+C...
^C
Caught SIGINT (Ctrl+C)!
Press Ctrl+C again to exit.
^C
$
```

---

### sigaction(): 더 안전한 방법

```c
#include <signal.h>

void sigint_handler(int signo) {
    write(STDOUT_FILENO, "\nCaught SIGINT\n", 15);
    // printf는 signal-safe 아님!
}

int main() {
    struct sigaction sa;
    sa.sa_handler = sigint_handler;
    sigemptyset(&sa.sa_mask);    // 다른 시그널 블록 안 함
    sa.sa_flags = SA_RESTART;    // Interrupted syscall 재시작
    
    sigaction(SIGINT, &sa, NULL);
    
    // ...
}
```

---

### Shell에서 Ctrl+C 처리

```c
// nsh에서 Ctrl+C 처리
void setup_signals() {
    struct sigaction sa;
    
    // SIGINT는 자식에게만
    sa.sa_handler = SIG_IGN;  // Shell은 무시
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = 0;
    sigaction(SIGINT, &sa, NULL);
    
    // SIGCHLD는 zombie 방지
    sa.sa_handler = sigchld_handler;
    sa.sa_flags = SA_RESTART | SA_NOCLDSTOP;
    sigaction(SIGCHLD, &sa, NULL);
}

void execute_command(char **args) {
    pid_t pid = fork();
    
    if (pid == 0) {
        // 자식: Signal 기본값으로
        signal(SIGINT, SIG_DFL);
        signal(SIGQUIT, SIG_DFL);
        
        execvp(args[0], args);
        exit(1);
    }
    
    // 부모: 대기
    waitpid(pid, NULL, 0);
}
```

**동작**:
```bash
nsh$ sleep 10
^C  ← SIGINT → sleep 종료
nsh$ ← Shell은 계속 실행
```

---

### SIGPIPE 처리

**문제**:
```bash
$ yes | head -1
y
(yes 프로세스가 SIGPIPE로 종료됨)
```

**원인**:
```
yes → 무한 출력
head -1 → 1줄만 읽고 pipe 닫음
yes → pipe에 쓰기 시도 → SIGPIPE!
```

**해결**:
```c
// Option 1: SIGPIPE 무시
signal(SIGPIPE, SIG_IGN);

// Option 2: EPIPE 에러 처리
ssize_t n = write(pipefd[1], data, size);
if (n == -1 && errno == EPIPE) {
    // Pipe 닫힘, 정상 종료
    exit(0);
}
```

---

## 실전 디버깅

### 1. strace로 파이프 추적

```bash
$ strace -f -e pipe,dup2,fork,exec sh -c "ls | grep .c"

pipe([3, 4])                            = 0
fork()                                  = 1234
[pid 1234] dup2(4, 1)                  = 1
[pid 1234] close(3)                    = 0
[pid 1234] close(4)                    = 0
[pid 1234] execve("/bin/ls", ["ls"], ...) = 0

fork()                                  = 1235
[pid 1235] dup2(3, 0)                  = 0
[pid 1235] close(3)                    = 0
[pid 1235] close(4)                    = 0
[pid 1235] execve("/bin/grep", ["grep", ".c"], ...) = 0
```

---

### 2. lsof로 열린 FD 확인

```bash
$ lsof -p 1234
COMMAND  PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
ls      1234 user  cwd    DIR  253,0     4096 1234 /home/user
ls      1234 user  rtd    DIR  253,0     4096    2 /
ls      1234 user  txt    REG  253,0   138K   5678 /bin/ls
ls      1234 user  mem    REG  253,0   2.1M   9012 /lib/libc.so.6
ls      1234 user    0u   CHR  136,0      0t0    3 /dev/pts/0
ls      1234 user    1w  FIFO    0,8      0t0  123 pipe
ls      1234 user    2u   CHR  136,0      0t0    3 /dev/pts/0
```

**해석**:
- FD 0: stdin (CHR - character device)
- FD 1: stdout (FIFO - pipe!)
- FD 2: stderr (CHR)

---

### 3. /proc/PID/fd 직접 확인

```bash
$ ls -l /proc/1234/fd
lrwx------ 1 user user 64 ... 0 -> /dev/pts/0
l-wx------ 1 user user 64 ... 1 -> pipe:[12345]
lrwx------ 1 user user 64 ... 2 -> /dev/pts/0
```

---

### 4. 파이프 버퍼 크기 확인

```bash
$ cat /proc/sys/fs/pipe-max-size
1048576  # 1MB (Linux 기본값)

$ ulimit -p
8  # 파이프 버퍼 크기 (블록 단위, 512바이트)
```

---

## 고급 주제

### 1. Non-blocking Pipe

```c
#include <fcntl.h>

int pipefd[2];
pipe(pipefd);

// Non-blocking 모드 설정
int flags = fcntl(pipefd[0], F_GETFL);
fcntl(pipefd[0], F_SETFL, flags | O_NONBLOCK);

// read()가 즉시 리턴
ssize_t n = read(pipefd[0], buffer, size);
if (n == -1 && errno == EAGAIN) {
    printf("No data available yet\n");
}
```

---

### 2. pipe() 크기 조정

```c
// Linux 2.6.35+
#include <fcntl.h>

int pipefd[2];
pipe(pipefd);

// 파이프 크기 설정 (2MB)
fcntl(pipefd[1], F_SETPIPE_SZ, 2 * 1024 * 1024);

// 현재 크기 확인
int size = fcntl(pipefd[0], F_GETPIPE_SZ);
printf("Pipe size: %d bytes\n", size);
```

---

### 3. splice(): Zero-copy 파이프

```c
// Linux 전용
#include <fcntl.h>

// 파일 → 파이프 (zero-copy!)
ssize_t n = splice(file_fd, NULL, pipefd[1], NULL, 
                   size, SPLICE_F_MOVE);

// 파이프 → 소켓 (zero-copy!)
splice(pipefd[0], NULL, socket_fd, NULL, 
       size, SPLICE_F_MOVE);
```

**장점**: 
- 유저 공간으로 복사 안 함
- 커널 버퍼에서 직접 전송
- 성능 향상 (Nginx, Apache 등 사용)

---

## Named Pipe (FIFO)

### FIFO 생성

```bash
$ mkfifo mypipe
$ ls -l mypipe
prw-r--r-- 1 user user 0 ... mypipe
           ↑ p = pipe!
```

**C에서**:
```c
#include <sys/stat.h>

mkfifo("/tmp/mypipe", 0666);
```

---

### FIFO 사용

**Writer**:
```c
int fd = open("/tmp/mypipe", O_WRONLY);
write(fd, "Hello", 6);
close(fd);
```

**Reader**:
```c
int fd = open("/tmp/mypipe", O_RDONLY);
char buffer[100];
read(fd, buffer, sizeof(buffer));
printf("Received: %s\n", buffer);
close(fd);
```

**특징**:
- 무관한 프로세스끼리 통신 가능!
- 파일시스템에 존재
- 하지만 데이터는 메모리에만

---

## 실전 팁

### 1. Pipe 버퍼 Full 주의

```c
// 문제: Deadlock!
int pipefd[2];
pipe(pipefd);

// 64KB 이상 쓰면?
char big_data[100 * 1024];  // 100KB
write(pipefd[1], big_data, sizeof(big_data));
// → Blocking! (버퍼 가득 참)

// 해결: fork() 후 읽기/쓰기 분리
```

---

### 2. 모든 Write End 닫기

```c
// Deadlock 예방
pipe(pipefd);

if (fork() == 0) {
    close(pipefd[1]);  // 자식이 쓰기 안 하면 닫기!
    
    char buffer[100];
    read(pipefd[0], buffer, sizeof(buffer));
    // → 부모가 close(pipefd[1]) 하면 EOF
}
```

---

### 3. Signal-Safe 함수만 사용

**Handler 안에서**:
```c
void handler(int signo) {
    // ✓ OK
    write(STDOUT_FILENO, "msg", 3);
    
    // ✗ NOT OK (signal-unsafe!)
    printf("msg");
    malloc(100);
    free(ptr);
}
```

**Signal-Safe 함수 목록**: `man 7 signal-safety`

---

### 4. Zombie 방지

```c
// SIGCHLD 핸들러
void sigchld_handler(int signo) {
    // 모든 종료된 자식 수거
    while (waitpid(-1, NULL, WNOHANG) > 0)
        ;
}

// 등록
struct sigaction sa;
sa.sa_handler = sigchld_handler;
sa.sa_flags = SA_RESTART | SA_NOCLDSTOP;
sigemptyset(&sa.sa_mask);
sigaction(SIGCHLD, &sa, NULL);
```

---

## 성능 고려사항

### Pipe vs Shared Memory

```c
// Pipe (작은 데이터)
for (int i = 0; i < 1000; i++) {
    write(pipefd[1], &data, sizeof(data));
}
// → Context switch 많음
// → 작은 메시지에 적합

// Shared Memory (큰 데이터)
void *shm = mmap(NULL, size, PROT_READ|PROT_WRITE,
                 MAP_SHARED|MAP_ANONYMOUS, -1, 0);
// → Zero-copy
// → 큰 데이터 전송에 적합
```

**Benchmark**:
```
메시지 크기 | Pipe      | Shared Memory
1 byte      | 5 µs      | 3 µs
1 KB        | 8 µs      | 3 µs
1 MB        | 5 ms      | 0.1 ms
```

---

## 정리

### 핵심 개념

**1. File Descriptor**
```
✓ 0 (stdin), 1 (stdout), 2 (stderr)
✓ Lowest available FD 할당
✓ 프로세스마다 독립적
```

**2. pipe()**
```
✓ 단방향 통신
✓ pipefd[0] (read), pipefd[1] (write)
✓ fork()와 함께 사용
```

**3. dup2()**
```
✓ FD 복제 및 리다이렉션
✓ dup2(oldfd, newfd)
✓ stdout/stdin 교체
```

**4. Signal**
```
✓ 프로세스 간 이벤트 알림
✓ SIGINT (Ctrl+C), SIGPIPE, SIGCHLD
✓ signal() 또는 sigaction()
```

---

### Shell 파이프 패턴

```c
// cmd1 | cmd2
pipe(pipefd);

// cmd1
fork();
dup2(pipefd[1], STDOUT);
close(pipefd[0]);
close(pipefd[1]);
exec("cmd1");

// cmd2
fork();
dup2(pipefd[0], STDIN);
close(pipefd[0]);
close(pipefd[1]);
exec("cmd2");

// 부모
close(pipefd[0]);
close(pipefd[1]);
wait(); wait();
```

---

### 다음 편 예고

**Part 3: Virtual Memory**  
"4GB RAM으로 16GB 쓰는 마법"

```c
// 다음 편에서 다룰 내용
void *ptr = malloc(1024 * 1024 * 1024);  // 1GB 할당
// → 실제 메모리는 안 쓰임! (Lazy allocation)

ptr[0] = 42;  // 이 순간 Page Fault!
// → 이제서야 물리 메모리 할당

fork();  // Copy-on-Write
// → 메모리 복사 안 함, 공유!
```

**다룰 주제**:
- Virtual Memory 구조
- Page Table (4-level paging)
- Page Fault 처리
- Copy-on-Write 심화
- Memory-Mapped I/O
- OOM Killer

---

## 더 알아보기

### 추천 자료

**책**:
- "The Linux Programming Interface" (Ch. 44: Pipes and FIFOs)
- "Advanced Programming in the UNIX Environment" (Ch. 15: IPC)

**온라인**:
- [man 7 pipe](https://man7.org/linux/man-pages/man7/pipe.7.html)
- [man 2 dup2](https://man7.org/linux/man-pages/man2/dup2.2.html)
- [man 7 signal](https://man7.org/linux/man-pages/man7/signal.7.html)

**실습**:
- [nsh (my shell)](https://github.com/...) - 직접 구현한 Shell!

---

**태그**: `#운영체제` `#IPC` `#Pipe` `#dup2` `#Signal` `#nsh` `#Shell`
