import fs from 'fs/promises';
import path from 'path';

interface FrameworkInfo {
  name: string;
  version?: string;
  fileStructure: string;
  naming: string;
  patterns: string;
  stack: string[];
}

/**
 * Initializes bddai/ directory structure with project conventions
 */
export class ProjectInitializer {
  /**
   * Initialize bddai directory with project.md
   */
  async initialize(projectRoot: string): Promise<void> {
    const bddaiDir = path.join(projectRoot, 'bddai');

    // Create directory structure
    await fs.mkdir(bddaiDir, { recursive: true });
    await fs.mkdir(path.join(bddaiDir, 'features'), { recursive: true });
    await fs.mkdir(path.join(bddaiDir, 'scenarios'), { recursive: true });

    // Detect framework and conventions
    const framework = await this.detectFramework(projectRoot);

    // Create project.md
    const projectMd = this.generateProjectMd(framework, projectRoot);
    await fs.writeFile(path.join(bddaiDir, 'project.md'), projectMd);

    // Create .gitignore
    const gitignore = `# BDD-AI generated files
analysis-report.md
`;
    await fs.writeFile(path.join(bddaiDir, '.gitignore'), gitignore);

    console.log('✅ Initialized bddai/');
    console.log(`   Detected framework: ${framework.name}`);
    console.log('   Created project.md with conventions');
  }

  /**
   * Detect framework from package.json
   */
  private async detectFramework(projectRoot: string): Promise<FrameworkInfo> {
    try {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Detect Next.js
      if (deps['next']) {
        return {
          name: 'Next.js',
          version: deps['next'],
          stack: ['Next.js', 'React', 'TypeScript'],
          fileStructure: `
src/
  ├── app/              # App router (Next.js 13+)
  │   ├── api/          # API routes
  │   └── (routes)/     # Pages
  ├── components/       # React components
  ├── lib/              # Utility functions
  └── types/            # TypeScript types
`,
          naming: `
- Components: PascalCase (e.g., UserProfile.tsx)
- Files: kebab-case (e.g., user-profile.tsx)
- Directories: kebab-case
- API routes: lowercase with brackets for dynamic routes
`,
          patterns: `
### Server Component Pattern
\`\`\`typescript
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}
\`\`\`

### API Route Pattern
\`\`\`typescript
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const data = await getData();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = await processData(body);
  return NextResponse.json(result);
}
\`\`\`

### Client Component Pattern
\`\`\`typescript
'use client';

import { useState } from 'react';

export function Component() {
  const [state, setState] = useState();
  return <div />;
}
\`\`\`
`
        };
      }

      // Detect React
      if (deps['react']) {
        return {
          name: 'React',
          version: deps['react'],
          stack: ['React', 'TypeScript'],
          fileStructure: `
src/
  ├── components/       # React components
  ├── hooks/            # Custom hooks
  ├── utils/            # Utility functions
  ├── types/            # TypeScript types
  └── App.tsx           # Main app component
`,
          naming: `
- Components: PascalCase (e.g., UserProfile.tsx)
- Hooks: camelCase with 'use' prefix (e.g., useAuth.ts)
- Files: kebab-case or PascalCase
- Utilities: camelCase
`,
          patterns: `
### Component Pattern
\`\`\`typescript
interface Props {
  title: string;
}

export function Component({ title }: Props) {
  return <div>{title}</div>;
}
\`\`\`

### Custom Hook Pattern
\`\`\`typescript
export function useCustomHook() {
  const [state, setState] = useState();

  useEffect(() => {
    // Effect logic
  }, []);

  return { state, setState };
}
\`\`\`
`
        };
      }

      // Detect Express
      if (deps['express']) {
        return {
          name: 'Express',
          version: deps['express'],
          stack: ['Express', 'Node.js', 'TypeScript'],
          fileStructure: `
src/
  ├── controllers/      # Request handlers
  ├── services/         # Business logic
  ├── models/           # Data models
  ├── routes/           # Route definitions
  ├── middleware/       # Express middleware
  └── app.ts            # Express app setup
`,
          naming: `
- Controllers: PascalCase with 'Controller' suffix
- Services: PascalCase with 'Service' suffix
- Routes: kebab-case
- Middleware: camelCase
`,
          patterns: `
### Controller Pattern
\`\`\`typescript
import { Request, Response } from 'express';

export class UserController {
  async getUser(req: Request, res: Response) {
    try {
      const user = await this.userService.findById(req.params.id);
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
\`\`\`

### Service Pattern
\`\`\`typescript
export class UserService {
  constructor(private repository: UserRepository) {}

  async findById(id: string): Promise<User> {
    return await this.repository.findById(id);
  }

  async create(data: CreateUserDto): Promise<User> {
    this.validate(data);
    return await this.repository.create(data);
  }

  private validate(data: any): void {
    if (!data.email) throw new Error('Email required');
  }
}
\`\`\`
`
        };
      }

      // Default TypeScript/JavaScript
      return {
        name: 'TypeScript/JavaScript',
        stack: ['TypeScript', 'Node.js'],
        fileStructure: `
src/
  ├── lib/              # Library code
  ├── types/            # Type definitions
  └── index.ts          # Entry point
`,
        naming: `
- Files: kebab-case
- Classes: PascalCase
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE
`,
        patterns: `
### Class Pattern
\`\`\`typescript
export class Example {
  constructor(private dependency: Dependency) {}

  async execute(input: Input): Promise<Output> {
    return await this.dependency.process(input);
  }
}
\`\`\`
`
      };
    } catch (error) {
      // No package.json or error reading it
      return {
        name: 'Unknown',
        stack: [],
        fileStructure: 'No specific structure detected',
        naming: 'Follow your team conventions',
        patterns: 'No patterns detected'
      };
    }
  }

  /**
   * Generate project.md content
   */
  private generateProjectMd(framework: FrameworkInfo, projectRoot: string): string {
    return `# Project Conventions

> Auto-generated by BDD-AI
> This file documents your project's conventions for AI agents

## Project Information

**Framework:** ${framework.name}${framework.version ? ` ${framework.version}` : ''}
**Root:** ${projectRoot}

## Tech Stack

${framework.stack.map(s => `- ${s}`).join('\n')}

## File Structure

\`\`\`
${framework.fileStructure.trim()}
\`\`\`

## Naming Conventions

${framework.naming.trim()}

## Code Patterns

${framework.patterns.trim()}

## Error Handling

- Always use try/catch in async functions
- Return descriptive error messages
- Log errors with context
- Use custom error classes for domain errors

## Testing

- Unit tests: \`*.test.ts\` alongside source files
- Integration tests: \`tests/integration/\`
- E2E tests: \`tests/e2e/\`
- Coverage target: 80%

## Additional Notes

<!-- Add your team's specific conventions here -->

---

**Last updated:** ${new Date().toISOString()}
`;
  }
}
