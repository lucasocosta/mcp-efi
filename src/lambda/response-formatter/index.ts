import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
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

    // Get the complete conversation history
    const history = await docClient.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'conversationId = :id',
      ExpressionAttributeValues: {
        ':id': conversationId,
      },
      ScanIndexForward: true,
    }));

    // Format the final response
    const formattedResponse = {
      conversationId,
      messages: history.Items?.map(item => ({
        type: item.type,
        message: item.message,
        timestamp: item.timestamp,
      })),
    };

    return {
      statusCode: 200,
      body: JSON.stringify(formattedResponse),
    };
  } catch (error) {
    console.error('Error in response formatter:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}; 