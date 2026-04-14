import { generateProject } from './lib/codegen/projectGenerator';

const abi = [
  {
    "type": "impl",
    "name": "StorageImpl",
    "interface_name": "contract::ISimpleStorage"
  },
  {
    "type": "interface",
    "name": "contract::ISimpleStorage",
    "items": [
      {
        "type": "function",
        "name": "set",
        "inputs": [
          {
            "name": "value",
            "type": "core::felt252"
          }
        ],
        "outputs": [],
        "state_mutability": "external"
      },
      {
        "type": "function",
        "name": "get",
        "inputs": [],
        "outputs": [
          {
            "type": "core::felt252"
          }
        ],
        "state_mutability": "view"
      }
    ]
  },
  {
    "type": "event",
    "name": "contract::SimpleStorage::Event",
    "kind": "enum",
    "variants": []
  }
];

const parsedAbi = {
  reads: [
    {
      "type": "function",
      "name": "get",
      "inputs": [],
      "outputs": [
        {
          "type": "core::felt252"
        }
      ],
      "state_mutability": "view"
    }
  ],
  writes: [
    {
      "type": "function",
      "name": "set",
      "inputs": [
        {
          "name": "value",
          "type": "core::felt252"
        }
      ],
      "outputs": [],
      "state_mutability": "external"
    }
  ],
  structs: [],
  events: []
};

const input = {
  contractName: 'simple_storage',
  contractAddress: '0x1d0aa301e5d5dc882be1ae89f83875ea6b29937026684e72b1df68429458ea2',
  classHash: '',
  network: 'sepolia',
  abi: abi,
  parsed: parsedAbi
};

const result = generateProject(input);
console.log('--- HOOKS ---');
console.log(result.files['hooks/useSimple_storage.tsx']);
console.log('--- UI ---');
console.log(result.files['components/ContractUI.tsx']);
