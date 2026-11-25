import { useLayoutEffect, useRef, useState } from 'react'
import { useAuth } from '../../features/auth/useAuth'
import {
  createSajuAnalysis,
  isSajuPreviewResponse,
} from '../../features/saju/api'
import { getSajuForm } from '../../features/saju/storage'
import { toSajuAnalysisRequest } from '../../features/saju/mapper'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import './SajuPreviewPage.css'

function SajuPreviewContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const requestId = useRef(0)
  useLayoutEffect(
    () => () => {
      requestId.current++
    },
    [],
  )
  async function showFull() {
    if (pending) return
    if (auth.status !== 'authenticated') {
      navigate('/signup')
      return
    }
    const input = getSajuForm()
    if (!input) {
      navigate('/saju')
      return
    }
    setPending(true)
    setError(false)
    const id = ++requestId.current
    try {
      await createSajuAnalysis(toSajuAnalysisRequest(input))
      if (requestId.current !== id) return
      navigate('/saju/analysis')
    } catch {
      if (requestId.current === id) setError(true)
    } finally {
      if (requestId.current === id) setPending(false)
    }
  }

  const result: unknown = location.state

  if (!isSajuPreviewResponse(result)) {
    return (
      <Navigate to={location.state?.resumed ? '/entry' : '/saju'} replace />
    )
  }

  return (
    <main className="preview">
      <section className="preview__content">
        <p className="preview__eyebrow">{result.year}년 당신의 핵심 키워드는</p>

        <h1 className="preview__keyword">{result.keyword}</h1>

        <p className="preview__summary">{result.summary}</p>

        <div className="preview__locked">
          <h2>더 자세히 알고 싶다면</h2>

          <p>
            성향, 연애, 재물, 올해의 흐름까지 전체 사주 분석에서 확인할 수
            있어요.
          </p>
        </div>

        {error && <p role="alert">분석 중 문제가 발생했습니다.</p>}
        <button
          type="button"
          className="preview__next"
          disabled={
            pending ||
            auth.status === 'checking' ||
            auth.status === 'checkError' ||
            auth.logoutState !== 'idle'
          }
          onClick={() => void showFull()}
        >
          {pending ? '분석 중...' : '전체 사주 분석 보기'}
        </button>
      </section>
    </main>
  )
}

function SajuPreviewPage() {
  const location = useLocation()
  // A new history entry gets independent UI state and request ownership.
  return <SajuPreviewContent key={location.key} />
}

export default SajuPreviewPage
