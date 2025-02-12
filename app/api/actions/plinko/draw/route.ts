  
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
    
    import bs58 from 'bs58';
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
            const url = new URL(req.url);
            const amount = url.searchParams.get("amount");
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
    
            const connection = new Connection(
                process.env.SOLANA_RPC || clusterApiUrl("devnet")
            );
    
            
           
    
            // Process reward for wins/draws
            const reward =  Number(amount) ;
            const web3 = require("@solana/web3.js");
            const sender= gameWallet;
        


             // Exchanging Tokens Code 

             // const TOKENS = {
    //     USDC: new PublicKey("SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa"),
    //     SOL: new PublicKey("So11111111111111111111111111111111111111112"),
    //   };
      
    //   const JUP_API = "https://quote-api.jup.ag/v6";
    
    //     console.log(`Swapping ${amount} SOL to USDC for ${account.toString()}`);
    
    //     // Convert SOL amount to lamports
    //     const scaledAmount =Number(amount) * LAMPORTS_PER_SOL;
    
    //     // Get a quote from the Jupiter API
    //     const response = await fetch(
    //         `${JUP_API}/quote?inputMint=${TOKENS.SOL.toString()}&outputMint=${TOKENS.USDC.toString()}&amount=${scaledAmount}&dynamicSlippage=true`
    //       );
    //       const quoteResponse = await response.json();

    //       console.log("Jupiter Quote Response:", quoteResponse);
    //     if (!quoteResponse || !quoteResponse.outAmount) {
    //       throw new Error("Invalid quote response from Jupiter API.");
    //     }
    
    //     console.log("Jupiter Quote:", quoteResponse);
    
    //     // Send swap transaction to Jupiter API
    //     const swapResponse = await fetch(`${JUP_API}/swap`, {
    //       method: "POST",
    //       headers: { "Content-Type": "application/json" },
    //       body: JSON.stringify({
    //         quoteResponse,
    //         userPublicKey: account.toString(),
    //         wrapAndUnwrapSol: true,
    //         dynamicComputeUnitLimit: true,
    //         dynamicSlippage: true,
    //       }),
    //     }).then((res) => res.json());
    // console.log("SP",swapResponse)
    //     if (!swapResponse.swapTransaction) {
    //       throw new Error("Swap transaction not received from Jupiter API.");
    //     }
    //     console.log("Transaction:",swapResponse.swapTransaction);


    //     console.log("Swap Successful! ");
    //     const simulate = await connection.simulateTransaction(transaction);
    //     const isError = simulate.value.err != null;
    //     if (isError) {
    //         throw new Error("Transaction failed: " + simulate.value.err);
    //     }
    
    
    //     const { swapInstruction: swapInstructionPayload } = swapResponse;



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
            transaction.add(web3.SystemProgram.transfer({
              fromPubkey: sender.publicKey,
              toPubkey: account,
              lamports: Number(reward) * LAMPORTS_PER_SOL,
            }));
            // set the end user as the fee payer
            transaction.feePayer = account;
        
            // Get the latest Block Hash
            transaction.recentBlockhash = (
              await connection.getLatestBlockhash()
            ).blockhash;
        // console.log("Transaction",transaction);
            const payload: ActionPostResponse = await createPostResponse({
                fields: {
                  type: "transaction",
                  transaction,
                  message: `${reward} SOL sent to your account, Play again!`,
                },
                // no additional signers are required for this transaction
                signers: [sender],
              });
    
            return Response.json(payload, { headers });
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


   