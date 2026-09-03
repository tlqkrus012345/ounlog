import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './BirthDatePage.css'

type CalendarType = 'SOLAR' | 'LUNAR'

function BirthDatePage() {
  const navigate = useNavigate()

  const [birthDate, setBirthDate] = useState('')
  const [calendarType, setCalendarType] = useState<CalendarType>('SOLAR')

  const canProceed = birthDate !== ''

  return (
    <main className="birth-date">
      <section className="birth-date__content">
        <header className="birth-date__top">
          <button
            type="button"
            className="birth-date__back"
            aria-label="이전 단계로 이동"
            onClick={() => navigate(-1)}
          >
            ←
          </button>

          <span className="birth-date__step">1 / 3</span>
        </header>

        <div className="birth-date__header">
          <h1>언제 태어나셨나요?</h1>
          <p>
            정확한 사주 분석을 위해
            <br />
            생년월일을 알려주세요.
          </p>
        </div>

        <div className="birth-date__form">
          <div className="birth-date__field">
            <label htmlFor="birthDate">생년월일</label>

            <input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </div>

          <div className="birth-date__field">
            <span className="birth-date__label">달력 기준</span>

            <div className="birth-date__calendar-selector">
              <button
                type="button"
                className={
                  calendarType === 'SOLAR'
                    ? 'birth-date__calendar-button birth-date__calendar-button--selected'
                    : 'birth-date__calendar-button'
                }
                onClick={() => setCalendarType('SOLAR')}
              >
                양력
              </button>

              <button
                type="button"
                className={
                  calendarType === 'LUNAR'
                    ? 'birth-date__calendar-button birth-date__calendar-button--selected'
                    : 'birth-date__calendar-button'
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
          className="birth-date__next"
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

export default BirthDatePage
