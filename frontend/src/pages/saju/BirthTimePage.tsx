import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getSajuForm, saveSajuForm } from '../../features/saju/storage'
import type { SajuFormState } from '../../features/saju/types'
import './BirthTimePage.css'

function BirthTimePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [previousState] = useState(
    () => (location.state as Partial<SajuFormState> | null) ?? getSajuForm(),
  )

  const [birthTime, setBirthTime] = useState(previousState?.birthTime ?? '')
  const [birthTimeKnown, setBirthTimeKnown] = useState(
    previousState?.birthTimeKnown ?? true,
  )

  const canProceed = !birthTimeKnown || birthTime !== ''

  if (!previousState?.birthDate || !previousState.calendarType) {
    return <Navigate to="/saju" replace />
  }

  const { birthDate, calendarType } = previousState

  const handleNext = () => {
    const form: SajuFormState = {
      birthDate,
      calendarType,
      birthTime: birthTimeKnown ? birthTime : null,
      birthTimeKnown,
    }

    saveSajuForm(form)
    navigate('/saju/confirm', { state: form })
  }

  return (
    <main className="birth-time">
      <section className="birth-time__content">
        <header className="birth-time__top">
          <button
            type="button"
            className="birth-time__back"
            aria-label="이전 단계로 이동"
            onClick={() => navigate(-1)}
          >
            ←
          </button>

          <span className="birth-time__step">2 / 3</span>
        </header>

        <div className="birth-time__header">
          <h1>몇 시에 태어나셨나요?</h1>
          <p>
            태어난 시간을 알면
            <br />더 정밀하게 분석할 수 있어요.
          </p>
        </div>

        <div className="birth-time__form">
          {birthTimeKnown && (
            <div className="birth-time__field">
              <label htmlFor="birthTime">출생시간</label>

              <input
                id="birthTime"
                type="time"
                value={birthTime}
                onChange={(event) => setBirthTime(event.target.value)}
              />
            </div>
          )}

          <button
            type="button"
            className="birth-time__unknown"
            onClick={() => {
              setBirthTimeKnown(!birthTimeKnown)
              setBirthTime('')
            }}
          >
            {birthTimeKnown
              ? '태어난 시간을 모르겠어요'
              : '출생시간을 입력할게요'}
          </button>
        </div>

        <button
          type="button"
          className="birth-time__next"
          disabled={!canProceed}
          onClick={handleNext}
        >
          다음
        </button>
      </section>
    </main>
  )
}

export default BirthTimePage
