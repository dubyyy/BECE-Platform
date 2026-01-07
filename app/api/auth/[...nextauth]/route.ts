import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      httpOptions: {
        timeout: 10000, // Increase timeout to 10 seconds
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Add error logging for debugging
      console.log("Sign in attempt:", { user: user.email, provider: account?.provider });
      return true;
    },
  },
  debug: process.env.NODE_ENV === 'development', // Enable debug logs in development
});

export { handler as GET, handler as POST };
