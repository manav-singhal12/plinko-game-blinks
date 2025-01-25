    import {
        createActionHeaders,
        NextActionPostRequest,
        ActionError,
        CompletedAction,
        MEMO_PROGRAM_ID,
        ActionPostResponse,
        createPostResponse
    } from "@solana/actions";
    import {
        clusterApiUrl,
        Connection,
        PublicKey,
        SystemProgram,
        Transaction,
        TransactionInstruction,
        LAMPORTS_PER_SOL,
        Keypair,
        ComputeBudgetProgram,
    } from "@solana/web3.js";
    
    // Create headers for this route (including CORS)
    const headers = createActionHeaders({
        chainId: 'devnet',
        actionVersion: '2.2.1',
    });
    
    // Load and initialize game wallet
    let gameWallet: Keypair;
    try {
        const privateKeyString = process.env.GAME_WALLET_PRIVATE_KEY;
        if (!privateKeyString) {
            throw new Error('GAME_WALLET_PRIVATE_KEY not found in environment');
        }
        const privateKeyArray = JSON.parse(privateKeyString);
        const secretKey = Uint8Array.from(privateKeyArray);
        gameWallet = Keypair.fromSecretKey(secretKey);
        console.log('Game wallet initialized with public key:', gameWallet.publicKey.toBase58());
    } catch (error) {
        console.error('Failed to initialize game wallet:', error);
        throw new Error('Game wallet initialization failed');
    }
    
    // GET Request Code
    // Since this is a next action endpoint, GET is not supported
    export const GET = async () => {
        return Response.json({ message: "Method not supported" } as ActionError, {
            status: 403,
            headers,
        });
    };
    
    // OPTIONS Code
    export const OPTIONS = async () => Response.json(null, { headers });
    
    // POST Request Code
    export const POST = async (req: Request) => {
        try {
            const body: NextActionPostRequest = await req.json();
    
            // Validate account
            let account: PublicKey;
            try {
                account = new PublicKey(body.account);
            } catch (err) {
                console.error(err);
                return Response.json({ message: 'Invalid account' } as ActionError, {
                    status: 400,
                    headers
                });
            }
    const url= new URL(req.url);
    const amount= url.searchParams.get("amount");
            const connection = new Connection(
                process.env.SOLANA_RPC || clusterApiUrl("devnet")
            );
    
            const web3 = require("@solana/web3.js");
    const sender=gameWallet;

    const transaction = new Transaction().add(
      // note: `createPostResponse` requires at least 1 non-memo instruction
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1000,
      }),
      new TransactionInstruction({
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(
          `User won ${amount} SOL`,
          "utf8"
        ),
        keys: [],
      })
    );
    // set the end user as the fee payer
    transaction.feePayer = account;

    // Get the latest Block Hash
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;
        
            
            // Return completed action for losses
                const payload: ActionPostResponse = await createPostResponse({
                    fields: {
                      type: "transaction",
                      transaction,
                      message: `You lost, Play again!`,
                    },
                  });
              
                return Response.json(payload, { headers });
            
    
            // Process reward for wins/draws
            
        } catch (err) {
            console.error(err);
            const actionError: ActionError = { message: "An unknown error occurred" };
            if (typeof err == "string") actionError.message = err;
            return Response.json(actionError, {
                status: 400,
                headers,
            });
        }
    };