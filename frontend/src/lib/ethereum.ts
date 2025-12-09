import { Contract, EventLog, Log } from "ethers";

export async function fetchLogsWithChunking(
    contract: Contract,
    filter: any,
    fromBlock: number,
    toBlock: number,
    chunkSize: number = 2000
): Promise<(EventLog | Log)[]> {
    const logs: (EventLog | Log)[] = [];

    for (let i = fromBlock; i <= toBlock; i += chunkSize) {
        const end = Math.min(i + chunkSize - 1, toBlock);
        try {
            const chunkLogs = await contract.queryFilter(filter, i, end);
            logs.push(...chunkLogs);
        } catch (err) {
            console.error(`Failed to fetch logs for range ${i}-${end}:`, err);
            // Optional: Retry logic could go here
        }
    }

    return logs;
}
