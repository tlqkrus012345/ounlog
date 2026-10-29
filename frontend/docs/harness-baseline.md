# FE Harness — Baseline 조사

## 1. 조사 기준과 범위

- 조사일: 2026-10-28 (Asia/Seoul)
- Repository: `ounlog` (루트 README의 서비스명은 Saju)
- 기준 commit: `3b186e7067ce6e07433fd1dfc74c279d74d4cc9d`
- 시작 시 `git status --short` 결과: 변경 없음.
- 실행 환경: Darwin arm64, Node.js `v24.19.0`, npm `11.17.0`.
- 기존 `frontend/node_modules`를 사용했다. 패키지 설치·업데이트·외부 서비스 호출·실제 API Key 사용·백엔드 실행은 하지 않았다.
- 소스·설정·의존성·테스트·백엔드는 변경하지 않았다. 검증 과정에서 무시된 빌드 결과물(`frontend/dist`)과 도구 캐시는 생성 또는 갱신될 수 있다.
- Harness 구현, Subagent 추가, 자동 수정 Loop, commit/push는 수행하지 않았다.

### 사전 문서와 실제 상태

Repository 내부에서 `AGENTS.md`, `frontend-project-state.md`, `backend-project-state.md`를 검색했으나 발견하지 못했다. 사용자가 대화에 제공한 AGENTS 지침을 적용했다.

`README.md`와 `frontend/README.md`도 확인했다. FE README는 Vite 템플릿 설명 위주이며 실제 존재하는 Vitest·MSW 테스트, npm 검증 명령, API 계약 관리 방식은 문서화하지 않는다. 루트 README의 예시 루트명은 `saju/`이지만 현재 checkout 디렉터리는 `ounlog/`이다. 존재하지 않는 상태 문서와의 내용 비교는 불가능하며, 아래 판단은 실제 파일과 로컬 실행 결과를 기준으로 한다.

## 2. 기술 스택 및 패키지 관리

근거: `frontend/package.json`, `frontend/package-lock.json`, 각 설치 패키지의 `package.json`.

| 구성                       | package.json 선언 | Lockfile 및 설치 버전 |
| -------------------------- | ----------------- | --------------------- |
| React / React DOM          | `^19.2.8`         | 둘 다 `19.2.8`        |
| React Router DOM           | `^7.18.3`         | `7.18.3`              |
| TypeScript                 | `~6.0.2`          | `6.0.3`               |
| Vite                       | `^8.2.0`          | `8.2.1`               |
| Vite React plugin          | `^6.0.4`          | `6.0.5`               |
| ESLint                     | `^10.8.0`         | `10.8.1`              |
| typescript-eslint          | `^8.65.0`         | `8.67.0`              |
| Vitest                     | `^4.1.11`         | `4.1.11`              |
| jsdom                      | `^30.0.1`         | `30.0.1`              |
| Testing Library React      | `^16.3.2`         | `16.3.2`              |
| Testing Library DOM        | `^10.4.1`         | `10.4.1`              |
| Testing Library jest-dom   | `^7.0.1`          | `7.0.1`               |
| Testing Library user-event | `^14.6.6`         | `14.6.6`              |
| MSW                        | `^2.15.0`         | `2.15.0`              |
| Prettier                   | `3.9.6`           | `3.9.6`               |

ES Modules 구성(`type: module`)이다. npm lockfile이 있으며 `lockfileVersion`은 3이다. 직접 의존성 전체의 설치 버전은 lockfile과 일치했다. `packageManager`, `engines`, `.nvmrc`, `.node-version`을 통한 프로젝트 런타임 버전 고정은 확인되지 않았다. 깨끗한 환경에서의 의존성 설치 재현성은 설치 금지 조건에 따라 **미검증**이다.

## 3. TypeScript·ESLint·Vite 구성

### TypeScript

