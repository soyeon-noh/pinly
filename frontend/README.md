# pinly frontend

웹툰 원고 피드백 캔버스. React 19 + TypeScript + Vite, 캔버스는 react-konva.

```bash
npm run dev        # 개발 서버 — / 는 데모 캔버스로 이동
npm run build      # 타입 체크 + 빌드
npm run lint       # oxlint
npm test           # Vitest 단위 테스트 (src/**/*.test.ts)
npm run e2e        # Playwright E2E (시스템 Chrome)
```

- 구현 계획·폴더 구조·의존 방향: [`docs/canvas-frontend-plan.md`](../docs/canvas-frontend-plan.md)
- 성능 근거와 측정 절차: [`docs/canvas-spike/`](../docs/canvas-spike/)
- 백엔드 API 가 생기기 전까지 저장소는 localStorage 목이다 (`src/app/repositories.ts`).
  목 데이터를 비우려면 브라우저 콘솔에서 `localStorage.clear()`.
- `frontend-demo/` 는 측정용 스파이크다. 제품 코드를 가져오지 않는다.
