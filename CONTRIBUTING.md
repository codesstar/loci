# Contributing to Loci

Thanks for your interest in Loci! We welcome contributions of all kinds.

## How to Contribute

### Bug Reports & Feature Requests

Open an [issue](https://github.com/codesstar/loci/issues) with:
- **Bug**: Steps to reproduce, expected vs actual behavior
- **Feature**: Use case and proposed solution

### Code & Documentation

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-idea`
3. Make your changes
4. Test locally (clone fresh, run onboarding, verify dashboard)
5. Submit a pull request

Please open an issue first for large changes so we can discuss the approach.

### What to Work On

- **Templates**: Improve module READMEs, add new templates
- **Dashboard**: UI improvements, new visualizations
- **Documentation**: Guides, tutorials, translations
- **Slash commands**: Improve existing commands or propose new ones
- **Integrations**: Support for other AI tools beyond Claude Code

## Guidelines

- Keep changes focused — one feature/fix per PR
- Follow existing file naming conventions (`YYYY-MM-DD-slug.md` for decisions, etc.)
- Use YAML frontmatter for all content files
- Test the onboarding flow if you change CLAUDE.md or plan.md
- Write in English for code/docs; content templates should be language-neutral

## Project Structure

See [How It Works](docs/how-it-works.md) for the full system overview. Key files:

- `CLAUDE.md` — The AI system prompt (core logic lives here)
- `templates/commands/` — Slash command definitions
- `.loci/dashboard/build.py` — Dashboard data generator
- `examples/alex/` — Demo data for new users

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
