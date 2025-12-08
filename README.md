# BDD-AI Pair

Behavior-Driven Development with AI Pair Programming Framework

## Overview

BDD-AI Pair is a development framework that combines Behavior-Driven Development (BDD) with AI pair programming workflows. It enables two specialized AI agents to collaborate on implementation under human supervision, with all development driven by Gherkin scenarios that serve as both requirements and automated tests.

## Features

- **Behavior-First Development**: All development starts with Gherkin scenarios defining expected behavior
- **PRD Integration**: Natural language requirements automatically convert to BDD scenarios
- **AI Pair Programming**: Specialized Driver and Navigator AI agents collaborate on implementation
- **Living Documentation**: Scenarios serve as both documentation and automated tests
- **Multi-Platform Support**: Works with Claude Code, Cursor, and other AI coding tools
- **Automated Test Generation**: Generate tests directly from Gherkin scenarios
- **Type Safety**: Full TypeScript implementation

## Architecture

```
┌─────────────────────────────────────────┐
│           BDD-AI Pair Framework         │
├─────────────────────────────────────────┤
│  Requirements Layer                     │
│  ├── PRD Parser & Analyzer              │
│  ├── Natural Language Processing        │
│  └── Requirement Validation             │
├─────────────────────────────────────────┤
│  Core Engine (Behavior-First Logic)     │
│  ├── Gherkin Parser & Scenario Manager  │
│  ├── Test Generation & Orchestration    │
│  └── Living Documentation System        │
├─────────────────────────────────────────┤
│  AI Pair Programming Layer              │
│  ├── Driver Agent (Architecture)        │
│  ├── Navigator Agent (Implementation)   │
│  └── Reviewer Agent (Human Interface)   │
├─────────────────────────────────────────┤
│  Platform Adapters (Pluggable)          │
│  ├── Claude Code Adapter                │
│  ├── Cursor Adapter                     │
│  └── Generic MCP Protocol               │
├─────────────────────────────────────────┤
│  CLI & Tooling                          │
│  ├── bddai command interface            │
│  └── IDE extensions                     │
└─────────────────────────────────────────┘
```

## Quick Start

### Installation

```bash
# Install globally
npm install -g @bddai/cli

# Or use directly with pnpm
pnpm add -D @bddai/core @bddai/cli
```

### Initialize a New Project

```bash
bddai init my-project
cd my-project
pnpm install
```

### Step 1: Create Your Product Requirements Document (PRD)

```bash
# Create a PRD file for your feature
bddai requirements add user-authentication

# This creates: requirements/user-authentication.prd
```

Edit the created PRD file to define your requirements:

```markdown
# User Authentication PRD

## Overview
This document outlines the requirements for the user authentication system.

## User Stories

### As a user
I want to authenticate with my credentials
So that I can access my protected resources

**Acceptance Criteria:**
- Users can register with email and password
- Users can login with valid credentials
- Users receive a JWT token upon successful login
- Tokens expire after 24 hours

## Features

### User Registration
- New users can register with email and password
- Password strength validation
- Email verification required
- Duplicate email prevention

### User Login
- Users authenticate with email/password
- JWT token generation
- Session management
- Account lockout after failed attempts
```

### Step 2: Analyze Requirements and Generate Features

```bash
# Analyze the PRD and automatically generate BDD features
bddai requirements analyze user-authentication

# This creates:
# - features/user-authentication/login.feature
# - features/user-authentication/registration.feature
# - Analysis report with quality scores
```

### Step 3: Review Generated Feature Files

The system automatically converts your PRD into Gherkin scenarios:

```gherkin
Feature: User Login
  As a user
  I want to authenticate with my credentials
  So that I can access my protected resources

  Scenario: Successful login with valid credentials
    Given a user exists with email "user@example.com" and password "ValidPass123!"
    When the user submits login request with valid credentials
    Then the system should return a JWT token
    And the token should be valid for 24 hours
```

### Step 4: Start AI Pair Programming

```bash
# Start AI pair programming on the generated features
bddai pair start user-authentication

# Generate step definitions
bddai generate steps user-authentication

# Run tests
bddai test
```

### Step 5: Validate and Export

```bash
# Validate requirement quality
bddai requirements validate user-authentication

# Export analysis to markdown for stakeholders
bddai requirements export user-authentication --format markdown
```

This workflow ensures:
- Business requirements drive development
- Automatic traceability from PRD to tests
- Quality validation before implementation
- AI assistance for implementing validated requirements

## Packages

- **@bddai/types**: Shared TypeScript type definitions
- **@bddai/core**: Core framework functionality
- **@bddai/cli**: Command-line interface
- **@bddai/claude-code-adapter**: Claude Code integration
- **@bddai/cursor-adapter**: Cursor integration

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/bddai-pair.git
cd bddai-pair

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Project Structure

```
bddai-pair/
├── packages/
│   ├── core/           # Core framework functionality
│   ├── cli/            # CLI interface
│   ├── types/          # Shared types
│   └── adapters/       # AI tool adapters
├── templates/          # Project templates
└── docs/              # Documentation
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.