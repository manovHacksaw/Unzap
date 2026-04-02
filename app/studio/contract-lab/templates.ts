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

    #[storage]
    struct Storage {
        admin: ContractAddress,
        voters: LegacyMap<ContractAddress, bool>,
        votes: LegacyMap<u64, u64>,
        has_voted: LegacyMap<(ContractAddress, u64), bool>,
    }

    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress) {
        self.admin.write(admin);
    }

    #[abi(embed_v0)]
    impl VotingImpl of super::IVoting<ContractState> {
        fn add_voter(ref self: ContractState, voter: ContractAddress) {
            assert(get_caller_address() == self.admin.read(), 'Only admin can add voters');
            self.voters.write(voter, true);
        }

        fn cast_vote(ref self: ContractState, proposal_id: u64) {
            let caller = get_caller_address();
            assert(self.voters.read(caller), 'Caller is not a registered voter');
            assert(!self.has_voted.read((caller, proposal_id)), 'Already voted for this proposal');

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

    #[storage]
    struct Storage {
        name: felt252,
        symbol: felt252,
        decimals: u8,
        total_supply: u256,
        balances: LegacyMap<ContractAddress, u256>,
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

    #[storage]
    struct Storage {
        name: felt252,
        symbol: felt252,
        owners: LegacyMap<u256, ContractAddress>,
        balances: LegacyMap<ContractAddress, u256>,
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
];
