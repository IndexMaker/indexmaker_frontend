import { Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { AbiCoder, ZeroAddress, ethers } from 'ethers';
import * as path from 'path';
import { DbService } from 'src/db/db.service';
import { blockchainEvents, syncState } from 'src/db/schema';

export type SyncEventDefinition = {
  name: string;
  abi: string;
  topic: string;
};

type SyncOptions = {
  provider: ethers.Provider;
  network: string; // e.g. 'mainnet', 'base', 'arbitrum'
  contractAddress: string;
  eventDefs: SyncEventDefinition[];
  batchSize?: number;
};

@Injectable()
export class IndexRegistryService {
  private readonly logger = new Logger(IndexRegistryService.name);
  private providers: Map<number, ethers.JsonRpcProvider>;
  private contracts: Map<number, ethers.Contract>;
  private wallet: ethers.Wallet | null = null;
  private dbService: DbService;
  constructor() {
    this.dbService = new DbService();
  }

  async getIndexData(
    indexId: number,
    chainId: number = 8453,
    timestamp?: number,
  ): Promise<{
    tokens: string[];
    weights: number[];
    price: number;
    name: string;
    ticker: string;
    curator: string;
    lastPrice: number;
    lastWeightUpdateTimestamp: number;
    lastPriceUpdateTimestamp: number;
    curatorFee: number;
  }> {
    if (!this.contracts.has(chainId)) {
      this.logger.error(`Unsupported chain: ${chainId}`);
      throw new Error(`Unsupported chain: ${chainId}`);
    }

    try {
      const contract = this.contracts.get(chainId)!;
      const latestTimestamp =
        timestamp ||
        (await contract.indexDatas(indexId)).lastWeightUpdateTimestamp;

      // Fetch index data and weights
      const [
        name,
        ticker,
        curator,
        lastPrice,
        lastWeightUpdateTimestamp,
        lastPriceUpdateTimestamp,
        curatorFee,
      ] = await contract.getIndexDatas(indexId);
      const [curatorWeightsData, curatorPriceData] = await contract.getData(
        indexId,
        latestTimestamp,
        ZeroAddress,
      );

      // Decode bytes weights (assume [address, uint256][] encoding)
      const decodedWeights = AbiCoder.defaultAbiCoder().decode(
        ['tuple(address,uint256)[]'],
        curatorWeightsData,
      )[0];
      const tokens = decodedWeights.map(
        (w: [string, ethers.BigNumberish]) => w[0],
      );
      const weights = decodedWeights.map(
        (w: [string, ethers.BigNumberish]) => w[1],
      );

      this.logger.log(
        `Fetched index data for indexId ${indexId} on chain ${chainId}`,
      );
      return {
        tokens,
        weights,
        price: curatorPriceData.toNumber(),
        name,
        ticker,
        curator,
        lastPrice: lastPrice.toNumber(),
        lastWeightUpdateTimestamp: lastWeightUpdateTimestamp.toNumber(),
        lastPriceUpdateTimestamp: lastPriceUpdateTimestamp.toNumber(),
        curatorFee: curatorFee.toNumber(),
      };
    } catch (error) {
      this.logger.error(
        `Error fetching index data for indexId ${indexId} on chain ${chainId}: ${error.message}`,
      );
      throw error;
    }
  }

  async setCuratorWeights(
    indexId: number,
    weights: [string, number][],
    price: number,
    timestamp: number,
    chainId: number = 8453,
  ): Promise<void> {
    if (!this.wallet || !this.contracts.has(chainId)) {
      this.logger.error(
        `Cannot perform write operation: Wallet or chain ${chainId} not configured`,
      );
      throw new Error(`Wallet or chain ${chainId} not configured`);
    }

    try {
      const contract = this.contracts.get(chainId)!;
      // Encode weights as [address, uint256][]
      const encodedWeights = this.encodeWeights(weights);
      // const setCuratorTx = await contract.upgradeCurator(indexId, this.wallet.address);
      // await setCuratorTx.wait()
      const tx = await contract.setCuratorWeights(
        indexId,
        timestamp,
        encodedWeights,
        price,
      );
      await tx.wait();
      this.logger.log(
        `Set weights for indexId ${indexId} on chain ${chainId}, tx: ${tx.hash}`,
      );
    } catch (error) {
      this.logger.error(
        `Error setting weights for indexId ${indexId} on chain ${chainId}: ${error.message}`,
      );
      throw error;
    }
  }

  async registerIndex(
    name: string,
    ticker: string,
    curatorFee: bigint,
    chainId: number = 8453,
  ): Promise<void> {
    if (!this.wallet || !this.contracts.has(chainId)) {
      this.logger.error(
        `Cannot perform write operation: Wallet or chain ${chainId} not configured`,
      );
      throw new Error(`Wallet or chain ${chainId} not configured`);
    }

    try {
      const contract = this.contracts.get(chainId)!;
      const tx = await contract.registerIndex(name, ticker, curatorFee);
      await tx.wait();
      this.logger.log(
        `Registered index ${name} (${ticker}) on chain ${chainId}, tx: ${tx.hash}`,
      );
    } catch (error) {
      this.logger.error(
        `Error registering index ${name} on chain ${chainId}: ${error.message}`,
      );
      throw error;
    }
  }

  public encodeWeights(symbolWeights: [string, number][]): string {
    const bytesArray: Uint8Array[] = [];

    for (const [symbol, weight] of symbolWeights) {
      // Encode symbol and pad/truncate to 20 bytes
      const symbolBytesRaw = ethers.toUtf8Bytes(symbol);
      const symbolBytes = new Uint8Array(20);
      symbolBytes.set(symbolBytesRaw.slice(0, 20));
      bytesArray.push(symbolBytes);

      // Encode weight as 2 bytes (uint16)
      const weightBytes = new Uint8Array(2);
      weightBytes[0] = (weight >> 8) & 0xff;
      weightBytes[1] = weight & 0xff;
      bytesArray.push(weightBytes);
    }

    const finalBytes = Uint8Array.from(
      bytesArray.flatMap((byteArray) => Array.from(byteArray)),
    );
    return ethers.hexlify(finalBytes);
  }

  public decodeWeights(hexData: string): [string, number][] {
    const bytes = ethers.getBytes(hexData);
    const result: [string, number][] = [];

    for (let i = 0; i < bytes.length; i += 22) {
      // Get symbol (20 bytes)
      const symbolBytes = bytes.slice(i, i + 20);
      const symbol = ethers.toUtf8String(symbolBytes).replace(/\0+$/, ''); // Trim null padding

      // Get weight (2 bytes)
      const weightBytes = bytes.slice(i + 20, i + 22);
      const weight = (weightBytes[0] << 8) | weightBytes[1];

      result.push([symbol, weight]);
    }

    return result;
  }

  // private encodeWeights(symbolWeights: [string, number][]): string {
  //   const bytesArray: Uint8Array[] = [];

  //   for (const [symbol, weight] of symbolWeights) {
  //     // Manually pad symbol to 12 bytes (or truncate)
  //     const symbolBytesRaw = ethers.toUtf8Bytes(symbol);
  //     const symbolBytes = new Uint8Array(12);
  //     symbolBytes.set(symbolBytesRaw.slice(0, 12)); // truncate/pad to 12 bytes
  //     bytesArray.push(symbolBytes);

  //     // Pack weight into 2 bytes (uint16)
  //     const weightBytes = new Uint8Array(2);
  //     weightBytes[0] = (weight >> 8) & 0xff;
  //     weightBytes[1] = weight & 0xff;
  //     bytesArray.push(weightBytes);
  //   }

  //   // Concatenate and hexlify
  //   const finalBytes = Uint8Array.from(bytesArray.flatMap(byteArray => Array.from(byteArray)));
  //   return ethers.hexlify(finalBytes);
  // }

  // decodeWeights(hexData: string): [string, number][] {
  //   const bytes = ethers.getBytes(hexData);
  //   const result: [string, number][] = [];
  //   for (let i = 0; i < bytes.length; i += 14) {
  //     // Get symbol (12 bytes)
  //     const symbolBytes = bytes.slice(i, i + 12);
  //     const symbol = ethers.toUtf8String(symbolBytes).replace(/\0+$/, ''); // Remove padding nulls

  //     // Get weight (2 bytes)
  //     const weightBytes = bytes.slice(i + 12, i + 14);
  //     const weight = (weightBytes[0] << 8) | weightBytes[1];

  //     result.push([symbol, weight]);
  //   }

  //   return result;
  // }

  public replaceBitgetWeightsWithBTC(
    weights: [string, number][],
  ): [string, number][] {
    let bitgetTotalWeight = 0;
    const newWeights: [string, number][] = [];

    for (const [pair, weight] of weights) {
      if (pair.startsWith('bg.')) {
        // Collect Bitget weights
        bitgetTotalWeight += weight;
      } else {
        // Keep other pairs as-is
        newWeights.push([pair, weight]);
      }
    }

    // Add Bitget weights to BTCUSDC
    if (bitgetTotalWeight > 0) {
      const btcUSDCIndex = newWeights.findIndex(
        ([pair]) => pair === 'bi.BTCUSDC',
      );

      if (btcUSDCIndex !== -1) {
        newWeights[btcUSDCIndex][1] += bitgetTotalWeight;
      } else {
        throw new Error(
          `'bi.BTCUSDC' pair not found when replacing Bitget weights.`,
        );
      }
    }

    return newWeights;
  }

  public async syncBlockchainEvents({
    provider,
    network,
    contractAddress,
    eventDefs,
    batchSize = 4999,
  }: SyncOptions) {
    const iface = new ethers.Interface(eventDefs.map((e) => e.abi));
    const latestBlock = await provider.getBlockNumber();

    // Get last synced block for this contract + network
    const sync = await this.dbService.getDb().query.syncState.findFirst({
      where: and(
        eq(syncState.contractAddress, contractAddress),
        eq(syncState.network, network),
      ),
    });

    let fromBlock = sync?.lastSyncedBlock + 1 || 32627126;

    for (
      let currentBlock = fromBlock;
      currentBlock <= latestBlock;
      currentBlock += batchSize
    ) {
      const toBlock = Math.min(currentBlock + batchSize - 1, latestBlock);

      for (const def of eventDefs) {
        let logs: ethers.Log[] = [];
        let retries = 0;

        while (retries < 5) {
          try {
            logs = await provider.getLogs({
              address: contractAddress,
              topics: [def.topic],
              fromBlock: currentBlock,
              toBlock,
            });
            break;
          } catch (err: any) {
            if (err.code === -32005 || err.code === 'BAD_DATA') {
              console.warn(
                `Rate-limited: retrying ${def.name} at blocks ${currentBlock}-${toBlock}`,
              );
              await new Promise((res) => setTimeout(res, 2000 * (retries + 1)));
              retries++;
            } else {
              logs = [];
            }
          }
        }
        let index = 0;
        for (const log of logs) {
          const parsed = iface.parseLog(log);
          if (!parsed) continue;
          const amount = parsed.args.amount?.toString() ?? '0';
          const user = parsed.args.user ?? parsed.args.from ?? null;

          await this.dbService
            .getDb()
            .insert(blockchainEvents)
            .values({
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              logIndex: index++,
              eventType: def.name.toLowerCase(),
              contractAddress,
              network,
              userAddress: user,
              amount,
              timestamp: new Date(), // or fetch block.timestamp if needed
            })
            .onConflictDoNothing(); // skip duplicates
        }
      }

      // Upsert sync state for this contract and network
      await this.dbService
        .getDb()
        .insert(syncState)
        .values({
          contractAddress,
          network,
          lastSyncedBlock: toBlock,
        })
        .onConflictDoUpdate({
          target: [syncState.contractAddress, syncState.network],
          set: { lastSyncedBlock: toBlock },
        });
    }
  }
}
