const domain = process.env.CLERK_JWT_ISSUER_DOMAIN;

if (!domain) {
  throw new Error(
    "CLERK_JWT_ISSUER_DOMAIN is required for Clerk-Convex JWT verification"
  );
}

const authConfig = {
  providers: [
    {
      domain,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
