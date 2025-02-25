# verse-layer-opstack
This repository offers Docker configurations for effortlessly running the Opstack version of Verse Layer middlewares. Launching Verse is a 4-step process:
1. Prepare Assets and Environment
2. Verifying Correct Startup of Verse
3. Launch Your Verse
4. Activate Verse Verifier

Please follow the steps below to get your Verse up and running. If you encounter any issues while building, please refer to the [QA](#frequently-asked-questions) section.

## Steps to Launch Verse
Before beginning, ensure that the L1 contract sets have already been deployed, and you possess the necessary configuration files (`addresses.json`, `deploy-config.json`). If not, please refer to the contract sets deployment section in our [technical documentation](https://docs.oasys.games/docs/category/build-verse).

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

# Sample for private
cp .env.sample.private .env
```

> *Related project for building a private L2: [oasys-private-l1](https://github.com/oasysgames/oasys-private-l1)*

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
docker run --rm -ti -u 65534:65534 -v $PWD/assets:/assets \
  ghcr.io/oasysgames/oasys-opstack/op-node:v1.0.0 op-node genesis l2 \
    --l1-rpc "$(grep L1_ETH_RPC_HTTP .env | cut -d= -f2)" \
    --deploy-config  /assets/deploy-config.json \
    --l1-deployments /assets/addresses.json \
    --outfile.l2     /assets/genesis.json \
    --outfile.rollup /assets/rollup.json
```

#### Add upgrade times to rollup.json
Add timestamps for L2 upgrade activation blocks to the `assets/rollup.json` created in the previous step.

```json
  "regolith_time": 0,
  "canyon_time": <set this value>,
  "delta_time": <set this value>,
  "ecotone_time": <set this value>,
  "fjord_time": <set this value>,
  "granite_time": <set this value>,
  "batch_inbox_address": "0x...",
```

Field descriptions:
| name | sample |
| --- | --- |
| canyon_time | Specify `0` |
| delta_time | Specify `0` |
| ecotone_time | Specify `current_time + 600s` (Example command: `expr $(date +%s) + 600`) |
| fjord_time | Specify the same value as `ecotone_time` |
| granite_time | Specify the same value as `ecotone_time` |

> [!IMPORTANT]
> - The above only applies when building a new Verse
> - You must start the chain before the time specified in `ecotone_time`
> - Do not modify these values after the upgrades have been applied, as this may cause unnecessary issues

#### Generate the Genesis Block
Ensure the successful generation of the genesis block (number=0):
```shell
docker run --rm -ti -u 65534:65534 -v $PWD/assets:/assets -v $PWD/data/op-geth:/data \
  ghcr.io/oasysgames/oasys-op-geth:v1.0.0 --datadir /data init /assets/genesis.json
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
### L2 Reorged! What Happens When the op-batcher Stops for More Than 6 Hours?
There is a concept called the sequencing window, which defines the time frame within which the op-batcher is required to submit L2 batches to L1. This is critical for L2 security, ensuring that the L2 safe head doesn't fall too far behind the latest L2 head. The default sequencing window is 3600 blocks, and with the current L1 block time of 6 seconds, this equates to a 6-hour limit (3600 blocks x 6s / 60 / 60).

To mitigate the risk of a reorg, if you notice that the op-batcher has been down for more than an hour, we recommend force-stopping the op-node and op-geth. We believe a complete service shutdown is preferable to an unexpected L2 reorg.

---
### Why does the transaction sender need to wait more than the block time even when the network is less crowded?
The average actual expected waiting time is not 0.5 * blocktime but rather `1.5 * blocktime`. This additional one block time of waiting is caused by the side effects of architectural changes. Following the Ethereum architecture, OP Stack has separated the consensus layer from the execution layer. The execution node (op-geth) produces blocks as dictated by the consensus node (op-node).

When the execution node receives a block creation request, it pick transactions from the txpool and packs them into a block. Then, the execution node waits for the block finalization request. This duration is almost equivalent to one block time, as the block creation request is typically sent immediately after the prior block is produced. This waiting period accounts for the additional waiting time experienced by transaction senders.

---
### Why doesn't Metamask automatically set gas to zero?
Our gasless setting Verse correctly returns zero in response to the `eth_gasPrice` request, and the `baseFeePerGas` property in the block is always zero. The issue lies within the library Metamask uses. Currently, Metamask is using ethers.js v5, which automatically sets a default gas price of 1,500,000,000. In contrast, ethers.js v6 correctly sets the gas price to zero. Upgrading the library version on the Metamask side would resolve this issue.

To avoid this automatic setting, developers are required to explicitly set both `maxFeePerGas` and `maxPriorityFeePerGas` to zero.

---
### How to change block gaslimit?
The default gas limit is `30,000,000`.

When using the `--miner.gaslimit` option with op-geth, you might notice that the gas limit remains unchanged. This is because op-geth refers to the gas limit setting recorded in the `SystemConfig` contract. Therefore, the correct approach is to call the [setGasLimit](https://github.com/oasysgames/oasys-opstack/blob/2d237fe8656a70e90061c487018ce97720a6ddeb/packages/contracts-bedrock/src/L1/SystemConfig.sol#L202-L204) function. Only the owner is allowed to make this call, so please ensure you call from the `FinalSystemOwner` address. After you have made the change, restart op-geth.

The necessary address can be found on the [check-verse page](https://tools-fe.oasys.games/check-verse) of tools-fe.

---
### How to Support High Transaction Volume?
To support a higher transaction volume, you can increase the gas limit, allowing more transactions to be included in one block. As the default configurations of each service are set with a gas limit of 30M in mind, we highly recommend changing the configuration for stable operation.

- op-batcher
  - Shorten the polling interval of the L2 block: The op-batcher polls L2 blocks using this interval. The default value is 6 seconds. You can set it via the option (`--poll-interval`) or environment variable (`POLL_INTERVAL`). For example, to set it to 1 second: POLL_INTERVAL=1s.
  - Increase max pending transactions: The op-batcher submits L2 transactions to L1 concurrently up to this value. The default value is 1. You can set it via the option (`--max-pending-tx`) or environment variable (`MAX_PENDING_TX`). For example, to set it to 4: MAX_PENDING_TX=4.
- op-proposer
  - None. The op-proposer is not affected by high transaction volume, as it only proposes the L2 state root at the submission interval. One factor that might delay proposing is if the safe L2 head is lagging behind the latest L2 head, but this is not the responsibility of the proposer.
- message-realyer
  - Increase max pending transactions: The message-relayer submits L2 transactions to L1 concurrently up to this value. The default value is 1. You can set it via the option (`--maxpendingtxs`) or environment variable (`MESSAGE_RELAYER__MAX_PENDING_TXS`). For example, to set it to 4: MESSAGE_RELAYER__MAX_PENDING_TXS=4.
- op-node
  - Disable p2p sync: This is just an idea. P2P sync is the functionality that publishes newly created payloads to replica nodes. As this is a high-load task, disabling it allows the op-node to focus on new block creation and derivation tasks, potentially improving performance and stability. However, the issue lies with the replicas. With P2P sync disabled, only "Synchronize from Hub-Layer" is allowed, which is not real-time. To achieve real-time sync, one option is storage replication, such as replicating op-geth storage. Note that we have not confirmed whether op-geth works with replicated storage. You can disable P2P sync via the environment variable (`OP_NODE_P2P_DISABLE`). For example, to disable it: OP_NODE_P2P_DISABLE=true
- op-geth
  - TBD. Please refer to external resources, as geth is widely used across many projects, and extensive knowledge is available on the internet.

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

### go-ethereum client causes `transaction type not supported` error
When using the official [go-ethereum](https://github.com/ethereum/go-ethereum) client to fetch a L2 block data, you may get a `transaction type not supported` error.

Code example:
```golang
package main

import (
  "context"
  "fmt"

  "github.com/ethereum/go-ethereum/ethclient"
)

func main() {
  client, err := ethclient.Dial("http://127.0.0.1:8545/")
  if err != nil {
    panic(err)
  }

  block, err := client.BlockByNumber(context.Background(), nil)
  if err != nil {
    panic(err)  // should "panic: transaction type not supported"
  }

  fmt.Println(block.Hash())
}
```

This is due to the fact that the transaction type of the deposit transaction that op-node is sending to op-geth via the engine API is a custom type (`0x7E`).
```shell
curl http://127.0.0.1:8545/ \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0", "method":"eth_getBlockByNumber", "params":["latest", true], "id":1}' \
 | jq '.result.transactions[0]'

{
  ...
  "type": "0x7e",
  ...
}
```

To resolve this, simply add a replace statement from the go-ethereum package to the oasys-op-geth package in the go.mod file. For example:
```shell
go mod edit -replace "github.com/ethereum/go-ethereum=github.com/oasysgames/oasys-op-geth@v1.1.1"
```

If you are using a programming language other than Golang, please make the appropriate fixes for each language.