근거: `frontend/tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, 로컬 `tsc --showConfig -p tsconfig.app.json` 출력.

- 루트는 app/node 설정을 project reference로 연결한다.
- app: `src` 전체를 검사하므로 테스트와 MSW setup도 포함된다. ES2023, DOM, bundler resolution, React JSX, `noEmit`, `skipLibCheck`를 사용한다.
- node: `vite.config.ts`만 포함한다. `vitest.config.ts`는 두 프로젝트의 검사 범위 밖이다.
- 두 설정 모두 unused locals/parameters 및 switch fallthrough 검사를 활성화한다.
- `strict`는 명시되어 있지 않다. 다만 설치된 **TypeScript 6.0.3**의 로컬 compiler API `getStrictOptionValue`로 app 설정의 `strictNullChecks` 유효값이 `true`임을 확인했다. 설치본 `typescript/lib/typescript.js`의 strict 기본값 설명도 `true`다. 설정에 `strict`가 없다는 이유만으로 strict 검사가 꺼졌다고 판단하면 안 된다.
- 독립적인 `typecheck` npm script는 없다. 현재 build script의 `tsc -b`를 직접 실행해 타입 검사를 분리 측정했다.

### ESLint

근거: `frontend/eslint.config.js`.

Flat config이며 `dist`를 제외한다. TS/TSX에 JavaScript recommended, typescript-eslint recommended, React Hooks recommended, React Refresh Vite 규칙을 적용한다. Browser globals를 사용한다. `recommendedTypeChecked`, `project`, `projectService` 등 타입 정보를 사용하는 Lint 설정은 없다. TypeScript 검사와 Lint는 별도 검증으로 봐야 한다.

### Vite

근거: `frontend/vite.config.ts`, `frontend/package.json`.

React plugin을 사용한다. 개발 서버의 `/v1` 요청을 `http://localhost:8080`으로 proxy한다. 이는 개발 서버 설정이며, 운영 배포의 `/v1` 라우팅을 증명하지 않는다. 운영 reverse proxy·배포 환경 동작은 **미검증**이다. 이번 조사에서는 dev server나 백엔드를 시작하지 않았다.

## 4. 검증 명령어와 실제 실행 결과

모든 명령의 작업 디렉터리는 `frontend/`다. Python `subprocess.run`과 `time.perf_counter()`로 프로세스 시작부터 종료까지 측정하고, 서로 순차 실행했다. npm에는 `npm_config_offline=true`, `npm_config_update_notifier=false`를 적용했다. `npx`나 의존성 다운로드는 사용하지 않았다.

| 검증               | 실제 실행 명령                                | 종료 코드 | 경과 시간 | 결과 및 실패 원인                                          |
| ------------------ | --------------------------------------------- | --------: | --------: | ---------------------------------------------------------- |
| TypeScript         | `./node_modules/.bin/tsc -b`                  |         0 |   1.205초 | 성공, 진단 출력 없음                                       |
| ESLint             | `npm run lint` → `eslint .`                   |         0 |   1.980초 | 성공, 오류·경고 출력 없음                                  |
| Test               | `npm test` → `vitest run`                     |         0 |   3.376초 | 14개 파일, 68개 케이스 통과                                |
| Build              | `npm run build` → `tsc -b && vite build`      |         0 |   1.697초 | 타입 검사 및 production bundle 생성 성공                   |
| Format (추가 확인) | `npm run format:check` → `prettier . --check` |         1 |   0.491초 | 기존 `src/pages/saju/SajuPreviewPage.test.tsx` 포맷 불일치 |

이는 **보고서 작성 전 기존 checkout에 대한 단일 실행 측정**이다. Cold install/build, 평균값, 성능 보장은 아니다. TypeScript 증분 캐시가 이미 존재할 수 있고 build는 별도 타입 검사 이후 실행했으므로, 타입 검사와 build 시간을 같은 초기 조건의 비교값으로 해석하면 안 된다.

Vitest 자체 출력 시간은 `2.99s`였다. 세부 출력은 transform 952ms, setup 3.31s, import 1.42s, tests 3.30s, environment 9.38s다. 병렬 worker의 합산 구간이 포함되므로 이들을 더해 전체 경과 시간으로 해석하지 않는다.

Build 출력은 다음과 같다.

```text
dist/index.html                   0.45 kB │ gzip:  0.29 kB
dist/assets/index-zTPCi3Z8.css    9.52 kB │ gzip:  2.07 kB
dist/assets/index-DC8EBVGJ.js   249.49 kB │ gzip: 78.66 kB
✓ built in 95ms
```

