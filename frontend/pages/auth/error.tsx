import { useRouter } from 'next/router'
import Link from 'next/link'

export default function AuthError() {
  const router = useRouter()
  const { error } = router.query

  const getErrorMessage = (error: string | string[] | undefined) => {
    if (!error || typeof error !== 'string') {
      return 'An unknown error occurred'
    }

    switch (error) {
      case 'AccessDenied':
        return 'Access denied. Your email is not authorized to access this dashboard.'
      case 'Configuration':
        return 'There is a problem with the server configuration.'
      case 'Verification':
        return 'The verification token has expired or has already been used.'
      default:
        return 'An error occurred during authentication.'
    }
  }

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
        <div style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 24px',
          backgroundColor: '#fee',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="#c33" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: 600,
          marginBottom: '12px',
          color: '#333'
        }}>
          Authentication Error
        </h1>

        <p style={{
          color: '#666',
          marginBottom: '32px',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          {getErrorMessage(error)}
        </p>

        <Link
          href="/auth/signin"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#4285f4',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'background-color 0.2s'
          }}
        >
          Try Again
        </Link>

        <p style={{
          marginTop: '24px',
          fontSize: '12px',
          color: '#999'
        }}>
          If you believe you should have access, contact your administrator.
        </p>
      </div>
    </div>
  )
}
