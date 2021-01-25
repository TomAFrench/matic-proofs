pragma solidity 0.6.6;

import {Merkle} from "../libraries/Merkle.sol";

contract TestMerkle {
    function checkMembership(
        bytes32 leaf,
        uint256 index,
        bytes32 rootHash,
        bytes memory proof
    ) public pure returns (bool) {
        return Merkle.checkMembership(leaf, index, rootHash, proof);       
    }
}