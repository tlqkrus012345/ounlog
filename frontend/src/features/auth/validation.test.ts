import { describe, expect, it } from 'vitest'
import { validateLogin, loginFieldErrors } from './validation'
import { authCopy } from './copy'

describe('login validation', () => {
  it('공란 우선순위와 이메일 길이를 검증한다', () => {
    expect(validateLogin({ email: ' ', password: ' '.repeat(100) })).toEqual({
      email: authCopy.emailRequired,
      password: authCopy.passwordRequired,
    })
    expect(
      validateLogin({ email: 'a'.repeat(256), password: 'valid' }).email,
    ).toBe(authCopy.emailLong)
    expect(
      validateLogin({
        email: 'a'.repeat(243) + '@example.com',
        password: 'valid',
      }),
    ).toEqual({})
  })
  it('비밀번호 원문을 유지하고 코드 포인트와 UTF-8 길이를 함께 확인한다', () => {
    expect(
      validateLogin({ email: ' Me@Example.com ', password: 'a'.repeat(64) }),
    ).toEqual({})
    expect(
      validateLogin({ email: 'a@b.com', password: 'a'.repeat(65) }).password,
    ).toBe(authCopy.passwordLong)
    expect(
      validateLogin({ email: 'a@b.com', password: '가'.repeat(24) }),
    ).toEqual({})
    expect(
      validateLogin({ email: 'a@b.com', password: '가'.repeat(24) + 'a' })
        .password,
    ).toBe(authCopy.passwordLong)
    expect(
      validateLogin({ email: 'a@b.com', password: '😀'.repeat(18) }),
    ).toEqual({})
  })
  it('서버 임의 문구 대신 확정된 문구와 우선순위를 사용한다', () => {
    expect(
      loginFieldErrors([
        { field: 'email', code: 'INVALID_FORMAT', message: 'untrusted' },
        { field: 'email', code: 'TOO_LONG', message: 'untrusted' },
      ]),
    ).toEqual({ email: authCopy.emailLong })
  })
})

it('이메일 도메인에 점이 있어야 한다는 추가 정책을 강제하지 않는다', () => {
  expect(
    validateLogin({ email: 'member@localhost', password: 'password123' }),
  ).toEqual({})
})
