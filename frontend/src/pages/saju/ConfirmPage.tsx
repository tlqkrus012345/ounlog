import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { createSajuPreview } from '../../features/saju/api'
import { toSajuPreviewRequest } from '../../features/saju/mapper'
import { getSajuForm } from '../../features/saju/storage'
import { ApiTimeoutError } from '../../shared/api/errors'
import type {
  SajuFormState,
  SajuPreviewResponse,
} from '../../features/saju/types'
import './ConfirmPage.css'

function ConfirmPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [state] = useState(
    () => (location.state as SajuFormState | null) ?? getSajuForm(),
  )

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!state) {
    return <Navigate to="/saju" replace />
  }

  const handleAnalyze = async () => {
    try {
      setIsLoading(true)
      setErrorMessage(null)

      const request = toSajuPreviewRequest(state)

      const result: SajuPreviewResponse = await createSajuPreview(request)

      navigate('/saju/preview', {
        state: result,
      })
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof ApiTimeoutError
          ? '분석이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'
          : '분석 중 문제가 발생했습니다.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="confirm">
      <section className="confirm__content">
        <header className="confirm__top">
          <button
            type="button"
            className="confirm__back"
            aria-label="이전 단계로 이동"
            disabled={isLoading}
            onClick={() => navigate(-1)}
          >
            ←
          </button>

          <span className="confirm__step">3 / 3</span>
        </header>

        {isLoading ? (
          <div
            className="confirm__loading"
            role="status"
            aria-label="사주 분석 진행 상태"
          >
            <div className="confirm__loading-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <h1>올해의 흐름을 해석하는 중</h1>
            <p>
              사주와 올해의 흐름을 살펴보고 있어요.
              <br />
              결과를 준비하는 데 시간이 조금 걸릴 수 있어요.
            </p>
          </div>
        ) : (
          <>
            <div className="confirm__header">
              <h1>입력한 정보가 맞나요?</h1>
              <p>분석을 시작하기 전에 한 번 확인해주세요.</p>
            </div>

            <div className="confirm__summary">
              <div className="confirm__row">
                <span>생년월일</span>
                <strong>{state.birthDate}</strong>
              </div>

              <div className="confirm__row">
                <span>달력 기준</span>
                <strong>
                  {state.calendarType === 'SOLAR' ? '양력' : '음력'}
                </strong>
              </div>

              {state.calendarType === 'LUNAR' && (
                <div className="confirm__row">
                  <span>음력 월 구분</span>
                  <strong>{state.isLeapMonth ? '윤달' : '평달'}</strong>
                </div>
              )}

              <div className="confirm__row">
                <span>출생시간</span>
                <strong>{state.birthTime}</strong>
              </div>

              <div className="confirm__row">
                <span>성별</span>
                <strong>{state.gender === 'MALE' ? '남성' : '여성'}</strong>
              </div>
            </div>
          </>
        )}

        {errorMessage && <p className="saju__error">{errorMessage}</p>}

        <button
          type="button"
          className="confirm__next"
          disabled={isLoading}
          onClick={handleAnalyze}
        >
          {isLoading ? '분석 중...' : '분석 시작하기'}
        </button>
      </section>
    </main>
  )
}

export default ConfirmPage