Format 실패 출력은 다음과 같다. 자동 수정하지 않았다.

```text
[warn] src/pages/saju/SajuPreviewPage.test.tsx
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
```

`npm run test:watch`는 Vitest watch, `npm run dev`는 Vite 개발 서버다. 두 명령은 상시 프로세스이므로 이번 일회성 baseline 검증에서 실행하지 않았다. `npm run format`은 파일을 수정하므로 실행하지 않았다.

## 5. 테스트 구성 및 규모

근거: `frontend/vitest.config.ts`, `src/test/setup.ts`, `src/test/server.ts`, 아래 테스트 파일 및 `vitest list --json` 수집 결과.

- Vitest의 jsdom 환경에서 React Testing Library·user-event·jest-dom으로 동작을 검사한다.
- MSW `setupServer()`로 HTTP를 mock한다. `onUnhandledRequest: 'error'`이며 미등록 요청을 오류로 처리한다.
- 매 테스트 이후 handler 초기화, sessionStorage 초기화, React cleanup을 수행한다. 전체 종료 시 MSW server를 닫는다.
- 일부 페이지는 API 모듈을 `vi.mock`한다. 테스트의 token은 고정 mock 문자열이며 실제 인증 또는 외부 AI 응답을 검증하지 않는다.
- 실행 결과: **14개 테스트 파일, 68개 케이스, 모두 통과**. skip/todo 표시는 없었고, 소스에서도 `.skip`, `.todo`, `.only`를 발견하지 못했다.
- `it.each`를 펼친 케이스 수다. 단순한 `it(` 문자열 개수로 계산하지 않았다.

아래 경로는 `frontend/` 기준이다.

| 테스트 파일                                | 케이스 수 |
| ------------------------------------------ | --------: |
| `src/features/auth/AuthProvider.test.tsx`  |         1 |
| `src/features/signup/api.test.ts`          |         4 |
| `src/features/signup/SignupForm.test.tsx`  |        10 |
| `src/features/saju/api.test.ts`            |        17 |
| `src/features/saju/storage.test.ts`        |         8 |
| `src/features/saju/mapper.test.ts`         |         3 |
| `src/pages/entry/EntryPage.test.tsx`       |         3 |
| `src/pages/splash/SplashPage.test.tsx`     |         1 |
| `src/pages/saju/BirthDatePage.test.tsx`    |         4 |
| `src/pages/saju/BirthTimePage.test.tsx`    |         4 |
| `src/pages/saju/ConfirmPage.test.tsx`      |         6 |
| `src/pages/saju/SajuPreviewPage.test.tsx`  |         2 |
| `src/pages/saju/SajuAnalysisPage.test.tsx` |         4 |
| `src/test/flows/sajuFlow.test.tsx`         |         1 |
| **합계**                                   |    **68** |

API 요청 본문·Authorization, 잘못된 응답, HTTP 오류, timeout, 중복 요청 방지, 입력 정보 복원, 페이지 이동 및 legacy/구조화 분석 결과 표시 등을 검사한다. `sajuFlow.test.tsx`는 MemoryRouter와 MSW를 통한 입력→확인→Preview 흐름 테스트다.

Coverage 설정·최소 임계값·coverage script 및 직접 coverage provider 의존성은 확인되지 않았다. Coverage는 실행하지 않았으며 **커버리지 수치는 미검증**이다. 통과 케이스 수만으로 전체 코드나 모든 장애 경로가 검증되었다고 볼 수 없다.

## 6. API 계약과 OpenAPI 연결

### 실제 연결 방식

백엔드에는 `backend/build.gradle`의 `springdoc-openapi-starter-webmvc-ui:3.0.3` 의존성과 다음 선언이 있다.

- `backend/src/main/java/ounlog/member/controller/MemberApi.java`: operation·response schema 선언.
- `backend/src/main/java/ounlog/saju/controller/SajuApi.java`: Preview, 분석 생성/기존 결과, 조회 및 오류 응답 schema 선언.
- 각 controller request/response DTO와 `saju/entity/SajuInterpretation.java`: 실제 필드 구조.

