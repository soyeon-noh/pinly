import type Konva from 'konva'
import type { CanvasDocument } from '../model/types'

export interface BenchResult {
  nodes: number
  msPerDraw: number
  theoreticalFps: number
}

/** `docs/canvas-spike/profiling.md` 레시피가 콘솔에서 쓰는 계측 API */
export interface PinlyDebugApi {
  stage(): Konva.Stage | null
  doc(): CanvasDocument | null
  /** 모든 레이어 draw() 평균 시간. 워밍업 5회 후 runs 회 측정. Stage 가 없으면 null */
  bench(runs?: number): BenchResult | null
}

declare global {
  interface Window {
    __pinly?: PinlyDebugApi
  }
}

const WARMUP_RUNS = 5

/**
 * 개발 빌드에서만 `window.__pinly` 를 붙인다. 해제 함수를 돌려준다.
 * rAF 기반 FPS 는 백그라운드·임베디드 브라우저에서 스로틀링되므로 draw() 를 동기 호출해 잰다.
 */
export function installDebugHook(source: {
  getStage: () => Konva.Stage | null
  getDocument: () => CanvasDocument | null
}): () => void {
  if (!import.meta.env.DEV) return () => {}

  const api: PinlyDebugApi = {
    stage: source.getStage,
    doc: source.getDocument,
    bench(runs = 30) {
      const stage = source.getStage()
      if (!stage) return null

      const layers = stage.getLayers()
      const drawAll = () => layers.forEach((layer) => layer.draw())
      for (let i = 0; i < WARMUP_RUNS; i++) drawAll()

      const startedAt = performance.now()
      for (let i = 0; i < runs; i++) drawAll()
      const ms = (performance.now() - startedAt) / runs

      return {
        nodes: stage.find('Shape').length,
        msPerDraw: Number(ms.toFixed(2)),
        theoreticalFps: Math.round(1000 / Math.max(ms, 0.001)),
      }
    },
  }

  window.__pinly = api
  return () => {
    // StrictMode 의 이중 마운트에서 나중에 붙은 훅을 지우지 않도록 자기 것만 지운다
    if (window.__pinly === api) delete window.__pinly
  }
}
