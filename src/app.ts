import { App } from 'aws-cdk-lib';
import { BankMCPStack } from './bank-mcp-stack';

const app = new App();
new BankMCPStack(app, 'BankMCPStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});

app.synth(); 