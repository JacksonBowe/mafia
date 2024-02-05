import { StackContext, Table, use } from 'sst/constructs'
import { StageRemovalPolicy } from './settings'

export function MStorage({ stack }: StackContext) {

    // Users
    const userTable = new Table(stack, 'UserTable', {
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
    const lobbyTable = new Table(stack, 'LobbyTable', {
        fields: {
            PK: 'string',
            SK: 'string',
            type: 'string'
        },
        primaryIndex: { partitionKey: 'PK', sortKey: 'SK'},
        globalIndexes: {
            itemsByType: { partitionKey: 'type' }
        },
        cdk: {
            table: {
                removalPolicy: StageRemovalPolicy(stack.stage)
            }
        }
    })

    return {
        userTable,
        lobbyTable
    }
}