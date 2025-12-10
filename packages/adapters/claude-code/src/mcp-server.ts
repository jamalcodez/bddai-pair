#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

/**
 * Simple MCP Server for BDD-AI
 * Provides tools to read BDD scenarios and project conventions (NO VECTOR DB!)
 */
class BDDAIServer {
  private server: Server;
  private projectRoot: string;

  constructor() {
    this.server = new Server(
      {
        name: 'bddai',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Project root is current working directory
    this.projectRoot = process.cwd();

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'read_scenario',
          description: 'Read a BDD scenario to implement. Returns the Gherkin scenario with steps.',
          inputSchema: {
            type: 'object',
            properties: {
              feature: {
                type: 'string',
                description: 'Feature name (kebab-case, e.g., "user-authentication")',
              },
            },
            required: ['feature'],
          },
        },
        {
          name: 'read_conventions',
          description: 'Read project conventions and code patterns from project.md',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'list_features',
          description: 'List all available features with their scenarios',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'list_scenarios',
          description: 'List scenarios for a specific feature',
          inputSchema: {
            type: 'object',
            properties: {
              feature: {
                type: 'string',
                description: 'Feature name (kebab-case)',
              },
            },
            required: ['feature'],
          },
        },
        {
          name: 'read_scenario_detail',
          description: 'Read detailed scenario markdown with implementation status',
          inputSchema: {
            type: 'object',
            properties: {
              feature: {
                type: 'string',
                description: 'Feature name (kebab-case)',
              },
              scenario: {
                type: 'string',
                description: 'Scenario name (kebab-case)',
              },
            },
            required: ['feature', 'scenario'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'read_scenario':
            return await this.readScenario(args.feature as string);

          case 'read_conventions':
            return await this.readConventions();

          case 'list_features':
            return await this.listFeatures();

          case 'list_scenarios':
            return await this.listScenarios(args.feature as string);

          case 'read_scenario_detail':
            return await this.readScenarioDetail(
              args.feature as string,
              args.scenario as string
            );

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Read a feature file (Gherkin)
   */
  private async readScenario(feature: string) {
    const featureFile = path.join(this.projectRoot, 'bddai', 'features', `${feature}.feature`);

    try {
      const content = await fs.readFile(featureFile, 'utf-8');

      return {
        content: [
          {
            type: 'text',
            text: `# Feature: ${feature}\n\nImplement the following scenarios:\n\n\`\`\`gherkin\n${content}\n\`\`\``,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(
        `Feature '${feature}' not found. Available features: ${await this.getAvailableFeatures()}`
      );
    }
  }

  /**
   * Read project conventions
   */
  private async readConventions() {
    const projectMd = path.join(this.projectRoot, 'bddai', 'project.md');

    try {
      const content = await fs.readFile(projectMd, 'utf-8');

      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: 'No project.md found. Run `bddai init` to create one with detected conventions.',
          },
        ],
      };
    }
  }

  /**
   * List all features
   */
  private async listFeatures() {
    const featuresDir = path.join(this.projectRoot, 'bddai', 'features');

    try {
      const files = await fs.readdir(featuresDir);
      const features = files
        .filter(f => f.endsWith('.feature'))
        .map(f => f.replace('.feature', ''));

      if (features.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No features found. Run `bddai analyze <prd-file>` to generate features from a PRD.',
            },
          ],
        };
      }

      const featureList = features.map(f => `- ${f}`).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `# Available Features (${features.length})\n\n${featureList}\n\nUse \`read_scenario\` to read a specific feature.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: 'No features directory found. Run `bddai init` first.',
          },
        ],
      };
    }
  }

  /**
   * List scenarios for a feature
   */
  private async listScenarios(feature: string) {
    const scenariosDir = path.join(this.projectRoot, 'bddai', 'scenarios', feature);

    try {
      const files = await fs.readdir(scenariosDir);
      const scenarios = files.filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''));

      const scenarioList = scenarios.map(s => `- ${s}`).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `# Scenarios for ${feature} (${scenarios.length})\n\n${scenarioList}\n\nUse \`read_scenario_detail\` to read implementation details.`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`No scenarios found for feature '${feature}'`);
    }
  }

  /**
   * Read detailed scenario markdown
   */
  private async readScenarioDetail(feature: string, scenario: string) {
    const scenarioFile = path.join(
      this.projectRoot,
      'bddai',
      'scenarios',
      feature,
      `${scenario}.md`
    );

    try {
      const content = await fs.readFile(scenarioFile, 'utf-8');

      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Scenario '${scenario}' not found in feature '${feature}'`);
    }
  }

  /**
   * Get available features for error messages
   */
  private async getAvailableFeatures(): Promise<string> {
    try {
      const featuresDir = path.join(this.projectRoot, 'bddai', 'features');
      const files = await fs.readdir(featuresDir);
      const features = files.filter(f => f.endsWith('.feature')).map(f => f.replace('.feature', ''));
      return features.join(', ');
    } catch {
      return 'none';
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('BDD-AI MCP Server running');
  }
}

// Start server
const server = new BDDAIServer();
server.run().catch(console.error);
