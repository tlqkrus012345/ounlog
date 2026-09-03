import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

type CalendarType = 'SOLAR' | 'LUNAR'

function SajuPage() {
  const navigate = useNavigate()

  const [birthDate, setBirthDate] = useState('')
  const [calendarType, setCalendarType] = useState<CalendarType>('SOLAR')

  const canProceed = birthDate !== ''

  return (
    <main className="saju">
      <section className="saju__content">
        <header className="saju__top">
          <button
            type="button"
            className="saju__back"
            onClick={() => navigate(-1)}
          >
            ←
          </button>

          <span className="saju__step">1 / 3</span>
        </header>

        <div className="saju__header">
          <h1>언제 태어나셨나요?</h1>
          <p>
            정확한 사주 분석을 위해
            <br />
            생년월일을 알려주세요.
          </p>
        </div>

        <div className="saju__form">
          <div className="saju__field">
            <label htmlFor="birthDate">생년월일</label>

            <input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </div>

          <div className="saju__field">
            <span className="saju__label">달력 기준</span>

            <div className="calendar-selector">
              <button
                type="button"
                className={
                  calendarType === 'SOLAR'
                    ? 'calendar-selector__button calendar-selector__button--selected'
                    : 'calendar-selector__button'
                }
                onClick={() => setCalendarType('SOLAR')}
              >
                양력
              </button>

              <button
                type="button"
                className={
                  calendarType === 'LUNAR'
                    ? 'calendar-selector__button calendar-selector__button--selected'
                    : 'calendar-selector__button'
                }
                onClick={() => setCalendarType('LUNAR')}
              >
                음력
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="saju__next"
          disabled={!canProceed}
          onClick={() =>
            navigate('/saju/birth-time', {
              state: {
                birthDate,
                calendarType,
              },
            })
          }
        >
          다음
        </button>
      </section>
    </main>
  )
}

export default SajuPage
