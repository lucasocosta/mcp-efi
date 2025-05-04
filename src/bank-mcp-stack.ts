import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as fs from 'fs';
import * as path from 'path';

export class BankMCPStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Load configuration based on environment
    const environment = this.node.tryGetContext('environment') || 'test';
    const configPath = path.join(__dirname, '..', 'config', `${environment}.json`);
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found for environment: ${environment}`);
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Create DynamoDB table for conversation context
    const conversationTable = new dynamodb.Table(this, 'ConversationTable', {
      partitionKey: { name: 'conversationId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // Common environment variables for all Lambda functions
    const commonEnvVars = {
      ENVIRONMENT: environment,
      CONVERSATION_TABLE: conversationTable.tableName,
    };

    // Create Lambda functions
    const entryProcessor = new lambda.Function(this, 'EntryProcessor', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('src/lambda/entry-processor'),
      environment: {
        ...commonEnvVars,
        CLAUDE_INTEGRATOR_FUNCTION_NAME: 'ClaudeIntegrator', // Will be updated after function creation
      },
    });

    const claudeIntegrator = new lambda.Function(this, 'ClaudeIntegrator', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('src/lambda/claude-integrator'),
      environment: {
        ...commonEnvVars,
        BEDROCK_MODEL_ID: config.bedrockModelId,
        MAX_TOKENS: config.maxTokens,
        TEMPERATURE: config.temperature,
        BANK_INTEGRATOR_FUNCTION_NAME: 'BankIntegrator', // Will be updated after function creation
      },
    });

    const bankIntegrator = new lambda.Function(this, 'BankIntegrator', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('src/lambda/bank-integrator'),
      environment: {
        ...commonEnvVars,
        BANK_API_URL: config.bankApiUrl,
        BANK_API_KEY: config.bankApiKey,
        RESPONSE_FORMATTER_FUNCTION_NAME: 'ResponseFormatter', // Will be updated after function creation
      },
    });

    const responseFormatter = new lambda.Function(this, 'ResponseFormatter', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('src/lambda/response-formatter'),
      environment: {
        ...commonEnvVars,
      },
    });

    // Update function names in environment variables
    entryProcessor.addEnvironment('CLAUDE_INTEGRATOR_FUNCTION_NAME', claudeIntegrator.functionName);
    claudeIntegrator.addEnvironment('BANK_INTEGRATOR_FUNCTION_NAME', bankIntegrator.functionName);
    bankIntegrator.addEnvironment('RESPONSE_FORMATTER_FUNCTION_NAME', responseFormatter.functionName);

    // Grant permissions to Lambda functions
    conversationTable.grantReadWriteData(entryProcessor);
    conversationTable.grantReadWriteData(claudeIntegrator);
    conversationTable.grantReadWriteData(bankIntegrator);
    conversationTable.grantReadWriteData(responseFormatter);

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'BankMCPApi', {
      restApiName: `Bank MCP API - ${environment}`,
      description: `API for Bank MCP chat interface - ${environment} environment`,
    });

    // Create chat resource and method
    const chatResource = api.root.addResource('chat');
    chatResource.addMethod('POST', new apigateway.LambdaIntegration(entryProcessor));

    // Add Bedrock permissions to Claude integrator
    claudeIntegrator.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: ['*'], // Consider restricting to specific model ARNs in production
    }));
  }
} 