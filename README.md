# verse-layer-opstack
This repository offers Docker configurations for effortlessly running the Opstack version of Verse Layer middlewares. Launching Verse is a 4-step process:
1. Prepare Assets and Environment
2. Verifying Correct Startup of Verse
3. Launch Your Verse
4. Activate Verse Verifier

Please follow the steps below to get your Verse up and running. If you encounter any issues while building, please refer to the [QA](#frequently-asked-questions) section.

## Steps to Launch Verse
Before beginning, ensure that the L1 contract sets have already been deployed, and you possess the necessary configuration files (`addresses.json`, `deploy-config.json`). If not, please refer to the contract sets deployment section in our [technical documentation](https://docs.oasys.games/docs/verse-developer/how-to-build-verse/manual).

### 1. Prepare Assets and Environment
#### Place Configuration Files
Move the `deploy-config.json` and `addresses.json` files into the assets directory.
```shell
mv /download-path/deploy-config.json ./assets
mv /download-path/addresses.json ./assets
```

#### Generate jwt.txt
Generate a JWT secret for authentication between op-node and op-geth. This secret does not require backup.
```shell
openssl rand -hex 32 > ./assets/jwt.txt
```

#### Configure .env
Set up an environment variables file for your Verse. We provide samples for both mainnet and testnet configurations.
Copy the appropriate sample file and modify it as needed.
```shell
# Sample for mainnet
cp .env.sample.mainnet .env

# Sample for testnet
cp .env.sample.testnet .env
```

To configure the environment file with addresses sourced from `addresses.json`, use the following commands to extract the required addresses:
```shell
# Retrieve OP_L2OO_ADDR from addresses.json
jq .L2OutputOracleProxy ./assets/addresses.json

# Retrieve OP_AM_ADDR from addresses.json. There's no need for concern if the result returns a zero address.
jq .AddressManager ./assets/addresses.json

# Retrieve OP_L1CDM_ADDR from addresses.json
jq .L1CrossDomainMessengerProxy ./assets/addresses.json

# Retrieve OP_L1BRIDGE_ADDR from addresses.json
jq .L1StandardBridgeProxy ./assets/addresses.json

# Retrieve OP_PORTAL_ADDR from addresses.json
jq .OptimismPortalProxy ./assets/addresses.json
```

If you're unsure about creating a private key, you can utilize [oasys-pos-cli](https://github.com/oasysgames/oasys-pos-cli). Download the binary from the [releases page](https://github.com/oasysgames/oasys-pos-cli/releases) and run the key generation command.
```shell
$ oaspos crypto:create-account
Address : 0xabcd1234...
Key     : 0xabcd1234...
```
Please fund at least 10 OAS to the following address. This address will send transactions to our L1 to cover the required gas fees:
- OP_PROPOSER_ADDR
- OP_BATCHER_ADDR
- MR_PROVER_ADDR
- MR_FINALIZER_ADDR
- VERIFY_SUBMITTER_ADDR

#### Install Dependencies
Install the required dependencies to run the scripts.
```shell
yarn install
```

#### Pull Docker Containers
Pull all the required Docker images for Verse middleware.
```shell
docker-compose pull op-geth op-node op-batcher op-proposer op-message-relayer verse-verifier
```

### 2. Verifying Correct Startup of Verse
#### Update the Starting Block
Ensure the update of the starting block is successful by executing:
```shell
node updateStartingBlock.js
```
This script updates the starting block information in the L1 contract. To manually specify, use a option. For example, to set the starting block number to 123, the command would be:
```shell
node updateStartingBlock.js --starting-blocknumber 123
```

#### Create data directories
Create data directories for each service.
```shell
mkdir -p ./data/{op-geth,op-node,message-relayer/{state,store},verse-verifier}

# Allow the service execution user (nobody) to write.
chown 65534:65534 ./data/{op-geth,op-node,message-relayer,message-relayer/{state,store},verse-verifier}
```

#### Generate Chain Configurations
Verify successful generation of configuration files. The produced files (`genesis.json` and `rollup.json`) will be placed in the assets directory:
```shell
docker-compose run --rm --no-deps --user=root op-node genesis l2 \
  --l1-rpc "$(grep L1_ETH_RPC_HTTP .env | cut -d= -f2)" \
  --deploy-config  /assets/deploy-config.json \
  --l1-deployments /assets/addresses.json \
  --outfile.l2     /assets/genesis.json \
  --outfile.rollup /assets/rollup.json
```

#### Generate the Genesis Block
Ensure the successful generation of the genesis block (number=0):
```shell
docker-compose run --rm --no-deps op-geth init /assets/genesis.json
```


### 3. Launch Your Verse
This step follows the previous ones and ultimately leads to the startup of Docker containers.

It's crucial to emphasize that **all steps must be executed in sequence without any delay between each step** up to the `Run Services` point. If you pause or stop at any step, it is recommended to restart from the `Update the Starting Block` step within this section.

First, clear all outputs from the previous section.
```shell
rm -r ./data
```

#### Create data directories
Repeat the commands from the previous section.

#### Update the Starting Block
Repeat the commands from the previous section.

#### Generate Chain Configurations
Repeat the commands from the previous section.

#### Generate the Genesis Block
Repeat the commands from the previous section.

#### Run Services
Finally, launch your Verse by starting up the middleware components.
```shell
docker-compose up -d op-geth op-node op-batcher op-proposer op-message-relayer
```

### 4. Activate Verse Verifier
Verse Verifier is our unique mechanism designed to expedite L2 withdrawals. Originally, the Optimistic Rollup required a 7-day waiting period to complete L2 withdrawals. By validating the L2 state with our L1 validator sets, we can bypass this waiting window.

To activate the Verse Verifier, please fill out the application form bellow.
- [To use instant verifier in verse(Mainnet)](https://docs.google.com/forms/d/e/1FAIpQLSd21GXYp7c8LS-crUVTHZkaDBuEzDZfxJl78Zgb4Ejd7Dybjg/viewform)
- [To use instant verifier in verse(Testnet)](https://docs.google.com/forms/d/e/1FAIpQLSc3B-1sq_ycxdOjFMvNwMIO4Z7FI1MYyaU4WPflbxf3U38OPg/viewform)

> [!NOTE]
> An IP address whitelist is required **for testnet** instant verification
>
> To activate instant verification on the testnet, please allow this IP address (`34.126.140.53`) to access your Verse RPC.
> The validator side of the Instant Verifier on the testnet operates from this IP address and directly accesses your test Verse RPC, without using a replica node. Mainnet instant verifiers refer to the replica node built using L1 submitted data, so they do not require IP address whitelisting.

Once the Oasys side settings are configured, you can start the Verse Verifier by running:
```sh
docker-compose up -d verse-verifier
```

## Setup a Replica Node
If you want to setup a replica node, please refer to [this document](https://docs.oasys.games/docs/verse-developer/how-to-build-verse/read-node).

## Frequently Asked Questions
### When I restart the service, it takes about 5 to 10 minutes to start producing a new block. Is this normal?
Yes, it's normal. When the op-node restarts, it begins to walk the L2 backwards from the unsafe L2 head until it finds an L2 block whose L1 origin is canonical. This process involves identifying finalized and safe L2 blocks. This backtracking stops if it finds a finalized L2 head. However, our L2 doesn't have finality, so it backtracks through a sequential window of 3600 blocks. This backtracking takes time. Please wait patiently until it finishes.

During this process, you will see the following log in the op-node:
```sh
2024-04-13 09:44:43 t=2024-04-13T02:44:43+0000 lvl=info msg="Walking back L1Block by hash"      curr=0x97076d901ec6d79e3dcd1fcc1856c57309eda9c8fe3ac630391c028d72b53bfe:3233556 next=0x193fbd673363aa527ac2848086f09c8490e65469f2276ddb3e3593e3979c2ae5:3233555 l2block=0x049c131483a2d7421d8273a0c5fbe66d8f916b86f163775e254215243ba60928:3339
```

---
### The op-proposer outputs a  `block hash does not match` error repeatedly. How should I address this?
If the error logs look like the following, you can address this issue by restarting the op-node with the `--omit-l1blockhash-in-proposals` flag:
```sh
2024-04-14 10:05:56 t=2024-04-14T03:05:56+0000 lvl=warn msg="Failed to create a transaction, will retry" service=proposer err="failed to estimate gas: execution reverted: L2OutputOracle: block hash does not match the hash at the expected height"
```
This error occurs when the op-node has been stopped for more than 4 hours, as the L1 contract cannot refer to an old block hash (older than 1024 blocks). By excluding the L1 block hash from the L2 state proposal, this issue can be resolved.

Example to Set in Docker-Compose:
```yml
op-proposer:
  ...
  command: >
    ...
    --omit-l1blockhash-in-proposals
```

---
### How Does L2 Reorgs in Accordance with L1 Reorgs?
When L2 detects an L1 reorg, you will see the following warning log:
```
L1 head signal indicates a possible L1 re-org
```
Eventually, L2 discards its unsafe head, but this restructuring does not affect the L2 safe head. In other words, once L2 succeeds in delivering L2 blocks from L1, they should not be discarded without restarting.

While you can mitigate this risk by specifying the L1 confirmation block numbers as a runtime option(`--verifier.l1-confs <number>`), we don't recommend this due to the rarity of L1 reorgs and the potential negative impact on performance.

If an L1 reorg occurs, it is highly likely to be an L1 incident. We believe that restarting is the best option for dealing with L1 reorgs.

---
### Why does the transaction sender need to wait more than the block time even when the network is less crowded?
The average actual expected waiting time is not 0.5 * blocktime but rather `1.5 * blocktime`. This additional one block time of waiting is caused by the side effects of architectural changes. Following the Ethereum architecture, OP Stack has separated the consensus layer from the execution layer. The execution node (op-geth) produces blocks as dictated by the consensus node (op-node).

When the execution node receives a block creation request, it pick transactions from the txpool and packs them into a block. Then, the execution node waits for the block finalization request. This duration is almost equivalent to one block time, as the block creation request is typically sent immediately after the prior block is produced. This waiting period accounts for the additional waiting time experienced by transaction senders.

---
### Why doesn't Metamask automatically set gas to zero?
Our gasless setting Verse correctly returns zero in response to the `eth_gasPrice` request, and the `baseFeePerGas` property in the block is always zero. The issue lies within the library Metamask uses. Currently, Metamask is using ethers.js v5, which automatically sets a default gas price of 1,500,000,000. In contrast, ethers.js v6 correctly sets the gas price to zero. Upgrading the library version on the Metamask side would resolve this issue.

To avoid this automatic setting, developers are required to explicitly set both `maxFeePerGas` and `maxPriorityFeePerGas` to zero.

---
### How to Configure Services to Print Debug-Level Logs for Issue Identification
Below is a table showing how to configure each service to output debug-level logs to help identify issues:

|Service|Service|
|--|--|
|op-node|Include the `--log.level=debug` option in the start command line|
|op-geth|Include the `--verbosity=5` option in the start command line|
|op-batcher|Same as op-node |
|op-proposer|Same as op-node|
|op-message-relayer|Set the `MESSAGE_RELAYER__LOG_LEVEL` environment variable to `debug`|
|verse-verifier|Set the environment variable `DEBUG=1`|

---
### How to Discard All L2 Data and Restart?
To start fresh with Layer 2, you can delete all outputs from L2OutputOracle and change the inbox address. This process is extremely risky, so please carefully consider alternative methods before proceeding.

#### Delete All Outputs
First, check the `nextOutputIndex` of L2OutputOracle. If it returns zero, you can skip this process. You can find the address of L2OutputOracle in the `L2OutputOracleProxy` within the `addresses.json`.
```solidity
function nextOutputIndex() public view returns (uint256);
```
Next, verify the challenger address using the following method; only this address can delete outputs.
```solidity
function CHALLENGER() public view returns (address);
```
Delete all outputs using `deleteL2Outputs` with zero as the argument:
- _l2OutputIndex: This is the index number to remain as output. Set this value to zero.
```solidity
function deleteL2Outputs(uint256 _l2OutputIndex) external virtual;
```
Finally, confirm that all outputs have been deleted by calling nextOutputIndex again.

#### Change the Inbox Address
Manually update the inbox address in addresses.json and deploy-config.json.

|File|Property|
|--|--|
|addresses.json|BatchInbox|
|deploy-config.json|batchInboxAddress|

Ensure that no transactions have ever been sent to this address, as required. As our recommended solution, increment the last digit of the inbox address as shown below:
```sh
# Original
0xfF0000000000000000000000000000004ee9Ff00

# Original
0xfF0000000000000000000000000000004ee9Ff01
```

Once all changes are made, please restart your system by following the steps in the [Launch Your Verse](#3-launch-your-verse) section.
