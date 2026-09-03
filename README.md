# Saju

사주 결과를 보여주는 데서 끝나지 않고, 사용자의 상황에 맞게 계속 질문할 수 있는 개인화 사주 상담 서비스입니다.

## Repository structure

```text
saju/
├── backend/       # Java 21, Spring Boot REST API
├── frontend/      # Frontend application
├── .github/       # CI workflows
└── README.md
```

## Backend

### Technology

- Java 21
- Spring Boot 4.1.0
- Gradle
- MySQL

### Run tests

```bash
cd backend
./gradlew test
```

### Run locally

먼저 저장소 루트의 `.env`에 `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`를 설정합니다.

```bash
docker compose --env-file .env -f infra/compose.yml up -d
cd backend
./gradlew bootRun --args='--spring.profiles.active=dev'
```

## Commit convention

```text
feat: 새로운 기능 추가
fix: 기존 기능의 결함 수정
docs: 문서 수정
refactor: 내부 구조 개선
test: 테스트 추가/수정
chore: 빌드, 설정, 기타 작업
style: 줄바꿈/들여쓰기 수정
ci: CI 설정
```