Repository에서 별도 저장된 OpenAPI JSON/YAML 명세, FE 타입 생성 script, OpenAPI generator 연동, 명세 diff 검사 또는 계약 검증 CI는 발견하지 못했다. 백엔드를 실행하거나 문서 endpoint를 호출하지 않았으므로 **실제 생성 OpenAPI 명세와 그 접근 가능 여부는 미검증**이다.

FE는 다음 타입을 수기로 관리한다.

- `frontend/src/features/auth/types.ts`
- `frontend/src/features/signup/types.ts`
- `frontend/src/features/saju/types.ts`
- `frontend/src/shared/api/errors.ts`

각 feature의 `api.ts`는 수기 type guard를 `shared/api/client.ts`의 `validate`에 전달한다. 공통 client는 JSON 파싱, HTTP 오류 응답 구조, 성공 응답 구조 및 timeout을 검사한다. MSW 테스트는 수기 fixture와 오류 응답으로 이 검사를 검증한다.

### 정적으로 확인한 대응 및 한계

| 영역           | 코드 대조 결과                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 회원가입       | BE 응답 `email`과 FE `SignupResponse.email` 대응                                                                                     |
| 로그인         | BE `accessToken`, `tokenType`과 FE 필드 대응. FE guard는 `Bearer`를 요구하며 BE mapper도 같은 값을 설정                              |
| 사주 요청      | BE `birthDate`, `birthTime`, `calendarType`, `gender`, `isLeapMonth`와 FE 필드명 대응. 날짜·시간은 FE 문자열, BE LocalDate/LocalTime |
| Preview        | BE/FE 모두 `year`, `keyword`, `summary`를 사용                                                                                       |
| 전체 분석      | BE/FE 모두 `result`, `legacyResult`, `asOfDate`를 사용. FE는 구조화 응답과 legacy 응답을 union으로 표현                              |
| 생성 상태 코드 | `SajuApi.java`의 201/200 선언과 FE의 CREATED/EXISTING 변환 대응                                                                      |

이는 소스의 정적 대조이며 실제 직렬화·인증·Validation·생성 명세의 일치를 보증하지 않는다. 현재 방식은 **FE 내부의 응답 방어 및 mock 기반 검증**이다. BE 계약이 바뀌면 FE 타입·guard·fixture가 함께 갱신되는 자동 연결은 없다. FE 구현과 fixture가 같은 잘못된 가정을 공유해도 테스트가 통과할 수 있다.

## 7. E2E 환경

Playwright/Cypress 직접 의존성, 전용 config, E2E script, 브라우저 실행·webServer 설정, 관련 CI job은 발견하지 못했다. Lockfile의 Vitest optional peer metadata에 있는 `@vitest/browser-playwright`는 E2E 환경 구축의 근거가 아니다. `.gitignore`의 `playwright-report/`와 `test-results/` 역시 실행 환경의 존재를 증명하지 않는다.

현재 `src/test/flows/sajuFlow.test.tsx`는 jsdom 기반 통합 흐름 테스트다. 실제 브라우저의 렌더링·CSS·history·새로고침·배포 라우팅 검증은 수행하지 않는다. **Repository 기준 브라우저 E2E 환경은 미구축이며 E2E 실행은 미검증**이다.

## 8. 현재 CI 상태

근거: `.github/workflows/ci.yml` (Repository에서 확인한 유일한 workflow).

- 이름: `Backend CI`.
- `main` 대상 pull request 및 `main` push에서 실행한다.
- Java 21과 Gradle cache를 설정하고 `backend/`에서 `./gradlew clean build --no-daemon`을 수행한다.
- FE용 Node setup, 의존성 설치, typecheck, lint, test, build, format 또는 E2E 단계는 없다.

따라서 **현재 저장소 CI 설정은 FE 검증을 수행하지 않는다**. 원격 Actions 실행 이력·최근 성공 여부·branch protection의 required checks는 외부 서비스 호출 금지 조건에 따라 **미검증**이다. 로컬 검증 성공을 원격 CI 성공으로 기록하지 않는다.

