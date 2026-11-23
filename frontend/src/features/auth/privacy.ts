export const PRIVACY_CLEAR = 'ounlog:privacy-clear'

export function clearPrivateData() {
  window.dispatchEvent(new Event(PRIVACY_CLEAR))
}
