import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getSajuAnalysis } from '../../features/saju/api'
import { getAnalysisResult } from '../../features/saju/result'
import { useAuth } from '../../features/auth/useAuth'
import { AuthStatus } from '../../features/auth/AuthStatus'
import { authCopy } from '../../features/auth/copy'
import { ApiError } from '../../shared/api/errors'
import type { SajuAnalysisCreationResult } from '../../features/saju/types'
import './SajuAnalysisPage.css'

const SECTIONS = [
  ['fiveElements', '오행 분석'],
  ['annualOverview', '올해 사주 총평'],
  ['personality', '성향 해석'],
  ['career', '커리어 해석'],
  ['wealth', '재물 해석'],
  ['relationship', '관계 해석'],
  ['currentLuck', '현재 대운 해석'],
] as const

function SajuAnalysisPage() {
  const auth = useAuth()
  const [analysis, setAnalysis] = useState<SajuAnalysisCreationResult | null>(
    getAnalysisResult,
  )
  const [failed, setFailed] = useState(false)
  const [missing, setMissing] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (getAnalysisResult()) return
    const controller = new AbortController()
    void getSajuAnalysis(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted)
          setAnalysis({ ...result, status: 'EXISTING' })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        if (error instanceof ApiError && error.status === 404) setMissing(true)
        else setFailed(true)
      })
    return () => controller.abort()
  }, [attempt])
  if (auth.status !== 'authenticated') return <AuthStatus />
  if (missing) return <Navigate to="/entry" replace />
  if (failed)
    return (
      <div className="auth-status">
        <p role="alert">{authCopy.checkError}</p>
        <button
          className="auth-secondary"
          onClick={() => {
            setFailed(false)
            setAttempt((n) => n + 1)
          }}
        >
          다시 시도
        </button>
      </div>
    )
  if (!analysis)
    return (
      <p role="status" className="auth-status">
        결과를 불러오고 있습니다.
      </p>
    )

  return (
    <main className="analysis">
      <section className="analysis__content">
        <p className="analysis__eyebrow">사주 분석이 완료되었습니다.</p>
        <h1>전체 사주 분석</h1>

        {analysis.asOfDate && (
          <p className="analysis__reference-date">
            해석 기준일:{' '}
            <time dateTime={analysis.asOfDate}>{analysis.asOfDate}</time>
            {' · '}올해와 현재 대운은 생성 당시 기준입니다.
          </p>
        )}

        {analysis.status === 'EXISTING' && (
          <p className="analysis__notice" role="status">
            이미 분석이 완료된 결과가 있습니다.
          </p>
        )}

        <div className="analysis__result">
          {analysis.result ? (
            SECTIONS.map(([key, title]) => (
              <section className="analysis__paragraph" key={key}>
                <h2>{title}</h2>
                <p>{analysis.result[key].content}</p>
              </section>
            ))
          ) : (
            <>
              <p className="analysis__legacy-notice">
                이전 형식의 분석 결과입니다. 해석 기준일 정보가 없습니다.
              </p>
              <p>{analysis.legacyResult}</p>
            </>
          )}
        </div>
      </section>
    </main>
  )
}

export default SajuAnalysisPage
