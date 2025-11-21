import { getToken as getTokenNextjs } from "@convex-dev/better-auth/nextjs";
import { createAuth } from "../../../packages/backend/convex/auth";

export const getAuthToken = () => {
  return getTokenNextjs(createAuth);
};
