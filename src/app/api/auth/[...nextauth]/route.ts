//src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Chronicler Access",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Compare input password with env variable
        if (credentials?.password === process.env.ADMIN_PASSWORD) {
          return { id: "1", name: "The Chronicler", email: "admin@gatelores.com" };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/chronicler_db/login", // Custom login page
  },
  theme: {
    colorScheme: "dark",
  },
  callbacks: {
    async session({ session, token }) {
      return session;
    },
  },
});

export { handler as GET, handler as POST };