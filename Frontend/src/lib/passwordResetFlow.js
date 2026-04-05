const PASSWORD_RESET_FLOW_STORAGE_KEY = 'onehoa_password_reset_flow'

function safeParseJSON(rawValue) {
  try {
    return JSON.parse(rawValue)
  } catch {
    return {}
  }
}

export function getPasswordResetFlowState() {
  if (typeof window === 'undefined') {
    return {}
  }

  const rawValue = window.sessionStorage.getItem(PASSWORD_RESET_FLOW_STORAGE_KEY)
  if (!rawValue) {
    return {}
  }

  const parsedValue = safeParseJSON(rawValue)
  return parsedValue && typeof parsedValue === 'object' ? parsedValue : {}
}

export function setPasswordResetFlowState(nextState) {
  if (typeof window === 'undefined') {
    return
  }

  const currentState = getPasswordResetFlowState()
  const mergedState = {
    ...currentState,
    ...nextState,
  }

  window.sessionStorage.setItem(PASSWORD_RESET_FLOW_STORAGE_KEY, JSON.stringify(mergedState))
}

export function clearPasswordResetFlowState() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(PASSWORD_RESET_FLOW_STORAGE_KEY)
}