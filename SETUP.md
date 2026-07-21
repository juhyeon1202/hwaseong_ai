# Hwaseong AI Project Setup

이 문서는 `hwaseong_ai` 프로젝트의 GitHub, Vercel, Supabase, VS Code 연동 및 팀원 초대 절차를 정리한 문서입니다.

## 현재 상태

- 로컬 프로젝트 경로: `C:\Hwaseong-Ai`
- GitHub 저장소: `https://github.com/juhyeon1202/hwaseong_ai.git`
- Vercel 프로젝트: 준비 중
- Vercel 계정/팀: 팀장 계정 준비 후 확정
- 로컬 Git 브랜치: `main`

## 권한 구조

### 팀장

팀장은 관리자 권한을 가지고 프로젝트 연결과 팀원 초대를 관리합니다.

- GitHub 저장소 `Admin`
- Vercel 팀 또는 프로젝트 `Owner` / `Admin`
- Supabase 조직 `Owner` / `Administrator`
- 환경변수, 배포 설정, DB 설정 관리
- 팀원 초대 및 권한 관리

### 개발 팀원

개발 팀원은 코드 작성과 배포 확인에 필요한 권한을 받습니다.

- GitHub 저장소 `Write`
- Vercel 프로젝트 `Member` 또는 프로젝트 접근 권한
- Supabase 프로젝트 `Developer`
- VS Code에서 저장소 clone 후 개발

## GitHub 연결

현재 로컬 저장소의 `origin`은 아래 저장소로 연결되어 있습니다.

```bash
git remote -v
```

예상 결과:

```text
origin  https://github.com/juhyeon1202/hwaseong_ai.git (fetch)
origin  https://github.com/juhyeon1202/hwaseong_ai.git (push)
```

팀장은 GitHub 저장소에서 팀원을 초대합니다.

1. GitHub 저장소 접속
2. `Settings` 이동
3. `Collaborators and teams` 선택
4. 팀원 GitHub ID 또는 이메일 추가
5. 개발자는 `Write` 권한 부여

## Vercel 연결

Vercel은 아직 팀장 계정 또는 팀 설정이 준비 중인 상태입니다.

팀장 계정이 준비되면 Vercel 프로젝트를 새로 만들고 GitHub 저장소와 연결합니다. GitHub 저장소 자동 연결을 위해서는 팀장이 Vercel GitHub 앱에 저장소 접근 권한을 허용해야 합니다.

팀장이 해야 할 일:

1. GitHub Apps 설정 접속: https://github.com/settings/installations
2. `Vercel` 앱 선택
3. `Configure` 클릭
4. Repository access에서 `juhyeon1202/hwaseong_ai` 저장소 허용
5. 저장

그 다음 Vercel에서 새 프로젝트를 만들고 GitHub 저장소를 연결합니다.

1. Vercel Dashboard 접속
2. `Add New...` 선택
3. `Project` 선택
4. GitHub 저장소 `juhyeon1202/hwaseong_ai` 선택
5. 프로젝트 이름을 `hwaseong_ai` 또는 `hwaseong-ai`로 설정
6. Framework, Build Command, Environment Variables 확인
7. `Deploy` 실행

연결이 완료되면 `main` 브랜치에 push할 때 자동으로 Production 배포가 실행됩니다.

## Supabase 연결

Supabase 프로젝트는 팀장이 생성하고 팀원을 초대합니다.

팀장이 해야 할 일:

1. Supabase Dashboard 접속
2. 새 프로젝트 생성
3. Organization 또는 Project settings에서 팀원 초대
4. 개발자는 `Developer` 권한 부여

앱 코드에서 Supabase를 사용할 경우 보통 아래 환경변수가 필요합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

주의:

- `NEXT_PUBLIC_`으로 시작하는 값은 브라우저에 노출될 수 있습니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트 코드에 넣지 않습니다.
- Vercel 환경변수에는 `Production`, `Preview`, `Development` 환경을 구분해서 입력합니다.

## VS Code 개발 환경

팀원은 저장소 권한을 받은 뒤 아래 명령으로 프로젝트를 clone합니다.

```bash
git clone https://github.com/juhyeon1202/hwaseong_ai.git
cd hwaseong_ai
code .
```

현재 PC에서는 아래 경로를 VS Code로 열면 됩니다.

```powershell
code C:\Hwaseong-Ai
```

## 디자인 핸드오프 자료

Claude 디자인 핸드오프 패키지는 아래 위치에 보관합니다.

```text
docs/design-handoff
```

포함 내용:

- `README.md`: 서비스 개요, 화면 목록, 디자인 토큰, 권장 스택
- `교통일지 와이어프레임.dc.html`: 전체 와이어프레임 참고용 HTML
- `screens/`: 주요 화면 캡처 PNG
- `support.js`: 와이어프레임 런타임 참고 파일

주의:

- 핸드오프 HTML은 프로덕션 코드가 아니라 디자인 레퍼런스입니다.
- 실제 앱은 Next.js, React, TypeScript 기준으로 재구현합니다.
- 지도는 최종 구현 시 카카오맵 SDK 사용을 기준으로 합니다.
- 화성특례시 CI, 실제 좌표, Supabase 환경변수는 별도로 확정해야 합니다.

## 팀장에게 요청할 내용

아래 내용을 팀장에게 전달하면 됩니다.

```text
1. GitHub 저장소 juhyeon1202/hwaseong_ai에 저를 Write 권한으로 초대해주세요.
2. Vercel에서 GitHub 앱이 juhyeon1202/hwaseong_ai 저장소에 접근 가능하게 허용해주세요.
3. Vercel 팀 계정이 준비되면 프로젝트를 만들고 저를 멤버로 초대해주세요.
4. Supabase 프로젝트에 저를 Developer 권한으로 초대해주세요.
```

## 연결 확인 명령

GitHub remote 확인:

```bash
git remote -v
```

Git 상태 확인:

```bash
git status
```

Vercel 로그인 계정 확인:

```powershell
cmd /c vercel whoami
```

Vercel 프로젝트 목록 확인:

```powershell
cmd /c vercel project ls
```

Vercel 로컬 연결 확인:

```powershell
Get-Content .vercel\project.json
```

## 초기 작업 체크리스트

- [ ] 팀장이 GitHub 저장소 관리자 권한 보유
- [ ] 개발 팀원 GitHub `Write` 권한 초대
- [ ] Vercel 팀장 계정 준비
- [ ] Vercel 프로젝트 생성
- [ ] Vercel GitHub 앱에 저장소 접근 권한 허용
- [ ] Vercel 프로젝트와 GitHub 저장소 연결
- [ ] Supabase 프로젝트 생성
- [ ] Supabase 팀원 초대
- [ ] Vercel 환경변수 등록
- [ ] VS Code에서 프로젝트 열기
- [ ] 첫 커밋 생성
- [ ] GitHub push
- [ ] Vercel 자동 배포 확인
