import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { MODULE_ADDRESS, MODULE_NAME } from '../App';

const config = new AptosConfig({ network: Network.TESTNET });
const client = new Aptos(config);

export async function fetchGameState() {
  // First get CreatorData to find resource account
  const resources = await client.getAccountResources({
    accountAddress: GAME_CREATOR
  });
  
  const creatorDataType = `${MODULE_ADDRESS}::${MODULE_NAME}::CreatorData`;
  const creatorData = resources.find(r => r.type === creatorDataType);
  
  if (!creatorData) {
    return null;
  }

  // Get the resource account address
  const resourceAddress = (creatorData.data as any).resource_address;

  // Get game data from resource account
  const resourceResources = await client.getAccountResources({
    accountAddress: resourceAddress
  });
  
  const gameType = `${MODULE_ADDRESS}::${MODULE_NAME}::Game`;
  const gameResource = resourceResources.find(r => r.type === gameType);
  
  if (!gameResource) {
    return null;
  }

  return {
    isInitialized: true,
    resourceAccount: resourceAddress,
    ...gameResource.data
  };
}
