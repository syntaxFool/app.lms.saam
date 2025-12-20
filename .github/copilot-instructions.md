# Copilot Instructions for Shanuzz Academy LMS v9

## Project Overview
This is a Vue 3 + TypeScript frontend application for Shanuzz Academy's Learning Management System, built with Vite and integrated with Netlify Functions for backend services.

## Technology Stack
- **Frontend Framework**: Vue 3 (Composition API)
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with PostCSS
- **State Management**: Pinia
- **Backend**: Netlify Functions (TypeScript)
- **Authentication**: Custom auth service
- **API Integration**: Fetch-based API client with caching and offline support

## Project Structure

### `src/`
- **components/**: Reusable Vue components (modals, tables, kanban boards, forms)
- **views/**: Page-level components (Dashboard, Leads, Activities, Tasks, Reports, Login)
- **services/**: API clients and business logic
  - `api.ts`: Base HTTP client
  - `auth.ts`: Authentication service
  - `leads.ts`: Lead management
  - `sync.ts`: Data synchronization
  - `cache.ts`: Caching utilities
  - `queue.ts`: Request queue for offline support
  - `offline.ts`: Offline functionality
- **stores/**: Pinia stores for global state (auth, leads, app)
- **composables/**: Reusable logic hooks for components
- **router/**: Vue Router configuration
- **types/**: TypeScript type definitions

### `netlify/functions/`
- `auth.ts`: Authentication endpoints
- `sync.ts`: Data synchronization endpoints
- `proxy.ts`: API proxy service

## Key Features
- Lead management with filtering, scoring, and follow-up tracking
- Data synchronization with conflict detection
- Offline-first capability with local storage
- Kanban board and table views
- Activity timeline and reporting
- Request queueing and retry logic

## Development Guidelines

### Component Development
- Use Composition API with setup script syntax
- Leverage composables for shared logic
- Keep components focused and single-responsibility
- Use TypeScript for type safety
- Follow Vue 3 best practices

### Service Layer
- API calls should go through `services/api.ts`
- Implement error handling and logging
- Use `useAsync` composable for loading states
- Respect the offline-first architecture

### State Management
- Use Pinia stores for application-wide state
- Keep stores focused and modular
- Avoid state mutations outside of actions
- Use TypeScript interfaces for state structure

### Styling
- Use Tailwind CSS utilities
- Follow the existing component styling patterns
- Maintain responsive design consistency
- Use CSS modules sparingly, prefer Tailwind

### Type Safety
- Always define TypeScript types for props, emits, and return values
- Use proper TypeScript interfaces in `types/index.ts`
- Avoid `any` type; use `unknown` if necessary
- Enable strict mode in tsconfig.json

## Common Tasks

### Running Development Server
```bash
npm run dev
# or use the Vite Dev Server task
```

### Building for Production
```bash
npm run build
```

### Adding a New Component
1. Create the `.vue` file in `src/components/`
2. Define props and emits with TypeScript
3. Use composables for shared logic
4. Import and register in parent component

### Adding a New Service
1. Create a new file in `src/services/`
2. Export functions that interact with the API
3. Use `services/api.ts` for HTTP requests
4. Add TypeScript types for responses

### Adding a New Composable
1. Create a new file in `src/composables/`
2. Export a function that follows the `use*` naming convention
3. Use TypeScript for parameters and return types
4. Add proper documentation

## Code Style

### TypeScript
- Use strict typing
- Prefer interfaces over types for objects
- Use enums for constants
- Properly type function parameters and return values

### Vue Components
- Use `<script setup lang="ts">` syntax
- Keep templates clean and readable
- Extract complex logic into composables
- Use semantic HTML elements

### Naming Conventions
- Components: PascalCase (e.g., `LeadCard.vue`)
- Composables: camelCase with `use` prefix (e.g., `useLeadFiltering.ts`)
- Services: camelCase (e.g., `leads.ts`)
- Constants: UPPER_SNAKE_CASE
- Classes: PascalCase

## Testing
- Write tests for services and composables
- Test component behavior and interactions
- Maintain high coverage for critical paths
- Use descriptive test names

## Documentation
- Keep README.md and relevant MDX files updated
- Document complex logic with comments
- Use JSDoc for function documentation
- Maintain COMPONENT_DOCUMENTATION.md for component APIs

## Before Committing
- Run tests and ensure they pass
- Check TypeScript compilation
- Verify code follows the style guide
- Test changes in development mode
- Ensure no console errors or warnings

## Common Patterns

### Async Operations
```typescript
const { data, loading, error } = useAsync(async () => {
  return await leadsService.getLeads();
});
```

### Form Validation
```typescript
const { errors, validate } = useFormValidation(schema);
```

### State Access
```typescript
const leadsStore = useLeadsStore();
const leads = computed(() => leadsStore.leads);
```

## Troubleshooting
- Check `CORS_ISSUES_AND_SOLUTIONS.md` for CORS-related problems
- Review `SYNC_INTEGRATION_EXAMPLES.md` for data sync issues
- See `LOST_UPDATES_FIX.md` for data consistency problems
- Consult `DEPLOYMENT.md` for deployment issues

## Additional Resources
- Vue 3 Documentation: https://vuejs.org/
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- Tailwind CSS: https://tailwindcss.com/docs
- Pinia: https://pinia.vuejs.org/
- Vite: https://vitejs.dev/

## Contact & Support
Refer to the project documentation files for detailed information on specific features and troubleshooting guides.
