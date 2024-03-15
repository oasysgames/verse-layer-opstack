# verse-layer-opstack
Docker configuration for running the OPSack version of Verse Layer middleware.

## Place build artifacts
Place `deploy-config.json` and `addresses.json` files downloaded from the [verse build tool](https://tools-fe.oasys.games/) into the assets directory.
```shell
mv /download-path/deploy-config.json ./assets
mv /download-path/addresses.json ./assets
```

## Create `.env`
Create an environment variables file for containers. Please copy the sample file and edit it.
```shell
# Sample for mainnet
cp .env.sample.mainnet .env

# Sample for testnet
cp .env.sample.testnet .env
```

The `OP_L2OO_ADDR` is obtained from the `addresses.json`.
```shell
jq .L2OutputOracleProxy ./assets/addresses.json
```

If you do not know how to create a private key, you can use [oasys-pos-cli](https://github.com/oasysgames/oasys-pos-cli). Please download the binary from the [release page](https://github.com/oasysgames/oasys-pos-cli/releases) and execute the key generation command.

```shell
$ oaspos crypto:create-account
Address : 0xabcd1234...
Key     : 0xabcd1234...
```

## Create `jwt.txt`
Create the JWT secret used for authentication between `op-node` and `op-geth`. This secret does not need to be backed up.
```shell
openssl rand -hex 32 > ./assets/jwt.txt
```

## Generate chain configurations
Generates `genesis.json` and `rollup.json` into the assets directory.
```shell
docker-compose run --rm --no-deps op-node genesis l2 \
  --l1-rpc "$(grep L1_ETH_RPC_HTTP .env | cut -d= -f2)" \
  --deploy-config  /assets/deploy-config.json \
  --l1-deployments /assets/addresses.json \
  --outfile.l2     /assets/genesis.json \
  --outfile.rollup /assets/rollup.json
```

## Generate genesis block
Generate the genesis block (number=0).
```shell
docker-compose run --rm --no-deps op-geth init /assets/genesis.json
```

## Run services
```shell
docker-compose up -d op-geth op-node op-batcher op-proposer verse-verifier
```
