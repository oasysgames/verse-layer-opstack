# verse-layer-opstack
This repository offers Docker configurations for effortlessly running the Opstack version of Verse Layer middlewares. Launching Verse is a three-step process:
1. Prepare Assets and Environment
2. Verifying Correct Startup of Verse
3. Launch Your Verse
Please follow the steps below to get your Verse up and running.


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
docker-compose up -d op-geth op-node op-batcher op-proposer message-relayer verse-verifier
```
