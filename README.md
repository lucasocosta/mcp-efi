# Bank MCP (Managed Conversational Platform)

This project implements a Managed Conversational Platform for a bank using AWS services. The platform provides a chat interface that integrates with Claude through Amazon Bedrock and connects to the bank's API.

## Architecture

The solution consists of the following components:

1. **API Gateway**: Provides the REST API endpoint for the chat interface
2. **Lambda Functions**:
   - Entry Processor: Handles incoming chat requests
   - Claude Integrator: Interacts with Claude through Amazon Bedrock
   - Bank Integrator: Connects to the bank's API
   - Response Formatter: Formats and returns the final response
3. **DynamoDB**: Stores conversation context and history

## Configuration

The project uses environment-specific configuration files located in the `config` directory. The following configuration files are available:

- `config/example.json`: Example configuration file (safe to commit)
- `config/test.json`: Test environment configuration (do not commit)
- `config/prod.json`: Production environment configuration (do not commit)

To set up your environment:

1. Copy the example configuration:
   ```bash
   cp config/example.json config/test.json
   cp config/example.json config/prod.json
   ```

2. Edit the configuration files with your environment-specific values:
   - `test.json` for testing environment
   - `prod.json` for production environment

3. Deploy with the desired environment:
   ```bash
   # For test environment
   cdk deploy --context environment=test

   # For production environment
   cdk deploy --context environment=prod
   ```

### Configuration Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| environment | Environment name | "test", "prod" |
| bedrockModelId | Bedrock model ID | "anthropic.claude-v2" |
| maxTokens | Maximum tokens for Claude | "1000" |
| temperature | Claude temperature setting | "0.7" |
| bankApiUrl | Bank API endpoint | "https://api.bank.example.com" |
| bankApiKey | Bank API key | "your-api-key" |

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Deploy the stack:
   ```bash
   cdk deploy --context environment=test
   ```

## Usage

Send a POST request to the API Gateway endpoint with the following format:

```json
{
  "message": "Your message here",
  "conversationId": "optional-conversation-id"
}
```

The response will include the conversation ID and the formatted response from the system.

## Development

Each Lambda function has its own package.json file for managing dependencies. To add new dependencies to a Lambda function:

1. Navigate to the function's directory
2. Install the dependency:
   ```bash
   npm install <package-name>
   ```

## Security

- The solution uses IAM roles and policies to control access to AWS services
- API Gateway is configured with appropriate authentication and authorization
- Sensitive data is stored securely in DynamoDB
- Configuration files with sensitive data are excluded from version control

## Monitoring

- CloudWatch Logs are enabled for all Lambda functions
- CloudWatch Metrics are available for monitoring API Gateway and Lambda performance 