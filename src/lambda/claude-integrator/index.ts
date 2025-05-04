import { DynamoDB } from 'aws-sdk';
import { BedrockRuntime } from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const dynamoDB = new DynamoDB.DocumentClient();
const bedrock = new BedrockRuntime();
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

    // Get conversation history from DynamoDB
    const history = await dynamoDB.query({
      TableName: tableName,
      KeyConditionExpression: 'conversationId = :id',
      ExpressionAttributeValues: {
        ':id': conversationId,
      },
      ScanIndexForward: true,
    }).promise();

    // Format conversation history for Claude
    const messages = history.Items?.map(item => ({
      role: item.type === 'user' ? 'user' : 'assistant',
      content: item.message,
    })) || [];

    // Call Claude through Bedrock
    const response = await bedrock.invokeModel({
      modelId: 'anthropic.claude-v2',
      body: JSON.stringify({
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    }).promise();

    const claudeResponse = JSON.parse(response.body.toString());

    // Store Claude's response in DynamoDB
    await dynamoDB.put({
      TableName: tableName,
      Item: {
        conversationId,
        timestamp: Date.now(),
        message: claudeResponse.content[0].text,
        type: 'assistant',
      },
    }).promise();

    // TODO: Invoke bank integrator Lambda
    // This will be implemented in the next step

    return {
      statusCode: 200,
      body: JSON.stringify({
        conversationId,
        message: 'Claude response processed',
      }),
    };
  } catch (error) {
    console.error('Error in Claude integrator:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}; 