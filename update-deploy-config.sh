#!/bin/sh

# Ensure jq is installed
if ! command -v jq &> /dev/null
then
    echo "jq could not be found. Please install jq to proceed."
    exit 1
fi

# Obtain L1_ETH_RPC_HTTP from .env file
L1_ETH_RPC_HTTP=$(grep L1_ETH_RPC_HTTP .env | cut -d= -f2)

# Validate if L1_ETH_RPC_HTTP is empty
if [ -z "$L1_ETH_RPC_HTTP" ]; then
    echo "L1_ETH_RPC_HTTP could not be found in the .env file."
    exit 1
fi

# Obtain the hash of the latest block
LATEST_BLOCK_HASH=$(curl $L1_ETH_RPC_HTTP \
  -X POST \
  -H "Content-Type: application/json" \
  --data '{"method":"eth_getBlockByNumber","params":["latest",false],"id":1,"jsonrpc":"2.0"}' | jq -r .result.hash)

if [ -z "$LATEST_BLOCK_HASH" ]; then
    echo "Failed to obtain the latest block hash."
    exit 1
fi

# Replace l1StartingBlockTag in JSON file
jq --arg hash "$LATEST_BLOCK_HASH" '.l1StartingBlockTag = $hash' ./assets/deploy-config.json > ./assets/deploy-config.tmp.json && mv ./assets/deploy-config.tmp.json ./assets/deploy-config.json

if [ $? -eq 0 ]; then
    echo "l1StartingBlockTag has been successfully updated."
else
    echo "Failed to update l1StartingBlockTag."
    exit 1
fi

