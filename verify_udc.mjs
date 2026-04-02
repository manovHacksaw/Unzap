import { RpcProvider, hash } from 'starknet';

const UDC_ADDRESS = "0x041a78e741e5af2fec34b695679bc6891742439f7afb8484ecd7766661ad0256";
const provider = new RpcProvider({ nodeUrl: "https://free-rpc.nethermind.io/mainnet-juno/v0_7" });

async function verify() {
  try {
    const classHash = await provider.getClassHashAt(UDC_ADDRESS);
    console.log(`Successfully verified UDC at ${UDC_ADDRESS}. Class Hash: ${classHash}`);
  } catch (e) {
    console.error(`UDC verification failed: ${e.message}`);
  }
}

verify();
