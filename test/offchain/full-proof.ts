/* eslint-disable func-names */
import { encodePayload, ERC20_TRANSFER_EVENT_SIG } from "../../src";
import { buildMerkleProof } from "../../src/proofs/blockProof";
import { buildMerklePatriciaProof } from "../../src/proofs/receiptProof";
import { ExitProof } from "../../src/types";
import { getLogIndex } from "../../src/utils/logIndex";
import { block, blocks, CHECKPOINT_ID, receipt, receipts } from "../mockResponses";
import chai from "../chai-setup";

const { expect } = chai;

const targetData =
  "0xf907ee8405c708d0b9016014046d76d94acb7992a93b43a65788933768592359caf291075d37ea1e5494260efdbe476e4b7d8f12df0967931aa275263e9531f8d6fceff02c24aa844aee96c25d84c552e1a1b8b838374e40d9533470d8bf002b323fb23d119a8041760cdf724f9ec00b4391c653cca4716968369a38943c2693cf6a2e4cd34e5c05076a849a0e617cc531ccea5b553278012d38bcd06a26d348ff225a9b35881a8a259ca17903042c6db3d844c8701c7e3e157e80f39cc0e99f9f708e68525967ad4e0cec00e647772259b03658af971731d1fcb0625a1942e86e588fec22a3b550f1103b3f11232266d70784b85458a83d057b6a464c03bbc601a2958cd1c68e23dbea5e6f1f7c6be8896fd3bf963f5ef8335b6d7f544d5867c752903a55b2ed82fffca1aa75d96e223e0084743720e4727509c181fae3af79ea1be55e6eb44f380e93bcbabd0abc92fcd683a75a2d7d525c7222359dc36d7d1ce436258c4e5655d6c10c8395f1b18460080feca03582fb5cd2c56bb1ddbba1e3d0426011c958858075d9f0630ea5acd0470ae932a017465186fbaa455f5825f9db1a869ed23fd4ad816a5c72b2d574cf57859863c7b902eaf902e7018259f0b9010000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000008000000000000000000000000000000000800000000000000008000001800000000000000000000100000000000000000000020000000000000000000800000000000000000080000010000000000000000000000000000000004000000000000001000000100000000000000000200000000000000000000040000000000000000000000000000000000000004000000002000000000001000000000000000000000000000000100000000020000000000000000000000000000000000000000000000000000000010000100040f901ddf89b9416eccfdbb4ee1a85a33f3a9b21175cd7ae753db4f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006f1c28c40b5fed4fb546f85959ae2f7c16365cada00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000d1d932b7cacea719df9013d940000000000000000000000000000000000001010f884a04dfe1bbbcf077ddc3e01291eea2d5c70c2b422b415d95645b9adcfd678cb1d63a00000000000000000000000000000000000000000000000000000000000001010a00000000000000000000000006f1c28c40b5fed4fb546f85959ae2f7c16365cada0000000000000000000000000e77bbfd8ed65720f187efdd109e38d75eaca7385b8a0000000000000000000000000000000000000000000000000000016941e572fa000000000000000000000000000000000000000000000000086856544c8cb687f00000000000000000000000000000000000000000000000090c6ebf53a8a417500000000000000000000000000000000000000000000000086854eb0aa7438df00000000000000000000000000000000000000000000000090c7028958e17115b90347f90344f851a0fae0cc00873e8e9ae28cc9074e17a440954a20286659f8ae49450cb6ff9f769480808080808080a0ad03fcb6cef83a803ab64c6b1dad1cb3f365fb01be3051f9a08462dbfb7d4b3d8080808080808080f902ee30b902eaf902e7018259f0b9010000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000008000000000000000000000000000000000800000000000000008000001800000000000000000000100000000000000000000020000000000000000000800000000000000000080000010000000000000000000000000000000004000000000000001000000100000000000000000200000000000000000000040000000000000000000000000000000000000004000000002000000000001000000000000000000000000000000100000000020000000000000000000000000000000000000000000000000000000010000100040f901ddf89b9416eccfdbb4ee1a85a33f3a9b21175cd7ae753db4f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006f1c28c40b5fed4fb546f85959ae2f7c16365cada00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000d1d932b7cacea719df9013d940000000000000000000000000000000000001010f884a04dfe1bbbcf077ddc3e01291eea2d5c70c2b422b415d95645b9adcfd678cb1d63a00000000000000000000000000000000000000000000000000000000000001010a00000000000000000000000006f1c28c40b5fed4fb546f85959ae2f7c16365cada0000000000000000000000000e77bbfd8ed65720f187efdd109e38d75eaca7385b8a0000000000000000000000000000000000000000000000000000016941e572fa000000000000000000000000000000000000000000000000086856544c8cb687f00000000000000000000000000000000000000000000000090c6ebf53a8a417500000000000000000000000000000000000000000000000086854eb0aa7438df00000000000000000000000000000000000000000000000090c7028958e17115820080800xf907ee8405c708d0b9016014046d76d94acb7992a93b43a65788933768592359caf291075d37ea1e5494260efdbe476e4b7d8f12df0967931aa275263e9531f8d6fceff02c24aa844aee96c25d84c552e1a1b8b838374e40d9533470d8bf002b323fb23d119a8041760cdf724f9ec00b4391c653cca4716968369a38943c2693cf6a2e4cd34e5c05076a849a0e617cc531ccea5b553278012d38bcd06a26d348ff225a9b35881a8a259ca17903042c6db3d844c8701c7e3e157e80f39cc0e99f9f708e68525967ad4e0cec00e647772259b03658af971731d1fcb0625a1942e86e588fec22a3b550f1103b3f11232266d70784b85458a83d057b6a464c03bbc601a2958cd1c68e23dbea5e6f1f7c6be8896fd3bf963f5ef8335b6d7f544d5867c752903a55b2ed82fffca1aa75d96e223e0084743720e4727509c181fae3af79ea1be55e6eb44f380e93bcbabd0abc92fcd683a75a2d7d525c7222359dc36d7d1ce436258c4e5655d6c10c8395f1b18460080feca03582fb5cd2c56bb1ddbba1e3d0426011c958858075d9f0630ea5acd0470ae932a017465186fbaa455f5825f9db1a869ed23fd4ad816a5c72b2d574cf57859863c7b902eaf902e7018259f0b9010000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000008000000000000000000000000000000000800000000000000008000001800000000000000000000100000000000000000000020000000000000000000800000000000000000080000010000000000000000000000000000000004000000000000001000000100000000000000000200000000000000000000040000000000000000000000000000000000000004000000002000000000001000000000000000000000000000000100000000020000000000000000000000000000000000000000000000000000000010000100040f901ddf89b9416eccfdbb4ee1a85a33f3a9b21175cd7ae753db4f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006f1c28c40b5fed4fb546f85959ae2f7c16365cada00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000d1d932b7cacea719df9013d940000000000000000000000000000000000001010f884a04dfe1bbbcf077ddc3e01291eea2d5c70c2b422b415d95645b9adcfd678cb1d63a00000000000000000000000000000000000000000000000000000000000001010a00000000000000000000000006f1c28c40b5fed4fb546f85959ae2f7c16365cada0000000000000000000000000e77bbfd8ed65720f187efdd109e38d75eaca7385b8a0000000000000000000000000000000000000000000000000000016941e572fa000000000000000000000000000000000000000000000000086856544c8cb687f00000000000000000000000000000000000000000000000090c6ebf53a8a417500000000000000000000000000000000000000000000000086854eb0aa7438df00000000000000000000000000000000000000000000000090c7028958e17115b90347f90344f851a0fae0cc00873e8e9ae28cc9074e17a440954a20286659f8ae49450cb6ff9f769480808080808080a0ad03fcb6cef83a803ab64c6b1dad1cb3f365fb01be3051f9a08462dbfb7d4b3d8080808080808080f902ee30b902eaf902e7018259f0b9010000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000008000000000000000000000000000000000800000000000000008000001800000000000000000000100000000000000000000020000000000000000000800000000000000000080000010000000000000000000000000000000004000000000000001000000100000000000000000200000000000000000000040000000000000000000000000000000000000004000000002000000000001000000000000000000000000000000100000000020000000000000000000000000000000000000000000000000000000010000100040f901ddf89b9416eccfdbb4ee1a85a33f3a9b21175cd7ae753db4f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006f1c28c40b5fed4fb546f85959ae2f7c16365cada00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000d1d932b7cacea719df9013d940000000000000000000000000000000000001010f884a04dfe1bbbcf077ddc3e01291eea2d5c70c2b422b415d95645b9adcfd678cb1d63a00000000000000000000000000000000000000000000000000000000000001010a00000000000000000000000006f1c28c40b5fed4fb546f85959ae2f7c16365cada0000000000000000000000000e77bbfd8ed65720f187efdd109e38d75eaca7385b8a0000000000000000000000000000000000000000000000000000016941e572fa000000000000000000000000000000000000000000000000086856544c8cb687f00000000000000000000000000000000000000000000000090c6ebf53a8a417500000000000000000000000000000000000000000000000086854eb0aa7438df00000000000000000000000000000000000000000000000090c7028958e1711582008080";

export function testFullProof(): void {
  it("should generate a valid proof", async () => {
    const receiptProof = await buildMerklePatriciaProof(receipt, receipts, block.number, block.hash);
    const blockProof = await buildMerkleProof(block, blocks, CHECKPOINT_ID);
    const logIndex = getLogIndex(receipt, ERC20_TRANSFER_EVENT_SIG);

    const exitProof: ExitProof = {
      headerBlockNumber: CHECKPOINT_ID.toNumber(),
      blockProof: blockProof.blockProof,
      burnTxBlockNumber: blockProof.burnTxBlockNumber,
      burnTxBlockTimestamp: blockProof.burnTxBlockTimestamp,
      transactionsRoot: blockProof.transactionsRoot,
      receiptsRoot: blockProof.receiptsRoot,
      receipt,
      receiptProofParentNodes: receiptProof.parentNodes,
      receiptProofPath: receiptProof.path,
      logIndex,
    };

    const encodedExit = encodePayload(exitProof);
    expect(encodedExit).to.eq(targetData);
  });
}
