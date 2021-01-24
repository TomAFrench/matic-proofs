pragma solidity 0.6.6;

import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";
import {ICheckpointManager} from "./interfaces/ICheckpointManager.sol";
import {RLPReader} from "./lib/RLPReader.sol";
import {MerklePatriciaProof} from "./lib/MerklePatriciaProof.sol";
import {Merkle} from "./lib/Merkle.sol";

contract ProofVerifier {
    using RLPReader for bytes;
    using RLPReader for RLPReader.RLPItem;
    using Merkle for bytes32;
    using SafeMath for uint256;

    ICheckpointManager internal _checkpointManager;

    /**
     * @param checkpointManager address of checkpoint manager contract
     */
    constructor(address checkpointManager) public {
         _checkpointManager = ICheckpointManager(checkpointManager);
    }

    /**
     * @notice exit tokens by providing proof
     * @dev This function verifies if the transaction actually happened on child chain
     * the transaction log is then sent to token predicate to handle it accordingly
     *
     * @param inputData RLP encoded data of the reference tx containing following list of fields
     *  0 - headerNumber - Checkpoint header block number containing the reference tx
     *  1 - blockProof - Proof that the block header (in the child chain) is a leaf in the submitted merkle root
     *  2 - blockNumber - Block number containing the reference tx on child chain
     *  3 - blockTime - Reference tx block time
     *  4 - txRoot - Transactions root of block
     *  5 - receiptRoot - Receipts root of block
     *  6 - receipt - Receipt of the reference transaction
     *  7 - receiptProof - Merkle proof of the reference receipt
     *  8 - branchMask - 32 bits denoting the path of receipt in merkle tree
     *  9 - receiptLogIndex - Log Index to read from the receipt
     */
    function exit(bytes calldata inputData) view external returns (bool) {
        RLPReader.RLPItem[] memory inputDataRLPList = inputData
            .toRlpItem()
            .toList();

        // branch mask can be maximum 32 bits
        require(
            inputDataRLPList[8].toUint() &
                0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000 ==
                0,
            "RootChainManager: INVALID_BRANCH_MASK"
        );

        // verify receipt inclusion
        require(
            MerklePatriciaProof.verify(
                inputDataRLPList[6].toBytes(), // receipt
                inputDataRLPList[8].toBytes(), // branchMask
                inputDataRLPList[7].toBytes(), // receiptProof
                bytes32(inputDataRLPList[5].toUint()) // receiptRoot
            ),
            "RootChainManager: INVALID_PROOF"
        );

        // verify checkpoint inclusion
        _checkBlockMembershipInCheckpoint(
            inputDataRLPList[2].toUint(), // blockNumber
            inputDataRLPList[3].toUint(), // blockTime
            bytes32(inputDataRLPList[4].toUint()), // txRoot
            bytes32(inputDataRLPList[5].toUint()), // receiptRoot
            inputDataRLPList[0].toUint(), // headerNumber
            inputDataRLPList[1].toBytes() // blockProof
        );

        return true;
    }

    function _checkBlockMembershipInCheckpoint(
        uint256 blockNumber,
        uint256 blockTime,
        bytes32 txRoot,
        bytes32 receiptRoot,
        uint256 headerNumber,
        bytes memory blockProof
    ) private view returns (uint256) {
        (
            bytes32 headerRoot,
            uint256 startBlock,
            ,
            uint256 createdAt,

        ) = _checkpointManager.headerBlocks(headerNumber);

        require(
            keccak256(
                abi.encodePacked(blockNumber, blockTime, txRoot, receiptRoot)
            )
                .checkMembership(
                blockNumber.sub(startBlock),
                headerRoot,
                blockProof
            ),
            "RootChainManager: INVALID_HEADER"
        );
        return createdAt;
    }
}