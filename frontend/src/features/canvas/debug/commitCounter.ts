let commits = 0

/** React.Profiler onRender — 캔버스 서브트리가 커밋될 때마다 센다 (개발 빌드 전용) */
export const countCommit = () => {
  commits += 1
}

export const getCommitCount = () => commits
