# Frontend CI 검증 게이트

작업 1-2 완료 기록: 2026-10-29 (Asia/Seoul).

## 변경 파일

- `.github/workflows/ci.yml`: 기존 workflow에 `frontend` Job 추가.
- `frontend/.nvmrc`: Node.js `24.19.0` 고정.
- `frontend/package.json`: `packageManager: npm@11.17.0`, `typecheck: tsc -b` 추가.
- `frontend/docs/frontend-ci.md`: 환경 설정, 검증 결과, 후속 수동 설정 기록.

Backend 코드, 기존 Backend Job과 trigger, FE 테스트·ESLint·TypeScript 설정 및 lockfile은 변경하지 않았다. commit/push와 PR 생성도 하지 않았다.

## 실행 환경과 의존성

Node 버전의 기준은 `frontend/.nvmrc`, npm 버전의 기준은 `frontend/package.json`의 `packageManager`다. CI는 `actions/setup-node@v4`로 `.nvmrc`를 읽고, `packageManager` 값을 사용해 npm을 명시적으로 설치한다. Node와 npm 버전을 로그에 출력한다.

`packageManager` 선언만으로 일반적인 로컬 npm 실행이 강제되지는 않는다. 로컬에서도 아래 버전을 맞춘 뒤 검증한다. nvm을 사용하는 환경의 예시는 다음과 같다.

