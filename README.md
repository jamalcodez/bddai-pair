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

### Prerequisites

Before you begin, ensure you have:

- **Node.js** version 18 or higher
- **pnpm** package manager (recommended)
- **TypeScript** knowledge
- **AI Coding Tool**: Claude Code, Cursor, or similar MCP-compatible tool
- **Git** for version control

```bash
# Verify Node.js version
node --version  # Should be 18.x or higher

# Install pnpm if not already installed
npm install -g pnpm
```

### Installation

Since BDD-AI Pair is currently in development, install from source:

```bash
# Clone the repository
git clone https://github.com/jamalcodez/bddai-pair.git
cd bddai-pair

# Install dependencies
pnpm install

# Build the packages
pnpm build

# Make CLI available globally
pnpm link
```

### Configure AI Tool Integration

Choose your preferred AI coding tool:

**For Claude Code:**
```bash
# Claude Code should have access to the project directory
# No additional setup needed if using from the project folder
```

**For Cursor:**
```bash
# Ensure Cursor has MCP server access to the project
# Install Cursor adapter if needed
```

### Initialize a New Project

```bash
# Create a new directory for your project
mkdir my-bdd-project
cd my-bdd-project

# Initialize with BDD-AI Pair
bddai init

# Install dependencies
pnpm install
```

This creates:
```
my-bdd-project/
├── requirements/        # For your PRD files
├── features/           # Generated Gherkin features
├── src/steps/          # Step definitions
├── tests/              # Test files
├── .bddai/             # Configuration
└── docs/features/      # Documentation
```

### Step 1: Create Your First PRD

Create a PRD file in the requirements directory:

```bash
# Create a new PRD file
touch requirements/user-authentication.prd
```

Edit the file with your requirements:

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

### Step 2: Add PRD to Project

```bash
# Add the PRD file to your project
bddai requirements add requirements/user-authentication.prd

# This analyzes the PRD and prepares it for feature generation
```

### Step 3: Generate BDD Features

```bash
# Analyze the PRD and generate BDD features
bddai requirements analyze user-authentication

# This creates:
# - features/user-authentication/login.feature
# - features/user-authentication/registration.feature
# - Analysis report with quality scores
```

### Step 4: Review Generated Features

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

### Step 5: Start AI Pair Programming

```bash
# Start AI pair programming session
bddai pair start user-authentication

# Your AI tool will now help implement the feature
# based on the generated scenarios

# Generate step definitions when ready
bddai generate steps user-authentication

# Run tests to verify implementation
bddai test
```

### Step 6: Validate and Export

```bash
# Validate requirement quality
bddai requirements validate user-authentication

# Export analysis for stakeholders
bddai requirements export user-authentication --format markdown
```

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