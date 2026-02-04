import { DefaultSession, DefaultUser } from "next-auth";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isBrand?: boolean;
      isCreator?: boolean;
      activeRole?: UserRole;
      isOnboarded?: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    isBrand?: boolean;
    isCreator?: boolean;
    activeRole?: UserRole;
    isOnboarded?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    isBrand?: boolean;
    isCreator?: boolean;
    activeRole?: UserRole;
    isOnboarded?: boolean;
  }
}
