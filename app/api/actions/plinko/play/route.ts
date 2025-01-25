import {
    ActionGetResponse,
    ActionPostRequest,
    ActionPostResponse,
    createActionHeaders,
    createPostResponse,
    ActionError,
    MEMO_PROGRAM_ID,
} from "@solana/actions";
import {
    clusterApiUrl,
    Connection,
    LAMPORTS_PER_SOL,
    PublicKey,
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
        else if (random < 9) return  'win';
        else return 'draw';
    
}
 
// Generate bot move
// function generateBotMove(): string {
//     const moves = ['R', 'P', 'S'];
//     return moves[Math.floor(Math.random() * moves.length)];
// }
 
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
 
 
//   OPTIONS Code
// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
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
        // Validate inputs
        if (!amount || amount <= 0) {
            return Response.json({ error: 'Invalid bet amount' }, {
                status: 400,
                headers
            });
        }
 
        // Validate account
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
 
        // Create memo instruction with game details to record onchain
        const memoInstruction = new TransactionInstruction({
            keys: [],
            programId: new PublicKey(MEMO_PROGRAM_ID),
            data: Buffer.from(
                `Plinko Game | Result: ${result} | Amount: ${amount} SOL`,
                'utf-8'
            ),
        });
 
        // Create payment instruction
        const paymentInstruction = SystemProgram.transfer({
            fromPubkey: account,
            toPubkey: GAME_WALLET,
            lamports: amount * LAMPORTS_PER_SOL,
        });
 
        // Get latest blockhash
        const { blockhash } = await connection.getLatestBlockhash();
 
        // Create transaction
        const transaction = new Transaction()
            .add(memoInstruction) // Add memo to transaction to record game play onchain
            .add(paymentInstruction); // Actual transaction
 
        transaction.feePayer = account;
        transaction.recentBlockhash = blockhash;
 
        // Create response using createPostResponse helper
        // Chain to reward route if win/draw
        let res='draw'
            if (result === 'win') {
                res='win';
            } 
            else if (result === 'lose') {
                res='lost';
            }
         
        const payload: ActionPostResponse = await createPostResponse({
            fields: {
                type: 'transaction',
                transaction,
                message: `Result: ${result}`,
                links: {
                    next: {
                        type: 'post',
                        href: `/api/actions/plinko/playing`,
                    },
                },
            },
        });
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

// const payload: ActionPostResponse = await createPostResponse({
//     fields: {
//         type: 'transaction',
//         transaction,
//         message: `Result: ${result}`,
//         links: {
//             next: {
//                 type: 'post',
//                 href: `/api/actions/plinko/playing`,
//             },
//         },
//     },
// });