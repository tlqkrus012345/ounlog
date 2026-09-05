import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createSajuPreview } from '../../features/saju/api'
import { toSajuPreviewRequest } from '../../features/saju/mapper'
import type {
  SajuFormState,
  SajuPreviewResponse,
} from '../../features/saju/types'
import './ConfirmPage.css'

function ConfirmPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const state = location.state as SajuFormState | null

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!state) {
    return <div>입력 정보가 없습니다.</div>
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
    } catch {
      setErrorMessage('분석 중 문제가 발생했습니다.')
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
            onClick={() => navigate(-1)}
          >
            ←
          </button>

          <span className="confirm__step">3 / 3</span>
        </header>

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
            <strong>{state.calendarType === 'SOLAR' ? '양력' : '음력'}</strong>
          </div>

          <div className="confirm__row">
            <span>출생시간</span>
            <strong>{state.birthTimeKnown ? state.birthTime : '모름'}</strong>
          </div>
        </div>

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
