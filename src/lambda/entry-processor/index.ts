import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.CONVERSATION_TABLE!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { message, conversationId } = body;

    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Message is required' }),
      };
    }

    // Store the message in DynamoDB
    const timestamp = Date.now();
    await docClient.send(new PutCommand({
      TableName: tableName,
      Item: {
        conversationId: conversationId || `conv-${timestamp}`,
        timestamp,
        message,
        type: 'user',
      },
    }));

    // TODO: Invoke Claude integrator Lambda
    // This will be implemented in the next step

    return {
      statusCode: 200,
      body: JSON.stringify({
        conversationId,
        message: 'Message received and processing started',
      }),
    };
  } catch (error) {
    console.error('Error processing entry:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}; 