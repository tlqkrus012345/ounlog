import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSajuForm } from '../../features/saju/storage'
import type { CalendarType, Gender } from '../../features/saju/types'
import './BirthDatePage.css'

function BirthDatePage() {
  const navigate = useNavigate()
  const [storedForm] = useState(getSajuForm)

  const [birthDate, setBirthDate] = useState(storedForm?.birthDate ?? '')
  const [calendarType, setCalendarType] = useState<CalendarType>(
    storedForm?.calendarType ?? 'SOLAR',
  )
  const [gender, setGender] = useState<Gender | null>(
    storedForm?.gender ?? null,
  )
  const [isLeapMonth, setIsLeapMonth] = useState<boolean | null>(
    storedForm?.calendarType === 'LUNAR' ? storedForm.isLeapMonth : false,
  )

  const canProceed =
    birthDate !== '' &&
    gender !== null &&
    (calendarType === 'SOLAR' || isLeapMonth !== null)

  const selectCalendarType = (nextCalendarType: CalendarType) => {
    if (nextCalendarType === calendarType) {
      return
    }

    setCalendarType(nextCalendarType)
    setIsLeapMonth(nextCalendarType === 'SOLAR' ? false : null)
  }

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
                onClick={() => selectCalendarType('SOLAR')}
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
                onClick={() => selectCalendarType('LUNAR')}
              >
                음력
              </button>
            </div>
          </div>

          {calendarType === 'LUNAR' && (
            <div className="birth-date__field">
              <span className="birth-date__label">음력 월 구분</span>

              <div className="birth-date__leap-month-selector">
                <button
                  type="button"
                  className={
                    isLeapMonth === false
                      ? 'birth-date__leap-month-button birth-date__leap-month-button--selected'
                      : 'birth-date__leap-month-button'
                  }
                  onClick={() => setIsLeapMonth(false)}
                >
                  평달
                </button>

                <button
                  type="button"
                  className={
                    isLeapMonth === true
                      ? 'birth-date__leap-month-button birth-date__leap-month-button--selected'
                      : 'birth-date__leap-month-button'
                  }
                  onClick={() => setIsLeapMonth(true)}
                >
                  윤달
                </button>
              </div>
            </div>
          )}

          <div className="birth-date__field">
            <span className="birth-date__label">성별</span>

            <div className="birth-date__gender-selector">
              <button
                type="button"
                className={
                  gender === 'MALE'
                    ? 'birth-date__gender-button birth-date__gender-button--selected'
                    : 'birth-date__gender-button'
                }
                onClick={() => setGender('MALE')}
              >
                남성
              </button>

              <button
                type="button"
                className={
                  gender === 'FEMALE'
                    ? 'birth-date__gender-button birth-date__gender-button--selected'
                    : 'birth-date__gender-button'
                }
                onClick={() => setGender('FEMALE')}
              >
                여성
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
                gender,
                isLeapMonth: isLeapMonth ?? false,
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
