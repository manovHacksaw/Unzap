export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Pro";
  filename: string;
  iconName: "FileText" | "Zap" | "Coins" | "ImageIcon";
  sourceCode: string;
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: "template-storage",
    name: "Simple Storage",
    description: "The classic 'Hello World' of smart contracts. Learn how to read and write state on Starknet.",
    difficulty: "Easy",
    filename: "simple_storage.cairo",
    iconName: "FileText",
    sourceCode: `#[starknet::interface]
trait ISimpleStorage<TContractState> {
    fn set(ref self: TContractState, value: felt252);
    fn get(self: @TContractState) -> felt252;
}

#[starknet::contract]
mod SimpleStorage {
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        stored_value: felt252,
    }

    #[abi(embed_v0)]
    impl StorageImpl of super::ISimpleStorage<ContractState> {
        fn set(ref self: ContractState, value: felt252) {
            self.stored_value.write(value);
        }

        fn get(self: @ContractState) -> felt252 {
            self.stored_value.read()
        }
    }
}
`,
  },
  {
    id: "template-voting",
    name: "Starknet Voting",
    description: "A secure voting contract with admin roles and one-vote-per-address logic.",
    difficulty: "Medium",
    filename: "voting.cairo",
    iconName: "Zap",
    sourceCode: `use starknet::ContractAddress;

#[starknet::interface]
trait IVoting<TContractState> {
    fn add_voter(ref self: TContractState, voter: ContractAddress);
    fn cast_vote(ref self: TContractState, proposal_id: u64);
    fn get_votes(self: @TContractState, proposal_id: u64) -> u64;
    fn is_voter(self: @TContractState, address: ContractAddress) -> bool;
}

#[starknet::contract]
mod Voting {
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        admin: ContractAddress,
        voters: Map<ContractAddress, bool>,
        votes: Map<u64, u64>,
        has_voted: Map<(ContractAddress, u64), bool>,
    }

    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress) {
        self.admin.write(admin);
    }

    #[abi(embed_v0)]
    impl VotingImpl of super::IVoting<ContractState> {
        fn add_voter(ref self: ContractState, voter: ContractAddress) {
            assert(get_caller_address() == self.admin.read(), 'not admin');
            self.voters.write(voter, true);
        }

        fn cast_vote(ref self: ContractState, proposal_id: u64) {
            let caller = get_caller_address();
            assert(self.voters.read(caller), 'not voter');
            assert(!self.has_voted.read((caller, proposal_id)), 'dup vote');

            let current_votes = self.votes.read(proposal_id);
            self.votes.write(proposal_id, current_votes + 1);
            self.has_voted.write((caller, proposal_id), true);
        }

        fn get_votes(self: @ContractState, proposal_id: u64) -> u64 {
            self.votes.read(proposal_id)
        }

        fn is_voter(self: @ContractState, address: ContractAddress) -> bool {
            self.voters.read(address)
        }
    }
}
`,
  },
  {
    id: "template-erc20",
    name: "ERC20 Token",
    description: "Standard fungible token implementation (OpenZeppelin style) with minting and transfers.",
    difficulty: "Medium",
    filename: "my_token.cairo",
    iconName: "Coins",
    sourceCode: `use starknet::ContractAddress;

#[starknet::interface]
trait IERC20<TContractState> {
    fn name(self: @TContractState) -> felt252;
    fn symbol(self: @TContractState) -> felt252;
    fn decimals(self: @TContractState) -> u8;
    fn total_supply(self: @TContractState) -> u256;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn mint(ref self: TContractState, recipient: ContractAddress, amount: u256);
}

#[starknet::contract]
mod ERC20 {
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        name: felt252,
        symbol: felt252,
        decimals: u8,
        total_supply: u256,
        balances: Map<ContractAddress, u256>,
    }

    #[constructor]
    fn constructor(ref self: ContractState, name: felt252, symbol: felt252, initial_supply: u256, recipient: ContractAddress) {
        self.name.write(name);
        self.symbol.write(symbol);
        self.decimals.write(18);
        self.mint_internal(recipient, initial_supply);
    }

    #[abi(embed_v0)]
    impl ERC20Impl of super::IERC20<ContractState> {
        fn name(self: @ContractState) -> felt252 { self.name.read() }
        fn symbol(self: @ContractState) -> felt252 { self.symbol.read() }
        fn decimals(self: @ContractState) -> u8 { self.decimals.read() }
        fn total_supply(self: @ContractState) -> u256 { self.total_supply.read() }
        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 { self.balances.read(account) }

        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            let sender = get_caller_address();
            let sender_balance = self.balances.read(sender);
            assert(sender_balance >= amount, 'Insufficient balance');
            
            self.balances.write(sender, sender_balance - amount);
            self.balances.write(recipient, self.balances.read(recipient) + amount);
            true
        }

        fn mint(ref self: ContractState, recipient: ContractAddress, amount: u256) {
            // In a real app, you'd add access control here
            self.mint_internal(recipient, amount);
        }
    }

    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn mint_internal(ref self: ContractState, recipient: ContractAddress, amount: u256) {
            self.total_supply.write(self.total_supply.read() + amount);
            self.balances.write(recipient, self.balances.read(recipient) + amount);
        }
    }
}
`,
  },
  {
    id: "template-nft",
    name: "NFT Mint Contract",
    description: "ERC721-compliant NFT contract for digital collectibles with unique IDs.",
    difficulty: "Pro",
    filename: "my_nft.cairo",
    iconName: "ImageIcon",
    sourceCode: `use starknet::ContractAddress;

#[starknet::interface]
trait IERC721<TContractState> {
    fn balance_of(self: @TContractState, owner: ContractAddress) -> u256;
    fn owner_of(self: @TContractState, token_id: u256) -> ContractAddress;
    fn mint(ref self: TContractState, to: ContractAddress, token_id: u256);
}

#[starknet::contract]
mod MyNFT {
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        name: felt252,
        symbol: felt252,
        owners: Map<u256, ContractAddress>,
        balances: Map<ContractAddress, u256>,
    }

    #[constructor]
    fn constructor(ref self: ContractState, name: felt252, symbol: felt252) {
        self.name.write(name);
        self.symbol.write(symbol);
    }

    #[abi(embed_v0)]
    impl MyNFTImpl of super::IERC721<ContractState> {
        fn balance_of(self: @ContractState, owner: ContractAddress) -> u256 {
            self.balances.read(owner)
        }

        fn owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
            let owner = self.owners.read(token_id);
            assert(!owner.is_zero(), 'Token does not exist');
            owner
        }

        fn mint(ref self: ContractState, to: ContractAddress, token_id: u256) {
            assert(!to.is_zero(), 'Cannot mint to zero address');
            assert(self.owners.read(token_id).is_zero(), 'Token already minted');

            self.owners.write(token_id, to);
            self.balances.write(to, self.balances.read(to) + 1);
        }
    }
}
`,
  },
  {
    id: "template-distributor",
    name: "Multi-Asset Distributor",
    description: "Owner-managed treasury template for sending ERC20 tokens, STRK, and NFTs to one or many recipient addresses.",
    difficulty: "Pro",
    filename: "asset_distributor.cairo",
    iconName: "Coins",
    sourceCode: `use starknet::ContractAddress;

#[derive(Drop, Serde, Copy)]
struct TokenTransfer {
    recipient: ContractAddress,
    amount: u256,
}

#[derive(Drop, Serde, Copy)]
struct NftTransfer {
    collection: ContractAddress,
    recipient: ContractAddress,
    token_id: u256,
}

#[starknet::interface]
trait IERC20<TContractState> {
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
}

#[starknet::interface]
trait IERC721<TContractState> {
    fn transfer_from(
        ref self: TContractState,
        from: ContractAddress,
        to: ContractAddress,
        token_id: u256,
    );
}

#[starknet::interface]
trait IAssetDistributor<TContractState> {
    fn owner(self: @TContractState) -> ContractAddress;
    fn strk_token(self: @TContractState) -> ContractAddress;
    fn set_strk_token(ref self: TContractState, token: ContractAddress);
    fn send_erc20(ref self: TContractState, token: ContractAddress, recipient: ContractAddress, amount: u256);
    fn batch_send_erc20(ref self: TContractState, token: ContractAddress, transfers: Array<TokenTransfer>);
    fn send_strk(ref self: TContractState, recipient: ContractAddress, amount: u256);
    fn batch_send_strk(ref self: TContractState, transfers: Array<TokenTransfer>);
    fn send_nft(ref self: TContractState, collection: ContractAddress, recipient: ContractAddress, token_id: u256);
    fn batch_send_nfts(ref self: TContractState, transfers: Array<NftTransfer>);
}

#[starknet::contract]
mod AssetDistributor {
    use core::array::ArrayTrait;
    use super::{
        IERC20Dispatcher, IERC20DispatcherTrait, IERC721Dispatcher, IERC721DispatcherTrait,
        NftTransfer, TokenTransfer,
    };
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        owner: ContractAddress,
        strk_token: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, strk_token: ContractAddress) {
        self.owner.write(owner);
        self.strk_token.write(strk_token);
    }

    #[abi(embed_v0)]
    impl AssetDistributorImpl of super::IAssetDistributor<ContractState> {
        fn owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }

        fn strk_token(self: @ContractState) -> ContractAddress {
            self.strk_token.read()
        }

        fn set_strk_token(ref self: ContractState, token: ContractAddress) {
            self.assert_owner();
            assert(!token.is_zero(), 'Invalid STRK');
            self.strk_token.write(token);
        }

        fn send_erc20(ref self: ContractState, token: ContractAddress, recipient: ContractAddress, amount: u256) {
            self.assert_owner();
            self.transfer_erc20(token, recipient, amount);
        }

        fn batch_send_erc20(ref self: ContractState, token: ContractAddress, transfers: Array<TokenTransfer>) {
            self.assert_owner();

            let mut remaining = transfers;
            loop {
                match remaining.pop_front() {
                    Option::Some(transfer) => {
                        self.transfer_erc20(token, transfer.recipient, transfer.amount);
                    },
                    Option::None => {
                        break;
                    },
                };
            };
        }

        fn send_strk(ref self: ContractState, recipient: ContractAddress, amount: u256) {
            self.assert_owner();
            self.transfer_erc20(self.strk_token.read(), recipient, amount);
        }

        fn batch_send_strk(ref self: ContractState, transfers: Array<TokenTransfer>) {
            self.assert_owner();

            let token = self.strk_token.read();
            let mut remaining = transfers;
            loop {
                match remaining.pop_front() {
                    Option::Some(transfer) => {
                        self.transfer_erc20(token, transfer.recipient, transfer.amount);
                    },
                    Option::None => {
                        break;
                    },
                };
            };
        }

        fn send_nft(ref self: ContractState, collection: ContractAddress, recipient: ContractAddress, token_id: u256) {
            self.assert_owner();
            self.transfer_nft(collection, recipient, token_id);
        }

        fn batch_send_nfts(ref self: ContractState, transfers: Array<NftTransfer>) {
            self.assert_owner();

            let mut remaining = transfers;
            loop {
                match remaining.pop_front() {
                    Option::Some(transfer) => {
                        self.transfer_nft(transfer.collection, transfer.recipient, transfer.token_id);
                    },
                    Option::None => {
                        break;
                    },
                };
            };
        }
    }

    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn assert_owner(self: @ContractState) {
            assert(get_caller_address() == self.owner.read(), 'Only owner');
        }

        // Send tokens already held by this contract.
        fn transfer_erc20(ref self: ContractState, token: ContractAddress, recipient: ContractAddress, amount: u256) {
            assert(!token.is_zero(), 'Invalid token');
            assert(!recipient.is_zero(), 'Invalid recipient');

            let token_dispatcher = IERC20Dispatcher { contract_address: token };
            let success = token_dispatcher.transfer(recipient, amount);
            assert(success, 'ERC20 failed');
        }

        // Send NFTs already owned by this contract.
        fn transfer_nft(ref self: ContractState, collection: ContractAddress, recipient: ContractAddress, token_id: u256) {
            assert(!collection.is_zero(), 'Invalid NFT');
            assert(!recipient.is_zero(), 'Invalid recipient');

            let collection_dispatcher = IERC721Dispatcher { contract_address: collection };
            collection_dispatcher.transfer_from(get_contract_address(), recipient, token_id);
        }
    }
}
`,
  },
];
