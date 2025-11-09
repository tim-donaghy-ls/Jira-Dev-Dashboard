import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

// Whitelist of allowed email addresses
const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS?.split(',').map(email => email.trim()) || []

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Check if user email is in whitelist
      if (!user.email) {
        return false
      }

      // If whitelist is empty, allow all (for initial setup)
      if (ALLOWED_EMAILS.length === 0) {
        console.warn('Warning: No email whitelist configured. All Google users can access.')
        return true
      }

      // Check if email is in whitelist
      const isAllowed = ALLOWED_EMAILS.includes(user.email.toLowerCase())

      if (!isAllowed) {
        console.log(`Access denied for ${user.email} - not in whitelist`)
      }

      return isAllowed
    },
    async session({ session, token }) {
      // Add user ID to session
      if (session.user) {
        session.user.id = token.sub
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
