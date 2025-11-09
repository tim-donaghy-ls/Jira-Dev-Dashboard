import { signIn } from 'next-auth/react'
import { useRouter } from 'next/router'

export default function SignIn() {
  const router = useRouter()
  const { error } = router.query

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '48px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 600,
          marginBottom: '8px',
          color: '#333'
        }}>
          JIRA Developer Dashboard
        </h1>
        <p style={{
          color: '#666',
          marginBottom: '32px',
          fontSize: '14px'
        }}>
          Sign in to access the dashboard
        </p>

        {error && (
          <div style={{
            backgroundColor: '#fee',
            color: '#c33',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error === 'AccessDenied'
              ? 'Access denied. Your email is not authorized to access this dashboard.'
              : 'An error occurred during sign in.'}
          </div>
        )}

        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          style={{
            width: '100%',
            padding: '12px 24px',
            backgroundColor: '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#357ae8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#4285f4'
          }}
        >
          <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path fill="#fff" d="M44.5 20H24v8h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
          </svg>
          Sign in with Google
        </button>

        <p style={{
          marginTop: '24px',
          fontSize: '12px',
          color: '#999'
        }}>
          Only authorized users can access this dashboard.
          <br />
          Contact your administrator for access.
        </p>
      </div>
    </div>
  )
}
