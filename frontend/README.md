# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## 로그인 구현 및 검증

로그인 화면은 승인된 `ounlog-md`의 PRD·UX·OpenAPI·FE 기술 계획서를 기준으로 구현했다. Access Token은 메모리에만 보관하고, 서버의 HttpOnly Refresh Cookie와 CSRF API를 사용한다. 최신 안정 버전 브라우저와 동일 출처 HTTPS 환경이 지원 기준이다.

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium firefox webkit
npm run test:e2e
```

브라우저 자동화는 Chromium·Firefox·WebKit을 대상으로 실행한다. WebKit 검증은 실제 Safari 제품 브라우저 검증을 완전히 대체하지 않는다.

E2E는 OpenSSL로 임시 인증서를 생성하는 로컬 HTTPS 서버를 사용한다. `e2e/server.mjs`는 인증 계약을 모의하는 테스트 전용 서버이며, 프로덕션 빌드에 포함되지 않는다. 테스트에는 실제 쿠키 속성·다중 탭·브라우저 재실행 검증이 포함되지만 Spring 백엔드의 JWT 서명·계정 잠금·DB 트랜잭션 검증을 대체하지 않는다. 인증서 검증 예외도 테스트 설정에만 적용한다.

현재 Spring 백엔드는 새 인증 계약 구현 전이므로 실제 서버와 연결하려면 `/v1/auth/csrf`, `/refresh`, `/session`, `/logout`과 확장된 로그인 응답을 먼저 제공해야 한다. 프론트엔드에서 구형 인증으로 우회하지 않는다. Safari·Edge 실제 제품 브라우저 환경과 운영 HTTPS 프록시는 별도 결합 QA가 필요하다.

Pretendard Variable은 공식 배포 v1.3.9를 자체 제공한다. 폰트와 SIL Open Font License는 `public/fonts`에 함께 보관한다.
