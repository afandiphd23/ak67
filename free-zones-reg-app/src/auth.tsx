import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { useLang } from './i18n'

export interface AuthUser {
  email: string
  name: string
  picture?: string
  sub?: string
  authTime: number
}

interface AuthContextType {
  user: AuthUser | null
  loginWithUser: (user: AuthUser) => void
  logout: () => void
  error: string | null
  setError: (err: string | null) => void
}

const AUTH_KEY = 'customs_auth_user'

const AuthCtx = createContext<AuthContextType>({
  user: null,
  loginWithUser: () => {},
  logout: () => {},
  error: null,
  setError: () => {},
})

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const u = JSON.parse(raw) as AuthUser
    if (u?.email && u.email.toLowerCase().endsWith('@customs.gov.my')) {
      return u
    }
    return null
  } catch {
    return null
  }
}

function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser)
  const [error, setError] = useState<string | null>(null)

  const loginWithUser = useCallback((newUser: AuthUser) => {
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(newUser))
    } catch {}
    setUser(newUser)
    setError(null)
  }, [])

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_KEY)
    } catch {}
    setUser(null)
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_KEY) {
        setUser(getStoredUser())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <AuthCtx.Provider value={{ user, loginWithUser, logout, error, setError }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth(): AuthContextType {
  return useContext(AuthCtx)
}

declare global {
  interface Window {
    google?: any
    GOOGLE_CLIENT_ID?: string
  }
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loginWithUser, error, setError } = useAuth()
  const { lang } = useLang()

  useEffect(() => {
    if (user) return

    const loadGsi = () => {
      if (!window.google?.accounts?.id) {
        setTimeout(loadGsi, 300)
        return
      }

      const clientId =
        window.GOOGLE_CLIENT_ID ||
        '969707902481-arou8v55frqagevuq99jua7t2tqqhosm.apps.googleusercontent.com'

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (res: any) => {
            if (!res?.credential) return
            const payload = parseJwt(res.credential)
            if (!payload?.email) {
              setError(
                lang === 'bm'
                  ? 'Gagal memproses token log masuk Google.'
                  : 'Failed to process Google sign-in token.',
              )
              return
            }

            const email = payload.email.toLowerCase().trim()
            if (email.endsWith('@customs.gov.my')) {
              loginWithUser({
                email,
                name: payload.name || 'Pegawai JKDM',
                picture: payload.picture || '',
                sub: payload.sub,
                authTime: Date.now(),
              })
            } else {
              setError(
                lang === 'bm'
                  ? `Akaun tidak dibenarkan: ${email}. Akses terhad kepada warga Jabatan Kastam Diraja Malaysia (@customs.gov.my) sahaja.`
                  : `Unauthorized account: ${email}. Access is restricted to Royal Malaysian Customs Department officers (@customs.gov.my) only.`,
              )
            }
          },
          auto_select: false,
          cancel_on_tap_outside: false,
        })

        const btnEl = document.getElementById('react-google-btn')
        if (btnEl) {
          window.google.accounts.id.renderButton(btnEl, {
            theme: 'filled_black',
            size: 'large',
            shape: 'pill',
            width: 280,
            text: 'signin_with',
          })
        }
      } catch (e) {
        console.warn('Google GSI error:', e)
      }
    }

    loadGsi()
  }, [user, lang, loginWithUser, setError])

  const handleDemoLogin = () => {
    const promptMsg =
      lang === 'bm'
        ? 'Masukkan e-mel rasmi @customs.gov.my anda:'
        : 'Enter your official @customs.gov.my email:'
    const email = window.prompt(promptMsg, 'pegawai@customs.gov.my')
    if (!email) return
    const clean = email.toLowerCase().trim()
    if (!clean.endsWith('@customs.gov.my')) {
      setError(
        lang === 'bm'
          ? `Akaun tidak sah: ${clean}. Sila gunakan alamat e-mel @customs.gov.my.`
          : `Invalid account: ${clean}. Please use an @customs.gov.my email address.`,
      )
      return
    }
    loginWithUser({
      email: clean,
      name: clean.split('@')[0].replace('.', ' ').toUpperCase(),
      authTime: Date.now(),
    })
  }

  if (user) {
    return <>{children}</>
  }

  return (
    <div className="auth-gate-overlay">
      <div className="auth-card">
        <div className="auth-crest">JKDM</div>
        <h2>
          {lang === 'bm'
            ? 'Pembaca Undang-Undang Rasmi'
            : 'Official Law Reader'}
        </h2>
        <p className="auth-subtitle">
          {lang === 'bm'
            ? 'Akses kepada teks undang-undang digital ini dikhaskan untuk pegawai Jabatan Kastam Diraja Malaysia yang diberi kuasa.'
            : 'Access to this digital reader is restricted to authorized officers of the Royal Malaysian Customs Department.'}
        </p>
        <div>
          <span className="auth-domain-pill">🔒 @customs.gov.my</span>
        </div>

        {error && <div className="auth-error visible">{error}</div>}

        <div className="auth-actions">
          <div id="react-google-btn" className="g-btn-wrapper">
            <button
              type="button"
              className="custom-google-btn"
              onClick={() => {
                if (window.google?.accounts?.id) {
                  window.google.accounts.id.prompt()
                }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              <span>{lang === 'bm' ? 'Log masuk dengan Google' : 'Sign in with Google'}</span>
            </button>
          </div>
          <button
            type="button"
            className="demo-login-btn"
            onClick={handleDemoLogin}
          >
            ⚡{' '}
            {lang === 'bm'
              ? 'Pengesahan Pegawai (Ujian / Demo)'
              : 'Officer Verification Sign-In (Demo / Test)'}
          </button>
        </div>
      </div>
    </div>
  )
}
