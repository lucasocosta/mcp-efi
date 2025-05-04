import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.CONVERSATION_TABLE!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { conversationId } = body;

    if (!conversationId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Conversation ID is required' }),
      };
    }

    // Get the latest Claude response from DynamoDB
    const history = await docClient.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'conversationId = :id',
      ExpressionAttributeValues: {
        ':id': conversationId,
      },
      ScanIndexForward: false,
      Limit: 1,
    }));

    const latestMessage = history.Items?.[0];
    if (!latestMessage || latestMessage.type !== 'assistant') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No assistant message found' }),
      };
    }

    // TODO: Implement actual bank API integration
    // This is a placeholder for the bank API call
    const bankResponse = {
      status: 'success',
      data: {
        // Mock bank response data
        accountBalance: 1000.00,
        lastTransaction: '2024-01-01',
      },
    };

    // Store bank response in DynamoDB
    await docClient.send(new PutCommand({
      TableName: tableName,
      Item: {
        conversationId,
        timestamp: Date.now(),
        message: JSON.stringify(bankResponse),
        type: 'bank',
      },
    }));

    // TODO: Invoke response formatter Lambda
    // This will be implemented in the next step

    return {
      statusCode: 200,
      body: JSON.stringify({
        conversationId,
        message: 'Bank integration completed',
      }),
    };
  } catch (error) {
    console.error('Error in bank integrator:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}; 