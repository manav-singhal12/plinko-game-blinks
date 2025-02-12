import {
    ActionGetResponse,
    ActionPostRequest,
    ActionPostResponse,
    createActionHeaders,
    createPostResponse,
    ActionError,
    MEMO_PROGRAM_ID,
} from "@solana/actions";
import { getOrCreateAssociatedTokenAccount, createTransferInstruction, getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
    clusterApiUrl,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    sendAndConfirmTransaction,
    Signer,
    SystemProgram,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";

// create the standard headers for this route (including CORS)
const headers = createActionHeaders({
    chainId: 'devnet',
    actionVersion: '2.2.1',
});
// Game wallet to receive/send SOL

const GAME_WALLET = new PublicKey('EqkEhUr7832poEPo4sPsysntQ3r9EJL1dC3iYAZB5KF5');

// Helper function to determine winner
function determineWinner(): 'win' | 'lose' | 'draw' {
    const random = Math.floor(Math.random() * 10); // Generates 0 to 9
    if (random < 5) return 'lose';
    else if (random < 9) return 'win';
    else return 'draw';

}


export const GET = async (req: Request) => {
    const payload: ActionGetResponse = {
        title: "Plinko ",
        icon: new URL("/image.png", new URL(req.url).origin).toString(),
        description: "Let's play Plinko! Drop a ball and watch it bounce—where it lands determines your prize. Hit the 2X to double your amount, or aim for consistent payouts. The thrill is in the drop!",
        label: "Play Plinko",
        links: {
            actions: [
                {
                    label: "Play!",
                    href: `${req.url}?amount={amount}`,
                    type: 'transaction',
                    parameters: [
                        {
                            type: "select",
                            name: "amount",
                            label: "Bet Amount in SOL",
                            required: true,
                            options: [
                                { label: "0.01 SOL", value: "0.01" },
                                { label: "0.1 SOL", value: "0.1" },
                                { label: "1 SOL", value: "1" }
                            ]
                        },
                    ]
                }
            ]
        }
    };

    return Response.json(payload, { headers });
};


export const OPTIONS = async () => {
    return new Response(null, { headers });
};


//   POST Request Code
export const POST = async (req: Request) => {
    try {
        const url = new URL(req.url);
        const amount = parseFloat(url.searchParams.get('amount') || '0');
        const body: ActionPostRequest = await req.json();

        console.log(body);
        if (!amount || amount <= 0) {
            return Response.json({ error: 'Invalid bet amount' }, {
                status: 400,
                headers
            });
        }

        
        let account: PublicKey;
        try {
            account = new PublicKey(body.account);
        } catch (err) {
            console.error(err);
            return Response.json({ error: 'Invalid account' }, {
                status: 400,
                headers
            });
        }
        const connection = new Connection(
            process.env.SOLANA_RPC || clusterApiUrl('devnet')
        );

        const result = determineWinner();
        
        const transaction = new Transaction();

        transaction.add(
            new TransactionInstruction({
              programId: new PublicKey(MEMO_PROGRAM_ID),
              data: Buffer.from(
                `User chose  with bet ${amount} SOL`,
                "utf8"
              ),
              keys: [],
            })
          );
          transaction.add(SystemProgram.transfer({
            fromPubkey: account,
            toPubkey: GAME_WALLET,
            lamports: Number(amount) * LAMPORTS_PER_SOL,
          }));

        // //   let signer:Signer=account;
        //   // set the end user as the fee payer
        //   const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
        //     connection,
        //     FROM_KEYPAIR, // Payer and signer
        //     TOKEN_MINT,
        //     GAME_WALLET // Owner of the token account
        //   );

        // // Create token account for the receiver
        // const receiverTokenAccount = await getOrCreateAssociatedTokenAccount(
        //     connection,
        //     FROM_KEYPAIR, // Payer and signer
        //     TOKEN_MINT,
        //     DESTINATION_WALLET // Owner of the destination token account
        //   );
        // // Transfer SPL tokens
        // // const transferInstruction=new Transaction();
        // const transferInstruction = createTransferInstruction(
        //     senderTokenAccount.address, // Source account
        //     receiverTokenAccount.address, // Destination account
        //     GAME_WALLET, // Owner of the source account
        //     amount * LAMPORTS_PER_SOL, // Amount to transfer
        // );

        // transaction.add(transferInstruction);
        transaction.feePayer = account; // End user's public key
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;



        // Let's assume we have 3 different gif for winning,losing and draw making a variable to display different gifs randomly
        let displaynum;
        const random = Math.floor(Math.random() * 10); 
        if (random < 3.33) displaynum=1;
        else if (random < 6.66) displaynum=2;
        else displaynum=3;
        // Chain to reward route if win/draw
        
        let image: string = `1sol${displaynum}.gif`;
        let res = 'draw'
        if (result === 'win') {
            res = 'win';
            image = `2sol${displaynum}.gif`;
        }
        else if (result === 'lose') {
            res = 'lost';
            image = `0sol${displaynum}.gif`;
        }

        //for checking
        displaynum=1;
        res='lost';
        image="2sol1.gif";
        // console.log(body);
        // console.log("treansaction", transaction);
        const payload: ActionPostResponse = (res === 'lost') ? await createPostResponse({

            fields: {
                type: 'transaction',
                transaction,
                message: `Result: ${result}`,
                links: {
                    next: {
                        type: 'inline',
                        action: {
                            type: "action",
                            title: `Plinko Game ${res}`,
                            icon: new URL(`${image}`, new URL(req.url).origin).toString(),
                            description: ``,
                            label: "Plinko Game",
                            "links": {
                                "actions": [
                                    {
                                        "label": "Claim Prize!", // button text
                                        "href": `/api/actions/plinko/lost?amount=${amount}`, // route to reward logic
                                        type: "transaction"
                                    }
                                ]
                            }
                        },
                    },
                },
            },
        }) : await createPostResponse({

            fields: {
                type: 'transaction',
                transaction,
                message: `Result: ${result}`,
                links: {
                    next: {
                        type: 'inline',
                        action: {
                            type: "action",
                            title: `Plinko Game ${res}`,
                            icon: new URL(`${image}`, new URL(req.url).origin).toString(),
                            description: ``,
                            label: "Plinko Game",
                            "links": {
                                "actions": [
                                    {
                                        "label": "Claim Prize!", // button text
                                        "href": `/api/actions/plinko/${res}?amount=${amount}`, // route to reward logic
                                        type: "transaction"
                                    }
                                ]
                            }
                        },
                    },
                },
            },
        })
        return Response.json(payload, { headers });

    } catch (err) {
        console.error(err);
        const actionError: ActionError = {
            message: typeof err === 'string' ? err : 'Internal server error'
        };
        return Response.json(actionError, {
            status: 500,
            headers
        });
    }
};

