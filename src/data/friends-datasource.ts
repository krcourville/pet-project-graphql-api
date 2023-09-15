import { v4 as uuidv4 } from 'uuid';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { FriendInput } from "../types";
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { EntityType } from './data-types';

export type FriendEntity = {
    id: string;
    name: string;
}

export class FriendsDatasource {
    private readonly tableName = process.env.FRIENDS_DS__TABLE_NAME!;

    constructor(
        private readonly docClient: DynamoDBDocumentClient,
        private readonly snsClient: SNSClient,
    ) {
    }

    public async add(input: FriendInput): Promise<FriendEntity> {
        const item = {
            pk: uuidv4(),
            sk: EntityType.FRIEND,
            name: input.name,
            dogBreedId: input.dogBreedId,
        };

        await this.docClient.send(new PutCommand({
            TableName: this.tableName,
            Item: item
        }));

        await this.snsClient.send(new PublishCommand({
            TopicArn: process.env.FRIENDS_DS__TOPIC_ARN!,
            Subject: "FriendCreated",
            Message: JSON.stringify(item),
        }));


        return {
            id: item.pk,
            name: item.sk,
        };
    }
    public async getById(id: string): Promise<FriendEntity[]> {
        const res = await this.docClient.send(new GetCommand({
            TableName: this.tableName,
            Key: {
                pk: id,
                sk: EntityType.FRIEND
            }
        }));
        const item = res.Item;
        if (item == null) {
            throw new Error("Friend not found");
        }
        return [{
            id: item.pk,
            name: item.name,
        }];
    }

}
