import { useEffect, useState } from 'react'

import { RECOVERY_COOLDOWN_SECONDS } from '../passwordRecoveryConstants'

const RECOVERY_COOLDOWN_KEY = 'mailflow.password-recovery.cooldown-until'

export function usePasswordRecoveryCooldown() {
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000))

  useEffect(() => {
    if (cooldownUntil === 0) {
      const savedCooldown = readSavedCooldown()
      if (savedCooldown > Date.now()) {
        setCooldownUntil(savedCooldown)
        setNow(Date.now())
      } else {
        clearSavedCooldown()
      }
      return
    }

    const remainingMs = cooldownUntil - now
    if (remainingMs <= 0) {
      if (cooldownUntil > 0) {
        clearSavedCooldown()
        setCooldownUntil(0)
      }
      return
    }

    const timeout = window.setTimeout(() => setNow(Date.now()), Math.min(remainingMs, 1000))
    return () => window.clearTimeout(timeout)
  }, [cooldownUntil, now])

  function startCooldown(seconds: number) {
    const nextCooldown = Date.now() + seconds * 1000
    try {
      window.sessionStorage.setItem(RECOVERY_COOLDOWN_KEY, String(nextCooldown))
    } catch {
      // The server still enforces the cooldown when browser storage is unavailable.
    }
    setCooldownUntil(nextCooldown)
    setNow(Date.now())
  }

  return { cooldownSeconds, startCooldown }
}

function readSavedCooldown() {
  try {
    const savedCooldown = Number(window.sessionStorage.getItem(RECOVERY_COOLDOWN_KEY))
    if (Number.isFinite(savedCooldown) && savedCooldown > Date.now()) {
      return Math.min(savedCooldown, Date.now() + RECOVERY_COOLDOWN_SECONDS * 1000)
    }
  } catch {
    // Browser storage is optional; Core owns enforcement.
  }
  return 0
}

function clearSavedCooldown() {
  try {
    window.sessionStorage.removeItem(RECOVERY_COOLDOWN_KEY)
  } catch {
    // Browser storage is optional; Core owns enforcement.
  }
}