## 9. 발견한 문제와 개선 우선순위

아래는 후속 작업 제안이며 이번 조사에서는 구현하지 않았다.

| 우선순위 | 확인한 문제                                                | 영향 및 개선 방향                                                                                                                                                                       |
| -------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | FE 검증 CI 없음                                            | 로컬 검증을 생략한 변경이 병합될 수 있다. 런타임을 고정하고 lockfile 기반 설치 후 타입·Lint·Test·Build를 CI에서 실행하는 검증 관문이 우선이다.                                          |
| P1       | OpenAPI와 FE 타입·guard·fixture 사이 자동 동기화/비교 없음 | BE 변경에도 FE 테스트만 통과할 수 있다. 명세를 재현 가능하게 확보하고 생성 타입 또는 계약 비교로 drift를 검출할 기준을 마련해야 한다. 런타임 응답 검사는 별도로 유지할 판단이 필요하다. |
| P2       | 실제 브라우저 E2E 없음                                     | jsdom이 놓치는 라우팅·브라우저·배포 회귀를 검출하지 못한다. 외부 서비스와 분리한 주요 사용자 흐름의 브라우저 검증이 필요하다.                                                           |
| P2       | Node/npm 프로젝트 버전 고정 없음                           | 개발자·CI 환경 차이로 설치나 실행 결과가 달라질 여지가 있다. 지원 런타임과 패키지 관리자 버전을 명문화해야 한다.                                                                        |
| P2       | `vitest.config.ts`가 tsc 검사 범위 밖                      | 테스트 도구 설정의 타입 오류가 현재 typecheck 관문을 벗어날 수 있다. 설정 파일의 검사 범위를 정해야 한다.                                                                               |
| P2       | 독립 typecheck script 및 타입 기반 ESLint 없음             | 검증 진입점과 검사 범위가 덜 명확하다. typecheck 명령을 표준화하고 타입 기반 Lint의 필요성과 비용을 판단해야 한다.                                                                      |
| P2       | Coverage 측정·기준 없음                                    | 68개 통과만으로 미검증 코드 범위를 알 수 없다. 핵심 API/인증/오류 경로의 누락을 먼저 확인하고 필요한 측정 기준을 정해야 한다.                                                           |
| P3       | 기존 테스트 파일의 format 검사 실패                        | `SajuPreviewPage.test.tsx` 포맷 정리가 필요하다. 동작 실패와 구분해야 하며 현재 자동 수정하지 않았다.                                                                                   |
| P3       | FE README가 템플릿 수준                                    | 실행·검증·계약 관리 절차를 개발자가 추정하게 된다. 실제 사용 명령과 검증 한계를 문서화해야 한다.                                                                                        |

## 10. AI 자동 개발 적용 시 위험

1. FE CI가 없으므로 AI가 로컬 검증을 누락하거나 일부만 실행해도 저장소 차원의 검출 장치가 없다.
2. 수기 타입·guard·MSW fixture를 AI가 동시에 잘못 변경하면 서로 일치하는 테스트가 통과할 수 있다. 현재 테스트 성공은 실제 BE 호환성을 증명하지 않는다.
3. jsdom 통과와 production bundle 생성만으로 브라우저 동작·화면 배치·운영 `/v1` 라우팅까지 정상이라고 판단할 위험이 있다.
4. Coverage가 측정되지 않아 AI가 변경한 인증·상태 복원·오류 분기의 검증 누락을 케이스 수만으로 알아내기 어렵다.
5. 도구 버전의 실제 기본값을 확인하지 않고 설정만 해석하면 오진할 수 있다. 예를 들어 이 checkout에서는 TypeScript 6.0.3의 strict 기본값을 직접 확인했다.
6. 기존 format 실패와 새 회귀를 구분하지 않으면 불필요한 자동 수정이나 범위 밖 변경이 생길 수 있다. 이번 실행의 실패 항목을 baseline으로 보존해야 한다.

현재 타입·Lint·테스트·Build의 로컬 실행은 가능하다. 다만 자동 개발의 완료 판단에는 이 결과의 범위와 API 계약·브라우저·CI의 미검증 영역을 함께 반영해야 한다.
