import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
          console.log("Authorize attempt with API URL:", apiUrl);

          const res = await fetch(`${apiUrl}/api/auth/login`, {
            method: "POST",
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password
            }),
            headers: { "Content-Type": "application/json" },
          });

          const data = await res.json();

          if (res.ok && data.user) {
            return {
              ...data.user,
              accessToken: data.token,
            };
          }
          return null;
        } catch (error) {
          console.error("NextAuth authorize error:", error);
          return null;
        }
      },
    }),
  ],
  // Try multiple sources for the secret
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  debug: true,
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.user = user;
        token.accessToken = user.accessToken;
      }
      // The portal reloads the rights of the working year (role/permissions/unit are per year).
      // Display only — the API re-checks every request against the X-Year header.
      if (trigger === "update" && session?.yearAccess && token.user) {
        const y = session.yearAccess;
        token.user = {
          ...token.user,
          role: y.role, permissions: y.permissions, department: y.department, subDepartment: y.subDepartment,
          workingYear: y.year, yearAccess: y.access,
        };
      }
      return token;
    },
    async session({ session, token }: any) {
      session.user = token.user;
      session.accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
