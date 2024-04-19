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
docker-compose pull op-geth op-node op-batcher op-proposer message-relayer verse-verifier
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

#### Generate Chain Configurations
Verify successful generation of configuration files. The produced files (`genesis.json` and `rollup.json`) will be placed in the assets directory:
```shell
docker-compose run --rm --no-deps op-node genesis l2 \
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
#### Update the Starting Block
Repeat the commands from the previous section.
#### Generate Chain Configurations
Repeat the commands from the previous section.
#### Generate the Genesis Block
Repeat the commands from the previous section.
#### Run Services
Finally, launch your Verse by starting up the middleware components.
```shell
docker-compose up -d op-geth op-node op-batcher op-proposer message-relayer
```

### 4. Activate Verse Verifier
Verse Verifier is our unique mechanism designed to expedite L2 withdrawals. Originally, the Optimistic Rollup required a 7-day waiting period to complete L2 withdrawals. By validating the L2 state with our L1 validator sets, we can bypass this waiting window.

To activate the Instant Verifier, please fill out the application form below. The Oasys team will then build a replica Verse on your system.
- [To use instant verifier in verse(Mainnet)](https://docs.google.com/forms/d/1qlkMaL7RWIl09H0Zz0FH23To9cXJ0eIF5bHwhav8OzA/edit#response=ACYDBNjmRXkOBhy-xdFF76faASIJ8Twf_ZHCrhZgJmnMqkhTOY4m7x6uz7oJP6bEuKtaBO0)

Once the replica is set up, you can start the Instant Verifier by running:
```sh
docker-compose up -d verse-verifier
```

## Steps to Start a Replica Node
First, copy the `rollup.json` and `genesis.json` files. If you do not have the original files, please contact the original Verse builder to obtain them.
```shell
cp assets/rollup.json assets-replica/
cp assets/genesis.json assets-replica/
```
Generate a JWT secret.
```shell
openssl rand -hex 32 > ./assets-replica/jwt.txt
```
Initialize the Genesis Block.
```shell
docker-compose run --rm --no-deps op-geth-replica init /assets/genesis.json
```
Start the services.
```sh
docker-compose up -d op-geth-replica op-node-replica
```
Once running, and after sufficient time has passed, verify that the replica has caught up with the origin. It's important to note that since the replica constructs blocks from L1 data rolled up by the origin, it cannot catch up to the latest head of the origin. It will **always be approximately 100 blocks behind**.
```sh
# origin height
curl http://127.0.0.1:8545/ \
  -X POST \
  -H "Content-Type: application/json" \
  --data '{"method":"eth_blockNumber","params":[],"id":1,"jsonrpc":"2.0"}' | jq .result | xargs printf "%d\n"

# replica height
curl http://127.0.0.1:18545/ \
  -X POST \
  -H "Content-Type: application/json" \
  --data '{"method":"eth_blockNumber","params":[],"id":1,"jsonrpc":"2.0"}' | jq .result | xargs printf "%d\n"
```
If the replica has caught up, the latest head block hash should match that of the origin.
```sh
# origin block hash
curl http://127.0.0.1:8545/ \
  -X POST \
  -H "Content-Type: application/json" \
  --data '{"method":"eth_getBlockByNumber","params":["<hex block number>",false],"id":1,"jsonrpc":"2.0"}' | jq .result.hash

# replica block hash
curl http://127.0.0.1:18545/ \
  -X POST \
  -H "Content-Type: application/json" \
  --data '{"method":"eth_getBlockByNumber","params":["<hex block number>",false],"id":1,"jsonrpc":"2.0"}' | jq .result.hash
```


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
### How to Configure Services to Print Debug-Level Logs for Issue Identification
Below is a table showing how to configure each service to output debug-level logs to help identify issues:

|Service|Service|
|--|--|
|op-node|Include the `--log.level=debug` option in the start command line|
|op-geth|Include the `--verbosity=5` option in the start command line|
|op-batcher|Same as op-node |
|op-proposer|Same as op-node|
|message-relayer|Set the `MESSAGE_RELAYER__LOG_LEVEL` environment variable to `debug`|
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
