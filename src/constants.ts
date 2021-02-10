export enum EventSignature {
  ERC20Transfer = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
  ERC721Transfer = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
  ERC1155TransferSingle = "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62",
  ERC1155TransferBatch = "0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb",
  SendMessage = "0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036",
}

// Need these to maintain interface
export const ERC20_TRANSFER_EVENT_SIG = EventSignature.ERC20Transfer;
export const ERC721_TRANSFER_EVENT_SIG = EventSignature.ERC721Transfer;
export const ERC1155_TRANSFER_SINGLE_EVENT_SIG = EventSignature.ERC1155TransferSingle;
export const ERC1155_TRANSFER_BATCH_EVENT_SIG = EventSignature.ERC1155TransferBatch;
export const SEND_MESSAGE_EVENT_SIG = EventSignature.SendMessage;
