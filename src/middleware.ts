//src/middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/chronicler_db/login",
  },
});

export const config = {
  matcher: ["/chronicler_db/:path*"],
};