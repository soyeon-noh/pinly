import { createBrowserRouter, Navigate } from 'react-router'
import { DEMO_CANVAS_ID, DEMO_PROJECT_ID } from '../features/canvas'
import { CanvasPage } from '../pages/CanvasPage'

export const router = createBrowserRouter([
  {
    // 프로젝트 목록 화면이 생기기 전까지 루트는 데모 캔버스로 보낸다
    path: '/',
    element: <Navigate to={`/projects/${DEMO_PROJECT_ID}/canvases/${DEMO_CANVAS_ID}`} replace />,
  },
  {
    path: '/projects/:projectId/canvases/:canvasId',
    element: <CanvasPage />,
  },
  {
    path: '*',
    element: <p style={{ padding: 24 }}>페이지를 찾을 수 없습니다.</p>,
  },
])
