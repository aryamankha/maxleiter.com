import { describe, expect, it, vi } from 'vitest'

import type { Command, CommandContext } from './commands'
import {
  commands,
  findCommand,
  getCommandNames,
  getCompletions,
  parseArgs,
  tokenize,
} from './commands'

const mockContext: CommandContext = {
  blogPosts: [
    {
      slug: 'hello-world',
      title: 'Hello',
      content: '# Hello World',
      date: '2024-01-01',
      excerpt: 'A post',
    },
  ],
  projects: [
    {
      id: 'my-project',
      name: 'My Project',
      content: 'Project readme',
      description: 'A project',
      link: 'https://example.com',
      tech: ['TypeScript'],
    },
  ],
  aboutContent: {
    bio: { content: 'About me' },
  },
  toggleJuice: vi.fn(),
  toggleCrt: vi.fn(),
}

describe('tokenize', () => {
  it('splits on spaces', () => {
    expect(tokenize('echo hello world')).toEqual(['echo', 'hello', 'world'])
  })

  it('respects double quotes', () => {
    expect(tokenize('echo "hello world"')).toEqual(['echo', 'hello world'])
  })

  it('respects single quotes', () => {
    expect(tokenize("echo 'hello world'")).toEqual(['echo', 'hello world'])
  })

  it('returns empty array for empty input', () => {
    expect(tokenize('')).toEqual([])
  })
})

describe('parseArgs', () => {
  const flagCommand: Command = {
    name: 'test',
    description: 'test',
    usage: 'test',
    flags: {
      verbose: { short: 'v', long: 'verbose', type: 'boolean' },
      output: { short: 'o', long: 'output', type: 'string' },
    },
    execute: () => ({ output: [] }),
  }

  it('parses positional arguments', () => {
    const result = parseArgs(['file.txt'], flagCommand)
    expect(result).toEqual({
      success: true,
      args: { positional: ['file.txt'], flags: {}, raw: ['file.txt'] },
    })
  })

  it('parses long boolean flags', () => {
    const result = parseArgs(['--verbose'], flagCommand)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.args.flags.verbose).toBe(true)
    }
  })

  it('rejects unknown flags', () => {
    const result = parseArgs(['--unknown'], flagCommand)
    expect(result).toEqual({
      success: false,
      error: "test: unknown flag '--unknown'",
    })
  })
})

describe('findCommand', () => {
  it('finds commands by name', () => {
    expect(findCommand('help')?.name).toBe('help')
  })

  it('finds commands by alias', () => {
    expect(findCommand('cls')?.name).toBe('clear')
    expect(findCommand('quit')?.name).toBe('exit')
  })

  it('is case insensitive', () => {
    expect(findCommand('HELP')?.name).toBe('help')
  })

  it('returns undefined for unknown commands', () => {
    expect(findCommand('foobar')).toBeUndefined()
  })
})

describe('getCommandNames', () => {
  it('includes command names and aliases', () => {
    const names = getCommandNames()
    expect(names).toContain('help')
    expect(names).toContain('clear')
    expect(names).toContain('cls')
  })
})

describe('terminal commands', () => {
  const help = commands.find((c) => c.name === 'help')!
  const ls = commands.find((c) => c.name === 'ls')!
  const pwd = commands.find((c) => c.name === 'pwd')!
  const cat = commands.find((c) => c.name === 'cat')!
  const echo = commands.find((c) => c.name === 'echo')!
  const clear = commands.find((c) => c.name === 'clear')!
  const exit = commands.find((c) => c.name === 'exit')!
  const emptyArgs = { positional: [], flags: {}, raw: [] }

  it('help lists available commands', () => {
    const result = help.execute(emptyArgs, mockContext)
    expect(result.output[0]).toBe('Available commands:')
    expect(result.output.some((line) => line.includes('help'))).toBe(true)
  })

  it('ls lists root directories', () => {
    const result = ls.execute(emptyArgs, mockContext)
    expect(result.output[0]).toContain('blog')
    expect(result.output[0]).toContain('projects')
  })

  it('ls lists blog files', () => {
    const result = ls.execute(
      { positional: ['blog'], flags: {}, raw: ['blog'] },
      mockContext
    )
    expect(result.output[0]).toContain('hello-world.md')
  })

  it('ls reports missing directory', () => {
    const result = ls.execute(
      { positional: ['nowhere'], flags: {}, raw: ['nowhere'] },
      mockContext
    )
    expect(result.output[0]).toContain('No such file or directory')
  })

  it('pwd prints working directory', () => {
    const result = pwd.execute(emptyArgs, mockContext)
    expect(result.output[0]).toBe('/home/user/portfolio')
  })

  it('echo prints text', () => {
    const result = echo.execute(
      { positional: ['hello'], flags: {}, raw: ['hello'] },
      mockContext
    )
    expect(result.output[0]).toBe('hello')
  })

  it('clear clears the screen', () => {
    const result = clear.execute(emptyArgs, mockContext)
    expect(result.clearScreen).toBe(true)
    expect(result.output).toEqual([])
  })

  it('exit closes terminal when onClose is set', () => {
    const result = exit.execute(emptyArgs, { ...mockContext, onClose: vi.fn() })
    expect(result.closeTerminal).toBe(true)
  })

  it('exit fails without onClose context', () => {
    const result = exit.execute(emptyArgs, mockContext)
    expect(result.output[0]).toContain('cannot close terminal')
  })

  it('cat reads blog post content', () => {
    const result = cat.execute(
      { positional: ['blog/hello-world.md'], flags: {}, raw: ['blog/hello-world.md'] },
      mockContext
    )
    expect(result.output[0]).toBe('# Hello World')
  })

  it('cat reports missing file', () => {
    const result = cat.execute(
      { positional: ['blog/missing.md'], flags: {}, raw: ['blog/missing.md'] },
      mockContext
    )
    expect(result.output[0]).toContain('No such file or directory')
  })
})

describe('getCompletions', () => {
  it('completes partial command names', () => {
    const completions = getCompletions('he', mockContext)
    expect(completions).toContain('help')
  })

  it('completes ls directory arguments', () => {
    const completions = getCompletions('ls bl', mockContext)
    expect(completions).toContain('blog')
  })

  it('completes cat file paths', () => {
    const completions = getCompletions('cat blog/', mockContext)
    expect(completions).toContain('blog/hello-world.md')
  })
})
