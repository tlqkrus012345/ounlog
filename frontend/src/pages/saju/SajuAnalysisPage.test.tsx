import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { sajuAnalysisResponse } from '../../test/sajuAnalysisFixture'
import { tokenResponse } from '../../test/authFixture'
import { server } from '../../test/server'
import { AuthProvider } from '../../features/auth/AuthProvider'
import { authRuntime } from '../../features/auth/runtime'
import { saveAnalysisResult } from '../../features/saju/result'
import type { SajuAnalysisResponse } from '../../features/saju/types'
import SajuAnalysisPage from './SajuAnalysisPage'

async function show(result: SajuAnalysisResponse, created = false) {
  server.use(
    http.post('/v1/auth/refresh', () => HttpResponse.json(tokenResponse())),
    http.get('/v1/saju/analysis', () => HttpResponse.json(result)),
  )
  await authRuntime.restore()
  if (created) saveAnalysisResult({ ...result, status: 'CREATED' })
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/saju/analysis']}>
        <SajuAnalysisPage />
      </MemoryRouter>
    </AuthProvider>,
  )
}
describe('SajuAnalysisPage', () => {
  it('인증된 회원의 Full Analysis 결과와 문단을 표시한다', async () => {
    await show(sajuAnalysisResponse(), true)
    expect(
      await screen.findByText('전체 사주 분석 결과입니다.'),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual([
      '오행 분석',
      '올해 사주 총평',
      '성향 해석',
      '커리어 해석',
      '재물 해석',
      '관계 해석',
      '현재 대운 해석',
    ])
    expect(screen.getByText('2026-10-17')).toHaveAttribute(
      'datetime',
      '2026-10-17',
    )
    expect(
      screen.queryByText('이미 분석이 완료된 결과가 있습니다.'),
    ).not.toBeInTheDocument()
  })
  it('메모리 결과가 없으면 기존 결과를 GET으로 조회한다', async () => {
    await show(sajuAnalysisResponse('기존 전체 사주 분석 결과입니다.'))
    expect(
      await screen.findByText('기존 전체 사주 분석 결과입니다.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('이미 분석이 완료된 결과가 있습니다.'),
    ).toBeInTheDocument()
  })
  it('구형 결과의 기준일과 문단을 임의로 만들지 않는다', async () => {
    await show({
      result: null,
      legacyResult: '구형 문자열 결과',
      asOfDate: null,
    })
    expect(await screen.findByText('구형 문자열 결과')).toBeInTheDocument()
    expect(screen.getByText(/해석 기준일 정보가 없습니다/)).toBeInTheDocument()
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0)
  })
  it('history에 넣은 결과를 무시하고 결과 부재 시 생성 없이 선택 화면으로 이동한다', async () => {
    server.use(
      http.post('/v1/auth/refresh', () => HttpResponse.json(tokenResponse())),
      http.get(
        '/v1/saju/analysis',
        () => new HttpResponse(null, { status: 404 }),
      ),
    )
    await authRuntime.restore()
    // Use the legacy business error envelope to represent the existing GET contract.
    server.use(
      http.get('/v1/saju/analysis', () =>
        HttpResponse.json(
          {
            status: 404,
            code: 'SAJU_NOT_FOUND',
            message: '없음',
            path: '/v1/saju/analysis',
          },
          { status: 404 },
        ),
      ),
    )
    render(
      <AuthProvider>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/saju/analysis',
              state: sajuAnalysisResponse('유출되면 안 되는 결과'),
            },
          ]}
        >
          <Routes>
            <Route path="/saju/analysis" element={<SajuAnalysisPage />} />
            <Route path="/entry" element={<h1>서비스 선택</h1>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )
    expect(await screen.findByText('서비스 선택')).toBeInTheDocument()
    expect(screen.queryByText('유출되면 안 되는 결과')).not.toBeInTheDocument()
  })
})
