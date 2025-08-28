# CLAUDE.md
※ 回答の出力は日本語でお願いします。

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PolicyPlayBook is a Google Apps Script-based web application for generating Google Ads policy violation response emails through a workflow-driven interface. The system manages 130+ email templates across multiple policy categories and supports dynamic form generation based on user selections.

## Development Commands

### Essential Commands
- `npm run dev` - Watch and push changes to GAS (development mode)
- `npm run push` - Push code to Google Apps Script
- `npm run pull` - Pull code from Google Apps Script
- `npm test` - Run unit tests
- `npm run validate` - Run linting and tests
- `npm run deploy` - Run tests, push code, and deploy

### Setup Commands
- `npm run setup:gas` - Login to clasp and create GAS project
- `npm run setup:database` - Initialize database schema
- `clasp open` - Open the GAS project in browser

### Testing and Quality
- `npm run test:unit` - Unit tests
- `npm run test:integration` - Integration tests  
- `npm run test:e2e` - End-to-end tests
- `npm run lint` - ESLint with fixes
- `npm run format` - Prettier formatting

### Maintenance
- `npm run cache:clear` - Clear application cache
- `npm run migrate` - Run data migrations
- `npm run logs` - Watch GAS execution logs
- `npm run health` - Run health checks

## Architecture Overview

### Layer Structure
- **Presentation Layer**: HTML/CSS/JavaScript client-side interface
- **Application Layer**: Google Apps Script server-side logic
- **Business Logic**: Workflow engine and template processing
- **Data Access**: Spreadsheet API with caching layer
- **Data Storage**: Google Sheets as database

### Key Components

#### Backend (src/gas/)
- `Code.gs` - Main controller and entry points
- `Database.gs` - Data access layer with spreadsheet operations
- `Templates.gs` - Template engine with variable substitution
- `Workflow.gs` - Workflow state management
- `Validation.gs` - Input validation and business rules
- `Cache.gs` - Performance caching system
- `Utils.gs` - Common utility functions

#### Frontend (src/web/)
- `index.html` - Main application interface
- `workflow-ui.html` - Workflow-specific UI components
- `components.html` - Reusable UI components
- `script.html` - Client-side JavaScript logic
- `style.html` - CSS styling

#### Configuration (config/)
- `spreadsheet-config.json` - Database schema and sheet structure
- `workflow-config.json` - Workflow step definitions
- `template-mappings.json` - Template categorization
- `policy-categories.json` - Policy hierarchy structure

### Database Schema

The application uses Google Sheets with the following main sheets:
- **Templates** - Email template definitions with variables and conditions
- **Variables** - Form field definitions with validation rules
- **Options** - Selection options for dropdown fields
- **WorkflowConfig** - Step-by-step workflow definitions
- **PolicyCategories** - Hierarchical policy organization
- **AuditLog** - User action tracking
- **Cache** - Application-level caching

## Coding Standards

### JavaScript/Google Apps Script
- Use JSDoc comments for all functions, classes, and methods
- Follow camelCase for functions and variables
- Use PascalCase for classes
- Use UPPER_SNAKE_CASE for constants
- Implement proper error handling with try/catch blocks
- Use batch operations for Sheets API calls to avoid quota limits
- Implement caching for frequently accessed data

### HTML/CSS
- Use camelCase for element IDs
- Use kebab-case for CSS classes and data attributes
- Follow Bootstrap conventions where applicable

### File Organization
Each .gs file should have:
1. File header with description and version
2. Imports/dependencies
3. Constants
4. Class definitions
5. Public functions
6. Private functions

## Performance Considerations

### Google Apps Script Limitations
- Maximum execution time: 6 minutes
- Quota limits on Sheets API calls
- Memory limitations for large datasets

### Optimization Strategies
- Use batch operations for multiple sheet operations
- Implement aggressive caching with PropertiesService
- Monitor execution time and implement timeboxing
- Use named ranges for frequently accessed data
- Minimize API calls through data preprocessing

## Security Guidelines

### Authentication & Authorization
- Uses Google OAuth 2.0 for authentication
- Domain-based access control
- Role-based permissions through spreadsheet sharing

### Data Protection
- Input sanitization for all user inputs
- XSS prevention in HTML rendering
- Audit logging for user actions
- No sensitive data in client-side code

## Environment Configuration

### Spreadsheet Configuration
Update the SPREADSHEET_ID in `src/gas/Code.gs` or use environment properties:
```javascript
const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || 'YOUR_DEFAULT_ID';
```

### Required Google Apps Script Services
- Sheets API (v4)
- Drive API (v3) 
- Admin Directory API (v1)

### OAuth Scopes
The application requires these scopes (defined in appsscript.json):
- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/drive`
- `https://www.googleapis.com/auth/script.container.ui`

## Workflow System

The application implements a state-machine based workflow with these steps:
1. **Type Selection** - Choose review type (誤審査/不承認/認定/その他)
2. **Policy Selection** - Select policy category and subcategory
3. **Status Selection** - Choose approval status
4. **Form Input** - Fill required and optional variables
5. **Generation** - Create final email content

Each step can have conditional logic and dynamic form generation based on previous selections.

## Development Tips

### Local Development
- Use `npm run dev` for live development with file watching
- Check GAS execution logs with `npm run logs`
- Test changes incrementally with `clasp push`

### Debugging
- Use `console.log()` and check Apps Script logs
- Implement comprehensive error logging
- Use the built-in Apps Script debugger for complex issues

### Template System
- Templates use `{{variable}}` syntax for substitution
- Support conditional blocks with `{{#if condition}}...{{/if}}`
- Variables can have validation rules and dependencies
- Options can be dynamically filtered based on previous selections

## Data Migration

When modifying the database schema:
1. Update `config/spreadsheet-config.json`
2. Create migration scripts in `scripts/migrate.gs`
3. Test on staging environment first
4. Run `npm run migrate` to apply changes

## Deployment Process

1. Run full test suite: `npm run test:all`
2. Validate code quality: `npm run validate`
3. Deploy to staging: `npm run deploy`
4. Manual testing on staging environment
5. Deploy to production with version tagging

The system supports multiple environments (development, staging, production) with environment-specific configurations.