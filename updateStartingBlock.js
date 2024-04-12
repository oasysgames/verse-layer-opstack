require('dotenv').config();
const ethers = require('ethers');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs');

// Parse command line arguments
const argv = yargs(hideBin(process.argv)).options({
  'starting-blocknumber': { type: 'number', default: 0 },
}).argv;

// Environment variables
const rpcEndpoint = process.env.L1_ETH_RPC_HTTP;
const privateKey = process.env.MR_PROVER_KEY;
const contractAddress = process.env.OP_L2OO_ADDR;

// Check if required environment variables are provided
if (!rpcEndpoint || !privateKey || !contractAddress) {
  console.error('Error: One or more required environment variables (L1_ETH_RPC_HTTP, MR_PROVER_KEY, OP_L2OO_ADDR) are missing or empty.');
  process.exit(1); // Exit the script with an error code
}

async function main() {
  const provider = new ethers.getDefaultProvider(rpcEndpoint);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contractABI = [
    {
      "type":"function",
      "name":"updateStartingBlock",
      "inputs":[
        {"name":"_startingBlockNumber","type":"uint256","internalType":"uint256"},
        {"name":"_startingTimestamp","type":"uint256","internalType":"uint256"}
      ],
      "outputs":[],
      "stateMutability":"nonpayable"
    }
  ];

  const contract = new ethers.Contract(contractAddress, contractABI, wallet);
  const blockNumber = argv['starting-blocknumber'] || 0;

   // Fetch the block for timestamp
   const block = await provider.getBlock('latest');
   const blockTime = block.timestamp;

  // Execute the contract function
  try {
    console.log(`Updating starting block (number=${blockNumber}, time=${blockTime})...`);
    const tx = await contract.updateStartingBlock(blockNumber, blockTime);
    console.log(`Transaction hash: ${tx.hash}`);

    // Wait for 2 confirmations
    await tx.wait(2);
    console.log('Transaction confirmed');

    // Update the JSON file
    updateJsonFile(blockNumber, blockTime, block.hash);
  } catch (error) {
    console.error(`Error executing contract function: ${error.message}`);
  }
}

function updateJsonFile(startingBlockNumber, startingTimestamp, blockHash) {
  const filePath = './assets/deploy-config.json';
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  json.l2OutputOracleStartingBlockNumber = startingBlockNumber;
  json.l2OutputOracleStartingTimestamp = startingTimestamp;
  json.l1StartingBlockTag = blockHash; // Update with the latest block hash

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2)); // Write back with nice formatting
  console.log(`Updated ${filePath} with new starting block and timestamp.`);
}

main().catch(console.error);
