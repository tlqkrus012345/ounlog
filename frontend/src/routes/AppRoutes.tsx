import { Route, Routes } from 'react-router-dom'
import EntryPage from '../pages/entry/EntryPage'
import BirthDatePage from '../pages/saju/BirthDatePage'
import BirthTimePage from '../pages/saju/BirthTimePage'
import ConfirmPage from '../pages/saju/ConfirmPage'
import SplashPage from '../pages/splash/SplashPage'
import SajuPreviewPage from '../pages/saju/SajuPreviewPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/entry" element={<EntryPage />} />
      <Route path="/saju" element={<BirthDatePage />} />
      <Route path="/saju/birth-time" element={<BirthTimePage />} />
      <Route path="/saju/confirm" element={<ConfirmPage />} />
      <Route path="/saju/preview" element={<SajuPreviewPage />} />
    </Routes>
  )
}
