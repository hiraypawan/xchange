import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      twitterId: string
      username: string
      credits: number
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }

  interface User {
    id: string
    twitterId: string
    username: string
    credits: number
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    twitterId: string
    username: string
    credits: number
    userId: string
  }
}