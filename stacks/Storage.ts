import { StackContext, Table, use } from 'sst/constructs'
import { StageRemovalPolicy } from './settings'

export function MStorage({ stack }: StackContext) {

    // Users
    const usersTable = new Table(stack, 'UsersTable', {
        fields: {
            PK: 'string',
            SK: 'string',
            type: 'string'
        },
        primaryIndex: { partitionKey: 'PK', sortKey: 'SK'},
        cdk: {
            table: {
                removalPolicy: StageRemovalPolicy(stack.stage)
            }
        }
    })

    // Lobbies
    const lobbiesTable = new Table(stack, 'LobbiesTable', {
        fields: {
            PK: 'string',
            SK: 'string',
            type: 'string'
        },
        primaryIndex: { partitionKey: 'PK', sortKey: 'SK'},
        cdk: {
            table: {
                removalPolicy: StageRemovalPolicy(stack.stage)
            }
        }
    })

    return {
        usersTable,
        lobbiesTable
    }
}