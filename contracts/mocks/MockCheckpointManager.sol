pragma solidity 0.6.6;

import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";
import {ICheckpointManager} from "../interfaces/ICheckpointManager.sol";

/**
* @notice Mock Checkpoint Manager contract to simulate plasma checkpoints while testing
*/
contract MockCheckpointManager is ICheckpointManager {
    using SafeMath for uint256;

    uint256 constant CHECKPOINT_ID_INTERVAL = 10000;
    uint256 public currentCheckpointNumber = 0;

    function setCheckpoint(uint256 checkpointId, bytes32 rootHash, uint256 start, uint256 end) public {
        HeaderBlock memory headerBlock = HeaderBlock({
            root: rootHash,
            start: start,
            end: end,
            createdAt: now,
            proposer: msg.sender
        });

        currentCheckpointNumber = checkpointId.add(CHECKPOINT_ID_INTERVAL);
        headerBlocks[checkpointId] = headerBlock;
    }
}