```bash
cd frontend
nvm install
nvm use
npm install --global npm@11.17.0
node --version
npm --version
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

이번 로컬 실행 환경은 Node `v24.19.0`, npm `11.17.0`, Darwin arm64다. 이미 버전이 일치하여 로컬 Node/npm 재설치는 수행하지 않았다. CI의 npm 전역 설치 단계 자체는 원격 실행으로 확인해야 한다.

의존성은 `npm ci`로 설치한다. 기존 lockfile을 재생성하지 않았다. 실행 전후 lockfile을 HEAD와 바이트 단위로 비교하여 동일함을 확인했다. SHA256은 다음과 같다.

```text
0cf7302d03be2b4857ae163baa0e0049db523177328713bf80c3def750c9cf4b
```

npm cache는 `frontend/package-lock.json`의 hash를 기준으로 설정한다. `node_modules`를 복원하는 방식이 아니며, cache 유무와 관계없이 `npm ci`를 실행한다. `npm ci`는 manifest/lockfile 불일치 시 실패하므로 임의의 의존성 보정 없이 검증한다. 근거: [setup-node v4 문서](https://github.com/actions/setup-node/blob/v4/README.md), [npm ci 공식 문서](https://docs.npmjs.com/cli/v11/commands/npm-ci/).

## 최종 CI 구조

기존 workflow 이름 `Backend CI`, `main` 대상 PR 및 `main` push trigger를 유지했다. 명칭은 기존 이름을 유지하므로 이 workflow 아래에 두 Job이 표시된다.

| Job        | 표시 이름                 | 실행 내용                                                                |
| ---------- | ------------------------- | ------------------------------------------------------------------------ |
| `backend`  | `Backend Build and Test`  | 기존 Java 21/Gradle 설정 및 `./gradlew clean build --no-daemon` 유지     |
| `frontend` | `Frontend Quality Checks` | checkout → Node/npm 설정 → npm ci → TypeScript → ESLint → Vitest → Build |

두 Job은 의존성 없이 독립적으로 실행한다. FE Job은 `ubuntu-latest`, `contents: read` 권한을 사용한다. 모든 FE `run` step의 기본 디렉터리는 `frontend/`다. setup-node의 버전 파일과 cache 경로는 repository root 기준이다.

품질 검증은 각각 이름이 다른 step으로 분리했다. 어느 단계가 실패했는지 Actions 로그에서 확인할 수 있다. 기본 실패 전파를 사용하며 `continue-on-error`, 오류 무시, 테스트 제외는 추가하지 않았다. 앞 단계가 실패하면 뒤 단계는 실행하지 않고 Job이 실패한다. paths filter를 추가하지 않아 경로 조건 때문에 이 Job이 실행되지 않는 상황을 만들지 않았다.

`typecheck`는 기존 build의 `tsc -b`를 독립 script로 노출했다. app 프로젝트의 `src`(테스트 포함)와 node 프로젝트의 `vite.config.ts`를 검사한다. `vitest.config.ts`가 해당 TypeScript 프로젝트 범위 밖이라는 Baseline의 한계는 유지한다. Lint는 기존 `eslint .`, Test는 기존 `vitest run`, Build는 기존 `tsc -b && vite build`다. Build에서 타입 검사가 다시 실행되지만 기존 build 명령의 동작을 유지하는 쪽을 선택했다.

## 실제 로컬 검증 결과

`npm ci`로 의존성을 설치한 뒤 아래 순서로 실행했다. 품질 명령의 시간은 Python `time.perf_counter()`로 프로세스 시작부터 종료까지 측정한 단일 실행값이다. 평균 성능이나 GitHub runner 실행 시간을 의미하지 않는다.

| 검증                        | 명령                   | 종료 코드 |         실행 시간 | 결과                        |
| --------------------------- | ---------------------- | --------: | ----------------: | --------------------------- |
| 의존성 설치                 | `npm ci`               |         0 | npm 출력 기준 4초 | 288 packages 설치           |
| TypeScript                  | `npm run typecheck`    |         0 |           2.292초 | 성공                        |
| ESLint                      | `npm run lint`         |         0 |           2.009초 | 성공                        |
| Vitest                      | `npm test`             |         0 |           7.846초 | 14개 파일, 68개 케이스 통과 |
| Build                       | `npm run build`        |         0 |           2.308초 | production bundle 생성 성공 |
| Prettier (필수 게이트 제외) | `npm run format:check` |         1 |           0.753초 | 기존 두 파일의 포맷 불일치  |

Vitest 자체 출력의 Duration은 4.37초다. 전체 프로세스 시간과 구분한다. Build의 JS 출력은 249.49 kB, gzip 78.66 kB였다.

`npm ci`는 `fsevents@2.3.3`의 install, `msw@2.15.0`의 postinstall이 `allowScripts`에 포함되지 않았다는 경고를 출력했다. 종료 코드는 0이며 이후 네 품질 명령도 통과했다. 경고를 없애기 위한 lifecycle script 승인이나 설정 변경은 하지 않았다. Linux runner의 optional dependency 및 lifecycle script 동작은 원격 CI 로그에서 별도로 확인해야 한다.

YAML은 로컬 Ruby YAML parser로 파싱했고, 기존 Backend Job과 trigger가 HEAD와 동일한지 비교했다. 원본 workflow 내용이 추가 부분을 제외하고 그대로 보존되는지도 확인했다. FE 검증 명령 순서를 확인했고 npm 설치 step은 `bash -n`으로 구문 검증했다. 전용 `actionlint`는 설치되어 있지 않아 실행하지 않았다. 이 검토가 GitHub Actions 실행 성공을 증명하지는 않는다.

## Prettier 선행 작업

현재 필수 CI 게이트는 TypeScript·ESLint·Vitest·Build 네 가지다. Format 검사는 기존 실패를 별도 선행 작업으로 분리하고 필수 게이트에서 제외했다. script나 ignore 설정으로 실패를 숨기지 않았다.

후속 작업은 다음 두 파일에만 Prettier를 적용하고, `npm run format:check` 전체 성공을 확인한 후 CI 필수 step 추가 여부를 결정하는 것이다.

- `frontend/src/pages/saju/SajuPreviewPage.test.tsx`: Baseline에서 이미 확인한 실패.
- `frontend/docs/AGENTS.md`: 현재 추가로 확인한 실패.

이번 작업에서는 두 파일을 수정하지 않았다. Baseline은 과거 조사 기록으로 보존했다. Baseline에는 AGENTS 파일이 없다고 기록되어 있지만 현재 checkout에는 `frontend/docs/AGENTS.md`가 있으며 이번 작업에서 읽고 적용했다. 상태 문서와 현재 코드의 차이를 과거 문서에 소급 반영하지 않았다.

## Baseline 대비 변경과 미검증 영역

독립 typecheck script, Node/npm 버전 기준, lockfile 기반 설치와 FE CI Job이 추가되었다. 설치 후에도 테스트 규모와 결과는 14개 파일·68개 케이스 통과로 동일하다. API 계약 자동 검증, 실제 브라우저 E2E, coverage 기준 및 타입 기반 ESLint는 이번 범위에 포함하지 않았다.

원격 Actions 실행, Linux에서의 설치와 build, cache 복원/저장, 실제 PR check 노출 및 실패 차단 동작은 **미검증**이다. Workflow에 `workflow_dispatch`를 추가하거나 원격 실행을 요청하지 않았다. 이번 로컬 검증을 원격 CI 성공으로 간주하면 안 된다.

원격 branch protection 및 Rulesets의 현재 설정 여부도 **미검증**이며 변경하지 않았다. 연결된 GitHub 도구 목록에서는 branch protection/Rulesets 전용 조회 기능을 확인하지 못했다.

## GitHub에서 수동으로 설정할 Required Checks

승인 후 변경을 push하여 `main` 대상 PR에서 workflow를 실제 실행하고, Repository의 branch protection 또는 Ruleset에서 `main`에 대해 다음을 설정한다.

1. PR 병합 전 status checks 통과를 요구한다.
2. 새 Job의 check 이름인 **Frontend Quality Checks**를 필수 check로 추가한다. 최초 실행 후 GitHub에 표시된 실제 check를 선택한다.
3. 기존 **Backend Build and Test** 필수 설정은 유지한다. 아직 필수가 아니라면 팀 정책에 따라 함께 지정한다.

개별 TypeScript/ESLint/Vitest/Build step 이름을 Required Check로 지정하는 구조가 아니다. 네 step을 포함하는 Job의 check를 지정한다. Workflow 추가만으로 병합 차단 규칙이 자동 생성되지는 않는다. 관리자 또는 Ruleset bypass 권한의 예외 정책은 별도로 확인해야 한다.

## 다음 OpenAPI 계약 검증 작업의 선행 조건

- BE에서 명세를 추출하는 재현 가능한 명령과 profile을 확정한다. DB·외부 AI·실제 API Key 없이 추출 가능한지 먼저 검증한다.
- 저장소에 versioned OpenAPI JSON/YAML을 둘지, CI에서 artifact로 생성할지와 명세 갱신 책임을 결정한다.
- nullable, required, enum, 날짜/시간, 오류 응답, 분석 200/201 및 legacy/구조화 응답이 실제 생성 명세에 어떻게 표현되는지 확인한다.
- 생성 도구와 버전을 고정하고, 생성 타입 또는 계약 비교 방식·결과 파일 경로·diff 발생 시 실패 기준을 결정한다.
- 현재 수기 FE 타입·응답 guard·MSW fixture와 비교할 기준 명세를 확보한다. 생성 타입만으로 런타임 응답 검사가 대체되는 것은 아니다.
- 이번 FE CI가 원격 PR에서 실행되고 Required Check로 적용되는지 확인한 뒤 계약 검증 step을 추가한다.
