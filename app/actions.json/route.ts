import { ActionsJson, createActionHeaders } from "@solana/actions";

const headers = createActionHeaders({
  chainId: "devnet", // or chainId: "devnet"
  actionVersion: "2.2.1", // the desired spec version
});
export const GET = async () => {
  const payload: ActionsJson = {
    rules: [
      // map all root level routes to an action
      {
        pathPattern: "/*",
        apiPath: "/api/actions/plinko/*",
      },
      // idempotent rule as the fallback
      /*
      Idempotent rules allow blink clients to more easily determine if a given path supports 
      Action API requests without having to be prefixed with the solana-action: 
      URI or performing additional response testing.
      */
      {
        pathPattern: "/api/actions/plinko/**",
        apiPath: "/api/actions/plinko/**",
      },
    ],
  };

  return Response.json(payload, {
    headers,
  });
};

// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
export const OPTIONS = GET;